# gym-app/run.py
import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    # Render expone el puerto en la variable de entorno PORT
    port = int(os.getenv("PORT", 5000))
    # En producción no necesitamos debug
    debug = os.getenv("FLASK_ENV", "development") != "production"

    app.run(host="0.0.0.0", port=port, debug=debug)
