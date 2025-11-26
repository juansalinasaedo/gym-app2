# 🏋️‍♂️ GYM-APP — Sistema de Gestión para Gimnasios

Sistema web completo para administración de clientes, membresías, pagos, accesos diarios y control de planes, desarrollado en **React + Flask + PostgreSQL**.  
Diseñado para gimnasios reales, con un flujo rápido, seguro y pensado para uso diario por administradores y cajeros.

## 🚀 Características principales

### 🔐 Autenticación y Seguridad
- Login con cookies HTTPOnly (seguro contra XSS / CSRF).
- Expiración automática de sesión por inactividad.
- Rutas protegidas según rol del usuario (admin, cajero, lector).

### 🧍 Gestión de Clientes
- Búsqueda rápida por nombre o RUT.
- Registro de nuevos clientes.
- Ficha detallada con datos personales.

### 🎫 Gestión de Membresías
- Asignación de nuevos planes.
- Renovaciones y cobro integrado.
- Bloqueo automático si el cliente tiene un plan activo.
- Días restantes visibles.

### 💰 Pagos y Movimientos
- Ingresos del día.
- Histórico de membresías pagadas.
- Métodos de pago (efectivo, transferencia, etc.).

### 📊 Dashboard
- Entradas del día.
- Ingresos del día.
- Clientes activos.
- Membresías próximas a vencer.
- Botón de Recargar para actualizar datos instantáneamente.

## 🛠️ Tecnologías utilizadas

### Frontend
- React 18
- Vite
- TailwindCSS
- React Router DOM
- Context API
- Fetch API
- React Icons

### Backend
- Python 3
- Flask
- PostgreSQL
- SQLAlchemy
- CORS
- Sesiones seguras

## 📁 Estructura del Proyecto

### Frontend
```
gym-ui/
 ├─ src/
 │   ├─ api/
 │   ├─ components/
 │   ├─ context/
 │   ├─ pages/
 │   ├─ hooks/
 │   └─ main.jsx
 ├─ public/
 ├─ .env.local
 └─ vite.config.js
```

### Backend
```
gym-api/
 ├─ app/
 │   ├─ auth.py
 │   ├─ routes.py
 │   ├─ models/
 │   ├─ database.py
 │   └─ utils/
 ├─ app.py
 ├─ requirements.txt
 └─ build.sh
```

## ⚙️ Instalación

### Backend
```
cd gym-api
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate   # Windows
pip install -r requirements.txt
python app.py
```

### Frontend
```
cd gym-ui
npm install
npm run dev
```

## 🌍 Variables de entorno

### Frontend
```
VITE_API_BASE=http://127.0.0.1:5000
```

### Backend
```
DATABASE_URL=postgresql://usuario:password@localhost:5432/gym
SECRET_KEY=clave_segura
CORS_ORIGIN=http://127.0.0.1:5173
```

## 🚀 Despliegue en Render

- Backend usando build.sh + gunicorn  
- Configurar variables de entorno  
- Frontend en Vercel o Netlify  

## 🗺️ Roadmap

- Reportes PDF / Excel  
- Control de asistencia avanzada  
- Pagos en línea (WebPay / MercadoPago)  
- Notificaciones por correo  
- App móvil  

## 👤 Autor
**Juan Francisco Salinas Aedo**  
Ingeniero Informático  
LinkedIn: https://www.linkedin.com/in/juan-salinas-aedo-ti/

## 📄 Licencia
MIT License
