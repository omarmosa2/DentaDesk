const { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, rmSync } = require('fs')
const { join, basename, dirname } = require('path')
const { app } = require('electron')
const glob = require('glob')

/**
 * Image Migration Service
 * Migrates dental images from old structure (patient_name/image_type)
 * to new structure (patient_id/tooth_number/image_type)
 */
class ImageMigrationService {
  constructor(databaseService) {
    this.databaseService = databaseService
    this.dentalImagesPath = join(app.getPath('userData'), 'dental_images')
    this.backupPath = join(app.getPath('userData'), 'dental_images_backup_migration')
  }

  /**
   * Main migration function
   * Migrates all images from old structure to new structure
   */
  async migrateImages() {
    try {
      console.log('🚀 Starting dental images migration...')

      // Create backup of current images directory
      await this.createBackup()

      // Get all image records from database
      const imageRecords = this.databaseService.db.prepare(`
        SELECT id, dental_treatment_id, image_path, patient_id, tooth_number, image_type, description
        FROM dental_treatment_images
      `).all()

      console.log(`📊 Found ${imageRecords.length} image records to migrate`)

      let migratedCount = 0
      let skippedCount = 0
      let errorCount = 0

      for (const record of imageRecords) {
        try {
          const result = await this.migrateImageRecord(record)
          if (result.migrated) {
            migratedCount++
          } else {
            skippedCount++
          }
        } catch (error) {
          console.error(`❌ Error migrating image record ${record.id}:`, error)
          errorCount++
        }
      }

      console.log(`✅ Migration completed:`)
      console.log(`   📋 Migrated: ${migratedCount}`)
      console.log(`   ⏭️ Skipped: ${skippedCount}`)
      console.log(`   ❌ Errors: ${errorCount}`)

      // Clean up old empty directories
      await this.cleanupOldDirectories()

      return {
        success: true,
        migrated: migratedCount,
        skipped: skippedCount,
        errors: errorCount
      }

    } catch (error) {
      console.error('❌ Migration failed:', error)
      throw error
    }
  }

