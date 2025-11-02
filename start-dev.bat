@echo off
REM ODL Monitor - Development Environment Launcher
REM This script starts all components in development mode

echo ====================================
echo ODL Monitor - Development Mode
echo ====================================
echo.
echo Starting all components...
echo.
echo Backend: http://localhost:4000
echo Frontend: http://localhost:5173
echo.

REM Start server in a new window
echo Starting backend server...
start "ODL Monitor - Server (Dev)" cmd /k "cd /d %~dp0server && npm run dev"
timeout /t 3 /nobreak >nul

REM Start admin dashboard in a new window
echo Starting admin dashboard...
start "ODL Monitor - Admin Dashboard (Dev)" cmd /k "cd /d %~dp0admin-dashboard && npm run dev"
timeout /t 2 /nobreak >nul

REM Start client agent in a new window
echo Starting client agent...
start "ODL Monitor - Client Agent (Dev)" cmd /k "cd /d %~dp0client-agent && npm start"

echo.
echo ====================================
echo All components started!
echo ====================================
echo.
echo Check the opened windows for logs
echo Press any key to exit this window...
pause >nul
