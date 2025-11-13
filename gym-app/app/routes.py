from flask import Blueprint, jsonify, request, send_file, has_app_context
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy import func, cast, Date
from sqlalchemy.engine import Engine
from zoneinfo import ZoneInfo
from .decorators import login_required, roles_required
import pytz
import io

from . import db
from .models import Cliente, Membresia, Pago, Asistencia, ClienteMembresia

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment

# --- IMPORTS NECESARIOS ---
import datetime as dt
from io import BytesIO
import openpyxl

bp = Blueprint("api", __name__, url_prefix="/api")

@bp.get("/reportes/pagos_excel")
@login_required
def exportar_pagos_excel():
    desde = request.args.get("desde")
    hasta = request.args.get("hasta")

    # Si no vienen fechas, últimos 30 días
    hoy = dt.date.today()

    if not hasta:
        hasta_date = hoy
    else:
        hasta_date = dt.date.fromisoformat(hasta)

    if not desde:
        desde_date = hasta_date - dt.timedelta(days=30)
    else:
        desde_date = dt.date.fromisoformat(desde)

    # Filtrar pagos
    pagos = (
        Pago.query
        .filter(Pago.fecha_pago >= desde_date)
        .filter(Pago.fecha_pago <= hasta_date)
        .order_by(Pago.fecha_pago.desc())
        .all()
    )

    # Excel
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Pagos"

    ws.append(["Fecha", "Hora", "Cliente", "RUT", "Método", "Monto"])

    for p in pagos:
        fecha = p.fecha_pago.strftime("%Y-%m-%d")
        hora = p.fecha_pago.strftime("%H:%M")
        cliente = f"{p.cliente.nombre} {p.cliente.apellido}" if p.cliente else ""
        rut = p.cliente.rut if p.cliente else ""
        ws.append([fecha, hora, cliente, rut, p.metodo_pago, float(p.monto)])

    # bytes del archivo
    output = BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"pagos_{desde_date.strftime('%Y%m%d')}_{hasta_date.strftime('%Y%m%d')}.xlsx"

    return send_file(
        output,
        as_attachment=True,
        download_name=filename,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )

# ---------- Decoradores seguros (evitan usar current_app en import time) ----------
def _noop(f):  # decorador vacío
    return f

def login_required(f):
    """Usa current_app.login_required si hay contexto; si no, no-op."""
    if has_app_context():
        real = getattr(current_app, "login_required", None)
        if callable(real):
            return real(f)
    return f

def roles_required(*roles):
    """Usa current_app.roles_required(*roles) si hay contexto; si no, no-op."""
    if has_app_context():
        real = getattr(current_app, "roles_required", None)
        if callable(real):
            return real(*roles)
    def wrapper(f):
        return f
    return wrapper
# -------------------------------------------------------------------------------

APP_TZ = ZoneInfo("America/Santiago")
CL_TZ = pytz.timezone("America/Santiago")
CHILE_TZ = ZoneInfo("America/Santiago")

