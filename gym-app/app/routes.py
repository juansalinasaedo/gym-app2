from flask import Blueprint, jsonify, request, send_file
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

bp = Blueprint("api", __name__, url_prefix="/api")

APP_TZ = ZoneInfo("America/Santiago")
CL_TZ = pytz.timezone("America/Santiago")
CHILE_TZ = ZoneInfo("America/Santiago")


def to_cl_time(dt_value):
    """Convierte un datetime (naive o con tz) a America/Santiago y retorna HH:MM."""
    if dt_value is None:
        return None
    if dt_value.tzinfo is None:
        dt_value = dt_value.replace(tzinfo=timezone.utc)
    return dt_value.astimezone(APP_TZ).strftime("%H:%M")


# -------------------- Helpers --------------------
def _hora_local_hhmm(dt_value):
    if dt_value is None:
        return ""
    if dt_value.tzinfo is None:
        dt_value = dt_value.replace(tzinfo=ZoneInfo("UTC"))
    return dt_value.astimezone(CHILE_TZ).strftime("%H:%M")


def _to_datetime(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=ZoneInfo("UTC"))
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            pass
    return datetime.now(tz=ZoneInfo("UTC"))


def _decimal(value, default=Decimal("0")):
    if value is None or value == "":
        return default
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except Exception:
        return default


def _to_chile_dt(dt_any):
    dt_value = _to_datetime(dt_any)
    if dt_value.tzinfo is None:
        dt_value = dt_value.replace(tzinfo=ZoneInfo("UTC"))
    return dt_value.astimezone(CHILE_TZ)


def _is_postgres(session) -> bool:
    eng: Engine = session.get_bind()
    return eng.dialect.name == "postgresql"


# -------------------- Clientes --------------------
@bp.get("/clientes")
@login_required
def listar_clientes():
    clientes = (
        Cliente.query
        .order_by(Cliente.nombre.asc(), Cliente.apellido.asc())
        .all()
    )
    data = [
        {
            "cliente_id": c.cliente_id,
            "nombre": c.nombre,
            "apellido": c.apellido,
            "rut": c.rut,
            "email": c.email,
            "telefono": c.telefono,
            "direccion": c.direccion,
            "estado_laboral": c.estado_laboral,
            "sexo": c.sexo,
        }
        for c in clientes
    ]
    return jsonify(data)


@bp.post("/clientes")
@login_required
def crear_cliente():
    payload = request.json or {}
    nombre = (payload.get("nombre") or "").strip()
    apellido = (payload.get("apellido") or "").strip()
    rut = (payload.get("rut") or "").strip()
    email = (payload.get("email") or "").strip()
    telefono = (payload.get("telefono") or "").strip()
    direccion = (payload.get("direccion") or "").strip()
    estado_laboral = (payload.get("estado_laboral") or "").strip()
    sexo = (payload.get("sexo") or "").strip()

    if not nombre:
        return jsonify({"error": "El nombre es obligatorio"}), 400

    cliente = Cliente(
        nombre=nombre,
        apellido=apellido,
        rut=rut,
        email=email,
        telefono=telefono,
        direccion=direccion,
        estado_laboral=estado_laboral,
        sexo=sexo,
    )
    db.session.add(cliente)
    db.session.commit()

    return jsonify({
        "cliente_id": cliente.cliente_id,
        "nombre": cliente.nombre,
        "apellido": cliente.apellido,
        "rut": cliente.rut,
        "email": cliente.email,
        "telefono": cliente.telefono,
        "direccion": cliente.direccion,
        "estado_laboral": cliente.estado_laboral,
        "sexo": cliente.sexo,
    }), 201

# -------------------- QR de clientes --------------------
@bp.get("/clientes/<int:cliente_id>/qr")
@login_required
def qr_cliente(cliente_id):
    """
    Devuelve la imagen PNG del código QR asociado al cliente.
    El QR contiene el token único (qr_token) del cliente.
    """
    cliente = Cliente.query.get_or_404(cliente_id)

    # Por si algún cliente aún no tiene token, lo generamos en caliente
    if not getattr(cliente, "qr_token", None):
        cliente.ensure_qr_token()
        db.session.commit()

    # Contenido del QR: puedes usar solo el token, o un URL si luego quieres algo más elaborado
    qr_payload = cliente.qr_token  # o por ejemplo: f"{request.host_url}checkin/{cliente.qr_token}"

    # Generar imagen QR en memoria
    img = qrcode.make(qr_payload)
    bio = io.BytesIO()
    img.save(bio, format="PNG")
    bio.seek(0)

    return send_file(
        bio,
        mimetype="image/png",
        as_attachment=False,
        download_name=f"cliente_{cliente.cliente_id}_qr.png",
    )

