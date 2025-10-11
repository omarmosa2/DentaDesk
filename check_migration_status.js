const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// مسار قاعدة البيانات
const dbPath = path.join(process.env.APPDATA, 'DentaDesk', 'dental_clinic.db');

console.log('🔍 فحص حالة Migrations في قاعدة البيانات...');
console.log('📁 المسار:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.log('❌ قاعدة البيانات غير موجودة');
  process.exit(1);
}

try {
  const db = new Database(dbPath);
  
  // فحص جدول schema_migrations
  console.log('\n📋 Migrations المطبقة:');
  try {
    const migrations = db.prepare('SELECT * FROM schema_migrations ORDER BY version').all();
    if (migrations.length === 0) {
      console.log('❌ لا توجد migrations مطبقة');
    } else {
      migrations.forEach(migration => {
        console.log(`✅ Migration ${migration.version}: ${migration.description} (${migration.success ? 'نجح' : 'فشل'})`);
      });
    }
  } catch (error) {
    console.log('❌ جدول schema_migrations غير موجود');
  }
  
  // فحص حقول الواتساب في جدول settings
  console.log('\n🔍 فحص حقول الواتساب في جدول settings:');
  try {
    const columns = db.prepare("PRAGMA table_info(settings)").all();
    const whatsappFields = [
      'whatsapp_reminder_enabled',
      'whatsapp_reminder_hours_before', 
      'whatsapp_reminder_minutes_before',
      'whatsapp_reminder_message',
      'whatsapp_reminder_custom_enabled'
    ];
    
    whatsappFields.forEach(field => {
      const exists = columns.some(col => col.name === field);
      console.log(`${exists ? '✅' : '❌'} ${field}: ${exists ? 'موجود' : 'غير موجود'}`);
    });
  } catch (error) {
    console.log('❌ خطأ في فحص جدول settings:', error.message);
  }
  
  // فحص جدول whatsapp_reminders
  console.log('\n🔍 فحص جدول whatsapp_reminders:');
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='whatsapp_reminders'").all();
    if (tables.length > 0) {
      console.log('✅ جدول whatsapp_reminders موجود');
    } else {
      console.log('❌ جدول whatsapp_reminders غير موجود');
    }
  } catch (error) {
    console.log('❌ خطأ في فحص جدول whatsapp_reminders:', error.message);
  }
  
  db.close();
  
} catch (error) {
  console.log('❌ خطأ في فتح قاعدة البيانات:', error.message);
}