def to_cl_time(dt):
    """Convierte un datetime (naive o con tz) a America/Santiago y retorna HH:MM."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(APP_TZ).strftime("%H:%M")

# -------------------- Helpers --------------------
def _hora_local_hhmm(dt):
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(CHILE_TZ).strftime("%H:%M")

def _parse_date(s: str | None):
    if not s:
        return None
    s = s.strip()
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except Exception:
            continue
    return None

def _decimal(v):
    if v is None:
        return Decimal("0")
    if isinstance(v, Decimal):
        return v
    try:
        return Decimal(str(v))
    except Exception:
        return Decimal("0")

def _cerrar_membresias_activas(cliente_id, fecha_fin=None):
    _ = date.today()
    ll = (ClienteMembresia.query
          .filter_by(cliente_id=cliente_id, estado="activa")
          .all())
    for cm in ll:
        cm.estado = "vencida"
        if fecha_fin:
            cm.fecha_fin = fecha_fin
    db.session.flush()

def _last_plan(cliente_id):
    return (ClienteMembresia.query
            .filter(ClienteMembresia.cliente_id == cliente_id)
            .order_by(ClienteMembresia.fecha_fin.desc())
            .first())

def _to_datetime(obj):
    if isinstance(obj, datetime):
        return obj
    if isinstance(obj, str):
        s = obj.strip()
        if s.endswith("Z"):
            try:
                return datetime.fromisoformat(s.replace("Z", "+00:00"))
            except Exception:
                pass
        try:
            return datetime.fromisoformat(s)
        except Exception:
            pass
        for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(s, fmt)
            except Exception:
                continue
    return datetime.utcnow()

def _to_chile_dt(dt_any):
    dt = _to_datetime(dt_any)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(CHILE_TZ)

def _is_postgres(session) -> bool:
    eng: Engine = session.get_bind()
    return eng.dialect.name == "postgresql"

# -------------------- CLIENTES --------------------
@bp.get("/clientes")
@login_required
def get_clientes():
    clientes = Cliente.query.all()
    data = [{
        "cliente_id": c.cliente_id,
        "nombre": c.nombre,
        "apellido": c.apellido,
        "rut": c.rut,
        "email": c.email,
        "estado": c.estado,
        "direccion": c.direccion,
        "estado_laboral": c.estado_laboral,
        "sexo": c.sexo,
    } for c in clientes]
    return jsonify(data)

@bp.post("/clientes")
@roles_required("admin", "cashier")
def crear_cliente():
    data = request.json or {}
    nuevo = Cliente(
        nombre=data["nombre"],
        apellido=data["apellido"],
        rut=data["rut"],
        email=data.get("email", ""),
        direccion=data.get("direccion", ""),          # <— nuevo (si no lo estabas guardando)
        estado_laboral=data.get("estado_laboral"),    # <— nuevo
        sexo=(data.get("sexo") or "").upper() or None,# <— nuevo ('M','F','O')
        estado="activo",
    )
    db.session.add(nuevo)
    db.session.commit()
    return jsonify({"msg": "cliente creado", "cliente_id": nuevo.cliente_id}), 201

# -------------------- MEMBRESÍAS --------------------
@bp.get("/membresias")
@login_required
def get_membresias():
    rows = Membresia.query.all()
    return jsonify([{
        "membresia_id": m.membresia_id,
        "nombre": m.nombre,
        "descripcion": m.descripcion,
        "precio": float(m.precio),
        "duracion_dias": m.duracion_dias,
    } for m in rows])

@bp.post("/membresias")
@roles_required("admin")
def crear_membresia():
    data = request.json or {}
    nueva = Membresia(
        nombre=data["nombre"],
        descripcion=data.get("descripcion", ""),
        precio=_decimal(data["precio"]),
        duracion_dias=int(data["duracion_dias"]),
    )
    db.session.add(nueva)
    db.session.commit()
    return jsonify({"msg": "membresía creada", "membresia_id": nueva.membresia_id}), 201

# -------------------- MEMBRESÍA ACTIVA --------------------
@bp.get("/clientes/<int:cliente_id>/membresias/activa")
@login_required
def membresia_activa(cliente_id):
    hoy = date.today()
    cm = (ClienteMembresia.query
          .filter_by(cliente_id=cliente_id, estado="activa")
          .order_by(ClienteMembresia.fecha_fin.desc())
          .first())
    if not cm:
        return jsonify({"estado": "sin_membresia"}), 200
    dias_rest = (cm.fecha_fin - hoy).days
    estado = "activa" if dias_rest >= 0 else "vencida"
    return jsonify({
        "nombre_plan": cm.membresia.nombre,
        "precio": float(cm.membresia.precio),
        "fecha_inicio": str(cm.fecha_inicio),
        "fecha_fin": str(cm.fecha_fin),
        "dias_restantes": dias_rest,
        "estado": estado,
    })

# -------------------- PAGOS (caja del día) --------------------
@bp.get("/pagos/hoy")
@login_required
def pagos_hoy():
    hoy = date.today()
    if _is_postgres(db.session):
        tz_expr = func.timezone("America/Santiago", Pago.fecha_pago)
        fecha_local = cast(tz_expr, Date)
        hora_local = func.to_char(tz_expr, "HH24:MI").label("hora")
        rows = (db.session.query(
                    Pago.pago_id, Pago.monto, Pago.metodo_pago, hora_local,
                    Cliente.nombre, Cliente.apellido, Cliente.rut)
                .join(Cliente)
                .filter(fecha_local == hoy)
                .order_by(hora_local.asc())
                .all())
    else:
        rows = (db.session.query(
                    Pago.pago_id, Pago.monto, Pago.metodo_pago,
                    func.strftime("%H:%M", Pago.fecha_pago).label("hora"),
                    Cliente.nombre, Cliente.apellido, Cliente.rut)
                .join(Cliente)
                .filter(func.date(Pago.fecha_pago) == hoy)
                .order_by(Pago.fecha_pago.asc())
                .all())

    data = [{
        "pago_id": p_id,
        "monto": float(monto or 0),
        "metodo_pago": metodo,
        "hora": hora_txt or "",
        "nombre": nombre,
        "apellido": apellido,
        "rut": rut,
    } for p_id, monto, metodo, hora_txt, nombre, apellido, rut in rows]

    resumen = {
        "total_general": sum(p["monto"] for p in data),
        "total_efectivo": sum(p["monto"] for p in data if (p["metodo_pago"] or "").lower() == "efectivo"),
        "total_tarjeta": sum(p["monto"] for p in data if (p["metodo_pago"] or "").lower() == "tarjeta"),
        "total_transferencia": sum(p["monto"] for p in data if (p["metodo_pago"] or "").lower() == "transferencia"),
    }
    return jsonify({"pagos": data, "resumen": resumen})

# ---------- ASIGNAR / RENOVAR + PAGO ----------
@bp.post("/clientes/<int:cliente_id>/pagos/pagar_y_renovar")
@roles_required("cashier", "admin")
def pagar_y_renovar(cliente_id):
    payload = request.json or {}
    monto = _decimal(payload.get("monto"))
    metodo = (payload.get("metodo_pago") or "Efectivo").strip()
    hoy = date.today()

    cliente = Cliente.query.get(cliente_id)
    if not cliente:
        return jsonify({"error": "cliente no existe"}), 404

    activa = (ClienteMembresia.query
              .filter(ClienteMembresia.cliente_id == cliente_id,
                      ClienteMembresia.estado == "activa")
              .first())
    if activa and activa.fecha_fin >= hoy:
        return jsonify({
            "error": "membresia_activa",
            "detalle": "El cliente ya tiene una membresía activa vigente. No puede registrar otro pago hasta que venza."
        }), 409

    membresia_id = payload.get("membresia_id")
    if membresia_id:
        plan = Membresia.query.get(int(membresia_id))
        if not plan:
            return jsonify({"error": "membresía no existe"}), 404
    else:
        last = _last_plan(cliente_id)
        if not last:
            return jsonify({"error": "no hay plan previo para renovar"}), 400
        plan = last.membresia

    _cerrar_membresias_activas(cliente_id)

    fecha_inicio = hoy
    fecha_fin = hoy + timedelta(days=int(plan.duracion_dias))

    cm = ClienteMembresia(
        cliente_id=cliente_id,
        membresia_id=plan.membresia_id,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        estado="activa",
    )
    db.session.add(cm)
    db.session.flush()

    fecha_pago_local = datetime.now(CHILE_TZ)
    pago = Pago(
        cliente_id=cliente_id,
        cliente_membresia_id=cm.cliente_membresia_id,
        monto=monto,
        metodo_pago=metodo,
        fecha_pago=fecha_pago_local,
    )
    db.session.add(pago)
    db.session.commit()

    return jsonify({
        "msg": "pago y (re)asignación realizados",
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
            "pago_id": pago.pago_id,
            "monto": float(pago.monto),
            "metodo_pago": pago.metodo_pago,
            "fecha_pago": pago.fecha_pago.isoformat(),
        }
    }), 201

# -------------------- ASISTENCIAS --------------------
@bp.post("/asistencias")
@roles_required("cashier", "admin")
def marcar_asistencia():
    """
    Registra ENTRADA o SALIDA del cliente.

    400 -> body inválido
    403 -> sin membresía activa para ENTRADA
    404 -> cliente no existe
    409 -> ENTRADA duplicada en el día
    201 -> ok
    """
    data = request.get_json(silent=True) or {}
    try:
        print("[/asistencias] payload recibido:", data)
    except Exception:
        pass

    # Acepta cliente_id o clienteId
    raw_id = data.get("cliente_id", data.get("clienteId"))
    try:
        cliente_id = int(str(raw_id).strip())
    except Exception:
        return jsonify({
            "error": "bad_request",
            "detail": "cliente_id inválido o ausente",
            "echo": data,
        }), 400

    tipo = (data.get("tipo") or "entrada").lower().strip()
    if tipo not in ("entrada", "salida"):
        return jsonify({"error": "bad_request", "detail": "tipo debe ser 'entrada' o 'salida'"}), 400

    cliente = Cliente.query.get(cliente_id)
    if not cliente:
        return jsonify({"error": "not_found", "detail": "cliente no existe"}), 404

    hoy = date.today()

    # ¿Ya registró ENTRADA hoy?
    if _is_postgres(db.session):
        tz_expr = func.timezone("America/Santiago", Asistencia.fecha_hora)
        fecha_local = cast(tz_expr, Date)
        existente = (
            db.session.query(Asistencia.asistencia_id)
            .filter(
                Asistencia.cliente_id == cliente_id,
                fecha_local == hoy,
                Asistencia.tipo == "entrada",
            )
            .first()
        )
    else:
        existente = (
            db.session.query(Asistencia.asistencia_id)
            .filter(
                Asistencia.cliente_id == cliente_id,
                func.date(Asistencia.fecha_hora) == hoy,
                Asistencia.tipo == "entrada",
            )
            .first()
        )

    if tipo == "entrada":
        if existente:
            return jsonify({
                "error": "entrada_duplicada",
                "detalle": "Este cliente ya tiene una ENTRADA registrada hoy.",
            }), 409

        # Exigir membresía activa para ENTRADA
        cm_activa = (
            ClienteMembresia.query
            .filter(
                ClienteMembresia.cliente_id == cliente_id,
                ClienteMembresia.estado == "activa"
            )
            .order_by(ClienteMembresia.fecha_fin.desc())
            .first()
        )
        if not cm_activa or cm_activa.fecha_fin < hoy:
            return jsonify({"error": "sin_membresia_activa"}), 403

    a = Asistencia(cliente_id=cliente_id, tipo=tipo)  # usa default ahora_chile()
    db.session.add(a)
    db.session.commit()

    return jsonify({"msg": "asistencia registrada", "asistencia_id": a.asistencia_id}), 201


@bp.get("/asistencias/hoy")
@login_required
def asistencias_hoy():
    """Lista ENTRADAS del día, con hora local CL."""
    hoy = date.today()
    if _is_postgres(db.session):
        tz_expr = func.timezone("America/Santiago", Asistencia.fecha_hora)
        fecha_local = cast(tz_expr, Date)
        hora_local = func.to_char(tz_expr, "HH24:MI").label("hora")
        rows = (
            db.session.query(
                Asistencia.asistencia_id,
                Cliente.nombre,
                Cliente.apellido,
                Cliente.rut,
                Cliente.cliente_id,
                hora_local,
            )
            .join(Cliente)
            .filter(fecha_local == hoy, Asistencia.tipo == "entrada")
            .order_by(hora_local.asc())
            .all()
        )
    else:
        rows = (
            db.session.query(
                Asistencia.asistencia_id,
                Cliente.nombre,
                Cliente.apellido,
                Cliente.rut,
                Cliente.cliente_id,
                func.strftime("%H:%M", Asistencia.fecha_hora).label("hora"),
            )
            .join(Cliente)
            .filter(func.date(Asistencia.fecha_hora) == hoy, Asistencia.tipo == "entrada")
            .order_by(Asistencia.fecha_hora.asc())
            .all()
        )

    data = [
        {
            "asistencia_id": r.asistencia_id,
            "nombre": r.nombre,
            "apellido": r.apellido,
            "rut": r.rut,
            "cliente_id": r.cliente_id,
            "hora": getattr(r, "hora", "") or "",
        }
        for r in rows
    ]
    return jsonify(data)

@bp.get("/asistencias/rango")
@login_required
def asistencias_rango():
    """
    Lista asistencias (entradas/salidas) en un rango de fechas.
    Recibe query params:
      - from (YYYY-MM-DD)
      - to   (YYYY-MM-DD)
    Si no se envían fechas, usa los últimos 30 días.
    """
    d_from = _parse_date(request.args.get("from"))
    d_to = _parse_date(request.args.get("to"))

    # Si no hay fechas -> últimos 30 días
    if not d_from and not d_to:
        d_to = date.today()
        d_from = d_to - timedelta(days=30)
    if not d_from:
        d_from = d_to
    if not d_to:
        d_to = d_from

    if _is_postgres(db.session):
        # Fecha y hora local Chile
        tz_expr = func.timezone("America/Santiago", Asistencia.fecha_hora)
        fecha_local = cast(tz_expr, Date).label("fecha")
        hora_local = func.to_char(tz_expr, "HH24:MI").label("hora")

        rows = (
            db.session.query(
                Asistencia.asistencia_id,
                Cliente.cliente_id,
                Cliente.nombre,
                Cliente.apellido,
                Cliente.rut,
                fecha_local,
                hora_local,
                Asistencia.tipo,
            )
            .join(Cliente)
            .filter(fecha_local >= d_from, fecha_local <= d_to)
            .order_by(fecha_local.desc(), hora_local.desc())
            .all()
        )
    else:
        # SQLite / otros
        rows = (
            db.session.query(
                Asistencia.asistencia_id,
                Cliente.cliente_id,
                Cliente.nombre,
                Cliente.apellido,
                Cliente.rut,
                func.date(Asistencia.fecha_hora).label("fecha"),
                func.strftime("%H:%M", Asistencia.fecha_hora).label("hora"),
                Asistencia.tipo,
            )
            .join(Cliente)
            .filter(func.date(Asistencia.fecha_hora) >= d_from,
                    func.date(Asistencia.fecha_hora) <= d_to)
            .order_by(Asistencia.fecha_hora.desc())
            .all()
        )

    data = [
        {
            "asistencia_id": r.asistencia_id,
            "cliente_id": r.cliente_id,
            "nombre": r.nombre,
            "apellido": r.apellido,
            "rut": r.rut,
            "fecha": str(getattr(r, "fecha", "")),
            "hora": getattr(r, "hora", "") or "",
            "tipo": r.tipo,
        }
        for r in rows
    ]

    # Igual que /asistencias/hoy: devolvemos una lista simple
    return jsonify(data)

# ----------------- Asistencias por rango (Excel) -----------------
@bp.get("/asistencias/rango/excel")
@roles_required("cashier", "admin")  # o solo "admin" si quieres
def asistencias_rango_excel():
    """
    Exporta a Excel las asistencias (normalmente ENTRADA) en un rango de fechas.

    Query params:
      - desde (YYYY-MM-DD)
      - hasta (YYYY-MM-DD)
    Si no se envían, usa los últimos 30 días.
    """
    d_from = _parse_date(request.args.get("desde"))
    d_to = _parse_date(request.args.get("hasta"))

    # Si no hay fechas -> últimos 30 días
    if not d_from and not d_to:
        d_to = date.today()
        d_from = d_to - timedelta(days=30)
    if not d_from:
        d_from = d_to
    if not d_to:
        d_to = d_from

    if _is_postgres(db.session):
        tz_expr = func.timezone("America/Santiago", Asistencia.fecha_hora)
        fecha_local = cast(tz_expr, Date).label("fecha")
        hora_local = func.to_char(tz_expr, "HH24:MI").label("hora")

        rows = (
            db.session.query(
                Asistencia.asistencia_id,
                Cliente.cliente_id,
                Cliente.nombre,
                Cliente.apellido,
                Cliente.rut,
                fecha_local,
                hora_local,
                Asistencia.tipo,
            )
            .join(Cliente)
            .filter(fecha_local >= d_from, fecha_local <= d_to)
            .filter(Asistencia.tipo == "entrada")  # solo entradas
            .order_by(fecha_local.desc(), hora_local.desc())
            .all()
        )
    else:
        rows = (
            db.session.query(
                Asistencia.asistencia_id,
                Cliente.cliente_id,
                Cliente.nombre,
                Cliente.apellido,
                Cliente.rut,
                func.date(Asistencia.fecha_hora).label("fecha"),
                func.strftime("%H:%M", Asistencia.fecha_hora).label("hora"),
                Asistencia.tipo,
            )
            .join(Cliente)
            .filter(func.date(Asistencia.fecha_hora) >= d_from,
                    func.date(Asistencia.fecha_hora) <= d_to)
            .filter(Asistencia.tipo == "entrada")
            .order_by(Asistencia.fecha_hora.desc())
            .all()
        )

    wb = Workbook()
    ws = wb.active
    ws.title = "Asistencias"

    headers = ["Fecha", "Hora", "Cliente", "RUT", "ID Cliente", "Tipo"]
    ws.append(headers)

    for r in rows:
        ws.append([
            str(getattr(r, "fecha", "")),
            getattr(r, "hora", "") or "",
            f"{r.nombre} {r.apellido}",
            r.rut,
            r.cliente_id,
            r.tipo,
        ])

    bio = io.BytesIO()
    wb.save(bio)
    bio.seek(0)

    filename = f"asistencias_{d_from.strftime('%Y%m%d')}_{d_to.strftime('%Y%m%d')}.xlsx"
    return send_file(
        bio,
        as_attachment=True,
        download_name=filename,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


# ----------------- Excel de pagos (orden DESC) -----------------
@bp.get("/pagos/export_excel")
@roles_required("admin")  # solo admin descarga Excel de pagos
def pagos_export_excel():
    d_from = _parse_date(request.args.get("from"))
    d_to = _parse_date(request.args.get("to"))

    if not d_from and not d_to:
        d_to = date.today()
        d_from = d_to - timedelta(days=30)
    if not d_from:
        d_from = d_to
    if not d_to:
        d_to = d_from

    q = (db.session.query(
            Pago.pago_id, Pago.monto, Pago.metodo_pago, Pago.fecha_pago,
            Cliente.nombre, Cliente.apellido, Cliente.rut)
         .join(Cliente))

    if _is_postgres(db.session):
        tz_expr = func.timezone("America/Santiago", Pago.fecha_pago)
        fecha_loc = cast(tz_expr, Date)
        q = q.filter(fecha_loc >= d_from, fecha_loc <= d_to)
    else:
        q = q.filter(func.date(Pago.fecha_pago) >= d_from,
                    func.date(Pago.fecha_pago) <= d_to)

    pagos = q.order_by(Pago.fecha_pago.desc()).all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Pagos"
    headers = ["Fecha", "Hora", "Cliente", "RUT", "Método", "Monto"]
    ws.append(headers)

    total_general = Decimal("0")
    por_metodo = {"Efectivo": Decimal("0"),
                  "Tarjeta": Decimal("0"),
                  "Transferencia": Decimal("0")}

    for p_id, monto, metodo, fecha_pago, nombre, apellido, rut in pagos:
        dt_local = _to_chile_dt(fecha_pago)
        f = dt_local.strftime("%Y-%m-%d")
        h = dt_local.strftime("%H:%M")
        total_general += _decimal(monto)
        if metodo in por_metodo:
            por_metodo[metodo] += _decimal(monto)
        ws.append([f, h, f"{nombre} {apellido}", rut, metodo, float(monto)])

    ws.append([])
    ws.append(["", "", "", "", "TOTAL GENERAL", float(total_general)])
    ws.append(["", "", "", "", "EFECTIVO", float(por_metodo["Efectivo"])])
    ws.append(["", "", "", "", "TARJETA", float(por_metodo["Tarjeta"])])
    ws.append(["", "", "", "", "TRANSFERENCIA", float(por_metodo["Transferencia"])])

    bio = io.BytesIO()
    wb.save(bio)
    bio.seek(0)
    filename = f"pagos_{d_from.strftime('%Y%m%d')}_{d_to.strftime('%Y%m%d')}.xlsx"
    return send_file(
        bio,
        as_attachment=True,
        download_name=filename,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )

# -------------------- VENCIMIENTOS ≤ 3 días --------------------
@bp.get("/vencimientos_proximos")
@login_required
def vencimientos_proximos():
    hoy = date.today()
    limite = hoy + timedelta(days=3)
    rows = (db.session.query(
                ClienteMembresia.cliente_membresia_id, ClienteMembresia.fecha_fin,
                Cliente.nombre, Cliente.apellido, Cliente.rut,
                Membresia.nombre.label("nombre_plan"))
            .join(Cliente, Cliente.cliente_id == ClienteMembresia.cliente_id)
            .join(Membresia, Membresia.membresia_id == ClienteMembresia.membresia_id)
            .filter(ClienteMembresia.estado == "activa",
                    func.date(ClienteMembresia.fecha_fin) >= hoy,
                    func.date(ClienteMembresia.fecha_fin) <= limite)
            .order_by(ClienteMembresia.fecha_fin.asc())
            .all())

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
