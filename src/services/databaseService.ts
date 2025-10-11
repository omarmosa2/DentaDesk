import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import { readFileSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import type {
  Patient,
  Appointment,
  Payment,
  Treatment,
  InventoryItem,
  ClinicSettings,
  DashboardStats,
  Lab,
  LabOrder
} from '../types'
import { MigrationService } from './migrationService'
import { IntegrationMigrationService } from './integrationMigrationService'

export class DatabaseService {
  private db: Database.Database

  constructor() {
    const dbPath = join(app.getPath('userData'), 'dental_clinic.db')
    console.log('🗄️ Initializing SQLite database at:', dbPath)

    try {
      this.db = new Database(dbPath)
      console.log('✅ Database connection established')

      this.initializeDatabase()
      console.log('✅ Database schema initialized')

      this.runMigrations()
      console.log('✅ Database migrations completed')

      // Run patient schema migration
      this.runPatientSchemaMigration()
      console.log('✅ Patient schema migration completed')

      // Run integration migration
      this.runIntegrationMigration()
      console.log('✅ Integration migration completed')

      // Ensure lab_orders table has all required columns
      await this.ensureLabOrdersColumns()
      console.log('✅ Lab orders columns verification completed')

      // Test database connection
      const testQuery = this.db.prepare('SELECT COUNT(*) as count FROM patients')
      const result = testQuery.get() as { count: number }
      console.log('✅ Database test successful. Patient count:', result.count)

    } catch (error) {
      console.error('❌ Database initialization failed:', error)
      throw error
    }
  }

  private initializeDatabase() {
    // Read and execute schema
    const schemaPath = join(__dirname, '../database/schema.sql')
    const schema = readFileSync(schemaPath, 'utf-8')
    this.db.exec(schema)

    // Enable foreign keys and other optimizations
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('cache_size = 1000')
    this.db.pragma('temp_store = MEMORY')

    // Create performance indexes
    this.createIndexes()
  }

  private createIndexes() {
    try {
      // Patient indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_patients_serial ON patients(serial_number)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email)')

      // Appointment indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_appointments_treatment ON appointments(treatment_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(start_time)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)')

      // Payment indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_payments_appointment ON payments(appointment_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_payments_receipt ON payments(receipt_number)')

      // Inventory indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory(supplier)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory(expiry_date)')

      // Inventory usage indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_usage_item ON inventory_usage(inventory_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_usage_appointment ON inventory_usage(appointment_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_usage_date ON inventory_usage(usage_date)')

      // Patient images indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_patient_images_patient ON patient_images(patient_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_patient_images_appointment ON patient_images(appointment_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_patient_images_type ON patient_images(image_type)')

      // Installment payments indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_installment_payments_payment ON installment_payments(payment_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_installment_payments_due_date ON installment_payments(due_date)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_installment_payments_status ON installment_payments(status)')

      // Treatment indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_treatments_name ON treatments(name)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_treatments_category ON treatments(category)')
    } catch (error) {
      console.error('Error creating indexes:', error)
    }
  }

  private runMigrations() {
    // Initialize migration tracking table
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          description TEXT,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          success BOOLEAN DEFAULT TRUE
        )
      `)
    } catch (error) {
      console.error('Failed to create migration tracking table:', error)
    }

    // Enhanced migration with transaction and rollback support
    const transaction = this.db.transaction(() => {
      try {
        // Check what migrations have been applied
        const appliedMigrations = new Set()
        try {
          const applied = this.db.prepare('SELECT version FROM schema_migrations WHERE success = TRUE').all() as { version: number }[]
          applied.forEach(m => appliedMigrations.add(m.version))
        } catch (error) {
          // Migration table doesn't exist yet, continue
        }

        // Migration 1: Add missing columns to payments table
        if (!appliedMigrations.has(1)) {
          console.log('🔄 Applying migration 1: Enhanced payments table structure')

          const columns = this.db.prepare("PRAGMA table_info(payments)").all() as any[]
          const columnNames = columns.map(col => col.name)

          if (!columnNames.includes('notes')) {
            this.db.exec('ALTER TABLE payments ADD COLUMN notes TEXT')
          }

          if (!columnNames.includes('discount_amount')) {
            this.db.exec('ALTER TABLE payments ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0')
          }

          if (!columnNames.includes('tax_amount')) {
            this.db.exec('ALTER TABLE payments ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0')
          }

          if (!columnNames.includes('total_amount')) {
            this.db.exec('ALTER TABLE payments ADD COLUMN total_amount DECIMAL(10,2)')
            this.db.exec('UPDATE payments SET total_amount = amount WHERE total_amount IS NULL')
          }

          if (!columnNames.includes('total_amount_due')) {
            this.db.exec('ALTER TABLE payments ADD COLUMN total_amount_due DECIMAL(10,2)')
            this.db.exec('UPDATE payments SET total_amount_due = amount WHERE total_amount_due IS NULL')
          }

          if (!columnNames.includes('amount_paid')) {
            this.db.exec('ALTER TABLE payments ADD COLUMN amount_paid DECIMAL(10,2)')
            this.db.exec('UPDATE payments SET amount_paid = amount WHERE amount_paid IS NULL')
          }

          if (!columnNames.includes('remaining_balance')) {
            this.db.exec('ALTER TABLE payments ADD COLUMN remaining_balance DECIMAL(10,2)')
            this.db.exec('UPDATE payments SET remaining_balance = COALESCE(total_amount_due, amount) - COALESCE(amount_paid, amount) WHERE remaining_balance IS NULL')
          }

          // Record successful migration
          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(1, 'Enhanced payments table structure')
          console.log('✅ Migration 1 completed successfully')
        }

        // Migration 2: Add profile_image to patients if missing
        if (!appliedMigrations.has(2)) {
          console.log('🔄 Applying migration 2: Add profile_image to patients')

          const patientColumns = this.db.prepare("PRAGMA table_info(patients)").all() as any[]
          const patientColumnNames = patientColumns.map(col => col.name)

          if (!patientColumnNames.includes('profile_image')) {
            this.db.exec('ALTER TABLE patients ADD COLUMN profile_image TEXT')
          }

          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(2, 'Add profile_image to patients')
          console.log('✅ Migration 2 completed successfully')
        }

        // Migration 3: Add date_added to patients
        if (!appliedMigrations.has(3)) {
          console.log('🔄 Applying migration 3: Add date_added to patients')

          const patientColumns = this.db.prepare("PRAGMA table_info(patients)").all() as any[]
          const patientColumnNames = patientColumns.map(col => col.name)

          if (!patientColumnNames.includes('date_added')) {
            this.db.exec('ALTER TABLE patients ADD COLUMN date_added DATETIME DEFAULT CURRENT_TIMESTAMP')
            // Update existing patients to have date_added = created_at
            this.db.exec('UPDATE patients SET date_added = created_at WHERE date_added IS NULL')
            // Create index for better performance
            this.db.exec('CREATE INDEX IF NOT EXISTS idx_patients_date_added ON patients(date_added)')
          }

          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(3, 'Add date_added to patients')
          console.log('✅ Migration 3 completed successfully')
        }

        // Migration 4: Ensure all tables exist with proper structure
        if (!appliedMigrations.has(4)) {
          console.log('🔄 Applying migration 3: Ensure all tables exist')

          // Check if installment_payments table exists
          const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
          const tableNames = tables.map(t => t.name)

          if (!tableNames.includes('installment_payments')) {
            this.db.exec(`
              CREATE TABLE installment_payments (
                id TEXT PRIMARY KEY,
                payment_id TEXT NOT NULL,
                installment_number INTEGER NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                due_date DATE NOT NULL,
                paid_date DATE,
                status TEXT DEFAULT 'pending',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
              )
            `)
          }

          if (!tableNames.includes('patient_images')) {
            this.db.exec(`
              CREATE TABLE patient_images (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                appointment_id TEXT,
                image_path TEXT NOT NULL,
                image_type TEXT,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
                FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
              )
            `)
          }

          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(3, 'Ensure all tables exist')
          console.log('✅ Migration 3 completed successfully')
        }

        // Migration 4: Add doctor_name to settings table
        if (!appliedMigrations.has(4)) {
          console.log('🔄 Applying migration 4: Add doctor_name to settings')

          const settingsColumns = this.db.prepare("PRAGMA table_info(settings)").all() as any[]
          const settingsColumnNames = settingsColumns.map(col => col.name)

          if (!settingsColumnNames.includes('doctor_name')) {
            this.db.exec('ALTER TABLE settings ADD COLUMN doctor_name TEXT DEFAULT \'د. محمد أحمد\'')
            this.db.exec('UPDATE settings SET doctor_name = \'د. محمد أحمد\' WHERE doctor_name IS NULL')
          }

          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(4, 'Add doctor_name to settings')
          console.log('✅ Migration 4 completed successfully')
        }

        // Migration 5: Add password fields to settings table
        if (!appliedMigrations.has(5)) {
          console.log('🔄 Applying migration 5: Add password fields to settings')

          const settingsColumns = this.db.prepare("PRAGMA table_info(settings)").all() as any[]
          const settingsColumnNames = settingsColumns.map(col => col.name)

          if (!settingsColumnNames.includes('app_password')) {
            this.db.exec('ALTER TABLE settings ADD COLUMN app_password TEXT')
          }

          if (!settingsColumnNames.includes('password_enabled')) {
            this.db.exec('ALTER TABLE settings ADD COLUMN password_enabled INTEGER DEFAULT 0')
          }

          if (!settingsColumnNames.includes('security_question')) {
            this.db.exec('ALTER TABLE settings ADD COLUMN security_question TEXT')
          }

          if (!settingsColumnNames.includes('security_answer')) {
            this.db.exec('ALTER TABLE settings ADD COLUMN security_answer TEXT')
          }

          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(5, 'Add password and security fields to settings')
          console.log('✅ Migration 5 completed successfully')
        }

        // Migration 6: Create dental treatment tables
        if (!appliedMigrations.has(6)) {
          console.log('🔄 Applying migration 6: Create dental treatment tables')

          const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
          const tableNames = tables.map(t => t.name)

          // Create dental_treatments table
          if (!tableNames.includes('dental_treatments')) {
            this.db.exec(`
              CREATE TABLE dental_treatments (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                appointment_id TEXT,
                tooth_number INTEGER NOT NULL CHECK (
                  (tooth_number >= 11 AND tooth_number <= 18) OR
                  (tooth_number >= 21 AND tooth_number <= 28) OR
                  (tooth_number >= 31 AND tooth_number <= 38) OR
                  (tooth_number >= 41 AND tooth_number <= 48) OR
                  (tooth_number >= 51 AND tooth_number <= 55) OR
                  (tooth_number >= 61 AND tooth_number <= 65) OR
                  (tooth_number >= 71 AND tooth_number <= 75) OR
                  (tooth_number >= 81 AND tooth_number <= 85)
                ),
                tooth_name TEXT NOT NULL,
                current_treatment TEXT,
                next_treatment TEXT,
                treatment_details TEXT,
                treatment_status TEXT DEFAULT 'planned',
                treatment_color TEXT DEFAULT '#22c55e',
                cost DECIMAL(10,2),
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
                FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
              )
            `)
          }

          // Create dental_treatment_images table
          if (!tableNames.includes('dental_treatment_images')) {
            this.db.exec(`
              CREATE TABLE dental_treatment_images (
                id TEXT PRIMARY KEY,
                dental_treatment_id TEXT NOT NULL,
                patient_id TEXT NOT NULL,
                tooth_number INTEGER NOT NULL,
                image_path TEXT NOT NULL,
                image_type TEXT NOT NULL,
                description TEXT,
                taken_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dental_treatment_id) REFERENCES dental_treatments(id) ON DELETE CASCADE,
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
              )
            `)
          }

          // Create dental_treatment_prescriptions table
          if (!tableNames.includes('dental_treatment_prescriptions')) {
            this.db.exec(`
              CREATE TABLE dental_treatment_prescriptions (
                id TEXT PRIMARY KEY,
                dental_treatment_id TEXT NOT NULL,
                prescription_id TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dental_treatment_id) REFERENCES dental_treatments(id) ON DELETE CASCADE,
                FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
              )
            `)
          }

          // Create indexes for dental treatment tables
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatments_patient ON dental_treatments(patient_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatments_tooth ON dental_treatments(tooth_number)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatments_status ON dental_treatments(treatment_status)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_treatment ON dental_treatment_images(dental_treatment_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_patient ON dental_treatment_images(patient_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_prescriptions_treatment ON dental_treatment_prescriptions(dental_treatment_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_prescriptions_prescription ON dental_treatment_prescriptions(prescription_id)')

          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(6, 'Create dental treatment tables')
          console.log('✅ Migration 6 completed successfully')
        }

        // Migration 7: Fix dental_treatment_images table structure
        if (!appliedMigrations.has(7)) {
          console.log('🔄 Applying migration 7: Fix dental_treatment_images table structure')

          // Check if dental_treatment_images table has tooth_record_id column
          const imageTableColumns = this.db.prepare("PRAGMA table_info(dental_treatment_images)").all() as any[]
          const imageColumnNames = imageTableColumns.map(col => col.name)

          if (imageColumnNames.includes('tooth_record_id')) {
            // Drop the old table and recreate it with correct structure
            this.db.exec('DROP TABLE IF EXISTS dental_treatment_images_backup')
            this.db.exec('ALTER TABLE dental_treatment_images RENAME TO dental_treatment_images_backup')

            // Create new table with correct structure
            this.db.exec(`
              CREATE TABLE dental_treatment_images (
                id TEXT PRIMARY KEY,
                dental_treatment_id TEXT NOT NULL,
                patient_id TEXT NOT NULL,
                tooth_number INTEGER NOT NULL,
                image_path TEXT NOT NULL,
                image_type TEXT NOT NULL,
                description TEXT,
                taken_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dental_treatment_id) REFERENCES dental_treatments(id) ON DELETE CASCADE,
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
              )
            `)

            // Migrate data from backup table (if any exists)
            try {
              this.db.exec(`
                INSERT INTO dental_treatment_images (
                  id, dental_treatment_id, patient_id, tooth_number, image_path,
                  image_type, description, taken_date, created_at, updated_at
                )
                SELECT
                  id, dental_treatment_id, patient_id, tooth_number, image_path,
                  image_type, description, taken_date, created_at, updated_at
                FROM dental_treatment_images_backup
                WHERE dental_treatment_id IS NOT NULL
              `)
            } catch (error) {
              console.log('No data to migrate from backup table')
            }

            // Drop backup table
            this.db.exec('DROP TABLE IF EXISTS dental_treatment_images_backup')
          }

          // Recreate indexes
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_treatment ON dental_treatment_images(dental_treatment_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_patient ON dental_treatment_images(patient_id)')

          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(7, 'Fix dental_treatment_images table structure')
          console.log('✅ Migration 7 completed successfully')
        }

        // Migration 8: Force recreate dental_treatment_images table
        if (!appliedMigrations.has(8)) {
          console.log('🔄 Applying migration 8: Force recreate dental_treatment_images table')

          // Always recreate the table to ensure correct structure
          this.db.exec('DROP TABLE IF EXISTS dental_treatment_images_backup')

          // Check if table exists
          const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='dental_treatment_images'").all() as { name: string }[]

          if (tables.length > 0) {
            // Backup existing data
            this.db.exec('CREATE TABLE dental_treatment_images_backup AS SELECT * FROM dental_treatment_images')

            // Drop the old table
            this.db.exec('DROP TABLE dental_treatment_images')
          }

          // Create new table with correct structure
          this.db.exec(`
            CREATE TABLE dental_treatment_images (
              id TEXT PRIMARY KEY,
              dental_treatment_id TEXT NOT NULL,
              patient_id TEXT NOT NULL,
              tooth_number INTEGER NOT NULL,
              image_path TEXT NOT NULL,
              image_type TEXT NOT NULL,
              description TEXT,
              taken_date DATETIME DEFAULT CURRENT_TIMESTAMP,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (dental_treatment_id) REFERENCES dental_treatments(id) ON DELETE CASCADE,
              FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
            )
          `)

          // Migrate data from backup table (if any exists)
          try {
            const backupTables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='dental_treatment_images_backup'").all() as { name: string }[]
            if (backupTables.length > 0) {
              // Check what columns exist in backup
              const backupColumns = this.db.prepare("PRAGMA table_info(dental_treatment_images_backup)").all() as any[]
              const backupColumnNames = backupColumns.map(col => col.name)

              // Only migrate if we have the required columns
              if (backupColumnNames.includes('dental_treatment_id') &&
                  backupColumnNames.includes('patient_id') &&
                  backupColumnNames.includes('tooth_number') &&
                  backupColumnNames.includes('image_path') &&
                  backupColumnNames.includes('image_type')) {

                this.db.exec(`
                  INSERT INTO dental_treatment_images (
                    id, dental_treatment_id, patient_id, tooth_number, image_path,
                    image_type, description, taken_date, created_at, updated_at
                  )
                  SELECT
                    id, dental_treatment_id, patient_id, tooth_number, image_path,
                    image_type, description, taken_date, created_at, updated_at
                  FROM dental_treatment_images_backup
                  WHERE dental_treatment_id IS NOT NULL
                    AND patient_id IS NOT NULL
                    AND tooth_number IS NOT NULL
                    AND image_path IS NOT NULL
                    AND image_type IS NOT NULL
                `)
                console.log('✅ Data migrated from backup table')
              }
            }
          } catch (error) {
            console.log('No data to migrate from backup table:', error.message)
          }

          // Drop backup table
          this.db.exec('DROP TABLE IF EXISTS dental_treatment_images_backup')

          // Recreate indexes
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_treatment ON dental_treatment_images(dental_treatment_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_patient ON dental_treatment_images(patient_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_tooth ON dental_treatment_images(tooth_number)')

          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(8, 'Force recreate dental_treatment_images table')
          console.log('✅ Migration 8 completed successfully')
        }

        // Migration 9: Fix tooth_number constraint to support FDI numbering system
        if (!appliedMigrations.has(9)) {
          console.log('🔄 Applying migration 9: Fix tooth_number constraint for FDI numbering system')

          // Backup existing data
          this.db.exec('DROP TABLE IF EXISTS dental_treatments_backup')
          this.db.exec('CREATE TABLE dental_treatments_backup AS SELECT * FROM dental_treatments')

          // Drop the old table
          this.db.exec('DROP TABLE dental_treatments')

          // Create new table with correct FDI tooth number constraints
          this.db.exec(`
            CREATE TABLE dental_treatments (
              id TEXT PRIMARY KEY,
              patient_id TEXT NOT NULL,
              appointment_id TEXT,
              tooth_number INTEGER NOT NULL CHECK (
                (tooth_number >= 11 AND tooth_number <= 18) OR
                (tooth_number >= 21 AND tooth_number <= 28) OR
                (tooth_number >= 31 AND tooth_number <= 38) OR
                (tooth_number >= 41 AND tooth_number <= 48) OR
                (tooth_number >= 51 AND tooth_number <= 55) OR
                (tooth_number >= 61 AND tooth_number <= 65) OR
                (tooth_number >= 71 AND tooth_number <= 75) OR
                (tooth_number >= 81 AND tooth_number <= 85)
              ),
              tooth_name TEXT,
              current_treatment TEXT,
              next_treatment TEXT,
              treatment_details TEXT,
              treatment_status TEXT DEFAULT 'planned',
              treatment_color TEXT DEFAULT '#ef4444',
              cost REAL DEFAULT 0,
              notes TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
              FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
            )
          `)

          // Migrate data from backup table
          try {
            this.db.exec(`
              INSERT INTO dental_treatments (
                id, patient_id, appointment_id, tooth_number, tooth_name, current_treatment, next_treatment,
                treatment_details, treatment_status, treatment_color, cost, notes, created_at, updated_at
              )
              SELECT
                id, patient_id, appointment_id, tooth_number, tooth_name, current_treatment, next_treatment,
                treatment_details, treatment_status, treatment_color, cost, notes, created_at, updated_at
              FROM dental_treatments_backup
            `)
            console.log('✅ Data migrated from backup table')
          } catch (error) {
            console.log('No data to migrate from backup table:', error.message)
          }

          // Drop backup table
          this.db.exec('DROP TABLE IF EXISTS dental_treatments_backup')

          // Recreate indexes
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatments_patient ON dental_treatments(patient_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatments_tooth ON dental_treatments(tooth_number)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatments_status ON dental_treatments(treatment_status)')

          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(9, 'Fix tooth_number constraint for FDI numbering system')
          console.log('✅ Migration 9 completed successfully')
        }

        // Force check for dental_treatments table tooth_number constraint
        try {
          const dentalTreatmentsSchema = this.db.prepare(`
            SELECT sql FROM sqlite_master
            WHERE type='table' AND name='dental_treatments'
          `).get() as { sql?: string }

          if (dentalTreatmentsSchema && dentalTreatmentsSchema.sql?.includes('tooth_number >= 1 AND tooth_number <= 32')) {
            console.log('🔄 Force applying migration 9: Fix tooth_number constraint for FDI numbering system')

            // Apply migration 9 SQL directly
            this.db.exec(`
              PRAGMA foreign_keys = OFF;

              CREATE TABLE IF NOT EXISTS dental_treatments_backup AS
              SELECT * FROM dental_treatments;

              DROP TABLE IF EXISTS dental_treatments;

              CREATE TABLE dental_treatments (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                appointment_id TEXT,
                tooth_number INTEGER NOT NULL CHECK (
                  (tooth_number >= 11 AND tooth_number <= 18) OR
                  (tooth_number >= 21 AND tooth_number <= 28) OR
                  (tooth_number >= 31 AND tooth_number <= 38) OR
                  (tooth_number >= 41 AND tooth_number <= 48) OR
                  (tooth_number >= 51 AND tooth_number <= 55) OR
                  (tooth_number >= 61 AND tooth_number <= 65) OR
                  (tooth_number >= 71 AND tooth_number <= 75) OR
                  (tooth_number >= 81 AND tooth_number <= 85)
                ),
                tooth_name TEXT,
                current_treatment TEXT,
                next_treatment TEXT,
                treatment_details TEXT,
                treatment_status TEXT DEFAULT 'planned',
                treatment_color TEXT DEFAULT '#ef4444',
                cost REAL DEFAULT 0,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
                FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
              );

              INSERT INTO dental_treatments (
                id, patient_id, appointment_id, tooth_number, tooth_name, current_treatment, next_treatment,
                treatment_details, treatment_status, treatment_color, cost, notes, created_at, updated_at
              )
              SELECT
                id, patient_id, appointment_id, tooth_number, tooth_name, current_treatment, next_treatment,
                treatment_details, treatment_status, treatment_color, cost, notes, created_at, updated_at
              FROM dental_treatments_backup;

              DROP TABLE dental_treatments_backup;

              PRAGMA foreign_keys = ON;
            `)

            // Record that migration 9 was applied
            this.db.prepare('INSERT OR REPLACE INTO schema_migrations (version, description) VALUES (?, ?)').run(9, 'Force applied tooth_number constraint fix')
            console.log('✅ Force applied migration 9: tooth_number constraint fixed for FDI numbering')
          } else {
            console.log('✅ dental_treatments table tooth_number constraint is correct')
          }
        } catch (error) {
          console.error('❌ Error checking/fixing dental_treatments table:', error.message)
        }

      } catch (error) {
        console.error('❌ Migration failed:', error)
        // Record failed migration
        this.db.prepare('INSERT INTO schema_migrations (version, description, success) VALUES (?, ?, FALSE)').run(0, `Migration failed: ${error.message}`)
        throw error
      }
    })

    try {
      transaction()
      console.log('✅ All database migrations completed successfully')
    } catch (error) {
      console.error('❌ Migration transaction failed:', error)
      throw error
    }
  }

  private runPatientSchemaMigration() {
    try {
      const migrationService = new MigrationService(this.db)
      migrationService.runMigration001()
    } catch (error) {
      console.error('❌ Patient schema migration failed:', error)
      // Don't throw error to prevent app from crashing
      // The migration will be retried on next startup
    }
  }

  // Patient operations
  async getAllPatients(): Promise<Patient[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM patients
      ORDER BY full_name
    `)
    return stmt.all() as Patient[]
  }

  async createPatient(patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'> & { date_added?: string }): Promise<Patient> {
    const id = uuidv4()
    const now = new Date().toISOString()

    try {
      console.log('🏥 Creating patient:', {
        serial_number: patient.serial_number,
        full_name: patient.full_name,
        gender: patient.gender,
        age: patient.age,
        phone: patient.phone
      })

      const stmt = this.db.prepare(`
        INSERT INTO patients (
          id, serial_number, full_name, gender, age, patient_condition,
          allergies, medical_conditions, email, address, notes, phone,
          date_added, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        id, patient.serial_number, patient.full_name, patient.gender, patient.age,
        patient.patient_condition, patient.allergies, patient.medical_conditions,
        patient.email, patient.address, patient.notes, patient.phone,
        (patient as any).date_added || now, now, now
      )

      console.log('✅ Patient created successfully:', { id, changes: result.changes })

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      return { ...patient, id, date_added: patient.date_added || now, created_at: now, updated_at: now }
    } catch (error) {
      console.error('❌ Failed to create patient:', error)
      throw error
    }
  }

  async updatePatient(id: string, patient: Partial<Patient>): Promise<Patient> {
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE patients SET
        serial_number = COALESCE(?, serial_number),
        full_name = COALESCE(?, full_name),
        gender = COALESCE(?, gender),
        age = COALESCE(?, age),
        patient_condition = COALESCE(?, patient_condition),
        allergies = COALESCE(?, allergies),
        medical_conditions = COALESCE(?, medical_conditions),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        notes = COALESCE(?, notes),
        phone = COALESCE(?, phone),
        date_added = COALESCE(?, date_added),
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      patient.serial_number, patient.full_name, patient.gender, patient.age,
      patient.patient_condition, patient.allergies, patient.medical_conditions,
      patient.email, patient.address, patient.notes, patient.phone,
      patient.date_added, now, id
    )

    const getStmt = this.db.prepare('SELECT * FROM patients WHERE id = ?')
    return getStmt.get(id) as Patient
  }

  async deletePatient(id: string): Promise<boolean> {
    try {
      console.log(`🗑️ Starting cascade deletion for patient: ${id}`)

      // Use the comprehensive deletion method with transaction
      const result = await this.deletePatientWithAllData(id)

      if (result.success) {
        console.log(`✅ Patient ${id} and all related data deleted successfully:`)
        console.log(`- Patient images: ${result.deletedCounts.patient_images}`)
        console.log(`- Inventory usage records: ${result.deletedCounts.inventory_usage}`)
        console.log(`- Installment payments: ${result.deletedCounts.installment_payments}`)
        console.log(`- Payments: ${result.deletedCounts.payments}`)
        console.log(`- Appointments: ${result.deletedCounts.appointments}`)
        console.log(`- Patient record: ${result.deletedCounts.patient}`)

        // Force WAL checkpoint to ensure all data is written
        this.db.pragma('wal_checkpoint(TRUNCATE)')

        return result.deletedCounts.patient > 0
      } else {
        console.warn(`⚠️ Patient ${id} deletion failed or patient not found`)
        return false
      }
    } catch (error) {
      console.error(`❌ Failed to delete patient ${id}:`, error)
      throw new Error(`Failed to delete patient: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM patients
      WHERE full_name LIKE ? OR phone LIKE ? OR email LIKE ? OR serial_number LIKE ?
      ORDER BY full_name
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm) as Patient[]
  }

  async searchAppointments(query: string): Promise<Appointment[]> {
    const stmt = this.db.prepare(`
      SELECT
        a.*,
        p.full_name as patient_name,
        p.first_name,
        p.last_name,
        p.phone,
        p.email,
        p.gender,
        t.name as treatment_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN treatments t ON a.treatment_id = t.id
      WHERE
        p.full_name LIKE ? OR
        a.title LIKE ? OR
        a.description LIKE ? OR
        a.notes LIKE ?
      ORDER BY a.start_time DESC
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm) as Appointment[]
  }

  // Appointment operations
  async getAllAppointments(): Promise<Appointment[]> {
    const stmt = this.db.prepare(`
      SELECT
        a.*,
        p.full_name as patient_name,
        p.first_name,
        p.last_name,
        p.phone,
        p.email,
        p.gender,
        t.name as treatment_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN treatments t ON a.treatment_id = t.id
      ORDER BY a.start_time
    `)
    const appointments = stmt.all() as Appointment[]

    console.log('📋 DB: Raw appointments from database:', appointments.length)
    if (appointments.length > 0) {
      console.log('📋 DB: First raw appointment:', appointments[0])
    }

    // Add patient object for compatibility and ensure patient_name is set
    return appointments.map(appointment => {
      console.log('📋 DB: Processing appointment:', {
        id: appointment.id,
        patient_id: appointment.patient_id,
        patient_name: appointment.patient_name,
        first_name: appointment.first_name,
        last_name: appointment.last_name
      })

      if (appointment.patient_name) {
        appointment.patient = {
          id: appointment.patient_id,
          full_name: appointment.patient_name,
          first_name: appointment.first_name,
          last_name: appointment.last_name,
          phone: appointment.phone,
          email: appointment.email,
          gender: appointment.gender
        } as any

        // Ensure patient_name is also available at the top level
        appointment.patient_name = appointment.patient_name
      } else {
        // Handle case where patient was deleted or doesn't exist
        console.log('⚠️ DB: Appointment has no patient data:', {
          id: appointment.id,
          patient_id: appointment.patient_id
        })

        // Set fallback patient data
        appointment.patient_name = 'مريض محذوف'
        appointment.patient = {
          id: appointment.patient_id,
          full_name: 'مريض محذوف',
          first_name: 'مريض',
          last_name: 'محذوف',
          phone: '',
          email: '',
          gender: 'unknown'
        } as any
      }
      return appointment
    })
  }

  async checkAppointmentConflict(startTime: string, endTime: string, excludeId?: string): Promise<boolean> {
    // Check if there are any appointments that overlap with the given time range
    let query = `
      SELECT COUNT(*) as count
      FROM appointments
      WHERE status != 'cancelled'
        AND (
          (start_time < ? AND end_time > ?) OR
          (start_time < ? AND end_time > ?) OR
          (start_time >= ? AND start_time < ?) OR
          (end_time > ? AND end_time <= ?)
        )
    `

    const params = [endTime, startTime, startTime, endTime, startTime, endTime, startTime, endTime]

    // Exclude current appointment when updating
    if (excludeId) {
      query += ' AND id != ?'
      params.push(excludeId)
    }

    const stmt = this.db.prepare(query)
    const result = stmt.get(...params) as { count: number }

    return result.count > 0
  }

  async createAppointment(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment> {
    const id = uuidv4()
    const now = new Date().toISOString()

    try {
      // Validate patient_id exists (required)
      if (!appointment.patient_id) {
        throw new Error('Patient ID is required')
      }

      // Check for appointment conflicts
      if (appointment.start_time && appointment.end_time) {
        const hasConflict = await this.checkAppointmentConflict(appointment.start_time, appointment.end_time)
        if (hasConflict) {
          throw new Error('يوجد موعد آخر في نفس الوقت المحدد. يرجى اختيار وقت آخر.')
        }
      }

      const patientCheck = this.db.prepare('SELECT id FROM patients WHERE id = ?')
      const patientExists = patientCheck.get(appointment.patient_id)
      if (!patientExists) {
        // Log available patients for debugging
        const allPatients = this.db.prepare('SELECT id, full_name FROM patients').all()
        console.log('Available patients:', allPatients)
        throw new Error(`Patient with ID '${appointment.patient_id}' does not exist. Available patients: ${allPatients.length}`)
      }

      // Validate treatment_id exists (if provided)
      // Convert empty string to null for optional foreign key
      const treatmentId = appointment.treatment_id && appointment.treatment_id.trim() !== '' ? appointment.treatment_id : null

      if (treatmentId) {
        const treatmentCheck = this.db.prepare('SELECT id FROM treatments WHERE id = ?')
        const treatmentExists = treatmentCheck.get(treatmentId)
        if (!treatmentExists) {
          // Log available treatments for debugging
          const allTreatments = this.db.prepare('SELECT id, name FROM treatments').all()
          console.log('Available treatments:', allTreatments)
          throw new Error(`Treatment with ID '${treatmentId}' does not exist. Available treatments: ${allTreatments.length}`)
        }
      }

      console.log('Creating appointment with data:', {
        patient_id: appointment.patient_id,
        treatment_id: treatmentId,
        title: appointment.title,
        start_time: appointment.start_time,
        end_time: appointment.end_time
      })

      const stmt = this.db.prepare(`
        INSERT INTO appointments (
          id, patient_id, treatment_id, title, description, start_time, end_time,
          status, cost, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        id, appointment.patient_id, treatmentId, appointment.title,
        appointment.description, appointment.start_time, appointment.end_time,
        appointment.status, appointment.cost, appointment.notes, now, now
      )

      console.log('✅ Appointment created successfully:', { id, changes: result.changes })

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      // Get the created appointment with patient and treatment data
      const getStmt = this.db.prepare(`
        SELECT
          a.*,
          p.full_name as patient_name,
          p.first_name,
          p.last_name,
          p.phone,
          p.email,
          p.gender,
          t.name as treatment_name
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN treatments t ON a.treatment_id = t.id
        WHERE a.id = ?
      `)
      const createdAppointment = getStmt.get(id) as Appointment

      // Add patient object for compatibility
      if (createdAppointment && createdAppointment.patient_name) {
        createdAppointment.patient = {
          id: createdAppointment.patient_id,
          full_name: createdAppointment.patient_name,
          first_name: createdAppointment.first_name,
          last_name: createdAppointment.last_name,
          phone: createdAppointment.phone,
          email: createdAppointment.email,
          gender: createdAppointment.gender
        } as any

        // Ensure patient_name is also available at the top level
        createdAppointment.patient_name = createdAppointment.patient_name

        console.log('✅ Created appointment with patient data:', {
          id: createdAppointment.id,
          patient_name: createdAppointment.patient_name,
          patient: createdAppointment.patient
        })
      } else {
        console.log('⚠️ Created appointment without patient data:', {
          id: createdAppointment?.id,
          patient_id: createdAppointment?.patient_id,
          patient_name: createdAppointment?.patient_name
        })
      }

      return createdAppointment
    } catch (error) {
      console.error('❌ Failed to create appointment:', error)
      console.error('Appointment data:', appointment)
      throw error
    }
  }

  async updateAppointment(id: string, appointment: Partial<Appointment>): Promise<Appointment> {
    const now = new Date().toISOString()

    console.log('🔄 Updating appointment:', { id, appointment })

    // احصل على التكلفة الحالية للموعد قبل التحديث
    const currentAppointment = this.db.prepare('SELECT cost FROM appointments WHERE id = ?').get(id) as { cost?: number }
    const oldCost = currentAppointment?.cost

    // Check for appointment conflicts when updating time
    if (appointment.start_time && appointment.end_time) {
      const hasConflict = await this.checkAppointmentConflict(appointment.start_time, appointment.end_time, id)
      if (hasConflict) {
        throw new Error('يوجد موعد آخر في نفس الوقت المحدد. يرجى اختيار وقت آخر.')
      }
    }

    const stmt = this.db.prepare(`
      UPDATE appointments SET
        patient_id = COALESCE(?, patient_id),
        treatment_id = COALESCE(?, treatment_id),
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        status = COALESCE(?, status),
        cost = COALESCE(?, cost),
        notes = COALESCE(?, notes),
        updated_at = ?
      WHERE id = ?
    `)

    const result = stmt.run(
      appointment.patient_id, appointment.treatment_id, appointment.title,
      appointment.description, appointment.start_time, appointment.end_time,
      appointment.status, appointment.cost, appointment.notes, now, id
    )

    console.log('✅ Appointment update result:', { changes: result.changes, lastInsertRowid: result.lastInsertRowid })

    if (result.changes === 0) {
      throw new Error(`No appointment found with id: ${id}`)
    }

    // إذا تغيرت التكلفة، أعد حساب جميع المدفوعات المرتبطة بهذا الموعد
    if (appointment.cost !== undefined && appointment.cost !== oldCost) {
      await this.recalculateAppointmentPayments(id)
      console.log(`🔄 Recalculated payments for appointment ${id} due to cost change: ${oldCost} → ${appointment.cost}`)
    }

    // Force WAL checkpoint to ensure data is written
    this.db.pragma('wal_checkpoint(TRUNCATE)')

    // Get the updated appointment with patient and treatment data
    const getStmt = this.db.prepare(`
      SELECT
        a.*,
        p.full_name as patient_name,
        p.first_name,
        p.last_name,
        p.phone,
        p.email,
        p.gender,
        t.name as treatment_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN treatments t ON a.treatment_id = t.id
      WHERE a.id = ?
    `)
    const updatedAppointment = getStmt.get(id) as Appointment

    // Add patient object for compatibility
    if (updatedAppointment && updatedAppointment.patient_name) {
      updatedAppointment.patient = {
        id: updatedAppointment.patient_id,
        full_name: updatedAppointment.patient_name,
        first_name: updatedAppointment.first_name,
        last_name: updatedAppointment.last_name,
        phone: updatedAppointment.phone,
        email: updatedAppointment.email,
        gender: updatedAppointment.gender
      } as any

      // Ensure patient_name is also available at the top level
      updatedAppointment.patient_name = updatedAppointment.patient_name

      console.log('✅ Updated appointment with patient data:', {
        id: updatedAppointment.id,
        patient_name: updatedAppointment.patient_name,
        patient: updatedAppointment.patient
      })
    } else {
      console.log('⚠️ Updated appointment without patient data:', {
        id: updatedAppointment?.id,
        patient_id: updatedAppointment?.patient_id,
        patient_name: updatedAppointment?.patient_name
      })
    }

    console.log('📋 Retrieved updated appointment with patient data:', updatedAppointment)

    return updatedAppointment
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM appointments WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // Payment operations
  async getAllPayments(): Promise<Payment[]> {
    const stmt = this.db.prepare(`
      SELECT
        p.*,
        pt.full_name as patient_name,
        pt.full_name as patient_full_name,
        pt.phone as patient_phone,
        pt.email as patient_email,
        a.title as appointment_title,
        a.start_time as appointment_start_time,
        a.end_time as appointment_end_time
      FROM payments p
      LEFT JOIN patients pt ON p.patient_id = pt.id
      LEFT JOIN appointments a ON p.appointment_id = a.id
      ORDER BY p.payment_date DESC
    `)

    const payments = stmt.all() as any[]

    console.log('🔍 Raw payments from DB:', payments.length > 0 ? {
      first_payment: {
        id: payments[0]?.id,
        appointment_id: payments[0]?.appointment_id,
        total_amount_due: payments[0]?.total_amount_due,
        amount_paid: payments[0]?.amount_paid,
        remaining_balance: payments[0]?.remaining_balance
      }
    } : 'No payments found')

    // Transform the data to include patient and appointment objects
    return payments.map(payment => ({
      ...payment,
      patient: payment.patient_id ? {
        id: payment.patient_id,
        full_name: payment.patient_full_name,
        first_name: payment.patient_full_name?.split(' ')[0] || '',
        last_name: payment.patient_full_name?.split(' ').slice(1).join(' ') || '',
        phone: payment.patient_phone,
        email: payment.patient_email
      } : null,
      appointment: payment.appointment_id ? {
        id: payment.appointment_id,
        title: payment.appointment_title,
        start_time: payment.appointment_start_time,
        end_time: payment.appointment_end_time
      } : null
    }))
  }

  async createPayment(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> {
    const id = uuidv4()
    const now = new Date().toISOString()

    // استخدام transaction لضمان الاتساق
    const transaction = this.db.transaction(() => {
      console.log('💰 Creating payment:', {
        patient_id: payment.patient_id,
        appointment_id: payment.appointment_id,
        amount: payment.amount,
        payment_method: payment.payment_method
      })

      // Calculate payment amounts - التأكد من أن amount ليس null أو undefined
      const amount = payment.amount || 0  // استخدام 0 كقيمة افتراضية إذا كان amount فارغ
      const discountAmount = payment.discount_amount || 0
      const taxAmount = payment.tax_amount || 0
      const totalAmount = amount + taxAmount - discountAmount

      let appointmentTotalCost = null
      let appointmentTotalPaid = null
      let appointmentRemainingBalance = null
      let totalAmountDue = null
      let amountPaid = null
      let remainingBalance = null
      let status = payment.status || 'completed'

      if (payment.appointment_id) {
        // دفعة مرتبطة بموعد - احسب الرصيد للموعد
        const appointment = this.db.prepare('SELECT cost FROM appointments WHERE id = ?').get(payment.appointment_id) as { cost?: number }

        if (appointment?.cost) {
          appointmentTotalCost = appointment.cost

          // احسب إجمالي المدفوعات السابقة لهذا الموعد
          const previousPayments = this.db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM payments
            WHERE appointment_id = ?
          `).get(payment.appointment_id) as { total: number }

          // حفظ المبلغ الإجمالي المطلوب للدفعات المرتبطة بالمواعيد
          // استخدام المبلغ المرسل من النموذج أولاً، ثم تكلفة الموعد كبديل
          totalAmountDue = payment.total_amount_due || (appointmentTotalCost > 0 ? appointmentTotalCost : totalAmount)

          appointmentTotalPaid = previousPayments.total + amount
          appointmentRemainingBalance = Math.max(0, totalAmountDue - appointmentTotalPaid)

          amountPaid = appointmentTotalPaid
          remainingBalance = appointmentRemainingBalance

          // تحديد الحالة بناءً على الرصيد المتبقي للموعد
          if (appointmentRemainingBalance <= 0) {
            status = 'completed'
          } else if (appointmentTotalPaid > 0) {
            status = 'partial'
          } else {
            status = 'pending'
          }
        }
      } else {
        // دفعة عامة غير مرتبطة بموعد
        totalAmountDue = payment.total_amount_due || totalAmount
        amountPaid = payment.amount_paid || payment.amount
        remainingBalance = totalAmountDue - amountPaid

        if (remainingBalance <= 0) {
          status = 'completed'
        } else if (amountPaid > 0 && remainingBalance > 0) {
          status = 'partial'
        } else {
          status = 'pending'
        }
      }

      // إدراج الدفعة الجديدة
      const stmt = this.db.prepare(`
        INSERT INTO payments (
          id, patient_id, appointment_id, amount, payment_method, payment_date,
          description, receipt_number, status, notes, discount_amount, tax_amount,
          total_amount, appointment_total_cost, appointment_total_paid, appointment_remaining_balance,
          total_amount_due, amount_paid, remaining_balance, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        id, payment.patient_id, payment.appointment_id, amount,
        payment.payment_method, payment.payment_date, payment.description,
        payment.receipt_number, status, payment.notes,
        discountAmount, taxAmount, totalAmount,
        appointmentTotalCost, appointmentTotalPaid, appointmentRemainingBalance,
        totalAmountDue, amountPaid, remainingBalance, now, now
      )

      console.log('✅ Payment created successfully:', { id, changes: result.changes })
      console.log('🔍 Payment data saved to DB:', {
        id,
        appointment_id: payment.appointment_id,
        total_amount_due: totalAmountDue,
        amount_paid: amountPaid,
        remaining_balance: remainingBalance
      })

      // إذا كانت الدفعة مرتبطة بموعد، حدث جميع المدفوعات الأخرى لنفس الموعد
      if (payment.appointment_id && totalAmountDue) {
        this.updateAppointmentPaymentCalculationsSync(payment.appointment_id, totalAmountDue)
      }

      return {
        ...payment,
        id,
        amount,
        status,
        total_amount: totalAmount,
        appointment_total_cost: appointmentTotalCost,
        appointment_total_paid: appointmentTotalPaid,
        appointment_remaining_balance: appointmentRemainingBalance,
        total_amount_due: totalAmountDue,
        amount_paid: amountPaid,
        remaining_balance: remainingBalance,
        created_at: now,
        updated_at: now
      }
    })

    try {
      const result = transaction()

      // Force WAL checkpoint to ensure data is written immediately
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      return result
    } catch (error) {
      console.error('❌ Failed to create payment:', error)
      throw error
    }
  }

  async updatePayment(id: string, payment: Partial<Payment>): Promise<Payment> {
    const now = new Date().toISOString()

    // استخدام transaction لضمان الاتساق
    const transaction = this.db.transaction(() => {
      // Get current payment data to calculate new values
      const currentPayment = this.db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as Payment
      if (!currentPayment) {
        throw new Error('Payment not found')
      }

      // Calculate updated amounts
      const amount = payment.amount !== undefined ? payment.amount : currentPayment.amount
      const discountAmount = payment.discount_amount !== undefined ? payment.discount_amount : (currentPayment.discount_amount || 0)
      const taxAmount = payment.tax_amount !== undefined ? payment.tax_amount : (currentPayment.tax_amount || 0)
      const totalAmount = amount + taxAmount - discountAmount
      const totalAmountDue = payment.total_amount_due !== undefined ? payment.total_amount_due : (currentPayment.total_amount_due || totalAmount)
      const amountPaid = payment.amount_paid !== undefined ? payment.amount_paid : (currentPayment.amount_paid || amount)
      const remainingBalance = totalAmountDue - amountPaid

      // Determine status based on remaining balance if not explicitly provided
      let status = payment.status !== undefined ? payment.status : currentPayment.status
      if (payment.amount !== undefined || payment.total_amount_due !== undefined || payment.amount_paid !== undefined) {
        if (remainingBalance <= 0) {
          status = 'completed'
        } else if (amountPaid > 0 && remainingBalance > 0) {
          status = 'partial'
        } else if (amountPaid === 0) {
          status = 'pending'
        }
      }

      const stmt = this.db.prepare(`
        UPDATE payments SET
          amount = ?,
          payment_method = COALESCE(?, payment_method),
          payment_date = COALESCE(?, payment_date),
          description = COALESCE(?, description),
          receipt_number = COALESCE(?, receipt_number),
          status = ?,
          notes = COALESCE(?, notes),
          discount_amount = ?,
          tax_amount = ?,
          total_amount = ?,
          total_amount_due = ?,
          amount_paid = ?,
          remaining_balance = ?,
          updated_at = ?
        WHERE id = ?
      `)

      stmt.run(
        amount, payment.payment_method, payment.payment_date,
        payment.description, payment.receipt_number, status,
        payment.notes, discountAmount, taxAmount, totalAmount,
        totalAmountDue, amountPaid, remainingBalance, now, id
      )

      // إذا كانت الدفعة مرتبطة بموعد وتم تغيير المبلغ، حدث جميع المدفوعات الأخرى
      if (currentPayment.appointment_id && payment.amount !== undefined) {
        // استخدام المبلغ الإجمالي المطلوب من الدفعة المحدثة أو من تكلفة الموعد
        const appointment = this.db.prepare('SELECT cost FROM appointments WHERE id = ?').get(currentPayment.appointment_id) as { cost?: number }
        const appointmentCost = totalAmountDue || appointment?.cost || 0
        if (appointmentCost > 0) {
          this.updateAppointmentPaymentCalculationsSync(currentPayment.appointment_id, appointmentCost)
        }
      }

      const getStmt = this.db.prepare('SELECT * FROM payments WHERE id = ?')
      return getStmt.get(id) as Payment
    })

    try {
      const result = transaction()

      // Force WAL checkpoint to ensure data is written immediately
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      return result
    } catch (error) {
      console.error('❌ Failed to update payment:', error)
      throw error
    }
  }

  async deletePayment(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM payments WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // NEW: Delete payments by tooth treatment ID
  async deletePaymentsByToothTreatment(toothTreatmentId: string): Promise<number> {
    const stmt = this.db.prepare('DELETE FROM payments WHERE tooth_treatment_id = ?')
    const result = stmt.run(toothTreatmentId)
    return result.changes
  }

  // دالة لإعادة حساب جميع المدفوعات المرتبطة بموعد
  async recalculateAppointmentPayments(appointmentId: string): Promise<void> {
    try {
      // احصل على تكلفة الموعد
      const appointment = this.db.prepare('SELECT cost FROM appointments WHERE id = ?').get(appointmentId) as { cost?: number }

      if (!appointment?.cost) {
        console.log('No cost found for appointment:', appointmentId)
        return
      }

      // احصل على جميع المدفوعات المرتبطة بهذا الموعد مرتبة حسب تاريخ الدفع
      const payments = this.db.prepare(`
        SELECT id, amount, payment_date, created_at
        FROM payments
        WHERE appointment_id = ?
        ORDER BY payment_date ASC, created_at ASC
      `).all(appointmentId) as { id: string; amount: number; payment_date: string; created_at: string }[]

      let runningTotal = 0
      const appointmentCost = appointment.cost

      // استخدم transaction لضمان تحديث جميع المدفوعات بشكل متسق
      const transaction = this.db.transaction(() => {
        const updateStmt = this.db.prepare(`
          UPDATE payments SET
            appointment_total_cost = ?,
            appointment_total_paid = ?,
            appointment_remaining_balance = ?,
            status = ?,
            updated_at = ?
          WHERE id = ?
        `)

        payments.forEach(payment => {
          runningTotal += payment.amount
          const remainingBalance = Math.max(0, appointmentCost - runningTotal)

          let status: 'completed' | 'partial' | 'pending'
          if (remainingBalance <= 0) {
            status = 'completed'
          } else if (runningTotal > 0) {
            status = 'partial'
          } else {
            status = 'pending'
          }

          updateStmt.run(
            appointmentCost,
            runningTotal,
            remainingBalance,
            status,
            new Date().toISOString(),
            payment.id
          )
        })
      })

      transaction()
      console.log(`✅ Recalculated ${payments.length} payments for appointment ${appointmentId}`)
    } catch (error) {
      console.error('❌ Failed to recalculate appointment payments:', error)
      throw error
    }
  }

  // نسخة متزامنة للاستخدام داخل transactions
  private updateAppointmentPaymentCalculationsSync(appointmentId: string, appointmentCost: number): void {
    console.log('🔄 Updating payment calculations (sync) for appointment:', appointmentId)

    // احصل على جميع المدفوعات لهذا الموعد مرتبة حسب تاريخ الدفع
    const payments = this.db.prepare(`
      SELECT * FROM payments
      WHERE appointment_id = ?
      ORDER BY payment_date ASC, created_at ASC
    `).all(appointmentId) as Payment[]

    if (payments.length === 0) {
      console.log('No payments found for appointment:', appointmentId)
      return
    }

    let runningTotal = 0
    const updateStmt = this.db.prepare(`
      UPDATE payments SET
        appointment_total_cost = ?,
        appointment_total_paid = ?,
        appointment_remaining_balance = ?,
        total_amount_due = ?,
        amount_paid = ?,
        remaining_balance = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `)

    payments.forEach(payment => {
      runningTotal += payment.amount
      const remainingBalance = Math.max(0, appointmentCost - runningTotal)

      let status: 'completed' | 'partial' | 'pending'
      if (remainingBalance <= 0) {
        status = 'completed'
      } else if (runningTotal > 0) {
        status = 'partial'
      } else {
        status = 'pending'
      }

      updateStmt.run(
        appointmentCost,
        runningTotal,
        remainingBalance,
        appointmentCost, // total_amount_due
        runningTotal,    // amount_paid
        remainingBalance, // remaining_balance
        status,
        new Date().toISOString(),
        payment.id
      )
    })

    console.log('✅ Payment calculations updated successfully (sync) for appointment:', appointmentId)
  }

  // دالة للحصول على ملخص المدفوعات لموعد محدد
  async getAppointmentPaymentSummary(appointmentId: string): Promise<{
    appointmentCost: number
    totalPaid: number
    remainingBalance: number
    paymentCount: number
    status: 'completed' | 'partial' | 'pending'
    payments: Payment[]
  }> {
    // احصل على تكلفة الموعد
    const appointment = this.db.prepare('SELECT cost FROM appointments WHERE id = ?').get(appointmentId) as { cost?: number }
    const appointmentCost = appointment?.cost || 0

    // احصل على جميع المدفوعات المرتبطة بهذا الموعد
    const payments = this.db.prepare(`
      SELECT * FROM payments WHERE appointment_id = ? ORDER BY created_at ASC
    `).all(appointmentId) as Payment[]

    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const remainingBalance = Math.max(0, appointmentCost - totalPaid)

    let status: 'completed' | 'partial' | 'pending'
    if (remainingBalance <= 0 && appointmentCost > 0) {
      status = 'completed'
    } else if (totalPaid > 0) {
      status = 'partial'
    } else {
      status = 'pending'
    }

    return {
      appointmentCost,
      totalPaid,
      remainingBalance,
      paymentCount: payments.length,
      status,
      payments
    }
  }

  async searchPayments(query: string): Promise<Payment[]> {
    const stmt = this.db.prepare(`
      SELECT
        p.*,
        pt.full_name as patient_name,
        pt.full_name as patient_full_name,
        pt.phone as patient_phone,
        pt.email as patient_email,
        a.title as appointment_title,
        a.start_time as appointment_start_time,
        a.end_time as appointment_end_time
      FROM payments p
      LEFT JOIN patients pt ON p.patient_id = pt.id
      LEFT JOIN appointments a ON p.appointment_id = a.id
      WHERE
        pt.full_name LIKE ? OR
        p.receipt_number LIKE ? OR
        p.description LIKE ?
      ORDER BY p.payment_date DESC
    `)
    const searchTerm = `%${query}%`
    const payments = stmt.all(searchTerm, searchTerm, searchTerm) as any[]

    // Transform the data to include patient and appointment objects
    return payments.map(payment => ({
      ...payment,
      patient: payment.patient_id ? {
        id: payment.patient_id,
        full_name: payment.patient_full_name,
        first_name: payment.patient_full_name?.split(' ')[0] || '',
        last_name: payment.patient_full_name?.split(' ').slice(1).join(' ') || '',
        phone: payment.patient_phone,
        email: payment.patient_email
      } : null,
      appointment: payment.appointment_id ? {
        id: payment.appointment_id,
        title: payment.appointment_title,
        start_time: payment.appointment_start_time,
        end_time: payment.appointment_end_time
      } : null
    }))
  }

  // Helper method to check if a column exists in a table
  checkColumnExists(tableName: string, columnName: string): boolean {
    try {
      const stmt = this.db.prepare(`PRAGMA table_info(${tableName})`)
      const columns = stmt.all() as any[]
      return columns.some(col => col.name === columnName)
    } catch (error) {
      console.error(`Error checking column ${columnName} in table ${tableName}:`, error)
      return false
    }
  }

  // Get payments by patient ID
  async getPaymentsByPatient(patientId: string): Promise<Payment[]> {
    console.log('🔍 [DEBUG] getPaymentsByPatient() called with patientId:', patientId)

    // Check if tooth_treatment_id column exists
    const hasToothTreatmentId = this.checkColumnExists('payments', 'tooth_treatment_id')

    let query: string
    if (hasToothTreatmentId) {
      // Use the full query with tooth_treatments join
      query = `
        SELECT
          p.*,
          pt.full_name as patient_name,
          pt.full_name as patient_full_name,
          pt.phone as patient_phone,
          pt.email as patient_email,
          a.title as appointment_title,
          a.start_time as appointment_start_time,
          a.end_time as appointment_end_time,
          tt.treatment_type as treatment_name,
          tt.tooth_number,
          tt.tooth_name,
          tt.cost as treatment_cost
        FROM payments p
        LEFT JOIN patients pt ON p.patient_id = pt.id
        LEFT JOIN appointments a ON p.appointment_id = a.id
        LEFT JOIN tooth_treatments tt ON p.tooth_treatment_id = tt.id
        WHERE p.patient_id = ?
        ORDER BY p.payment_date DESC
      `
    } else {
      // Use simplified query without tooth_treatments join
      query = `
        SELECT
          p.*,
          pt.full_name as patient_name,
          pt.full_name as patient_full_name,
          pt.phone as patient_phone,
          pt.email as patient_email,
          a.title as appointment_title,
          a.start_time as appointment_start_time,
          a.end_time as appointment_end_time
        FROM payments p
        LEFT JOIN patients pt ON p.patient_id = pt.id
        LEFT JOIN appointments a ON p.appointment_id = a.id
        WHERE p.patient_id = ?
        ORDER BY p.payment_date DESC
      `
    }

    const stmt = this.db.prepare(query)
    const payments = stmt.all(patientId) as any[]
    console.log('📊 [DEBUG] Raw payments from database for patient:', payments.length)

    // Transform the data to include patient and appointment objects
    return payments.map(payment => ({
      ...payment,
      patient: payment.patient_id ? {
        id: payment.patient_id,
        full_name: payment.patient_full_name,
        first_name: payment.patient_full_name?.split(' ')[0] || '',
        last_name: payment.patient_full_name?.split(' ').slice(1).join(' ') || '',
        phone: payment.patient_phone,
        email: payment.patient_email
      } : null,
      appointment: payment.appointment_id ? {
        id: payment.appointment_id,
        title: payment.appointment_title,
        start_time: payment.appointment_start_time,
        end_time: payment.appointment_end_time
      } : null,
      // Include treatment information if available
      treatment: hasToothTreatmentId && payment.tooth_treatment_id ? {
        id: payment.tooth_treatment_id,
        treatment_type: payment.treatment_name,
        tooth_number: payment.tooth_number,
        tooth_name: payment.tooth_name,
        cost: payment.treatment_cost
      } : null
    }))
  }

  // Treatment operations
  async getAllTreatments(): Promise<Treatment[]> {
    const stmt = this.db.prepare('SELECT * FROM treatments ORDER BY name')
    return stmt.all() as Treatment[]
  }

  async searchTreatments(query: string): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT
        tt.*,
        p.full_name as patient_name,
        p.phone as patient_phone,
        p.email as patient_email
      FROM tooth_treatments tt
      LEFT JOIN patients p ON tt.patient_id = p.id
      WHERE
        tt.treatment_type LIKE ? OR
        tt.tooth_name LIKE ? OR
        tt.notes LIKE ? OR
        p.full_name LIKE ?
      ORDER BY tt.created_at DESC
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm) as any[]
  }

  async createTreatment(treatment: Omit<Treatment, 'id' | 'created_at' | 'updated_at'>): Promise<Treatment> {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO treatments (
        id, name, description, default_cost, duration_minutes, category, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, treatment.name, treatment.description, treatment.default_cost,
      treatment.duration_minutes, treatment.category, now, now
    )

    return { ...treatment, id, created_at: now, updated_at: now }
  }

  async updateTreatment(id: string, treatment: Partial<Treatment>): Promise<Treatment> {
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE treatments SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        default_cost = COALESCE(?, default_cost),
        duration_minutes = COALESCE(?, duration_minutes),
        category = COALESCE(?, category),
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      treatment.name, treatment.description, treatment.default_cost,
      treatment.duration_minutes, treatment.category, now, id
    )

    const getStmt = this.db.prepare('SELECT * FROM treatments WHERE id = ?')
    return getStmt.get(id) as Treatment
  }

  async deleteTreatment(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM treatments WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async clearAllTreatments(): Promise<void> {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM treatments').run()

      // Insert default treatments with Arabic names
      const now = new Date().toISOString()
      const insertStmt = this.db.prepare(`
        INSERT INTO treatments (id, name, description, default_cost, duration_minutes, category, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const defaultTreatments = [
        { name: 'فحص عام', description: 'فحص شامل للأسنان واللثة', cost: 100, duration: 30, category: 'العلاجات الوقائية' },
        { name: 'تنظيف الأسنان', description: 'تنظيف وتلميع الأسنان', cost: 150, duration: 45, category: 'العلاجات الوقائية' },
        { name: 'حشو الأسنان', description: 'حشو الأسنان المتضررة', cost: 200, duration: 60, category: 'الترميمية (المحافظة)' },
        { name: 'قلع الأسنان', description: 'إجراء إزالة الأسنان', cost: 200, duration: 45, category: 'العلاجات الجراحية' },
        { name: 'تاج الأسنان', description: 'إجراء تركيب تاج الأسنان', cost: 800, duration: 120, category: 'التعويضات' },
        { name: 'علاج العصب', description: 'علاج عصب الأسنان', cost: 600, duration: 90, category: 'علاج العصب' },
        { name: 'تبييض الأسنان', description: 'تبييض الأسنان المهني', cost: 300, duration: 60, category: 'العلاجات التجميلية' }
      ]

      defaultTreatments.forEach(treatment => {
        insertStmt.run(
          uuidv4(), treatment.name, treatment.description, treatment.cost,
          treatment.duration, treatment.category, now, now
        )
      })
    })

    transaction()
  }

  // Inventory operations
  async getAllInventoryItems(): Promise<InventoryItem[]> {
    const stmt = this.db.prepare('SELECT * FROM inventory ORDER BY name')
    return stmt.all() as InventoryItem[]
  }

  async createInventoryItem(item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<InventoryItem> {
    const id = uuidv4()
    const now = new Date().toISOString()

    try {
      console.log('📦 Creating inventory item:', {
        name: item.name,
        category: item.category,
        quantity: item.quantity
      })

      const stmt = this.db.prepare(`
        INSERT INTO inventory (
          id, name, description, category, quantity, unit, cost_per_unit,
          supplier, expiry_date, minimum_stock, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        id, item.name, item.description, item.category, item.quantity,
        item.unit, item.cost_per_unit, item.supplier, item.expiry_date,
        item.minimum_stock, now, now
      )

      console.log('✅ Inventory item created successfully:', { id, changes: result.changes })

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      return { ...item, id, created_at: now, updated_at: now }
    } catch (error) {
      console.error('❌ Failed to create inventory item:', error)
      throw error
    }
  }

  async updateInventoryItem(id: string, item: Partial<InventoryItem>): Promise<InventoryItem> {
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE inventory SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        quantity = COALESCE(?, quantity),
        unit = COALESCE(?, unit),
        cost_per_unit = COALESCE(?, cost_per_unit),
        supplier = COALESCE(?, supplier),
        expiry_date = COALESCE(?, expiry_date),
        minimum_stock = COALESCE(?, minimum_stock),
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      item.name, item.description, item.category, item.quantity,
      item.unit, item.cost_per_unit, item.supplier, item.expiry_date,
      item.minimum_stock, now, id
    )

    const getStmt = this.db.prepare('SELECT * FROM inventory WHERE id = ?')
    return getStmt.get(id) as InventoryItem
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM inventory WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async searchInventoryItems(query: string): Promise<InventoryItem[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM inventory
      WHERE name LIKE ? OR description LIKE ? OR category LIKE ? OR supplier LIKE ?
      ORDER BY name
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm) as InventoryItem[]
  }

  async clearAllInventoryItems(): Promise<void> {
    this.db.prepare('DELETE FROM inventory').run()
  }

  // Inventory Usage operations
  async getAllInventoryUsage(): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT
        iu.*,
        i.name as inventory_name,
        i.unit as inventory_unit
      FROM inventory_usage iu
      LEFT JOIN inventory i ON iu.inventory_id = i.id
      ORDER BY iu.usage_date DESC
    `)
    return stmt.all()
  }

  async createInventoryUsage(usage: any): Promise<any> {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO inventory_usage (
        id, inventory_id, appointment_id, quantity_used, usage_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, usage.inventory_id, usage.appointment_id, usage.quantity_used,
      usage.usage_date || now, usage.notes
    )

    // Update inventory quantity
    const updateInventoryStmt = this.db.prepare(`
      UPDATE inventory SET quantity = quantity - ? WHERE id = ?
    `)
    updateInventoryStmt.run(usage.quantity_used, usage.inventory_id)

    return { ...usage, id, usage_date: usage.usage_date || now }
  }

  async getInventoryUsageByItem(itemId: string): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT
        iu.*,
        i.name as inventory_name,
        i.unit as inventory_unit
      FROM inventory_usage iu
      LEFT JOIN inventory i ON iu.inventory_id = i.id
      WHERE iu.inventory_id = ?
      ORDER BY iu.usage_date DESC
    `)
    return stmt.all(itemId)
  }

  async getInventoryUsageByAppointment(appointmentId: string): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT
        iu.*,
        i.name as inventory_name,
        i.unit as inventory_unit
      FROM inventory_usage iu
      LEFT JOIN inventory i ON iu.inventory_id = i.id
      WHERE iu.appointment_id = ?
      ORDER BY iu.usage_date DESC
    `)
    return stmt.all(appointmentId)
  }

  // Patient Images operations
  async getAllPatientImages(): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT
        pi.*,
        p.first_name || ' ' || p.last_name as patient_name
      FROM patient_images pi
      LEFT JOIN patients p ON pi.patient_id = p.id
      ORDER BY pi.taken_date DESC
    `)
    return stmt.all()
  }

  async createPatientImage(image: any): Promise<any> {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO patient_images (
        id, patient_id, appointment_id, image_path, image_type, description, taken_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, image.patient_id, image.appointment_id, image.image_path,
      image.image_type, image.description, image.taken_date || now, now
    )

    return { ...image, id, taken_date: image.taken_date || now, created_at: now }
  }

  async getPatientImagesByPatient(patientId: string): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM patient_images
      WHERE patient_id = ?
      ORDER BY taken_date DESC
    `)
    return stmt.all(patientId)
  }

  async deletePatientImage(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM patient_images WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // Installment Payments operations
  async getAllInstallmentPayments(): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT
        ip.*,
        p.receipt_number as payment_receipt,
        pt.first_name || ' ' || pt.last_name as patient_name
      FROM installment_payments ip
      LEFT JOIN payments p ON ip.payment_id = p.id
      LEFT JOIN patients pt ON p.patient_id = pt.id
      ORDER BY ip.due_date
    `)
    return stmt.all()
  }

  async createInstallmentPayment(installment: any): Promise<any> {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO installment_payments (
        id, payment_id, installment_number, amount, due_date, paid_date, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, installment.payment_id, installment.installment_number, installment.amount,
      installment.due_date, installment.paid_date, installment.status || 'pending', now, now
    )

    return { ...installment, id, created_at: now, updated_at: now }
  }

  async updateInstallmentPayment(id: string, installment: any): Promise<any> {
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE installment_payments SET
        amount = COALESCE(?, amount),
        due_date = COALESCE(?, due_date),
        paid_date = COALESCE(?, paid_date),
        status = COALESCE(?, status),
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      installment.amount, installment.due_date, installment.paid_date,
      installment.status, now, id
    )

    const getStmt = this.db.prepare('SELECT * FROM installment_payments WHERE id = ?')
    return getStmt.get(id)
  }

  async getInstallmentPaymentsByPayment(paymentId: string): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM installment_payments
      WHERE payment_id = ?
      ORDER BY installment_number
    `)
    return stmt.all(paymentId)
  }

  // Clear operations (matching LowDB functionality)
  async clearAllPatients(): Promise<void> {
    const transaction = this.db.transaction(() => {
      // Delete related data first due to foreign key constraints
      this.db.prepare('DELETE FROM patient_images').run()
      this.db.prepare('DELETE FROM inventory_usage').run()
      this.db.prepare('DELETE FROM installment_payments').run()
      this.db.prepare('DELETE FROM payments').run()
      this.db.prepare('DELETE FROM appointments').run()
      this.db.prepare('DELETE FROM patients').run()
    })
    transaction()
  }

  async clearAllAppointments(): Promise<void> {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM inventory_usage').run()
      this.db.prepare('DELETE FROM installment_payments').run()
      this.db.prepare('DELETE FROM payments').run()
      this.db.prepare('DELETE FROM appointments').run()
    })
    transaction()
  }

  async clearAllPayments(): Promise<void> {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM installment_payments').run()
      this.db.prepare('DELETE FROM payments').run()
    })
    transaction()
  }

  // Enhanced transaction management for complex operations
  async executeTransaction<T>(operations: () => T, errorMessage?: string): Promise<T> {
    const transaction = this.db.transaction(operations)
    try {
      const result = transaction()
      console.log('✅ Transaction completed successfully')
      return result
    } catch (error) {
      const message = errorMessage || 'Transaction failed'
      console.error(`❌ ${message}:`, error)
      throw new Error(`${message}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Enhanced error handling with detailed logging
  async safeExecute<T>(operation: () => T, errorMessage: string, context?: any): Promise<T> {
    try {
      return operation()
    } catch (error) {
      console.error(`❌ ${errorMessage}:`, error)
      if (context) {
        console.error('Context:', context)
      }
      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Data integrity validation
  async validateDataIntegrity(): Promise<{isValid: boolean, issues: string[]}> {
    const issues: string[] = []

    try {
      // Check for orphaned appointments (appointments without valid patients)
      const orphanedAppointments = this.db.prepare(`
        SELECT COUNT(*) as count FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        WHERE p.id IS NULL
      `).get() as { count: number }

      if (orphanedAppointments.count > 0) {
        issues.push(`Found ${orphanedAppointments.count} appointments without valid patients`)
      }

      // Check for orphaned payments (payments without valid patients)
      const orphanedPayments = this.db.prepare(`
        SELECT COUNT(*) as count FROM payments p
        LEFT JOIN patients pt ON p.patient_id = pt.id
        WHERE pt.id IS NULL
      `).get() as { count: number }

      if (orphanedPayments.count > 0) {
        issues.push(`Found ${orphanedPayments.count} payments without valid patients`)
      }

      // Check for orphaned installment payments
      const orphanedInstallments = this.db.prepare(`
        SELECT COUNT(*) as count FROM installment_payments ip
        LEFT JOIN payments p ON ip.payment_id = p.id
        WHERE p.id IS NULL
      `).get() as { count: number }

      if (orphanedInstallments.count > 0) {
        issues.push(`Found ${orphanedInstallments.count} installment payments without valid payments`)
      }

      // Check for orphaned patient images
      const orphanedImages = this.db.prepare(`
        SELECT COUNT(*) as count FROM patient_images pi
        LEFT JOIN patients p ON pi.patient_id = p.id
        WHERE p.id IS NULL
      `).get() as { count: number }

      if (orphanedImages.count > 0) {
        issues.push(`Found ${orphanedImages.count} patient images without valid patients`)
      }

      // Check for orphaned inventory usage
      const orphanedUsage = this.db.prepare(`
        SELECT COUNT(*) as count FROM inventory_usage iu
        LEFT JOIN inventory i ON iu.inventory_id = i.id
        WHERE i.id IS NULL
      `).get() as { count: number }

      if (orphanedUsage.count > 0) {
        issues.push(`Found ${orphanedUsage.count} inventory usage records without valid inventory items`)
      }

      console.log(`🔍 Data integrity check completed. Issues found: ${issues.length}`)
      return { isValid: issues.length === 0, issues }

    } catch (error) {
      console.error('❌ Data integrity validation failed:', error)
      issues.push('Failed to validate data integrity')
      return { isValid: false, issues }
    }
  }

  // Clean up orphaned data
  async cleanupOrphanedData(): Promise<{cleaned: boolean, summary: string[]}> {
    const summary: string[] = []

    try {
      const transaction = this.db.transaction(() => {
        // Clean orphaned installment payments
        const deletedInstallments = this.db.prepare(`
          DELETE FROM installment_payments
          WHERE payment_id NOT IN (SELECT id FROM payments)
        `).run()

        if (deletedInstallments.changes > 0) {
          summary.push(`Cleaned ${deletedInstallments.changes} orphaned installment payments`)
        }

        // Clean orphaned patient images
        const deletedImages = this.db.prepare(`
          DELETE FROM patient_images
          WHERE patient_id NOT IN (SELECT id FROM patients)
        `).run()

        if (deletedImages.changes > 0) {
          summary.push(`Cleaned ${deletedImages.changes} orphaned patient images`)
        }

        // Clean orphaned inventory usage
        const deletedUsage = this.db.prepare(`
          DELETE FROM inventory_usage
          WHERE inventory_id NOT IN (SELECT id FROM inventory)
        `).run()

        if (deletedUsage.changes > 0) {
          summary.push(`Cleaned ${deletedUsage.changes} orphaned inventory usage records`)
        }
      })

      transaction()
      console.log('✅ Orphaned data cleanup completed')
      return { cleaned: true, summary }

    } catch (error) {
      console.error('❌ Orphaned data cleanup failed:', error)
      return { cleaned: false, summary: ['Failed to cleanup orphaned data'] }
    }
  }

  // Enhanced complex operations with transactions
  async createAppointmentWithPayment(
    appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>,
    paymentData?: Omit<Payment, 'id' | 'appointment_id' | 'created_at' | 'updated_at'>
  ): Promise<{appointment: Appointment, payment?: Payment}> {
    return this.executeTransaction(() => {
      // Create appointment first
      const appointment = this.createAppointmentSync(appointmentData)

      let payment: Payment | undefined
      if (paymentData) {
        // Create payment linked to appointment
        payment = this.createPaymentSync({
          ...paymentData,
          appointment_id: appointment.id
        })
      }

      return { appointment, payment }
    }, 'Failed to create appointment with payment')
  }

  async deletePatientWithAllData(patientId: string): Promise<{success: boolean, deletedCounts: any}> {
    return this.executeTransaction(() => {
      const deletedCounts = {
        patient_images: 0,
        inventory_usage: 0,
        installment_payments: 0,
        payments: 0,
        appointments: 0,
        patient: 0
      }

      // Delete in correct order due to foreign key constraints
      deletedCounts.patient_images = this.db.prepare('DELETE FROM patient_images WHERE patient_id = ?').run(patientId).changes
      deletedCounts.inventory_usage = this.db.prepare('DELETE FROM inventory_usage WHERE appointment_id IN (SELECT id FROM appointments WHERE patient_id = ?)').run(patientId).changes
      deletedCounts.installment_payments = this.db.prepare('DELETE FROM installment_payments WHERE payment_id IN (SELECT id FROM payments WHERE patient_id = ?)').run(patientId).changes
      deletedCounts.payments = this.db.prepare('DELETE FROM payments WHERE patient_id = ?').run(patientId).changes
      deletedCounts.appointments = this.db.prepare('DELETE FROM appointments WHERE patient_id = ?').run(patientId).changes
      deletedCounts.patient = this.db.prepare('DELETE FROM patients WHERE id = ?').run(patientId).changes

      return { success: true, deletedCounts }
    }, 'Failed to delete patient with all data')
  }

  // Synchronous versions for use within transactions
  private createAppointmentSync(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Appointment {
    const id = uuidv4()
    const now = new Date().toISOString()

    // Validate patient_id exists
    if (!appointment.patient_id) {
      throw new Error('Patient ID is required')
    }

    const patientCheck = this.db.prepare('SELECT id FROM patients WHERE id = ?')
    const patientExists = patientCheck.get(appointment.patient_id)
    if (!patientExists) {
      throw new Error(`Patient with ID '${appointment.patient_id}' does not exist`)
    }

    // Validate treatment_id if provided
    const treatmentId = appointment.treatment_id && appointment.treatment_id.trim() !== '' ? appointment.treatment_id : null
    if (treatmentId) {
      const treatmentCheck = this.db.prepare('SELECT id FROM treatments WHERE id = ?')
      const treatmentExists = treatmentCheck.get(treatmentId)
      if (!treatmentExists) {
        throw new Error(`Treatment with ID '${treatmentId}' does not exist`)
      }
    }

    const stmt = this.db.prepare(`
      INSERT INTO appointments (
        id, patient_id, treatment_id, title, description, start_time, end_time,
        status, cost, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, appointment.patient_id, treatmentId, appointment.title,
      appointment.description, appointment.start_time, appointment.end_time,
      appointment.status || 'scheduled', appointment.cost, appointment.notes, now, now
    )

    return { ...appointment, id, treatment_id: treatmentId, created_at: now, updated_at: now }
  }

  private createPaymentSync(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Payment {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO payments (
        id, patient_id, appointment_id, amount, payment_method, payment_date,
        status, description, receipt_number, notes, discount_amount, tax_amount,
        total_amount, total_amount_due, amount_paid, remaining_balance, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const amount = payment.amount || 0  // استخدام 0 كقيمة افتراضية إذا كان amount فارغ
    const totalAmount = payment.total_amount || amount
    const totalAmountDue = payment.total_amount_due || totalAmount
    const amountPaid = payment.amount_paid || amount
    const remainingBalance = totalAmountDue - amountPaid

    stmt.run(
      id, payment.patient_id, payment.appointment_id, amount,
      payment.payment_method, payment.payment_date, payment.status || 'completed',
      payment.description, payment.receipt_number, payment.notes,
      payment.discount_amount || 0, payment.tax_amount || 0,
      totalAmount, totalAmountDue, amountPaid, remainingBalance, now, now
    )

    return {
      ...payment,
      id,
      amount,
      total_amount: totalAmount,
      total_amount_due: totalAmountDue,
      amount_paid: amountPaid,
      remaining_balance: remainingBalance,
      created_at: now,
      updated_at: now
    }
  }

  // Batch operations for better performance
  async batchCreatePatients(patients: Omit<Patient, 'id' | 'created_at' | 'updated_at'>[]): Promise<Patient[]> {
    return this.executeTransaction(() => {
      const stmt = this.db.prepare(`
        INSERT INTO patients (
          id, first_name, last_name, date_of_birth, phone, email, address,
          emergency_contact_name, emergency_contact_phone, medical_history,
          allergies, insurance_info, notes, profile_image, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const now = new Date().toISOString()
      return patients.map(patient => {
        const id = uuidv4()
        stmt.run(
          id, patient.first_name, patient.last_name, patient.date_of_birth,
          patient.phone, patient.email, patient.address, patient.emergency_contact_name,
          patient.emergency_contact_phone, patient.medical_history, patient.allergies,
          patient.insurance_info, patient.notes, patient.profile_image, now, now
        )
        return { ...patient, id, created_at: now, updated_at: now }
      })
    }, 'Failed to batch create patients')
  }

  async batchCreateAppointments(appointments: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>[]): Promise<Appointment[]> {
    const transaction = this.db.transaction(() => {
      const stmt = this.db.prepare(`
        INSERT INTO appointments (
          id, patient_id, treatment_id, title, description, start_time, end_time,
          status, cost, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const now = new Date().toISOString()
      return appointments.map(appointment => {
        const id = uuidv4()
        stmt.run(
          id, appointment.patient_id, appointment.treatment_id, appointment.title,
          appointment.description, appointment.start_time, appointment.end_time,
          appointment.status, appointment.cost, appointment.notes, now, now
        )
        return { ...appointment, id, created_at: now, updated_at: now }
      })
    })

    return transaction()
  }

  // Enhanced backup and restore operations
  async createBackup(backupPath?: string): Promise<{success: boolean, path?: string, message: string}> {
    try {
      if (!backupPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        backupPath = join(app.getPath('userData'), `backup_${timestamp}.db`)
      }

      // Validate data integrity before backup
      const integrityCheck = await this.validateDataIntegrity()
      if (!integrityCheck.isValid) {
        console.warn('⚠️ Data integrity issues found before backup:', integrityCheck.issues)
      }

      // Create backup using SQLite backup API
      const backupDb = new Database(backupPath)
      const backup = backupDb.backup(this.db.name)
      backup.step(-1) // Copy all pages
      backup.finish()
      backupDb.close()

      console.log('✅ Database backup created successfully:', backupPath)
      return {
        success: true,
        path: backupPath,
        message: `Backup created successfully at ${backupPath}`
      }

    } catch (error) {
      console.error('❌ Backup creation failed:', error)
      return {
        success: false,
        message: `Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  async restoreFromBackup(backupPath: string): Promise<{success: boolean, message: string}> {
    try {
      // Validate backup file exists
      if (!require('fs').existsSync(backupPath)) {
        throw new Error('Backup file does not exist')
      }

      // Create a backup of current database before restore
      const currentBackupResult = await this.createBackup()
      if (!currentBackupResult.success) {
        throw new Error('Failed to create current database backup before restore')
      }

      // Close current database
      this.close()

      // Copy backup file to current database location
      const currentDbPath = join(app.getPath('userData'), 'dental_clinic.db')
      require('fs').copyFileSync(backupPath, currentDbPath)

      // Reinitialize database
      this.db = new Database(currentDbPath)
      this.initializeDatabase()

      console.log('✅ Database restored successfully from:', backupPath)
      return {
        success: true,
        message: `Database restored successfully from ${backupPath}`
      }

    } catch (error) {
      console.error('❌ Database restore failed:', error)
      return {
        success: false,
        message: `Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Database health check
  async performHealthCheck(): Promise<{healthy: boolean, issues: string[], recommendations: string[]}> {
    const issues: string[] = []
    const recommendations: string[] = []

    try {
      // Check database file integrity
      const integrityCheck = this.db.pragma('integrity_check')
      if (integrityCheck !== 'ok') {
        issues.push('Database file integrity check failed')
        recommendations.push('Consider running database repair or restore from backup')
      }

      // Check foreign key constraints
      const foreignKeyCheck = this.db.pragma('foreign_key_check')
      if (foreignKeyCheck.length > 0) {
        issues.push(`Found ${foreignKeyCheck.length} foreign key constraint violations`)
        recommendations.push('Run data cleanup to fix foreign key violations')
      }

      // Check data integrity
      const dataIntegrity = await this.validateDataIntegrity()
      if (!dataIntegrity.isValid) {
        issues.push(...dataIntegrity.issues)
        recommendations.push('Run orphaned data cleanup')
      }

      // Check database size and performance
      const dbStats = this.db.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type = "table"').get() as { count: number }
      if (dbStats.count === 0) {
        issues.push('No tables found in database')
        recommendations.push('Reinitialize database schema')
      }

      console.log(`🏥 Database health check completed. Issues: ${issues.length}`)
      return {
        healthy: issues.length === 0,
        issues,
        recommendations
      }

    } catch (error) {
      console.error('❌ Health check failed:', error)
      return {
        healthy: false,
        issues: ['Health check failed to complete'],
        recommendations: ['Check database connection and file permissions']
      }
    }
  }

  // Lab operations
  async getAllLabs(): Promise<Lab[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM labs
      ORDER BY name
    `)
    return stmt.all() as Lab[]
  }

  async createLab(lab: Omit<Lab, 'id' | 'created_at' | 'updated_at'>): Promise<Lab> {
    const id = uuidv4()
    const now = new Date().toISOString()

    try {
      console.log('🧪 Creating lab:', {
        name: lab.name,
        contact_info: lab.contact_info,
        address: lab.address
      })

      const stmt = this.db.prepare(`
        INSERT INTO labs (
          id, name, contact_info, address, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        id, lab.name, lab.contact_info, lab.address, now, now
      )

      console.log('✅ Lab created successfully:', { id, changes: result.changes })

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      return { ...lab, id, created_at: now, updated_at: now }
    } catch (error) {
      console.error('❌ Failed to create lab:', error)
      throw error
    }
  }

  async updateLab(id: string, lab: Partial<Lab>): Promise<Lab> {
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE labs SET
        name = COALESCE(?, name),
        contact_info = COALESCE(?, contact_info),
        address = COALESCE(?, address),
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      lab.name, lab.contact_info, lab.address, now, id
    )

    const getStmt = this.db.prepare('SELECT * FROM labs WHERE id = ?')
    return getStmt.get(id) as Lab
  }

  async deleteLab(id: string): Promise<boolean> {
    try {
      console.log(`🗑️ Starting deletion for lab: ${id}`)

      // Check if lab has any orders
      const ordersCheck = this.db.prepare('SELECT COUNT(*) as count FROM lab_orders WHERE lab_id = ?')
      const ordersCount = ordersCheck.get(id) as { count: number }

      if (ordersCount.count > 0) {
        console.warn(`⚠️ Lab ${id} has ${ordersCount.count} orders. Deleting lab will cascade delete orders.`)
      }

      // Delete lab (will cascade delete orders due to foreign key constraint)
      const stmt = this.db.prepare('DELETE FROM labs WHERE id = ?')
      const result = stmt.run(id)

      console.log(`✅ Lab ${id} deleted successfully. Affected rows: ${result.changes}`)

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      return result.changes > 0
    } catch (error) {
      console.error(`❌ Failed to delete lab ${id}:`, error)
      throw new Error(`Failed to delete lab: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async searchLabs(query: string): Promise<Lab[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM labs
      WHERE name LIKE ? OR contact_info LIKE ? OR address LIKE ?
      ORDER BY name
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm) as Lab[]
  }

  // Lab order operations
  async getAllLabOrders(): Promise<LabOrder[]> {
    const stmt = this.db.prepare(`
      SELECT
        lo.*,
        l.name as lab_name,
        l.contact_info as lab_contact_info,
        l.address as lab_address,
        p.full_name as patient_name,
        p.phone as patient_phone,
        p.gender as patient_gender
      FROM lab_orders lo
      LEFT JOIN labs l ON lo.lab_id = l.id
      LEFT JOIN patients p ON lo.patient_id = p.id
      ORDER BY lo.order_date DESC
    `)
    const labOrders = stmt.all() as any[]

    // Add lab and patient objects for compatibility
    return labOrders.map(order => {
      const labOrder: LabOrder = {
        id: order.id,
        lab_id: order.lab_id,
        patient_id: order.patient_id,
        service_name: order.service_name,
        cost: order.cost,
        order_date: order.order_date,
        status: order.status,
        notes: order.notes,
        paid_amount: order.paid_amount,
        remaining_balance: order.remaining_balance,
        created_at: order.created_at,
        updated_at: order.updated_at
      }

      if (order.lab_name) {
        labOrder.lab = {
          id: order.lab_id,
          name: order.lab_name,
          contact_info: order.lab_contact_info,
          address: order.lab_address,
          created_at: '',
          updated_at: ''
        }
      }

      if (order.patient_name) {
        labOrder.patient = {
          id: order.patient_id,
          full_name: order.patient_name,
          phone: order.patient_phone,
          gender: order.patient_gender
        } as any
      }

      return labOrder
    })
  }

  async createLabOrder(labOrder: Omit<LabOrder, 'id' | 'created_at' | 'updated_at'>): Promise<LabOrder> {
    const id = uuidv4()
    const now = new Date().toISOString()

    try {
      // Validate lab_id exists (required)
      if (!labOrder.lab_id) {
        throw new Error('Lab ID is required')
      }

      const labCheck = this.db.prepare('SELECT id FROM labs WHERE id = ?')
      const labExists = labCheck.get(labOrder.lab_id)
      if (!labExists) {
        throw new Error(`Lab with ID '${labOrder.lab_id}' does not exist`)
      }

      // Validate patient_id exists (if provided)
      if (labOrder.patient_id) {
        const patientCheck = this.db.prepare('SELECT id FROM patients WHERE id = ?')
        const patientExists = patientCheck.get(labOrder.patient_id)
        if (!patientExists) {
          throw new Error(`Patient with ID '${labOrder.patient_id}' does not exist`)
        }
      }

      console.log('🧪 Creating lab order:', {
        lab_id: labOrder.lab_id,
        patient_id: labOrder.patient_id,
        service_name: labOrder.service_name,
        cost: labOrder.cost,
        status: labOrder.status
      })

      const stmt = this.db.prepare(`
        INSERT INTO lab_orders (
          id, lab_id, patient_id, appointment_id, tooth_treatment_id, tooth_number,
          service_name, cost, order_date, expected_delivery_date, actual_delivery_date,
          status, notes, paid_amount, remaining_balance, priority, lab_instructions,
          material_type, color_shade, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        id, labOrder.lab_id, labOrder.patient_id, labOrder.appointment_id,
        labOrder.tooth_treatment_id, labOrder.tooth_number, labOrder.service_name,
        labOrder.cost, labOrder.order_date, labOrder.expected_delivery_date,
        labOrder.actual_delivery_date, labOrder.status, labOrder.notes,
        labOrder.paid_amount || 0, labOrder.remaining_balance || labOrder.cost,
        labOrder.priority || 1, labOrder.lab_instructions, labOrder.material_type,
        labOrder.color_shade, now, now
      )

      console.log('✅ Lab order created successfully:', { id, changes: result.changes })

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      return { ...labOrder, id, created_at: now, updated_at: now }
    } catch (error) {
      console.error('❌ Failed to create lab order:', error)
      throw error
    }
  }

  async updateLabOrder(id: string, labOrder: Partial<LabOrder>): Promise<LabOrder> {
    try {
      console.log(`🔄 [DB] Updating lab order: ${id}`, labOrder)

      const now = new Date().toISOString()

      // Check if the lab order exists first
      const checkStmt = this.db.prepare('SELECT id FROM lab_orders WHERE id = ?')
      const existingOrder = checkStmt.get(id)

      if (!existingOrder) {
        throw new Error(`Lab order with id ${id} not found`)
      }

      const stmt = this.db.prepare(`
        UPDATE lab_orders SET
          lab_id = COALESCE(?, lab_id),
          patient_id = COALESCE(?, patient_id),
          appointment_id = COALESCE(?, appointment_id),
          tooth_treatment_id = COALESCE(?, tooth_treatment_id),
          tooth_number = COALESCE(?, tooth_number),
          service_name = COALESCE(?, service_name),
          cost = COALESCE(?, cost),
          order_date = COALESCE(?, order_date),
          expected_delivery_date = COALESCE(?, expected_delivery_date),
          actual_delivery_date = COALESCE(?, actual_delivery_date),
          status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          paid_amount = COALESCE(?, paid_amount),
          remaining_balance = COALESCE(?, remaining_balance),
          priority = COALESCE(?, priority),
          lab_instructions = COALESCE(?, lab_instructions),
          material_type = COALESCE(?, material_type),
          color_shade = COALESCE(?, color_shade),
          updated_at = ?
        WHERE id = ?
      `)

      const result = stmt.run(
        labOrder.lab_id, labOrder.patient_id, labOrder.appointment_id,
        labOrder.tooth_treatment_id, labOrder.tooth_number, labOrder.service_name,
        labOrder.cost, labOrder.order_date, labOrder.expected_delivery_date,
        labOrder.actual_delivery_date, labOrder.status, labOrder.notes,
        labOrder.paid_amount, labOrder.remaining_balance, labOrder.priority,
        labOrder.lab_instructions, labOrder.material_type, labOrder.color_shade,
        now, id
      )

      console.log(`✅ [DB] Lab order ${id} updated successfully. Affected rows: ${result.changes}`)

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      const getStmt = this.db.prepare('SELECT * FROM lab_orders WHERE id = ?')
      const updatedOrder = getStmt.get(id) as LabOrder

      console.log(`📋 [DB] Updated lab order data:`, updatedOrder)

      return updatedOrder
    } catch (error) {
      console.error(`❌ [DB] Failed to update lab order ${id}:`, error)
      throw new Error(`Failed to update lab order: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async deleteLabOrder(id: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting lab order: ${id}`)

      const stmt = this.db.prepare('DELETE FROM lab_orders WHERE id = ?')
      const result = stmt.run(id)

      console.log(`✅ Lab order ${id} deleted successfully. Affected rows: ${result.changes}`)

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      return result.changes > 0
    } catch (error) {
      console.error(`❌ Failed to delete lab order ${id}:`, error)
      throw new Error(`Failed to delete lab order: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async searchLabOrders(query: string): Promise<LabOrder[]> {
    const stmt = this.db.prepare(`
      SELECT
        lo.*,
        l.name as lab_name,
        p.full_name as patient_name
      FROM lab_orders lo
      LEFT JOIN labs l ON lo.lab_id = l.id
      LEFT JOIN patients p ON lo.patient_id = p.id
      WHERE lo.service_name LIKE ? OR l.name LIKE ? OR p.full_name LIKE ? OR lo.notes LIKE ?
      ORDER BY lo.order_date DESC
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm) as LabOrder[]
  }

  // Settings operations
  async getSettings(): Promise<ClinicSettings> {
    const stmt = this.db.prepare('SELECT * FROM settings WHERE id = ?')
    return stmt.get('clinic_settings') as ClinicSettings
  }

  async updateSettings(settings: Partial<ClinicSettings>): Promise<ClinicSettings> {
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE settings SET
        clinic_name = COALESCE(?, clinic_name),
        doctor_name = COALESCE(?, doctor_name),
        clinic_address = COALESCE(?, clinic_address),
        clinic_phone = COALESCE(?, clinic_phone),
        clinic_email = COALESCE(?, clinic_email),
        clinic_logo = COALESCE(?, clinic_logo),
        currency = COALESCE(?, currency),
        language = COALESCE(?, language),
        timezone = COALESCE(?, timezone),
        backup_frequency = COALESCE(?, backup_frequency),
        auto_save_interval = COALESCE(?, auto_save_interval),
        appointment_duration = COALESCE(?, appointment_duration),
        working_hours_start = COALESCE(?, working_hours_start),
        working_hours_end = COALESCE(?, working_hours_end),
        working_days = COALESCE(?, working_days),
        app_password = COALESCE(?, app_password),
        password_enabled = COALESCE(?, password_enabled),
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      settings.clinic_name, settings.doctor_name, settings.clinic_address, settings.clinic_phone,
      settings.clinic_email, settings.clinic_logo, settings.currency,
      settings.language, settings.timezone, settings.backup_frequency,
      settings.auto_save_interval, settings.appointment_duration,
      settings.working_hours_start, settings.working_hours_end,
      settings.working_days, settings.app_password, settings.password_enabled, now, 'clinic_settings'
    )

    return this.getSettings()
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<DashboardStats> {
    const totalPatients = this.db.prepare('SELECT COUNT(*) as count FROM patients').get() as { count: number }
    const totalAppointments = this.db.prepare('SELECT COUNT(*) as count FROM appointments').get() as { count: number }
    const totalRevenue = this.db.prepare('SELECT SUM(amount) as total FROM payments WHERE status = "completed"').get() as { total: number }
    const pendingPayments = this.db.prepare('SELECT COUNT(*) as count FROM payments WHERE status = "pending"').get() as { count: number }

    const today = new Date().toISOString().split('T')[0]
    const todayAppointments = this.db.prepare('SELECT COUNT(*) as count FROM appointments WHERE DATE(start_time) = ?').get(today) as { count: number }

    const thisMonth = new Date().toISOString().slice(0, 7)
    const thisMonthRevenue = this.db.prepare('SELECT SUM(amount) as total FROM payments WHERE status = "completed" AND strftime("%Y-%m", payment_date) = ?').get(thisMonth) as { total: number }

    const lowStockItems = this.db.prepare('SELECT COUNT(*) as count FROM inventory WHERE quantity <= minimum_stock').get() as { count: number }

    return {
      total_patients: totalPatients.count,
      total_appointments: totalAppointments.count,
      total_revenue: totalRevenue.total || 0,
      pending_payments: pendingPayments.count,
      today_appointments: todayAppointments.count,
      this_month_revenue: thisMonthRevenue.total || 0,
      low_stock_items: lowStockItems.count
    }
  }



  // NEW: Multiple treatments per tooth operations
  async getAllToothTreatments(): Promise<any[]> {
    // Ensure the new table exists
    this.ensureToothTreatmentsTableExists()

    const stmt = this.db.prepare(`
      SELECT tt.*,
             p.full_name as patient_name,
             a.title as appointment_title
      FROM tooth_treatments tt
      LEFT JOIN patients p ON tt.patient_id = p.id
      LEFT JOIN appointments a ON tt.appointment_id = a.id
      ORDER BY tt.patient_id, tt.tooth_number, tt.priority ASC
    `)
    return stmt.all()
  }

  async getToothTreatmentsByPatient(patientId: string): Promise<any[]> {
    this.ensureToothTreatmentsTableExists()

    const stmt = this.db.prepare(`
      SELECT tt.*,
             p.full_name as patient_name,
             a.title as appointment_title
      FROM tooth_treatments tt
      LEFT JOIN patients p ON tt.patient_id = p.id
      LEFT JOIN appointments a ON tt.appointment_id = a.id
      WHERE tt.patient_id = ?
      ORDER BY tt.tooth_number ASC, tt.priority ASC
    `)
    return stmt.all(patientId)
  }

  async getToothTreatmentsByTooth(patientId: string, toothNumber: number): Promise<any[]> {
    this.ensureToothTreatmentsTableExists()

    const stmt = this.db.prepare(`
      SELECT tt.*,
             p.full_name as patient_name,
             a.title as appointment_title
      FROM tooth_treatments tt
      LEFT JOIN patients p ON tt.patient_id = p.id
      LEFT JOIN appointments a ON tt.appointment_id = a.id
      WHERE tt.patient_id = ? AND tt.tooth_number = ?
      ORDER BY tt.priority ASC, tt.created_at DESC
    `)
    return stmt.all(patientId, toothNumber)
  }



  // NEW: Create multiple treatment for a tooth
  async createToothTreatment(treatment: any): Promise<any> {
    this.ensureToothTreatmentsTableExists()

    const id = uuidv4()
    const now = new Date().toISOString()

    // Auto-assign priority if not provided
    if (!treatment.priority) {
      const maxPriorityStmt = this.db.prepare(`
        SELECT COALESCE(MAX(priority), 0) + 1 as next_priority
        FROM tooth_treatments
        WHERE patient_id = ? AND tooth_number = ?
      `)
      const result = maxPriorityStmt.get(treatment.patient_id, treatment.tooth_number) as any
      treatment.priority = result.next_priority
    }

    const stmt = this.db.prepare(`
      INSERT INTO tooth_treatments (
        id, patient_id, tooth_number, tooth_name, treatment_type, treatment_category,
        treatment_status, treatment_color, start_date, completion_date, cost,
        priority, notes, appointment_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, treatment.patient_id, treatment.tooth_number, treatment.tooth_name,
      treatment.treatment_type, treatment.treatment_category, treatment.treatment_status,
      treatment.treatment_color, treatment.start_date, treatment.completion_date,
      treatment.cost, treatment.priority, treatment.notes, treatment.appointment_id,
      now, now
    )

    return { ...treatment, id, created_at: now, updated_at: now }
  }

  // NEW: Update tooth treatment
  async updateToothTreatment(id: string, updates: any): Promise<void> {
    this.ensureToothTreatmentsTableExists()

    const now = new Date().toISOString()

    const allowedColumns = [
      'patient_id', 'tooth_number', 'tooth_name', 'treatment_type', 'treatment_category',
      'treatment_status', 'treatment_color', 'start_date', 'completion_date',
      'cost', 'priority', 'notes', 'appointment_id'
    ]

    const updateColumns = Object.keys(updates).filter(key => allowedColumns.includes(key))

    if (updateColumns.length === 0) {
      throw new Error('No valid columns to update')
    }

    const setClause = updateColumns.map(col => `${col} = ?`).join(', ')
    const values = updateColumns.map(col => updates[col])
    values.push(now, id) // Add updated_at and id for WHERE clause

    const stmt = this.db.prepare(`
      UPDATE tooth_treatments
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values)
  }

  // NEW: Delete tooth treatment
  async deleteToothTreatment(id: string): Promise<void> {
    this.ensureToothTreatmentsTableExists()

    // Start a transaction to ensure data consistency
    const transaction = this.db.transaction(() => {
      // First, delete associated payments
      const deletePaymentsStmt = this.db.prepare('DELETE FROM payments WHERE tooth_treatment_id = ?')
      const paymentsResult = deletePaymentsStmt.run(id)
      console.log(`🗑️ Deleted ${paymentsResult.changes} payments associated with treatment ${id}`)

      // Second, delete associated lab orders (if cascade delete is not working)
      const deleteLabOrdersStmt = this.db.prepare('DELETE FROM lab_orders WHERE tooth_treatment_id = ?')
      const labOrdersResult = deleteLabOrdersStmt.run(id)
      console.log(`🗑️ Deleted ${labOrdersResult.changes} lab orders associated with treatment ${id}`)

      // Finally, delete the tooth treatment
      const deleteTreatmentStmt = this.db.prepare('DELETE FROM tooth_treatments WHERE id = ?')
      const treatmentResult = deleteTreatmentStmt.run(id)
      console.log(`🗑️ Deleted tooth treatment ${id}. Affected rows: ${treatmentResult.changes}`)

      return treatmentResult.changes > 0
    })

    const success = transaction()
    if (!success) {
      throw new Error(`Failed to delete tooth treatment with id: ${id}`)
    }
  }

  // NEW: Reorder tooth treatments priorities
  async reorderToothTreatments(patientId: string, toothNumber: number, treatmentIds: string[]): Promise<void> {
    this.ensureToothTreatmentsTableExists()

    if (!treatmentIds || treatmentIds.length === 0) {
      return
    }

    const transaction = this.db.transaction(() => {
      const now = new Date().toISOString()

      // Get current treatments to preserve other data
      const getCurrentStmt = this.db.prepare(`
        SELECT * FROM tooth_treatments
        WHERE patient_id = ? AND tooth_number = ?
        ORDER BY priority
      `)
      const currentTreatments = getCurrentStmt.all(patientId, toothNumber) as any[]

      // Delete all treatments for this tooth temporarily
      const deleteStmt = this.db.prepare(`
        DELETE FROM tooth_treatments
        WHERE patient_id = ? AND tooth_number = ?
      `)
      deleteStmt.run(patientId, toothNumber)

      // Re-insert treatments in the new order
      const insertStmt = this.db.prepare(`
        INSERT INTO tooth_treatments (
          id, patient_id, tooth_number, tooth_name, treatment_type, treatment_category,
          treatment_color, treatment_status, cost, start_date, completion_date,
          notes, priority, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      treatmentIds.forEach((treatmentId, index) => {
        const treatment = currentTreatments.find(t => t.id === treatmentId)
        if (treatment) {
          insertStmt.run(
            treatment.id,
            treatment.patient_id,
            treatment.tooth_number,
            treatment.tooth_name,
            treatment.treatment_type,
            treatment.treatment_category,
            treatment.treatment_color,
            treatment.treatment_status,
            treatment.cost,
            treatment.start_date,
            treatment.completion_date,
            treatment.notes,
            index + 1, // New priority
            treatment.created_at,
            now // Updated timestamp
          )
        }
      })
    })

    transaction()
  }

  // NEW: Tooth Treatment Images operations
  async getAllToothTreatmentImages(): Promise<any[]> {
    this.ensureToothTreatmentsTableExists()

    const stmt = this.db.prepare(`
      SELECT tti.*,
             tt.tooth_name,
             tt.treatment_type,
             p.full_name as patient_name
      FROM tooth_treatment_images tti
      LEFT JOIN tooth_treatments tt ON tti.tooth_treatment_id = tt.id
      LEFT JOIN patients p ON tti.patient_id = p.id
      ORDER BY tti.created_at DESC
    `)
    return stmt.all()
  }

  async getToothTreatmentImagesByTreatment(treatmentId: string): Promise<any[]> {
    this.ensureToothTreatmentsTableExists()

    const stmt = this.db.prepare(`
      SELECT tti.*,
             tt.tooth_name,
             tt.treatment_type,
             p.full_name as patient_name
      FROM tooth_treatment_images tti
      LEFT JOIN tooth_treatments tt ON tti.tooth_treatment_id = tt.id
      LEFT JOIN patients p ON tti.patient_id = p.id
      WHERE tti.tooth_treatment_id = ?
      ORDER BY tti.image_type, tti.taken_date DESC
    `)
    return stmt.all(treatmentId)
  }

  async getToothTreatmentImagesByTooth(patientId: string, toothNumber: number): Promise<any[]> {
    this.ensureToothTreatmentsTableExists()

    const stmt = this.db.prepare(`
      SELECT tti.*,
             tt.tooth_name,
             tt.treatment_type,
             p.full_name as patient_name
      FROM tooth_treatment_images tti
      LEFT JOIN tooth_treatments tt ON tti.tooth_treatment_id = tt.id
      LEFT JOIN patients p ON tti.patient_id = p.id
      WHERE tti.patient_id = ? AND tti.tooth_number = ?
      ORDER BY tti.image_type, tti.taken_date DESC
    `)
    return stmt.all(patientId, toothNumber)
  }

  async createToothTreatmentImage(image: any): Promise<any> {
    this.ensureToothTreatmentsTableExists()

    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO tooth_treatment_images (
        id, tooth_treatment_id, patient_id, tooth_number, image_path,
        image_type, description, taken_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, image.tooth_treatment_id, image.patient_id, image.tooth_number,
      image.image_path, image.image_type, image.description,
      image.taken_date || now, now, now
    )

    return { ...image, id, taken_date: image.taken_date || now, created_at: now, updated_at: now }
  }

  async deleteToothTreatmentImage(id: string): Promise<boolean> {
    this.ensureToothTreatmentsTableExists()

    const stmt = this.db.prepare('DELETE FROM tooth_treatment_images WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }



  // NEW: Ensure tooth treatments table exists
  private ensureToothTreatmentsTableExists(): void {
    try {
      console.log('🔍 [DEBUG] Checking if tooth_treatments table exists...')

      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='tooth_treatments'
      `).get()

      if (!tableExists) {
        console.log('🏗️ [DEBUG] Creating tooth_treatments table...')
        this.db.exec(`
          CREATE TABLE tooth_treatments (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            tooth_number INTEGER NOT NULL CHECK (
              (tooth_number >= 11 AND tooth_number <= 18) OR
              (tooth_number >= 21 AND tooth_number <= 28) OR
              (tooth_number >= 31 AND tooth_number <= 38) OR
              (tooth_number >= 41 AND tooth_number <= 48) OR
              (tooth_number >= 51 AND tooth_number <= 55) OR
              (tooth_number >= 61 AND tooth_number <= 65) OR
              (tooth_number >= 71 AND tooth_number <= 75) OR
              (tooth_number >= 81 AND tooth_number <= 85)
            ),
            tooth_name TEXT NOT NULL,
            treatment_type TEXT NOT NULL,
            treatment_category TEXT NOT NULL,
            treatment_status TEXT DEFAULT 'planned',
            treatment_color TEXT NOT NULL,
            start_date DATE,
            completion_date DATE,
            cost DECIMAL(10,2) DEFAULT 0,
            priority INTEGER DEFAULT 1,
            notes TEXT,
            appointment_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
            UNIQUE(patient_id, tooth_number, priority)
          )
        `)
        console.log('✅ [DEBUG] tooth_treatments table created successfully')

        // Create indexes for better performance
        this.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_tooth_treatments_patient_tooth
          ON tooth_treatments(patient_id, tooth_number);

          CREATE INDEX IF NOT EXISTS idx_tooth_treatments_priority
          ON tooth_treatments(patient_id, tooth_number, priority);

          CREATE INDEX IF NOT EXISTS idx_tooth_treatments_status
          ON tooth_treatments(treatment_status);

          CREATE INDEX IF NOT EXISTS idx_tooth_treatments_category
          ON tooth_treatments(treatment_category);
        `)
        console.log('✅ [DEBUG] tooth_treatments indexes created successfully')

        // Check if tooth_treatment_images table exists and migrate if needed
        const tableExists = this.db.prepare(`
          SELECT name FROM sqlite_master WHERE type='table' AND name='tooth_treatment_images'
        `).get()

        if (tableExists) {
          // Check if tooth_treatment_id is nullable
          const tableInfo = this.db.prepare(`PRAGMA table_info(tooth_treatment_images)`).all()
          const treatmentIdColumn = tableInfo.find((col: any) => col.name === 'tooth_treatment_id')

          if (treatmentIdColumn && treatmentIdColumn.notnull === 1) {
            console.log('Migrating tooth_treatment_images table to make tooth_treatment_id nullable...')

            // Create new table with nullable tooth_treatment_id
            this.db.exec(`
              CREATE TABLE tooth_treatment_images_new (
                id TEXT PRIMARY KEY,
                tooth_treatment_id TEXT,
                patient_id TEXT NOT NULL,
                tooth_number INTEGER NOT NULL,
                image_path TEXT NOT NULL,
                image_type TEXT NOT NULL,
                description TEXT,
                taken_date TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (tooth_treatment_id) REFERENCES tooth_treatments (id) ON DELETE CASCADE,
                FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
              )
            `)

            // Copy data from old table to new table
            this.db.exec(`
              INSERT INTO tooth_treatment_images_new
              SELECT * FROM tooth_treatment_images
            `)

            // Drop old table and rename new table
            this.db.exec(`DROP TABLE tooth_treatment_images`)
            this.db.exec(`ALTER TABLE tooth_treatment_images_new RENAME TO tooth_treatment_images`)

            console.log('Migration completed successfully')
          }
        } else {
          // Create tooth_treatment_images table if it doesn't exist
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS tooth_treatment_images (
              id TEXT PRIMARY KEY,
              tooth_treatment_id TEXT,
              patient_id TEXT NOT NULL,
              tooth_number INTEGER NOT NULL,
              image_path TEXT NOT NULL,
              image_type TEXT NOT NULL,
              description TEXT,
              taken_date TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY (tooth_treatment_id) REFERENCES tooth_treatments (id) ON DELETE CASCADE,
              FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
            )
          `)
        }

        // Create indexes for tooth_treatment_images
        this.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_tooth_treatment_images_treatment_id ON tooth_treatment_images (tooth_treatment_id);
          CREATE INDEX IF NOT EXISTS idx_tooth_treatment_images_patient_id ON tooth_treatment_images (patient_id);
          CREATE INDEX IF NOT EXISTS idx_tooth_treatment_images_tooth_number ON tooth_treatment_images (tooth_number);
          CREATE INDEX IF NOT EXISTS idx_tooth_treatment_images_type ON tooth_treatment_images (image_type);
        `)
        console.log('✅ [DEBUG] tooth_treatment_images table and indexes created successfully')
      } else {
        console.log('✅ [DEBUG] tooth_treatments table already exists')
      }
    } catch (error) {
      console.error('❌ [DEBUG] Error in ensureToothTreatmentsTableExists:', error)
      throw error
    }
  }

  // Dental Treatment Images operations
  async getAllDentalTreatmentImages(): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT dti.*,
             dt.tooth_name,
             p.full_name as patient_name
      FROM dental_treatment_images dti
      LEFT JOIN dental_treatments dt ON dti.dental_treatment_id = dt.id
      LEFT JOIN patients p ON dti.patient_id = p.id
      ORDER BY dti.taken_date DESC
    `)
    return stmt.all()
  }

  async getDentalTreatmentImagesByTreatment(treatmentId: string): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT dti.*,
             dt.tooth_name,
             p.full_name as patient_name
      FROM dental_treatment_images dti
      LEFT JOIN dental_treatments dt ON dti.dental_treatment_id = dt.id
      LEFT JOIN patients p ON dti.patient_id = p.id
      WHERE dti.dental_treatment_id = ?
      ORDER BY dti.taken_date DESC
    `)
    return stmt.all(treatmentId)
  }

  async createDentalTreatmentImage(image: any): Promise<any> {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO dental_treatment_images (
        id, dental_treatment_id, patient_id, tooth_number, image_path,
        image_type, description, taken_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, image.dental_treatment_id, image.patient_id, image.tooth_number,
      image.image_path, image.image_type, image.description,
      image.taken_date || now, now, now
    )

    return { ...image, id, taken_date: image.taken_date || now, created_at: now, updated_at: now }
  }

  async deleteDentalTreatmentImage(id: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM dental_treatment_images WHERE id = ?')
    stmt.run(id)
  }

  /**
   * تطبيق migration التكامل
   */
  private async runIntegrationMigration(): Promise<void> {
    try {
      const migrationService = new IntegrationMigrationService(this.db)
      await migrationService.applyIntegrationMigration()

      // التحقق من حالة قاعدة البيانات
      const status = migrationService.checkDatabaseStatus()
      console.log('📊 حالة قاعدة البيانات بعد migration:', status)

      // إنشاء بيانات تجريبية إذا لزم الأمر
      if (status.tables.patient_treatment_timeline && status.appliedMigrations > 0) {
        await migrationService.createSampleTimelineData()
      }
    } catch (error) {
      console.error('❌ خطأ في تطبيق integration migration:', error)
      // لا نرمي الخطأ لتجنب توقف التطبيق
    }
  }

  /**
   * التأكد من وجود جميع الأعمدة المطلوبة في جدول lab_orders
   */
  private async ensureLabOrdersColumns(): Promise<boolean> {
    try {
      // التحقق من وجود الجدول
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='lab_orders'
      `).get()

      if (!tableExists) {
        console.log('🔧 lab_orders table does not exist, creating it...')
        // إنشاء الجدول مع جميع الأعمدة المطلوبة
        this.db.exec(`
          CREATE TABLE lab_orders (
            id TEXT PRIMARY KEY,
            lab_id TEXT NOT NULL,
            patient_id TEXT,
            appointment_id TEXT,
            tooth_treatment_id TEXT,
            tooth_number INTEGER,
            service_name TEXT NOT NULL,
            cost REAL NOT NULL,
            order_date TEXT NOT NULL,
            expected_delivery_date TEXT,
            actual_delivery_date TEXT,
            status TEXT NOT NULL CHECK (status IN ('معلق', 'مكتمل', 'ملغي')),
            notes TEXT,
            paid_amount REAL DEFAULT 0,
            remaining_balance REAL,
            priority INTEGER DEFAULT 1,
            lab_instructions TEXT,
            material_type TEXT,
            color_shade TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
            FOREIGN KEY (tooth_treatment_id) REFERENCES tooth_treatments(id) ON DELETE CASCADE
          )
        `)
        console.log('✅ lab_orders table created successfully')
        return true
      }

      // فحص الأعمدة الموجودة
      const tableInfo = this.db.prepare("PRAGMA table_info(lab_orders)").all() as any[]
      const columnNames = tableInfo.map(col => col.name)

      console.log('🔍 Current lab_orders columns:', columnNames)

      // قائمة الأعمدة المطلوبة مع تعريفاتها
      const requiredColumns = [
        { name: 'tooth_number', definition: 'INTEGER' },
        { name: 'appointment_id', definition: 'TEXT' },
        { name: 'tooth_treatment_id', definition: 'TEXT' },
        { name: 'expected_delivery_date', definition: 'TEXT' },
        { name: 'actual_delivery_date', definition: 'TEXT' },
        { name: 'paid_amount', definition: 'REAL DEFAULT 0' },
        { name: 'remaining_balance', definition: 'REAL' },
        { name: 'priority', definition: 'INTEGER DEFAULT 1' },
        { name: 'lab_instructions', definition: 'TEXT' },
        { name: 'material_type', definition: 'TEXT' },
        { name: 'color_shade', definition: 'TEXT' },
        { name: 'created_at', definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
        { name: 'updated_at', definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
      ]

      let columnsAdded = false

      // إضافة الأعمدة المفقودة
      for (const column of requiredColumns) {
        if (!columnNames.includes(column.name)) {
          try {
            console.log(`🔧 Adding missing ${column.name} column to lab_orders table...`)
            this.db.exec(`ALTER TABLE lab_orders ADD COLUMN ${column.name} ${column.definition}`)
            console.log(`✅ ${column.name} column added successfully`)
            columnsAdded = true
          } catch (e: any) {
            console.log(`⚠️ Failed to add ${column.name} column:`, e.message)
          }
        }
      }

      // إنشاء الفهارس إذا تم إضافة أعمدة
      if (columnsAdded) {
        try {
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_lab_orders_treatment ON lab_orders(tooth_treatment_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_lab_orders_appointment ON lab_orders(appointment_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_lab_orders_tooth ON lab_orders(tooth_number)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_tooth ON lab_orders(patient_id, tooth_number)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_lab_orders_priority ON lab_orders(priority)')
          console.log('✅ lab_orders indexes created successfully')
        } catch (e: any) {
          console.log('⚠️ Index creation failed:', e.message)
        }

        // إنشاء triggers لتعبئة tooth_number تلقائياً
        try {
          this.db.exec(`
            CREATE TRIGGER IF NOT EXISTS update_lab_order_tooth_number
            AFTER UPDATE OF tooth_treatment_id ON lab_orders
            WHEN NEW.tooth_treatment_id IS NOT NULL AND NEW.tooth_number IS NULL
            BEGIN
                UPDATE lab_orders
                SET tooth_number = (
                    SELECT tooth_number
                    FROM tooth_treatments
                    WHERE id = NEW.tooth_treatment_id
                )
                WHERE id = NEW.id;
            END
          `)

          this.db.exec(`
            CREATE TRIGGER IF NOT EXISTS insert_lab_order_tooth_number
            AFTER INSERT ON lab_orders
            WHEN NEW.tooth_treatment_id IS NOT NULL AND NEW.tooth_number IS NULL
            BEGIN
                UPDATE lab_orders
                SET tooth_number = (
                    SELECT tooth_number
                    FROM tooth_treatments
                    WHERE id = NEW.tooth_treatment_id
                )
                WHERE id = NEW.id;
            END
          `)
          console.log('✅ lab_orders triggers created successfully')
        } catch (e: any) {
          console.log('⚠️ Trigger creation failed:', e.message)
        }
      }

      console.log('✅ lab_orders table structure verified and updated')
      return columnsAdded
    } catch (error) {
      console.error('❌ Error ensuring lab_orders columns:', error)
      throw error
    }
  }

  /**
   * الحصول على حالة التكامل
   */
  getIntegrationStatus(): any {
    try {
      const migrationService = new IntegrationMigrationService(this.db)
      return migrationService.checkDatabaseStatus()
    } catch (error) {
      console.error('خطأ في الحصول على حالة التكامل:', error)
      return {
        appliedMigrations: 0,
        migrations: [],
        tables: {},
        columns: {}
      }
    }
  }

  // Treatment Sessions operations
  private ensureTreatmentSessionsTableExists() {
    try {
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='treatment_sessions'
      `).get()

      if (!tableExists) {
        console.log('Creating treatment_sessions table...')
        this.db.exec(`
          CREATE TABLE treatment_sessions (
            id TEXT PRIMARY KEY,
            tooth_treatment_id TEXT NOT NULL,
            session_number INTEGER NOT NULL,
            session_type TEXT NOT NULL,
            session_title TEXT NOT NULL,
            session_description TEXT,
            session_date DATE NOT NULL,
            session_status TEXT DEFAULT 'planned',
            duration_minutes INTEGER DEFAULT 30,
            cost DECIMAL(10,2) DEFAULT 0,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tooth_treatment_id) REFERENCES tooth_treatments(id) ON DELETE CASCADE,
            UNIQUE(tooth_treatment_id, session_number)
          );

          CREATE INDEX IF NOT EXISTS idx_treatment_sessions_treatment ON treatment_sessions(tooth_treatment_id);
          CREATE INDEX IF NOT EXISTS idx_treatment_sessions_date ON treatment_sessions(session_date);
          CREATE INDEX IF NOT EXISTS idx_treatment_sessions_status ON treatment_sessions(session_status);
          CREATE INDEX IF NOT EXISTS idx_treatment_sessions_number ON treatment_sessions(tooth_treatment_id, session_number);
        `)
        console.log('✅ treatment_sessions table created successfully')
      }
    } catch (error) {
      console.error('❌ Error ensuring treatment_sessions table exists:', error)
      throw error
    }
  }

  async getAllTreatmentSessions(): Promise<any[]> {
    this.ensureTreatmentSessionsTableExists()

    const stmt = this.db.prepare(`
      SELECT ts.*,
             tt.tooth_name,
             tt.treatment_type,
             tt.treatment_category,
             p.full_name as patient_name
      FROM treatment_sessions ts
      LEFT JOIN tooth_treatments tt ON ts.tooth_treatment_id = tt.id
      LEFT JOIN patients p ON tt.patient_id = p.id
      ORDER BY ts.session_date DESC, ts.session_number ASC
    `)
    return stmt.all()
  }

  async getTreatmentSessionsByTreatment(treatmentId: string): Promise<any[]> {
    this.ensureTreatmentSessionsTableExists()

    const stmt = this.db.prepare(`
      SELECT ts.*,
             tt.tooth_name,
             tt.treatment_type,
             tt.treatment_category,
             p.full_name as patient_name
      FROM treatment_sessions ts
      LEFT JOIN tooth_treatments tt ON ts.tooth_treatment_id = tt.id
      LEFT JOIN patients p ON tt.patient_id = p.id
      WHERE ts.tooth_treatment_id = ?
      ORDER BY ts.session_number ASC
    `)
    return stmt.all(treatmentId)
  }

  async createTreatmentSession(session: any): Promise<any> {
    this.ensureTreatmentSessionsTableExists()

    const id = uuidv4()
    const now = new Date().toISOString()

    // Auto-assign session number if not provided
    if (!session.session_number) {
      const maxSessionStmt = this.db.prepare(`
        SELECT COALESCE(MAX(session_number), 0) + 1 as next_session_number
        FROM treatment_sessions
        WHERE tooth_treatment_id = ?
      `)
      const result = maxSessionStmt.get(session.tooth_treatment_id) as any
      session.session_number = result.next_session_number
    }

    const stmt = this.db.prepare(`
      INSERT INTO treatment_sessions (
        id, tooth_treatment_id, session_number, session_type, session_title,
        session_description, session_date, session_status, duration_minutes,
        cost, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, session.tooth_treatment_id, session.session_number, session.session_type,
      session.session_title, session.session_description, session.session_date,
      session.session_status || 'planned', session.duration_minutes || 30,
      session.cost || 0, session.notes, now, now
    )

    return { ...session, id, created_at: now, updated_at: now }
  }

  async updateTreatmentSession(id: string, updates: any): Promise<void> {
    this.ensureTreatmentSessionsTableExists()

    const now = new Date().toISOString()

    const allowedColumns = [
      'session_number', 'session_type', 'session_title', 'session_description',
      'session_date', 'session_status', 'duration_minutes', 'cost', 'notes'
    ]

    const updateColumns = Object.keys(updates).filter(key => allowedColumns.includes(key))

    if (updateColumns.length === 0) {
      throw new Error('No valid columns to update')
    }

    const setClause = updateColumns.map(col => `${col} = ?`).join(', ')
    const values = updateColumns.map(col => updates[col])

    const stmt = this.db.prepare(`
      UPDATE treatment_sessions
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
  }

  async deleteTreatmentSession(id: string): Promise<void> {
    this.ensureTreatmentSessionsTableExists()

    const stmt = this.db.prepare('DELETE FROM treatment_sessions WHERE id = ?')
    stmt.run(id)
  }

  async getTreatmentSessionById(id: string): Promise<any> {
    this.ensureTreatmentSessionsTableExists()

    const stmt = this.db.prepare(`
      SELECT ts.*,
             tt.tooth_name,
             tt.treatment_type,
             tt.treatment_category,
             p.full_name as patient_name
      FROM treatment_sessions ts
      LEFT JOIN tooth_treatments tt ON ts.tooth_treatment_id = tt.id
      LEFT JOIN patients p ON tt.patient_id = p.id
      WHERE ts.id = ?
    `)
    return stmt.get(id)
  }

  close() {
    this.db.close()
  }
}