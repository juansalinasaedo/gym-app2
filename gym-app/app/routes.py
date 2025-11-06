from flask import Blueprint, jsonify, request
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from decimal import Decimal
from sqlalchemy import func, cast, Date  
from sqlalchemy.engine import Engine
import pytz
from zoneinfo import ZoneInfo
from . import db
from .models import Cliente, Membresia, Pago, Asistencia, ClienteMembresia

bp = Blueprint("api", __name__)

APP_TZ = ZoneInfo("America/Santiago")
CL_TZ = pytz.timezone("America/Santiago")
CHILE_TZ = ZoneInfo("America/Santiago")
def to_cl_time(dt):
    """Convierte un datetime (naive o con tz) a America/Santiago."""
    if dt is None:
        return None
    # asumimos que guardas en UTC; si viene naive lo tomamos como UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(APP_TZ).strftime("%H:%M")

# -------------------- Helpers --------------------

def _decimal(v):
    """Asegura tipo Decimal para montos numéricos."""
    if v is None:
        return Decimal("0")
    if isinstance(v, Decimal):
        return v
    try:
        return Decimal(str(v))
    except Exception:
        return Decimal("0")

def _cerrar_membresias_activas(cliente_id, fecha_fin=None):
    """Marca 'vencida' cualquier membresía activa del cliente."""
    hoy = date.today()
    ll = (
        ClienteMembresia.query
        .filter_by(cliente_id=cliente_id, estado="activa")
        .all()
    )
    for cm in ll:
        cm.estado = "vencida"
        # opcional: si quieres ajustar fecha_fin al día anterior
        if fecha_fin:
            cm.fecha_fin = fecha_fin
    db.session.flush()

def _last_plan(cliente_id):
    """Último plan del cliente por fecha_fin."""
    return (
        ClienteMembresia.query
        .filter(ClienteMembresia.cliente_id == cliente_id)
        .order_by(ClienteMembresia.fecha_fin.desc())
        .first()
    )

def _to_datetime(obj):
    """
    Acepta datetime o str y devuelve un datetime.
    Soporta ISO (con o sin 'Z') y formatos comunes de SQL.
    """
    if isinstance(obj, datetime):
        return obj
    if isinstance(obj, str):
        s = obj.strip()
        # Soporta ISO con Z (UTC)
        if s.endswith("Z"):
            try:
                return datetime.fromisoformat(s.replace("Z", "+00:00"))
            except Exception:
                pass
        # ISO estándar
        try:
            return datetime.fromisoformat(s)
        except Exception:
            pass
        # Formatos típicos de SQL
        for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(s, fmt)
            except Exception:
                continue
    # Fallback: ahora
    return datetime.utcnow()

def _to_chile_dt(dt_any):
    """
    Toma str o datetime; devuelve datetime en America/Santiago.
    Si viene naive, se asume UTC (consistente con default=datetime.utcnow).
    """
    dt = _to_datetime(dt_any)
    if dt.tzinfo is None:
        # asumimos que lo que guardaste era UTC (default de tu modelo)
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(CHILE_TZ)

# -------------------- CLIENTES --------------------

@bp.get("/clientes")
def get_clientes():
    clientes = Cliente.query.all()
    data = [
        {
            "cliente_id": c.cliente_id,
            "nombre": c.nombre,
            "apellido": c.apellido,
            "rut": c.rut,
            "email": c.email,
            "estado": c.estado,
        }
        for c in clientes
    ]
    return jsonify(data)

@bp.post("/clientes")
def crear_cliente():
    data = request.json or {}
    nuevo = Cliente(
        nombre=data["nombre"],
        apellido=data["apellido"],
        rut=data["rut"],
        email=data.get("email", ""),
        estado="activo",
    )
    db.session.add(nuevo)
    db.session.commit()
    return jsonify({"msg": "cliente creado", "cliente_id": nuevo.cliente_id}), 201

# -------------------- MEMBRESÍAS --------------------

@bp.get("/membresias")
def get_membresias():
    rows = Membresia.query.all()
    return jsonify(
        [
            {
                "membresia_id": m.membresia_id,
                "nombre": m.nombre,
                "descripcion": m.descripcion,
                "precio": float(m.precio),
                "duracion_dias": m.duracion_dias,
            }
            for m in rows
        ]
    )

