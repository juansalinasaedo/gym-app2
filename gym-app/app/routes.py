from sqlalchemy.exc import IntegrityError
from flask import Blueprint, jsonify, request, send_file, session
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy import func, cast, Date
from sqlalchemy.engine import Engine
from zoneinfo import ZoneInfo
from .decorators import login_required, roles_required
import pytz
import io
import qrcode
import datetime as dt

from . import db
from .models import Cliente, Membresia, Pago, Asistencia, ClienteMembresia, CierreCaja

from openpyxl import Workbook
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader

bp = Blueprint("api", __name__)


def _today_local():
    try:
        return datetime.now(ZoneInfo("America/Santiago")).date()
    except Exception:
        return date.today()


def _now_local():
    try:
        return datetime.now(ZoneInfo("America/Santiago"))
    except Exception:
        return datetime.now()


# -------------------- CLIENTES --------------------

@bp.get("/clientes")
@login_required
def listar_clientes():
    clientes = (
        Cliente.query
        .order_by(Cliente.nombre.asc(), Cliente.apellido.asc())
        .all()
    )
    return jsonify([c.to_dict() for c in clientes])


@bp.post("/clientes")
@login_required
def crear_cliente():
    payload = request.get_json(silent=True) or {}

    rut = (payload.get("rut") or "").strip()
    nombre = (payload.get("nombre") or "").strip()
    apellido = (payload.get("apellido") or "").strip()
    telefono = (payload.get("telefono") or "").strip() or None
    email = (payload.get("email") or "").strip() or None
    direccion = (payload.get("direccion") or "").strip() or None
    estado_laboral = (payload.get("estado_laboral") or "").strip() or None
    sexo = (payload.get("sexo") or "").strip() or None

    if not rut or not nombre or not apellido:
        return jsonify({"error": "rut, nombre y apellido son obligatorios"}), 400

    if Cliente.query.filter_by(rut=rut).first():
        return jsonify({"error": "Ya existe un cliente con ese RUT"}), 409

    if email and Cliente.query.filter_by(email=email).first():
        return jsonify({"error": "Ya existe un cliente con ese email"}), 409

    try:
        c = Cliente(
            rut=rut,
            nombre=nombre,
            apellido=apellido,
            telefono=telefono,
            email=email,
            direccion=direccion,
            estado_laboral=estado_laboral,
            sexo=sexo,
            estado="activo",
        )

        if hasattr(c, "ensure_qr_token"):
            c.ensure_qr_token()

        db.session.add(c)
        db.session.commit()

        return jsonify({
            "cliente_id": c.cliente_id,
            "cliente": {
                "cliente_id": c.cliente_id,
                "rut": c.rut,
                "nombre": c.nombre,
                "apellido": c.apellido,
                "telefono": c.telefono,
                "email": c.email,
                "direccion": c.direccion,
                "estado_laboral": c.estado_laboral,
                "sexo": c.sexo,
                "estado": c.estado,
                "qr_token": getattr(c, "qr_token", None),
            }
        }), 201

    except IntegrityError as e:
        db.session.rollback()
        return jsonify({
            "error": "conflicto_integridad_bd",
            "detail": str(e.orig) if getattr(e, "orig", None) else str(e)
        }), 409

    except Exception as e:
        db.session.rollback()
        print("ERROR crear_cliente:", str(e))
        return jsonify({
            "error": "Error interno al crear cliente",
            "detail": str(e)
        }), 500


@bp.get("/clientes/<int:cliente_id>")
@login_required
def obtener_cliente(cliente_id):
    c = Cliente.query.get_or_404(cliente_id)
    return jsonify(c.to_dict())


