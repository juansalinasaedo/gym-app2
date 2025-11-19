# seed_admin.py
from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    from .models import User
    db.create_all()

    # Si no existe ningún usuario, crea admin por defecto
    if not User.query.first():
        admin = User(
            email="juan.salinas.aedo@gmail.com",
            role="Megamanx4#"
        )
        admin.set_password("123456")
        db.session.add(admin)
        db.session.commit()
        print("Admin creado:", email, "pass=admin123")
    else:
        print("Ya existía:", email)