# -------------------- Credencial PDF de cliente --------------------
@bp.get("/clientes/<int:cliente_id>/credencial")
@login_required
def credencial_cliente(cliente_id):
    """
    Genera una credencial en PDF para el cliente, con su QR y datos básicos.
    Formato tipo tarjeta, centrada en una hoja A4 (para impresión).
    """
    cliente = Cliente.query.get_or_404(cliente_id)

    # Aseguramos que tenga token QR
    if not getattr(cliente, "qr_token", None):
        cliente.ensure_qr_token()
        db.session.commit()

    # 1) Generar imagen QR (PIL) en memoria
    qr_payload = cliente.qr_token
    qr_img = qrcode.make(qr_payload)
    img_buffer = io.BytesIO()
    qr_img.save(img_buffer, format="PNG")
    img_buffer.seek(0)

    # 2) Crear PDF en memoria
    pdf_buffer = io.BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=A4)
    page_width, page_height = A4

    # Tamaño típico de credencial: 85 x 54 mm (tarjeta bancaria aprox.)
    card_width = 85 * mm
    card_height = 54 * mm

    # Centramos la tarjeta en la hoja
    x = (page_width - card_width) / 2
    y = (page_height - card_height) / 2

    # Marco de la tarjeta
    c.setLineWidth(1)
    c.roundRect(x, y, card_width, card_height, 4 * mm, stroke=1, fill=0)

    margin = 6 * mm

    # 3) Zona del QR dentro de la tarjeta
    qr_size = card_height - 2 * margin  # cuadrado que ocupa casi todo el alto
    qr_x = x + card_width - margin - qr_size
    qr_y = y + margin

    c.drawImage(
        ImageReader(img_buffer),
        qr_x,
        qr_y,
        qr_size,
        qr_size,
        preserveAspectRatio=True,
        mask="auto",
    )

    # 4) Texto del lado izquierdo
    text_x = x + margin
    text_y = y + card_height - margin - 10

    # Nombre del gimnasio (pon el nombre real si quieres)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(text_x, text_y, "Gimnasio")

    # Nombre del cliente
    full_name = f"{cliente.nombre or ''} {cliente.apellido or ''}".strip()
    text_y -= 16
    c.setFont("Helvetica-Bold", 10)
    c.drawString(text_x, text_y, full_name or "Cliente")

    # RUT
    if cliente.rut:
        text_y -= 14
        c.setFont("Helvetica", 9)
        c.drawString(text_x, text_y, f"RUT: {cliente.rut}")

    # Email (si hay)
    if cliente.email:
        text_y -= 14
        c.setFont("Helvetica", 8)
        c.drawString(text_x, text_y, cliente.email)

    # Etiqueta pequeña
    text_y = y + margin
    c.setFont("Helvetica-Oblique", 7)
    c.drawString(text_x, text_y, "Credencial de acceso · Uso exclusivo del gimnasio")

    c.showPage()
    c.save()
    pdf_buffer.seek(0)

    filename = f"credencial_cliente_{cliente.cliente_id}.pdf"
    return send_file(
        pdf_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )

# -------------------- Membresías --------------------
@bp.get("/membresias")
@login_required
def listar_membresias():
    planes = Membresia.query.order_by(Membresia.nombre.asc()).all()
    data = [
        {
            "membresia_id": m.membresia_id,
            "nombre": m.nombre,
            "duracion_dias": m.duracion_dias,
            "precio": float(m.precio),
        }
        for m in planes
    ]
    return jsonify(data)


