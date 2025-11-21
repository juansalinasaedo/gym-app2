@echo off
chcp 65001 >nul
title GYM-APP - SETUP (instalación inicial)

echo ===========================================
echo   INSTALANDO DEPENDENCIAS GYM APP
echo   Ruta base: C:\Codigos Varios\gym-app
echo ===========================================
echo.

set "ROOT=C:\Codigos Varios\gym-app"
set "VENV_DIR=%ROOT%\.venv"
set "BACKEND=%ROOT%\gym-app"
set "FRONTEND=%ROOT%\gym-ui"

:: 1) Crear entorno virtual si no existe
cd /d "%ROOT%"
if not exist "%VENV_DIR%" (
    echo [SETUP] Creando entorno virtual .venv ...
    python -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo [ERROR] No se pudo crear el entorno virtual.
        pause
        exit /b
    )
) else (
    echo [SETUP] Entorno virtual .venv ya existe.
)

:: 2) Activar venv e instalar requirements
echo.
echo [SETUP] Instalando dependencias de backend...
call "%VENV_DIR%\Scripts\activate"

if exist "%ROOT%\requirements.txt" (
    pip install -r "%ROOT%\requirements.txt"
) else (
    echo [WARN] No se encontro requirements.txt en %ROOT%
)

:: 3) Instalar dependencias de frontend
echo.
echo [SETUP] Instalando dependencias de frontend (npm install)...
cd /d "%FRONTEND%"
npm install

echo.
echo ===========================================
echo   SETUP COMPLETADO
echo   Ya puedes usar RUN_GYM_APP.bat
echo ===========================================
pause
