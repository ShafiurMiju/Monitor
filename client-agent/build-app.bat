@echo off
echo ========================================
echo ODL Monitor Client - Build Script
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

if exist dist-new (
    echo Removing dist-new folder...
    rmdir /s /q dist-new 2>nul
    timeout /t 1 /nobreak >nul
)

echo Step 3: Building application...
echo This may take a few minutes...
echo.
node_modules\.bin\electron-builder --win --x64 --dir

echo.
if exist dist\win-unpacked\*.exe (
    echo ========================================
    echo BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo Your application is ready in:
    echo dist\win-unpacked\ODL Monitor Client.exe
    echo.
    echo You can now run the application or distribute the entire
    echo dist\win-unpacked folder.
    echo.
) else (
    echo ========================================
    echo BUILD FAILED!
    echo ========================================
    echo Please check the error messages above.
    echo.
)

pause
