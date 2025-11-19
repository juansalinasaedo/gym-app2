# app/__init__.py
from flask import Flask, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from os import getenv
from dotenv import load_dotenv

db = SQLAlchemy()

def create_app():
    # En local lee .env; en Render simplemente no hará nada
    load_dotenv()

    app = Flask(__name__)

    # Config básica
    app.config["SECRET_KEY"] = getenv("SECRET_KEY", "dev-secret-key")
    app.config["SQLALCHEMY_DATABASE_URI"] = getenv("DATABASE_URL", "sqlite:///gym.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Cookies de sesión (para que funcionen entre dominios)
    app.config["SESSION_COOKIE_SAMESITE"] = getenv("SESSION_COOKIE_SAMESITE", "Lax")
    # En Render pondremos True, en local puede ser False
    app.config["SESSION_COOKIE_SECURE"] = getenv("SESSION_COOKIE_SECURE", "False") == "True"

    # 🟢 CORS: orígenes definidos por variable
    # Ejemplo en local (por defecto): http://localhost:5173
    # En Render: agregas tu URL de frontend en ALLOWED_ORIGINS
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
    app.register_blueprint(api_bp, url_prefix="/api")

    with app.app_context():
        from . import models  # registra User y demás
        db.create_all()      # crea tablas en la BD apuntada por DATABASE_URL

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