@bp.put("/clientes/<int:cliente_id>")
@login_required
def actualizar_cliente(cliente_id):
    c = Cliente.query.get_or_404(cliente_id)
    payload = request.get_json(silent=True) or {}

    rut = (payload.get("rut") or c.rut or "").strip()
    nombre = (payload.get("nombre") or c.nombre or "").strip()
    apellido = (payload.get("apellido") or c.apellido or "").strip()
    telefono = (payload.get("telefono") or "").strip() or None
    email = (payload.get("email") or "").strip() or None
    direccion = (payload.get("direccion") or "").strip() or None
    estado_laboral = (payload.get("estado_laboral") or "").strip() or None
    sexo = (payload.get("sexo") or "").strip() or None
    estado = (payload.get("estado") or c.estado or "activo").strip()

    if not rut or not nombre or not apellido:
        return jsonify({"error": "rut, nombre y apellido son obligatorios"}), 400

    otro_rut = Cliente.query.filter(Cliente.rut == rut, Cliente.cliente_id != cliente_id).first()
    if otro_rut:
        return jsonify({"error": "Ya existe otro cliente con ese RUT"}), 409

    if email:
        otro_email = Cliente.query.filter(Cliente.email == email, Cliente.cliente_id != cliente_id).first()
        if otro_email:
            return jsonify({"error": "Ya existe otro cliente con ese email"}), 409

    try:
        c.rut = rut
        c.nombre = nombre
        c.apellido = apellido
        c.telefono = telefono
        c.email = email
        c.direccion = direccion
        c.estado_laboral = estado_laboral
        c.sexo = sexo
        c.estado = estado

        db.session.commit()

        return jsonify({
            "ok": True,
            "cliente": c.to_dict()
        })

    except IntegrityError as e:
        db.session.rollback()
        return jsonify({
            "error": "conflicto_integridad_bd",
            "detail": str(e.orig) if getattr(e, "orig", None) else str(e)
        }), 409

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Error interno al actualizar cliente",
            "detail": str(e)
        }), 500


# -------------------- MEMBRESÍAS --------------------

@bp.get("/membresias")
@login_required
def listar_membresias():
    items = Membresia.query.order_by(Membresia.membresia_id.asc()).all()

    out = []
    for m in items:
        out.append({
            "membresia_id": m.membresia_id,
            "nombre": getattr(m, "nombre", None),
            "precio": float(getattr(m, "precio", 0) or 0),
            "duracion_dias": getattr(m, "duracion_dias", None),
            "descripcion": getattr(m, "descripcion", None),
            "activa": getattr(m, "activa", True),
        })

    return jsonify(out)


@bp.post("/membresias")
@login_required
def crear_membresia():
    payload = request.get_json(silent=True) or {}

    nombre = (payload.get("nombre") or "").strip()
    precio = payload.get("precio")
    duracion_dias = payload.get("duracion_dias")
    descripcion = (payload.get("descripcion") or "").strip() or None

    if not nombre:
        return jsonify({"error": "El nombre es obligatorio"}), 400

    if precio in (None, ""):
        return jsonify({"error": "El precio es obligatorio"}), 400

    if duracion_dias in (None, ""):
        return jsonify({"error": "La duración es obligatoria"}), 400

    try:
        m = Membresia(
            nombre=nombre,
            precio=precio,
            duracion_dias=int(duracion_dias),
        )

        if hasattr(m, "descripcion"):
            m.descripcion = descripcion

        db.session.add(m)
        db.session.commit()

        return jsonify({
            "membresia_id": m.membresia_id,
            "nombre": getattr(m, "nombre", None),
            "precio": float(getattr(m, "precio", 0) or 0),
            "duracion_dias": getattr(m, "duracion_dias", None),
            "descripcion": getattr(m, "descripcion", None),
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Error al crear membresía",
            "detail": str(e)
        }), 500


@bp.put("/membresias/<int:membresia_id>")
@login_required
def actualizar_membresia(membresia_id):
    m = Membresia.query.get_or_404(membresia_id)
    payload = request.get_json(silent=True) or {}

    try:
        if "nombre" in payload:
            m.nombre = (payload.get("nombre") or "").strip()

        if "precio" in payload and payload.get("precio") not in (None, ""):
            m.precio = payload.get("precio")

        if "duracion_dias" in payload and payload.get("duracion_dias") not in (None, ""):
            m.duracion_dias = int(payload.get("duracion_dias"))

        if "descripcion" in payload and hasattr(m, "descripcion"):
            m.descripcion = (payload.get("descripcion") or "").strip() or None

        if "activa" in payload and hasattr(m, "activa"):
            m.activa = bool(payload.get("activa"))

        db.session.commit()

        return jsonify({
            "ok": True,
            "membresia": {
                "membresia_id": m.membresia_id,
                "nombre": getattr(m, "nombre", None),
                "precio": float(getattr(m, "precio", 0) or 0),
                "duracion_dias": getattr(m, "duracion_dias", None),
                "descripcion": getattr(m, "descripcion", None),
                "activa": getattr(m, "activa", True),
            }
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Error al actualizar membresía",
            "detail": str(e)
        }), 500


