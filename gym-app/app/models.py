from . import db
from sqlalchemy.orm import relationship
from sqlalchemy import CheckConstraint
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Numeric, ForeignKey
from datetime import datetime, timezone, timedelta
from passlib.hash import pbkdf2_sha256 as password_hasher
from enum import Enum
import secrets  # ya lo tenías importado

# ========= Zona horaria Chile con fallbacks =========
def get_chile_tz():
    # 1) Preferir zoneinfo (requiere tzdata en Windows)
    try:
        from zoneinfo import ZoneInfo  # type: ignore
        return ZoneInfo("America/Santiago")
    except Exception:
        pass
    # 2) Si existe pytz, usarlo
    try:
        import pytz  # type: ignore
        return pytz.timezone("America/Santiago")
    except Exception:
        pass
    # 3) Último recurso: offset fijo -03:00 (sin DST)
    return timezone(timedelta(hours=-3))

CHILE_TZ = get_chile_tz()


def ahora_chile():
    """
    Retorna la hora local de Chile como datetime naive (sin tzinfo),
    para guardar igual que antes pero con la hora correcta.
    """
    return datetime.now(CHILE_TZ).replace(tzinfo=None)


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
    fecha_registro = db.Column(db.DateTime, default=ahora_chile)
    estado = db.Column(db.String(20), default="activo")
    # NUEVO: información adicional
    estado_laboral = Column(String(40))        # p.ej.: "Dependiente", "Independiente", "Cesante", etc.
    sexo = Column(String(1))                   # 'M', 'F' u 'O'

    # NUEVO: token único para QR de asistencia
    qr_token = db.Column(db.String(64), unique=True, nullable=False, default="")

    membresias = relationship(
        "ClienteMembresia", back_populates="cliente", cascade="all, delete-orphan"
    )
    asistencias = relationship(
        "Asistencia", back_populates="cliente", cascade="all, delete-orphan"
    )
    pagos = relationship(
        "Pago", back_populates="cliente", cascade="all, delete-orphan"
    )

    # NUEVO: helper para garantizar que siempre tenga un token QR
    def ensure_qr_token(self):
        if not self.qr_token:
            # token_urlsafe genera algo tipo 'xYzAbC...'
            self.qr_token = secrets.token_urlsafe(16)


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
    cliente_id = db.Column(
        db.Integer, db.ForeignKey("clientes.cliente_id", ondelete="CASCADE")
    )
    membresia_id = db.Column(
        db.Integer, db.ForeignKey("membresias.membresia_id")
    )
    fecha_inicio = db.Column(db.Date, nullable=False)
    fecha_fin = db.Column(db.Date, nullable=False)
    estado = db.Column(db.String(20), default="activa")

    cliente = relationship("Cliente", back_populates="membresias")
    membresia = relationship("Membresia", back_populates="clientes")
    pagos = relationship("Pago", back_populates="cliente_membresia")


class Pago(db.Model):
    __tablename__ = "pagos"
    pago_id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(
        db.Integer, db.ForeignKey("clientes.cliente_id", ondelete="CASCADE")
    )
    cliente_membresia_id = db.Column(
        db.Integer, db.ForeignKey("cliente_membresias.cliente_membresia_id")
    )
    monto = db.Column(db.Numeric(10, 2), nullable=False)
    fecha_pago = db.Column(db.DateTime, default=ahora_chile)
    metodo_pago = db.Column(db.String(50))

    cliente = relationship("Cliente", back_populates="pagos")
    cliente_membresia = relationship("ClienteMembresia", back_populates="pagos")


class Asistencia(db.Model):
    __tablename__ = "asistencias"
    asistencia_id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(
        db.Integer, db.ForeignKey("clientes.cliente_id", ondelete="CASCADE")
    )
    fecha_hora = db.Column(db.DateTime, default=ahora_chile)

    # AJUSTE: default="entrada" para no romper cuando no se pasa el tipo explícito
    tipo = db.Column(db.String(10), nullable=False, default="entrada")

    __table_args__ = (
        CheckConstraint("tipo IN ('entrada','salida')", name="ck_asistencias_tipo"),
    )

    cliente = relationship("Cliente", back_populates="asistencias")


class RoleEnum(str, Enum):
    admin = "admin"
    cashier = "cashier"


class User(db.Model):
    __tablename__ = "users"
    user_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(160), unique=True, index=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="cashier")  # 'admin' / 'cashier'
    enabled = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, raw: str):
        self.password_hash = password_hasher.hash(raw)

    def check_password(self, raw: str) -> bool:
        try:
            return password_hasher.verify(raw, self.password_hash)
        except ValueError:
            # Hash inválido o en formato antiguo → lo tratamos como clave incorrecta
            return False
    

class CierreCaja(db.Model):
    __tablename__ = "cierres_caja"

    cierre_id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.Date, nullable=False, index=True)  # fecha del cierre
    usuario_id = db.Column(
        db.Integer, db.ForeignKey("users.user_id", ondelete="SET NULL")
    )
    # Totales según sistema (lo que calcula /pagos/hoy)
    total_sistema_general = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    total_sistema_efectivo = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    total_sistema_tarjeta = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    total_sistema_transferencia = db.Column(db.Numeric(10, 2), nullable=False, default=0)

    # Lo que declara el cajero contando caja
    total_declarado_efectivo = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    total_declarado_tarjeta = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    total_declarado_transferencia = db.Column(db.Numeric(10, 2), nullable=False, default=0)

    # Diferencias (para auditoría rápida)
    diferencia_efectivo = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    diferencia_tarjeta = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    diferencia_transferencia = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    diferencia_total = db.Column(db.Numeric(10, 2), nullable=False, default=0)

    observaciones = db.Column(db.Text)
    creado_en = db.Column(db.DateTime, default=ahora_chile)

    usuario = relationship("User")
