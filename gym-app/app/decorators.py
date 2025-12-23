from functools import wraps
from flask import request, session, jsonify

def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # Permitir preflight CORS
        if request.method == "OPTIONS":
            return ("", 200)

        if not session.get("user_id"):
            return jsonify({"error": "unauthorized"}), 401

        return fn(*args, **kwargs)
    return wrapper


def roles_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Permitir preflight CORS
            if request.method == "OPTIONS":
                return ("", 200)

            user_role = session.get("user_role")
            if not user_role or user_role not in roles:
                return jsonify({"error": "forbidden"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator
