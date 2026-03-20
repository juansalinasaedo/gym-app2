from flask import Blueprint, jsonify, request
from datetime import date, timedelta, datetime
from sqlalchemy import func, desc
from app import db

api_dashboard = Blueprint("api_dashboard", __name__)

@api_dashboard.get("/api/dashboard/resumen")
def dashboard_resumen():
    hoy = date.today()

    # Modelos reales según tu models.py
    from app.models import Cliente, Asistencia, ClienteMembresia, Pago

    clientes_activos = db.session.query(Cliente).count()

    entradas_hoy = db.session.query(Asistencia).filter(
        func.date(Asistencia.fecha_hora) == hoy
    ).count()

    ingresos_hoy = db.session.query(func.coalesce(func.sum(Pago.monto), 0)).filter(
        func.date(Pago.fecha_pago) == hoy
    ).scalar()

    vencimientos_7d = db.session.query(ClienteMembresia).filter(
        ClienteMembresia.estado == "activa",
        ClienteMembresia.fecha_fin >= hoy,
        ClienteMembresia.fecha_fin <= hoy + timedelta(days=7),
    ).count()

    return jsonify({
        "clientes_activos": int(clientes_activos),
        "entradas_hoy": int(entradas_hoy),
        "ingresos_hoy": float(ingresos_hoy or 0),
        "vencimientos_7d": int(vencimientos_7d),
    })


@api_dashboard.get("/api/dashboard/vencimientos")
def dashboard_vencimientos():
    days = int(request.args.get("days", 7))
    hoy = date.today()
    limite = hoy + timedelta(days=days)

    from app.models import ClienteMembresia, Cliente, Membresia

    rows = (
        db.session.query(ClienteMembresia, Cliente, Membresia)
        .join(Cliente, Cliente.cliente_id == ClienteMembresia.cliente_id)
        .join(Membresia, Membresia.membresia_id == ClienteMembresia.membresia_id)
        .filter(
            ClienteMembresia.estado == "activa",
            ClienteMembresia.fecha_fin >= hoy,
            ClienteMembresia.fecha_fin <= limite,
        )
        .order_by(ClienteMembresia.fecha_fin.asc())
        .all()
    )

    data = []
    for cm, c, m in rows:
        dias_restantes = (cm.fecha_fin - hoy).days
        data.append({
            "cliente_membresia_id": cm.cliente_membresia_id,
            "cliente_id": c.cliente_id,
            "nombre": c.nombre,
            "apellido": c.apellido,
            "rut": c.rut,
            "nombre_plan": m.nombre,  # Membresia es el "plan" en tu diseño
            "fecha_fin": cm.fecha_fin.isoformat(),
            "dias_restantes": int(dias_restantes),
        })

    return jsonify({"vencimientos": data})


def _month_start(d):
    return d.replace(day=1)

def _add_months(d, months):
    # d es date
    y = d.year + (d.month - 1 + months) // 12
    m = (d.month - 1 + months) % 12 + 1
    return d.replace(year=y, month=m, day=1)

def _db_is_sqlite():
    try:
        return db.engine.name == "sqlite"
    except Exception:
        return False


@api_dashboard.get("/api/dashboard/asistencia/dias")
def dash_asistencia_dias():
    """
    Serie diaria del mes actual (para gráfico de tendencias).
    Retorna: [{fecha: 'YYYY-MM-DD', total: N}, ...]
    """
    from app.models import Asistencia

    today = date.today()
    start = _month_start(today)
    end = _add_months(start, 1)  # primer día del próximo mes

    # Solo 'entrada' (según tu UI)
    if _db_is_sqlite():
        day_expr = func.date(Asistencia.fecha_hora)
    else:
        day_expr = func.date_trunc("day", Asistencia.fecha_hora)

    rows = (
        db.session.query(day_expr.label("dia"), func.count(Asistencia.asistencia_id).label("total"))
        .filter(
            Asistencia.tipo == "entrada",
            Asistencia.fecha_hora >= start,
            Asistencia.fecha_hora < end,
        )
        .group_by("dia")
        .order_by("dia")
        .all()
    )

    out = []
    for dia, total in rows:
        # dia puede venir como string (sqlite) o datetime (postgres)
        if isinstance(dia, str):
            fecha = dia
        else:
            fecha = dia.date().isoformat() if hasattr(dia, "date") else str(dia)
        out.append({"fecha": fecha, "total": int(total)})

    return jsonify(out)


@api_dashboard.get("/api/dashboard/asistencia/horas")
def dash_asistencia_horas():
    """
    Ranking de horas del mes actual.
    Retorna: [{hora: 'HH:00', total: N}, ...] ordenado desc.
    """
    from app.models import Asistencia

    today = date.today()
    start = _month_start(today)
    end = _add_months(start, 1)

    if _db_is_sqlite():
        # '15' etc.
        hour_expr = func.strftime("%H", Asistencia.fecha_hora)
    else:
        hour_expr = func.extract("hour", Asistencia.fecha_hora)

    rows = (
        db.session.query(hour_expr.label("h"), func.count(Asistencia.asistencia_id).label("total"))
        .filter(
            Asistencia.tipo == "entrada",
            Asistencia.fecha_hora >= start,
            Asistencia.fecha_hora < end,
        )
        .group_by("h")
        .order_by(desc("total"))
        .all()
    )

    out = []
    for h, total in rows:
        # sqlite -> str; postgres -> Decimal/float/int
        try:
            hh = int(h)
        except Exception:
            hh = int(float(h))
        out.append({"hora": f"{hh:02d}:00", "total": int(total)})

    return jsonify(out)


@api_dashboard.get("/api/dashboard/asistencia/top-clientes")
def dash_asistencia_top_clientes():
    """
    Top clientes del mes actual por cantidad de 'entradas'.
    Retorna: [{cliente_id, nombre, apellido, rut, total}, ...]
    """
    from app.models import Asistencia, Cliente

    today = date.today()
    start = _month_start(today)
    end = _add_months(start, 1)

    rows = (
        db.session.query(
            Cliente.cliente_id.label("cliente_id"),
            Cliente.nombre.label("nombre"),
            Cliente.apellido.label("apellido"),
            Cliente.rut.label("rut"),
            func.count(Asistencia.asistencia_id).label("total"),
        )
        .join(Asistencia, Asistencia.cliente_id == Cliente.cliente_id)
        .filter(
            Asistencia.tipo == "entrada",
            Asistencia.fecha_hora >= start,
            Asistencia.fecha_hora < end,
        )
        .group_by(Cliente.cliente_id, Cliente.nombre, Cliente.apellido, Cliente.rut)
        .order_by(desc("total"))
        .limit(10)
        .all()
    )

    out = []
    for r in rows:
        out.append({
            "cliente_id": int(r.cliente_id),
            "nombre": r.nombre,
            "apellido": r.apellido,
            "rut": r.rut,
            "total": int(r.total),
        })

    return jsonify(out)