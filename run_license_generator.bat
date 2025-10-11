@echo off
chcp 65001 >nul
title DentaDesk License Generator

echo.
echo ████████████████████████████████████████████████████████████████
echo █                                                              █
echo █           DentaDesk License Generator                        █
echo █           مولد مفاتيح الترخيص - DentaDesk                    █
echo █                                                              █
echo ████████████████████████████████████████████████████████████████
echo.

REM التحقق من وجود Python
echo [1/4] التحقق من Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ خطأ: Python غير مثبت!
    echo.
    echo يرجى تثبيت Python من: https://python.org
    echo تأكد من إضافة Python إلى PATH
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Python مثبت بنجاح
)

REM التحقق من وجود Node.js
echo.
echo [2/4] التحقق من Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  تحذير: Node.js غير مثبت!
    echo.
    echo يرجى تثبيت Node.js من: https://nodejs.org
    echo هذا مطلوب لتوليد مفاتيح الترخيص
    echo.
    echo هل تريد المتابعة بدون Node.js؟ (y/n)
    set /p choice=
    if /i "%choice%" neq "y" (
        exit /b 1
    )
) else (
    echo ✅ Node.js مثبت بنجاح
)

REM تثبيت المكتبات المطلوبة
echo.
echo [3/4] تثبيت المكتبات المطلوبة...
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ فشل في تثبيت المكتبات
    echo.
    echo جرب تشغيل الأمر التالي يدوياً:
    echo pip install customtkinter
    echo.
    pause
    exit /b 1
) else (
    echo ✅ تم تثبيت المكتبات بنجاح
)

REM تشغيل التطبيق
echo.
echo [4/4] تشغيل مولد مفاتيح الترخيص...
echo.
echo 🚀 بدء تشغيل التطبيق...
echo.

REM تشغيل التطبيق
python license_generator_gui.py

echo.
echo 👋 شكراً لاستخدام DentaDesk License Generator
pause
