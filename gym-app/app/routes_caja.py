from flask import Blueprint, jsonify
from datetime import date
from sqlalchemy import func
from app import db

api_caja = Blueprint("api_caja", __name__)

@api_caja.get("/api/caja/cierre-hoy")
def cierre_hoy():
    hoy = date.today()

    try:
        from app.models import CierreCaja
    except Exception:
        return jsonify({"cerrado": False})

    cierre = db.session.query(CierreCaja).filter(
        func.date(CierreCaja.fecha) == hoy
    ).first()

    if not cierre:
        return jsonify({"cerrado": False})

    return jsonify({
        "cerrado": True,
        "resumen": {
            "total_sistema": float(cierre.total_sistema),
            "total_declarado": float(cierre.total_declarado),
            "diferencia": float(cierre.diferencia)
        }
    })
