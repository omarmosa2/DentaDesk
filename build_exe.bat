@echo off
chcp 65001 >nul
title Build DentaDesk License Generator EXE

echo.
echo ████████████████████████████████████████████████████████████████
echo █                                                              █
echo █     Build DentaDesk License Generator EXE                    █
echo █     بناء ملف EXE لمولد مفاتيح الترخيص                       █
echo █                                                              █
echo ████████████████████████████████████████████████████████████████
echo.

REM Check Python
echo [1/7] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python not installed!
    pause
    exit /b 1
)
echo Done

REM Install PyInstaller
echo.
echo [2/7] Installing PyInstaller...
pip install pyinstaller
echo Done

REM Install dependencies
echo.
echo [3/7] Installing dependencies...
pip install -r requirements.txt
echo Done

REM Build EXE
echo.
echo [4/7] Building EXE...
pyinstaller --onefile --windowed --name=DentaDesk_License_Generator --noconsole --clean license_generator_gui_simple.py

if errorlevel 1 (
    echo.
    echo Build failed!
    pause
    exit /b 1
)
echo Done

REM Copy required folders
echo.
echo [5/7] Copying 'scripts' folder to 'dist'...
xcopy /E /I /Y "scripts" "dist\scripts" >nul
if errorlevel 1 (
    echo Failed to copy 'scripts' folder.
) else (
    echo Done
)

echo.
echo [6/7] Copying 'electron' folder to 'dist'...
xcopy /E /I /Y "electron" "dist\electron" >nul
if errorlevel 1 (
    echo Failed to copy 'electron' folder.
) else (
    echo Done
)

REM Cleanup
echo.
echo [7/7] Cleaning up...
if exist build rmdir /s /q build
if exist __pycache__ rmdir /s /q __pycache__
echo Done

echo.
echo ========================================
echo SUCCESS! EXE created successfully!
echo ========================================
echo.
echo Location: dist\DentaDesk_License_Generator.exe
echo.
echo You can now:
echo   1. Run the EXE directly
echo   2. Distribute to users
echo   3. No Python required!
echo.

pause
