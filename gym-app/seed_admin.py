# seed_admin.py
from app import create_app, db
from app.models import User

# Crear la app dentro de contexto Flask
app = create_app()

with app.app_context():
    email = "admin@gym.local"
    nombre = "Administrador"
    password = "admin123"

    # Buscar si ya existe
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
