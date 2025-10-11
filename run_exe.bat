@echo off
chcp 65001 >nul
title DentaDesk License Generator - EXE

echo.
echo ████████████████████████████████████████████████████████████████
echo █                                                              █
echo █     Running DentaDesk License Generator EXE                  █
echo █     تشغيل مولد مفاتيح الترخيص EXE                           █
echo █                                                              █
echo ████████████████████████████████████████████████████████████████
echo.

if not exist "dist\DentaDesk_License_Generator.exe" (
    echo Error: EXE file not found!
    echo Please build the EXE first using: build_exe.bat
    echo.
    pause
    exit /b 1
)

echo Starting application...
echo.

start "" "dist\DentaDesk_License_Generator.exe"

echo Application started!
echo.
pause
