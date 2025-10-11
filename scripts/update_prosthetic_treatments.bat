@echo off
echo 🦷 بدء تحديث قاعدة البيانات بعلاجات التعويضات الجديدة...

REM Check if database exists
if exist "test_dental_clinic.db" (
    echo 📁 تم العثور على قاعدة البيانات: test_dental_clinic.db
    
    REM Execute the migration SQL
    echo 📝 تنفيذ تحديث قاعدة البيانات...
    
    REM Create a temporary SQL file with the updates
    echo -- Insert new prosthetic treatments > temp_update.sql
    echo INSERT OR IGNORE INTO treatments (id, name, description, default_cost, duration_minutes, category) VALUES >> temp_update.sql
    echo ('complete_denture_acrylic', 'جهاز متحرك كامل أكريل', 'جهاز أسنان متحرك كامل مصنوع من الأكريل', 1200.00, 180, 'التعويضات'), >> temp_update.sql
    echo ('partial_denture_acrylic', 'جهاز متحرك جزئي أكريل', 'جهاز أسنان متحرك جزئي مصنوع من الأكريل', 800.00, 150, 'التعويضات'), >> temp_update.sql
    echo ('complete_denture_vitalium', 'جهاز متحرك كامل فيتاليوم', 'جهاز أسنان متحرك كامل مصنوع من الفيتاليوم', 1800.00, 200, 'التعويضات'), >> temp_update.sql
    echo ('partial_denture_vitalium', 'جهاز متحرك جزئي فيتاليوم', 'جهاز أسنان متحرك جزئي مصنوع من الفيتاليوم', 1400.00, 180, 'التعويضات'), >> temp_update.sql
    echo ('complete_denture_flexible', 'جهاز متحرك كامل مرن', 'جهاز أسنان متحرك كامل مصنوع من مواد مرنة', 1500.00, 160, 'التعويضات'), >> temp_update.sql
    echo ('partial_denture_flexible', 'جهاز متحرك جزئي مرن', 'جهاز أسنان متحرك جزئي مصنوع من مواد مرنة', 1000.00, 140, 'التعويضات'), >> temp_update.sql
    echo ('implant_crown_zirconia', 'تعويض زركونيا فوق زرعة', 'تاج زركونيا مثبت فوق زرعة سنية', 1500.00, 120, 'التعويضات'), >> temp_update.sql
    echo ('implant_crown_ceramic', 'تعويض خزف فوق زرعة', 'تاج خزفي مثبت فوق زرعة سنية', 1200.00, 120, 'التعويضات'), >> temp_update.sql
    echo ('cast_post_core', 'قلب ووتد مصبوب معدني', 'قلب ووتد معدني مصبوب لتقوية السن', 400.00, 90, 'التعويضات'), >> temp_update.sql
    echo ('zirconia_post_core', 'قلب ووتد زركونيا', 'قلب ووتد مصنوع من الزركونيا', 600.00, 90, 'التعويضات'), >> temp_update.sql
    echo ('veneer', 'فينير', 'قشور خزفية رقيقة للأسنان الأمامية', 800.00, 120, 'التعويضات'); >> temp_update.sql
    
    REM Try to use sqlite3 command if available
    sqlite3 test_dental_clinic.db < temp_update.sql 2>nul
    
    if %errorlevel% equ 0 (
        echo ✅ تم التحديث بنجاح!
        
        REM Count prosthetic treatments
        echo SELECT COUNT(*) as 'عدد علاجات التعويضات:' FROM treatments WHERE category = 'التعويضات'; > count_query.sql
        sqlite3 test_dental_clinic.db < count_query.sql
        
        REM List prosthetic treatments
        echo.
        echo 📋 علاجات التعويضات المتاحة:
        echo SELECT '   ' || ROW_NUMBER() OVER (ORDER BY name) || '. ' || name || ' (' || id || ')' FROM treatments WHERE category = 'التعويضات' ORDER BY name; > list_query.sql
        sqlite3 test_dental_clinic.db < list_query.sql
        
        del temp_update.sql count_query.sql list_query.sql
        echo.
        echo 🎉 تم تحديث قاعدة البيانات بنجاح!
    ) else (
        echo ❌ فشل في تحديث قاعدة البيانات. تأكد من وجود sqlite3 في النظام.
        echo يمكنك تشغيل التطبيق وستظهر العلاجات الجديدة تلقائياً.
        del temp_update.sql 2>nul
    )
) else (
    echo ❌ قاعدة البيانات غير موجودة. يرجى تشغيل التطبيق أولاً لإنشاء قاعدة البيانات.
)

pause