@bp.delete("/membresias/<int:membresia_id>")
@login_required
def eliminar_membresia(membresia_id):
    m = Membresia.query.get_or_404(membresia_id)

    try:
        db.session.delete(m)
        db.session.commit()
        return jsonify({"ok": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Error al eliminar membresía",
            "detail": str(e)
        }), 500


@bp.get("/clientes/<int:cliente_id>/membresia-activa")
@login_required
def obtener_membresia_activa(cliente_id):
    hoy = _today_local()

    cm = (
        ClienteMembresia.query
        .filter(
            ClienteMembresia.cliente_id == cliente_id,
            ClienteMembresia.estado == "activa",
            ClienteMembresia.fecha_inicio <= hoy,
            ClienteMembresia.fecha_fin >= hoy,
        )
        .order_by(ClienteMembresia.fecha_fin.desc())
        .first()
    )

    if not cm:
        return jsonify({"activa": False, "membresia": None})

    m = Membresia.query.get(cm.membresia_id)

    return jsonify({
        "activa": True,
        "membresia": {
            "cliente_membresia_id": cm.cliente_membresia_id,
            "cliente_id": cm.cliente_id,
            "membresia_id": cm.membresia_id,
            "nombre": getattr(m, "nombre", None) if m else None,
            "precio": float(getattr(m, "precio", 0) or 0) if m else 0,
            "duracion_dias": getattr(m, "duracion_dias", None) if m else None,
            "fecha_inicio": cm.fecha_inicio.isoformat() if cm.fecha_inicio else None,
            "fecha_fin": cm.fecha_fin.isoformat() if cm.fecha_fin else None,
            "estado": cm.estado,
        }
    })


# -------------------- ASISTENCIAS --------------------

@bp.get("/asistencias/hoy")
@login_required
def listar_asistencias_hoy():
    hoy = _today_local()

    rows = (
        db.session.query(Asistencia, Cliente)
        .join(Cliente, Cliente.cliente_id == Asistencia.cliente_id)
        .filter(func.date(Asistencia.fecha_hora) == hoy)
        .order_by(Asistencia.fecha_hora.desc())
        .all()
    )

    data = []
    for a, c in rows:
        data.append({
            "asistencia_id": a.asistencia_id,
            "cliente_id": c.cliente_id,
            "nombre": c.nombre,
            "apellido": c.apellido,
            "rut": c.rut,
            "fecha_hora": a.fecha_hora.isoformat() if a.fecha_hora else None,
            "tipo": getattr(a, "tipo", "entrada"),
        })

    return jsonify(data)

