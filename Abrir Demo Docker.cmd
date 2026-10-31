@echo off
cd /d "%~dp0"
docker desktop start --timeout 50
if errorlevel 1 goto error
docker compose -f compose.demo.yaml up -d --wait --wait-timeout 120
if errorlevel 1 goto error
start "" "http://127.0.0.1:5197/app/inicio"
exit /b 0
:error
echo.
echo No se pudo iniciar la demo. Conserva este mensaje para revisar el problema.
echo Si el puerto esta ocupado, cierra las terminales antiguas de la demo.
pause
exit /b 1
