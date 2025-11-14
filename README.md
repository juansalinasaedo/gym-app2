📘 GYM-APP — Sistema Integral de Gestión para Gimnasios

Backend: Flask + SQLAlchemy
Frontend: React + Vite
Base de datos: PostgreSQL o SQLite

📝 Descripción General

GYM-APP es un sistema completo para administrar las operaciones de un gimnasio, orientado al trabajo diario de recepción/caja y administración general.

Permite gestionar:

Clientes

Membresías y renovaciones

Asistencias (entradas/salidas)

Caja del día

Reportes descargables en Excel

Vencimientos próximos

Administración de usuarios del sistema (roles)

Frontend moderno hecho con React + Vite, backend seguro con Flask, y soporte para dos perfiles: admin y cajero.

🧩 Módulos del Sistema
🔹 1. Clientes

Registro de clientes

Validación y formato automático de RUT

Campos incluidos:

Nombre

Apellido

RUT

Email

Dirección

Estado laboral

Sexo

Buscador y ficha de cliente

🔹 2. Membresías

Crear nuevos planes (solo admin)

Asignar plan a un cliente

Renovar membresía

Bloqueo automático si existe membresía activa

Visualización de días restantes

🔹 3. Asistencias

Registrar entrada con un clic

Prevención de doble entrada por día

Listado de asistencias del día

Búsqueda por rango de fechas

Exportación a Excel por rango

🔹 4. Caja del Día

Resumen de ingresos registrados hoy

Totales por método:

Efectivo

Tarjeta

Transferencia

🔹 5. Reportes

Exportación de pagos a Excel por rango

Exportación de asistencias a Excel por rango

Ordenados y calculados en backend

🔹 6. Vencimientos Próximos

Clientes con membresía que vence en ≤ 3 días

Datos para seguimiento y retención

🔹 7. Administración de Usuarios

Dos perfiles principales:

🟣 Administrador

Administrar usuarios

Crear planes

Ver y descargar reportes

Acceso total

🔵 Cajero

Registrar clientes

Registrar asistencias

Registrar pagos

Ver caja del día

Acceso limitado

Control interno mediante decoradores:

@roles_required("admin")
@roles_required("admin", "cashier")

🏗️ Arquitectura del Proyecto
gym-app/
│── app/                 # Backend Flask
│   ├── __init__.py
│   ├── models.py
│   ├── routes.py
│   ├── decorators.py
│   └── utils/
│
│── gym-ui/              # Frontend React + Vite
│   ├── src/
│   ├── index.html
│   └── vite.config.js
│
│── requirements.txt
│── requirements-dev.txt
│── seed_admin.py
│── README.md

⚙️ Instalación Backend (Flask)
1. Entrar al proyecto
cd gym-app

2. Crear entorno virtual
python -m venv .venv


Activar:

Windows:

.venv\Scripts\activate


Linux/Mac:

source .venv/bin/activate

3. Instalar dependencias
pip install -r requirements.txt

4. Crear archivo .env dentro de app/
FLASK_ENV=development
SECRET_KEY=mi_clave_secreta
DATABASE_URL=sqlite:///gym.db
SESSION_COOKIE_SAMESITE=None
SESSION_COOKIE_SECURE=False

5. Crear base de datos (SQLite automático)

Opcional: eliminar DB si deseas reiniciar:

del gym.db

6. Generar usuario administrador
python seed_admin.py

7. Iniciar backend
python run.py


Backend disponible en:

👉 http://127.0.0.1:5000

🚀 Instalación Frontend (React + Vite)
1. Entrar al frontend
cd gym-ui

2. Instalar dependencias
npm install

3. Crear archivo .env
VITE_API_BASE=http://127.0.0.1:5000

4. Iniciar servidor
npm run dev


Frontend disponible en:

👉 http://127.0.0.1:5173

🔑 Usuario Inicial

Generado por seed_admin.py:

Email: admin@gym.local
Password: 123456

🛡️ Tabla de Permisos
Módulo	Admin	Cajero
Registrar clientes	✔	✔
Marcar entrada	✔	✔
Asignar/renovar membresía	✔	✔
Ver caja del día	✔	✔
Crear planes	✔	✖
Administrar usuarios	✔	✖
Exportar pagos Excel	✔	✖
Exportar asistencias Excel	✔	✔
📦 Comandos Útiles
Resetear la BD (SQLite)
del gym.db

Instalar dependencias de desarrollo
pip install -r requirements-dev.txt

Crear admin nuevamente
python seed_admin.py

🧪 Funciones destacadas

Validación chilena de RUT en tiempo real

Evita doble entrada por día

Manejo de zona horaria de Chile

Excel en tiempo real sin archivos temporales

Roles protegidos con decoradores

Frontend responsivo