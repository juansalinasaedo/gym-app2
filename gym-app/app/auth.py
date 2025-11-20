# app/auth.py
from __future__ import annotations

from flask import Blueprint, request, jsonify, session
from typing import Any, Dict, Optional
from .models import User
from . import db

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

# ---------- Helpers ----------

ALLOWED_ROLES = {"admin", "cashier"}

def _user_to_dict(u: User) -> Dict[str, Any]:
    return {
        "user_id": u.user_id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "enabled": bool(u.enabled),
        "created_at": u.created_at.isoformat() if getattr(u, "created_at", None) else None,
    }

def _require_login() -> Optional[Any]:
    """Devuelve una respuesta JSON 401 si no hay sesión; None si ok."""
    if not session.get("user_id"):
        return jsonify({"error": "auth_required"}), 401
    return None

def _require_roles(*roles: str) -> Optional[Any]:
    """Devuelve 403 si el rol actual no está permitido."""
    r = session.get("role")
    if not r or r not in roles:
        return jsonify({"error": "forbidden"}), 403
    return None

def _normalize_email(s: str) -> str:
    return (s or "").strip().lower()

# ---------- Sesión ----------

@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    email = _normalize_email(data.get("email", ""))
    password = data.get("password") or ""

    u = User.query.filter_by(email=email).first()
    if not u or not u.enabled or not u.check_password(password):
        return jsonify({"error": "invalid_credentials"}), 401

    # Cookie de sesión (Flask)
    session["user_id"] = u.user_id
    session["role"] = u.role
    return jsonify({"user": _user_to_dict(u)}), 200


@auth_bp.post("/logout")
def logout():
    session.clear()
    return jsonify({"ok": True}), 200


@auth_bp.get("/me")
def me():
    uid = session.get("user_id")
    if not uid:
        return jsonify({"user": None}), 200
    u = User.query.get(uid)
    return jsonify({"user": _user_to_dict(u) if u else None}), 200

# ---------- Acciones del propio usuario ----------

@auth_bp.post("/change_password")
def change_password():
    """Cambia la contraseña del usuario autenticado."""
    err = _require_login()
    if err:
        return err

    data = request.get_json() or {}
    old = data.get("old_password") or ""
    new = data.get("new_password") or ""

    if len(new) < 8:
        return jsonify({"error": "weak_password", "detail": "Longitud mínima 8"}), 400

    u = User.query.get(session["user_id"])
    if not u or not u.check_password(old):
        return jsonify({"error": "invalid_credentials"}), 401

    u.set_password(new)
    db.session.commit()
    return jsonify({"ok": True}), 200


@auth_bp.post("/update_profile")
def update_profile():
    """Actualiza nombre del usuario autenticado."""
    err = _require_login()
    if err:
        return err

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "invalid_name"}), 400

    u = User.query.get(session["user_id"])
    if not u:
        return jsonify({"error": "not_found"}), 404

    u.name = name
    db.session.commit()
    return jsonify({"user": _user_to_dict(u)}), 200

# ---------- Administración de usuarios (solo admin) ----------

@auth_bp.get("/users")
def list_users():
    err = _require_login() or _require_roles("admin")
    if err:
        return err

    q = User.query.order_by(User.created_at.desc())
    rows = [_user_to_dict(u) for u in q.all()]
    return jsonify({"items": rows}), 200

@auth_bp.get("/debug/users")
def debug_users():
    rows = User.query.all()
    return jsonify([{
        "user_id": u.user_id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "enabled": u.enabled
    } for u in rows]), 200


