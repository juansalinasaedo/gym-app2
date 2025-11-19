# run.py
import os
from app import create_app

# La app se crea usando la factory de app/__init__.py
app = create_app()

if __name__ == "__main__":
    # Render setea PORT en el entorno. En local usamos 5000 por defecto.
    port = int(os.getenv("PORT", 5000))

    # Enprod: FLASK_ENV=production → debug=False
    debug = os.getenv("FLASK_ENV", "development") != "production"

    app.run(host="0.0.0.0", port=port, debug=debug)