@bp.post("/membresias")
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
def membresia_activa(cliente_id):
    hoy = date.today()
    cm = (
        ClienteMembresia.query.filter_by(cliente_id=cliente_id, estado="activa")
        .order_by(ClienteMembresia.fecha_fin.desc())
        .first()
    )
    if not cm:
        return jsonify({"estado": "sin_membresia"}), 200

    dias_rest = (cm.fecha_fin - hoy).days
    estado = "activa" if dias_rest >= 0 else "vencida"

    return jsonify(
        {
            "nombre_plan": cm.membresia.nombre,
            "precio": float(cm.membresia.precio),
            "fecha_inicio": str(cm.fecha_inicio),
            "fecha_fin": str(cm.fecha_fin),
            "dias_restantes": dias_rest,
            "estado": estado,
        }
    )

# -------------------- PAGOS (caja del día) --------------------
@bp.get("/pagos/hoy")
def pagos_hoy():
    hoy = date.today()

    # Para Postgres usamos timezone('America/Santiago', ...) para "traer" la hora local
    if _is_postgres(db.session):
        tz_expr = func.timezone("America/Santiago", Pago.fecha_pago)
        fecha_local = cast(tz_expr, Date)                               # fecha local (CL)
        hora_local = func.to_char(tz_expr, "HH24:MI").label("hora")     # "HH:MM" local

        rows = (
            db.session.query(
                Pago.pago_id,
                Pago.monto,
                Pago.metodo_pago,
                hora_local,
                Cliente.nombre,
                Cliente.apellido,
                Cliente.rut,
            )
            .join(Cliente)
            .filter(fecha_local == hoy)
            .order_by(hora_local.asc())
            .all()
        )
    else:
        # SQLite: usamos date() y strftime()
        rows = (
            db.session.query(
                Pago.pago_id,
                Pago.monto,
                Pago.metodo_pago,
                func.strftime("%H:%M", Pago.fecha_pago).label("hora"),
                Cliente.nombre,
                Cliente.apellido,
                Cliente.rut,
            )
            .join(Cliente)
            .filter(func.date(Pago.fecha_pago) == hoy)
            .order_by(Pago.fecha_pago.asc())
            .all()
        )

    data = []
    for p_id, monto, metodo, hora_txt, nombre, apellido, rut in rows:
        # hora_txt YA VIENE formateada "HH:MM"; no uses .strftime aquí
        data.append(
            {
                "pago_id": p_id,
                "monto": float(monto or 0),
                "metodo_pago": metodo,
                "hora": hora_txt or "",
                "nombre": nombre,
                "apellido": apellido,
                "rut": rut,
            }
        )

    resumen = {
        "total_general": sum(p["monto"] for p in data),
        "total_efectivo": sum(p["monto"] for p in data if (p["metodo_pago"] or "").lower() == "efectivo"),
        "total_tarjeta": sum(p["monto"] for p in data if (p["metodo_pago"] or "").lower() == "tarjeta"),
        "total_transferencia": sum(p["monto"] for p in data if (p["metodo_pago"] or "").lower() == "transferencia"),
    }

    return jsonify({"pagos": data, "resumen": resumen})

# ---------- ASIGNAR / RENOVAR + PAGO (endpoint que faltaba) ----------

