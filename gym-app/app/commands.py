# app/commands.py
from __future__ import annotations

import secrets
import click

from .models import User, RoleEnum


def register_commands(app):
    @app.cli.command("create-admin")
    @click.option("--email", prompt=True, help="Email del usuario admin")
    @click.option("--name", prompt=True, help="Nombre (name) del usuario admin")
    @click.option(
        "--password",
        prompt=True,
        hide_input=True,
        confirmation_prompt=True,
        required=False,
        help="Contraseña (si no usas --random)",
    )
    @click.option(
        "--random",
        "random_password",
        is_flag=True,
        help="Genera una contraseña aleatoria segura y la imprime",
    )
    def create_admin(email: str, name: str, password: str | None, random_password: bool):
        # 🔑 import tardío para evitar import circular
        from . import db

        email = (email or "").strip().lower()
        name = (name or "").strip()

        if not email or "@" not in email:
            raise click.ClickException("Email inválido.")
        if not name:
            raise click.ClickException("Nombre inválido.")

        if User.query.filter_by(email=email).first():
            raise click.ClickException(f"Ya existe un usuario con email: {email}")

        if random_password:
            password = secrets.token_urlsafe(16)
            click.echo(f"[OK] Password generado: {password}")
        else:
            if not password:
                raise click.ClickException("Debes indicar --password o usar --random.")
            if len(password) < 10:
                raise