@bp.post("/asistencias")
@login_required
def marcar_asistencia():
    payload = request.get_json(silent=True) or {}

    cliente_id = payload.get("cliente_id")
    tipo = (payload.get("tipo") or "entrada").strip()

    if not cliente_id:
        return jsonify({"error": "cliente_id es obligatorio"}), 400

    cliente = Cliente.query.get(cliente_id)
    if not cliente:
        return jsonify({"error": "Cliente no encontrado"}), 404

    try:
        hoy = _today_local()

        if tipo == "entrada":
            existente = (
                Asistencia.query
                .filter(
                    Asistencia.cliente_id == cliente_id,
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
                    "asistencia": {
                        "asistencia_id": existente.asistencia_id,
                        "cliente_id": existente.cliente_id,
                        "fecha_hora": existente.fecha_hora.isoformat() if existente.fecha_hora else None,
                        "tipo": getattr(existente, "tipo", "entrada"),
                    }
                }), 200

        a = Asistencia(
            cliente_id=cliente_id,
            fecha_hora=_now_local(),
        )

        if hasattr(a, "tipo"):
            a.tipo = tipo

        db.session.add(a)
        db.session.commit()

        return jsonify({
            "ok": True,
            "already_marked": False,
            "asistencia": {
                "asistencia_id": a.asistencia_id,
                "cliente_id": a.cliente_id,
                "fecha_hora": a.fecha_hora.isoformat() if a.fecha_hora else None,
                "tipo": getattr(a, "tipo", tipo),
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Error al marcar asistencia",
            "detail": str(e)
        }), 500

@bp.post("/asistencias/qr")
@login_required
def marcar_asistencia_qr():
    payload = request.get_json(silent=True) or {}
    token = (payload.get("token") or "").strip()

    if not token:
        return jsonify({"error": "token es obligatorio"}), 400

    if not hasattr(Cliente, "qr_token"):
        return jsonify({"error": "El modelo Cliente no tiene qr_token"}), 400

    cliente = Cliente.query.filter_by(qr_token=token).first()
    if not cliente:
        return jsonify({"error": "QR no válido"}), 404

    try:
        a = Asistencia(
            cliente_id=cliente.cliente_id,
            fecha_hora=_now_local(),
        )

        if hasattr(a, "tipo"):
            a.tipo = "entrada"

        db.session.add(a)
        db.session.commit()

        return jsonify({
            "ok": True,
            "cliente": {
                "cliente_id": cliente.cliente_id,
                "nombre": cliente.nombre,
                "apellido": cliente.apellido,
                "rut": cliente.rut,
            },
            "asistencia": {
                "asistencia_id": a.asistencia_id,
                "fecha_hora": a.fecha_hora.isoformat() if a.fecha_hora else None,
                "tipo": getattr(a, "tipo", "entrada"),
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Error al marcar asistencia por QR",
            "detail": str(e)
        }), 500


@bp.get("/asistencias/rango")
@login_required
def asistencias_rango():
    desde = (request.args.get("from") or "").strip()
    hasta = (request.args.get("to") or "").strip()

    if not desde or not hasta:
        return jsonify({"error": "Debe enviar from y to en formato YYYY-MM-DD"}), 400

    try:
        f1 = datetime.strptime(desde, "%Y-%m-%d").date()
        f2 = datetime.strptime(hasta, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Formato de fecha inválido. Use YYYY-MM-DD"}), 400

    rows = (
        db.session.query(Asistencia, Cliente)
        .join(Cliente, Cliente.cliente_id == Asistencia.cliente_id)
        .filter(
            func.date(Asistencia.fecha_hora) >= f1,
            func.date(Asistencia.fecha_hora) <= f2,
        )
        .order_by(Asistencia.fecha_hora.desc())
        .all()
    )

    data = []
    for a, c in rows:
        data.append({
            "asistencia_id": a.asistencia_id,
            "cliente_id": c.cliente_id,
            "nombre": c.nombre,
            "apellido": c.apellido,
            "rut": c.rut,
            "fecha_hora": a.fecha_hora.isoformat() if a.fecha_hora else None,
            "tipo": getattr(a, "tipo", "entrada"),
        })

    return jsonify(data)

@bp.get("/asistencias/rango/excel")
@login_required
def exportar_asistencias_rango_excel():
    desde = (request.args.get("from") or request.args.get("desde") or "").strip()
    hasta = (request.args.get("to") or request.args.get("hasta") or "").strip()

    if not desde or not hasta:
        return jsonify({"error": "Debe enviar from/to o desde/hasta en formato YYYY-MM-DD"}), 400

    try:
        f1 = datetime.strptime(desde, "%Y-%m-%d").date()
        f2 = datetime.strptime(hasta, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Formato de fecha inválido. Use YYYY-MM-DD"}), 400

    rows = (
        db.session.query(Asistencia, Cliente)
        .join(Cliente, Cliente.cliente_id == Asistencia.cliente_id)
        .filter(
            func.date(Asistencia.fecha_hora) >= f1,
            func.date(Asistencia.fecha_hora) <= f2,
        )
        .order_by(Asistencia.fecha_hora.desc())
        .all()
    )

    wb = Workbook()
    ws = wb.active
    ws.title = "Asistencias"

    ws.append([
        "Asistencia ID",
        "Fecha",
        "Hora",
        "Cliente ID",
        "Cliente",
        "RUT",
        "Tipo",
    ])

    for a, c in rows:
        fecha_txt = a.fecha_hora.strftime("%Y-%m-%d") if a.fecha_hora else ""
        hora_txt = a.fecha_hora.strftime("%H:%M") if a.fecha_hora else ""

        ws.append([
            a.asistencia_id,
            fecha_txt,
            hora_txt,
            c.cliente_id,
            f"{c.nombre} {c.apellido}",
            c.rut,
            getattr(a, "tipo", "entrada"),
        ])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    nombre_archivo = f"asistencias_{f1.strftime('%Y%m%d')}_{f2.strftime('%Y%m%d')}.xlsx"

    return send_file(
        output,
        as_attachment=True,
        download_name=nombre_archivo,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
# DEBUG TEST

# -------------------- PAGOS --------------------

@bp.get("/pagos/hoy")
@login_required
def listar_pagos_hoy():
    hoy = _today_local()

    rows = (
        db.session.query(Pago, Cliente, ClienteMembresia, Membresia)
        .join(Cliente, Cliente.cliente_id == Pago.cliente_id)
        .outerjoin(
            ClienteMembresia,
            ClienteMembresia.cliente_membresia_id == Pago.cliente_membresia_id
        )
        .outerjoin(
            Membresia,
            Membresia.membresia_id == ClienteMembresia.membresia_id
        )
        .filter(func.date(Pago.fecha_pago) == hoy)
        .order_by(Pago.fecha_pago.desc())
        .all()
    )

    data = []
    total_general = 0
    total_efectivo = 0
    total_tarjeta = 0
    total_transferencia = 0

    for p, c, cm, m in rows:
        monto = float(p.monto or 0)
        metodo = (p.metodo_pago or "").strip()

        total_general += monto
        if metodo == "Efectivo":
            total_efectivo += monto
        elif metodo == "Tarjeta":
            total_tarjeta += monto
        elif metodo == "Transferencia":
            total_transferencia += monto

        data.append({
            "pago_id": p.pago_id,
            "cliente_id": c.cliente_id,
            "cliente": f"{c.nombre} {c.apellido}",
            "rut": c.rut,
            "membresia": m.nombre if m else None,
            "monto": monto,
            "metodo_pago": metodo,
            "fecha_pago": p.fecha_pago.isoformat() if p.fecha_pago else None,
        })

    return jsonify({
        "items": data,
        "resumen": {
            "total_general": total_general,
            "total_efectivo": total_efectivo,
            "total_tarjeta": total_tarjeta,
            "total_transferencia": total_transferencia,
        }
    })


@bp.get("/pagos/export/excel")
@login_required
def exportar_pagos_excel():
    desde = (request.args.get("from") or "").strip()
    hasta = (request.args.get("to") or "").strip()

    try:
        if desde:
            f1 = datetime.strptime(desde, "%Y-%m-%d").date()
        else:
            f1 = _today_local() - timedelta(days=30)

        if hasta:
            f2 = datetime.strptime(hasta, "%Y-%m-%d").date()
        else:
            f2 = _today_local()
    except ValueError:
        return jsonify({"error": "Formato de fecha inválido. Use YYYY-MM-DD"}), 400

    rows = (
        db.session.query(Pago, Cliente, ClienteMembresia, Membresia)
        .join(Cliente, Cliente.cliente_id == Pago.cliente_id)
        .outerjoin(
            ClienteMembresia,
            ClienteMembresia.cliente_membresia_id == Pago.cliente_membresia_id
        )
        .outerjoin(
            Membresia,
            Membresia.membresia_id == ClienteMembresia.membresia_id
        )
        .filter(
            func.date(Pago.fecha_pago) >= f1,
            func.date(Pago.fecha_pago) <= f2,
        )
        .order_by(Pago.fecha_pago.desc())
        .all()
    )

    wb = Workbook()
    ws = wb.active
    ws.title = "Pagos"

    ws.append([
        "Pago ID",
        "Fecha pago",
        "Cliente ID",
        "Cliente",
        "RUT",
        "Membresía",
        "Monto",
        "Método de pago",
    ])

    for p, c, cm, m in rows:
        ws.append([
            p.pago_id,
            p.fecha_pago.strftime("%Y-%m-%d %H:%M:%S") if p.fecha_pago else "",
            c.cliente_id,
            f"{c.nombre} {c.apellido}",
            c.rut,
            m.nombre if m else "",
            float(p.monto or 0),
            p.metodo_pago or "",
        ])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    nombre_archivo = f"pagos_{f1.strftime('%Y%m%d')}_{f2.strftime('%Y%m%d')}.xlsx"

    return send_file(
        output,
        as_attachment=True,
        download_name=nombre_archivo,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )