# 🏋️ Gym App — Sistema de Gestión de Gimnasio

Aplicación web full-stack para la gestión integral de un gimnasio:

- 👥 Clientes
- 💳 Membresías
- 💰 Pagos
- 📊 Dashboard
- 📷 Check-in por QR y reconocimiento facial
- 📄 Exportación de reportes (Excel)

Proyecto desarrollado con arquitectura moderna utilizando **Flask + React + PostgreSQL**.

---

## 🚀 Demo / Estado

🟢 Proyecto en desarrollo activo  
🧪 Entorno local funcional (Backend + Frontend)

---

## 🧠 Arquitectura

Frontend (React + Vite)
│
├── API REST (Flask)
│   ├── Auth (session-based)
│   ├── Clientes
│   ├── Membresías
│   ├── Pagos
│   ├── Asistencias
│   ├── Face Recognition
│   └── Reportes Excel
│
└── PostgreSQL (DB)

---

## 🛠️ Tecnologías

### Backend
- Python 3.x
- Flask
- SQLAlchemy
- PostgreSQL
- OpenPyXL (exportación Excel)
- ReportLab (credenciales PDF)

### Frontend
- React + Vite
- Tailwind CSS

---

## 🔐 Autenticación

- Basada en sesión (Flask session)
- Timeout por inactividad configurable (1 hora)
- Roles: admin, cashier

---

## ⚙️ Instalación

### Backend
```
cd gym-app
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
flask run
```

### Frontend
```
cd gym-ui
npm install
npm run dev
```

---

## 📄 Autor

Juan Francisco Salinas Aedo
