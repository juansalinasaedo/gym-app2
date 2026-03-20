# app/routes_face.py
from flask import Blueprint, jsonify, request
from datetime import datetime
from sqlalchemy import func
from zoneinfo import ZoneInfo
import numpy as np

from . import db
from .decorators import login_required
from .models import Cliente, Asistencia, FaceTemplate

api_face = Blueprint("api_face", __name__)


def _now_local():
    try:
        return datetime.now(ZoneInfo("America/Santiago"))
    except Exception:
        return datetime.now()


def _get_face_analyzer():
    """
    Carga perezosa del modelo InsightFace.
    """
    from insightface.app import FaceAnalysis

    app = FaceAnalysis(name="buffalo_l")
    app.prepare(ctx_id=-1, det_size=(640, 640))
    return app


_FACE_ANALYZER = None


def get_face_analyzer():
    global _FACE_ANALYZER
    if _FACE_ANALYZER is None:
        _FACE_ANALYZER = _get_face_analyzer()
    return _FACE_ANALYZER


def cosine_similarity(a, b):
    a = np.asarray(a, dtype=np.float32)
    b = np.asarray(b, dtype=np.float32)

    na = np.linalg.norm(a)
    nb = np.linalg.norm(b)

    if na == 0 or nb == 0:
        return 0.0

    return float(np.dot(a, b) / (na * nb))


