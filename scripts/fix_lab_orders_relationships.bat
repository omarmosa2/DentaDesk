@echo off
echo.
echo ========================================
echo   Lab Orders Relationships Fix Script
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js and try again
    pause
    exit /b 1
)

REM Check if we're in the correct directory
if not exist "test_dental_clinic.db" (
    echo Error: Database file not found
    echo Please run this script from the dental clinic root directory
    pause
    exit /b 1
)

REM Run the migration script
echo Running lab orders relationships fix...
node scripts/fix_lab_orders_relationships.js

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   Migration completed successfully!
    echo ========================================
    echo.
    echo The lab orders table has been enhanced with:
    echo - Better relationships with teeth and treatments
    echo - Additional fields for lab instructions and materials
    echo - Improved performance indexes
    echo - Automatic triggers for data consistency
    echo.
) else (
    echo.
    echo ========================================
    echo   Migration failed!
    echo ========================================
    echo.
    echo Please check the error messages above and try again.
    echo.
)

pause
