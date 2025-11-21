@echo off
chcp 65001 >nul
title GYM-APP - RUN

echo ===========================================
echo   INICIANDO SISTEMA GYM APP (LOCAL)
echo   Ruta base: C:\Codigos Varios\gym-app
echo ===========================================
echo.

:: Verificar que exista el Python del venv
if not exist "C:\Codigos Varios\gym-app\.venv\Scripts\python.exe" (
    echo [ERROR] No se encontro el entorno virtual.
    echo Ejecuta primero SETUP_GYM_APP.bat en:
    echo   C:\Codigos Varios\gym-app
    pause
    exit /b
)

echo [OK] Entorno virtual encontrado.
echo.

echo [RUN] Iniciando backend...
start "" "C:\Codigos Varios\gym-app\run_backend.bat"

echo [RUN] Iniciando frontend...
start "" "C:\Codigos Varios\gym-app\run_frontend.bat"



echo.
echo Si algo falla, revisa las ventanas:
echo  - GYM-APP BACKEND
echo  - GYM-APP FRONTEND
exit