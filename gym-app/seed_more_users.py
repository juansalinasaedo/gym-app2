# seed_more_users.py
from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    users = [
        {"name": "Administrador2", "email": "juan.salinas.aedo@gmail.com", "role": "admin", "password": "Megamanx4#"},
        {"name": "Cajero1", "email": "cajero@gym.local", "role": "cashier", "password": "caja123"},
    ]

    for u in users:
        exists = User.query.filter_by(email=u["email"]).first()
        if exists:
            print(f"⚠️ Ya existe: {u['email']}")
            continue
        user = User(name=u["name"], email=u["email"], role=u["role"], enabled=True)
        user.set_password(u["password"])
        db.session.add(user)
        print(f"✅ Creado {u['email']} ({u['role']})")
    db.session.commit()
