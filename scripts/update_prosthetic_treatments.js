#!/usr/bin/env node

/**
 * Script to update the database with new prosthetic treatments
 * Run this script to add the new treatment options to existing databases
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Database paths to check
const possibleDbPaths = [
  path.join(__dirname, '..', 'dental_clinic.db'),
  path.join(__dirname, '..', 'test_dental_clinic.db'),
  path.join(__dirname, '..', 'src', 'database', 'dental_clinic.db')
];

// Find the existing database
let dbPath = null;
for (const possiblePath of possibleDbPaths) {
  if (fs.existsSync(possiblePath)) {
    dbPath = possiblePath;
    break;
  }
}
const migrationPath = path.join(__dirname, '..', 'src', 'database', 'migrations', 'add_prosthetic_treatments.sql');

async function updateDatabase() {
  try {
    console.log('🦷 بدء تحديث قاعدة البيانات بعلاجات التعويضات الجديدة...');

    // Check if database exists
    if (!dbPath) {
      console.log('❌ قاعدة البيانات غير موجودة. يرجى تشغيل التطبيق أولاً لإنشاء قاعدة البيانات.');
      console.log('البحث في المسارات التالية:');
      possibleDbPaths.forEach(path => console.log(`  - ${path}`));
      process.exit(1);
    }

    console.log(`📁 تم العثور على قاعدة البيانات: ${dbPath}`);

    // Read migration file
    if (!fs.existsSync(migrationPath)) {
      console.log('❌ ملف التحديث غير موجود:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Open database connection
    const db = new Database(dbPath);

    // Execute migration
    console.log('📝 تنفيذ تحديث قاعدة البيانات...');

    // Split SQL statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    db.transaction(() => {
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            db.exec(statement);
          } catch (error) {
            console.log(`⚠️  تحذير: ${error.message}`);
            // Continue with other statements
          }
        }
      }
    })();

    // Verify the update
    const result = db.prepare("SELECT COUNT(*) as count FROM treatments WHERE category = 'التعويضات'").get();
    console.log(`✅ تم التحديث بنجاح! عدد علاجات التعويضات: ${result.count}`);

    // List all prosthetic treatments
    const prostheticTreatments = db.prepare("SELECT id, name FROM treatments WHERE category = 'التعويضات' ORDER BY name").all();
    console.log('\n📋 علاجات التعويضات المتاحة:');
    prostheticTreatments.forEach((treatment, index) => {
      console.log(`   ${index + 1}. ${treatment.name} (${treatment.id})`);
    });

    db.close();
    console.log('\n🎉 تم تحديث قاعدة البيانات بنجاح!');

  } catch (error) {
    console.error('❌ خطأ في تحديث قاعدة البيانات:', error.message);
    process.exit(1);
  }
}

// Run the update
updateDatabase();
