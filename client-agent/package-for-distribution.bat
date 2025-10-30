@echo off
echo ========================================
echo Creating Distributable Package
echo ========================================
echo.

cd "dist\win-unpacked"

echo Creating ZIP archive...
powershell -Command "Compress-Archive -Path '.\*' -DestinationPath '..\ODL-Monitor-Client-Windows.zip' -Force"

cd ..\..

if exist "dist\ODL-Monitor-Client-Windows.zip" (
    echo.
    echo ========================================
    echo PACKAGE CREATED SUCCESSFULLY!
    echo ========================================
    echo.
    echo File: dist\ODL-Monitor-Client-Windows.zip
    echo.
    for %%A in ("dist\ODL-Monitor-Client-Windows.zip") do (
        set /a sizeMB=%%~zA/1048576
        echo Size: %%~zA bytes (~%sizeMB% MB)
    )
    echo.
    echo Distribution Instructions:
    echo 1. Share the ODL-Monitor-Client-Windows.zip file
    echo 2. Users extract it to any folder
    echo 3. Run "ODL Monitor Client.exe"
    echo.
) else (
    echo Failed to create package!
)

pause
