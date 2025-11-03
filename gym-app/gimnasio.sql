-- =============================================
-- Script de creación de base de datos: GIMNASIO
-- =============================================

-- Tabla de clientes
CREATE TABLE clientes (
    cliente_id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    rut VARCHAR(12) UNIQUE NOT NULL,
    fecha_nacimiento DATE,
    telefono VARCHAR(20),
    email VARCHAR(150) UNIQUE,
    direccion TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'activo'
);

-- Tabla de tipos de membresías
CREATE TABLE membresias (
    membresia_id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    duracion_dias INT NOT NULL,
    precio NUMERIC(10,2) NOT NULL
);

-- Relación cliente ↔ membresía
CREATE TABLE cliente_membresias (
    cliente_membresia_id SERIAL PRIMARY KEY,
    cliente_id INT REFERENCES clientes(cliente_id) ON DELETE CASCADE,
    membresia_id INT REFERENCES membresias(membresia_id),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'activa'
);

-- Tabla de pagos
CREATE TABLE pagos (
    pago_id SERIAL PRIMARY KEY,
    cliente_id INT REFERENCES clientes(cliente_id) ON DELETE CASCADE,
    cliente_membresia_id INT REFERENCES cliente_membresias(cliente_membresia_id),
    monto NUMERIC(10,2) NOT NULL,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metodo_pago VARCHAR(50)
);

-- Control de asistencias
CREATE TABLE asistencias (
    asistencia_id SERIAL PRIMARY KEY,
    cliente_id INT REFERENCES clientes(cliente_id) ON DELETE CASCADE,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tipo VARCHAR(10) CHECK (tipo IN ('entrada','salida'))
);

-- Tabla de empleados
CREATE TABLE empleados (
    empleado_id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    contrasena VARCHAR(200) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin','recepcionista','entrenador'))
);
