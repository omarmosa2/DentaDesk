@echo off
chcp 65001 >nul
title DentaDesk License Generator - Professional Edition

echo.
echo ████████████████████████████████████████████████████████████████████████████████
echo █                                                                              █
echo █                    DentaDesk License Generator                               █
echo █                    مولد مفاتيح الترخيص الاحترافي - DentaDesk                 █
echo █                                                                              █
echo ████████████████████████████████████████████████████████████████████████████████
echo.
echo 🚀 إصدار احترافي مع واجهة رسومية حديثة وجميلة
echo.

REM التحقق من وجود Python
echo [1/5] التحقق من Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ خطأ: Python غير مثبت!
    echo.
    echo 📥 يرجى تثبيت Python من: https://python.org
    echo    تأكد من إضافة Python إلى PATH أثناء التثبيت
    echo.
    echo 💡 نصائح:
    echo    - اختر "Add Python to PATH" أثناء التثبيت
    echo    - أعد تشغيل Command Prompt بعد التثبيت
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version') do echo ✅ %%i مثبت بنجاح
)

REM التحقق من وجود Node.js
echo.
echo [2/5] التحقق من Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  تحذير: Node.js غير مثبت!
    echo.
    echo 📥 يرجى تثبيت Node.js من: https://nodejs.org
    echo    هذا مطلوب لتوليد مفاتيح الترخيص
    echo.
    echo 💡 نصائح:
    echo    - اختر LTS version (الأكثر استقراراً)
    echo    - أعد تشغيل Command Prompt بعد التثبيت
    echo.
    echo هل تريد المتابعة بدون Node.js؟ (y/n)
    set /p choice=
    if /i "%choice%" neq "y" (
        echo.
        echo 👋 تم إلغاء التشغيل
        pause
        exit /b 1
    )
    echo ⚠️  سيتم المتابعة بدون Node.js - قد لا تعمل بعض الميزات
) else (
    for /f "tokens=*" %%i in ('node --version') do echo ✅ %%i مثبت بنجاح
)

REM التحقق من وجود pip
echo.
echo [3/5] التحقق من pip...
pip --version >nul 2>&1
if errorlevel 1 (
    echo ❌ خطأ: pip غير متوفر!
    echo.
    echo 💡 حلول:
    echo    1. أعد تثبيت Python مع pip
    echo    2. أو شغل: python -m ensurepip --upgrade
    echo.
    pause
    exit /b 1
) else (
    echo ✅ pip متوفر
)

REM تثبيت المكتبات المطلوبة
echo.
echo [4/5] تثبيت المكتبات المطلوبة...
echo 📦 تثبيت customtkinter...
pip install customtkinter --quiet
if errorlevel 1 (
    echo ❌ فشل في تثبيت customtkinter
    echo.
    echo 💡 حلول:
    echo    1. تأكد من اتصال الإنترنت
    echo    2. جرب: pip install --upgrade pip
    echo    3. جرب: pip install customtkinter --user
    echo.
    pause
    exit /b 1
) else (
    echo ✅ تم تثبيت customtkinter بنجاح
)

REM التحقق من ملفات المشروع
echo.
echo [5/5] التحقق من ملفات المشروع...
if not exist "license_generator_gui.py" (
    echo ❌ خطأ: لم يتم العثور على license_generator_gui.py
    echo    تأكد من تشغيل الملف من المجلد الصحيح
    pause
    exit /b 1
)

if not exist "scripts\generateKeyForDevice.js" (
    echo ⚠️  تحذير: لم يتم العثور على scripts\generateKeyForDevice.js
    echo    قد لا تعمل ميزة توليد المفاتيح
)

echo ✅ ملفات المشروع موجودة

REM تشغيل التطبيق
echo.
echo 🎉 جميع الفحوصات نجحت!
echo.
echo 🚀 بدء تشغيل مولد مفاتيح الترخيص...
echo.
echo 💡 نصائح للاستخدام:
echo    - اختر مسار المشروع أولاً
echo    - أدخل معرف الجهاز (32 حرف hex)
echo    - اختر نوع الترخيص والمنطقة
echo    - انقر "توليد مفتاح الترخيص"
echo.

REM تشغيل التطبيق
python license_generator_gui.py

echo.
echo 👋 شكراً لاستخدام DentaDesk License Generator
echo    تم تطويره خصيصاً لبرنامج DentaDesk
echo.
pause

