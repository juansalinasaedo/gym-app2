from . import db
from sqlalchemy.orm import relationship
from sqlalchemy import CheckConstraint
from datetime import datetime

class Cliente(db.Model):
    __tablename__ = "clientes"
    cliente_id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    apellido = db.Column(db.String(100), nullable=False)
    rut = db.Column(db.String(12), unique=True, nullable=False)
    fecha_nacimiento = db.Column(db.Date)
    telefono = db.Column(db.String(20))
    email = db.Column(db.String(150), unique=True)
    direccion = db.Column(db.Text)
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)
    estado = db.Column(db.String(20), default="activo")

    membresias = relationship("ClienteMembresia", back_populates="cliente", cascade="all, delete-orphan")
    asistencias = relationship("Asistencia", back_populates="cliente", cascade="all, delete-orphan")
    pagos = relationship("Pago", back_populates="cliente", cascade="all, delete-orphan")

class Membresia(db.Model):
    __tablename__ = "membresias"
    membresia_id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    descripcion = db.Column(db.Text)
    duracion_dias = db.Column(db.Integer, nullable=False)
    precio = db.Column(db.Numeric(10, 2), nullable=False)

    clientes = relationship("ClienteMembresia", back_populates="membresia")

class ClienteMembresia(db.Model):
    __tablename__ = "cliente_membresias"
    cliente_membresia_id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey("clientes.cliente_id", ondelete="CASCADE"))
    membresia_id = db.Column(db.Integer, db.ForeignKey("membresias.membresia_id"))
    fecha_inicio = db.Column(db.Date, nullable=False)
    fecha_fin = db.Column(db.Date, nullable=False)
    estado = db.Column(db.String(20), default="activa")

    cliente = relationship("Cliente", back_populates="membresias")
    membresia = relationship("Membresia", back_populates="clientes")
    pagos = relationship("Pago", back_populates="cliente_membresia")

class Pago(db.Model):
    __tablename__ = "pagos"
    pago_id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey("clientes.cliente_id", ondelete="CASCADE"))
    cliente_membresia_id = db.Column(db.Integer, db.ForeignKey("cliente_membresias.cliente_membresia_id"))
    monto = db.Column(db.Numeric(10, 2), nullable=False)
    fecha_pago = db.Column(db.DateTime, default=datetime.utcnow)
    metodo_pago = db.Column(db.String(50))

    cliente = relationship("Cliente", back_populates="pagos")
    cliente_membresia = relationship("ClienteMembresia", back_populates="pagos")

class Asistencia(db.Model):
    __tablename__ = "asistencias"
    asistencia_id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey("clientes.cliente_id", ondelete="CASCADE"))
    fecha_hora = db.Column(db.DateTime, default=datetime.utcnow)
    tipo = db.Column(db.String(10), nullable=False)

    __table_args__ = (
        CheckConstraint("tipo IN ('entrada','salida')", name="ck_asistencias_tipo"),
    )

    cliente = relationship("Cliente", back_populates="asistencias")
