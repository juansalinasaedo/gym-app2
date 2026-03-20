from flask import Blueprint, jsonify, request
from datetime import date, datetime, timedelta
from sqlalchemy import func

from app import db
from app.decorators import login_required

api_pagos = Blueprint("api_pagos", __name__)


@api_pagos.get("/api/pagos/hoy")
@login_required
def pagos_hoy():
    hoy = date.today()

    from app.models import Pago, Cliente

    pagos = (
        db.session.query(Pago, Cliente)
        .join(Cliente, Cliente.cliente_id == Pago.cliente_id)
        .filter(func.date(Pago.fecha_pago) == hoy)
        .order_by(Pago.fecha_pago.desc())
        .all()
    )

    resumen = {
        "total_general": 0.0,
        "total_efectivo": 0.0,
        "total_tarjeta": 0.0,
        "total_transferencia": 0.0,
    }

    lista = []
    for p, c in pagos:
        monto = float(p.monto or 0)
        resumen["total_general"] += monto

        mp = (p.metodo_pago or "").lower().strip()
        if mp == "efectivo":
            resumen["total_efectivo"] += monto
        elif mp == "tarjeta":
            resumen["total_tarjeta"] += monto
        elif mp == "transferencia":
            resumen["total_transferencia"] += monto

        lista.append({
            "id": p.pago_id,
            "hora": p.fecha_pago.strftime("%H:%M") if p.fecha_pago else "",
            "nombre": c.nombre,
            "apellido": c.apellido,
            "rut": c.rut,
            "monto": monto,
            "metodo_pago": p.metodo_pago,
        })

    return jsonify({"pagos": lista, "resumen": resumen})


@api_pagos.post("/api/pagos/renovar")
@login_required
def pagar_y_renovar():
    from app.models import Pago, Cliente, Membresia, ClienteMembresia

    payload = request.get_json(silent=True) or {}

    cliente_id = payload.get("cliente_id")
    membresia_id = payload.get("membresia_id")
    monto = payload.get("monto")
    metodo_pago = (payload.get("metodo_pago") or "").strip()

    if not cliente_id:
        return jsonify({"error": "cliente_id es obligatorio"}), 400

    if not membresia_id:
        return jsonify({"error": "membresia_id es obligatorio"}), 400

    if monto in (None, ""):
        return jsonify({"error": "monto es obligatorio"}), 400

    if not metodo_pago:
        return jsonify({"error": "metodo_pago es obligatorio"}), 400

    cliente = Cliente.query.get(cliente_id)
    if not cliente:
        return jsonify({"error": "Cliente no encontrado"}), 404

    membresia = Membresia.query.get(membresia_id)
    if not membresia:
        return jsonify({"error": "Membresía no encontrada"}), 404

    try:
        monto_val = float(monto)
    except (TypeError, ValueError):
        return jsonify({"error": "monto inválido"}), 400

    try:
        hoy = date.today()

        # Desactivar membresías activas previas del cliente
        activas = (
            ClienteMembresia.query
            .filter(
                ClienteMembresia.cliente_id == cliente_id,
                ClienteMembresia.estado == "activa",
            )
            .all()
        )

        for cm in activas:
            cm.estado = "vencida"

        duracion = int(getattr(membresia, "duracion_dias", 0) or 0)
        fecha_inicio = hoy
        fecha_fin = hoy + timedelta(days=max(duracion - 1, 0))

        nueva_cm = ClienteMembresia(
            cliente_id=cliente_id,
            membresia_id=membresia_id,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            estado="activa",
        )

        pago = Pago(
            cliente_id=cliente_id,
            monto=monto_val,
            metodo_pago=metodo_pago,
            fecha_pago=datetime.now(),
        )

        db.session.add(nueva_cm)
        db.session.add(pago)
        db.session.commit()

        return jsonify({
            "ok": True,
            "message": "Membresía asignada/renovada y pago registrado",
            "cliente_membresia": {
                "cliente_membresia_id": nueva_cm.cliente_membresia_id,
                "cliente_id": nueva_cm.cliente_id,
                "membresia_id": nueva_cm.membresia_id,
                "fecha_inicio": nueva_cm.fecha_inicio.isoformat() if nueva_cm.fecha_inicio else None,
                "fecha_fin": nueva_cm.fecha_fin.isoformat() if nueva_cm.fecha_fin else None,
                "estado": nueva_cm.estado,
            },
            "pago": {
                "pago_id": pago.pago_id,
                "cliente_id": pago.cliente_id,
                "monto": float(pago.monto or 0),
                "metodo_pago": pago.metodo_pago,
                "fecha_pago": pago.fecha_pago.isoformat() if pago.fecha_pago else None,
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Error al asignar y pagar",
            "detail": str(e)
        }), 500