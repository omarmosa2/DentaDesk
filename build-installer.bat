@echo off
echo ========================================
echo Building DentaDesk
echo Professional Installer
echo ========================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not available
    pause
    exit /b 1
)

echo Step 1: Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 2: Building the application...
call npm run build
if errorlevel 1 (
    echo ERROR: Failed to build the application
    pause
    exit /b 1
)

echo.
echo Step 3: Creating Windows installer...
call npm run dist:win
if errorlevel 1 (
    echo ERROR: Failed to create installer
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS: Installer created successfully!
echo ========================================
echo.
echo The installer has been created in the 'dist-electron' folder
echo Installer name: DentaDesk-v1.0-Setup.exe
echo.
echo Installation Features:
echo - English language only
echo - Automatic folder creation:DentaDesk
echo - Desktop shortcut creation
echo - Start menu integration
echo - License agreement display
echo - Professional installer interface
echo.

:: Open the output directory
if exist "dist-electron" (
    echo Opening output directory...
    start "" "dist-electron"
)

echo Build completed successfully!
pause
