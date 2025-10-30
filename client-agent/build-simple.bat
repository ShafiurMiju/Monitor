@echo off
echo ========================================
echo ODL Monitor Client - Production Build
echo ========================================
echo.
echo Building for production server...
echo Backend: https://monitor-d0dx.onrender.com
echo Frontend: https://monitor-client-gsbf.onrender.com
echo.

echo Step 1: Applying production config...
copy /Y config.production.js config.js >nul
if errorlevel 1 (
    echo Failed to copy production config!
    pause
    exit /b 1
)
echo Production config applied.
echo.

echo Step 2: Cleaning old builds...
if exist dist rmdir /s /q dist
if exist dist-portable mkdir dist-portable
echo.

echo Step 3: Building application (this takes 2-3 minutes)...
set CSC_IDENTITY_AUTO_DISCOVERY=false
node node_modules/electron-builder/out/cli/cli.js --win --x64 --dir

echo.
echo Step 4: Checking build output...
if exist "dist\win-unpacked\ODL Monitor Client.exe" (
    echo ========================================
    echo BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo Your application is ready at:
    echo dist\win-unpacked\
    echo.
    echo Main executable:
    echo dist\win-unpacked\ODL Monitor Client.exe
    echo.
    echo To distribute:
    echo 1. Compress the entire 'win-unpacked' folder as a ZIP file
    echo 2. Users extract and run "ODL Monitor Client.exe"
    echo.
    echo Server configuration:
    echo - Backend: https://monitor-d0dx.onrender.com
    echo - Dashboard: https://monitor-client-gsbf.onrender.com
    echo.
) else (
    echo ========================================
    echo BUILD FAILED!
    echo ========================================
    echo Check the errors above.
)

pause
