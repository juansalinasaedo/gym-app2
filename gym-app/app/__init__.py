# app/__init__.py
from flask import Flask, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from os import getenv
from dotenv import load_dotenv
from datetime import timedelta

db = SQLAlchemy()


def create_app():
    load_dotenv()  # lee .env localmente

    app = Flask(__name__)

    app.config["SECRET_KEY"] = getenv("SECRET_KEY", "dev-secret-key")
    app.config["SQLALCHEMY_DATABASE_URI"] = getenv("DATABASE_URL", "sqlite:///gym.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(minutes=10)

    # 👇 configuración de cookies según entorno
    is_production = getenv("FLASK_ENV") == "production" or getenv("RENDER") == "true"

    if is_production:
        # Producción (Render: HTTPS + dominios distintos)
        app.config["SESSION_COOKIE_SAMESITE"] = "None"
        app.config["SESSION_COOKIE_SECURE"] = True
    else:
        # Local (HTTP)
        app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
        app.config["SESSION_COOKIE_SECURE"] = False

    # ---------- CORS dinámico ----------
    # En Render, pon ALLOWED_ORIGINS = https://TU-FRONT.onrender.com
    # (y opcionalmente también localhost para desarrollo)
    raw_origins = getenv(
        "ALLOWED_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173"
    )
    origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

    CORS(
        app,
        supports_credentials=True,
        resources={r"/*": {"origins": origins}},
    )
    # -----------------------------------

    db.init_app(app)

    # ✅ Register CLI commands (import tardío para evitar circular import)
    from .commands import register_commands
    register_commands(app)

    # Blueprints
    from .auth import auth_bp
    app.register_blueprint(auth_bp)

    from .routes import bp as api_bp
    app.register_blueprint(api_bp, url_prefix="/api")

    with app.app_context():
        from . import models
        db.create_all()

    # Helpers de protección (se usan desde routes.py)
    def login_required(fn):
        from functools import wraps

        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not session.get("user_id"):
                return jsonify({"error": "auth_required"}), 401
            return fn(*args, **kwargs)

        return wrapper

    def roles_required(*roles):
        from functools import wraps

        def deco(fn):
            @wraps(fn)
            def wrapper(*args, **kwargs):
                r = session.get("role")
                if not r or r not in roles:
                    return jsonify({"error": "forbidden"}), 403
                return fn(*args, **kwargs)

            return wrapper

        return deco

    app.login_required = login_required
    app.roles_required = roles_required
    return app
