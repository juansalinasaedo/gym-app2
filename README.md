# 🏋️‍♂️ Gym App 2 — Sistema de Gestión para Gimnasios  
Sistema completo para gestión de clientes, asistencias, planes, usuarios y flujo administrativo de gimnasios.  
Arquitectura basada en **Flask (Python)** para el backend y **React + Vite** para el frontend.

---

## 📑 **Índice**
- [Descripción General](#-descripción-general)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Arquitectura del Proyecto](#-arquitectura-del-proyecto)
- [Características Principales](#-características-principales)
- [Roles y Permisos](#-roles-y-permisos)
- [Instalación — Backend (Flask)](#-instalación--backend-flask)
- [Instalación — Frontend (React + Vite)](#-instalación--frontend-react--vite)
- [Credenciales Iniciales](#-credenciales-iniciales)
- [Despliegue en Render.com](#-despliegue-en-rendercom)
- [API — Estructura General](#-api--estructura-general)
- [Capturas (Opcional)](#-capturas-opcional)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

---

## 🚀 **Descripción General**
Este proyecto es una solución integral para administrar un gimnasio real.  
Permite manejar:

- Registro de clientes  
- Asistencias por rango de fechas  
- Venta de planes  
- Gestión de usuarios internos  
- Control de caja (rol cajero)  
- Panel administrativo (rol admin)  

Su diseño modular permite adaptarlo fácilmente a distintos gimnasios pequeños o medianos.

---

## 🛠️ **Tecnologías Utilizadas**

### **Backend (Flask)**
- Python 3.x  
- Flask  
- SQLAlchemy  
- JWT Authentication  
- SQLite / PostgreSQL  
- Flask-CORS  
- Python Dotenv  

### **Frontend (React)**
- React  
- Vite  
- Axios  
- React Router  
- Context API para autenticación  

---

## 🧱 **Arquitectura del Proyecto**

gym-app2/
│
├── gym-app/ # Backend - Flask API
│ ├── run.py
│ ├── seed_admin.py
│ ├── config/
│ ├── routes/
│ ├── models/
│ ├── controllers/
│ └── gym.db (si usas SQLite)
│
└── gym-ui/ # Frontend - React + Vite
├── src/
├── public/
├── vite.config.js
└── index.html


---

## ⭐ **Características Principales**
- 🔐 **Autenticación con JWT**
- 👥 **Roles y permisos**
- 📅 Registro de asistencias
- 🧾 Gestión de planes
- 🗄 Gestion de usuarios internos
- 📲 Interfaz moderna con React
- 📦 API modular y escalable

---

## 🧩 **Roles y Permisos**

| Módulo                         | Admin | Cajero |
|-------------------------------|:-----:|:------:|
| Ver/editar clientes           | ✔️    | ✔️     |
| Registrar asistencias        | ✔️    | ✔️     |
| Ver reportes                 | ✔️    | ✔️     |
| Administrar usuarios internos | ✔️    | ❌     |
| Crear/editar planes           | ✔️    | ❌     |
| Configuraciones avanzadas     | ✔️    | ❌     |

En el backend, esto se controla mediante decoradores como:

```python
@roles_required("admin")
@roles_required("admin", "cashier")

En el frontend, mediante lógica:

{user.role === "admin" && <AdminMenu />}


⚙️ Instalación — Backend (Flask)
1. Entrar al directorio

cd gym-app

2. Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

3. Instalar dependencias
pip install -r requirements.txt

4. Configurar variables de entorno

Crear archivo .env:

SECRET_KEY=superclave123
FLASK_ENV=development
DATABASE_URL=sqlite:///gym.db

5. Inicializar data y usuario admin
python seed_admin.py

6. Ejecutar backend
python run.py


API quedará disponible en:
👉 http://localhost:5000

💻 Instalación — Frontend (React + Vite)
1. Entrar al directorio
cd gym-ui

2. Instalar dependencias
npm install

3. Configurar .env

Crear archivo:

VITE_API_BASE=http://localhost:5000

4. Ejecutar desarrollo
npm run dev


Frontend disponible en:
👉 http://localhost:5173

🔑 Credenciales Iniciales

El script seed_admin.py crea:

Usuario admin:

Correo: admin@gym.local

Contraseña: 123456

Se recomienda cambiar la clave en producción.

🌐 Despliegue en Render.com
🔷 Backend (Flask)

Crear Web Service → conectar repo

Directorio raíz: gym-app

Build command:

pip install -r requirements.txt


Start command:

python run.py


Variables de entorno:

FLASK_ENV=production
SECRET_KEY=clave_super_segura
DATABASE_URL=postgresql://... (Render te la entrega)

🔷 Frontend (React)

Crear Static Site

Directorio raíz: gym-ui

Build command:

npm install && npm run build


Publish directory:

dist


Variables:

VITE_API_BASE=https://tu-backend.onrender.com

🔌 API — Estructura General

Ejemplos de endpoints:

🔐 Autenticación
POST /auth/login

👤 Usuarios
GET /users/
POST /users/

🏋️‍♂️ Clientes
GET /clients/
POST /clients/
PUT /clients/{id}

🗓 Asistencias
POST /assists/range
GET /assists/{user_id}

🖼 Capturas (Opcional)

Puedes agregar capturas en:

gym-ui/public/screenshots/


Luego integrarlas así:

![Dashboard](./public/screenshots/dashboard.png)

🤝 Contribuir

Si deseas contribuir:

Fork

Crear branch:

git checkout -b feature/nueva-funcion


Commit

Pull Request

📄 Licencia

Este proyecto es de uso libre para personalizar y desplegar en gimnasios propios.

MIT License
Copyright (c) 2025
