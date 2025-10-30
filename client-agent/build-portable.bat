@echo off
echo ========================================
echo ODL Monitor Client - Portable EXE Build
echo ========================================
echo.
echo Building portable executable for production...
echo Server URL: https://monitor-d0dx.onrender.com
echo.

echo Step 1: Stopping any running ODL Monitor processes...
taskkill /F /IM "ODL-Monitor-Client-Portable.exe" 2>nul
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
echo Production config applied successfully.
echo.

echo Step 4: Building portable executable...
echo This may take 5-10 minutes...
echo.
call npm run build

echo.
if exist dist\ODL-Monitor-Client-Portable.exe (
    echo ========================================
    echo BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo Your portable executable is ready:
    echo dist\ODL-Monitor-Client-Portable.exe
    echo.
    echo This single .exe file can be distributed to users.
    echo No installation required - just run it!
    echo.
    echo Server: https://monitor-d0dx.onrender.com
    echo Dashboard: https://monitor-client-gsbf.onrender.com
    echo.
) else (
    echo ========================================
    echo BUILD FAILED!
    echo ========================================
    echo Please check the error messages above.
    echo.
)

pause