@bp.post("/membresias")
@roles_required("admin")
def crear_membresia():
    payload = request.json or {}
    nombre = (payload.get("nombre") or "").strip()
    duracion_dias = int(payload.get("duracion_dias") or 0)
    precio = _decimal(payload.get("precio"), Decimal("0"))

    if not nombre:
        return jsonify({"error": "El nombre es obligatorio"}), 400
    if duracion_dias <= 0:
        return jsonify({"error": "La duración debe ser mayor a 0"}), 400
    if precio <= 0:
        return jsonify({"error": "El precio debe ser mayor a 0"}), 400

    m = Membresia(
        nombre=nombre,
        duracion_dias=duracion_dias,
        precio=precio,
    )
    db.session.add(m)
    db.session.commit()

    return jsonify({
        "membresia_id": m.membresia_id,
        "nombre": m.nombre,
        "duracion_dias": m.duracion_dias,
        "precio": float(m.precio),
    }), 201


# -------------------- Asistencias --------------------
@bp.get("/asistencias/hoy")
@login_required
def asistencias_hoy():
    hoy = date.today()

    if _is_postgres(db.session):
        tz_expr = func.timezone("America/Santiago", Asistencia.fecha_hora)
        fecha_local = cast(tz_expr, Date)
        hora_local = func.to_char(tz_expr, "HH24:MI").label("hora")
        rows = (
            db.session.query(
                Asistencia.asistencia_id,
                Asistencia.cliente_id,
                hora_local,
                Cliente.nombre,
                Cliente.apellido,
                Cliente.rut,
            )
            .join(Cliente, Cliente.cliente_id == Asistencia.cliente_id)
            .filter(fecha_local == hoy)
            .order_by(hora_local.asc())
            .all()
        )
        data = [
            {
                "asistencia_id": a_id,
                "cliente_id": c_id,
                "hora": hora_txt or "",
                "nombre": nombre,
                "apellido": apellido,
                "rut": rut,
            }
            for a_id, c_id, hora_txt, nombre, apellido, rut in rows
        ]
        return jsonify(data)

    # Caso no Postgres (ej. SQLite)
    dia_inicio = datetime(hoy.year, hoy.month, hoy.day, 0, 0, 0, tzinfo=CHILE_TZ)
    dia_fin = dia_inicio + timedelta(days=1)

    rows = (
        Asistencia.query
        .join(Cliente)
        .filter(Asistencia.fecha_hora >= dia_inicio)
        .filter(Asistencia.fecha_hora < dia_fin)
        .order_by(Asistencia.fecha_hora.asc())
        .all()
    )

    data = [
        {
            "asistencia_id": a.asistencia_id,
            "cliente_id": a.cliente_id,
            "hora": _hora_local_hhmm(a.fecha_hora),
            "nombre": a.cliente.nombre,
            "apellido": a.cliente.apellido,
            "rut": a.cliente.rut,
        }
        for a in rows
    ]
    return jsonify(data)


@bp.post("/asistencias")
@login_required
def registrar_asistencia():
    payload = request.json or {}
    cliente_id = payload.get("cliente_id")
    if not cliente_id:
        return jsonify({"error": "cliente_id es obligatorio"}), 400

    hoy = date.today()

    ya_existe = (
        Asistencia.query
        .filter(Asistencia.cliente_id == int(cliente_id))
        .filter(func.date(Asistencia.fecha_hora) == hoy)
        .first()
    )
    if ya_existe:
        return jsonify({"error": "El cliente ya registró asistencia hoy"}), 409

    now_utc = datetime.now(tz=ZoneInfo("UTC"))
    a = Asistencia(
        cliente_id=int(cliente_id),
        fecha_hora=now_utc,
        tipo="entrada",  # aprovechamos el default, pero lo explicitamos
    )
    db.session.add(a)
    db.session.commit()

    return jsonify({
        "asistencia_id": a.asistencia_id,
        "cliente_id": a.cliente_id,
        "hora": _hora_local_hhmm(a.fecha_hora),
    }), 201


