const Database = require('better-sqlite3')
const { join } = require('path')
const { readFileSync } = require('fs')
const { v4: uuidv4 } = require('uuid')
const { ImageMigrationService } = require('./imageMigrationService')

class DatabaseService {
  constructor(dbPath = null) {
    // If no path provided, use consistent path logic
    if (!dbPath) {
      try {
        // Try to get userData path from electron app (consistent with main.js)
        const { app } = require('electron')
        dbPath = join(app.getPath('userData'), 'dental_clinic.db')
        console.log('🗄️ Using userData path for database:', dbPath)
      } catch (error) {
        // Fallback for testing or non-electron environments
        console.log('⚠️ Electron app not available, using fallback path')
        const appDir = process.execPath ? require('path').dirname(process.execPath) : process.cwd()
        dbPath = join(appDir, 'dental_clinic.db')
      }
    }

    console.log('🗄️ Initializing SQLite database at:', dbPath)

    try {
      this.db = new Database(dbPath)
      console.log('✅ Database connection established successfully')

      // Test database connection
      this.db.pragma('user_version')
      console.log('✅ Database connection test passed')

      this.initializeDatabase()
      console.log('✅ Database schema initialized')

      this.runMigrations()
      console.log('✅ Database migrations completed')

      // Initialize image migration service
      this.imageMigrationService = new ImageMigrationService(this)

      // Check if image migration is needed
      this.checkAndRunImageMigration()

      console.log('✅ DatabaseService initialization completed successfully')
    } catch (error) {
      console.error('❌ Failed to initialize DatabaseService:', error)
      throw error
    }
  }

  // Ensure database connection is open
  ensureConnection() {
    if (!this.isOpen()) {
      console.warn('Database connection is closed, reinitializing...')
      this.reinitialize()
    }
  }

  initializeDatabase() {
    // Run patient schema migration BEFORE executing schema.sql
    this.runPatientSchemaMigration()

    // Read and execute schema with error handling
    try {
      // Try multiple possible paths for schema.sql
      let schemaPath
      let schema

      const possiblePaths = [
        join(__dirname, '../database/schema.sql'), // Development path
        join(process.resourcesPath || '', 'database/schema.sql'), // extraResources path
        join(process.resourcesPath || '', 'src/database/schema.sql'), // Packaged path 1
        join(require('path').dirname(process.execPath), 'resources/database/schema.sql'), // extraResources path 2
        join(require('path').dirname(process.execPath), 'resources/src/database/schema.sql'), // Packaged path 2
        join(require('path').dirname(process.execPath), 'src/database/schema.sql') // Packaged path 3
      ]

      for (const path of possiblePaths) {
        try {
          if (require('fs').existsSync(path)) {
            schemaPath = path
            schema = readFileSync(path, 'utf-8')
            console.log('✅ Found schema.sql at:', path)
            break
          }
        } catch (e) {
          // Continue to next path
        }
      }

      if (!schema) {
        throw new Error('Schema file not found in any expected location')
      }

      // Split schema into individual statements and execute safely
      const statements = schema.split(';').filter(stmt => stmt.trim().length > 0)

      for (const statement of statements) {
        try {
          this.db.exec(statement.trim())
        } catch (error) {
          // Log warning for failed statements but continue
          console.warn('⚠️ Schema statement failed (continuing):', error.message)
        }
      }
    } catch (error) {
      console.warn('⚠️ Schema file execution failed, using fallback initialization')
      this.initializeFallbackSchema()
    }

    // Enable foreign keys and other optimizations
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('cache_size = 1000')
    this.db.pragma('temp_store = MEMORY')

    // Create performance indexes
    this.createIndexes()

    // Run migrations to ensure all fields exist
    this.runMigrations()

    // Ensure tooth_treatment_id column exists
    this.ensureToothTreatmentIdColumn().catch(error => {
      console.warn('⚠️ Failed to ensure tooth_treatment_id column:', error.message)
    })

    // Ensure lab_orders table has all required columns
    this.ensureLabOrdersColumns().catch(error => {
      console.warn('⚠️ Failed to ensure lab_orders columns:', error.message)
    })
  }

  initializeFallbackSchema() {
    console.log('🔄 Initializing fallback schema...')

    // Create basic tables without foreign key constraints first
    const basicTables = [
      `CREATE TABLE IF NOT EXISTS patients (
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
        date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        profile_image TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS treatments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        default_cost DECIMAL(10,2),
        duration_minutes INTEGER,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        treatment_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        status TEXT DEFAULT 'scheduled',
        cost DECIMAL(10,2),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        tooth_treatment_id TEXT,
        appointment_id TEXT,
        amount DECIMAL(10,2) NOT NULL,
        payment_method TEXT NOT NULL,
        payment_date DATETIME NOT NULL,
        description TEXT,
        receipt_number TEXT,
        status TEXT DEFAULT 'completed',
        notes TEXT,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2),
        treatment_total_cost DECIMAL(10,2),
        treatment_total_paid DECIMAL(10,2),
        treatment_remaining_balance DECIMAL(10,2),
        total_amount_due DECIMAL(10,2),
        amount_paid DECIMAL(10,2),
        remaining_balance DECIMAL(10,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ]

    basicTables.forEach(tableSQL => {
      try {
        this.db.exec(tableSQL)
      } catch (error) {
        console.warn('⚠️ Fallback table creation warning:', error.message)
      }
    })

    console.log('✅ Fallback schema initialized')
  }

  createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name)',
      'CREATE INDEX IF NOT EXISTS idx_patients_serial ON patients(serial_number)',
      'CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone)',
      'CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(start_time)',
      'CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id)',
      'CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date)',
      'CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category)'
    ]

    indexes.forEach(indexSql => {
      try {
        this.db.exec(indexSql)
      } catch (error) {
        console.warn('Index creation warning:', error.message)
      }
    })
  }

  runMigrations() {
    // Ensure schema_version table exists first
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Get current schema version
    let version = 0
    try {
      const result = this.db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get()
      version = result ? result.version : 0
    } catch (error) {
      console.warn('Error getting schema version:', error.message)
    }

    // Check if lab tables exist and create them if they don't
    this.ensureLabTablesExist()

    // Check if medication tables exist and create them if they don't
    this.ensureMedicationTablesExist()

    // Check if dental treatment tables exist and create them if they don't
    this.ensureDentalTreatmentTablesExist()

    // Check if clinic needs table exists and create it if it doesn't
    this.ensureClinicNeedsTableExists()

    // Apply migrations
    const migrations = [
      {
        version: 1,
        sql: `
          -- Add profile_image column to patients if it doesn't exist
          ALTER TABLE patients ADD COLUMN profile_image TEXT;
        `
      },
      {
        version: 2,
        sql: `
          -- Add installment_payments table
          CREATE TABLE IF NOT EXISTS installment_payments (
            id TEXT PRIMARY KEY,
            payment_id TEXT NOT NULL,
            installment_number INTEGER NOT NULL,
            amount REAL NOT NULL,
            due_date TEXT NOT NULL,
            paid_date TEXT,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
          );
        `
      },
      {
        version: 3,
        sql: `
          -- Add patient_images table
          CREATE TABLE IF NOT EXISTS patient_images (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            image_path TEXT NOT NULL,
            image_type TEXT,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
          );
        `
      },
      {
        version: 4,
        sql: `
          -- Add doctor_name column to settings table
          ALTER TABLE settings ADD COLUMN doctor_name TEXT DEFAULT 'د. محمد أحمد';

          -- Update existing settings with default doctor name if null
          UPDATE settings SET doctor_name = 'د. محمد أحمد' WHERE doctor_name IS NULL;
        `
      },
      {
        version: 5,
        sql: `
          -- Add laboratory tables
          CREATE TABLE IF NOT EXISTS labs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            contact_info TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS lab_orders (
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
          );

          -- Laboratory indexes for search and performance optimization
          CREATE INDEX IF NOT EXISTS idx_labs_name ON labs(name);
          CREATE INDEX IF NOT EXISTS idx_lab_orders_lab ON lab_orders(lab_id);
          CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);
          CREATE INDEX IF NOT EXISTS idx_lab_orders_date ON lab_orders(order_date);
          CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status);
          CREATE INDEX IF NOT EXISTS idx_lab_orders_service ON lab_orders(service_name);
          CREATE INDEX IF NOT EXISTS idx_lab_orders_lab_date ON lab_orders(lab_id, order_date);
          CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_date ON lab_orders(patient_id, order_date);
          CREATE INDEX IF NOT EXISTS idx_lab_orders_status_date ON lab_orders(status, order_date);
        `
      },
      {
        version: 6,
        sql: `
          -- Fix treatment_status CHECK constraint issue
          -- This migration fixes the mismatch between expected and actual treatment_status values

          -- Check if dental_treatments table exists and has the problematic CHECK constraint
          -- We'll recreate the table with correct constraints if needed

          -- First, check if we need to fix the table
          CREATE TABLE IF NOT EXISTS dental_treatments_temp (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            appointment_id TEXT,
            tooth_number INTEGER NOT NULL CHECK (tooth_number >= 1 AND tooth_number <= 32),
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

          -- Copy existing data if dental_treatments table exists, converting old status values
          INSERT OR IGNORE INTO dental_treatments_temp
          SELECT id, patient_id, appointment_id, tooth_number, tooth_name,
                 current_treatment, next_treatment, treatment_details,
                 CASE
                   WHEN treatment_status = 'active' THEN 'in_progress'
                   WHEN treatment_status = 'on_hold' THEN 'planned'
                   ELSE COALESCE(treatment_status, 'planned')
                 END as treatment_status,
                 treatment_color, cost, notes, created_at, updated_at
          FROM dental_treatments
          WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='dental_treatments');

          -- Drop old table if it exists
          DROP TABLE IF EXISTS dental_treatments;

          -- Rename temp table to final name
          ALTER TABLE dental_treatments_temp RENAME TO dental_treatments;
        `
      },
      {
        version: 7,
        sql: `
          -- Force fix for treatment_status CHECK constraint
          -- This migration will definitely fix the issue by recreating the table

          PRAGMA foreign_keys = OFF;

          -- Create backup of existing data
          CREATE TABLE IF NOT EXISTS dental_treatments_backup AS
          SELECT * FROM dental_treatments;

          -- Drop the problematic table completely
          DROP TABLE IF EXISTS dental_treatments;

          -- Create new table with correct structure (no CHECK constraints for treatment_status)
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

          -- Restore data with status conversion
          INSERT INTO dental_treatments
          SELECT id, patient_id, appointment_id, tooth_number, tooth_name,
                 current_treatment, next_treatment, treatment_details,
                 CASE
                   WHEN treatment_status = 'active' THEN 'in_progress'
                   WHEN treatment_status = 'on_hold' THEN 'planned'
                   ELSE COALESCE(treatment_status, 'planned')
                 END as treatment_status,
                 treatment_color, cost, notes, created_at, updated_at
          FROM dental_treatments_backup;

          -- Clean up backup
          DROP TABLE IF EXISTS dental_treatments_backup;

          PRAGMA foreign_keys = ON;
        `
      },
      {
        version: 8,
        sql: `
          -- Fix dental_treatment_images table structure
          -- Remove tooth_record_id field and ensure correct schema

          PRAGMA foreign_keys = OFF;

          -- Check if dental_treatment_images table has tooth_record_id column
          CREATE TABLE IF NOT EXISTS dental_treatment_images_backup AS
          SELECT * FROM dental_treatment_images;

          -- Drop the old table
          DROP TABLE IF EXISTS dental_treatment_images;

