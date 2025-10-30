@echo off
echo ===============================================
echo ODL Monitor - Update Server URL
echo ===============================================
echo.

set /p SERVER_URL="https://monitor-pi-three.vercel.app"

if "%SERVER_URL%"=="" (
    echo Error: Server URL cannot be empty
    pause
    exit /b 1
)

echo.
echo Creating config.js with SERVER_URL: %SERVER_URL%
echo.

(
echo // client-agent/config.js
echo module.exports = {
echo   SERVER_URL: '%SERVER_URL%'
echo };
) > config.js

if exist config.js (
    echo Success! config.js has been updated.
    echo.
    echo Now you can build the application by running:
    echo npm run build:win
    echo.
    echo Note: You need to run Command Prompt as Administrator to build successfully.
) else (
    echo Error: Failed to create config.js
)

echo.
pause
