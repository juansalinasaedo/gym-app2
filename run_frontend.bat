@echo off
chcp 65001 >nul
title GYM-APP FRONTEND

echo [FRONTEND] Cambiando a carpeta del frontend...
cd /d "C:\Codigos Varios\gym-app\gym-ui"

echo [FRONTEND] Ejecutando npm run dev...
npm run dev

echo.
echo [FRONTEND] Proceso finalizado. Presiona una tecla para cerrar.
pause