# NUEVO: registrar asistencia usando token de QR
@bp.post("/asistencias/qr")
@login_required
def registrar_asistencia_qr():
    payload = request.json or {}
    token = (payload.get("token") or "").strip()

    if not token:
        return jsonify({"error": "token_requerido"}), 400

    cliente = Cliente.query.filter_by(qr_token=token).first()
    if not cliente:
        return jsonify({"error": "token_invalido"}), 404

    hoy = date.today()

    # Evitar duplicar asistencia del mismo día
    ya_existe = (
        Asistencia.query
        .filter(Asistencia.cliente_id == cliente.cliente_id)
        .filter(func.date(Asistencia.fecha_hora) == hoy)
        .first()
    )
    if ya_existe:
        return jsonify({
            "ok": True,
            "duplicado": True,
            "mensaje": "El cliente ya registró asistencia hoy.",
            "cliente": {
                "cliente_id": cliente.cliente_id,
                "nombre": cliente.nombre,
                "apellido": cliente.apellido,
                "rut": cliente.rut,
            },
            "asistencia_id": ya_existe.asistencia_id,
            # Usamos el helper para el registro existente
            "hora": _hora_local_hhmm(ya_existe.fecha_hora),
        }), 200

    # Hora actual en Chile y su equivalente en UTC.
    now_cl = datetime.now(CHILE_TZ)
    now_utc = now_cl.astimezone(ZoneInfo("UTC"))

    a = Asistencia(
        cliente_id=cliente.cliente_id,
        fecha_hora=now_utc,  # guardamos en UTC
        tipo="entrada",
    )
    db.session.add(a)
    db.session.commit()

    return jsonify({
        "ok": True,
        "duplicado": False,
        "mensaje": "Asistencia registrada correctamente.",
        "cliente": {
            "cliente_id": cliente.cliente_id,
            "nombre": cliente.nombre,
            "apellido": cliente.apellido,
            "rut": cliente.rut,
        },
        "asistencia_id": a.asistencia_id,
        # Aquí usamos directamente la hora local calculada en el momento del check-in
        "hora": now_cl.strftime("%H:%M"),
    }), 201

# -------------------- Pagos --------------------
@bp.get("/pagos/hoy")
@login_required
def pagos_hoy():
    hoy = date.today()
    if _is_postgres(db.session):
        tz_expr = func.timezone("America/Santiago", Pago.fecha_pago)
        fecha_local = cast(tz_expr, Date)
        hora_local = func.to_char(tz_expr, "HH24:MI").label("hora")
        rows = (
            db.session.query(
                Pago.pago_id, Pago.monto, Pago.metodo_pago, hora_local,
                Cliente.nombre, Cliente.apellido, Cliente.rut
            )
            .join(Cliente)
            .filter(fecha_local == hoy)
            .order_by(hora_local.asc())
            .all()
        )
        data = [
            {
                "pago_id": p_id,
                "monto": float(monto or 0),
                "metodo_pago": metodo,
                "hora": hora_txt or "",
                "nombre": nombre,
                "apellido": apellido,
                "rut": rut,
            }
            for p_id, monto, metodo, hora_txt, nombre, apellido, rut in rows
        ]
    else:
        dia_inicio = datetime(hoy.year, hoy.month, hoy.day, 0, 0, 0, tzinfo=CHILE_TZ)
        dia_fin = dia_inicio + timedelta(days=1)

        rows = (
            Pago.query
            .join(Cliente)
            .filter(Pago.fecha_pago >= dia_inicio)
            .filter(Pago.fecha_pago < dia_fin)
            .order_by(Pago.fecha_pago.asc())
            .all()
        )
        data = [
            {
                "pago_id": p.pago_id,
                "monto": float(p.monto or 0),
                "metodo_pago": p.metodo_pago,
                "hora": _hora_local_hhmm(p.fecha_pago),
                "nombre": p.cliente.nombre,
                "apellido": p.cliente.apellido,
                "rut": p.cliente.rut,
            }
            for p in rows
        ]

    resumen = {
        "total_general": sum(p["monto"] for p in data),
        "total_efectivo": sum(
            p["monto"] for p in data if (p["metodo_pago"] or "").lower() == "efectivo"
        ),
        "total_tarjeta": sum(
            p["monto"] for p in data if (p["metodo_pago"] or "").lower() == "tarjeta"
        ),
        "total_transferencia": sum(
            p["monto"]
            for p in data
            if (p["metodo_pago"] or "").lower() == "transferencia"
        ),
    }
    return jsonify({"pagos": data, "resumen": resumen})


