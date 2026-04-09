# 🏋️ Gym App 2

Aplicación web full-stack para la gestión operativa de un gimnasio, construida con **Flask + React + PostgreSQL/SQLite**, orientada a trabajo real en recepción, control de clientes, membresías, pagos y asistencias.

## Estado actual del proyecto

El repositorio contiene dos aplicaciones principales:

- `gym-app/` → backend en Flask
- `gym-ui/` → frontend en React + Vite

Además, incluye scripts auxiliares para correr el backend y el frontend en Windows, archivos de requerimientos y utilidades de setup para entorno local.

## Funcionalidades principales

### Gestión de clientes
- Registro y consulta de clientes
- Búsqueda rápida
- Ficha individual
- Identificación por RUT
- Token QR por cliente

### Membresías
- Asignación de planes
- Renovación de membresías
- Control de vigencia
- Seguimiento de vencimientos próximos

### Asistencias
- Registro manual de entradas
- Check-in por código QR
- Confirmación y registro de asistencia facial
- Prevención de duplicados en entradas del mismo día

### Pagos y caja
- Registro de pagos
- Resumen diario
- Control de caja
- Cierre de caja

### Dashboard
- Resumen general
- Entradas del día
- Ingresos del día
- Membresías por vencer
- Tendencias por día, hora y top de clientes

### Reportes y documentos
- Exportación a Excel
- Generación de credenciales PDF con QR

## Arquitectura

```text
gym-app2/
├── gym-app/              # Backend Flask
│   ├── app/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── models.py
│   │   ├── routes.py
│   │   ├── routes_dashboard.py
│   │   ├── routes_pagos.py
│   │   ├── routes_caja.py
│   │   └── routes_face.py
│   └── run.py
├── gym-ui/               # Frontend React + Vite
│   ├── src/
│   └── package.json
├── requirements.txt
├── requirements_base.txt
├── run_backend.bat
├── run_frontend.bat
├── CORRER_GYM_APP.bat
└── SETUP_GYM_APP.bat
```

## Stack tecnológico

### Backend
- Python 3
- Flask
- Flask-CORS
- Flask-SQLAlchemy / SQLAlchemy
- PostgreSQL
- SQLite como fallback local
- OpenPyXL
- ReportLab
- qrcode
- Pillow
- OpenCV Headless
- ONNX Runtime
- InsightFace
- NumPy

### Frontend
- React 19
- Vite
- React Router
- Axios
- Recharts
- html5-qrcode

## Autenticación y seguridad

El backend usa sesiones con cookies y soporte de CORS con credenciales.  
La configuración contempla:

- `SECRET_KEY`
- expiración de sesión
- cookies `SameSite` y `Secure` según entorno
- lista de orígenes permitidos mediante `ALLOWED_ORIGINS`

## Variables de entorno

### Backend (`gym-app/.env`)
```env
DATABASE_URL=postgresql://usuario:password@host:5432/base
SECRET_KEY=tu_clave_secreta
ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
FLASK_ENV=development
RENDER=false
```

> Si `DATABASE_URL` no está definida, el backend usa `sqlite:///gym.db` como base local por defecto.

### Frontend (`gym-ui/.env`)
```env
VITE_API_BASE=http://127.0.0.1:5000
```

## Ejecución local

### 1) Clonar el repositorio
```bash
git clone https://github.com/juansalinasaedo/gym-app2.git
cd gym-app2
```

### 2) Levantar el backend
```bash
cd gym-app
python -m venv .venv
```

#### En Windows
```bash
.venv\Scripts\activate
```

#### En Linux/macOS
```bash
source .venv/bin/activate
```

Luego instala dependencias y ejecuta:

```bash
pip install -r ..\requirements.txt
python run.py
```

> Según la estructura actual del repo, `run.py` crea la app Flask mediante `create_app()` y la ejecuta directamente.

### 3) Levantar el frontend
En otra terminal:

```bash
cd gym-ui
npm install
npm run dev
```

## Scripts útiles en Windows

El repositorio incluye scripts `.bat` para facilitar el arranque:

- `run_backend.bat`
- `run_frontend.bat`
- `CORRER_GYM_APP.bat`
- `SETUP_GYM_APP.bat`

Esto permite dejar una ejecución más simple en entornos Windows sin escribir comandos cada vez.

## Endpoints destacados

### Dashboard
- `GET /api/dashboard/resumen`
- `GET /api/dashboard/vencimientos`
- `GET /api/dashboard/asistencia/dias`
- `GET /api/dashboard/asistencia/horas`
- `GET /api/dashboard/asistencia/top-clientes`

### Reconocimiento facial
- `POST /api/face/enroll`
- `POST /api/face/identify`
- `POST /api/asistencias/face/confirm`

## Despliegue

### Backend
Se puede desplegar en servicios como Render usando variables de entorno y un motor PostgreSQL externo.

### Frontend
El frontend ya incluye scripts para build y deploy estático, además de configuración `homepage` para GitHub Pages.

```bash
npm run build
npm run deploy
```

## Recomendaciones técnicas para la siguiente etapa

- mover la creación automática de tablas a migraciones con Flask-Migrate
- separar requerimientos por entorno (`base`, `dev`, `prod`)
- agregar `.env.example`
- documentar endpoints completos
- incorporar pruebas automáticas
- ajustar README con capturas de pantalla
- definir flujo de despliegue productivo backend/frontend
- revisar compatibilidad de Node con Vite y React Router usados

## Roadmap sugerido

- mejora del módulo de caja
- dashboard administrativo más completo
- reportes avanzados
- control por roles más fino
- consolidación del reconocimiento facial
- empaquetado para instalación local
- despliegue estable en nube

## Autor

**Juan Francisco Salinas Aedo**  
Ingeniero Informático  
GitHub: https://github.com/juansalinasaedo  
Repositorio: https://github.com/juansalinasaedo/gym-app2