  /**
   * Migrate a single image record
   */
  async migrateImageRecord(record) {
    console.log(`🔄 Migrating image record:`, record)

    const currentPath = record.image_path
    const filename = basename(currentPath)

    // Build new path structure: dental_images/patient_id/tooth_number/image_type/ (without filename)
    const newPath = `dental_images/${record.patient_id}/${record.tooth_number}/${record.image_type || 'other'}/`
    const fullNewPath = join(this.dentalImagesPath, record.patient_id, record.tooth_number.toString(), record.image_type || 'other', filename)

    console.log(`📁 Current path: ${currentPath}`)
    console.log(`📁 New path: ${newPath}`)

    // Check if already in new structure
    if (currentPath === newPath && existsSync(fullNewPath)) {
      console.log(`✅ Image already in new structure: ${record.id}`)
      return { migrated: false, reason: 'already_migrated' }
    }

    // Find the current file location
    let currentFullPath = null

    // Try current path as stored in database
    const possibleCurrentPaths = [
      join(app.getPath('userData'), currentPath),
      join(__dirname, '..', '..', 'public', 'upload', currentPath),
      currentPath // if absolute path
    ]

    for (const path of possibleCurrentPaths) {
      if (existsSync(path)) {
        currentFullPath = path
        break
      }
    }

    // If not found, search by filename
    if (!currentFullPath) {
      console.log(`🔍 File not found at stored path, searching by filename: ${filename}`)
      const searchPaths = [
        join(this.dentalImagesPath, '**', filename),
        join(__dirname, '..', '..', 'public', 'upload', 'dental_images', '**', filename)
      ]

      for (const searchPattern of searchPaths) {
        const foundFiles = glob.sync(searchPattern)
        if (foundFiles.length > 0) {
          currentFullPath = foundFiles[0]
          console.log(`🔍 Found file at: ${currentFullPath}`)
          break
        }
      }
    }

    if (!currentFullPath) {
      console.warn(`⚠️ Image file not found for record ${record.id}: ${filename}`)
      return { migrated: false, reason: 'file_not_found' }
    }

    // Create new directory structure
    const newDir = dirname(fullNewPath)
    if (!existsSync(newDir)) {
      mkdirSync(newDir, { recursive: true })
      console.log(`📁 Created directory: ${newDir}`)
    }

    // Copy file to new location
    if (!existsSync(fullNewPath)) {
      copyFileSync(currentFullPath, fullNewPath)
      console.log(`📋 Copied file to: ${fullNewPath}`)
    }

    // Update database record with new path
    this.databaseService.db.prepare(`
      UPDATE dental_treatment_images
      SET image_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newPath, record.id)

    console.log(`✅ Migrated image record ${record.id} to new structure`)
    return { migrated: true }
  }

  /**
   * Create backup of current images directory
   */
  async createBackup() {
    if (!existsSync(this.dentalImagesPath)) {
      console.log('📁 No dental images directory found, skipping backup')
      return
    }

    console.log('💾 Creating backup of current images...')

    if (existsSync(this.backupPath)) {
      rmSync(this.backupPath, { recursive: true, force: true })
    }

    await this.copyDirectory(this.dentalImagesPath, this.backupPath)
    console.log(`💾 Backup created at: ${this.backupPath}`)
  }

  /**
   * Copy directory recursively
   */
  async copyDirectory(src, dest) {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true })
    }

    const items = readdirSync(src)
    for (const item of items) {
      const srcPath = join(src, item)
      const destPath = join(dest, item)
      const stat = statSync(srcPath)

      if (stat.isDirectory()) {
        await this.copyDirectory(srcPath, destPath)
      } else {
        copyFileSync(srcPath, destPath)
      }
    }
  }

  /**
   * Clean up old empty directories after migration
   */
  async cleanupOldDirectories() {
    console.log('🧹 Cleaning up old empty directories...')

    if (!existsSync(this.dentalImagesPath)) {
      return
    }

    try {
      const items = readdirSync(this.dentalImagesPath)
      for (const item of items) {
        const itemPath = join(this.dentalImagesPath, item)
        const stat = statSync(itemPath)

        if (stat.isDirectory()) {
          // Check if this looks like an old structure directory (patient name)
          // New structure uses UUIDs, old structure uses cleaned patient names
          if (!this.isUUID(item)) {
            await this.removeEmptyDirectory(itemPath)
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error during cleanup:', error)
    }
  }

  /**
   * Check if string is a UUID
   */
  isUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  /**
   * Remove directory if empty
   */
  async removeEmptyDirectory(dirPath) {
    try {
      const items = readdirSync(dirPath)

      // Recursively check subdirectories
      for (const item of items) {
        const itemPath = join(dirPath, item)
        const stat = statSync(itemPath)

        if (stat.isDirectory()) {
          await this.removeEmptyDirectory(itemPath)
        }
      }

      // Check if directory is now empty
      const remainingItems = readdirSync(dirPath)
      if (remainingItems.length === 0) {
        rmSync(dirPath, { recursive: true })
        console.log(`🗑️ Removed empty directory: ${dirPath}`)
      }
    } catch (error) {
      // Ignore errors during cleanup
    }
  }

  /**
   * Restore from backup if migration fails
   */
  async restoreFromBackup() {
    if (!existsSync(this.backupPath)) {
      throw new Error('No backup found to restore from')
    }

    console.log('🔄 Restoring from backup...')

    if (existsSync(this.dentalImagesPath)) {
      rmSync(this.dentalImagesPath, { recursive: true, force: true })
    }

    await this.copyDirectory(this.backupPath, this.dentalImagesPath)
    console.log('✅ Restored from backup successfully')
  }
}

module.exports = { ImageMigrationService }
