const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Script to fix WhatsApp reminders migration issues
async function fixWhatsAppMigration() {
  console.log('🔧 Fixing WhatsApp reminders migration...\n');

  // Find the database path
  const dbPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'ORalSoft', 'dental_clinic.db');

  console.log('📁 Database path:', dbPath);

  if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file not found. The application needs to be run at least once to create the database.');
    return;
  }

  const db = new Database(dbPath);

  try {
    // Check current columns
    console.log('🔍 Checking current settings table columns...');
    const columns = db.prepare(`PRAGMA table_info(settings)`).all();
    console.log('📋 Current columns:', columns.map(c => `${c.name} (${c.type})`).join(', '));

    // Check if whatsapp_reminder_minutes_before column exists
    const hasMinutesColumn = columns.some(c => c.name === 'whatsapp_reminder_minutes_before');

    if (!hasMinutesColumn) {
      console.log('🔧 Adding missing whatsapp_reminder_minutes_before column...');
      db.prepare(`
        ALTER TABLE settings ADD COLUMN whatsapp_reminder_minutes_before INTEGER DEFAULT 180
      `).run();
      console.log('✅ Column added successfully');
    } else {
      console.log('✅ whatsapp_reminder_minutes_before column already exists');
    }

    // Verify all WhatsApp columns exist
    const requiredColumns = [
      'whatsapp_reminder_enabled',
      'whatsapp_reminder_hours_before',
      'whatsapp_reminder_minutes_before',
      'whatsapp_reminder_message',
      'whatsapp_reminder_custom_enabled'
    ];

    console.log('\n🔍 Verifying all required WhatsApp columns...');
    const finalColumns = db.prepare(`PRAGMA table_info(settings)`).all();
    const finalColumnNames = finalColumns.map(c => c.name);

    for (const column of requiredColumns) {
      if (finalColumnNames.includes(column)) {
        console.log(`✅ ${column} exists`);
      } else {
        console.log(`❌ ${column} missing`);
      }
    }

    // Test getting settings
    console.log('\n🧪 Testing settings retrieval...');
    const settings = db.prepare(`SELECT * FROM settings WHERE id = 'clinic_settings'`).get();

    if (settings) {
      console.log('✅ Settings retrieved successfully');
      console.log('📱 Current WhatsApp settings:');
      console.log(`   - Enabled: ${settings.whatsapp_reminder_enabled}`);
      console.log(`   - Hours before: ${settings.whatsapp_reminder_hours_before}`);
      console.log(`   - Minutes before: ${settings.whatsapp_reminder_minutes_before}`);
      console.log(`   - Custom enabled: ${settings.whatsapp_reminder_custom_enabled}`);
      console.log(`   - Message: ${settings.whatsapp_reminder_message ? 'Set' : 'Not set'}`);
    } else {
      console.log('❌ No settings found in database');
    }

    console.log('\n✅ WhatsApp reminders migration fix completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the application');
    console.log('2. Go to Settings → WhatsApp Reminders');
    console.log('3. Configure your reminder settings');
    console.log('4. The settings should now save and persist correctly');

  } catch (error) {
    console.error('❌ Error fixing WhatsApp migration:', error);
  } finally {
    db.close();
  }
}

// Run the fix
fixWhatsAppMigration().catch(console.error);