# 🏋️‍♂️ GYM-APP — Sistema de Gestión para Gimnasios  
Sistema profesional de administración para gimnasios: gestión de clientes, membresías, asistencias con QR, credenciales PDF, control de caja y estadísticas.  
Desarrollado en **Flask + React + PostgreSQL**, optimizado para uso real en recepción.

## 🚀 Características principales

### 🔐 Autenticación y Seguridad
- Login seguro con cookies HTTPOnly.
- Sesiones persistentes y expiración automática por inactividad.
- Middleware de protección de rutas según rol del usuario: Admin, Cajero, Lector.

## 🧍 Gestión de Clientes
- Búsqueda instantánea por nombre o RUT.
- Token QR único por cliente.
- Ficha completa del cliente.

## 🎫 Membresías / Planes
- Asignación, renovación y control de vigencia.
- Cálculo automático de días restantes.

## 🎥 Check-in rápido por QR
### ✔ Modo Manual
El lector actúa como teclado.

### ✔ Modo Cámara
- Lectura en tiempo real con html5-qrcode.
- Registro instantáneo y seguro.
- Manejo de entradas duplicadas.

## 🪪 Credencial PDF del Cliente
- Generación automática con QR.
- Diseño tipo tarjeta imprimible.

## 📊 Entradas del día
- Ordenadas cronológicamente.
- Refrescadas automáticamente tras registrar asistencia.

## 💰 Caja del día
- Control básico de ingresos del día.

## 🛠️ Tecnologías utilizadas
### Backend
Flask, SQLAlchemy, PostgreSQL, qrcode, reportlab, passlib.

### Frontend
React, Vite, TailwindCSS, html5-qrcode.

## 📁 Estructura del proyecto
gym-app/ (backend)  
gym-ui/ (frontend)

## ⚙️ Instalación local
### Backend
```
cd gym-app
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

### Frontend
```
cd gym-ui
npm install
npm run dev
```

## 🌍 Variables de entorno
Backend:
```
DATABASE_URL=
SECRET_KEY=
CORS_ORIGIN=
```

Frontend:
```
VITE_API_BASE=
```

## 🚀 Deploy en Render
- Añadir qrcode[pil] y reportlab a requirements.txt.
- Comando de inicio: `python run.py`.

## 🚀 Deploy del Frontend
- Vercel, Netlify o Render Static Site.

## 🗺️ Roadmap futuro
- App móvil
- Dashboard avanzado
- Integración de pagos
- Exportaciones masivas

## 👤 Autor
Juan Francisco Salinas Aedo  
LinkedIn: https://www.linkedin.com/in/juan-salinas-aedo-ti/
