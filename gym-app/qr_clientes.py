from app import create_app, db
from app.models import Cliente

app = create_app()

with app.app_context():
    clientes = Cliente.query.all()
    for c in clientes:
        c.ensure_qr_token()
    db.session.commit()

print("✓ Tokens QR generados correctamente.")