@bp.get("/dashboard/resumen")
@login_required
def dashboard_resumen():
    hoy = date.today()
    hace_7 = hoy + timedelta(days=7)

    # 1) Entradas de hoy
    entradas_hoy = (
        db.session.query(func.count(Asistencia.asistencia_id))
        .filter(func.date(Asistencia.fecha_hora) == hoy)
        .scalar()
    )

    # 2) Ingresos de hoy
    pagos_hoy_total = (
        db.session.query(func.sum(Pago.monto))
        .filter(func.date(Pago.fecha_pago) == hoy)
        .scalar()
    ) or 0

    # 3) Clientes activos (con membresía activa)
    activos = (
        db.session.query(func.count(ClienteMembresia.cliente_membresia_id))
        .filter(ClienteMembresia.estado == "activa")
        .filter(ClienteMembresia.fecha_fin >= hoy)
        .scalar()
    )

    # 4) Membresías que vencen en próximos 7 días
    vencen_pronto = (
        db.session.query(func.count(ClienteMembresia.cliente_membresia_id))
        .filter(ClienteMembresia.estado == "activa")
        .filter(ClienteMembresia.fecha_fin > hoy)
        .filter(ClienteMembresia.fecha_fin <= hace_7)
        .scalar()
    )

    return jsonify(
        {
            "entradas_hoy": int(entradas_hoy or 0),
            "ingresos_hoy": float(pagos_hoy_total or 0),
            "clientes_activos": int(activos or 0),
            "vencimientos_7d": int(vencen_pronto or 0),
        }
    )


# -------------------- DASHBOARD ASISTENCIA --------------------

@bp.get("/dashboard/asistencia/dias")
@login_required
@roles_required("admin")
def dashboard_asistencia_dias():
    """Devuelve conteo de asistencias por día para los últimos 30 días."""
    hoy = date.today()
    hace_30 = hoy - timedelta(days=30)

    rows = (
        db.session.query(
            func.date(Asistencia.fecha_hora).label("dia"),
            func.count(Asistencia.asistencia_id).label("cantidad"),
        )
        .filter(func.date(Asistencia.fecha_hora) >= hace_30)
        .group_by(func.date(Asistencia.fecha_hora))
        .order_by(func.date(Asistencia.fecha_hora))
        .all()
    )

    data = [
        {"fecha": r.dia.isoformat(), "cantidad": int(r.cantidad)}
        for r in rows
    ]

    return jsonify(data)


@bp.get("/dashboard/asistencia/horas")
@login_required
@roles_required("admin")
def dashboard_asistencia_horas():
    """Devuelve cantidad de asistencias por hora del día (0-23) para los últimos 30 días."""
    hoy = date.today()
    hace_30 = hoy - timedelta(days=30)

    rows = (
        db.session.query(
            func.extract("hour", Asistencia.fecha_hora).label("hora"),
            func.count(Asistencia.asistencia_id).label("cantidad"),
        )
        .filter(func.date(Asistencia.fecha_hora) >= hace_30)
        .group_by(func.extract("hour", Asistencia.fecha_hora))
        .order_by(func.extract("hour", Asistencia.fecha_hora))
        .all()
    )

    data = [
        {"hora": int(r.hora), "cantidad": int(r.cantidad)}
        for r in rows
    ]

    return jsonify(data)


@bp.get("/dashboard/asistencia/top-clientes")
@login_required
@roles_required("admin")
def dashboard_asistencia_top_clientes():
    """Devuelve top clientes con más asistencias en el mes actual."""
    hoy = date.today()
    primer_dia_mes = hoy.replace(day=1)

    rows = (
        db.session.query(
            Cliente.cliente_id,
            Cliente.nombre,
            Cliente.apellido,
            func.count(Asistencia.asistencia_id).label("cantidad"),
        )
        .join(Asistencia, Asistencia.cliente_id == Cliente.cliente_id)
        .filter(func.date(Asistencia.fecha_hora) >= primer_dia_mes)
        .group_by(Cliente.cliente_id, Cliente.nombre, Cliente.apellido)
        .order_by(func.count(Asistencia.asistencia_id).desc())
        .limit(10)
        .all()
    )

    data = [
        {
            "cliente_id": r.cliente_id,
            "nombre": r.nombre,
            "apellido": r.apellido,
            "cantidad": int(r.cantidad),
        }
        for r in rows
    ]

    return jsonify(data)


# -------------------- CIERRE PAGOS (cierre de caja) --------------------

