# run.py
import os
from app import create_app, db
from app.models import User

app = create_app()

def seed_admin():
    """
    Crea el usuario "admin" si no existe.
    Esta función se puede ejecutar en cada arranque sin problemas.
    """
    email = "admin@gym.local"
    nombre = "Administrador"
    password = "admin123"

    user = User.query.filter_by(email=email).first()

    if not user:
        user = User(
            name=nombre,
            email=email,
            role="admin",
            enabled=True
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        print(f"✅ Usuario admin creado: {email} / pass={password}")
    else:
        print(f"ℹ️ Ya existía el usuario: {email}")

# Ejecutar el seed en el arranque de la app
with app.app_context():
    seed_admin()

if __name__ == "__main__":
    # Render suele inyectar PORT; si no, usa 5000
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
