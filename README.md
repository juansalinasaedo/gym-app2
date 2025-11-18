# 🏋️‍♂️ Sistema de Gestión de Gimnasio — FullStack (Flask + PostgreSQL + React)

Este proyecto es un **sistema integral de administración de gimnasio**, diseñado para gestionar:

- Registro de clientes
- Membresías y renovaciones
- Pagos y reportes contables
- Control de asistencias (entradas/salidas)
- Alertas de vencimiento
- Descarga de reportes en Excel
- Accesos según roles (Admin, Cajero)

Sistema optimizado para uso en un gimnasio real, con flujos rápidos y seguros.

---

## 🚀 Tecnologías utilizadas

### **Backend**
- Python 3 / Flask
- Flask-SQLAlchemy
- Flask-CORS
- PostgreSQL
- openpyxl (reportes Excel)
- Werkzeug / passlib

### **Frontend**
- React + Vite
- TailwindCSS
- Hooks personalizados para API
- Componentes optimizados para uso rápido

---

## 👥 Perfiles del sistema

### 🛠 **Administrador**
Tiene acceso total:
- CRUD clientes
- CRUD membresías
- Reportes Excel (pagos, asistencias)
- Gestión de asistencias
- Dashboard completo
- Configuraciones internas

### 💰 **Cajero**
Acceso restringido:
- Marcar entradas
- Registrar pagos
- Renovación de membresías
- Ver asistencias del día
- Buscar asistencias por rango
- NO PUEDE: crear usuarios, crear membresías, modificar configuraciones administrativas

La autorización de módulos se controla desde:

frontend → CashierPanel.jsx
frontend → App.jsx
backend  → roles_required()

---

## 📂 Estructura del proyecto


gym-app/
│── backend/
│   ├── app/
│   │   ├── models.py
│   │   ├── routes.py
│   │   ├── decorators.py
│   │   ├── init.py
│   ├── run.py
│   ├── requirements.txt
│   ├── requirements-dev.txt
│
│── frontend/
│   ├── src/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── components/
│   │   ├── pages/
│   │   ├── utils/
│   ├── index.html
│   ├── package.json
│
└── README.md

---

# ⚙️ Instalación y ejecución

## 1️⃣ Clonar repositorio

```bash
git clone https://github.com/tu-repo/gym-app.git
cd gym-app


🐍 Backend (Flask)
2️⃣ Crear entorno virtual
cd backend
python -m venv .venv

Activar entorno:
Windows
.venv\Scripts\activate

Linux / Mac
source .venv/bin/activate


3️⃣ Instalar dependencias
pip install -r requirements.txt

Si estás en desarrollo:
pip install -r requirements-dev.txt


4️⃣ Configurar variables de entorno
Crear archivo .env:
FLASK_DEBUG=1
DATABASE_URL=postgresql://usuario:password@localhost:5432/gymdb
SECRET_KEY=un_secreto_seguro


5️⃣ Inicializar Base de Datos
python
>>> from app import db, create_app
>>> app = create_app()
>>> app.app_context().push()
>>> db.create_all()


6️⃣ Iniciar backend
python run.py

Por defecto se ejecuta en:
http://127.0.0.1:5000


💻 Frontend (React)
1️⃣ Instalar dependencias
cd frontend
npm install


2️⃣ Crear archivo .env
VITE_API_BASE=http://127.0.0.1:5000


3️⃣ Ejecutar frontend
npm run dev

Frontend disponible en:
http://127.0.0.1:5173


📊 Módulos principales
✔️ Clientes


Crear / editar clientes


Nuevos campos: dirección, estado laboral, sexo


Validación de RUT único


✔️ Membresías


Crear planes (admin)


Asignación automática con fecha de inicio/fin


✔️ Pagos


Registrar pagos (cajero)


Renovaciones + pago integrado


Dashboard diario


✔️ Asistencias


Entrada/salida


Prevenir doble entrada por día


Control por rol: exige membresía activa


✔️ Reportes Excel


Pagos del período (admin)


Asistencias por rango (admin / cajero)


Totales por método de pago



📦 Reportes Excel
📘 Pagos
Ruta backend:
GET /api/pagos/export_excel

📙 Asistencias por rango
Ruta backend:
GET /api/asistencias/rango/excel

Ambos retornan archivos .xlsx generados con openpyxl.

🔐 Seguridad y Roles
Controlado desde:
Backend


login_required


roles_required("admin")


roles_required("cashier")


Frontend


Ocultación de módulos según rol en:


CashierPanel.jsx


App.jsx


Sidebar.jsx (si existe)





🧪 Tests
Pendiente por implementar.

🤝 Contribuciones
Pull requests bienvenidos.
Contactar al desarrollador para coordinación.

🧑‍💻 Autor
Juan Francisco Salinas Aedo
Ingeniero Informático — Talca, Chile
Desarrollo FullStack / Sistemas de Gestión

🏁 Estado del proyecto
✔️ Operativo
✔️ Backend estable
✔️ Frontend funcional
⬜ Tests unitarios
⬜ Modo dark
⬜ Dashboard analítico ampliado


# 📌 **FIN DEL TEXTO DEL README.md — COPIAR SOLO LO QUE ESTÁ DENTRO DEL BLOQUE**

---

Si deseas, también puedo agregar:

✅ Badges (versiones, licencias, frameworks)  
✅ Capturas de pantalla (placeholders)  
✅ Tabla de contenidos automática  
✅ Sección “Changelog”  
