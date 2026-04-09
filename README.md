# 🏋️ Gym App 2 — Sistema de Gestión de Gimnasio

![Python](https://img.shields.io/badge/Python-3.x-blue)
![Flask](https://img.shields.io/badge/Flask-Backend-black)
![React](https://img.shields.io/badge/React-Frontend-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)
![Status](https://img.shields.io/badge/Status-En%20desarrollo-yellow)

---

## 📌 Descripción

**Gym App 2** es una aplicación web full-stack orientada a la gestión operativa de un gimnasio, diseñada para uso real en recepción.

Permite controlar clientes, membresías, pagos, asistencias (QR y reconocimiento facial), caja diaria y dashboard analítico.

---

## 🚀 Demo (Arquitectura)

```text
Frontend (React + Vite)  →  Backend (Flask API)  →  Base de Datos (PostgreSQL / SQLite)
```

---

## 🧩 Funcionalidades principales

### 👤 Clientes
- Registro y edición
- Búsqueda rápida
- Identificación por RUT
- Generación de QR único

### 📅 Membresías
- Asignación de planes
- Renovación automática
- Control de vigencia
- Alertas de vencimiento

### ✅ Asistencias
- Registro manual
- Check-in con QR
- Reconocimiento facial
- Prevención de duplicados

### 💰 Pagos y Caja
- Registro de pagos
- Métodos: efectivo / transferencia / tarjeta
- Cierre de caja diario
- Resumen financiero

### 📊 Dashboard
- Ingresos del día
- Asistencias del día
- Tendencias por hora/día
- Top clientes
- Membresías próximas a vencer

### 📄 Reportes
- Exportación a Excel
- Generación de credenciales PDF con QR

---

## 🏗️ Arquitectura del Proyecto

```text
gym-app2/
├── gym-app/              # Backend Flask
│   ├── app/
│   │   ├── models.py
│   │   ├── routes.py
│   │   ├── routes_dashboard.py
│   │   ├── routes_pagos.py
│   │   ├── routes_caja.py
│   │   └── routes_face.py
│   └── run.py
├── gym-ui/               # Frontend React + Vite
├── requirements.txt
├── run_backend.bat
├── run_frontend.bat
└── README.md
```

---

## ⚙️ Stack Tecnológico

### Backend
- Flask
- SQLAlchemy
- PostgreSQL / SQLite
- OpenPyXL
- ReportLab
- qrcode
- OpenCV (headless)
- InsightFace / ONNX
- NumPy

### Frontend
- React 19
- Vite
- React Router
- Recharts
- Axios

---

## 🔐 Configuración (.env)

### Backend
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
SECRET_KEY=clave_secreta
ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend
```env
VITE_API_BASE=http://localhost:5000
```

---

## ▶️ Instalación y ejecución

### 1. Clonar repo
```bash
git clone https://github.com/juansalinasaedo/gym-app2.git
cd gym-app2
```

---

### 2. Backend

```bash
cd gym-app
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r ..\requirements.txt
python run.py
```

---

### 3. Frontend

```bash
cd gym-ui
npm install
npm run dev
```

---

## 🖥️ Scripts incluidos

- `CORRER_GYM_APP.bat` → levanta todo
- `SETUP_GYM_APP.bat` → instala dependencias
- `run_backend.bat`
- `run_frontend.bat`

---

## 🌐 Despliegue

### Frontend (GitHub Pages)
```bash
npm run build
npm run deploy
```

### Backend
Recomendado:
- Render
- Railway
- VPS con Gunicorn

---

## 🧠 Buenas prácticas aplicadas

- Arquitectura modular (blueprints)
- Separación frontend/backend
- Variables de entorno
- API REST estructurada
- Manejo de zona horaria (America/Santiago)

---

## 🚧 Roadmap

- [ ] Migraciones con Flask-Migrate
- [ ] Roles avanzados
- [ ] Logs centralizados
- [ ] Tests automatizados
- [ ] Dockerización
- [ ] CI/CD
- [ ] Deploy productivo completo

---

## 👨‍💻 Autor

**Juan Francisco Salinas Aedo**  
Ingeniero Informático  

🔗 https://github.com/juansalinasaedo

---

## ⭐ Nota

Este proyecto está en evolución constante y enfocado en uso real.  
Se recomienda para aprendizaje avanzado de desarrollo full-stack con Python + React.

