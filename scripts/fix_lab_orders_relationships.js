#!/usr/bin/env node

/**
 * Script to fix and enhance lab orders relationships
 * This script applies the database migration to enhance the relationship between
 * laboratories, treatments, and teeth
 */

const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

// Configuration
const DB_PATH = path.join(__dirname, '..', 'test_dental_clinic.db')
const MIGRATION_PATH = path.join(__dirname, '..', 'src', 'database', 'migrations', 'fix_lab_orders_relationships.sql')

console.log('🔧 Lab Orders Relationships Fix Script')
console.log('=====================================')

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database file not found:', DB_PATH)
  console.log('Please make sure the database file exists before running this script.')
  process.exit(1)
}

// Check if migration file exists
if (!fs.existsSync(MIGRATION_PATH)) {
  console.error('❌ Migration file not found:', MIGRATION_PATH)
  process.exit(1)
}

try {
  // Open database connection
  console.log('📂 Opening database connection...')
  const db = new Database(DB_PATH)

  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  // Read migration SQL
  console.log('📖 Reading migration file...')
  const migrationSQL = fs.readFileSync(MIGRATION_PATH, 'utf8')

  // Check current table structure
  console.log('🔍 Checking current lab_orders table structure...')
  const tableInfo = db.pragma('table_info(lab_orders)')
  console.log('Current columns:', tableInfo.map(col => col.name).join(', '))

  // Check if we need to run the migration
  const hasToothNumber = tableInfo.some(col => col.name === 'tooth_number')
  const hasAppointmentId = tableInfo.some(col => col.name === 'appointment_id')
  const hasToothTreatmentId = tableInfo.some(col => col.name === 'tooth_treatment_id')

  if (hasToothNumber && hasAppointmentId && hasToothTreatmentId) {
    console.log('✅ Table already has the required columns. Checking for additional enhancements...')

    const hasPriority = tableInfo.some(col => col.name === 'priority')
    const hasLabInstructions = tableInfo.some(col => col.name === 'lab_instructions')

    if (hasPriority && hasLabInstructions) {
      console.log('✅ All enhancements are already applied!')
      console.log('🎯 Verifying triggers...')

      // Check if triggers exist
      const triggers = db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE '%lab_order%'").all()
      console.log('Existing triggers:', triggers.map(t => t.name).join(', '))

      if (triggers.length >= 2) {
        console.log('✅ All triggers are in place!')
        db.close()
        process.exit(0)
      }
    }
  }

  console.log('🚀 Starting migration...')

  // Begin transaction
  const transaction = db.transaction(() => {
    // Split migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📝 Executing ${statements.length} migration statements...`)

    statements.forEach((statement, index) => {
      try {
        if (statement.trim()) {
          console.log(`   ${index + 1}. ${statement.substring(0, 50)}...`)
          db.exec(statement)
        }
      } catch (error) {
        if (!error.message.includes('already exists') &&
            !error.message.includes('duplicate column name')) {
          throw error
        }
        console.log(`   ⚠️  Skipped (already exists): ${statement.substring(0, 50)}...`)
      }
    })
  })

  // Execute transaction
  transaction()

  console.log('✅ Migration completed successfully!')

  // Verify the new structure
  console.log('🔍 Verifying new table structure...')
  const newTableInfo = db.pragma('table_info(lab_orders)')
  console.log('New columns:', newTableInfo.map(col => col.name).join(', '))

  // Check indexes
  console.log('🔍 Checking indexes...')
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='lab_orders'").all()
  console.log('Indexes:', indexes.map(idx => idx.name).join(', '))

  // Check triggers
  console.log('🔍 Checking triggers...')
  const newTriggers = db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE '%lab_order%'").all()
  console.log('Triggers:', newTriggers.map(t => t.name).join(', '))

  // Test the relationship
  console.log('🧪 Testing relationships...')
  const labOrdersCount = db.prepare('SELECT COUNT(*) as count FROM lab_orders').get().count
  const withTreatments = db.prepare('SELECT COUNT(*) as count FROM lab_orders WHERE tooth_treatment_id IS NOT NULL').get().count

  console.log(`📊 Statistics:`)
  console.log(`   - Total lab orders: ${labOrdersCount}`)
  console.log(`   - Orders with tooth treatments: ${withTreatments}`)

  // Close database
  db.close()

  console.log('🎉 Lab orders relationships enhancement completed successfully!')
  console.log('')
  console.log('📋 Summary of changes:')
  console.log('   ✅ Added tooth_number column for direct tooth reference')
  console.log('   ✅ Added appointment_id for appointment linking')
  console.log('   ✅ Enhanced tooth_treatment_id with CASCADE DELETE')
  console.log('   ✅ Added priority, lab_instructions, material_type, color_shade columns')
  console.log('   ✅ Added comprehensive indexes for performance')
  console.log('   ✅ Added triggers for automatic tooth_number population')
  console.log('')
  console.log('🔗 The system now has complete integration between:')
  console.log('   - Laboratories (labs)')
  console.log('   - Treatments (tooth_treatments)')
  console.log('   - Teeth (tooth_number)')
  console.log('   - Appointments (appointments)')
  console.log('   - Patients (patients)')

} catch (error) {
  console.error('❌ Migration failed:', error.message)
  console.error('Stack trace:', error.stack)
  process.exit(1)
}
