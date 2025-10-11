const Database = require('better-sqlite3')
const { join } = require('path')
const { app } = require('electron')

// Get database path
let dbPath
try {
  dbPath = join(app.getPath('userData'), 'dental_clinic.db')
} catch (error) {
  // Fallback for testing or non-electron environments
  dbPath = join(process.cwd(), 'dental_clinic.db')
}

console.log('🗄️ Opening database at:', dbPath)

const db = new Database(dbPath)

try {
  console.log('🔄 Starting patient schema migration...')

  // Check current table structure
  const tableInfo = db.pragma('table_info(patients)')
  console.log('📋 Current table structure:', tableInfo)

  const hasNewSchema = tableInfo.some(col => col.name === 'serial_number')
  const hasOldSchema = tableInfo.some(col => col.name === 'first_name')

  console.log('🔍 Schema analysis:')
  console.log('  - Has new schema (serial_number):', hasNewSchema)
  console.log('  - Has old schema (first_name):', hasOldSchema)

  if (hasNewSchema && !hasOldSchema) {
    console.log('✅ Migration already completed - new schema detected')
    process.exit(0)
  }

  if (!hasOldSchema) {
    console.log('✅ No old schema detected - no migration needed')
    process.exit(0)
  }

  // Get current patient count
  const patientCount = db.prepare('SELECT COUNT(*) as count FROM patients').get()
  console.log(`📊 Found ${patientCount.count} patients to migrate`)

  // Begin transaction for safe migration
  const transaction = db.transaction(() => {
    console.log('📋 Creating backup of existing patients...')
    
    // Step 1: Create backup table
    db.exec(`
      CREATE TABLE IF NOT EXISTS patients_backup AS 
      SELECT * FROM patients
    `)

    console.log('🗑️ Dropping old patients table...')
    
    // Step 2: Drop existing table
    db.exec('DROP TABLE IF EXISTS patients')

    console.log('🏗️ Creating new patients table...')
    
    // Step 3: Create new table with updated schema
    db.exec(`
      CREATE TABLE patients (
        id TEXT PRIMARY KEY,
        serial_number TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
        age INTEGER NOT NULL CHECK (age > 0),
        patient_condition TEXT NOT NULL,
        allergies TEXT,
        medical_conditions TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log('📊 Migrating existing patient data...')
    
    // Step 4: Migrate data from backup
    const migrateStmt = db.prepare(`
      INSERT INTO patients (
        id, serial_number, full_name, gender, age, patient_condition,
        allergies, medical_conditions, email, address, notes, phone,
        created_at, updated_at
      )
      SELECT 
        id,
        SUBSTR(id, 1, 8) as serial_number,
        COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') as full_name,
        'male' as gender,
        CASE 
          WHEN date_of_birth IS NOT NULL AND date_of_birth != '' 
          THEN CAST((julianday('now') - julianday(date_of_birth)) / 365.25 AS INTEGER)
          ELSE 25
        END as age,
        COALESCE(NULLIF(medical_history, ''), 'يحتاج إلى تقييم طبي') as patient_condition,
        allergies,
        insurance_info as medical_conditions,
        email,
        address,
        notes,
        phone,
        created_at,
        updated_at
      FROM patients_backup
    `)

    const result = migrateStmt.run()
    console.log(`✅ Migrated ${result.changes} patient records`)

    // Step 5: Clean up backup table
    db.exec('DROP TABLE IF EXISTS patients_backup')
    
    console.log('🔧 Migration completed successfully')
  })

  // Execute the transaction
  transaction()

  // Force WAL checkpoint to ensure data is written
  db.pragma('wal_checkpoint(TRUNCATE)')
  
  console.log('✅ Patient schema migration completed successfully')
  
  // Verify migration
  const newTableInfo = db.pragma('table_info(patients)')
  console.log('📋 New table structure:', newTableInfo)
  
  const newPatientCount = db.prepare('SELECT COUNT(*) as count FROM patients').get()
  console.log(`📊 Verified ${newPatientCount.count} patients after migration`)

} catch (error) {
  console.error('❌ Migration failed:', error)
  
  // Try to restore from backup if it exists
  try {
    const backupExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='patients_backup'
    `).get()
    
    if (backupExists) {
      console.log('🔄 Attempting to restore from backup...')
      db.exec('DROP TABLE IF EXISTS patients')
      db.exec('ALTER TABLE patients_backup RENAME TO patients')
      console.log('✅ Restored from backup')
    }
  } catch (restoreError) {
    console.error('❌ Failed to restore from backup:', restoreError)
  }
  
  process.exit(1)
} finally {
  db.close()
}
