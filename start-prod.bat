@echo off
REM ODL Monitor - Production Environment Launcher
REM This script starts all components in production mode

echo ====================================
echo ODL Monitor - Production Mode
echo ====================================
echo.
echo Starting all components...
echo.
echo Backend: https://monitor-d0dx.onrender.com
echo Frontend: https://monitor-client-gsbf.onrender.com
echo.

REM Start server in production mode
echo Starting backend server (production)...
start "ODL Monitor - Server (Prod)" cmd /k "cd /d %~dp0server && npm start"
timeout /t 3 /nobreak >nul

REM Start client agent in production mode
echo Starting client agent (production)...
start "ODL Monitor - Client Agent (Prod)" cmd /k "cd /d %~dp0client-agent && npm run start:prod"

echo.
echo ====================================
echo Components started!
echo ====================================
echo.
echo NOTE: Admin dashboard should be accessed via deployed URL
echo or built using: cd admin-dashboard ^&^& npm run build
echo.
echo Press any key to exit this window...
pause >nul
