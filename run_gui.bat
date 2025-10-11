@echo off
chcp 65001 >nul
title DentaDesk License Generator

echo Starting DentaDesk License Generator...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed!
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

REM Install required packages
echo Installing required packages...
pip install customtkinter --quiet

REM Run the GUI
echo Starting GUI...
python license_generator_gui.py

pause
