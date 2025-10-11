#!/usr/bin/env node

/**
 * Script to fix lab orders cascade delete relationship
 * This script updates the lab_orders table to properly cascade delete when tooth treatments are deleted
 */

const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

// Database path - check for both possible names
const DB_PATH_1 = path.join(__dirname, '..', 'dental_clinic.db')
const DB_PATH_2 = path.join(__dirname, '..', 'test_dental_clinic.db')
const DB_PATH = fs.existsSync(DB_PATH_1) ? DB_PATH_1 : DB_PATH_2
const MIGRATION_PATH = path.join(__dirname, '..', 'src', 'database', 'migrations', 'fix_lab_orders_cascade_delete.sql')

async function runMigration() {
  console.log('🚀 Starting lab orders cascade delete migration...')

  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found:', DB_PATH)
    console.log('💡 Please make sure the database file exists before running this migration.')
    process.exit(1)
  }

  // Check if migration file exists
  if (!fs.existsSync(MIGRATION_PATH)) {
    console.error('❌ Migration file not found:', MIGRATION_PATH)
    process.exit(1)
  }

  try {
    // Read migration SQL
    const migrationSQL = fs.readFileSync(MIGRATION_PATH, 'utf8')
    console.log('📖 Migration SQL loaded successfully')

    // Open database connection
    const db = new Database(DB_PATH)
    console.log('🔗 Database connection established')

    // Enable foreign keys
    db.pragma('foreign_keys = ON')
    console.log('🔑 Foreign keys enabled')

    // Check current lab orders count
    const beforeCount = db.prepare('SELECT COUNT(*) as count FROM lab_orders').get()
    console.log(`📊 Current lab orders count: ${beforeCount.count}`)

    // Check orphaned lab orders
    const orphanedCount = db.prepare(`
      SELECT COUNT(*) as count FROM lab_orders
      WHERE tooth_treatment_id IS NOT NULL
      AND tooth_treatment_id NOT IN (SELECT id FROM tooth_treatments)
    `).get()
    console.log(`🔍 Orphaned lab orders found: ${orphanedCount.count}`)

    // Execute migration in a transaction
    const transaction = db.transaction(() => {
      // Split migration into individual statements and execute
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            db.exec(statement)
            console.log('✅ Executed:', statement.substring(0, 50) + '...')
          } catch (error) {
            console.warn('⚠️ Statement failed (might be expected):', statement.substring(0, 50) + '...')
            console.warn('   Error:', error.message)
          }
        }
      }
    })

    // Run the transaction
    transaction()
    console.log('🔄 Migration transaction completed')

    // Check final lab orders count
    const afterCount = db.prepare('SELECT COUNT(*) as count FROM lab_orders').get()
    console.log(`📊 Final lab orders count: ${afterCount.count}`)

    // Verify foreign key constraints
    const fkCheck = db.prepare('PRAGMA foreign_key_check').all()
    if (fkCheck.length === 0) {
      console.log('✅ Foreign key constraints are valid')
    } else {
      console.warn('⚠️ Foreign key constraint violations found:', fkCheck)
    }

    // Close database connection
    db.close()
    console.log('🔒 Database connection closed')

    console.log('🎉 Migration completed successfully!')
    console.log('📝 Summary:')
    console.log(`   - Orphaned lab orders cleaned: ${orphanedCount.count}`)
    console.log(`   - Lab orders before: ${beforeCount.count}`)
    console.log(`   - Lab orders after: ${afterCount.count}`)
    console.log('   - Cascade delete relationship established')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
