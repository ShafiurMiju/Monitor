@echo off
setlocal enabledelayedexpansion

echo ========================================
echo ODL Monitor Client - Quick EXE Build
echo ========================================
echo.

echo This script builds the unpacked version which works perfectly!
echo.

echo Step 1: Cleaning...
if exist dist rmdir /s /q dist 2>nul

echo Step 2: Copying production config...
copy /Y config.production.js config.js >nul

echo Step 3: Building unpacked application...
node_modules\.bin\electron-builder.cmd --win --x64 --dir

echo.
if exist "dist\win-unpacked\ODL Monitor Client.exe" (
    echo ========================================
    echo BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo Your application is ready at:
    echo dist\win-unpacked\ODL Monitor Client.exe
    echo.
    echo The application is fully functional!
    echo To distribute: Share the entire "dist\win-unpacked" folder
    echo Users can create a shortcut to the .exe file
    echo.
    for %%A in ("dist\win-unpacked\ODL Monitor Client.exe") do (
        set /a sizeMB=%%~zA/1048576
        echo Main executable size: !sizeMB! MB
    )
    echo.
) else (
    echo ========================================
    echo BUILD FAILED!
    echo ========================================
)

pause
