# routes.py
from flask import Blueprint, jsonify, request
from datetime import date, datetime, time, timedelta
from sqlalchemy import func, and_
from . import db
from .models import Cliente, Membresia, Pago, Asistencia, ClienteMembresia

bp = Blueprint("api", __name__)

# -------- Helpers --------
def to_float(x):
    """Convierte Decimal/None a float seguro para JSON."""
    if x is None:
        return 0.0
    try:
        return float(x)
    except Exception:
        # último recurso: str, pero preferimos float para totales
        return float(str(x))

# -------- CLIENTES --------
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
    return jsonify({"msg": "cliente creado"}), 201

# -------- MEMBRESÍAS --------
@bp.get("/membresias")
def get_membresias():
    rows = Membresia.query.all()
    data = [
        {
            "membresia_id": m.membresia_id,
            "nombre": m.nombre,
            "descripcion": m.descripcion,
            "duracion_dias": m.duracion_dias,
            "precio": float(m.precio) if m.precio is not None else 0.0,
        }
        for m in rows
    ]
    return jsonify(data)

@bp.post("/membresias")
def crear_membresia():
    data = request.json or {}
    nueva = Membresia(
        nombre=data["nombre"],
        descripcion=data.get("descripcion", ""),
        precio=data["precio"],
        duracion_dias=data["duracion_dias"],
    )
    db.session.add(nueva)
    db.session.commit()
    return jsonify({"msg": "membresía creada"}), 201

# -------- MEMBRESÍA ACTIVA --------
@bp.get("/clientes/<int:cliente_id>/membresias/activa")
def membresia_activa(cliente_id):
    hoy = date.today()
    # Tomamos la última relación activa (si existe)
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
            "precio": to_float(cm.membresia.precio),  # <- Decimal -> float
            "fecha_inicio": str(cm.fecha_inicio),
            "fecha_fin": str(cm.fecha_fin),
            "dias_restantes": dias_rest,
            "estado": estado,
        }
    )

# -------- PAGOS --------
@bp.get("/pagos/hoy")
def pagos_hoy():
    hoy = date.today()
    # Ventana de día completo para portabilidad entre motores
    inicio = datetime.combine(hoy, time.min)
    fin = datetime.combine(hoy, time.max)

    pagos = (
        Pago.query
        .join(Cliente, Pago.cliente_id == Cliente.cliente_id)
        .filter(Pago.fecha_pago.between(inicio, fin))
        .order_by(Pago.fecha_pago.desc())
        .all()
    )

    data = []
    for p in pagos:
        c = p.cliente
        data.append(
            {
                "pago_id": p.pago_id,
                "monto": to_float(p.monto),                 # <- Decimal -> float
                "metodo_pago": p.metodo_pago,
                "hora": p.fecha_pago.strftime("%H:%M"),
                "nombre": c.nombre,
                "apellido": c.apellido,
                "rut": c.rut,
            }
        )

    resumen = {
        "total_general": sum(item["monto"] for item in data),
        "total_efectivo": sum(item["monto"] for item in data if item["metodo_pago"] == "Efectivo"),
        "total_tarjeta": sum(item["monto"] for item in data if item["metodo_pago"] == "Tarjeta"),
        "total_transferencia": sum(item["monto"] for item in data if item["metodo_pago"] == "Transferencia"),
    }

    return jsonify({"pagos": data, "resumen": resumen})

# -------- ASISTENCIAS --------
@bp.post("/asistencias")
def marcar_asistencia():
    data = request.json or {}
    cliente_id = data["cliente_id"]
    tipo = data["tipo"]

    # Verificar membresía activa para "entrada"
    hoy = date.today()
    if tipo == "entrada":
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
    inicio = datetime.combine(hoy, time.min)
    fin = datetime.combine(hoy, time.max)

    asist = (
        Asistencia.query
        .join(Cliente, Asistencia.cliente_id == Cliente.cliente_id)
        .filter(Asistencia.fecha_hora.between(inicio, fin))
        .order_by(Asistencia.fecha_hora.desc())
        .all()
    )

    data = []
    for a in asist:
        c = a.cliente
        data.append(
            {
                "asistencia_id": a.asistencia_id,
                "nombre": c.nombre,
                "apellido": c.apellido,
                "rut": c.rut,
                "cliente_id": c.cliente_id,
                "hora": a.fecha_hora.strftime("%H:%M"),
            }
        )
    return jsonify(data)

# -------- VENCIMIENTOS PRÓXIMOS (≤3 días) --------
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
