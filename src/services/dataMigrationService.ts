import { join } from 'path'
import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { LowDBService } from './lowdbService'
import { DatabaseService } from './databaseService'
import type { DatabaseSchema } from '../types'

export class DataMigrationService {
  private lowdbService: LowDBService
  private sqliteService: DatabaseService
  private backupPath: string

  constructor() {
    this.lowdbService = new LowDBService()
    this.sqliteService = new DatabaseService()
    this.backupPath = join(app.getPath('userData'), 'migration_backup.json')
  }

  /**
   * Main migration method - transfers all data from LowDB to SQLite
   */
  async migrateData(): Promise<{ success: boolean; message: string; stats: any }> {
    try {
      console.log('🚀 Starting data migration from LowDB to SQLite...')
      
      // Step 1: Create backup of current data
      await this.createBackup()
      console.log('✅ Backup created successfully')

      // Step 2: Validate LowDB data
      const lowdbData = await this.validateLowDBData()
      console.log('✅ LowDB data validated')

      // Step 3: Clear SQLite database (fresh start)
      await this.clearSQLiteDatabase()
      console.log('✅ SQLite database cleared')

      // Step 4: Migrate data in correct order (respecting foreign keys)
      const stats = await this.performMigration(lowdbData)
      console.log('✅ Data migration completed')

      // Step 5: Validate migrated data
      await this.validateMigration(stats)
      console.log('✅ Migration validation successful')

      return {
        success: true,
        message: 'Data migration completed successfully',
        stats
      }
    } catch (error) {
      console.error('❌ Migration failed:', error)
      
      // Attempt to restore from backup
      try {
        await this.restoreFromBackup()
        console.log('✅ Restored from backup after migration failure')
      } catch (restoreError) {
        console.error('❌ Failed to restore from backup:', restoreError)
      }

      return {
        success: false,
        message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stats: null
      }
    }
  }

  /**
   * Create backup of current LowDB data
   */
  private async createBackup(): Promise<void> {
    const lowdbPath = join(app.getPath('userData'), 'dental_clinic.json')
    
    if (!existsSync(lowdbPath)) {
      throw new Error('LowDB file not found. Nothing to migrate.')
    }

    const data = readFileSync(lowdbPath, 'utf-8')
    writeFileSync(this.backupPath, data)
  }

  /**
   * Validate LowDB data structure and integrity
   */
  private async validateLowDBData(): Promise<DatabaseSchema> {
    const patients = await this.lowdbService.getAllPatients()
    const appointments = await this.lowdbService.getAllAppointments()
    const payments = await this.lowdbService.getAllPayments()
    const treatments = await this.lowdbService.getAllTreatments()
    const inventory = await this.lowdbService.getAllInventoryItems()
    const settings = await this.lowdbService.getSettings()
    const inventoryUsage = await this.lowdbService.getAllInventoryUsage()
    const patientImages = await this.lowdbService.getAllPatientImages()
    const installmentPayments = await this.lowdbService.getAllInstallmentPayments()

    // Validate data integrity
    this.validateDataIntegrity({
      patients,
      appointments,
      payments,
      treatments,
      inventory,
      settings: settings ? [settings] : [],
      inventoryUsage,
      patientImages,
      installmentPayments
    })

    return {
      patients,
      appointments,
      payments,
      treatments,
      inventory,
      settings: settings ? [settings] : [],
      inventoryUsage,
      patientImages,
      installmentPayments
    }
  }

