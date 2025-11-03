from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData
from dotenv import load_dotenv
from flask_cors import CORS
import os

load_dotenv()

convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}
metadata = MetaData(naming_convention=convention)
db = SQLAlchemy(metadata=metadata)

def create_app():
    app = Flask(__name__)

    # Config DB desde .env
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    # 🔐 CORS: permitir solo las rutas /api/* y solo desde el front local
    CORS(
        app,
        resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}},
        supports_credentials=False,
        allow_headers=["Content-Type", "Accept"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    from .routes import bp as api_bp
    app.register_blueprint(api_bp, url_prefix="/api")

    @app.get("/")
    def health():
        return "✅ Gym API OK"

    return app
