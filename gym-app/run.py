from app import create_app, db
from app.models import *  # importa los modelos para que SQLAlchemy conozca las tablas
from flask.cli import load_dotenv

# Carga variables del .env (por si corres python run.py directamente)
load_dotenv()

app = create_app()

# Esto crea las tablas si no existen todavía.
# OJO: esto no borra nada ni migra estructura compleja,
# solo hace un create_all inicial si la tabla no existe.
with app.app_context():
    db.create_all()

if __name__ == "__main__":
    # host 127.0.0.1 y debug=True para desarrollo local
    app.run(host="127.0.0.1", port=5000, debug=True)