  /**
   * Validate data integrity and relationships
   */
  private validateDataIntegrity(data: DatabaseSchema): void {
    const patientIds = new Set(data.patients.map(p => p.id))
    const treatmentIds = new Set(data.treatments.map(t => t.id))
    const appointmentIds = new Set(data.appointments.map(a => a.id))
    const inventoryIds = new Set(data.inventory.map(i => i.id))
    const paymentIds = new Set(data.payments.map(p => p.id))

    // Validate appointment references
    for (const appointment of data.appointments) {
      if (!patientIds.has(appointment.patient_id)) {
        console.warn(`⚠️ Appointment ${appointment.id} references non-existent patient ${appointment.patient_id}`)
      }
      if (appointment.treatment_id && !treatmentIds.has(appointment.treatment_id)) {
        console.warn(`⚠️ Appointment ${appointment.id} references non-existent treatment ${appointment.treatment_id}`)
      }
    }

    // Validate payment references
    for (const payment of data.payments) {
      if (!patientIds.has(payment.patient_id)) {
        console.warn(`⚠️ Payment ${payment.id} references non-existent patient ${payment.patient_id}`)
      }
      if (payment.appointment_id && !appointmentIds.has(payment.appointment_id)) {
        console.warn(`⚠️ Payment ${payment.id} references non-existent appointment ${payment.appointment_id}`)
      }
    }

    // Validate inventory usage references
    for (const usage of data.inventoryUsage) {
      if (!inventoryIds.has(usage.inventory_id)) {
        console.warn(`⚠️ Inventory usage ${usage.id} references non-existent inventory ${usage.inventory_id}`)
      }
      if (usage.appointment_id && !appointmentIds.has(usage.appointment_id)) {
        console.warn(`⚠️ Inventory usage ${usage.id} references non-existent appointment ${usage.appointment_id}`)
      }
    }

    // Validate patient images references
    for (const image of data.patientImages) {
      if (!patientIds.has(image.patient_id)) {
        console.warn(`⚠️ Patient image ${image.id} references non-existent patient ${image.patient_id}`)
      }
      if (image.appointment_id && !appointmentIds.has(image.appointment_id)) {
        console.warn(`⚠️ Patient image ${image.id} references non-existent appointment ${image.appointment_id}`)
      }
    }

    // Validate installment payments references
    for (const installment of data.installmentPayments) {
      if (!paymentIds.has(installment.payment_id)) {
        console.warn(`⚠️ Installment payment ${installment.id} references non-existent payment ${installment.payment_id}`)
      }
    }
  }

  /**
   * Clear SQLite database for fresh migration
   */
  private async clearSQLiteDatabase(): Promise<void> {
    await this.sqliteService.clearAllPatients()
    await this.sqliteService.clearAllTreatments()
    await this.sqliteService.clearAllInventoryItems()
  }

  /**
   * Perform the actual data migration in correct order
   */
  private async performMigration(data: DatabaseSchema): Promise<any> {
    const stats = {
      patients: 0,
      treatments: 0,
      appointments: 0,
      payments: 0,
      inventory: 0,
      inventoryUsage: 0,
      patientImages: 0,
      installmentPayments: 0,
      settings: 0
    }

    // Migrate in dependency order
    console.log('📊 Migrating treatments...')
    for (const treatment of data.treatments) {
      await this.sqliteService.createTreatment(treatment)
      stats.treatments++
    }

    console.log('👥 Migrating patients...')
    for (const patient of data.patients) {
      await this.sqliteService.createPatient(patient)
      stats.patients++
    }

    console.log('📦 Migrating inventory...')
    for (const item of data.inventory) {
      await this.sqliteService.createInventoryItem(item)
      stats.inventory++
    }

    console.log('📅 Migrating appointments...')
    for (const appointment of data.appointments) {
      await this.sqliteService.createAppointment(appointment)
      stats.appointments++
    }

    console.log('💰 Migrating payments...')
    for (const payment of data.payments) {
      await this.sqliteService.createPayment(payment)
      stats.payments++
    }

    console.log('📋 Migrating inventory usage...')
    for (const usage of data.inventoryUsage) {
      await this.sqliteService.createInventoryUsage(usage)
      stats.inventoryUsage++
    }

    console.log('📸 Migrating patient images...')
    for (const image of data.patientImages) {
      await this.sqliteService.createPatientImage(image)
      stats.patientImages++
    }

    console.log('💳 Migrating installment payments...')
    for (const installment of data.installmentPayments) {
      await this.sqliteService.createInstallmentPayment(installment)
      stats.installmentPayments++
    }

    console.log('⚙️ Migrating settings...')
    if (data.settings.length > 0) {
      await this.sqliteService.updateSettings(data.settings[0])
      stats.settings = 1
    }

    return stats
  }