@bp.post("/clientes/<int:cliente_id>/pagos/pagar_y_renovar")
def pagar_y_renovar(cliente_id):
    """
    Si viene 'membresia_id' => Asignar ese plan + pago (cierra las activas previas).
    Si NO viene 'membresia_id' => Renovar el último plan + pago.
    Body JSON: { membresia_id?, monto, metodo_pago }
    """
    payload = request.json or {}
    monto = _decimal(payload.get("monto"))
    metodo = (payload.get("metodo_pago") or "Efectivo").strip()
    hoy = date.today()

    cliente = Cliente.query.get(cliente_id)
    if not cliente:
        return jsonify({"error": "cliente no existe"}), 404

    # ⚠️ NUEVO: evitar pagos duplicados mientras la membresía esté activa
    activa = (
        ClienteMembresia.query
        .filter(ClienteMembresia.cliente_id == cliente_id, ClienteMembresia.estado == "activa")
        .first()
    )
    if activa and activa.fecha_fin >= hoy:
        return jsonify({
            "error": "membresia_activa",
            "detalle": "El cliente ya tiene una membresía activa vigente. No puede registrar otro pago hasta que venza."
        }), 409

    # --- decidir plan a utilizar ---
    membresia_id = payload.get("membresia_id")
    plan = None
    if membresia_id:
        plan = Membresia.query.get(int(membresia_id))
        if not plan:
            return jsonify({"error": "membresía no existe"}), 404
    else:
        last = _last_plan(cliente_id)
        if not last:
            return jsonify({"error": "no hay plan previo para renovar"}), 400
        plan = last.membresia

    # --- cerrar activas previas y crear nueva ---
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

    # ⚙️ NUEVO: hora local de Chile
    from zoneinfo import ZoneInfo
    CHILE_TZ = ZoneInfo("America/Santiago")
    fecha_pago_local = datetime.now(CHILE_TZ)

    pago = Pago(
        cliente_id=cliente_id,
        cliente_membresia_id=cm.cliente_membresia_id,
        monto=monto,
        metodo_pago=metodo,
        fecha_pago=fecha_pago_local,  # 👈 hora local, no UTC
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
def marcar_asistencia():
    data = request.json or {}
    cliente_id = int(data["cliente_id"])
    tipo = (data.get("tipo") or "entrada").lower()

    # Solo 1 "entrada" por día
    if tipo == "entrada":
        hoy = date.today()
        existente = (
            db.session.query(Asistencia)
            .filter(
                Asistencia.cliente_id == cliente_id,
                func.date(Asistencia.fecha_hora) == hoy,
                Asistencia.tipo == "entrada",
            )
            .first()
        )
        if existente:
            # devolvemos 409 + info de la marca existente
            return (
                jsonify(
                    {
                        "error": "entrada_duplicada",
                        "detalle": "Este cliente ya tiene una ENTRADA registrada hoy.",
                        "ultima_hora": existente.fecha_hora.strftime("%H:%M"),
                    }
                ),
                409,
            )

    # Verifica membresía activa SOLO para marcar "entrada"
    if tipo == "entrada":
        hoy = date.today()
        cm = (
            ClienteMembresia.query.filter_by(cliente_id=cliente_id, estado="activa")
            .order_by(ClienteMembresia.fecha_fin.desc())
            .first()
        )
        if not cm or cm.fecha_fin < hoy:
            return jsonify({"error": "sin_membresia_activa"}), 403

    a = Asistencia(cliente_id=cliente_id, tipo=tipo)
    db.session.add(a)
    db.session.commit()
    return jsonify({"msg": "asistencia registrada"}), 201

def _is_postgres(session) -> bool:
    eng: Engine = session.get_bind()
    return eng.dialect.name == "postgresql"

@bp.get("/asistencias/hoy")
def asistencias_hoy():
    hoy = date.today()
    if _is_postgres(db.session):
        # PostgreSQL: convertir a America/Santiago antes de truncar a fecha y formatear hora
        tz_expr = func.timezone("America/Santiago", Asistencia.fecha_hora)
        fecha_local = cast(tz_expr, Date)                                  # fecha local
        hora_local = func.to_char(tz_expr, "HH24:MI").label("hora")        # HH:MM local
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
        # SQLite: usar date() y strftime()
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
            "asistencia_id": a.asistencia_id,
            "nombre": a.nombre,
            "apellido": a.apellido,
            "rut": a.rut,
            "cliente_id": a.cliente_id,
            "hora": getattr(a, "hora", None) or "",
        }
        for a in rows
    ]
    return jsonify(data)

# -------------------- VENCIMIENTOS ≤ 3 días --------------------

@bp.get("/vencimientos_proximos")
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

    data = []
    for cm_id, fecha_fin, nombre, apellido, rut, nombre_plan in rows:
        dias_rest = (fecha_fin - hoy).days
        data.append(
            {
                "cliente_membresia_id": cm_id,
                "nombre": nombre,
                "apellido": apellido,
                "rut": rut,
                "nombre_plan": nombre_plan,
                "fecha_fin": str(fecha_fin),
                "dias_restantes": dias_rest,
            }
        )

    return jsonify({"vencimientos": data})
