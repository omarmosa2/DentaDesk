const fs = require('fs');
const path = require('path');

// مسار قاعدة البيانات
const dbPath = path.join(process.env.APPDATA, 'DentaDesk', 'dental_clinic.db');

console.log('🔍 فحص قاعدة البيانات...');
console.log('📁 المسار:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.log('❌ قاعدة البيانات غير موجودة');
  process.exit(1);
}

// قراءة الملف كـ buffer
const buffer = fs.readFileSync(dbPath);
console.log('📊 حجم الملف:', buffer.length, 'bytes');

// البحث عن migrations في الملف
const content = buffer.toString('utf8');

console.log('\n📋 البحث عن Migrations:');
const migrationNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
migrationNumbers.forEach(num => {
  if (content.includes(`version, description) VALUES (${num},`)) {
    console.log(`✅ Migration ${num}: موجود`);
  } else {
    console.log(`❌ Migration ${num}: غير موجود`);
  }
});

// البحث عن حقول الواتساب
console.log('\n🔍 البحث عن حقول الواتساب:');
const whatsappFields = [
  'whatsapp_reminder_enabled',
  'whatsapp_reminder_hours_before', 
  'whatsapp_reminder_minutes_before',
  'whatsapp_reminder_message',
  'whatsapp_reminder_custom_enabled'
];

let foundFields = 0;
whatsappFields.forEach(field => {
  if (content.includes(field)) {
    console.log(`✅ ${field}: موجود`);
    foundFields++;
  } else {
    console.log(`❌ ${field}: غير موجود`);
  }
});

console.log(`\n📊 النتيجة: ${foundFields}/${whatsappFields.length} حقول موجودة`);

// البحث عن جدول whatsapp_reminders
if (content.includes('whatsapp_reminders')) {
  console.log('✅ جدول whatsapp_reminders موجود');
} else {
  console.log('❌ جدول whatsapp_reminders غير موجود');
}

