@echo off
echo ==========================================
echo ODL Monitor Client - Complete Build
echo ==========================================
echo.
echo Backend:  https://monitor-d0dx.onrender.com
echo Frontend: https://monitor-client-gsbf.onrender.com
echo.

echo Step 1: Cleaning previous builds...
if exist dist rmdir /s /q dist 2>nul
timeout /t 1 /nobreak >nul

echo Step 2: Applying production configuration...
copy /Y config.production.js config.js >nul
echo Configuration updated!

echo.
echo Step 3: Building application...
echo This will take 2-3 minutes...
echo.
node_modules\.bin\electron-builder.cmd --win --x64 --dir

if not exist "dist\win-unpacked\ODL Monitor Client.exe" (
    echo.
    echo BUILD FAILED!
    goto :end
)

echo.
echo Step 4: Creating distribution package...
cd dist\win-unpacked
powershell -Command "Compress-Archive -Path '.\*' -DestinationPath '..\ODL-Monitor-Client-Windows.zip' -Force"
cd ..\..

if not exist "dist\ODL-Monitor-Client-Windows.zip" (
    echo Failed to create ZIP package!
    goto :end
)

echo.
echo ==========================================
echo BUILD COMPLETED SUCCESSFULLY!
echo ==========================================
echo.
echo Distribution Package:
echo   File: dist\ODL-Monitor-Client-Windows.zip
for %%A in ("dist\ODL-Monitor-Client-Windows.zip") do (
    set /a sizeMB=%%~zA/1048576
    echo   Size: !sizeMB! MB
)
echo.
echo Distribution Instructions:
echo   1. Share ODL-Monitor-Client-Windows.zip with users
echo   2. Users extract to any folder
echo   3. Run "ODL Monitor Client.exe"
echo   4. No installation required!
echo.
echo The application will connect to:
echo   - Backend:  https://monitor-d0dx.onrender.com
echo   - Frontend: https://monitor-client-gsbf.onrender.com
echo.

:end
pause