  /**
   * Validate that migration was successful
   */
  private async validateMigration(expectedStats: any): Promise<void> {
    const sqlitePatients = await this.sqliteService.getAllPatients()
    const sqliteAppointments = await this.sqliteService.getAllAppointments()
    const sqlitePayments = await this.sqliteService.getAllPayments()
    const sqliteTreatments = await this.sqliteService.getAllTreatments()
    const sqliteInventory = await this.sqliteService.getAllInventoryItems()

    if (sqlitePatients.length !== expectedStats.patients) {
      throw new Error(`Patient count mismatch: expected ${expectedStats.patients}, got ${sqlitePatients.length}`)
    }

    if (sqliteAppointments.length !== expectedStats.appointments) {
      throw new Error(`Appointment count mismatch: expected ${expectedStats.appointments}, got ${sqliteAppointments.length}`)
    }

    if (sqlitePayments.length !== expectedStats.payments) {
      throw new Error(`Payment count mismatch: expected ${expectedStats.payments}, got ${sqlitePayments.length}`)
    }

    if (sqliteTreatments.length !== expectedStats.treatments) {
      throw new Error(`Treatment count mismatch: expected ${expectedStats.treatments}, got ${sqliteTreatments.length}`)
    }

    if (sqliteInventory.length !== expectedStats.inventory) {
      throw new Error(`Inventory count mismatch: expected ${expectedStats.inventory}, got ${sqliteInventory.length}`)
    }

    console.log('✅ All data counts match expected values')
  }

  /**
   * Restore from backup in case of migration failure
   */
  private async restoreFromBackup(): Promise<void> {
    if (!existsSync(this.backupPath)) {
      throw new Error('Backup file not found')
    }

    const backupData = readFileSync(this.backupPath, 'utf-8')
    const lowdbPath = join(app.getPath('userData'), 'dental_clinic.json')
    writeFileSync(lowdbPath, backupData)
  }

  /**
   * Check if migration is needed
   */
  async isMigrationNeeded(): Promise<boolean> {
    const lowdbPath = join(app.getPath('userData'), 'dental_clinic.json')
    const sqlitePath = join(app.getPath('userData'), 'dental_clinic.db')
    
    // If LowDB exists but SQLite is empty or doesn't exist, migration is needed
    if (existsSync(lowdbPath)) {
      if (!existsSync(sqlitePath)) {
        return true
      }
      
      // Check if SQLite has data
      const patients = await this.sqliteService.getAllPatients()
      return patients.length === 0
    }
    
    return false
  }

  /**
   * Get migration status and statistics
   */
  async getMigrationStatus(): Promise<{
    lowdbExists: boolean
    sqliteExists: boolean
    lowdbRecordCount: number
    sqliteRecordCount: number
    migrationNeeded: boolean
  }> {
    const lowdbPath = join(app.getPath('userData'), 'dental_clinic.json')
    const sqlitePath = join(app.getPath('userData'), 'dental_clinic.db')
    
    const lowdbExists = existsSync(lowdbPath)
    const sqliteExists = existsSync(sqlitePath)
    
    let lowdbRecordCount = 0
    let sqliteRecordCount = 0
    
    if (lowdbExists) {
      const patients = await this.lowdbService.getAllPatients()
      lowdbRecordCount = patients.length
    }
    
    if (sqliteExists) {
      const patients = await this.sqliteService.getAllPatients()
      sqliteRecordCount = patients.length
    }
    
    return {
      lowdbExists,
      sqliteExists,
      lowdbRecordCount,
      sqliteRecordCount,
      migrationNeeded: await this.isMigrationNeeded()
    }
  }

  /**
   * Clean up resources
   */
  close(): void {
    this.sqliteService.close()
  }
}
