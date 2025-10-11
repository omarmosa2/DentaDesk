const { DatabaseService } = require('../services/databaseService.js')
const { BackupService } = require('../services/backupService.js')
const { join } = require('path')
const { existsSync, statSync, rmSync } = require('fs')

/**
 * Comprehensive backup and restore test script
 * This script will help diagnose backup/restore issues
 */
class BackupTestScript {
  constructor() {
    this.databaseService = null
    this.backupService = null
    this.testResults = []
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`
    console.log(logMessage)
    this.testResults.push({ timestamp, type, message })
  }

  async initialize() {
    try {
      this.log('Initializing database service...')
      this.databaseService = new DatabaseService()

      this.log('Initializing backup service...')
      this.backupService = new BackupService(this.databaseService)

      this.log('Services initialized successfully', 'success')
      return true
    } catch (error) {
      this.log(`Failed to initialize services: ${error.message}`, 'error')
      return false
    }
  }

  async testDatabaseConnection() {
    try {
      this.log('Testing database connection...')

      // Test basic query
      const tablesQuery = this.databaseService.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
      const result = tablesQuery.get()
      this.log(`Database contains ${result.count} tables`)

      // Test key tables
      const tables = ['patients', 'appointments', 'payments', 'treatments', 'inventory', 'settings']
      for (const table of tables) {
        try {
          const countQuery = this.databaseService.db.prepare(`SELECT COUNT(*) as count FROM ${table}`)
          const count = countQuery.get()
          this.log(`Table ${table}: ${count.count} records`)
        } catch (tableError) {
          this.log(`Could not query table ${table}: ${tableError.message}`, 'warn')
        }
      }

      this.log('Database connection test completed', 'success')
      return true
    } catch (error) {
      this.log(`Database connection test failed: ${error.message}`, 'error')
      return false
    }
  }

  async createTestData() {
    try {
      this.log('Creating test data...')

      // Create test patient
      const testPatient = {
        first_name: 'Test',
        last_name: 'Patient',
        phone: '1234567890',
        email: 'test@example.com',
        date_of_birth: '1990-01-01'
      }

      const patient = await this.databaseService.createPatient(testPatient)
      this.log(`Created test patient: ${patient.id}`)

      // Create test appointment
      const testAppointment = {
        patient_id: patient.id,
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        duration: 60,
        status: 'scheduled',
        notes: 'Test appointment for backup testing'
      }

      const appointment = await this.databaseService.createAppointment(testAppointment)
      this.log(`Created test appointment: ${appointment.id}`)

      // Create test payment
      const testPayment = {
        patient_id: patient.id,
        appointment_id: appointment.id,
        amount: 100.00,
        payment_method: 'cash',
        status: 'completed',
        notes: 'Test payment for backup testing'
      }

      const payment = await this.databaseService.createPayment(testPayment)
      this.log(`Created test payment: ${payment.id}`)

      this.log('Test data created successfully', 'success')
      return { patient, appointment, payment }
    } catch (error) {
      this.log(`Failed to create test data: ${error.message}`, 'error')
      return null
    }
  }

  async testBackupCreation() {
    try {
      this.log('Testing backup creation...')

      const testBackupPath = join(process.cwd(), 'test-backup.db')

      // Remove existing test backup if it exists
      if (existsSync(testBackupPath)) {
        rmSync(testBackupPath)
        this.log('Removed existing test backup file')
      }

      const backupPath = await this.backupService.createBackup(testBackupPath)
      this.log(`Backup created at: ${backupPath}`)

      // Verify backup file exists
      if (!existsSync(backupPath)) {
        throw new Error('Backup file was not created')
      }

      const stats = statSync(backupPath)
      this.log(`Backup file size: ${stats.size} bytes`)

      if (stats.size === 0) {
        throw new Error('Backup file is empty')
      }

      this.log('Backup creation test completed successfully', 'success')
      return backupPath
    } catch (error) {
      this.log(`Backup creation test failed: ${error.message}`, 'error')
      return null
    }
  }

  async testBackupRestore(backupPath) {
    try {
      this.log('Testing backup restore...')

      if (!backupPath || !existsSync(backupPath)) {
        throw new Error('Backup file not found for restore test')
      }

      // Get current data counts before restore
      const beforeCounts = await this.getDataCounts()
      this.log('Data counts before restore:', 'info')
      Object.entries(beforeCounts).forEach(([table, count]) => {
        this.log(`  ${table}: ${count}`)
      })

      // Delete some data to test restore
      this.log('Deleting test data to simulate data loss...')
      await this.databaseService.clearAllPatients()

      // Verify data was deleted
      const afterDeleteCounts = await this.getDataCounts()
      this.log('Data counts after deletion:', 'info')
      Object.entries(afterDeleteCounts).forEach(([table, count]) => {
        this.log(`  ${table}: ${count}`)
      })

      // Restore from backup
      this.log('Restoring from backup...')
      const success = await this.backupService.restoreBackup(backupPath)

      if (!success) {
        throw new Error('Backup restore returned false')
      }

      // Wait a moment for database to settle
      await new Promise(resolve => setTimeout(resolve, 500))

      // Verify data was restored
      const afterRestoreCounts = await this.getDataCounts()
      this.log('Data counts after restore:', 'info')
      Object.entries(afterRestoreCounts).forEach(([table, count]) => {
        this.log(`  ${table}: ${count}`)
      })

      // Compare before and after
      let restoreSuccess = true
      for (const [table, beforeCount] of Object.entries(beforeCounts)) {
        const afterCount = afterRestoreCounts[table] || 0
        if (beforeCount !== afterCount) {
          this.log(`Data mismatch in ${table}: expected ${beforeCount}, got ${afterCount}`, 'error')
          restoreSuccess = false
        }
      }

      if (restoreSuccess) {
        this.log('Backup restore test completed successfully', 'success')
      } else {
        this.log('Backup restore test failed - data was not properly restored', 'error')
      }

      return restoreSuccess
    } catch (error) {
      this.log(`Backup restore test failed: ${error.message}`, 'error')
      return false
    }
  }

  async getDataCounts() {
    const counts = {}
    const tables = ['patients', 'appointments', 'payments', 'treatments', 'inventory']

    for (const table of tables) {
      try {
        const countQuery = this.databaseService.db.prepare(`SELECT COUNT(*) as count FROM ${table}`)
        const result = countQuery.get()
        counts[table] = result.count
      } catch (error) {
        this.log(`Could not get count for table ${table}: ${error.message}`, 'warn')
        counts[table] = 0
      }
    }

    return counts
  }

  async runFullTest() {
    this.log('Starting comprehensive backup/restore test...', 'info')

    // Initialize services
    if (!(await this.initialize())) {
      return false
    }

    // Test database connection
    if (!(await this.testDatabaseConnection())) {
      return false
    }

    // Create test data
    const testData = await this.createTestData()
    if (!testData) {
      return false
    }

    // Test backup creation
    const backupPath = await this.testBackupCreation()
    if (!backupPath) {
      return false
    }

    // Test backup restore
    const restoreSuccess = await this.testBackupRestore(backupPath)

    // Clean up test backup file
    try {
      if (existsSync(backupPath)) {
        rmSync(backupPath)
        this.log('Cleaned up test backup file')
      }
    } catch (cleanupError) {
      this.log(`Failed to clean up test backup: ${cleanupError.message}`, 'warn')
    }

    // Summary
    this.log('=== TEST SUMMARY ===', 'info')
    const errorCount = this.testResults.filter(r => r.type === 'error').length
    const warnCount = this.testResults.filter(r => r.type === 'warn').length

    this.log(`Total errors: ${errorCount}`)
    this.log(`Total warnings: ${warnCount}`)

    if (errorCount === 0 && restoreSuccess) {
      this.log('All tests passed successfully!', 'success')
      return true
    } else {
      this.log('Some tests failed. Check the logs above for details.', 'error')
      return false
    }
  }
}

// Export for use in other modules
module.exports = { BackupTestScript }

// If run directly, execute the test
if (require.main === module) {
  const test = new BackupTestScript()
  test.runFullTest().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('Test script crashed:', error)
    process.exit(1)
  })
}
