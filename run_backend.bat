@echo off
chcp 65001 >nul
title GYM-APP BACKEND

echo [BACKEND] Cambiando a carpeta del backend...
cd /d "C:\Codigos Varios\gym-app\gym-app"

echo [BACKEND] Ejecutando Flask con el Python del entorno virtual...
"C:\Codigos Varios\gym-app\.venv\Scripts\python.exe" run.py

echo.
echo [BACKEND] Proceso finalizado. Presiona una tecla para cerrar.
pause
