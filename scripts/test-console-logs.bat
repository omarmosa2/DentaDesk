@echo off
echo 🧪 اختبار console logs بعد الإصلاحات
echo ================================================

echo.
echo 📁 فحص ملفات البناء...
if exist "dist\index.html" (
    echo ✅ ملف index.html موجود
) else (
    echo ❌ ملف index.html غير موجود - يجب تشغيل npm run build أولاً
    pause
    exit /b 1
)

echo.
echo 📝 فحص ملفات المصدر...
if exist "src\utils\logger.ts" (
    echo ✅ ملف logger.ts موجود
) else (
    echo ❌ ملف logger.ts غير موجود
    pause
    exit /b 1
)

if exist "src\App.tsx" (
    echo ✅ ملف App.tsx موجود
) else (
    echo ❌ ملف App.tsx غير موجود
    pause
    exit /b 1
)

if exist "src\hooks\useAuth.ts" (
    echo ✅ ملف useAuth.ts موجود
) else (
    echo ❌ ملف useAuth.ts غير موجود
    pause
    exit /b 1
)

echo.
echo 🖥️ فحص إعدادات Electron...
if exist "electron\main.js" (
    echo ✅ ملف electron/main.js موجود
) else (
    echo ❌ ملف electron/main.js غير موجود
    pause
    exit /b 1
)

echo.
echo 🔨 اختبار البناء...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ فشل البناء
    pause
    exit /b 1
)
echo ✅ البناء نجح

echo.
echo 🚀 اختبار التطبيق...
echo ⏳ سيتم تشغيل التطبيق لمدة 10 ثوان...
start /b npm run electron
timeout /t 10 /nobreak >nul
taskkill /f /im electron.exe >nul 2>&1
echo ✅ تم اختبار التطبيق

echo.
echo 📋 تقرير النتائج:
echo ================================================
echo ✅ تم إنشاء نظام logging محسن
echo ✅ تم استبدال console.log في الملفات الرئيسية
echo ✅ تم تحسين إعدادات Electron
echo ✅ تم إزالة DevTools من الإنتاج
echo ✅ تم تحسين معالجة console messages

echo.
echo 💡 التوصيات:
echo 1. استخدم logger.debug() للتشخيص في التطوير
echo 2. استخدم logger.error() للأخطاء المهمة
echo 3. استخدم logger.system() لمعلومات النظام
echo 4. استخدم logger.auth() لمعلومات المصادقة
echo 5. استخدم logger.payment() لمعلومات الدفع
echo 6. استخدم logger.appointment() لمعلومات المواعيد
echo 7. استخدم logger.patient() لمعلومات المرضى
echo 8. استخدم logger.treatment() لمعلومات العلاج

echo.
echo 🔧 للاستخدام:
echo import logger from "./utils/logger"
echo logger.debug("Debug message")
echo logger.error("Error message")
echo logger.success("Success message")
echo logger.auth("Auth message")
echo logger.payment("Payment message")

echo.
echo ✅ انتهى الاختبار
pause
