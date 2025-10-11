@echo off
echo ========================================
echo    حل مشكلة الشاشة البيضاء في Electron
echo ========================================

echo.
echo 🧹 تنظيف الملفات القديمة...
if exist dist rmdir /s /q dist
if exist dist-electron rmdir /s /q dist-electron
if exist node_modules\.vite rmdir /s /q node_modules\.vite

echo.
echo 📦 تحديث التبعيات...
npm install

echo.
echo 🔨 بناء التطبيق...
npm run build

echo.
echo 🔍 تشخيص البناء...
node scripts/diagnose-white-screen.js

echo.
echo 🚀 تشغيل التطبيق للاختبار...
echo اضغط Ctrl+Shift+I لفتح DevTools إذا ظهرت شاشة بيضاء
echo.
npm run electron

pause
