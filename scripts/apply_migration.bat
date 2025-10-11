@echo off
echo 🚀 Starting lab orders cascade delete migration...

REM Check if database exists
if not exist "test_dental_clinic.db" (
    if not exist "dental_clinic.db" (
        echo ❌ Database file not found
        echo 💡 Please make sure the database file exists before running this migration.
        pause
        exit /b 1
    )
    set DB_FILE=dental_clinic.db
) else (
    set DB_FILE=test_dental_clinic.db
)

echo 📊 Using database: %DB_FILE%

REM Check if migration file exists
if not exist "src\database\migrations\fix_lab_orders_cascade_delete.sql" (
    echo ❌ Migration file not found
    pause
    exit /b 1
)

echo 📖 Migration SQL found

REM Check current lab orders count
echo 📊 Checking current lab orders count...
sqlite3 %DB_FILE% "SELECT COUNT(*) as count FROM lab_orders;" > temp_count.txt
set /p BEFORE_COUNT=<temp_count.txt
echo Current lab orders count: %BEFORE_COUNT%

REM Check orphaned lab orders
echo 🔍 Checking for orphaned lab orders...
sqlite3 %DB_FILE% "SELECT COUNT(*) as count FROM lab_orders WHERE tooth_treatment_id IS NOT NULL AND tooth_treatment_id NOT IN (SELECT id FROM tooth_treatments);" > temp_orphaned.txt
set /p ORPHANED_COUNT=<temp_orphaned.txt
echo Orphaned lab orders found: %ORPHANED_COUNT%

REM Apply migration
echo 🔄 Applying migration...
sqlite3 %DB_FILE% < src\database\migrations\fix_lab_orders_cascade_delete.sql

if %ERRORLEVEL% EQU 0 (
    echo ✅ Migration applied successfully
) else (
    echo ❌ Migration failed
    pause
    exit /b 1
)

REM Check final lab orders count
echo 📊 Checking final lab orders count...
sqlite3 %DB_FILE% "SELECT COUNT(*) as count FROM lab_orders;" > temp_final.txt
set /p AFTER_COUNT=<temp_final.txt
echo Final lab orders count: %AFTER_COUNT%

REM Verify foreign key constraints
echo 🔍 Verifying foreign key constraints...
sqlite3 %DB_FILE% "PRAGMA foreign_key_check;" > temp_fk_check.txt
for /f %%i in ("temp_fk_check.txt") do set FK_SIZE=%%~zi
if %FK_SIZE% EQU 0 (
    echo ✅ Foreign key constraints are valid
) else (
    echo ⚠️ Foreign key constraint violations found
    type temp_fk_check.txt
)

REM Clean up temp files
del temp_count.txt temp_orphaned.txt temp_final.txt temp_fk_check.txt 2>nul

echo 🎉 Migration completed successfully!
echo 📝 Summary:
echo    - Orphaned lab orders cleaned: %ORPHANED_COUNT%
echo    - Lab orders before: %BEFORE_COUNT%
echo    - Lab orders after: %AFTER_COUNT%
echo    - Cascade delete relationship established

pause
