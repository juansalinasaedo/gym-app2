# seed_update_password.py
"""
Script para actualizar o asignar una nueva contraseña a un usuario existente.
Uso:
    .\.venv\Scripts\python seed_update_password.py
"""

from app import create_app, db
from app.models import User

app = create_app()

def update_password(email: str, new_password: str):
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if not user:
            print(f"❌ No se encontró un usuario con el email: {email}")
            return

        user.set_password(new_password)
        db.session.commit()
        print(f"✅ Contraseña actualizada correctamente para: {user.email}")

if __name__ == "__main__":
    print("=== Actualizador de contraseña de usuario ===")
    email = input("Ingrese el email del usuario: ").strip().lower()
    new_password = input("Ingrese la nueva contraseña: ").strip()

    if not email or not new_password:
        print("⚠️ Email y contraseña no pueden estar vacíos.")
    else:
        update_password(email, new_password)
