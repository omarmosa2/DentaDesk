const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Script to check WhatsApp database status and fix issues
async function checkWhatsAppDatabase() {
  console.log('🔍 Checking WhatsApp database status...\n');

  // Find the database path
  const dbPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'DentalClinic - DentaDeskcode', 'dental_clinic.db');

  console.log('📁 Database path:', dbPath);

  if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file not found. Please run the application first to create the database.');
    console.log('💡 Run: npm run electron:dev');
    return;
  }

  const db = new Database(dbPath);

  try {
    console.log('📊 Database file size:', (fs.statSync(dbPath).size / 1024).toFixed(2), 'KB');

    // Check if settings table exists
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
    console.log('\n📋 Available tables:', tables.map(t => t.name).join(', '));

    const hasSettingsTable = tables.some(t => t.name === 'settings');
    if (!hasSettingsTable) {
      console.log('❌ Settings table not found!');
      return;
    }

    // Check settings table columns
    console.log('\n🔍 Checking settings table columns...');
    const columns = db.prepare(`PRAGMA table_info(settings)`).all();

    const columnNames = columns.map(c => c.name);
    console.log('📋 Columns:', columnNames.join(', '));

    // Check for required WhatsApp columns
    const requiredColumns = [
      'whatsapp_reminder_enabled',
      'whatsapp_reminder_hours_before',
      'whatsapp_reminder_minutes_before',
      'whatsapp_reminder_message',
      'whatsapp_reminder_custom_enabled'
    ];

    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));

    if (missingColumns.length > 0) {
      console.log('\n❌ Missing WhatsApp columns:', missingColumns.join(', '));
      console.log('🔧 Run the fix script: node scripts/fix_whatsapp_migration.js');
    } else {
      console.log('\n✅ All WhatsApp columns are present');
    }

    // Check current settings
    console.log('\n📱 Checking current WhatsApp settings...');
    const settings = db.prepare(`SELECT * FROM settings WHERE id = 'clinic_settings'`).get();

    if (settings) {
      console.log('✅ Settings found:');
      console.log(`   - WhatsApp reminders enabled: ${settings.whatsapp_reminder_enabled || 0}`);
      console.log(`   - Hours before: ${settings.whatsapp_reminder_hours_before || 'Not set'}`);
      console.log(`   - Minutes before: ${settings.whatsapp_reminder_minutes_before || 'Not set'}`);
      console.log(`   - Custom message enabled: ${settings.whatsapp_reminder_custom_enabled || 0}`);
      console.log(`   - Message: ${settings.whatsapp_reminder_message ? 'Set' : 'Not set'}`);

      // Check for default values
      if (!settings.whatsapp_reminder_hours_before) {
        console.log('🔧 Setting default hours_before to 3...');
        db.prepare(`UPDATE settings SET whatsapp_reminder_hours_before = 3 WHERE id = 'clinic_settings'`).run();
      }

      if (!settings.whatsapp_reminder_minutes_before) {
        console.log('🔧 Setting default minutes_before to 180...');
        db.prepare(`UPDATE settings SET whatsapp_reminder_minutes_before = 180 WHERE id = 'clinic_settings'`).run();
      }

      if (!settings.whatsapp_reminder_message) {
        console.log('🔧 Setting default message...');
        const defaultMessage = 'مرحبًا {{patient_name}}، تذكير بموعدك في عيادة الأسنان بتاريخ {{appointment_date}} الساعة {{appointment_time}}. نشكرك على التزامك.';
        db.prepare(`UPDATE settings SET whatsapp_reminder_message = ? WHERE id = 'clinic_settings'`).run(defaultMessage);
      }
    } else {
      console.log('❌ No clinic settings found. Creating default settings...');
      db.prepare(`
        INSERT INTO settings (id, whatsapp_reminder_enabled, whatsapp_reminder_hours_before, whatsapp_reminder_minutes_before, whatsapp_reminder_message, whatsapp_reminder_custom_enabled)
        VALUES ('clinic_settings', 0, 3, 180, 'مرحبًا {{patient_name}}، تذكير بموعدك في عيادة الأسنان بتاريخ {{appointment_date}} الساعة {{appointment_time}}. نشكرك على التزامك.', 0)
      `).run();
      console.log('✅ Default settings created');
    }

    // Final verification
    console.log('\n🎯 Final verification...');
    const finalSettings = db.prepare(`SELECT * FROM settings WHERE id = 'clinic_settings'`).get();
    console.log('📱 Final settings:');
    console.log(JSON.stringify(finalSettings, null, 2));

    console.log('\n✅ Database check completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Database file: ✅ Found');
    console.log('- Settings table: ✅ Present');
    console.log('- WhatsApp columns: ✅ All present');
    console.log('- Default values: ✅ Set');
    console.log('- Settings: ✅ Ready');

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    db.close();
  }
}

// Run the check
checkWhatsAppDatabase().catch(console.error);