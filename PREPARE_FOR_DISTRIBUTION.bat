@echo off
chcp 65001 >nul
title Prepare DentaDesk License Generator for Distribution

echo.
echo ████████████████████████████████████████████████████████████████
echo █                                                              █
echo █     Prepare for Distribution                                 █
echo █     تجهيز التطبيق للتوزيع                                   █
echo █                                                              █
echo ████████████████████████████████████████████████████████████████
echo.

echo [1/3] Checking files...
if not exist "dist\DentaDesk_License_Generator.exe" (
    echo Error: EXE not found! Please build it first.
    echo خطأ: ملف EXE غير موجود! قم ببنائه أولاً
    pause
    exit /b 1
)

if not exist "scripts" (
    echo Error: scripts folder not found!
    echo خطأ: مجلد scripts غير موجود!
    pause
    exit /b 1
)

if not exist "electron" (
    echo Error: electron folder not found!
    echo خطأ: مجلد electron غير موجود!
    pause
    exit /b 1
)

echo Done! Files found.
echo.

echo [2/4] Copying scripts folder to dist...
xcopy /E /I /Y "scripts" "dist\scripts"
echo Done!
echo.

echo [3/4] Copying electron folder to dist...
xcopy /E /I /Y "electron" "dist\electron"
echo Done!
echo.

echo [4/4] Copying instructions...
copy /Y "dist\HOW_TO_USE.txt" "dist\HOW_TO_USE.txt" >nul 2>&1
echo Done!
echo.

echo.
echo ════════════════════════════════════════════════════════════════
echo.
echo SUCCESS! Your distribution package is ready!
echo النجاح! حزمة التوزيع جاهزة!
echo.
echo 📦 Location: dist\
echo.
echo Files included:
echo   ✅ DentaDesk_License_Generator.exe
echo   ✅ scripts\ folder
echo   ✅ electron\ folder
echo   ✅ HOW_TO_USE.txt
echo.
echo You can now distribute the "dist" folder!
echo يمكنك الآن توزيع مجلد "dist"!
echo.
echo ════════════════════════════════════════════════════════════════
echo.

pause
