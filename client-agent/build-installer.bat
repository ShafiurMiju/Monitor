@echo off
echo ========================================
echo ODL Monitor Client - Installer Build
echo ========================================
echo.

echo Step 1: Stopping any running ODL Monitor processes...
taskkill /F /IM "ODL Monitor Client.exe" 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Cleaning old build files...
if exist dist (
    echo Removing old dist folder...
    rmdir /s /q dist 2>nul
    timeout /t 1 /nobreak >nul
)

echo Step 3: Copying production config...
copy /Y config.production.js config.js >nul
echo Production server URL configured: https://monitor-d0dx.onrender.com
echo.

echo Step 4: Building installer...
echo This may take a few minutes...
echo.
call npm run build:win

echo.
if exist dist\ODL-Monitor-Client-Setup.exe (
    echo ========================================
    echo BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo Your installer is ready at:
    echo dist\ODL-Monitor-Client-Setup.exe
    echo.
    echo This is a standard Windows installer that will:
    echo - Install the application to Program Files
    echo - Create desktop and start menu shortcuts
    echo - Allow users to uninstall from Control Panel
    echo.
    echo File size: 
    for %%A in (dist\ODL-Monitor-Client-Setup.exe) do echo %%~zA bytes
    echo.
) else (
    echo ========================================
    echo BUILD FAILED!
    echo ========================================
    echo Please check the error messages above.
    echo.
)

pause
