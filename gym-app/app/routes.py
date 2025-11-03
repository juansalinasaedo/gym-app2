from flask import Blueprint, jsonify, request
from datetime import date, timedelta, datetime
from decimal import Decimal
from sqlalchemy import func, cast, Date
from . import db
from .models import Cliente, Membresia, Pago, Asistencia, ClienteMembresia

bp = Blueprint("api", __name__)

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
    pagos = (
        db.session.query(
            Pago.pago_id,
            Pago.monto,
            Pago.metodo_pago,
            Pago.fecha_pago,
            Cliente.nombre,
            Cliente.apellido,
            Cliente.rut,
        )
        .join(Cliente)
        .filter(cast(Pago.fecha_pago, Date) == hoy)
        .order_by(Pago.fecha_pago.desc())
        .all()
    )

    data = []
    for p in pagos:
        pago_id, monto, metodo_pago, fecha_pago, nombre, apellido, rut = p
        hora_str = fecha_pago.strftime("%H:%M") if fecha_pago else None
        data.append(
            {
                "pago_id": pago_id,
                "monto": float(monto),  # por si viene como Decimal
                "metodo_pago": metodo_pago,
                "hora": hora_str,
                "nombre": nombre,
                "apellido": apellido,
                "rut": rut,
            }
        )

    resumen = {
        "total_general": sum(d["monto"] for d in data),
        "total_efectivo": sum(d["monto"] for d in data if d["metodo_pago"] == "Efectivo"),
        "total_tarjeta": sum(d["monto"] for d in data if d["metodo_pago"] == "Tarjeta"),
        "total_transferencia": sum(d["monto"] for d in data if d["metodo_pago"] == "Transferencia"),
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

    # --- decidir plan a utilizar ---
    membresia_id = payload.get("membresia_id")
    plan = None
    if membresia_id:
        plan = Membresia.query.get(int(membresia_id))
        if not plan:
            return jsonify({"error": "membresía no existe"}), 404
    else:
        # renovar sobre el último plan del cliente
        last = _last_plan(cliente_id)
        if not last:
            return jsonify({"error": "no hay plan previo para renovar"}), 400
        plan = last.membresia

    # --- cerrar activas previas y crear/renovar ---
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
    db.session.flush()  # para tener cm.cliente_membresia_id

    # --- crear pago ---
    pago = Pago(
        cliente_id=cliente_id,
        cliente_membresia_id=cm.cliente_membresia_id,
        monto=monto,
        metodo_pago=metodo,
        fecha_pago=datetime.utcnow(),
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
    tipo = data["tipo"]

    hoy = date.today()
    cm = (
        ClienteMembresia.query.filter_by(cliente_id=cliente_id, estado="activa")
        .order_by(ClienteMembresia.fecha_fin.desc())
        .first()
    )
    if not cm or cm.fecha_fin < hoy:
        return jsonify({"error": "sin membresía activa"}), 403

    asistencia = Asistencia(cliente_id=cliente_id, tipo=tipo)
    db.session.add(asistencia)
    db.session.commit()
    return jsonify({"msg": "asistencia registrada"}), 201

@bp.get("/asistencias/hoy")
def asistencias_hoy():
    hoy = date.today()
    # Trae el datetime completo y la hora la formateamos en Python
    asist = (
        db.session.query(
            Asistencia.asistencia_id,
            Cliente.nombre,
            Cliente.apellido,
            Cliente.rut,
            Cliente.cliente_id,
            Asistencia.fecha_hora,
        )
        .join(Cliente)
        .filter(cast(Asistencia.fecha_hora, Date) == hoy)
        .order_by(Asistencia.fecha_hora.desc())
        .all()
    )

    data = []
    for a in asist:
        # a es un Row: (asistencia_id, nombre, apellido, rut, cliente_id, fecha_hora)
        asistencia_id, nombre, apellido, rut, cliente_id, fecha_hora = a
        hora_str = fecha_hora.strftime("%H:%M") if fecha_hora else None
        data.append(
            {
                "asistencia_id": asistencia_id,
                "nombre": nombre,
                "apellido": apellido,
                "rut": rut,
                "cliente_id": cliente_id,
                "hora": hora_str,
            }
        )
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