@bp.post("/caja/cierre")
@roles_required("admin", "cashier")
def crear_cierre_caja():
    hoy = date.today()
    user_id = getattr(request, "user_id", None)  # según cómo estés guardando el user en el decorador

    # 1) Verificar si ya existe cierre de hoy
    existente = CierreCaja.query.filter_by(fecha=hoy).first()
    if existente:
        return jsonify({"error": "Ya existe un cierre de caja para hoy"}), 400

    payload = request.json or {}
    dec = lambda x: _decimal(payload.get(x))

    # 2) Obtener resumen actual del sistema (igual que /pagos/hoy)
    pagos_resp = pagos_hoy()
    pagos_data = pagos_resp.get_json()
    resumen = pagos_data["resumen"]

    cierre = CierreCaja(
        fecha=hoy,
        usuario_id=user_id,
        total_sistema_general=_decimal(resumen["total_general"]),
        total_sistema_efectivo=_decimal(resumen["total_efectivo"]),
        total_sistema_tarjeta=_decimal(resumen["total_tarjeta"]),
        total_sistema_transferencia=_decimal(resumen["total_transferencia"]),
        total_declarado_efectivo=dec("total_declarado_efectivo"),
        total_declarado_tarjeta=dec("total_declarado_tarjeta"),
        total_declarado_transferencia=dec("total_declarado_transferencia"),
        observaciones=(payload.get("observaciones") or "").strip(),
    )

    db.session.add(cierre)
    db.session.commit()

    return jsonify(
        {
            "cierre_id": cierre.cierre_id,
            "fecha": cierre.fecha.isoformat(),
        }
    ), 201


@bp.get("/caja/cierre/hoy")
@roles_required("admin", "cashier")
def obtener_cierre_hoy():
    hoy = date.today()
    cierre = CierreCaja.query.filter_by(fecha=hoy).first()
    if not cierre:
        return jsonify({"cierre": None})

    return jsonify(
        {
            "cierre_id": cierre.cierre_id,
            "fecha": cierre.fecha.isoformat(),
            "total_sistema_general": float(cierre.total_sistema_general or 0),
            "total_sistema_efectivo": float(cierre.total_sistema_efectivo or 0),
            "total_sistema_tarjeta": float(cierre.total_sistema_tarjeta or 0),
            "total_sistema_transferencia": float(
                cierre.total_sistema_transferencia or 0
            ),
            "total_declarado_efectivo": float(
                cierre.total_declarado_efectivo or 0
            ),
            "total_declarado_tarjeta": float(
                cierre.total_declarado_tarjeta or 0
            ),
            "total_declarado_transferencia": float(
                cierre.total_declarado_transferencia or 0
            ),
            "observaciones": cierre.observaciones or "",
        }
    )


# -------------------- MEMBRESÍA ACTIVA --------------------
@bp.get("/clientes/<int:cliente_id>/membresias/activa")
@login_required
def membresia_activa(cliente_id):
    hoy = date.today()

    # Tomar SIEMPRE la última membresía registrada (por fecha_fin)
    cm = (
        ClienteMembresia.query
        .filter(ClienteMembresia.cliente_id == cliente_id)
        .order_by(ClienteMembresia.fecha_fin.desc())
        .first()
    )

    # Si nunca ha tenido membresías
    if not cm:
        return jsonify({"estado": "sin_membresia"}), 200

    # Calcular estado REAL en base a la fecha de término
    dias_rest = (cm.fecha_fin - hoy).days
    estado = "activa" if dias_rest >= 0 else "vencida"

    return jsonify({
        "nombre_plan": cm.membresia.nombre,
        "precio": float(cm.membresia.precio),
        "fecha_inicio": cm.fecha_inicio.isoformat(),
        "fecha_fin": cm.fecha_fin.isoformat(),
        "estado": estado,              # "activa" o "vencida"
        "dias_restantes": dias_rest,   # puede ser negativo si está vencida
    }), 200


