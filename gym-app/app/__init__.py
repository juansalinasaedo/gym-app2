# app/__init__.py
from flask import Flask, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from os import getenv
from dotenv import load_dotenv

db = SQLAlchemy()


def create_app():
    # En Render igual ve las envs, pero no molesta cargar .env en local
    load_dotenv()

    app = Flask(__name__)

    # Clave de sesión y conexión a BD
    app.config["SECRET_KEY"] = getenv("SECRET_KEY", "dev-secret-key")
    app.config["SQLALCHEMY_DATABASE_URI"] = getenv("DATABASE_URL", "sqlite:///gym.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # ----- CORS -----
    # En Render define ALLOWED_ORIGINS con tu front:
    #   ALLOWED_ORIGINS=https://gym-app2-1.onrender.com
    origins_str = getenv("ALLOWED_ORIGINS", "")
    if origins_str:
        origins = [o.strip() for o in origins_str.split(",") if o.strip()]
    else:
        # valores por defecto para desarrollo local
        origins = [
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:4173",
            "http://localhost:4173",
        ]

    CORS(
        app,
        supports_credentials=True,
        resources={
            # aplica CORS tanto a la API como a /auth/*
            r"/api/*": {"origins": origins},
            r"/auth/*": {"origins": origins},
        },
    )

    db.init_app(app)

    # Blueprints
    from .auth import auth_bp
    app.register_blueprint(auth_bp)          # -> /auth/*

    from .routes import bp as api_bp
    app.register_blueprint(api_bp, url_prefix="/api")  # -> /api/*

    # Crear tablas si no existen
    with app.app_context():
        from . import models
        db.create_all()

    # Helpers de protección (se enganchan al app para usarlos en otros módulos)
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

    # Endpoint simple para probar que el backend está vivo
    @app.get("/")
    def health():
        return jsonify({"status": "ok"}), 200

    return app