          -- Create new table with correct structure (no tooth_record_id)
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
          );

          -- Migrate data from backup table (if any exists and has valid data)
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
            AND image_type IS NOT NULL;

          -- Drop backup table
          DROP TABLE IF EXISTS dental_treatment_images_backup;

          PRAGMA foreign_keys = ON;
        `
      },
      {
        version: 9,
        sql: `
          -- Fix tooth_number constraint to support FDI numbering system
          -- FDI system uses: 11-18, 21-28, 31-38, 41-48 for permanent teeth
          -- and 51-55, 61-65, 71-75, 81-85 for primary teeth
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
        `
      },
      {
        version: 10,
        sql: `
          -- Add tooth_treatment_id support to payments table
          -- This migration adds support for linking payments to specific tooth treatments

          -- Check if tooth_treatment_id column exists
          PRAGMA table_info(payments);

          -- Add tooth_treatment_id column if it doesn't exist
          ALTER TABLE payments ADD COLUMN tooth_treatment_id TEXT;

          -- Add treatment payment tracking columns
          ALTER TABLE payments ADD COLUMN treatment_total_cost DECIMAL(10,2);
          ALTER TABLE payments ADD COLUMN treatment_total_paid DECIMAL(10,2);
          ALTER TABLE payments ADD COLUMN treatment_remaining_balance DECIMAL(10,2);

          -- Create indexes for better performance
          CREATE INDEX IF NOT EXISTS idx_payments_tooth_treatment ON payments(tooth_treatment_id);
          CREATE INDEX IF NOT EXISTS idx_payments_patient_treatment ON payments(patient_id, tooth_treatment_id);
        `
      }
    ]

    migrations.forEach(migration => {
      if (version < migration.version) {
        try {
          console.log(`🔄 Applying migration version ${migration.version}`)
          this.db.exec(migration.sql)
          this.db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(migration.version)
          console.log(`✅ Applied migration version ${migration.version}`)
        } catch (error) {
          console.warn(`❌ Migration ${migration.version} warning:`, error.message)
        }
      }
    })

    // Force check for dental_treatments table tooth_number constraint
    try {
      const dentalTreatmentsSchema = this.db.prepare(`
        SELECT sql FROM sqlite_master
        WHERE type='table' AND name='dental_treatments'
      `).get()

      if (dentalTreatmentsSchema && dentalTreatmentsSchema.sql.includes('tooth_number >= 1 AND tooth_number <= 32')) {
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
        this.db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(9)
        console.log('✅ Force applied migration 9: tooth_number constraint fixed for FDI numbering')
      } else {
        console.log('✅ dental_treatments table tooth_number constraint is correct')
      }
    } catch (error) {
      console.error('❌ Error checking/fixing dental_treatments table:', error.message)
    }

    // Force check for dental_treatment_images table structure and apply migration 8 if needed
    try {
      const imageTableColumns = this.db.prepare("PRAGMA table_info(dental_treatment_images)").all()
      const imageColumnNames = imageTableColumns.map(col => col.name)
      console.log('🔍 [DEBUG] Current dental_treatment_images columns:', imageColumnNames)

      if (imageColumnNames.includes('tooth_record_id')) {
        console.log('🔄 Force applying migration 8: Fix dental_treatment_images table structure')

        // Apply migration 8 SQL directly
        this.db.exec(`
          PRAGMA foreign_keys = OFF;

          CREATE TABLE IF NOT EXISTS dental_treatment_images_backup AS
          SELECT * FROM dental_treatment_images;

          DROP TABLE IF EXISTS dental_treatment_images;

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
          );

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
            AND image_type IS NOT NULL;

          DROP TABLE IF EXISTS dental_treatment_images_backup;

          PRAGMA foreign_keys = ON;
        `)

        // Record that migration 8 was applied
        this.db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(8)
        console.log('✅ Force applied migration 8: dental_treatment_images table fixed')
      } else {
        console.log('✅ dental_treatment_images table structure is correct')
      }
    } catch (error) {
      console.error('❌ Error checking/fixing dental_treatment_images table:', error.message)
    }
  }

  runMigrations() {
    try {
      console.log('🔄 Running additional migrations...')

      // Check if date_added column exists in patients table
      const patientColumns = this.db.prepare("PRAGMA table_info(patients)").all()
      const patientColumnNames = patientColumns.map(col => col.name)

      if (!patientColumnNames.includes('date_added')) {
        console.log('🔄 Adding date_added column to patients table...')
        // Add column without default value first
        this.db.exec('ALTER TABLE patients ADD COLUMN date_added DATETIME')

        // Update existing patients to have date_added = created_at
        this.db.exec('UPDATE patients SET date_added = created_at WHERE date_added IS NULL')

        // Create index for better performance
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_patients_date_added ON patients(date_added)')

        console.log('✅ Added date_added column to patients table')
      } else {
        console.log('✅ date_added column already exists in patients table')
      }

    } catch (error) {
      console.error('❌ Error running migrations:', error.message)
    }
  }

  ensureDateAddedColumn() {
    try {
      // Check if date_added column exists in patients table
      const patientColumns = this.db.prepare("PRAGMA table_info(patients)").all()
      const patientColumnNames = patientColumns.map(col => col.name)

      if (!patientColumnNames.includes('date_added')) {
        console.log('🔄 Adding date_added column to patients table...')
        // Add column without default value first
        this.db.exec('ALTER TABLE patients ADD COLUMN date_added DATETIME')

        // Update existing patients to have date_added = created_at
        this.db.exec('UPDATE patients SET date_added = created_at WHERE date_added IS NULL')

        // Create index for better performance
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_patients_date_added ON patients(date_added)')

        console.log('✅ Added date_added column to patients table')
      }
    } catch (error) {
      console.error('❌ Error ensuring date_added column:', error.message)
    }
  }

  ensureLabTablesExist() {
    try {
      console.log('🧪 [DEBUG] ensureLabTablesExist() called')

      // List all existing tables first
      const allTables = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
      `).all()
      console.log('📋 [DEBUG] All existing tables:', allTables.map(t => t.name))

      // Check if labs table exists
      const labsTableExists = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='labs'
      `).get()
      console.log('🔍 [DEBUG] Labs table exists:', !!labsTableExists)

      // Check if lab_orders table exists
      const labOrdersTableExists = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='lab_orders'
      `).get()
      console.log('🔍 [DEBUG] Lab orders table exists:', !!labOrdersTableExists)

      if (!labsTableExists) {
        console.log('🏗️ [DEBUG] Creating labs table...')
        this.db.exec(`
          CREATE TABLE labs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            contact_info TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `)
        console.log('✅ [DEBUG] Labs table created successfully')

        // Verify table was created
        const verifyLabs = this.db.prepare(`
          SELECT name FROM sqlite_master WHERE type='table' AND name='labs'
        `).get()
        console.log('🔍 [DEBUG] Labs table verification after creation:', !!verifyLabs)
      } else {
        console.log('✅ [DEBUG] Labs table already exists')
      }

      if (!labOrdersTableExists) {
        console.log('🏗️ [DEBUG] Creating lab_orders table...')
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
        console.log('✅ [DEBUG] Lab orders table created successfully')

        // Verify table was created
        const verifyLabOrders = this.db.prepare(`
          SELECT name FROM sqlite_master WHERE type='table' AND name='lab_orders'
        `).get()
        console.log('🔍 [DEBUG] Lab orders table verification after creation:', !!verifyLabOrders)
      } else {
        console.log('✅ [DEBUG] Lab orders table already exists')
      }

      // Create indexes if they don't exist
      this.createLabIndexes()

      // Final verification - list all tables again
      const finalTables = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
      `).all()
      console.log('📋 [DEBUG] All tables after ensureLabTablesExist:', finalTables.map(t => t.name))

    } catch (error) {
      console.error('❌ [DEBUG] Error in ensureLabTablesExist:', error)
      console.error('❌ [DEBUG] Error stack:', error.stack)
      throw error
    }
  }

  createLabIndexes() {
    try {
      console.log('🔍 Creating laboratory indexes...')

      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_labs_name ON labs(name)',
        'CREATE INDEX IF NOT EXISTS idx_lab_orders_lab ON lab_orders(lab_id)',
        'CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id)',
        'CREATE INDEX IF NOT EXISTS idx_lab_orders_date ON lab_orders(order_date)',
        'CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status)',
        'CREATE INDEX IF NOT EXISTS idx_lab_orders_service ON lab_orders(service_name)',
        'CREATE INDEX IF NOT EXISTS idx_lab_orders_lab_date ON lab_orders(lab_id, order_date)',
        'CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_date ON lab_orders(patient_id, order_date)',
        'CREATE INDEX IF NOT EXISTS idx_lab_orders_status_date ON lab_orders(status, order_date)'
      ]

      indexes.forEach(indexSql => {
        try {
          this.db.exec(indexSql)
        } catch (error) {
          console.warn('Index creation warning:', error.message)
        }
      })

      console.log('✅ Laboratory indexes created successfully')
    } catch (error) {
      console.error('❌ Error creating lab indexes:', error)
    }
  }

  runPatientSchemaMigration() {
    try {
      console.log('🔄 Starting patient schema migration...')

      // Check if patients table exists and what schema it has
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='patients'
      `).get()

      if (!tableExists) {
        console.log('✅ No patients table found - will be created by schema.sql')
        return
      }

      // Check if migration is needed by checking if new columns exist
      const tableInfo = this.db.pragma('table_info(patients)')
      console.log('📋 Current table structure:', tableInfo.map(col => col.name))

      const hasNewSchema = tableInfo.some(col => col.name === 'serial_number')
      const hasOldSchema = tableInfo.some(col => col.name === 'first_name')

      console.log('🔍 Schema analysis:')
      console.log('  - Has new schema (serial_number):', hasNewSchema)
      console.log('  - Has old schema (first_name):', hasOldSchema)

      if (hasNewSchema && !hasOldSchema) {
        console.log('✅ Migration already completed - new schema detected')
        return
      }

      if (!hasOldSchema) {
        console.log('✅ No old schema detected - no migration needed')
        return
      }

      // Get current patient count
      const patientCount = this.db.prepare('SELECT COUNT(*) as count FROM patients').get()
      console.log(`📊 Found ${patientCount.count} patients to migrate`)

      // Begin transaction for safe migration
      const transaction = this.db.transaction(() => {
        console.log('📋 Creating backup of existing patients...')

        // Step 1: Create backup table
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS patients_backup AS
          SELECT * FROM patients
        `)

        console.log('🗑️ Dropping old patients table...')

        // Step 2: Drop existing table
        this.db.exec('DROP TABLE IF EXISTS patients')

        console.log('🏗️ Creating new patients table...')

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
            date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
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

      // Don't throw error to prevent app from crashing
      console.log('⚠️ Migration failed but continuing with app startup')
    }
  }

  // Patient operations
  async getAllPatients() {
    this.ensureConnection()

    const stmt = this.db.prepare(`
      SELECT * FROM patients
      ORDER BY full_name
    `)
    return stmt.all()
  }

  async getPatientById(id) {
    this.ensureConnection()

    const stmt = this.db.prepare(`
      SELECT * FROM patients
      WHERE id = ?
    `)
    return stmt.get(id)
  }

  async createPatient(patient) {
    // Ensure date_added column exists before creating
    this.ensureDateAddedColumn()

    const id = uuidv4()
    const now = new Date().toISOString()

    console.log('📝 Creating patient in SQLite:', patient.serial_number, patient.full_name)

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
      patient.date_added || now, now, now
    )

    console.log('✅ Patient inserted, changes:', result.changes)

    // Force WAL checkpoint to write data to main database file
    console.log('💾 Forcing WAL checkpoint...')
    const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
    console.log('💾 Checkpoint result:', checkpoint)

    console.log('✅ Patient created successfully:', id)
    return { ...patient, id, date_added: patient.date_added || now, created_at: now, updated_at: now }
  }

  async updatePatient(id, updates) {
    // Ensure date_added column exists before updating
    this.ensureDateAddedColumn()

    const now = new Date().toISOString()
    const fields = Object.keys(updates).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = this.db.prepare(`
      UPDATE patients
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
    return { ...updates, id, updated_at: now }
  }

  async deletePatient(id) {
    const stmt = this.db.prepare('DELETE FROM patients WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async searchPatients(query) {
    const stmt = this.db.prepare(`
      SELECT * FROM patients
      WHERE full_name LIKE ? OR phone LIKE ? OR email LIKE ? OR serial_number LIKE ?
      ORDER BY full_name
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm)
  }

  async searchAppointments(query) {
    this.ensureConnection()

    const stmt = this.db.prepare(`
      SELECT
        a.*,
        p.full_name as patient_name,
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
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm)
  }

  async searchTreatments(query) {
    this.ensureConnection()

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
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm)
  }

  // Appointment operations
  async getAllAppointments() {
    this.ensureConnection()

    const stmt = this.db.prepare(`
      SELECT a.*, p.full_name as patient_name, t.name as treatment_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN treatments t ON a.treatment_id = t.id
      ORDER BY a.start_time DESC
    `)
    return stmt.all()
  }

  async getAppointmentsByPatient(patientId) {
    this.ensureConnection()

    const stmt = this.db.prepare(`
      SELECT a.*, p.full_name as patient_name, t.name as treatment_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN treatments t ON a.treatment_id = t.id
      WHERE a.patient_id = ?
      ORDER BY a.start_time DESC
    `)
    return stmt.all(patientId)
  }

  async checkAppointmentConflict(startTime, endTime, excludeId) {
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
    const result = stmt.get(...params)

    return result.count > 0
  }

  async createAppointment(appointment) {
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
        appointment.status || 'scheduled', appointment.cost, appointment.notes,
        now, now
      )

      console.log('✅ Appointment inserted, changes:', result.changes)

      // Force WAL checkpoint to write data to main database file
      console.log('💾 Forcing WAL checkpoint...')
      const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
      console.log('💾 Checkpoint result:', checkpoint)

      console.log('✅ Appointment created successfully:', id)
      return { ...appointment, id, created_at: now, updated_at: now }
    } catch (error) {
      console.error('❌ Failed to create appointment:', error)
      console.error('Appointment data:', appointment)
      throw error
    }
  }

  async updateAppointment(id, updates) {
    const now = new Date().toISOString()

    // Check for appointment conflicts when updating time
    if (updates.start_time && updates.end_time) {
      const hasConflict = await this.checkAppointmentConflict(updates.start_time, updates.end_time, id)
      if (hasConflict) {
        throw new Error('يوجد موعد آخر في نفس الوقت المحدد. يرجى اختيار وقت آخر.')
      }
    }

    const fields = Object.keys(updates).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = this.db.prepare(`
      UPDATE appointments
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
    return { ...updates, id, updated_at: now }
  }

  async deleteAppointment(id) {
    const stmt = this.db.prepare('DELETE FROM appointments WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // Payment operations
  async getAllPayments() {
    this.ensureConnection()

    // First check if tooth_treatment_id column exists
    const tableInfo = this.db.prepare("PRAGMA table_info(payments)").all()
    const hasToothTreatmentId = tableInfo.some(col => col.name === 'tooth_treatment_id')

    let query
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
        ORDER BY p.payment_date DESC
      `
    }

    const stmt = this.db.prepare(query)

    const payments = stmt.all()

    console.log('🔍 Raw payments from DB (JS):', payments.length > 0 ? {
      first_payment: {
        id: payments[0]?.id,
        appointment_id: payments[0]?.appointment_id,
        total_amount_due: payments[0]?.total_amount_due,
        amount_paid: payments[0]?.amount_paid,
        remaining_balance: payments[0]?.remaining_balance
      },
      hasToothTreatmentId: hasToothTreatmentId
    } : 'No payments found')

    // Transform the data to include patient, appointment, and treatment objects
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
      tooth_treatment: (hasToothTreatmentId && payment.tooth_treatment_id) ? {
        id: payment.tooth_treatment_id,
        treatment_type: payment.treatment_name,
        tooth_number: payment.tooth_number,
        tooth_name: payment.tooth_name,
        cost: payment.treatment_cost
      } : null
    }))
  }

  // Add checkColumnExists method
  checkColumnExists(tableName, columnName) {
    console.log('🔍 [DEBUG] checkColumnExists called with:', { tableName, columnName })
    try {
      this.ensureConnection()
      const stmt = this.db.prepare(`PRAGMA table_info(${tableName})`)
      const columns = stmt.all()
      const exists = columns.some(col => col.name === columnName)
      console.log('🔍 [DEBUG] Column exists result:', { tableName, columnName, exists })
      return exists
    } catch (error) {
      console.error(`Error checking column ${columnName} in table ${tableName}:`, error)
      return false
    }
  }

  async getPaymentsByPatient(patientId) {
    console.log('🔍 [DEBUG] getPaymentsByPatient() called with patientId:', patientId)
    console.log('🔍 [DEBUG] this.checkColumnExists type:', typeof this.checkColumnExists)
    console.log('🔍 [DEBUG] this object keys:', Object.getOwnPropertyNames(this))

    this.ensureConnection()

    // Check if tooth_treatment_id column exists
    const hasToothTreatmentId = this.checkColumnExists('payments', 'tooth_treatment_id')

    let query
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
    const payments = stmt.all(patientId)
    console.log('📊 [DEBUG] Raw payments from database for patient:', payments.length)

    // Transform the data to include patient, appointment, and treatment objects
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
      tooth_treatment: (hasToothTreatmentId && payment.tooth_treatment_id) ? {
        id: payment.tooth_treatment_id,
        treatment_type: payment.treatment_name,
        tooth_number: payment.tooth_number,
        tooth_name: payment.tooth_name,
        cost: payment.treatment_cost
      } : null
    }))
  }

  async createPayment(payment) {
    console.log('🚀 DatabaseService.js createPayment called with:', payment)
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO payments (
        id, patient_id, tooth_treatment_id, appointment_id, amount, payment_method, payment_date,
        status, description, receipt_number, notes, discount_amount, tax_amount,
        total_amount, treatment_total_cost, treatment_total_paid, treatment_remaining_balance,
        total_amount_due, amount_paid, remaining_balance, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    // حساب القيم المطلوبة - التأكد من أن amount ليس null أو undefined
    const amount = payment.amount || 0  // استخدام 0 كقيمة افتراضية إذا كان amount فارغ
    const totalAmount = payment.total_amount || amount

    let treatmentTotalCost = null
    let treatmentTotalPaid = null
    let treatmentRemainingBalance = null
    let totalAmountDue = null
    let amountPaid = null
    let remainingBalance = null

    if (payment.tooth_treatment_id) {
      // دفعة مرتبطة بعلاج - احسب الرصيد للعلاج
      const treatment = this.db.prepare('SELECT cost FROM tooth_treatments WHERE id = ?').get(payment.tooth_treatment_id)
      treatmentTotalCost = treatment?.cost || 0

      // احسب إجمالي المدفوع لهذا العلاج حتى الآن
      const existingPayments = this.db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_paid
        FROM payments
        WHERE tooth_treatment_id = ? AND id != ?
      `).get(payment.tooth_treatment_id, id)

      treatmentTotalPaid = (existingPayments?.total_paid || 0) + amount
      treatmentRemainingBalance = Math.max(0, treatmentTotalCost - treatmentTotalPaid)
    } else {
      // دفعة عامة غير مرتبطة بعلاج محدد
      totalAmountDue = payment.total_amount_due || totalAmount
      amountPaid = payment.amount_paid || amount
      remainingBalance = payment.remaining_balance || Math.max(0, totalAmountDue - amountPaid)
    }

    console.log('🔍 Payment values before insert:', {
      amount,
      totalAmount,
      tooth_treatment_id: payment.tooth_treatment_id,
      treatmentTotalCost,
      treatmentTotalPaid,
      treatmentRemainingBalance,
      totalAmountDue,
      amountPaid,
      remainingBalance,
      status: payment.status || 'completed'
    })

    const result = stmt.run(
      id, payment.patient_id, payment.tooth_treatment_id, payment.appointment_id, amount,
      payment.payment_method, payment.payment_date, payment.status || 'completed',
      payment.description, payment.receipt_number, payment.notes,
      payment.discount_amount || 0, payment.tax_amount || 0,
      totalAmount, treatmentTotalCost, treatmentTotalPaid, treatmentRemainingBalance,
      totalAmountDue, amountPaid, remainingBalance, now, now
    )

    console.log('🔍 Payment data saved to DB (JS):', {
      id,
      appointment_id: payment.appointment_id,
      total_amount_due: totalAmountDue,
      amount_paid: amountPaid,
      remaining_balance: remainingBalance
    })

    console.log('✅ Payment inserted, changes:', result.changes)

    // Force WAL checkpoint to write data to main database file
    console.log('💾 Forcing WAL checkpoint...')
    const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
    console.log('💾 Checkpoint result:', checkpoint)

    console.log('✅ Payment created successfully:', id)

    // Get patient data to include in the response
    const patientStmt = this.db.prepare('SELECT * FROM patients WHERE id = ?')
    const patient = patientStmt.get(payment.patient_id)

    const createdPayment = {
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

    if (patient) {
      createdPayment.patient = {
        id: patient.id,
        full_name: patient.full_name,
        first_name: patient.full_name?.split(' ')[0] || '',
        last_name: patient.full_name?.split(' ').slice(1).join(' ') || '',
        phone: patient.phone,
        email: patient.email
      }
    }

    return createdPayment
  }

  async updatePayment(id, updates) {
    const now = new Date().toISOString()

    // Get current payment to calculate new values
    const currentPayment = this.db.prepare('SELECT * FROM payments WHERE id = ?').get(id)
    if (!currentPayment) {
      throw new Error('Payment not found')
    }

    // حساب القيم الجديدة
    const amount = updates.amount !== undefined ? updates.amount : currentPayment.amount
    const totalAmount = updates.total_amount || amount

    let treatmentTotalCost = currentPayment.treatment_total_cost
    let treatmentTotalPaid = currentPayment.treatment_total_paid
    let treatmentRemainingBalance = currentPayment.treatment_remaining_balance
    let totalAmountDue = currentPayment.total_amount_due
    let amountPaid = currentPayment.amount_paid
    let remainingBalance = currentPayment.remaining_balance

    if (updates.tooth_treatment_id || currentPayment.tooth_treatment_id) {
      // دفعة مرتبطة بعلاج - إعادة حساب الرصيد
      const treatmentId = updates.tooth_treatment_id || currentPayment.tooth_treatment_id
      const treatment = this.db.prepare('SELECT cost FROM tooth_treatments WHERE id = ?').get(treatmentId)
      treatmentTotalCost = treatment?.cost || 0

      // احسب إجمالي المدفوع لهذا العلاج (باستثناء هذه الدفعة)
      const existingPayments = this.db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_paid
        FROM payments
        WHERE tooth_treatment_id = ? AND id != ?
      `).get(treatmentId, id)

      treatmentTotalPaid = (existingPayments?.total_paid || 0) + amount
      treatmentRemainingBalance = Math.max(0, treatmentTotalCost - treatmentTotalPaid)
    } else if (updates.appointment_id || currentPayment.appointment_id) {
      // دفعة مرتبطة بموعد - استخدام القيم المحدثة
      totalAmountDue = updates.total_amount_due || currentPayment.total_amount_due || totalAmount
      amountPaid = updates.amount_paid || amount
      remainingBalance = updates.remaining_balance || Math.max(0, totalAmountDue - amountPaid)
    } else {
      // دفعة عامة
      totalAmountDue = updates.total_amount_due || currentPayment.total_amount_due || totalAmount
      amountPaid = updates.amount_paid || amount
      remainingBalance = updates.remaining_balance || Math.max(0, totalAmountDue - amountPaid)
    }

    // تحديث البيانات
    const updatedData = {
      ...updates,
      treatment_total_cost: treatmentTotalCost,
      treatment_total_paid: treatmentTotalPaid,
      treatment_remaining_balance: treatmentRemainingBalance,
      total_amount_due: totalAmountDue,
      amount_paid: amountPaid,
      remaining_balance: remainingBalance,
      updated_at: now
    }

    const fields = Object.keys(updatedData).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updatedData[field])

    const stmt = this.db.prepare(`
      UPDATE payments
      SET ${setClause}
      WHERE id = ?
    `)

    stmt.run(...values, id)
    return { ...updatedData, id }
  }

  async deletePayment(id) {
    const stmt = this.db.prepare('DELETE FROM payments WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // دالة لحذف المدفوعات حسب معرف العلاج
  async deletePaymentsByToothTreatment(toothTreatmentId) {
    const stmt = this.db.prepare('DELETE FROM payments WHERE tooth_treatment_id = ?')
    const result = stmt.run(toothTreatmentId)
    return result.changes
  }

  // دالة للحصول على المدفوعات حسب العلاج
  async getPaymentsByToothTreatment(toothTreatmentId) {
    const stmt = this.db.prepare(`
      SELECT
        p.*,
        pt.full_name as patient_name,
        pt.full_name as patient_full_name,
        pt.phone as patient_phone,
        pt.email as patient_email,
        tt.treatment_type as treatment_name,
        tt.tooth_number,
        tt.tooth_name
      FROM payments p
      LEFT JOIN patients pt ON p.patient_id = pt.id
      LEFT JOIN tooth_treatments tt ON p.tooth_treatment_id = tt.id
      WHERE p.tooth_treatment_id = ?
      ORDER BY p.payment_date DESC
    `)
    return stmt.all(toothTreatmentId)
  }

  // دالة للحصول على ملخص المدفوعات لعلاج محدد
  async getToothTreatmentPaymentSummary(toothTreatmentId) {
    // احصل على تكلفة العلاج
    const treatment = this.db.prepare('SELECT cost FROM tooth_treatments WHERE id = ?').get(toothTreatmentId)
    const treatmentCost = treatment?.cost || 0

    // احصل على جميع المدفوعات المرتبطة بهذا العلاج
    const payments = this.db.prepare(`
      SELECT * FROM payments WHERE tooth_treatment_id = ? ORDER BY created_at ASC
    `).all(toothTreatmentId)

    const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
    const remainingBalance = Math.max(0, treatmentCost - totalPaid)
    const paymentCount = payments.length

    let status = 'pending'
    if (remainingBalance <= 0) {
      status = 'completed'
    } else if (totalPaid > 0) {
      status = 'partial'
    }

    return {
      treatmentCost,
      totalPaid,
      remainingBalance,
      paymentCount,
      status,
      payments
    }
  }

  async searchPayments(query) {
    this.ensureConnection()

    // First check if tooth_treatment_id column exists
    const tableInfo = this.db.prepare("PRAGMA table_info(payments)").all()
    const hasToothTreatmentId = tableInfo.some(col => col.name === 'tooth_treatment_id')

    let sqlQuery
    if (hasToothTreatmentId) {
      // Use the full query with tooth_treatments join
      sqlQuery = `
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
          tt.tooth_name
        FROM payments p
        LEFT JOIN patients pt ON p.patient_id = pt.id
        LEFT JOIN appointments a ON p.appointment_id = a.id
        LEFT JOIN tooth_treatments tt ON p.tooth_treatment_id = tt.id
        WHERE pt.full_name LIKE ? OR p.receipt_number LIKE ?
        ORDER BY p.payment_date DESC
      `
    } else {
      // Use simplified query without tooth_treatments join
      sqlQuery = `
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
        WHERE pt.full_name LIKE ? OR p.receipt_number LIKE ?
        ORDER BY p.payment_date DESC
      `
    }

    const stmt = this.db.prepare(sqlQuery)
    const searchTerm = `%${query}%`
    const payments = stmt.all(searchTerm, searchTerm)

    // Transform the data to include patient, appointment, and treatment objects
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
      tooth_treatment: (hasToothTreatmentId && payment.tooth_treatment_id) ? {
        id: payment.tooth_treatment_id,
        treatment_type: payment.treatment_name,
        tooth_number: payment.tooth_number,
        tooth_name: payment.tooth_name
      } : null
    }))
  }

  // Treatment operations
  async getAllTreatments() {
    this.ensureConnection()

    const stmt = this.db.prepare('SELECT * FROM treatments ORDER BY name')
    return stmt.all()
  }

  async createTreatment(treatment) {
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

  async updateTreatment(id, updates) {
    const now = new Date().toISOString()
    const fields = Object.keys(updates).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = this.db.prepare(`
      UPDATE treatments
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
    return { ...updates, id, updated_at: now }
  }

  async deleteTreatment(id) {
    const stmt = this.db.prepare('DELETE FROM treatments WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // Inventory operations
  async getAllInventoryItems() {
    this.ensureConnection()

    const stmt = this.db.prepare('SELECT * FROM inventory ORDER BY name')
    return stmt.all()
  }

  async createInventoryItem(item) {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO inventory (
        id, name, description, category, quantity, unit, cost_per_unit,
        supplier, minimum_stock, expiry_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      id, item.name, item.description, item.category, item.quantity,
      item.unit, item.cost_per_unit, item.supplier, item.minimum_stock,
      item.expiry_date, now, now
    )

    console.log('✅ Inventory item inserted, changes:', result.changes)

    // Force WAL checkpoint to write data to main database file
    console.log('💾 Forcing WAL checkpoint...')
    const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
    console.log('💾 Checkpoint result:', checkpoint)

    console.log('✅ Inventory item created successfully:', id)
    return { ...item, id, created_at: now, updated_at: now }
  }

  async updateInventoryItem(id, updates) {
    const now = new Date().toISOString()
    const fields = Object.keys(updates).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = this.db.prepare(`
      UPDATE inventory
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
    return { ...updates, id, updated_at: now }
  }

  async deleteInventoryItem(id) {
    const stmt = this.db.prepare('DELETE FROM inventory WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async searchInventoryItems(query) {
    const stmt = this.db.prepare(`
      SELECT * FROM inventory
      WHERE name LIKE ? OR description LIKE ? OR category LIKE ?
      ORDER BY name
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm)
  }

  // Ensure password columns exist in settings table
  ensurePasswordColumns() {
    try {
      this.ensureConnection()

      // Check if columns exist
      const columns = this.db.prepare("PRAGMA table_info(settings)").all()
      const columnNames = columns.map(col => col.name)

      console.log('Current settings table columns:', columnNames)

      if (!columnNames.includes('app_password')) {
        console.log('🔧 Adding app_password column to settings table')
        this.db.exec('ALTER TABLE settings ADD COLUMN app_password TEXT')
        console.log('✅ app_password column added successfully')
      }

      if (!columnNames.includes('password_enabled')) {
        console.log('🔧 Adding password_enabled column to settings table')
        this.db.exec('ALTER TABLE settings ADD COLUMN password_enabled INTEGER DEFAULT 0')
        console.log('✅ password_enabled column added successfully')
      }

      if (!columnNames.includes('security_question')) {
        console.log('🔧 Adding security_question column to settings table')
        this.db.exec('ALTER TABLE settings ADD COLUMN security_question TEXT')
        console.log('✅ security_question column added successfully')
      }

      if (!columnNames.includes('security_answer')) {
        console.log('🔧 Adding security_answer column to settings table')
        this.db.exec('ALTER TABLE settings ADD COLUMN security_answer TEXT')
        console.log('✅ security_answer column added successfully')
      }

      // Verify columns were added
      const updatedColumns = this.db.prepare("PRAGMA table_info(settings)").all()
      const updatedColumnNames = updatedColumns.map(col => col.name)
      console.log('Updated settings table columns:', updatedColumnNames)

    } catch (error) {
      console.error('❌ Error ensuring password columns:', error)
      throw error
    }
  }

  // Settings operations
  async getSettings() {
    this.ensureConnection()

    // Ensure password columns exist
    this.ensurePasswordColumns()

    const stmt = this.db.prepare('SELECT * FROM settings LIMIT 1')
    const result = stmt.get()

    if (!result) {
      // Create default settings
      const defaultSettings = {
        id: uuidv4(),
        clinic_name: 'عيادة الأسنان',
        doctor_name: 'د. محمد أحمد',
        clinic_address: '',
        clinic_phone: '',
        clinic_email: '',
        clinic_logo: '',
        currency: 'USD',
        language: 'ar',
        timezone: 'Asia/Riyadh',
        backup_frequency: 'daily',
        auto_save_interval: 300,
        appointment_duration: 30,
        working_hours_start: '08:00',
        working_hours_end: '18:00',
        working_days: 'السبت,الأحد,الاثنين,الثلاثاء,الأربعاء',
        app_password: null,
        password_enabled: 0,
        security_question: null,
        security_answer: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await this.updateSettings(defaultSettings)
      return defaultSettings
    }

    return result
  }

  async updateSettings(settings) {
    const now = new Date().toISOString()

    try {
      // Ensure password columns exist
      this.ensurePasswordColumns()
    } catch (error) {
      console.error('Failed to ensure password columns:', error)
      // Continue without password fields if migration fails
    }

    // Check if settings exist
    const existing = this.db.prepare('SELECT id FROM settings LIMIT 1').get()

    if (existing) {
      // Get current table columns to filter out non-existent ones
      const columns = this.db.prepare("PRAGMA table_info(settings)").all()
      const columnNames = columns.map(col => col.name)

      // Update existing settings - only include fields that exist in the table
      const fields = Object.keys(settings).filter(key =>
        key !== 'id' && columnNames.includes(key)
      )

      if (fields.length === 0) {
        console.log('No valid fields to update')
        return { ...settings, id: existing.id, updated_at: now }
      }

      const setClause = fields.map(field => `${field} = ?`).join(', ')
      const values = fields.map(field => settings[field])

      const stmt = this.db.prepare(`
        UPDATE settings
        SET ${setClause}, updated_at = ?
        WHERE id = ?
      `)

      stmt.run(...values, now, existing.id)
      return { ...settings, id: existing.id, updated_at: now }
    } else {
      // Insert new settings
      const id = settings.id || uuidv4()

      // Get current table columns to build dynamic insert
      const columns = this.db.prepare("PRAGMA table_info(settings)").all()
      const columnNames = columns.map(col => col.name)

      // Build insert statement based on available columns
      const baseFields = ['id', 'clinic_name', 'doctor_name', 'clinic_address', 'clinic_phone',
                         'clinic_email', 'clinic_logo', 'currency', 'language', 'timezone',
                         'backup_frequency', 'auto_save_interval', 'appointment_duration',
                         'working_hours_start', 'working_hours_end', 'working_days', 'created_at', 'updated_at']

      const passwordFields = ['app_password', 'password_enabled']
      const availableFields = baseFields.concat(passwordFields.filter(field => columnNames.includes(field)))

      const placeholders = availableFields.map(() => '?').join(', ')
      const fieldsList = availableFields.join(', ')

      const stmt = this.db.prepare(`
        INSERT INTO settings (${fieldsList}) VALUES (${placeholders})
      `)

      const values = availableFields.map(field => {
        if (field === 'id') return id
        if (field === 'created_at') return settings.created_at || now
        if (field === 'updated_at') return now
        return settings[field] || null
      })

      stmt.run(...values)

      return { ...settings, id, created_at: settings.created_at || now, updated_at: now }
    }
  }

  // Dashboard operations
  async getDashboardStats() {
    this.ensureConnection()

    const totalPatients = this.db.prepare('SELECT COUNT(*) as count FROM patients').get().count
    const totalAppointments = this.db.prepare('SELECT COUNT(*) as count FROM appointments').get().count
    const totalRevenue = this.db.prepare('SELECT SUM(total_amount) as total FROM payments WHERE status = ?').get('completed').total || 0
    const pendingPayments = this.db.prepare('SELECT SUM(total_amount) as total FROM payments WHERE status = ?').get('pending').total || 0

    // Today's appointments
    const today = new Date().toISOString().split('T')[0]
    const todayAppointments = this.db.prepare('SELECT COUNT(*) as count FROM appointments WHERE DATE(start_time) = ?').get(today).count

    // This month's revenue
    const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const thisMonthRevenue = this.db.prepare('SELECT SUM(total_amount) as total FROM payments WHERE status = ? AND payment_date LIKE ?').get('completed', `${thisMonth}%`).total || 0

    // Low stock items
    const lowStockItems = this.db.prepare('SELECT COUNT(*) as count FROM inventory WHERE quantity <= minimum_stock').get().count

    return {
      total_patients: totalPatients,
      total_appointments: totalAppointments,
      total_revenue: totalRevenue,
      pending_payments: pendingPayments,
      today_appointments: todayAppointments,
      this_month_revenue: thisMonthRevenue,
      low_stock_items: lowStockItems
    }
  }

  // Additional operations for backup/restore
  async getAllInventoryUsage() {
    const stmt = this.db.prepare('SELECT * FROM inventory_usage ORDER BY used_at DESC')
    return stmt.all()
  }

  async getAllPatientImages() {
    const stmt = this.db.prepare('SELECT * FROM patient_images ORDER BY created_at DESC')
    return stmt.all()
  }

  async getAllInstallmentPayments() {
    const stmt = this.db.prepare('SELECT * FROM installment_payments ORDER BY due_date')
    return stmt.all()
  }

  // Clear operations for migration/restore
  async clearAllPatients() {
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

  async clearAllAppointments() {
    this.db.prepare('DELETE FROM appointments').run()
  }

  async clearAllPayments() {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM installment_payments').run()
      this.db.prepare('DELETE FROM payments').run()
    })
    transaction()
  }

  async clearAllTreatments() {
    this.db.prepare('DELETE FROM treatments').run()
  }

  async clearAllInventory() {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM inventory_usage').run()
      this.db.prepare('DELETE FROM inventory').run()
    })
    transaction()
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  // Reinitialize database connection
  reinitialize() {
    if (this.db) {
      this.close()
    }

    // Get database path (consistent with constructor)
    let dbPath
    try {
      const { app } = require('electron')
      dbPath = join(app.getPath('userData'), 'dental_clinic.db')
      console.log('🗄️ Reinitializing with userData path:', dbPath)
    } catch (error) {
      // Fallback for testing or non-electron environments
      console.log('⚠️ Electron app not available during reinitialize, using fallback path')
      const appDir = process.execPath ? require('path').dirname(process.execPath) : process.cwd()
      dbPath = join(appDir, 'dental_clinic.db')
    }

    this.db = new Database(dbPath)

    // Enable foreign keys and other optimizations
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('cache_size = 1000')
    this.db.pragma('temp_store = MEMORY')

    console.log('✅ Database connection reinitialized')
  }

  // Check if database is open
  isOpen() {
    return this.db && this.db.open
  }

  // Manual migration method to add tooth_treatment_id column if missing
  async ensureToothTreatmentIdColumn() {
    try {
      this.ensureConnection()

      // Check if tooth_treatment_id column exists
      const tableInfo = this.db.prepare("PRAGMA table_info(payments)").all()
      const hasToothTreatmentId = tableInfo.some(col => col.name === 'tooth_treatment_id')

      if (!hasToothTreatmentId) {
        console.log('🔧 Adding missing tooth_treatment_id column to payments table...')

        // Add the missing column
        this.db.exec('ALTER TABLE payments ADD COLUMN tooth_treatment_id TEXT')

        // Add treatment payment tracking columns
        try {
          this.db.exec('ALTER TABLE payments ADD COLUMN treatment_total_cost DECIMAL(10,2)')
        } catch (e) {
          // Column might already exist
          console.log('treatment_total_cost column already exists or failed to add:', e.message)
        }

        try {
          this.db.exec('ALTER TABLE payments ADD COLUMN treatment_total_paid DECIMAL(10,2)')
        } catch (e) {
          // Column might already exist
          console.log('treatment_total_paid column already exists or failed to add:', e.message)
        }

        try {
          this.db.exec('ALTER TABLE payments ADD COLUMN treatment_remaining_balance DECIMAL(10,2)')
        } catch (e) {
          // Column might already exist
          console.log('treatment_remaining_balance column already exists or failed to add:', e.message)
        }

        // Create indexes for better performance
        try {
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_payments_tooth_treatment ON payments(tooth_treatment_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_payments_patient_treatment ON payments(patient_id, tooth_treatment_id)')
        } catch (e) {
          console.log('Index creation failed:', e.message)
        }

        console.log('✅ tooth_treatment_id column and related fields added successfully')
        return true
      } else {
        console.log('✅ tooth_treatment_id column already exists')
        return false
      }
    } catch (error) {
      console.error('❌ Error ensuring tooth_treatment_id column:', error)
      throw error
    }
  }

  // Manual migration method to ensure lab_orders table has all required columns
  async ensureLabOrdersColumns() {
    try {
      this.ensureConnection()

      // Check if lab_orders table exists
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='lab_orders'
      `).get()

      if (!tableExists) {
        console.log('🔧 lab_orders table does not exist, creating it...')
        // Create the table with all required columns
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

      // Check existing columns
      const tableInfo = this.db.prepare("PRAGMA table_info(lab_orders)").all()
      const columnNames = tableInfo.map(col => col.name)

      console.log('🔍 Current lab_orders columns:', columnNames)

      // List of required columns with their definitions
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

      // Add missing columns
      for (const column of requiredColumns) {
        if (!columnNames.includes(column.name)) {
          try {
            console.log(`🔧 Adding missing ${column.name} column to lab_orders table...`)
            this.db.exec(`ALTER TABLE lab_orders ADD COLUMN ${column.name} ${column.definition}`)
            console.log(`✅ ${column.name} column added successfully`)
            columnsAdded = true
          } catch (e) {
            console.log(`⚠️ Failed to add ${column.name} column:`, e.message)
          }
        }
      }

      // Create indexes if columns were added
      if (columnsAdded) {
        try {
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_lab_orders_treatment ON lab_orders(tooth_treatment_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_lab_orders_appointment ON lab_orders(appointment_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_lab_orders_tooth ON lab_orders(tooth_number)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_tooth ON lab_orders(patient_id, tooth_number)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_lab_orders_priority ON lab_orders(priority)')
          console.log('✅ lab_orders indexes created successfully')
        } catch (e) {
          console.log('⚠️ Index creation failed:', e.message)
        }

        // Create triggers for automatic tooth_number population
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
        } catch (e) {
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

  // Force WAL checkpoint to ensure data is written to main database file
  forceCheckpoint() {
    if (this.db && this.isOpen()) {
      console.log('💾 Forcing WAL checkpoint...')
      const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
      console.log('💾 Checkpoint result:', checkpoint)
      return checkpoint
    }
    return null
  }

  // Lab operations
  async getAllLabs() {
    console.log('🔍 [DEBUG] getAllLabs() called')

    try {
      this.ensureConnection()
      console.log('✅ [DEBUG] Database connection ensured')

      this.ensureLabTablesExist() // Ensure tables exist before querying
      console.log('✅ [DEBUG] Lab tables existence ensured')

      const stmt = this.db.prepare('SELECT * FROM labs ORDER BY name')
      const labs = stmt.all()
      console.log(`📊 [DEBUG] Found ${labs.length} labs in database:`, labs)

      return labs
    } catch (error) {
      console.error('❌ [DEBUG] Error in getAllLabs():', error)
      throw error
    }
  }

  async createLab(lab) {
    console.log('🔍 [DEBUG] createLab() called with data:', lab)

    try {
      this.ensureConnection()
      console.log('✅ [DEBUG] Database connection ensured for createLab')

      this.ensureLabTablesExist() // Ensure tables exist before inserting
      console.log('✅ [DEBUG] Lab tables existence ensured for createLab')

      const id = uuidv4()
      const now = new Date().toISOString()
      console.log('🆔 [DEBUG] Generated ID:', id, 'Timestamp:', now)

      // Validate input data
      if (!lab.name || lab.name.trim() === '') {
        throw new Error('Lab name is required')
      }
      console.log('✅ [DEBUG] Lab data validation passed')

      console.log('🧪 [DEBUG] Creating lab with data:', {
        id,
        name: lab.name,
        contact_info: lab.contact_info,
        address: lab.address,
        created_at: now,
        updated_at: now
      })

      const stmt = this.db.prepare(`
        INSERT INTO labs (
          id, name, contact_info, address, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      console.log('✅ [DEBUG] SQL statement prepared')

      const result = stmt.run(
        id, lab.name, lab.contact_info, lab.address, now, now
      )
      console.log('✅ [DEBUG] SQL statement executed. Result:', result)

      console.log('✅ [DEBUG] Lab created successfully:', {
        id,
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid
      })

      // Force WAL checkpoint to ensure data is written
      console.log('💾 [DEBUG] Forcing WAL checkpoint...')
      const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
      console.log('💾 [DEBUG] Checkpoint result:', checkpoint)

      // Verify the lab was actually inserted
      const verifyStmt = this.db.prepare('SELECT * FROM labs WHERE id = ?')
      const insertedLab = verifyStmt.get(id)
      console.log('🔍 [DEBUG] Verification - Lab found in database:', insertedLab)

      const finalResult = { ...lab, id, created_at: now, updated_at: now }
      console.log('📤 [DEBUG] Returning final result:', finalResult)

      return finalResult
    } catch (error) {
      console.error('❌ [DEBUG] Error in createLab():', error)
      console.error('❌ [DEBUG] Error stack:', error.stack)
      throw error
    }
  }

  async updateLab(id, updates) {
    this.ensureConnection()
    this.ensureLabTablesExist()

    const now = new Date().toISOString()
    const fields = Object.keys(updates).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = this.db.prepare(`
      UPDATE labs
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
    return { ...updates, id, updated_at: now }
  }

  async deleteLab(id) {
    this.ensureConnection()
    this.ensureLabTablesExist()

    const stmt = this.db.prepare('DELETE FROM labs WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async searchLabs(query) {
    this.ensureConnection()
    this.ensureLabTablesExist()

    const stmt = this.db.prepare(`
      SELECT * FROM labs
      WHERE name LIKE ? OR contact_info LIKE ? OR address LIKE ?
      ORDER BY name
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm)
  }

  // Lab order operations
  async getAllLabOrders() {
    console.log('🔍 [DEBUG] getAllLabOrders() called')
    this.ensureConnection()
    this.ensureLabTablesExist()

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
    const labOrders = stmt.all()
    console.log('📊 [DEBUG] Raw lab orders from database:', labOrders.length)

    // Add lab and patient objects for compatibility
    return labOrders.map((order, index) => {
      console.log(`🔍 [DEBUG] Processing lab order ${index + 1}:`, {
        id: order.id,
        lab_id: order.lab_id,
        lab_name: order.lab_name,
        service_name: order.service_name
      })

      const labOrder = {
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

      // Always create lab object, even if lab_name is null
      labOrder.lab = {
        id: order.lab_id,
        name: order.lab_name || 'مختبر محذوف',
        contact_info: order.lab_contact_info || '',
        address: order.lab_address || '',
        created_at: '',
        updated_at: ''
      }

      if (order.patient_name) {
        labOrder.patient = {
          id: order.patient_id,
          full_name: order.patient_name,
          phone: order.patient_phone,
          gender: order.patient_gender
        }
      }

      console.log(`✅ [DEBUG] Processed lab order with lab name: "${labOrder.lab.name}"`)
      return labOrder
    })
  }

  async getLabOrdersByPatient(patientId) {
    console.log('🔍 [DEBUG] getLabOrdersByPatient() called with patientId:', patientId)
    this.ensureConnection()
    this.ensureLabTablesExist()

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
      WHERE lo.patient_id = ?
      ORDER BY lo.order_date DESC
    `)
    const labOrders = stmt.all(patientId)
    console.log('📊 [DEBUG] Raw lab orders from database for patient:', labOrders.length)

    // Add lab and patient objects for compatibility
    return labOrders.map((order, index) => {
      const labOrder = {
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

      // Always create lab object, even if lab_name is null
      labOrder.lab = {
        id: order.lab_id,
        name: order.lab_name || 'مختبر محذوف',
        contact_info: order.lab_contact_info || '',
        address: order.lab_address || '',
        created_at: '',
        updated_at: ''
      }

      if (order.patient_name) {
        labOrder.patient = {
          id: order.patient_id,
          full_name: order.patient_name,
          phone: order.patient_phone,
          gender: order.patient_gender
        }
      }

      return labOrder
    })
  }

  async createLabOrder(labOrder) {
    this.ensureConnection()
    this.ensureLabTablesExist()

    const id = uuidv4()
    const now = new Date().toISOString()

    try {
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

  async updateLabOrder(id, labOrder) {
    this.ensureConnection()
    this.ensureLabTablesExist()

    const now = new Date().toISOString()

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

    stmt.run(
      labOrder.lab_id, labOrder.patient_id, labOrder.appointment_id,
      labOrder.tooth_treatment_id, labOrder.tooth_number, labOrder.service_name,
      labOrder.cost, labOrder.order_date, labOrder.expected_delivery_date,
      labOrder.actual_delivery_date, labOrder.status, labOrder.notes,
      labOrder.paid_amount, labOrder.remaining_balance, labOrder.priority,
      labOrder.lab_instructions, labOrder.material_type, labOrder.color_shade,
      now, id
    )

    return { ...labOrder, id, updated_at: now }
  }

  async deleteLabOrder(id) {
    this.ensureConnection()
    this.ensureLabTablesExist()

    const stmt = this.db.prepare('DELETE FROM lab_orders WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async searchLabOrders(query) {
    this.ensureConnection()
    this.ensureLabTablesExist()

    const stmt = this.db.prepare(`
      SELECT
        lo.*,
        l.name as lab_name,
        p.full_name as patient_name
      FROM lab_orders lo
      LEFT JOIN labs l ON lo.lab_id = l.id
      LEFT JOIN patients p ON lo.patient_id = p.id
      WHERE l.name LIKE ? OR p.full_name LIKE ? OR lo.service_name LIKE ?
      ORDER BY lo.order_date DESC
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm)
  }

  // Medications operations
  async ensureMedicationTablesExist() {
    try {
      console.log('🔍 [DEBUG] Checking if medication tables exist...')

      // Check if medications table exists
      const medicationsTableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='medications'
      `).get()

      // Check if prescriptions table exists
      const prescriptionsTableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='prescriptions'
      `).get()

      // Check if prescription_medications table exists
      const prescriptionMedicationsTableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='prescription_medications'
      `).get()

      console.log('🔍 [DEBUG] Medication tables status:')
      console.log('  - medications:', !!medicationsTableExists)
      console.log('  - prescriptions:', !!prescriptionsTableExists)
      console.log('  - prescription_medications:', !!prescriptionMedicationsTableExists)

      // Create medications table if it doesn't exist
      if (!medicationsTableExists) {
        console.log('🏗️ [DEBUG] Creating medications table...')
        this.db.exec(`
          CREATE TABLE medications (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            instructions TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `)
        console.log('✅ [DEBUG] Medications table created successfully')
      } else {
        console.log('✅ [DEBUG] Medications table already exists')
      }

      // Create prescriptions table if it doesn't exist
      if (!prescriptionsTableExists) {
        console.log('🏗️ [DEBUG] Creating prescriptions table...')
        this.db.exec(`
          CREATE TABLE prescriptions (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            appointment_id TEXT,
            prescription_date TEXT NOT NULL,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
          )
        `)
        console.log('✅ [DEBUG] Prescriptions table created successfully')
      } else {
        console.log('✅ [DEBUG] Prescriptions table already exists')
      }

      // Create prescription_medications table if it doesn't exist
      if (!prescriptionMedicationsTableExists) {
        console.log('🏗️ [DEBUG] Creating prescription_medications table...')
        this.db.exec(`
          CREATE TABLE prescription_medications (
            id TEXT PRIMARY KEY,
            prescription_id TEXT NOT NULL,
            medication_id TEXT NOT NULL,
            dose TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
            FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
          )
        `)
        console.log('✅ [DEBUG] Prescription medications table created successfully')
      } else {
        console.log('✅ [DEBUG] Prescription medications table already exists')
      }

      // Create indexes if they don't exist
      this.createMedicationIndexes()

    } catch (error) {
      console.error('❌ [DEBUG] Error in ensureMedicationTablesExist:', error)
      console.error('❌ [DEBUG] Error stack:', error.stack)
      throw error
    }
  }

  createMedicationIndexes() {
    try {
      console.log('🔍 Creating medication indexes...')

      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name)',
        'CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id)',
        'CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment ON prescriptions(appointment_id)',
        'CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON prescriptions(prescription_date)',
        'CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_date ON prescriptions(patient_id, prescription_date)',
        'CREATE INDEX IF NOT EXISTS idx_prescription_medications_prescription ON prescription_medications(prescription_id)',
        'CREATE INDEX IF NOT EXISTS idx_prescription_medications_medication ON prescription_medications(medication_id)'
      ]

      indexes.forEach(indexSql => {
        try {
          this.db.exec(indexSql)
        } catch (error) {
          console.warn('Index creation warning:', error.message)
        }
      })

      console.log('✅ Medication indexes created successfully')
    } catch (error) {
      console.error('❌ Error creating medication indexes:', error)
    }
  }

  /**
   * Ensure clinic needs table exists
   */
  ensureClinicNeedsTableExists() {
    try {
      console.log('🔍 [DEBUG] Checking clinic needs table existence...')

      // Check if clinic_needs table exists
      const clinicNeedsTableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='clinic_needs'
      `).get()

      console.log('🔍 [DEBUG] Clinic needs table status:')
      console.log('  - clinic_needs:', !!clinicNeedsTableExists)

      // Create clinic_needs table if it doesn't exist
      if (!clinicNeedsTableExists) {
        console.log('🏗️ [DEBUG] Creating clinic_needs table...')
        this.db.exec(`
          CREATE TABLE clinic_needs (
            id TEXT PRIMARY KEY,
            serial_number TEXT UNIQUE NOT NULL,
            need_name TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            price DECIMAL(10,2) NOT NULL DEFAULT 0,
            description TEXT,
            category TEXT,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'pending',
            supplier TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `)
        console.log('✅ [DEBUG] Clinic needs table created successfully')
      } else {
        console.log('✅ [DEBUG] Clinic needs table already exists')
      }

      // Create indexes if they don't exist
      this.createClinicNeedsIndexes()

      // Check if clinic_expenses table exists
      const clinicExpensesTableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='clinic_expenses'
      `).get()

      // Create clinic_expenses table if it doesn't exist
      if (!clinicExpensesTableExists) {
        console.log('🏗️ [DEBUG] Creating clinic_expenses table...')
        this.db.exec(`
          CREATE TABLE clinic_expenses (
            id TEXT PRIMARY KEY,
            expense_name TEXT NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            expense_type TEXT NOT NULL,
            category TEXT,
            description TEXT,
            payment_method TEXT NOT NULL,
            payment_date DATETIME NOT NULL,
            due_date DATETIME,
            is_recurring BOOLEAN DEFAULT 0,
            recurring_frequency TEXT,
            recurring_end_date DATETIME,
            status TEXT DEFAULT 'pending',
            receipt_number TEXT,
            vendor TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `)
        console.log('✅ [DEBUG] Clinic expenses table created successfully')
      } else {
        console.log('✅ [DEBUG] Clinic expenses table already exists')
      }

      // Create indexes for clinic_expenses if they don't exist
      this.createClinicExpensesIndexes()

    } catch (error) {
      console.error('❌ [DEBUG] Error in ensureClinicNeedsTableExists:', error)
      console.error('❌ [DEBUG] Error stack:', error.stack)
      throw error
    }
  }

  createClinicNeedsIndexes() {
    try {
      console.log('🔍 Creating clinic needs indexes...')

      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_clinic_needs_serial_number ON clinic_needs(serial_number)',
        'CREATE INDEX IF NOT EXISTS idx_clinic_needs_name ON clinic_needs(need_name)',
        'CREATE INDEX IF NOT EXISTS idx_clinic_needs_category ON clinic_needs(category)',
        'CREATE INDEX IF NOT EXISTS idx_clinic_needs_priority ON clinic_needs(priority)',
        'CREATE INDEX IF NOT EXISTS idx_clinic_needs_status ON clinic_needs(status)',
        'CREATE INDEX IF NOT EXISTS idx_clinic_needs_supplier ON clinic_needs(supplier)',
        'CREATE INDEX IF NOT EXISTS idx_clinic_needs_created_at ON clinic_needs(created_at)'
      ]

      indexes.forEach(indexSql => {
        try {
          this.db.exec(indexSql)
        } catch (error) {
          console.warn('Clinic needs index creation warning:', error.message)
        }
      })

      console.log('✅ Clinic needs indexes created successfully')
    } catch (error) {
      console.error('❌ Error creating clinic needs indexes:', error)
    }
  }

  createClinicExpensesIndexes() {
    try {
      console.log('🔍 Creating clinic expenses indexes...')

      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_clinic_expenses_expense_name ON clinic_expenses(expense_name)',
        'CREATE INDEX IF NOT EXISTS idx_clinic_expenses_expense_type ON clinic_expenses(expense_type)',
        'CREATE INDEX IF NOT EXISTS idx_clinic_expenses_status ON clinic_expenses(status)',
        'CREATE INDEX IF NOT EXISTS idx_clinic_expenses_payment_date ON clinic_expenses(payment_date)',
        'CREATE INDEX IF NOT EXISTS idx_clinic_expenses_due_date ON clinic_expenses(due_date)',
        'CREATE INDEX IF NOT EXISTS idx_clinic_expenses_is_recurring ON clinic_expenses(is_recurring)',
        'CREATE INDEX IF NOT EXISTS idx_clinic_expenses_vendor ON clinic_expenses(vendor)',
        'CREATE INDEX IF NOT EXISTS idx_clinic_expenses_created_at ON clinic_expenses(created_at)'
      ]

      indexes.forEach(indexSql => {
        try {
          this.db.exec(indexSql)
        } catch (error) {
          console.warn('Clinic expenses index creation warning:', error.message)
        }
      })

      console.log('✅ Clinic expenses indexes created successfully')
    } catch (error) {
      console.error('❌ Error creating clinic expenses indexes:', error)
    }
  }

  async getAllMedications() {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const stmt = this.db.prepare(`
      SELECT * FROM medications
      ORDER BY name
    `)
    return stmt.all()
  }

  async createMedication(medication) {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO medications (id, name, instructions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    const result = stmt.run(id, medication.name, medication.instructions, now, now)
    console.log('✅ Medication inserted, changes:', result.changes)

    // Force WAL checkpoint
    const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
    console.log('💾 Checkpoint result:', checkpoint)

    return { ...medication, id, created_at: now, updated_at: now }
  }

  async updateMedication(id, updates) {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const now = new Date().toISOString()
    const fields = Object.keys(updates).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = this.db.prepare(`
      UPDATE medications
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
    return { ...updates, id, updated_at: now }
  }

  async deleteMedication(id) {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const stmt = this.db.prepare('DELETE FROM medications WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async getAllPrescriptions() {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const stmt = this.db.prepare(`
      SELECT
        p.*,
        pt.full_name as patient_name,
        a.title as appointment_title
      FROM prescriptions p
      LEFT JOIN patients pt ON p.patient_id = pt.id
      LEFT JOIN appointments a ON p.appointment_id = a.id
      ORDER BY p.prescription_date DESC
    `)

    const prescriptions = stmt.all()

    // Get medications for each prescription
    const medicationsStmt = this.db.prepare(`
      SELECT
        pm.*,
        m.name as medication_name,
        m.instructions as medication_instructions
      FROM prescription_medications pm
      LEFT JOIN medications m ON pm.medication_id = m.id
      WHERE pm.prescription_id = ?
    `)

    return prescriptions.map(prescription => ({
      ...prescription,
      patient: prescription.patient_id ? {
        id: prescription.patient_id,
        full_name: prescription.patient_name
      } : null,
      appointment: prescription.appointment_id ? {
        id: prescription.appointment_id,
        title: prescription.appointment_title
      } : null,
      medications: medicationsStmt.all(prescription.id)
    }))
  }

  async createPrescription(prescription) {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const id = uuidv4()
    const now = new Date().toISOString()

    // Begin transaction
    const transaction = this.db.transaction(() => {
      // Insert prescription
      const prescriptionStmt = this.db.prepare(`
        INSERT INTO prescriptions (id, patient_id, appointment_id, prescription_date, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)

      prescriptionStmt.run(
        id,
        prescription.patient_id,
        prescription.appointment_id,
        prescription.prescription_date,
        prescription.notes,
        now,
        now
      )

      // Insert prescription medications
      if (prescription.medications && prescription.medications.length > 0) {
        const medicationStmt = this.db.prepare(`
          INSERT INTO prescription_medications (id, prescription_id, medication_id, dose, created_at)
          VALUES (?, ?, ?, ?, ?)
        `)

        prescription.medications.forEach(med => {
          const medId = uuidv4()
          medicationStmt.run(medId, id, med.medication_id, med.dose, now)
        })
      }
    })

    transaction()

    // Force WAL checkpoint
    const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
    console.log('💾 Checkpoint result:', checkpoint)

    return { ...prescription, id, created_at: now, updated_at: now }
  }

  async updatePrescription(id, updates) {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const now = new Date().toISOString()

    // Verify prescription exists first
    const checkStmt = this.db.prepare('SELECT id FROM prescriptions WHERE id = ?')
    const existingPrescription = checkStmt.get(id)

    if (!existingPrescription) {
      throw new Error(`Prescription with id ${id} not found`)
    }

    // Verify table structure
    const tableInfo = this.db.prepare("PRAGMA table_info(prescription_medications)").all()
    console.log('📋 prescription_medications table structure:', tableInfo)

    console.log('🔄 Updating prescription:', id, 'with data:', updates)

    // Begin transaction
    const transaction = this.db.transaction(() => {
      // Update prescription
      const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'medications')
      if (fields.length > 0) {
        const setClause = fields.map(field => `${field} = ?`).join(', ')
        const values = fields.map(field => updates[field])

        const stmt = this.db.prepare(`
          UPDATE prescriptions
          SET ${setClause}, updated_at = ?
          WHERE id = ?
        `)

        console.log('📝 Updating prescription fields:', fields, 'with values:', values)
        stmt.run(...values, now, id)
      }

      // Update medications if provided
      if (updates.medications) {
        console.log('💊 Updating medications for prescription:', id, 'medications:', updates.medications)

        // Delete existing medications
        const deleteStmt = this.db.prepare('DELETE FROM prescription_medications WHERE prescription_id = ?')
        const deleteResult = deleteStmt.run(id)
        console.log('🗑️ Deleted existing medications, changes:', deleteResult.changes)

        // Insert new medications
        if (updates.medications.length > 0) {
          const medicationStmt = this.db.prepare(`
            INSERT INTO prescription_medications (id, prescription_id, medication_id, dose, created_at)
            VALUES (?, ?, ?, ?, ?)
          `)

          updates.medications.forEach((med, index) => {
            const medId = uuidv4()

            // Validate medication data
            if (!med.medication_id) {
              throw new Error(`Medication ${index + 1} is missing medication_id`)
            }

            // Verify medication exists
            const medicationCheckStmt = this.db.prepare('SELECT id FROM medications WHERE id = ?')
            const medicationExists = medicationCheckStmt.get(med.medication_id)

            if (!medicationExists) {
              throw new Error(`Medication with id ${med.medication_id} not found`)
            }

            console.log(`💊 Inserting medication ${index + 1}:`, {
              medId,
              prescriptionId: id,
              medicationId: med.medication_id,
              dose: med.dose
            })

            try {
              medicationStmt.run(medId, id, med.medication_id, med.dose || '', now)
              console.log(`✅ Medication ${index + 1} inserted successfully`)
            } catch (error) {
              console.error(`❌ Error inserting medication ${index + 1}:`, error)
              throw error
            }
          })
        }
      }
    })

    try {
      transaction()
      console.log('✅ Prescription update transaction completed successfully')
    } catch (error) {
      console.error('❌ Error in prescription update transaction:', error)
      throw error
    }

    // Force WAL checkpoint
    const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
    console.log('💾 Checkpoint result:', checkpoint)

    return { ...updates, id, updated_at: now }
  }

  async deletePrescription(id) {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const stmt = this.db.prepare('DELETE FROM prescriptions WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async searchMedications(query) {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const stmt = this.db.prepare(`
      SELECT * FROM medications
      WHERE name LIKE ? OR instructions LIKE ?
      ORDER BY name
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm)
  }

  async getPrescriptionsByPatient(patientId) {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const stmt = this.db.prepare(`
      SELECT
        p.*,
        pt.full_name as patient_name,
        a.title as appointment_title
      FROM prescriptions p
      LEFT JOIN patients pt ON p.patient_id = pt.id
      LEFT JOIN appointments a ON p.appointment_id = a.id
      WHERE p.patient_id = ?
      ORDER BY p.prescription_date DESC
    `)

    const prescriptions = stmt.all(patientId)

    // Get medications for each prescription
    const medicationsStmt = this.db.prepare(`
      SELECT
        pm.*,
        m.name as medication_name,
        m.instructions as medication_instructions
      FROM prescription_medications pm
      LEFT JOIN medications m ON pm.medication_id = m.id
      WHERE pm.prescription_id = ?
    `)

    return prescriptions.map(prescription => ({
      ...prescription,
      patient: prescription.patient_id ? {
        id: prescription.patient_id,
        full_name: prescription.patient_name
      } : null,
      appointment: prescription.appointment_id ? {
        id: prescription.appointment_id,
        title: prescription.appointment_title
      } : null,
      medications: medicationsStmt.all(prescription.id)
    }))
  }

  async searchPrescriptions(query) {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const stmt = this.db.prepare(`
      SELECT
        p.*,
        pt.full_name as patient_name,
        a.title as appointment_title
      FROM prescriptions p
      LEFT JOIN patients pt ON p.patient_id = pt.id
      LEFT JOIN appointments a ON p.appointment_id = a.id
      WHERE pt.full_name LIKE ? OR a.title LIKE ? OR p.notes LIKE ?
      ORDER BY p.prescription_date DESC
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm)
  }









  async fixDentalTreatmentStatusConstraint() {
    try {
      console.log('🔧 [DEBUG] Fixing dental treatment status constraint...')

      // Check if the table exists and has the problematic CHECK constraint
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='dental_treatments'
      `).get()

      if (tableExists) {
        // Get table schema to check for CHECK constraints
        const tableSchema = this.db.prepare(`
          SELECT sql FROM sqlite_master WHERE type='table' AND name='dental_treatments'
        `).get()

        console.log('🔍 [DEBUG] Current table schema:', tableSchema?.sql)

        // If the schema contains the old CHECK constraint, recreate the table
        if (tableSchema?.sql && tableSchema.sql.includes("treatment_status IN ('active', 'completed', 'cancelled', 'on_hold')")) {
          console.log('🔧 [DEBUG] Found problematic CHECK constraint, recreating table...')

          // Disable foreign keys temporarily
          this.db.exec('PRAGMA foreign_keys = OFF')

          try {
            // Create backup of existing data
            this.db.exec(`
              CREATE TABLE IF NOT EXISTS dental_treatments_backup AS
              SELECT * FROM dental_treatments
            `)

            // Drop the problematic table
            this.db.exec('DROP TABLE dental_treatments')

            // Create new table with correct structure (no CHECK constraints for treatment_status)
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

            // Restore data with status conversion
            this.db.exec(`
              INSERT INTO dental_treatments
              SELECT id, patient_id, appointment_id, tooth_number, tooth_name,
                     current_treatment, next_treatment, treatment_details,
                     CASE
                       WHEN treatment_status = 'active' THEN 'in_progress'
                       WHEN treatment_status = 'on_hold' THEN 'planned'
                       ELSE COALESCE(treatment_status, 'planned')
                     END as treatment_status,
                     treatment_color, cost, notes, created_at, updated_at
              FROM dental_treatments_backup
            `)

            // Clean up backup
            this.db.exec('DROP TABLE dental_treatments_backup')

            console.log('✅ [DEBUG] Table recreated successfully with correct constraints')

          } finally {
            // Re-enable foreign keys
            this.db.exec('PRAGMA foreign_keys = ON')
          }
        } else {
          console.log('✅ [DEBUG] Table schema is correct, no fix needed')
        }
      }

    } catch (error) {
      console.error('❌ [DEBUG] Error fixing dental treatment status constraint:', error)
      // Don't throw the error, just log it and continue
    }
  }

  async ensureDentalTreatmentTablesExist() {
    try {
      console.log('🔍 [DEBUG] Checking if dental treatment tables exist...')

      // First, try to fix the status constraint issue
      await this.fixDentalTreatmentStatusConstraint()

      // Check if dental_treatments table exists
      const dentalTreatmentsTableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='dental_treatments'
      `).get()

      // Check if dental_treatment_images table exists
      const dentalTreatmentImagesTableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='dental_treatment_images'
      `).get()

      console.log('🔍 [DEBUG] Dental treatment tables status:')
      console.log('  - dental_treatments:', !!dentalTreatmentsTableExists)
      console.log('  - dental_treatment_images:', !!dentalTreatmentImagesTableExists)

      // If dental_treatments table exists, check if it has the correct schema
      if (dentalTreatmentsTableExists) {
        console.log('🔍 [DEBUG] Checking dental_treatments table schema...')

        // Get current table schema
        const tableInfo = this.db.prepare(`PRAGMA table_info(dental_treatments)`).all()
        const columnNames = tableInfo.map(col => col.name)
        console.log('🔍 [DEBUG] Current dental_treatments columns:', columnNames)

        // Check if required columns exist
        const hasToothNumber = columnNames.includes('tooth_number')
        const hasToothName = columnNames.includes('tooth_name')
        const hasCurrentTreatment = columnNames.includes('current_treatment')
        const hasNextTreatment = columnNames.includes('next_treatment')
        const hasTreatmentDetails = columnNames.includes('treatment_details')
        const hasTreatmentColor = columnNames.includes('treatment_color')
        const hasCost = columnNames.includes('cost')

        console.log('🔍 [DEBUG] Schema check:')
        console.log('  - has tooth_number:', hasToothNumber)
        console.log('  - has tooth_name:', hasToothName)
        console.log('  - has current_treatment:', hasCurrentTreatment)
        console.log('  - has next_treatment:', hasNextTreatment)
        console.log('  - has treatment_details:', hasTreatmentDetails)
        console.log('  - has treatment_color:', hasTreatmentColor)
        console.log('  - has cost:', hasCost)

        // Add missing columns one by one
        if (!hasToothNumber) {
          console.log('🔧 [DEBUG] Adding tooth_number column to dental_treatments table...')
          this.db.exec(`ALTER TABLE dental_treatments ADD COLUMN tooth_number INTEGER NOT NULL DEFAULT 1`)
          console.log('✅ [DEBUG] tooth_number column added successfully')
        }

        if (!hasToothName) {
          console.log('🔧 [DEBUG] Adding tooth_name column to dental_treatments table...')
          this.db.exec(`ALTER TABLE dental_treatments ADD COLUMN tooth_name TEXT DEFAULT ''`)
          console.log('✅ [DEBUG] tooth_name column added successfully')
        }

        if (!hasCurrentTreatment) {
          console.log('🔧 [DEBUG] Adding current_treatment column to dental_treatments table...')
          this.db.exec(`ALTER TABLE dental_treatments ADD COLUMN current_treatment TEXT DEFAULT ''`)
          console.log('✅ [DEBUG] current_treatment column added successfully')
        }

        if (!hasNextTreatment) {
          console.log('🔧 [DEBUG] Adding next_treatment column to dental_treatments table...')
          this.db.exec(`ALTER TABLE dental_treatments ADD COLUMN next_treatment TEXT DEFAULT ''`)
          console.log('✅ [DEBUG] next_treatment column added successfully')
        }

        if (!hasTreatmentDetails) {
          console.log('🔧 [DEBUG] Adding treatment_details column to dental_treatments table...')
          this.db.exec(`ALTER TABLE dental_treatments ADD COLUMN treatment_details TEXT DEFAULT ''`)
          console.log('✅ [DEBUG] treatment_details column added successfully')
        }

        if (!hasTreatmentColor) {
          console.log('🔧 [DEBUG] Adding treatment_color column to dental_treatments table...')
          this.db.exec(`ALTER TABLE dental_treatments ADD COLUMN treatment_color TEXT DEFAULT '#ef4444'`)
          console.log('✅ [DEBUG] treatment_color column added successfully')
        }

        if (!hasCost) {
          console.log('🔧 [DEBUG] Adding cost column to dental_treatments table...')
          this.db.exec(`ALTER TABLE dental_treatments ADD COLUMN cost REAL DEFAULT 0`)
          console.log('✅ [DEBUG] cost column added successfully')
        }
      }

      // Create dental_treatments table if it doesn't exist
      if (!dentalTreatmentsTableExists) {
        console.log('🏗️ [DEBUG] Creating dental_treatments table...')
        this.db.exec(`
          CREATE TABLE dental_treatments (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            appointment_id TEXT,
            tooth_number INTEGER NOT NULL,
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
        console.log('✅ [DEBUG] Dental treatments table created successfully')
      } else {
        console.log('✅ [DEBUG] Dental treatments table already exists')
      }

      // Create dental_treatment_images table if it doesn't exist
      if (!dentalTreatmentImagesTableExists) {
        console.log('🏗️ [DEBUG] Creating dental_treatment_images table...')
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
        console.log('✅ [DEBUG] Dental treatment images table created successfully')
      } else {
        console.log('✅ [DEBUG] Dental treatment images table already exists')

        // Check if the table has the correct schema
        const imagesTableInfo = this.db.prepare(`PRAGMA table_info(dental_treatment_images)`).all()
        const imagesColumnNames = imagesTableInfo.map(col => col.name)
        console.log('🔍 [DEBUG] Current dental_treatment_images columns:', imagesColumnNames)

        // Check if we need to add missing columns
        const requiredColumns = ['patient_id', 'tooth_number', 'taken_date', 'updated_at']
        const missingColumns = requiredColumns.filter(col => !imagesColumnNames.includes(col))

        if (missingColumns.length > 0) {
          console.log('🔧 [DEBUG] Adding missing columns to dental_treatment_images:', missingColumns)

          for (const column of missingColumns) {
            try {
              if (column === 'patient_id') {
                this.db.exec(`ALTER TABLE dental_treatment_images ADD COLUMN patient_id TEXT`)
              } else if (column === 'tooth_number') {
                this.db.exec(`ALTER TABLE dental_treatment_images ADD COLUMN tooth_number INTEGER`)
              } else if (column === 'taken_date') {
                this.db.exec(`ALTER TABLE dental_treatment_images ADD COLUMN taken_date DATETIME DEFAULT CURRENT_TIMESTAMP`)
              } else if (column === 'updated_at') {
                this.db.exec(`ALTER TABLE dental_treatment_images ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`)
              }
              console.log(`✅ [DEBUG] Added column ${column} to dental_treatment_images`)
            } catch (error) {
              console.warn(`⚠️ [DEBUG] Could not add column ${column}:`, error.message)
            }
          }
        }
      }



      // Create indexes if they don't exist
      this.createDentalTreatmentIndexes()

    } catch (error) {
      console.error('❌ [DEBUG] Error in ensureDentalTreatmentTablesExist:', error)
      console.error('❌ [DEBUG] Error stack:', error.stack)
      throw error
    }
  }

  createDentalTreatmentIndexes() {
    try {
      console.log('🔍 Creating dental treatment indexes...')

      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_dental_treatments_patient ON dental_treatments(patient_id)',
        'CREATE INDEX IF NOT EXISTS idx_dental_treatments_appointment ON dental_treatments(appointment_id)',
        'CREATE INDEX IF NOT EXISTS idx_dental_treatments_tooth ON dental_treatments(tooth_number)',
        'CREATE INDEX IF NOT EXISTS idx_dental_treatments_status ON dental_treatments(treatment_status)',
        'CREATE INDEX IF NOT EXISTS idx_dental_treatments_patient_tooth ON dental_treatments(patient_id, tooth_number)',
        'CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_treatment ON dental_treatment_images(dental_treatment_id)',
        'CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_type ON dental_treatment_images(image_type)'
      ]

      indexes.forEach(indexSql => {
        try {
          this.db.exec(indexSql)
        } catch (error) {
          console.warn('Index creation warning:', error.message)
        }
      })

      console.log('✅ Dental treatment indexes created successfully')
    } catch (error) {
      console.error('❌ Error creating dental treatment indexes:', error)
    }
  }

  // Dental Treatment Image operations
  async getAllDentalTreatmentImages() {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    const stmt = this.db.prepare(`
      SELECT dti.*,
             dt.tooth_number,
             dt.tooth_name,
             p.full_name as patient_name
      FROM dental_treatment_images dti
      LEFT JOIN dental_treatments dt ON dti.dental_treatment_id = dt.id
      LEFT JOIN patients p ON dt.patient_id = p.id
      ORDER BY dti.created_at DESC
    `)
    return stmt.all()
  }

  async getDentalTreatmentImages(treatmentId) {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    const stmt = this.db.prepare(`
      SELECT * FROM dental_treatment_images
      WHERE dental_treatment_id = ?
      ORDER BY image_type, created_at
    `)
    return stmt.all(treatmentId)
  }

  async getDentalTreatmentImagesByTreatment(treatmentId) {
    // Alias for getDentalTreatmentImages for compatibility
    return this.getDentalTreatmentImages(treatmentId)
  }

  async createDentalTreatmentImage(image) {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

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

  async updateDentalTreatmentImage(id, updates) {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    const fields = Object.keys(updates).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = this.db.prepare(`
      UPDATE dental_treatment_images
      SET ${setClause}
      WHERE id = ?
    `)

    stmt.run(...values, id)
    return { ...updates, id }
  }

  async deleteDentalTreatmentImage(id) {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    const stmt = this.db.prepare('DELETE FROM dental_treatment_images WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }





  /**
   * Check if image migration is needed and run it
   */
  async checkAndRunImageMigration() {
    try {
      // Ensure schema_version table exists first
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY
        )
      `)

      // Check if migration has already been run
      let migrationVersion = 0
      try {
        const result = this.db.prepare(`
          SELECT version FROM schema_version
          WHERE version = 9
        `).get()
        migrationVersion = result ? result.version : 0
      } catch (error) {
        // Migration tracking not available
        console.log('Migration tracking not available:', error.message)
      }

      if (migrationVersion >= 9) {
        console.log('✅ Image migration already completed')
        return
      }

      // Check if dental_treatment_images table exists and has any images
      let imageRecords = { count: 0 }
      try {
        imageRecords = this.db.prepare(`
          SELECT COUNT(*) as count FROM dental_treatment_images
        `).get()
      } catch (error) {
        console.log('dental_treatment_images table does not exist, skipping migration')
        // Mark migration as completed since there's nothing to migrate
        this.db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(9)
        return
      }

      if (imageRecords.count === 0) {
        console.log('📁 No images found, skipping migration')
        // Mark migration as completed
        this.db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(9)
        return
      }

      console.log('🔄 Starting automatic image migration...')
      const result = await this.imageMigrationService.migrateImages()

      if (result.success) {
        console.log('✅ Image migration completed successfully')
        // Mark migration as completed
        this.db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(9)
      } else {
        console.warn('⚠️ Image migration completed with issues')
      }

    } catch (error) {
      console.error('❌ Error during image migration check:', error)
      // Don't throw error as this shouldn't prevent app startup
    }
  }

  /**
   * Manually trigger image migration
   */
  async runImageMigration() {
    console.log('🔄 Manually triggering image migration...')
    return await this.imageMigrationService.migrateImages()
  }

  // ==================== CLINIC NEEDS METHODS ====================

  async getAllClinicNeeds() {
    this.ensureConnection()
    this.ensureClinicNeedsTableExists()

    const stmt = this.db.prepare(`
      SELECT * FROM clinic_needs
      ORDER BY created_at DESC
    `)

    return stmt.all()
  }

  async getClinicNeedById(id) {
    this.ensureConnection()
    this.ensureClinicNeedsTableExists()

    const stmt = this.db.prepare(`
      SELECT * FROM clinic_needs WHERE id = ?
    `)

    return stmt.get(id)
  }

  async createClinicNeed(needData) {
    this.ensureConnection()
    this.ensureClinicNeedsTableExists()

    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO clinic_needs (
        id, serial_number, need_name, quantity, price, description,
        category, priority, status, supplier, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      needData.serial_number,
      needData.need_name,
      needData.quantity,
      needData.price,
      needData.description || null,
      needData.category || null,
      needData.priority || 'medium',
      needData.status || 'pending',
      needData.supplier || null,
      needData.notes || null,
      now,
      now
    )

    return this.getClinicNeedById(id)
  }

  async updateClinicNeed(id, needData) {
    this.ensureConnection()
    this.ensureClinicNeedsTableExists()

    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE clinic_needs SET
        serial_number = ?,
        need_name = ?,
        quantity = ?,
        price = ?,
        description = ?,
        category = ?,
        priority = ?,
        status = ?,
        supplier = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      needData.serial_number,
      needData.need_name,
      needData.quantity,
      needData.price,
      needData.description || null,
      needData.category || null,
      needData.priority || 'medium',
      needData.status || 'pending',
      needData.supplier || null,
      needData.notes || null,
      now,
      id
    )

    return this.getClinicNeedById(id)
  }

  async deleteClinicNeed(id) {
    this.ensureConnection()
    this.ensureClinicNeedsTableExists()

    const stmt = this.db.prepare(`
      DELETE FROM clinic_needs WHERE id = ?
    `)

    const result = stmt.run(id)
    return result.changes > 0
  }

  async searchClinicNeeds(searchQuery) {
    this.ensureConnection()
    this.ensureClinicNeedsTableExists()

    const stmt = this.db.prepare(`
      SELECT * FROM clinic_needs
      WHERE need_name LIKE ?
         OR serial_number LIKE ?
         OR description LIKE ?
         OR category LIKE ?
         OR supplier LIKE ?
      ORDER BY created_at DESC
    `)

    const query = `%${searchQuery}%`
    return stmt.all(query, query, query, query, query)
  }

  async getClinicNeedsByStatus(status) {
    this.ensureConnection()
    this.ensureClinicNeedsTableExists()

    const stmt = this.db.prepare(`
      SELECT * FROM clinic_needs
      WHERE status = ?
      ORDER BY created_at DESC
    `)

    return stmt.all(status)
  }

  async getClinicNeedsByPriority(priority) {
    this.ensureConnection()
    this.ensureClinicNeedsTableExists()

    const stmt = this.db.prepare(`
      SELECT * FROM clinic_needs
      WHERE priority = ?
      ORDER BY created_at DESC
    `)

    return stmt.all(priority)
  }

  async getClinicNeedsStatistics() {
    this.ensureConnection()
    this.ensureClinicNeedsTableExists()

    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_needs,
        SUM(price * quantity) as total_value,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'ordered' THEN 1 ELSE 0 END) as ordered_count,
        SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as received_count,
        SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_count
      FROM clinic_needs
    `)

    return stmt.get()
  }

  // NEW: Multiple treatments per tooth operations
  ensureToothTreatmentsTableExists() {
    this.ensureConnection()

    // Create tooth_treatments table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tooth_treatments (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        tooth_number INTEGER NOT NULL,
        tooth_name TEXT,
        treatment_type TEXT NOT NULL,
        treatment_category TEXT,
        treatment_status TEXT DEFAULT 'planned' CHECK (treatment_status IN ('planned', 'in_progress', 'completed', 'cancelled')),
        treatment_color TEXT DEFAULT '#22c55e',
        start_date TEXT,
        completion_date TEXT,
        cost REAL DEFAULT 0,
        priority INTEGER DEFAULT 1,
        notes TEXT,
        appointment_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
        FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE SET NULL
      )
    `)

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tooth_treatments_patient_id ON tooth_treatments (patient_id);
      CREATE INDEX IF NOT EXISTS idx_tooth_treatments_tooth_number ON tooth_treatments (tooth_number);
      CREATE INDEX IF NOT EXISTS idx_tooth_treatments_patient_tooth ON tooth_treatments (patient_id, tooth_number);
      CREATE INDEX IF NOT EXISTS idx_tooth_treatments_priority ON tooth_treatments (patient_id, tooth_number, priority);
    `)

    // Check if tooth_treatment_images table exists and migrate if needed
    const tableExists = this.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='tooth_treatment_images'
    `).get()

    if (tableExists) {
      // Check if tooth_treatment_id is nullable
      const tableInfo = this.db.prepare(`PRAGMA table_info(tooth_treatment_images)`).all()
      const treatmentIdColumn = tableInfo.find(col => col.name === 'tooth_treatment_id')

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
  }

  async getAllToothTreatments() {
    this.ensureConnection()
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

  async getToothTreatmentsByPatient(patientId) {
    this.ensureConnection()
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

  async getToothTreatmentsByTooth(patientId, toothNumber) {
    this.ensureConnection()
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

  async createToothTreatment(treatment) {
    this.ensureConnection()
    this.ensureToothTreatmentsTableExists()

    const { v4: uuidv4 } = require('uuid')
    const id = uuidv4()
    const now = new Date().toISOString()

    // Auto-assign priority if not provided
    if (!treatment.priority) {
      const maxPriorityStmt = this.db.prepare(`
        SELECT COALESCE(MAX(priority), 0) + 1 as next_priority
        FROM tooth_treatments
        WHERE patient_id = ? AND tooth_number = ?
      `)
      const result = maxPriorityStmt.get(treatment.patient_id, treatment.tooth_number)
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

  async updateToothTreatment(id, updates) {
    this.ensureConnection()
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

    const stmt = this.db.prepare(`
      UPDATE tooth_treatments
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
  }

  async deleteToothTreatment(id) {
    this.ensureConnection()
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

    return transaction()
  }

  async reorderToothTreatments(patientId, toothNumber, treatmentIds) {
    this.ensureConnection()
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
      const currentTreatments = getCurrentStmt.all(patientId, toothNumber)

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
  async getAllToothTreatmentImages() {
    this.ensureConnection()
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

  async getToothTreatmentImagesByTreatment(treatmentId) {
    this.ensureConnection()
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

  async getToothTreatmentImagesByTooth(patientId, toothNumber) {
    this.ensureConnection()
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

  async createToothTreatmentImage(image) {
    this.ensureConnection()
    this.ensureToothTreatmentsTableExists()

    const { v4: uuidv4 } = require('uuid')
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

  async deleteToothTreatmentImage(id) {
    this.ensureConnection()
    this.ensureToothTreatmentsTableExists()

    const stmt = this.db.prepare('DELETE FROM tooth_treatment_images WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // Smart Alerts Methods
  ensureSmartAlertsTableExists() {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS smart_alerts (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL CHECK (type IN ('appointment', 'payment', 'treatment', 'follow_up', 'prescription', 'lab_order', 'inventory')),
          priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          patient_id TEXT,
          patient_name TEXT,
          related_data TEXT,
          action_required BOOLEAN DEFAULT FALSE,
          due_date DATETIME,
          is_read BOOLEAN DEFAULT FALSE,
          is_dismissed BOOLEAN DEFAULT FALSE,
          snooze_until DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
        )
      `)

      // إنشاء فهارس لتحسين الأداء
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_smart_alerts_type ON smart_alerts(type)',
        'CREATE INDEX IF NOT EXISTS idx_smart_alerts_priority ON smart_alerts(priority)',
        'CREATE INDEX IF NOT EXISTS idx_smart_alerts_patient_id ON smart_alerts(patient_id)',
        'CREATE INDEX IF NOT EXISTS idx_smart_alerts_is_read ON smart_alerts(is_read)',
        'CREATE INDEX IF NOT EXISTS idx_smart_alerts_is_dismissed ON smart_alerts(is_dismissed)',
        'CREATE INDEX IF NOT EXISTS idx_smart_alerts_snooze_until ON smart_alerts(snooze_until)',
        'CREATE INDEX IF NOT EXISTS idx_smart_alerts_created_at ON smart_alerts(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_smart_alerts_due_date ON smart_alerts(due_date)'
      ]

      indexes.forEach(indexSql => {
        try {
          this.db.exec(indexSql)
        } catch (error) {
          console.warn('Smart alerts index creation warning:', error.message)
        }
      })

      console.log('✅ Smart alerts table and indexes ensured')
    } catch (error) {
      console.error('❌ Error ensuring smart alerts table:', error)
    }
  }

  async getAllSmartAlerts() {
    this.ensureConnection()
    this.ensureSmartAlertsTableExists()

    // تنظيف الإشعارات المؤجلة المنتهية الصلاحية أولاً
    await this.clearExpiredSnoozedAlerts()

    const now = new Date().toISOString()
    const stmt = this.db.prepare(`
      SELECT * FROM smart_alerts
      WHERE
        (snooze_until IS NULL OR snooze_until <= ?)
        AND is_dismissed = 0
      ORDER BY
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        is_read ASC,
        created_at DESC
    `)

    const alerts = stmt.all(now)
    console.log(`📊 Retrieved ${alerts.length} active smart alerts from database`)

    // Parse related_data JSON for each alert with error handling
    return alerts.map(alert => {
      try {
        return {
          ...alert,
          relatedData: alert.related_data ? JSON.parse(alert.related_data) : {},
          actionRequired: Boolean(alert.action_required),
          isRead: Boolean(alert.is_read),
          isDismissed: Boolean(alert.is_dismissed),
          patientId: alert.patient_id,
          patientName: alert.patient_name,
          dueDate: alert.due_date,
          snoozeUntil: alert.snooze_until,
          createdAt: alert.created_at,
          updatedAt: alert.updated_at
        }
      } catch (error) {
        console.error('❌ Error parsing alert data:', alert.id, error)
        return {
          ...alert,
          relatedData: {},
          actionRequired: Boolean(alert.action_required),
          isRead: Boolean(alert.is_read),
          isDismissed: Boolean(alert.is_dismissed),
          patientId: alert.patient_id,
          patientName: alert.patient_name,
          dueDate: alert.due_date,
          snoozeUntil: alert.snooze_until,
          createdAt: alert.created_at,
          updatedAt: alert.updated_at
        }
      }
    })
  }

  async createSmartAlert(alert) {
    this.ensureConnection()
    this.ensureSmartAlertsTableExists()

    const { v4: uuidv4 } = require('uuid')
    const id = alert.id || uuidv4()
    const now = new Date().toISOString()

    // التحقق من وجود تنبيه مماثل (نفس النوع والمريض والبيانات المرتبطة)
    const duplicateCheckStmt = this.db.prepare(`
      SELECT id FROM smart_alerts
      WHERE type = ?
        AND patient_id = ?
        AND title = ?
        AND is_dismissed = 0
        AND (snooze_until IS NULL OR snooze_until <= ?)
    `)

    const existingDuplicate = duplicateCheckStmt.get(
      alert.type,
      alert.patientId || null,
      alert.title,
      now
    )

    if (existingDuplicate) {
      console.log('⚠️ Duplicate smart alert found, skipping:', existingDuplicate.id)
      return null
    }

    // Check if alert with specific ID already exists
    const existingAlert = this.db.prepare('SELECT id FROM smart_alerts WHERE id = ?').get(id)
    if (existingAlert) {
      console.log('⚠️ Smart alert with ID already exists, skipping:', id)
      return {
        ...alert,
        id,
        createdAt: alert.createdAt || now,
        updatedAt: now
      }
    }

    const stmt = this.db.prepare(`
      INSERT INTO smart_alerts (
        id, type, priority, title, description, patient_id, patient_name,
        related_data, action_required, due_date, is_read, is_dismissed,
        snooze_until, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const relatedDataJson = alert.relatedData ? JSON.stringify(alert.relatedData) : null

    try {
      stmt.run(
        id, alert.type, alert.priority, alert.title, alert.description,
        alert.patientId || null, alert.patientName || null,
        relatedDataJson, alert.actionRequired ? 1 : 0, alert.dueDate || null,
        alert.isRead ? 1 : 0, alert.isDismissed ? 1 : 0, alert.snoozeUntil || null,
        alert.createdAt || now, now
      )

      console.log('✅ Smart alert created:', id)

      // Force WAL checkpoint
      const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
      console.log('💾 Checkpoint result:', checkpoint)

      return {
        ...alert,
        id,
        createdAt: alert.createdAt || now,
        updatedAt: now
      }
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        console.log('⚠️ Smart alert already exists (constraint error), skipping:', id)
        return {
          ...alert,
          id,
          createdAt: alert.createdAt || now,
          updatedAt: now
        }
      }
      throw error
    }
  }

  async updateSmartAlert(id, updates) {
    this.ensureConnection()
    this.ensureSmartAlertsTableExists()

    console.log('💾 DatabaseService: updateSmartAlert called', { id, updates })

    const now = new Date().toISOString()

    // Convert camelCase to snake_case for database fields
    const dbUpdates = {}
    if (updates.isRead !== undefined) dbUpdates.is_read = updates.isRead ? 1 : 0
    if (updates.isDismissed !== undefined) dbUpdates.is_dismissed = updates.isDismissed ? 1 : 0
    if (updates.snoozeUntil !== undefined) dbUpdates.snooze_until = updates.snoozeUntil
    if (updates.patientId !== undefined) dbUpdates.patient_id = updates.patientId
    if (updates.patientName !== undefined) dbUpdates.patient_name = updates.patientName
    if (updates.actionRequired !== undefined) dbUpdates.action_required = updates.actionRequired ? 1 : 0
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate
    if (updates.relatedData !== undefined) dbUpdates.related_data = JSON.stringify(updates.relatedData)

    // Add other direct fields
    const directFields = ['type', 'priority', 'title', 'description']
    directFields.forEach(field => {
      if (updates[field] !== undefined) {
        dbUpdates[field] = updates[field]
      }
    })

    console.log('💾 DatabaseService: Converted updates to database format', { dbUpdates })

    if (Object.keys(dbUpdates).length === 0) {
      console.log('⚠️ No valid updates provided for smart alert:', id)
      return false
    }

    const fields = Object.keys(dbUpdates)
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => dbUpdates[field])

    console.log('💾 DatabaseService: Executing SQL update', {
      setClause,
      values,
      id
    })

    const stmt = this.db.prepare(`
      UPDATE smart_alerts
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    const result = stmt.run(...values, now, id)

    console.log('💾 DatabaseService: Update result', {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid
    })

    if (result.changes > 0) {
      console.log('✅ Smart alert updated successfully:', id)

      // التحقق من التحديث
      const updatedAlert = this.db.prepare('SELECT * FROM smart_alerts WHERE id = ?').get(id)
      console.log('💾 DatabaseService: Updated alert data', updatedAlert)

      // Force WAL checkpoint
      const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
      console.log('💾 Checkpoint result:', checkpoint)
    } else {
      console.log('⚠️ No smart alert found with id:', id)
    }

    return result.changes > 0
  }

  async deleteSmartAlert(id) {
    this.ensureConnection()
    this.ensureSmartAlertsTableExists()

    const stmt = this.db.prepare('DELETE FROM smart_alerts WHERE id = ?')
    const result = stmt.run(id)

    if (result.changes > 0) {
      console.log('✅ Smart alert deleted:', id)

      // Force WAL checkpoint
      const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
      console.log('💾 Checkpoint result:', checkpoint)
    }

    return result.changes > 0
  }

  async getSmartAlertById(id) {
    this.ensureConnection()
    this.ensureSmartAlertsTableExists()

    const stmt = this.db.prepare('SELECT * FROM smart_alerts WHERE id = ?')
    const alert = stmt.get(id)

    if (!alert) return null

    return {
      ...alert,
      relatedData: alert.related_data ? JSON.parse(alert.related_data) : {},
      actionRequired: Boolean(alert.action_required),
      isRead: Boolean(alert.is_read),
      isDismissed: Boolean(alert.is_dismissed)
    }
  }

  async clearDismissedAlerts() {
    this.ensureConnection()
    this.ensureSmartAlertsTableExists()

    const stmt = this.db.prepare('DELETE FROM smart_alerts WHERE is_dismissed = 1')
    const result = stmt.run()

    console.log(`✅ Cleared ${result.changes} dismissed alerts`)

    // Force WAL checkpoint
    const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
    console.log('💾 Checkpoint result:', checkpoint)

    return result.changes
  }

  async clearExpiredSnoozedAlerts() {
    this.ensureConnection()
    this.ensureSmartAlertsTableExists()

    const now = new Date().toISOString()
    const stmt = this.db.prepare(`
      UPDATE smart_alerts
      SET snooze_until = NULL, updated_at = ?
      WHERE snooze_until IS NOT NULL AND snooze_until <= ?
    `)

    const result = stmt.run(now, now)

    if (result.changes > 0) {
      console.log(`✅ Cleared ${result.changes} expired snoozed alerts`)

      // Force WAL checkpoint
      const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
      console.log('💾 Checkpoint result:', checkpoint)
    }

    return result.changes
  }

  async deleteSmartAlertsByPatient(patientId) {
    this.ensureConnection()
    this.ensureSmartAlertsTableExists()

    const stmt = this.db.prepare('DELETE FROM smart_alerts WHERE patient_id = ?')
    const result = stmt.run(patientId)

    if (result.changes > 0) {
      console.log(`✅ Deleted ${result.changes} alerts for patient:`, patientId)

      // Force WAL checkpoint
      const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
      console.log('💾 Checkpoint result:', checkpoint)
    }

    return result.changes
  }

  async deleteSmartAlertsByType(type, patientId = null) {
    this.ensureConnection()
    this.ensureSmartAlertsTableExists()

    let stmt, result
    if (patientId) {
      stmt = this.db.prepare('DELETE FROM smart_alerts WHERE type = ? AND patient_id = ?')
      result = stmt.run(type, patientId)
    } else {
      stmt = this.db.prepare('DELETE FROM smart_alerts WHERE type = ?')
      result = stmt.run(type)
    }

    if (result.changes > 0) {
      console.log(`✅ Deleted ${result.changes} alerts of type '${type}'${patientId ? ` for patient ${patientId}` : ''}`)

      // Force WAL checkpoint
      const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
      console.log('💾 Checkpoint result:', checkpoint)
    }

    return result.changes
  }

  async deleteSmartAlertsByRelatedData(relatedDataKey, relatedDataValue) {
    this.ensureConnection()
    this.ensureSmartAlertsTableExists()

    const stmt = this.db.prepare(`
      DELETE FROM smart_alerts
      WHERE related_data LIKE ?
    `)

    const searchPattern = `%"${relatedDataKey}":"${relatedDataValue}"%`
    const result = stmt.run(searchPattern)

    if (result.changes > 0) {
      console.log(`✅ Deleted ${result.changes} alerts with ${relatedDataKey}=${relatedDataValue}`)

      // Force WAL checkpoint
      const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
      console.log('💾 Checkpoint result:', checkpoint)
    }

    return result.changes
  }

  // Treatment Sessions operations
  ensureTreatmentSessionsTableExists() {
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

  async getAllTreatmentSessions() {
    this.ensureConnection()
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

  async getTreatmentSessionsByTreatment(treatmentId) {
    this.ensureConnection()
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

  async createTreatmentSession(session) {
    this.ensureConnection()
    this.ensureTreatmentSessionsTableExists()

    const { v4: uuidv4 } = require('uuid')
    const id = uuidv4()
    const now = new Date().toISOString()

    // Auto-assign session number if not provided
    if (!session.session_number) {
      const maxSessionStmt = this.db.prepare(`
        SELECT COALESCE(MAX(session_number), 0) + 1 as next_session_number
        FROM treatment_sessions
        WHERE tooth_treatment_id = ?
      `)
      const result = maxSessionStmt.get(session.tooth_treatment_id)
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

  async updateTreatmentSession(id, updates) {
    this.ensureConnection()
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

  async deleteTreatmentSession(id) {
    this.ensureConnection()
    this.ensureTreatmentSessionsTableExists()

    const stmt = this.db.prepare('DELETE FROM treatment_sessions WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async getTreatmentSessionById(id) {
    this.ensureConnection()
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

  // ==================== CLINIC EXPENSES METHODS ====================

  ensureClinicExpensesTableExists() {
    try {
      // Check if clinic_expenses table exists
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='clinic_expenses'
      `).get()

      if (!tableExists) {
        console.log('🏗️ Creating clinic_expenses table...')
        this.db.exec(`
          CREATE TABLE clinic_expenses (
            id TEXT PRIMARY KEY,
            expense_name TEXT NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            expense_type TEXT NOT NULL,
            category TEXT,
            description TEXT,
            payment_method TEXT NOT NULL,
            payment_date DATETIME NOT NULL,
            due_date DATETIME,
            is_recurring BOOLEAN DEFAULT 0,
            recurring_frequency TEXT,
            recurring_end_date DATETIME,
            status TEXT DEFAULT 'pending',
            receipt_number TEXT,
            vendor TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `)
        this.createClinicExpensesIndexes()
        console.log('✅ Clinic expenses table created successfully')
      }
    } catch (error) {
      console.error('❌ Error ensuring clinic expenses table exists:', error)
      throw error
    }
  }

  async getAllClinicExpenses() {
    this.ensureConnection()
    this.ensureClinicExpensesTableExists()

    const stmt = this.db.prepare(`
      SELECT * FROM clinic_expenses
      ORDER BY payment_date DESC, created_at DESC
    `)
    return stmt.all()
  }

  async createClinicExpense(expenseData) {
    this.ensureConnection()
    this.ensureClinicExpensesTableExists()

    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO clinic_expenses (
        id, expense_name, amount, expense_type, category, description,
        payment_method, payment_date, due_date, is_recurring, recurring_frequency,
        recurring_end_date, status, receipt_number, vendor, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      expenseData.expense_name,
      expenseData.amount,
      expenseData.expense_type,
      expenseData.category || null,
      expenseData.description || null,
      expenseData.payment_method,
      expenseData.payment_date,
      expenseData.due_date || null,
      expenseData.is_recurring ? 1 : 0,
      expenseData.recurring_frequency || null,
      expenseData.recurring_end_date || null,
      expenseData.status || 'pending',
      expenseData.receipt_number || null,
      expenseData.vendor || null,
      expenseData.notes || null,
      now,
      now
    )

    return this.getClinicExpenseById(id)
  }

  async updateClinicExpense(id, updates) {
    this.ensureConnection()
    this.ensureClinicExpensesTableExists()

    const now = new Date().toISOString()

    const allowedColumns = [
      'expense_name', 'amount', 'expense_type', 'category', 'description',
      'payment_method', 'payment_date', 'due_date', 'is_recurring',
      'recurring_frequency', 'recurring_end_date', 'status', 'receipt_number',
      'vendor', 'notes'
    ]

    const updateColumns = Object.keys(updates).filter(key => allowedColumns.includes(key))

    if (updateColumns.length === 0) {
      throw new Error('No valid columns to update')
    }

    const setClause = updateColumns.map(col => `${col} = ?`).join(', ')
    const values = updateColumns.map(col => {
      if (col === 'is_recurring') {
        return updates[col] ? 1 : 0
      }
      return updates[col]
    })

    const stmt = this.db.prepare(`
      UPDATE clinic_expenses
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
    return this.getClinicExpenseById(id)
  }

  async deleteClinicExpense(id) {
    this.ensureConnection()
    this.ensureClinicExpensesTableExists()

    const stmt = this.db.prepare('DELETE FROM clinic_expenses WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async getClinicExpenseById(id) {
    this.ensureConnection()
    this.ensureClinicExpensesTableExists()

    const stmt = this.db.prepare('SELECT * FROM clinic_expenses WHERE id = ?')
    return stmt.get(id)
  }

  async searchClinicExpenses(query) {
    this.ensureConnection()
    this.ensureClinicExpensesTableExists()

    const stmt = this.db.prepare(`
      SELECT * FROM clinic_expenses
      WHERE expense_name LIKE ? OR description LIKE ? OR vendor LIKE ? OR notes LIKE ?
      ORDER BY payment_date DESC, created_at DESC
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm)
  }

  async getClinicExpensesByType(expenseType) {
    this.ensureConnection()
    this.ensureClinicExpensesTableExists()

    const stmt = this.db.prepare(`
      SELECT * FROM clinic_expenses
      WHERE expense_type = ?
      ORDER BY payment_date DESC, created_at DESC
    `)
    return stmt.all(expenseType)
  }

  async getClinicExpensesByStatus(status) {
    this.ensureConnection()
    this.ensureClinicExpensesTableExists()

    const stmt = this.db.prepare(`
      SELECT * FROM clinic_expenses
      WHERE status = ?
      ORDER BY payment_date DESC, created_at DESC
    `)
    return stmt.all(status)
  }

  async getRecurringExpenses() {
    this.ensureConnection()
    this.ensureClinicExpensesTableExists()

    const stmt = this.db.prepare(`
      SELECT * FROM clinic_expenses
      WHERE is_recurring = 1
      ORDER BY payment_date DESC, created_at DESC
    `)
    return stmt.all()
  }
}

module.exports = { DatabaseService }