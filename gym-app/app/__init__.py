# app/__init__.py
from flask import Flask, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from os import getenv
from dotenv import load_dotenv
from sqlalchemy.exc import IntegrityError

db = SQLAlchemy()

def create_app():
    # En local lee .env; en Render simplemente no hace nada si no existe
    load_dotenv()

    app = Flask(__name__)

    # Config básica
    app.config["SECRET_KEY"] = getenv("SECRET_KEY", "dev-secret-key")
    app.config["SQLALCHEMY_DATABASE_URI"] = getenv("DATABASE_URL", "sqlite:///gym.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Cookies de sesión (importante para login desde otro dominio)
    app.config["SESSION_COOKIE_SAMESITE"] = getenv("SESSION_COOKIE_SAMESITE", "None")
    app.config["SESSION_COOKIE_SECURE"] = getenv("SESSION_COOKIE_SECURE", "True") == "True"

    # Orígenes permitidos para CORS
    default_origins = "http://127.0.0.1:5173,http://localhost:5173"
    origins_env = getenv("ALLOWED_ORIGINS", default_origins)
    origins = [o.strip() for o in origins_env.split(",") if o.strip()]

    CORS(
        app,
        supports_credentials=True,
        resources={r"/*": {"origins": origins}},
    )

    db.init_app(app)

    # Blueprints
    from .auth import auth_bp
    app.register_blueprint(auth_bp)

    from .routes import bp as api_bp
    # OJO: routes.py ya tiene url_prefix="/api", así que aquí NO lo repetimos
    app.register_blueprint(api_bp)

    # Crear tablas y sembrar admin si la BD está vacía
    with app.app_context():
        from . import models
        from .models import User  # ajusta el nombre si tu modelo se llama distinto

        db.create_all()

        try:
            # Solo si no hay ningún usuario, creamos el admin
            if not User.query.first():
                admin_email = getenv("ADMIN_EMAIL", "admin@gym.local")
                admin_password = getenv("ADMIN_PASSWORD", "123456")

                admin = User(
                    name="Administrador",        # 👈 aquí estaba el problema: antes era None
                    email=admin_email,
                    role="admin",
                    enabled=True,               # por si tu modelo tiene este campo NOT NULL o con default
                )

                # asumimos que tu modelo tiene set_password (por passlib)
                if hasattr(admin, "set_password"):
                    admin.set_password(admin_password)
                else:
                    # Si no tiene set_password, ya tendrías tú otro mecanismo en tu modelo;
                    # deja esta parte como la uses normalmente.
                    admin.password = admin_password  # ajusta si es necesario

                db.session.add(admin)
                db.session.commit()
        except IntegrityError:
            # Si por alguna razón se produce una condición de carrera o ya existe un admin,
            # evitamos que la app reviente en el arranque
            db.session.rollback()

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

    return app