# -------------------- Pagos y membresías: asignar / renovar --------------------
@bp.post("/clientes/<int:cliente_id>/pagar-membresia")
@login_required
def pagar_membresia(cliente_id):
    payload = request.json or {}
    hoy = date.today()

    cliente = Cliente.query.get_or_404(cliente_id)

    # Verificar si ya tiene membresía activa
    activa = (
        ClienteMembresia.query.filter_by(cliente_id=cliente_id, estado="activa")
        .order_by(ClienteMembresia.fecha_inicio.desc())
        .first()
    )
    if activa and activa.fecha_fin >= hoy:
        return (
            jsonify(
                {
                    "error": "membresia_activa",
                    "detalle": "El cliente ya tiene una membresía activa vigente. No puede registrar otro pago hasta que venza.",
                }
            ),
            409,
        )

    membresia_id = payload.get("membresia_id")
    if membresia_id:
        plan = Membresia.query.get(int(membresia_id))
        if not plan:
            return jsonify({"error": "membresía no existe"}), 404
    else:
        return jsonify({"error": "membresia_id es obligatorio"}), 400

    metodo_pago = (payload.get("metodo_pago") or "").strip()
    monto = _decimal(payload.get("monto"), plan.precio)

    # Crear pago
    ahora_utc = datetime.now(tz=ZoneInfo("UTC"))
    p = Pago(
        cliente_id=cliente.cliente_id,
        monto=monto,
        metodo_pago=metodo_pago,
        fecha_pago=ahora_utc,
    )
    db.session.add(p)

    # Crear vínculo cliente-membresía
    fecha_inicio = hoy
    fecha_fin = hoy + timedelta(days=plan.duracion_dias)

    cm = ClienteMembresia(
        cliente_id=cliente.cliente_id,
        membresia_id=plan.membresia_id,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        estado="activa",
    )
    db.session.add(cm)

    db.session.commit()

    return (
        jsonify(
            {
                "cliente_membresia_id": cm.cliente_membresia_id,
                "membresia": {
                    "membresia_id": plan.membresia_id,
                    "nombre": plan.nombre,
                    "duracion_dias": plan.duracion_dias,
                    "precio": float(plan.precio),
                    "fecha_inicio": str(cm.fecha_inicio),
                    "fecha_fin": str(cm.fecha_fin),
                },
                "pago": {
                    "pago_id": p.pago_id,
                    "monto": float(p.monto),
                    "metodo_pago": p.metodo_pago,
                    "fecha_pago": p.fecha_pago.isoformat(),
                },
            }
        ),
        201,
    )


# ----------------- Reporte Excel de pagos (últimos 30 días por defecto) -----------------
@bp.get("/reportes/pagos/excel")
@login_required
def reporte_pagos_excel():
    # Por defecto, últimos 30 días
    hoy = dt.date.today()
    hace_30 = hoy - dt.timedelta(days=30)

    desde = request.args.get("desde")
    hasta = request.args.get("hasta")

    if hasta:
        hasta_date = dt.date.fromisoformat(hasta)
    else:
        hasta_date = hoy

    if desde:
        desde_date = dt.date.fromisoformat(desde)
    else:
        desde_date = hace_30

    pagos = (
        Pago.query.filter(Pago.fecha_pago >= desde_date)
        .filter(Pago.fecha_pago <= hasta_date)
        .order_by(Pago.fecha_pago.desc())
        .all()
    )

    wb = Workbook()
    ws = wb.active
    ws.title = "Pagos"

    ws.append(
        [
            "Fecha",
            "Hora",
            "Cliente",
            "RUT",
            "Método",
            "Monto",
        ]
    )

    for p in pagos:
        dt_cl = _to_chile_dt(p.fecha_pago)
        ws.append(
            [
                dt_cl.date().isoformat(),
                dt_cl.strftime("%H:%M"),
                f"{p.cliente.nombre} {p.cliente.apellido}",
                p.cliente.rut,
                p.metodo_pago,
                float(p.monto or 0),
            ]
        )

    # Ajuste simple de ancho de columnas
    for col in ws.columns:
        max_length = 0
        col_letter = col[0].column_letter
        for cell in col:
            try:
                max_length = max(max_length, len(str(cell.value or "")))
            except Exception:
                pass
        ws.column_dimensions[col_letter].width = max_length + 2

    bio = io.BytesIO()
    wb.save(bio)
    bio.seek(0)

    filename = f"pagos_{desde_date.isoformat()}_a_{hasta_date.isoformat()}.xlsx"

    return send_file(
        bio,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=filename,
    )


