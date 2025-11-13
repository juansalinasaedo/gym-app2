# seed_admin.py
from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    email = "admin@gym.local"
    u = User.query.filter_by(email=email).first()
    if not u:
        u = User(name="Administrador", email=email, role="admin", enabled=True)
        u.set_password("admin123")  # cámbialo luego
        db.session.add(u)
        db.session.commit()
        print("Admin creado:", email, "pass=admin123")
    else:
        print("Ya existía:", email)
