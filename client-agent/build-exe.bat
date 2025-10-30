@echo off
echo ========================================
echo ODL Monitor Client - Portable EXE Build
echo ========================================
echo.

echo Step 1: Stopping any running ODL Monitor processes...
taskkill /F /IM "ODL Monitor Client.exe" 2>nul
taskkill /F /IM "ODL-Monitor-Client.exe" 2>nul
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

echo Step 4: Building portable executable...
echo This may take a few minutes...
echo.
call node_modules\.bin\electron-builder.cmd --win --x64

echo.
if exist dist\ODL-Monitor-Client.exe (
    echo ========================================
    echo BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo Your portable executable is ready at:
    echo dist\ODL-Monitor-Client.exe
    echo.
    echo This is a single executable file that:
    echo - Requires NO installation
    echo - Can run from any folder
    echo - Stores data in AppData when run
    echo.
    for %%A in (dist\ODL-Monitor-Client.exe) do echo File size: %%~zA bytes ^(~%%~zAMB^)
    echo.
    echo Simply distribute this single .exe file to users!
    echo.
) else (
    echo ========================================
    echo BUILD FAILED!
    echo ========================================
    echo Please check the error messages above.
    echo.
)

pause
