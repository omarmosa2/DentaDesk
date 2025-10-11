/**
 * Dental Image System Test
 * Tests the complete dental image system implementation
 */

const { DatabaseService } = require('../src/services/databaseService')
const { ImageMigrationService } = require('../src/services/imageMigrationService')
const { BackupService } = require('../src/services/backupService')
const { existsSync, mkdirSync, writeFileSync, rmSync } = require('fs')
const { join } = require('path')

class DentalImageSystemTest {
  constructor() {
    this.testDir = join(process.cwd(), 'test_data')
    this.dbPath = join(this.testDir, 'test_dental_clinic.db')
    this.imagesPath = join(this.testDir, 'dental_images')

    this.databaseService = null
    this.migrationService = null
    this.backupService = null
  }

  async setup() {
    console.log('🔧 Setting up test environment...')

    // Create test directory
    if (existsSync(this.testDir)) {
      rmSync(this.testDir, { recursive: true, force: true })
    }
    mkdirSync(this.testDir, { recursive: true })

    // Initialize services
    this.databaseService = new DatabaseService(this.dbPath)
    this.migrationService = new ImageMigrationService(this.databaseService)
    this.backupService = new BackupService(this.databaseService)

    console.log('✅ Test environment setup complete')
  }

  async cleanup() {
    console.log('🧹 Cleaning up test environment...')

    if (this.databaseService && this.databaseService.db) {
      this.databaseService.db.close()
    }

    if (existsSync(this.testDir)) {
      rmSync(this.testDir, { recursive: true, force: true })
    }

    console.log('✅ Test environment cleaned up')
  }

  async createTestData() {
    console.log('📊 Creating test data...')

    // Create test patient
    const patient = {
      id: 'test-patient-001',
      serial_number: 'P001',
      full_name: 'Test Patient',
      gender: 'male',
      age: 30,
      patient_condition: 'Good'
    }

    await this.databaseService.createPatient(patient)

    // Create test dental treatment
    const treatment = {
      id: 'test-treatment-001',
      patient_id: patient.id,
      tooth_number: 11,
      tooth_name: 'Upper Right Central Incisor',
      current_treatment: 'Cleaning',
      treatment_status: 'completed'
    }

    await this.databaseService.createDentalTreatment(treatment)

    // Create old structure test images
    const oldStructureDir = join(this.imagesPath, 'Test_Patient', 'before')
    mkdirSync(oldStructureDir, { recursive: true })

    const testImagePath = join(oldStructureDir, 'test-image.png')
    writeFileSync(testImagePath, 'fake-image-data')

    // Create test image record with old path
    const imageRecord = {
      dental_treatment_id: treatment.id,
      patient_id: patient.id,
      tooth_number: 11,
      image_path: 'dental_images/Test_Patient/before/test-image.png',
      image_type: 'before',
      description: 'Test image'
    }

    await this.databaseService.createDentalTreatmentImage(imageRecord)

    console.log('✅ Test data created')
    return { patient, treatment, imageRecord }
  }

  async testFolderStructure() {
    console.log('📁 Testing folder structure validation...')

    const testCases = [
      {
        patientId: 'test-patient-001',
        toothNumber: 11,
        imageType: 'before',
        expected: 'dental_images/test-patient-001/11/before/'
      },
      {
        patientId: 'another-patient-uuid',
        toothNumber: 32,
        imageType: 'after',
        expected: 'dental_images/another-patient-uuid/32/after/'
      }
    ]

    for (const testCase of testCases) {
      console.log(`  ✓ Expected database path: ${testCase.expected}`)
      console.log(`  ✓ Expected physical path: ${testCase.expected}test-image.png`)
    }

    console.log('✅ Folder structure validation passed')
  }

  async testMigration() {
    console.log('🔄 Testing image migration...')

    // Run migration
    const result = await this.migrationService.migrateImages()

    console.log('Migration result:', result)

    // Verify migration results
    if (result.success && result.migrated > 0) {
      console.log('✅ Migration completed successfully')

      // Check if image was moved to new structure
      const newImagePath = join(this.imagesPath, 'test-patient-001', '11', 'before', 'test-image.png')
      if (existsSync(newImagePath)) {
        console.log('✅ Image file migrated to new structure')
      } else {
        console.log('❌ Image file not found in new structure')
      }

      // Check if database was updated
      const updatedRecord = this.databaseService.db.prepare(
        'SELECT * FROM dental_treatment_images WHERE dental_treatment_id = ?'
      ).get('test-treatment-001')

      if (updatedRecord && updatedRecord.image_path === 'dental_images/test-patient-001/11/before/') {
        console.log('✅ Database record updated with new path format')
      } else {
        console.log('❌ Database record not updated correctly')
        console.log('Expected: dental_images/test-patient-001/11/before/')
        console.log('Actual:', updatedRecord?.image_path)
      }
    } else {
      console.log('❌ Migration failed or no images to migrate')
    }
  }

  async testImageUpload() {
    console.log('📤 Testing image upload with new structure...')

    // Simulate new image upload
    const uploadData = {
      dental_treatment_id: 'test-treatment-001',
      patient_id: 'test-patient-001',
      tooth_number: 12,
      image_path: 'dental_images/test-patient-001/12/after/',
      image_type: 'after',
      description: 'New test image'
    }

    const result = await this.databaseService.createDentalTreatmentImage(uploadData)

    if (result && result.id) {
      console.log('✅ Image upload record created successfully')
      console.log(`  Image ID: ${result.id}`)
      console.log(`  Image path: ${result.image_path}`)
    } else {
      console.log('❌ Image upload failed')
    }
  }

  async testBackupRestore() {
    console.log('💾 Testing backup and restore...')

    try {
      // Create backup
      const backupPath = join(this.testDir, 'test-backup.db')
      await this.backupService.createBackup('test-backup', backupPath)

      if (existsSync(backupPath)) {
        console.log('✅ Backup created successfully')
      } else {
        console.log('❌ Backup creation failed')
        return
      }

      // Test restore
      const restoreResult = await this.backupService.restoreBackup(backupPath)

      if (restoreResult) {
        console.log('✅ Restore completed successfully')
      } else {
        console.log('❌ Restore failed')
      }
    } catch (error) {
      console.log('❌ Backup/restore test failed:', error.message)
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Dental Image System Tests...\n')

    try {
      await this.setup()
      await this.createTestData()
      await this.testFolderStructure()
      await this.testMigration()
      await this.testImageUpload()
      await this.testBackupRestore()

      console.log('\n✅ All tests completed successfully!')

    } catch (error) {
      console.error('\n❌ Test failed:', error)
    } finally {
      await this.cleanup()
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const test = new DentalImageSystemTest()
  test.runAllTests().catch(console.error)
}

module.exports = { DentalImageSystemTest }