@auth_bp.post("/users")
def create_user():
    """Crea usuario (admin o cajero). Campos: name, email, password, role."""
    err = _require_login() or _require_roles("admin")
    if err:
        return err

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = _normalize_email(data.get("email", ""))
    password = data.get("password") or ""
    role = (data.get("role") or "cashier").strip()

    if not name or not email or not password:
        return jsonify({"error": "missing_fields"}), 400
    if role not in ALLOWED_ROLES:
        return jsonify({"error": "invalid_role"}), 400
    if len(password) < 8:
        return jsonify({"error": "weak_password", "detail": "Longitud mínima 8"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email_in_use"}), 409

    u = User(name=name, email=email, role=role, enabled=True)
    u.set_password(password)
    db.session.add(u)
    db.session.commit()
    return jsonify({"user": _user_to_dict(u)}), 201


@auth_bp.patch("/users/<int:user_id>")
def users_reset_password(user_id):
    """
    Reset de contraseña (solo admin).
    Body JSON: { "password": "nuevaClave" }
    """
    # protege con sesión
    if not session.get("user_id"):
        return jsonify({"error": "auth_required"}), 401
    if session.get("role") != "admin":
        return jsonify({"error": "forbidden"}), 403

    data = request.get_json() or {}
    new_pass = (data.get("password") or "").strip()

    if len(new_pass) < 6:
        return jsonify({"error": "password_too_short", "min": 6}), 400

    u = User.query.get_or_404(user_id)
    u.set_password(new_pass)
    db.session.commit()
    return jsonify({"ok": True, "user_id": u.user_id})

def update_user(user_id: int):
    """
    Actualiza un usuario (solo admin).
    Acepta campos opcionales: name, role, enabled, password (para reset).
    """
    err = _require_login() or _require_roles("admin")
    if err:
        return err

    u = User.query.get(user_id)
    if not u:
        return jsonify({"error": "not_found"}), 404

    data = request.get_json() or {}

    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"error": "invalid_name"}), 400
        u.name = name

    if "role" in data:
        role = (data.get("role") or "").strip()
        if role not in ALLOWED_ROLES:
            return jsonify({"error": "invalid_role"}), 400
        u.role = role

    if "enabled" in data:
        u.enabled = bool(data.get("enabled"))

    if "password" in data:
        new = data.get("password") or ""
        if len(new) < 8:
            return jsonify({"error": "weak_password", "detail": "Longitud mínima 8"}), 400
        u.set_password(new)

    db.session.commit()
    return jsonify({"user": _user_to_dict(u)}), 200


@auth_bp.delete("/users/<int:user_id>")
def delete_user(user_id: int):
    err = _require_login() or _require_roles("admin")
    if err:
        return err

    u = User.query.get(user_id)
    if not u:
        return jsonify({"error": "not_found"}), 404

    # Evitar que el admin se borre a sí mismo por accidente
    if u.user_id == session.get("user_id"):
        return jsonify({"error": "cant_delete_self"}), 400

    db.session.delete(u)
    db.session.commit()
    return jsonify({"ok": True}), 200

# ---------- DEBUG / BOOTSTRAP (solo para inicializar) ----------

@auth_bp.get("/debug/bootstrap_admin")
def debug_bootstrap_admin():
    """
    Crea un usuario admin solo si actualmente no hay usuarios.
    IMPORTANTE: usar solo para inicializar y luego borrar esta ruta.
    """
    # ¿Ya hay usuarios?
    if User.query.count() > 0:
        return jsonify({"ok": False, "detail": "Ya existen usuarios, no se creó nada."}), 200

    # Puedes cambiar estos valores si quieres
    email = _normalize_email(request.args.get("email") or "juan.salinas.aedo@gmail.com")
    password = request.args.get("password") or "Megamanx4#"
    name = request.args.get("name") or "Admin Principal"

    if len(password) < 8:
        return jsonify({"ok": False, "error": "weak_password", "detail": "Longitud mínima 8"}), 400

    u = User(
        name=name,
        email=email,
        role="admin",
        enabled=True,
    )
    u.set_password(password)
    db.session.add(u)
    db.session.commit()

    return jsonify({
        "ok": True,
        "msg": "Usuario admin creado",
        "user": _user_to_dict(u),
        "login_hint": {
            "email": email,
            "password": password
        }
    }), 201
