# app/__init__.py
from flask import Flask, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from os import getenv
from dotenv import load_dotenv
from datetime import timedelta

db = SQLAlchemy()


def create_app():
    load_dotenv()

    app = Flask(__name__)

    database_url = getenv("DATABASE_URL", "sqlite:///gym.db")

    # Compatibilidad común con Render/Heroku antiguos
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    app.config["SECRET_KEY"] = getenv("SECRET_KEY", "dev-secret-key")
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(minutes=10)

    # Cookies según entorno
    is_production = getenv("FLASK_ENV") == "production" or getenv("RENDER") == "true"

    if is_production:
        app.config["SESSION_COOKIE_SAMESITE"] = "None"
        app.config["SESSION_COOKIE_SECURE"] = True
    else:
        app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
        app.config["SESSION_COOKIE_SECURE"] = False

    # CORS
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

    db.init_app(app)

    # CLI commands
    try:
        from .commands import register_commands
        register_commands(app)
    except Exception as e:
        print(f"[WARN] No se pudieron registrar comandos CLI: {e}")

    # -------------------------
    # Blueprints
    # -------------------------
    from .auth import auth_bp
    app.register_blueprint(auth_bp)

    # Blueprint principal API
    from .routes import bp as api_bp
    app.register_blueprint(api_bp, url_prefix="/api")

    # Blueprints adicionales
    # Estos archivos ya definen rutas con /api/... internamente
    from .routes_dashboard import api_dashboard
    app.register_blueprint(api_dashboard)

    from .routes_pagos import api_pagos
    app.register_blueprint(api_pagos)

    from .routes_caja import api_caja
    app.register_blueprint(api_caja)

    from .routes_face import api_face
    app.register_blueprint(api_face)

    with app.app_context():
        from . import models
        db.create_all()

    # Helpers de protección
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

    # Debug útil: mostrar rutas registradas al iniciar
    print("\n======= RUTAS REGISTRADAS =======")
    for rule in sorted(app.url_map.iter_rules(), key=lambda r: r.rule):
        methods = ",".join(sorted(m for m in rule.methods if m not in {"HEAD", "OPTIONS"}))
        print(f"{methods:15} {rule.rule}")
    print("=================================\n")

    return app