def decode_image_from_request(file_storage):
    import cv2

    raw = file_storage.read()
    arr = np.frombuffer(raw, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img


@api_face.post("/api/face/enroll")
@login_required
def face_enroll():
    """
    Recibe una imagen y guarda el embedding facial del cliente.
    Espera multipart/form-data con:
      - cliente_id
      - image
    """
    cliente_id = request.form.get("cliente_id")
    image = request.files.get("image")

    if not cliente_id:
        return jsonify({"error": "cliente_id es obligatorio"}), 400

    cliente = Cliente.query.get(cliente_id)
    if not cliente:
        return jsonify({"error": "Cliente no encontrado"}), 404

    if not image:
        return jsonify({"error": "No se recibió imagen"}), 400

    try:
        analyzer = get_face_analyzer()
        img = decode_image_from_request(image)

        if img is None:
            return jsonify({"error": "No se pudo leer la imagen"}), 400

        faces = analyzer.get(img)

        if not faces:
            return jsonify({"error": "No se detectó ningún rostro"}), 400

        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        embedding = face.embedding.tolist()

        # Desactivar plantillas anteriores
        FaceTemplate.query.filter_by(cliente_id=cliente.cliente_id, is_active=True).update(
            {"is_active": False}
        )

        tpl = FaceTemplate(
            cliente_id=cliente.cliente_id,
            model_name="insightface",
            model_version="buffalo_l",
            embedding=embedding,
            quality_score=None,
            is_active=True,
        )

        db.session.add(tpl)
        db.session.commit()

        return jsonify({
            "ok": True,
            "cliente": {
                "cliente_id": cliente.cliente_id,
                "nombre": cliente.nombre,
                "apellido": cliente.apellido,
                "rut": cliente.rut,
            },
            "face_template_id": tpl.face_template_id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Error enrolando rostro",
            "detail": str(e)
        }), 500


@api_face.post("/api/face/identify")
@login_required
def face_identify():
    """
    Recibe una imagen y busca coincidencia con plantillas activas.
    Respuesta esperada por tu FaceCheckin.jsx:
      {
        "match": true/false,
        "cliente": {...} | null,
        "score": 0.xx
      }
    """
    image = request.files.get("image")
    if not image:
        return jsonify({"error": "No se recibió imagen"}), 400

    try:
        analyzer = get_face_analyzer()
        img = decode_image_from_request(image)

        if img is None:
            return jsonify({"error": "No se pudo leer la imagen"}), 400

        faces = analyzer.get(img)
        if not faces:
            return jsonify({
                "match": False,
                "cliente": None,
                "score": 0.0,
                "message": "No se detectó rostro"
            }), 200

        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        probe_embedding = face.embedding

        templates = (
            db.session.query(FaceTemplate, Cliente)
            .join(Cliente, Cliente.cliente_id == FaceTemplate.cliente_id)
            .filter(FaceTemplate.is_active == True)
            .all()
        )

        if not templates:
            return jsonify({
                "match": False,
                "cliente": None,
                "score": 0.0,
                "message": "No hay rostros enrolados"
            }), 200

        best_score = -1.0
        best_cliente = None

        for tpl, cliente in templates:
            score = cosine_similarity(probe_embedding, tpl.embedding)
            if score > best_score:
                best_score = score
                best_cliente = cliente

        # Umbral inicial razonable para InsightFace
        threshold = 0.45

        if best_cliente is None or best_score < threshold:
            return jsonify({
                "match": False,
                "cliente": None,
                "score": round(float(best_score), 4) if best_score >= 0 else 0.0
            }), 200

        return jsonify({
            "match": True,
            "cliente": {
                "cliente_id": best_cliente.cliente_id,
                "nombre": best_cliente.nombre,
                "apellido": best_cliente.apellido,
                "rut": best_cliente.rut,
            },
            "score": round(float(best_score), 4)
        }), 200

    except Exception as e:
        return jsonify({
            "error": "Error identify",
            "detail": str(e)
        }), 500


@api_face.post("/api/asistencias/face/confirm")
@login_required
def face_confirm():
    """
    Confirma coincidencia y registra asistencia.
    Evita duplicar 'entrada' el mismo día para el mismo cliente.
    """
    payload = request.get_json(silent=True) or {}
    cliente_id = payload.get("cliente_id")
    score = payload.get("score")

    if not cliente_id:
        return jsonify({"error": "cliente_id es obligatorio"}), 400

    cliente = Cliente.query.get(cliente_id)
    if not cliente:
        return jsonify({"error": "Cliente no encontrado"}), 404

    try:
        hoy = _now_local().date()

        existente = (
            Asistencia.query
            .filter(
                Asistencia.cliente_id == cliente.cliente_id,
                Asistencia.tipo == "entrada",
                func.date(Asistencia.fecha_hora) == hoy,
            )
            .order_by(Asistencia.fecha_hora.asc())
            .first()
        )

        if existente:
            return jsonify({
                "ok": False,
                "already_marked": True,
                "message": "El cliente ya registró entrada hoy",
                "hora": existente.fecha_hora.isoformat() if existente.fecha_hora else None,
                "score": score,
                "cliente": {
                    "cliente_id": cliente.cliente_id,
                    "nombre": cliente.nombre,
                    "apellido": cliente.apellido,
                    "rut": cliente.rut,
                },
                "asistencia": {
                    "asistencia_id": existente.asistencia_id,
                    "tipo": existente.tipo,
                    "fecha_hora": existente.fecha_hora.isoformat() if existente.fecha_hora else None,
                }
            }), 200

        asistencia = Asistencia(
            cliente_id=cliente.cliente_id,
            fecha_hora=_now_local(),
            tipo="entrada",
        )

        db.session.add(asistencia)
        db.session.commit()

        return jsonify({
            "ok": True,
            "already_marked": False,
            "hora": asistencia.fecha_hora.isoformat() if asistencia.fecha_hora else None,
            "score": score,
            "cliente": {
                "cliente_id": cliente.cliente_id,
                "nombre": cliente.nombre,
                "apellido": cliente.apellido,
                "rut": cliente.rut,
            },
            "asistencia": {
                "asistencia_id": asistencia.asistencia_id,
                "tipo": asistencia.tipo,
                "fecha_hora": asistencia.fecha_hora.isoformat() if asistencia.fecha_hora else None,
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Error confirmando asistencia facial",
            "detail": str(e)
        }), 500