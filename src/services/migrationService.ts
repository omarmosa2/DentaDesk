import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

export class MigrationService {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  async runMigration001(): Promise<void> {
    
    try {
      // Check if migration is needed by checking if new columns exist
      const tableInfo = this.db.pragma('table_info(patients)')
      const hasNewSchema = tableInfo.some((col: any) => col.name === 'serial_number')
      
      if (hasNewSchema) {
        return
      }

      // Begin transaction for safe migration
      const transaction = this.db.transaction(() => {
        
        // Step 1: Create backup table
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS patients_backup AS 
          SELECT * FROM patients
        `)

        
        // Step 2: Drop existing table
        this.db.exec('DROP TABLE IF EXISTS patients')

        
        // Step 3: Create new table with updated schema
        this.db.exec(`
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
        const migrateStmt = this.db.prepare(`
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
        this.db.exec('DROP TABLE IF EXISTS patients_backup')
        
        console.log('🔧 Migration completed successfully')
      })

      // Execute the transaction
      transaction()

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')
      
      console.log('✅ Patient schema migration completed successfully')
      
    } catch (error) {
      console.error('❌ Migration failed:', error)
      
      // Try to restore from backup if it exists
      try {
        const backupExists = this.db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='patients_backup'
        `).get()
        
        if (backupExists) {
          console.log('🔄 Attempting to restore from backup...')
          this.db.exec('DROP TABLE IF EXISTS patients')
          this.db.exec('ALTER TABLE patients_backup RENAME TO patients')
          console.log('✅ Restored from backup')
        }
      } catch (restoreError) {
        console.error('❌ Failed to restore from backup:', restoreError)
      }
      
      throw error
    }
  }

  async runAllMigrations(): Promise<void> {
    console.log('🚀 Running database migrations...')
    
    try {
      await this.runMigration001()
      console.log('✅ All migrations completed successfully')
    } catch (error) {
      console.error('❌ Migration process failed:', error)
      throw error
    }
  }
}