# -------------------- CLIENTES PRÓXIMOS A VENCER --------------------
@bp.get("/vencimientos_proximos")
@login_required
def vencimientos_proximos():
    hoy = date.today()
    limite = hoy + timedelta(days=3)

    rows = (
        db.session.query(
            ClienteMembresia.cliente_membresia_id,
            ClienteMembresia.fecha_fin,
            Cliente.nombre,
            Cliente.apellido,
            Cliente.rut,
            Membresia.nombre.label("nombre_plan"),
        )
        .join(Cliente, Cliente.cliente_id == ClienteMembresia.cliente_id)
        .join(Membresia, Membresia.membresia_id == ClienteMembresia.membresia_id)
        .filter(
            ClienteMembresia.estado == "activa",
            func.date(ClienteMembresia.fecha_fin) >= hoy,
            func.date(ClienteMembresia.fecha_fin) <= limite,
        )
        .order_by(ClienteMembresia.fecha_fin.asc())
        .all()
    )

    data = [{
        "cliente_membresia_id": cm_id,
        "nombre": nombre,
        "apellido": apellido,
        "rut": rut,
        "nombre_plan": nombre_plan,
        "fecha_fin": str(fecha_fin),
        "dias_restantes": (fecha_fin - hoy).days,
    } for cm_id, fecha_fin, nombre, apellido, rut, nombre_plan in rows]

    return jsonify({"vencimientos": data})


@bp.get("/dashboard/asistencia/semana")
@login_required
def dashboard_asistencia_semana():
    hoy = date.today()
    hace_8_semanas = hoy - timedelta(weeks=8)

    # Agrupamos por semana usando date_trunc (PostgreSQL)
    rows = (
        db.session.query(
            func.date_trunc("week", Asistencia.fecha_hora).label("semana"),
            func.count().label("total"),
        )
        .filter(Asistencia.fecha_hora >= hace_8_semanas)
        .group_by(func.date_trunc("week", Asistencia.fecha_hora))
        .order_by(func.date_trunc("week", Asistencia.fecha_hora))
        .all()
    )

    data = []
    for semana_dt, total in rows:
        # semana_dt es un datetime del lunes de esa semana
        semana_str = semana_dt.date().isoformat()  # ej: 2025-11-03
        # Opcional: etiqueta tipo 2025-W45
        iso_year, iso_week, _ = semana_dt.isocalendar()
        etiqueta = f"{iso_year}-W{iso_week:02d}"

        data.append({
            "semana_fecha": semana_str,
            "semana_label": etiqueta,
            "total": int(total),
        })

    return jsonify({"semanas": data})


@bp.get("/dashboard/asistencia/mes")
@login_required
def dashboard_asistencia_mes():
    hoy = date.today()
    # Tomamos el primer día del mes de hace 6 meses hacia atrás
    hace_6_meses = hoy.replace(day=1) - timedelta(days=180)

    rows = (
        db.session.query(
            func.date_trunc("month", Asistencia.fecha_hora).label("mes"),
            func.count().label("total"),
        )
        .filter(Asistencia.fecha_hora >= hace_6_meses)
        .group_by(func.date_trunc("month", Asistencia.fecha_hora))
        .order_by(func.date_trunc("month", Asistencia.fecha_hora))
        .all()
    )

    data = []
    for mes_dt, total in rows:
        mes_date = mes_dt.date()
        etiqueta = mes_date.strftime("%Y-%m")  # ej: 2025-11
        data.append({
            "mes": etiqueta,
            "total": int(total),
        })

    return jsonify({"meses": data})


@bp.get("/dashboard/asistencia/mejores-horas")
@login_required
def dashboard_mejores_horas():
    hoy = date.today()
    hace_30_dias = hoy - timedelta(days=30)

    rows = (
        db.session.query(
            func.extract("hour", Asistencia.fecha_hora).label("hora"),
            func.count().label("total"),
        )
        .filter(Asistencia.fecha_hora >= hace_30_dias)
        .group_by(func.extract("hour", Asistencia.fecha_hora))
        .order_by(func.count().desc())
        .limit(5)
        .all()
    )

    data = [
        {
            "hora": int(hora),
            "etiqueta": f"{int(hora):02d}:00",
            "total": int(total),
        }
        for hora, total in rows
    ]

    return jsonify({"mejores_horas": data})
