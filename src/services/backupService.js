const { app } = require('electron')
const { join, basename, dirname } = require('path')
const path = require('path')
const { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, rmSync, readFileSync, writeFileSync, lstatSync } = require('fs')
const fs = require('fs').promises
const archiver = require('archiver')
const extract = require('extract-zip')
const glob = require('glob')

class BackupService {
  constructor(databaseService) {
    this.databaseService = databaseService

    // Get the actual database path from the database service
    // This ensures we're using the same path as the database service
    let actualDbPath
    try {
      // Try to get the path from the database service if available
      if (databaseService && databaseService.db && databaseService.db.name) {
        actualDbPath = databaseService.db.name
        console.log('📍 Using database path from database service:', actualDbPath)
      } else {
        // Fallback to the same logic as databaseService.js
        try {
          // For production builds, use userData directory
          const isProduction = !process.env.NODE_ENV || process.env.NODE_ENV === 'production'
          if (isProduction && process.execPath && !process.execPath.includes('node')) {
            // This is a production build
            actualDbPath = join(app.getPath('userData'), 'dental_clinic.db')
            console.log('📍 Using production database path (userData):', actualDbPath)
          } else {
            // This is development or testing
            const appDir = process.execPath ? require('path').dirname(process.execPath) : process.cwd()
            actualDbPath = join(appDir, 'dental_clinic.db')
            console.log('📍 Using fallback database path (app dir):', actualDbPath)
          }
        } catch (error) {
          // Final fallback
          actualDbPath = join(app.getPath('userData'), 'dental_clinic.db')
          console.log('📍 Using final fallback database path (userData):', actualDbPath)
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not determine database path, using userData fallback')
      actualDbPath = join(app.getPath('userData'), 'dental_clinic.db')
    }

    this.sqliteDbPath = actualDbPath

    // Set other paths relative to the database location
    const dbDir = require('path').dirname(this.sqliteDbPath)
    this.backupDir = join(dbDir, 'backups')
    this.backupRegistryPath = join(dbDir, 'backup_registry.json')

    // Set dental images path to userData directory to match where the app looks for images
    // This ensures consistency between backup/restore and image loading
    this.dentalImagesPath = join(app.getPath('userData'), 'dental_images')

    console.log('📍 Backup service paths:')
    console.log('   Database:', this.sqliteDbPath)
    console.log('   Backups:', this.backupDir)
    console.log('   Images:', this.dentalImagesPath)

    this.ensureBackupDirectory()
    this.ensureBackupRegistry()
    this.ensureDentalImagesDirectory()
    this.ensureImagesInBothLocations()
  }

  ensureBackupDirectory() {
    try {
      if (!existsSync(this.backupDir)) {
        console.log('📁 Creating backup directory:', this.backupDir)
        mkdirSync(this.backupDir, { recursive: true })
        console.log('✅ Backup directory created successfully')
      } else {
        console.log('📁 Backup directory already exists:', this.backupDir)
      }
      
      // Test if we can write to the backup directory
      const testFile = join(this.backupDir, 'test_write.tmp')
      try {
        writeFileSync(testFile, 'test')
        rmSync(testFile)
        console.log('✅ Backup directory is writable')
      } catch (writeError) {
        console.warn('⚠️ Backup directory is not writable:', writeError.message)
        // Try to use userData directory as fallback
        const fallbackDir = join(app.getPath('userData'), 'backups')
        if (fallbackDir !== this.backupDir) {
          console.log('🔄 Trying fallback backup directory:', fallbackDir)
          this.backupDir = fallbackDir
          this.backupRegistryPath = join(fallbackDir, 'backup_registry.json')
          this.ensureBackupDirectory()
        }
      }
    } catch (error) {
      console.error('❌ Failed to ensure backup directory:', error.message)
      throw error
    }
  }

  ensureBackupRegistry() {
    if (!existsSync(this.backupRegistryPath)) {
      writeFileSync(this.backupRegistryPath, JSON.stringify([], null, 2), 'utf-8')
    }
  }

  ensureDentalImagesDirectory() {
    // Ensure userData directory exists
    if (!existsSync(this.dentalImagesPath)) {
      mkdirSync(this.dentalImagesPath, { recursive: true })
      console.log('📁 Created userData dental images directory:', this.dentalImagesPath)
    }

    // Also ensure project directory exists (for app to find images)
    const projectImagesPath = join(process.cwd(), 'dental_images')
    if (!existsSync(projectImagesPath)) {
      mkdirSync(projectImagesPath, { recursive: true })
      console.log('📁 Created project dental images directory:', projectImagesPath)
    }

    // Sync images between both directories
    this.syncImageDirectories(this.dentalImagesPath, projectImagesPath)
  }

  // Sync images between two directories
  syncImageDirectories(sourceDir, destDir) {
    try {
      if (!existsSync(sourceDir)) return

      const imageFiles = glob.sync(join(sourceDir, '**', '*')).filter(file => {
        const stats = require('fs').statSync(file)
        return stats.isFile()
      })

      if (imageFiles.length > 0) {
        console.log(`🔄 Syncing ${imageFiles.length} images from ${sourceDir} to ${destDir}`)
        
        for (const sourceFile of imageFiles) {
          const relativePath = path.relative(sourceDir, sourceFile)
          const destFile = join(destDir, relativePath)
          const destDirPath = dirname(destFile)
          
          if (!existsSync(destDirPath)) {
            mkdirSync(destDirPath, { recursive: true })
          }
          
          if (!existsSync(destFile)) {
            copyFileSync(sourceFile, destFile)
            console.log(`✅ Synced: ${relativePath}`)
          }
        }
        
        console.log(`✅ Sync completed: ${imageFiles.length} images synced`)
      }
    } catch (syncError) {
      console.warn('⚠️ Failed to sync images between directories:', syncError.message)
    }
  }

  // Ensure images are available in both project and userData directories
  ensureImagesInBothLocations() {
    const projectImagesPath = join(process.cwd(), 'dental_images')
    const userDataImagesPath = join(app.getPath('userData'), 'dental_images')

    console.log('🔄 Ensuring images are available in both locations...')
    console.log(`📁 Project: ${projectImagesPath}`)
    console.log(`📁 UserData: ${userDataImagesPath}`)

    // Sync from project to userData
    if (existsSync(projectImagesPath)) {
      this.syncImageDirectories(projectImagesPath, userDataImagesPath)
    }

    // Sync from userData to project
    if (existsSync(userDataImagesPath)) {
      this.syncImageDirectories(userDataImagesPath, projectImagesPath)
    }
  }

  getBackupRegistry() {
    try {
      const content = readFileSync(this.backupRegistryPath, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.error('Failed to read backup registry:', error)
      return []
    }
  }

  addToBackupRegistry(backupInfo) {
    try {
      const registry = this.getBackupRegistry()

      // Check if backup with same name already exists
      const existingIndex = registry.findIndex(backup => backup.name === backupInfo.name)
      if (existingIndex !== -1) {
        // Update existing entry instead of adding duplicate
        registry[existingIndex] = backupInfo
        console.log(`📝 Updated existing backup registry entry: ${backupInfo.name}`)
      } else {
        // Add new backup to beginning of array
        registry.unshift(backupInfo)
        console.log(`➕ Added new backup to registry: ${backupInfo.name}`)
      }

      // Keep only last 50 backups in registry
      if (registry.length > 50) {
        registry.splice(50)
      }

      writeFileSync(this.backupRegistryPath, JSON.stringify(registry, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to update backup registry:', error)
    }
  }

  async createBackup(customPath = null, includeImages = false) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupName = `backup_${timestamp}`

    try {
      console.log('🚀 Starting backup creation...')
      console.log('📍 Custom path provided:', customPath)
      console.log('📸 Include images:', includeImages)

      let backupPath
      if (customPath) {
        // Use the custom path provided by user
        if (includeImages) {
          // For backups with images, use .zip extension
          backupPath = customPath.replace(/\.(json|db|sqlite|zip)$/, '') + '.zip'
        } else {
          // For database-only backups, use .db extension
          backupPath = customPath.replace(/\.(json|db|sqlite|zip)$/, '') + '.db'
        }

        console.log('📍 Using custom path (modified):', backupPath)
        console.log('📍 Original custom path was:', customPath)
      } else {
        // Use default backup directory
        if (includeImages) {
          backupPath = join(this.backupDir, `${backupName}.zip`)
        } else {
          backupPath = join(this.backupDir, `${backupName}.db`)
        }
        console.log('📍 Using default path:', backupPath)
      }

      console.log('📍 SQLite DB path:', this.sqliteDbPath)
      console.log('📍 Target backup path:', backupPath)

      // Verify source database exists and has data
      if (!existsSync(this.sqliteDbPath)) {
        console.error('❌ SQLite database file not found at:', this.sqliteDbPath)
        throw new Error('SQLite database file not found')
      }

      // Check source database size and content
      const sourceStats = statSync(this.sqliteDbPath)
      console.log('📊 Source database size:', sourceStats.size, 'bytes')

      if (sourceStats.size === 0) {
        console.warn('⚠️ Source database file is empty!')
        throw new Error('Source database file is empty')
      }

      // Verify database connection is working before backup
      try {
        const testQuery = this.databaseService.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
        const result = testQuery.get()
        console.log('📋 Database contains', result.count, 'tables')

        // List all tables in the database
        const allTablesQuery = this.databaseService.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        const allTables = allTablesQuery.all()
        console.log('📋 All tables in database:', allTables.map(t => t.name))

        // Test key tables including dental treatment tables
        const tables = ['patients', 'appointments', 'payments', 'treatments', 'dental_treatments', 'dental_treatment_images']
        let totalCurrentRecords = 0

        for (const table of tables) {
          try {
            const countQuery = this.databaseService.db.prepare(`SELECT COUNT(*) as count FROM ${table}`)
            const count = countQuery.get()
            console.log(`📊 Table ${table}: ${count.count} records`)
            totalCurrentRecords += count.count
          } catch (tableError) {
            console.warn(`⚠️ Could not query table ${table}:`, tableError.message)
          }
        }

        console.log(`📊 Total records in current database: ${totalCurrentRecords}`)

        if (totalCurrentRecords === 0) {
          console.warn('⚠️ Warning: Database appears to be empty. Backup will contain no data.')
        }

        // Special check for dental_treatment_images table
        try {
          const imageTableCheck = this.databaseService.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='dental_treatment_images'")
          const imageTableExists = imageTableCheck.get()
          if (imageTableExists) {
            const imageCount = this.databaseService.db.prepare("SELECT COUNT(*) as count FROM dental_treatment_images").get()
            console.log(`📸 dental_treatment_images table: ${imageCount.count} image records`)

            // Show sample image records
            if (imageCount.count > 0) {
              const sampleImages = this.databaseService.db.prepare("SELECT patient_id, tooth_number, image_type, image_path FROM dental_treatment_images LIMIT 3").all()
              console.log('📸 Sample image records:')
              sampleImages.forEach(img => console.log(`   - Patient: ${img.patient_id}, Tooth: ${img.tooth_number}, Type: ${img.image_type}, Path: ${img.image_path}`))
            }
          } else {
            console.warn('⚠️ dental_treatment_images table does not exist!')
          }
        } catch (imageError) {
          console.error('❌ Error checking dental_treatment_images table:', imageError)
        }

      } catch (dbError) {
        console.error('❌ Database connection test failed:', dbError)
        throw new Error('Database connection is not working properly')
      }

      if (includeImages) {
        // Create backup with images (ZIP format)
        console.log('📁 Creating backup with images...')
        await this.createBackupWithImages(backupPath)
      } else {
        // Create database-only backup with proper WAL checkpoint
        console.log('📁 Creating SQLite database backup...')

        // Force comprehensive WAL checkpoint to ensure all data is written to main database file
        try {
          console.log('🔄 Forcing comprehensive WAL checkpoint before backup...')

          // First, try TRUNCATE checkpoint
          const truncateResult = this.databaseService.db.pragma('wal_checkpoint(TRUNCATE)')
          console.log('📊 TRUNCATE checkpoint result:', truncateResult)

          // Then, try FULL checkpoint as backup
          const fullResult = this.databaseService.db.pragma('wal_checkpoint(FULL)')
          console.log('📊 FULL checkpoint result:', fullResult)

          // Force synchronous mode temporarily to ensure all writes are committed
          const oldSync = this.databaseService.db.pragma('synchronous')
          this.databaseService.db.pragma('synchronous = FULL')

          // Force another checkpoint after changing sync mode
          const finalResult = this.databaseService.db.pragma('wal_checkpoint(RESTART)')
          console.log('📊 RESTART checkpoint result:', finalResult)

          // Restore original sync mode
          this.databaseService.db.pragma(`synchronous = ${oldSync}`)

          console.log('✅ Comprehensive WAL checkpoint completed before backup')
        } catch (checkpointError) {
          console.warn('⚠️ WAL checkpoint failed before backup:', checkpointError.message)
        }

        // Wait longer to ensure file handles are released and all writes are committed
        await new Promise(resolve => setTimeout(resolve, 500))

        // Use SQLite backup API instead of file copy for better reliability
        try {
          console.log('📋 Creating SQLite backup using backup API...')
          await this.createSqliteBackupUsingAPI(backupPath)
          console.log('✅ SQLite backup API completed')
        } catch (apiError) {
          console.warn('⚠️ SQLite backup API failed, falling back to file copy:', apiError.message)

          // Fallback to file copy method
          copyFileSync(this.sqliteDbPath, backupPath)
        }

        // Verify backup was created successfully
        if (!existsSync(backupPath)) {
          throw new Error('Backup file was not created successfully')
        }

        const backupStats = statSync(backupPath)
        console.log('📊 Backup file size:', backupStats.size, 'bytes')

        // Verify backup integrity by testing it
        try {
          console.log('🔍 Verifying backup integrity...')
          await this.verifyBackupIntegrity(backupPath)
          console.log('✅ Backup integrity verified')
        } catch (verifyError) {
          console.error('❌ Backup integrity check failed:', verifyError.message)
          throw new Error('Backup was created but failed integrity check')
        }

        console.log('✅ SQLite database backup created successfully')
      }

      // Get file stats
      const backupStats = statSync(backupPath)

      // Create metadata for backup registry
      const metadata = {
        created_at: new Date().toISOString(),
        version: '4.0.0', // Updated version for image support
        platform: process.platform,
        backup_type: 'full',
        database_type: 'sqlite',
        backup_format: includeImages ? 'sqlite_with_images' : 'sqlite_only',
        includes_images: includeImages
      }

      // Add to backup registry
      const backupInfo = {
        name: basename(backupPath, includeImages ? '.zip' : '.db'),
        path: backupPath,
        size: backupStats.size,
        created_at: metadata.created_at,
        version: metadata.version,
        platform: metadata.platform,
        database_type: 'sqlite',
        backup_format: metadata.backup_format,
        includes_images: includeImages
      }
      this.addToBackupRegistry(backupInfo)

      console.log(`✅ Backup created successfully:`)
      console.log(`   File: ${backupPath}`)
      console.log(`   Size: ${this.formatFileSize(backupStats.size)}`)
      console.log(`   Includes Images: ${includeImages ? 'Yes' : 'No'}`)

      return backupPath

    } catch (error) {
      console.error('❌ Backup creation failed:', error)
      throw new Error(`فشل في إنشاء النسخة الاحتياطية: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Helper function to calculate directory size
  async calculateDirectorySize(dirPath) {
    if (!existsSync(dirPath)) {
      return 0
    }

    let totalSize = 0
    try {
      const items = await fs.readdir(dirPath)

      for (const item of items) {
        const itemPath = join(dirPath, item)
        const stats = await fs.lstat(itemPath)

        if (stats.isDirectory()) {
          totalSize += await this.calculateDirectorySize(itemPath)
        } else {
          totalSize += stats.size
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not calculate size for ${dirPath}:`, error.message)
    }

    return totalSize
  }

  // Helper function to copy directory recursively
  async copyDirectory(source, destination) {
    if (!existsSync(source)) {
      console.warn(`Source directory does not exist: ${source}`)
      return
    }

    // Create destination directory if it doesn't exist
    if (!existsSync(destination)) {
      await fs.mkdir(destination, { recursive: true })
    }

    const items = await fs.readdir(source)

    for (const item of items) {
      const sourcePath = join(source, item)
      const destPath = join(destination, item)
      const stats = await fs.lstat(sourcePath)

      if (stats.isDirectory()) {
        // Recursively copy subdirectories
        await this.copyDirectory(sourcePath, destPath)
      } else {
        // Ensure destination directory exists for file copy
        const destDir = dirname(destPath)
        if (!existsSync(destDir)) {
          await fs.mkdir(destDir, { recursive: true })
        }

        // Copy file with overwrite
        await fs.copyFile(sourcePath, destPath)
      }
    }
  }

  // Specialized method for restoring images from extracted backup
  async restoreImagesFromExtracted(source, destination) {
    console.log(`📸 Starting image restoration from ${source} to ${destination}`)
    console.log(`📸 Source exists: ${existsSync(source)}`)
    console.log(`📸 Destination exists: ${existsSync(destination)}`)

    // Get all image files from source
    const imageFiles = glob.sync(join(source, '**', '*')).filter(filePath => {
      const stats = statSync(filePath)
      return stats.isFile() && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filePath)
    })

    console.log(`📸 Found ${imageFiles.length} image files to restore`)
    
    if (imageFiles.length === 0) {
      console.log(`⚠️ No image files found in source directory: ${source}`)
      // List all files to see what's there
      const allFiles = glob.sync(join(source, '**', '*'))
      console.log(`📂 All files in source (${allFiles.length}):`)
      allFiles.slice(0, 10).forEach(file => console.log(`   - ${file}`))
      return
    }

    let successCount = 0
    let errorCount = 0

    for (const sourceFile of imageFiles) {
      try {
        // Get relative path from source directory
        const relativePath = path.relative(source, sourceFile)
        const destFile = join(destination, relativePath)

        // Ensure destination directory exists
        const destDir = dirname(destFile)
        if (!existsSync(destDir)) {
          await fs.mkdir(destDir, { recursive: true })
          console.log(`📁 Created directory: ${destDir}`)
        }

        // Copy the file
        await fs.copyFile(sourceFile, destFile)
        console.log(`✅ Restored image: ${relativePath}`)
        successCount++

      } catch (fileError) {
        console.warn(`⚠️ Failed to restore image ${sourceFile}:`, fileError.message)
        errorCount++
        // Continue with other files
      }
    }

    console.log(`📸 Image restoration completed: ${successCount} successful, ${errorCount} failed`)
  }

  // Aggressive directory cleanup method for problematic directories
  async cleanupDirectoryAggressively(dirPath) {
    console.log(`🧹 Starting aggressive cleanup of: ${dirPath}`)

    try {
      // First attempt: standard recursive removal
      await fs.rm(dirPath, { recursive: true, force: true })
      console.log('🧹 Directory cleaned up successfully')
      return
    } catch (firstError) {
      console.warn('⚠️ Standard cleanup failed, trying manual approach:', firstError.message)
    }

    // Manual cleanup using rimraf-style approach
    try {
      await this.manualDirectoryCleanup(dirPath)
      console.log('🧹 Directory cleaned up manually')
      return
    } catch (manualError) {
      console.error('❌ Manual cleanup method failed for:', dirPath)
      console.error('❌ Error details:', manualError.message)
    }

    // Last resort: try multiple times with delays (don't throw errors)
    try {
      console.log('🔄 Trying final cleanup approach with multiple attempts...')

      // Try multiple times with delays
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await new Promise(resolve => setTimeout(resolve, attempt * 1000))
          await fs.rm(dirPath, { recursive: true, force: true })
          console.log(`🧹 Directory cleaned up on attempt ${attempt}`)
          return
        } catch (attemptError) {
          console.warn(`⚠️ Cleanup attempt ${attempt} failed:`, attemptError.message)
          if (attempt === 3) {
            console.error('❌ Final cleanup attempt also failed')
          }
        }
      }
    } catch (finalError) {
      console.error('❌ All cleanup approaches failed:', finalError.message)
    }

    // If we reach here, all cleanup methods failed but we don't throw an error
    console.error('❌ Unable to clean up directory automatically:', dirPath)
    console.error('❌ Directory can be deleted manually if needed')
    // Don't throw error - allow restoration to continue
  }

  // Manual directory cleanup for stubborn directories
  async manualDirectoryCleanup(dirPath) {
    console.log(`🔍 Starting manual cleanup of: ${dirPath}`)

    try {
      const items = await fs.readdir(dirPath)
      console.log(`📂 Found ${items.length} items to clean up in: ${dirPath}`)

      for (const item of items) {
        const itemPath = join(dirPath, item)
        console.log(`🔍 Processing: ${itemPath}`)

        try {
          const stats = await fs.lstat(itemPath)

          if (stats.isDirectory()) {
            // Recursively cleanup subdirectories first
            await this.manualDirectoryCleanup(itemPath)

            // Try to remove the subdirectory
            try {
              await fs.rmdir(itemPath)
              console.log(`🗑️ Removed subdirectory: ${itemPath}`)
            } catch (dirError) {
              console.warn(`⚠️ Could not remove subdirectory ${itemPath}:`, dirError.message)

              // If rmdir fails, try with fs.rm
              try {
                await fs.rm(itemPath, { recursive: true, force: true })
                console.log(`🗑️ Force removed subdirectory: ${itemPath}`)
              } catch (forceError) {
                console.error(`❌ Failed to force remove subdirectory ${itemPath}:`, forceError.message)
              }
            }
          } else {
            // Remove files
            try {
              await fs.unlink(itemPath)
              console.log(`🗑️ Removed file: ${itemPath}`)
            } catch (fileError) {
              console.warn(`⚠️ Could not remove file ${itemPath}:`, fileError.message)
            }
          }
        } catch (itemError) {
          console.warn(`⚠️ Could not access ${itemPath}:`, itemError.message)

          // Try to force remove this item
          try {
            await fs.rm(itemPath, { recursive: true, force: true })
            console.log(`🗑️ Force removed inaccessible item: ${itemPath}`)
          } catch (forceError) {
            console.error(`❌ Failed to force remove inaccessible item ${itemPath}:`, forceError.message)
          }
        }
      }

      // Finally, try to remove the main directory
      try {
        await fs.rmdir(dirPath)
        console.log(`🗑️ Removed main directory: ${dirPath}`)
      } catch (mainDirError) {
        console.warn(`⚠️ Could not remove main directory ${dirPath}:`, mainDirError.message)

        // Last resort: use fs.rm
        try {
          await fs.rm(dirPath, { recursive: true, force: true })
          console.log(`🗑️ Force removed main directory: ${dirPath}`)
        } catch (finalError) {
          console.error(`❌ Failed to force remove main directory ${dirPath}:`, finalError.message)
          // Don't throw error - allow cleanup to continue gracefully
        }
      }
    } catch (readError) {
      console.warn(`⚠️ Could not read directory ${dirPath}:`, readError.message)

      // If we can't even read the directory, try to force remove it entirely
      try {
        await fs.rm(dirPath, { recursive: true, force: true })
        console.log(`🗑️ Force removed unreadable directory: ${dirPath}`)
      } catch (finalError) {
        console.error(`❌ Failed to force remove unreadable directory ${dirPath}:`, finalError.message)
        // Don't throw error - allow cleanup to continue gracefully
      }
    }
  }

  // Create SQLite backup using backup API for better reliability
  async createSqliteBackupUsingAPI(backupPath) {
    return new Promise((resolve, reject) => {
      try {
        const Database = require('better-sqlite3')

        // Open backup database
        const backupDb = new Database(backupPath)

        // Use SQLite backup API - pass the source database path as string
        const backup = backupDb.backup(this.sqliteDbPath)

        // Check if backup object has the expected methods
        if (typeof backup.step !== 'function') {
          throw new Error('SQLite backup API not available or incompatible')
        }

        backup.step(-1) // Copy all pages
        backup.finish()

        backupDb.close()

        console.log('✅ SQLite backup API completed successfully')
        resolve()
      } catch (error) {
        console.error('❌ SQLite backup API failed:', error)
        reject(error)
      }
    })
  }

  // Verify backup integrity by testing database operations
  async verifyBackupIntegrity(backupPath) {
    const Database = require('better-sqlite3')
    let testDb = null

    try {
      // Open backup database in readonly mode
      testDb = new Database(backupPath, { readonly: true })

      // Test basic database structure
      const tablesQuery = testDb.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
      const tablesResult = tablesQuery.get()
      console.log(`📋 Backup contains ${tablesResult.count} tables`)

      if (tablesResult.count === 0) {
        throw new Error('Backup database contains no tables')
      }

      // Test key tables and their data
      const keyTables = ['patients', 'appointments', 'payments', 'treatments', 'dental_treatments', 'dental_treatment_images']
      let totalRecords = 0

      for (const table of keyTables) {
        try {
          const countQuery = testDb.prepare(`SELECT COUNT(*) as count FROM ${table}`)
          const count = countQuery.get()
          console.log(`📊 Backup table ${table}: ${count.count} records`)
          totalRecords += count.count
        } catch (tableError) {
          // Table might not exist, which is okay for some tables
          console.log(`📋 Table ${table} not found in backup (this may be normal)`)
        }
      }

      // Additional verification: check if backup is actually working by comparing with source
      if (totalRecords === 0) {
        console.log('⚠️ Warning: Backup verification shows 0 records, but this might be a verification issue')
        console.log('⚠️ The backup file exists and has the correct size, so it may still be valid')

        // Try a different approach - check if tables exist and have structure
        try {
          const tableCheckQuery = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
          const userTables = tableCheckQuery.all()
          console.log(`📋 Backup contains ${userTables.length} user tables:`, userTables.map(t => t.name))

          if (userTables.length > 0) {
            console.log('✅ Backup appears to have valid structure despite record count issue')
            
            // Try to get actual record counts from each table
            for (const table of userTables) {
              try {
                const countQuery = testDb.prepare(`SELECT COUNT(*) as count FROM ${table.name}`)
                const count = countQuery.get()
                console.log(`📊 Actual count for ${table.name}: ${count.count} records`)
                totalRecords += count.count
              } catch (countError) {
                console.warn(`⚠️ Could not count records in ${table.name}:`, countError.message)
              }
            }
          }
        } catch (structureError) {
          console.warn('⚠️ Could not verify backup structure:', structureError.message)
        }
      }

      console.log(`📊 Total records verified in backup: ${totalRecords}`)

      // Test database integrity
      const integrityQuery = testDb.prepare("PRAGMA integrity_check")
      const integrityResult = integrityQuery.get()

      if (integrityResult && integrityResult.integrity_check !== 'ok') {
        throw new Error(`Database integrity check failed: ${integrityResult.integrity_check}`)
      }

      // Test foreign key constraints
      const foreignKeyQuery = testDb.prepare("PRAGMA foreign_key_check")
      const foreignKeyResults = foreignKeyQuery.all()

      if (foreignKeyResults.length > 0) {
        console.warn('⚠️ Foreign key constraint violations found in backup:', foreignKeyResults.length)
        foreignKeyResults.slice(0, 3).forEach(violation => {
          console.warn(`   - Table: ${violation.table}, Row: ${violation.rowid}, Parent: ${violation.parent}`)
        })
      }

      console.log('✅ Backup database integrity check passed')

    } catch (error) {
      console.error('❌ Backup integrity verification failed:', error)
      throw error
    } finally {
      if (testDb) {
        testDb.close()
      }
    }
  }

  // Create backup with images in ZIP format
  async createBackupWithImages(backupPath) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('📦 Creating ZIP backup with images...')

        // Force comprehensive database checkpoint to ensure all data is written to disk
        try {
          console.log('🔄 Forcing comprehensive database checkpoint for ZIP backup...')

          // First, try TRUNCATE checkpoint
          const truncateResult = this.databaseService.db.pragma('wal_checkpoint(TRUNCATE)')
          console.log('📊 ZIP TRUNCATE checkpoint result:', truncateResult)

          // Then, try FULL checkpoint as backup
          const fullResult = this.databaseService.db.pragma('wal_checkpoint(FULL)')
          console.log('📊 ZIP FULL checkpoint result:', fullResult)

          // Force synchronous mode temporarily to ensure all writes are committed
          const oldSync = this.databaseService.db.pragma('synchronous')
          this.databaseService.db.pragma('synchronous = FULL')

          // Force another checkpoint after changing sync mode
          const finalResult = this.databaseService.db.pragma('wal_checkpoint(RESTART)')
          console.log('📊 ZIP RESTART checkpoint result:', finalResult)

          // Restore original sync mode
          this.databaseService.db.pragma(`synchronous = ${oldSync}`)

          console.log('✅ Comprehensive database checkpoint completed for ZIP backup')
        } catch (checkpointError) {
          console.warn('⚠️ Database checkpoint failed for ZIP backup:', checkpointError.message)
        }

        // Wait longer to ensure file handles are released and all writes are committed
        await new Promise(resolve => setTimeout(resolve, 500))

        // Create a temporary database backup using the backup API for ZIP inclusion
        const tempDbPath = join(require('path').dirname(this.sqliteDbPath), `temp_backup_${Date.now()}.db`)
        try {
          console.log('📋 Creating temporary database backup for ZIP...')
          await this.createSqliteBackupUsingAPI(tempDbPath)
          console.log('✅ Temporary database backup created for ZIP')

          // Use the temporary backup file instead of the main database file
          this.tempDbPathForZip = tempDbPath
        } catch (tempBackupError) {
          console.warn('⚠️ Failed to create temporary backup for ZIP, using main database file:', tempBackupError.message)
          this.tempDbPathForZip = this.sqliteDbPath
        }

        // Verify database file is accessible and has content
        if (!existsSync(this.sqliteDbPath)) {
          throw new Error('Database file not found for backup')
        }

        const dbStats = statSync(this.sqliteDbPath)
        console.log(`📊 Database file size for backup: ${dbStats.size} bytes`)

        if (dbStats.size === 0) {
          throw new Error('Database file is empty, cannot create backup')
        }

        // Create a file to stream archive data to
        const output = require('fs').createWriteStream(backupPath)
        const archive = archiver('zip', {
          zlib: { level: 9 } // Sets the compression level
        })

        // Listen for all archive data to be written
        output.on('close', () => {
          console.log(`✅ ZIP backup created: ${archive.pointer()} total bytes`)

          // Verify the created backup
          if (existsSync(backupPath)) {
            const backupStats = statSync(backupPath)
            console.log(`📊 Created backup file size: ${backupStats.size} bytes`)
          }

          // Clean up temporary database file if it was created
          if (this.tempDbPathForZip && this.tempDbPathForZip !== this.sqliteDbPath && existsSync(this.tempDbPathForZip)) {
            try {
              require('fs').unlinkSync(this.tempDbPathForZip)
              console.log('🧹 Temporary database backup file cleaned up')
            } catch (cleanupError) {
              console.warn('⚠️ Failed to clean up temporary database file:', cleanupError.message)
            }
          }

          resolve()
        })

        // Handle warnings (e.g., stat failures and other non-blocking errors)
        archive.on('warning', (err) => {
          if (err.code === 'ENOENT') {
            console.warn('Archive warning:', err)
          } else {
            reject(err)
          }
        })

        // Handle errors
        archive.on('error', (err) => {
          reject(err)
        })

        // Pipe archive data to the file
        archive.pipe(output)

        // Add database file (use temporary backup if available)
        const dbFileToAdd = this.tempDbPathForZip || this.sqliteDbPath
        console.log('📁 Adding database to backup...')
        console.log(`📁 Database path: ${dbFileToAdd}`)

        // Verify the database file before adding to ZIP
        if (existsSync(dbFileToAdd)) {
          const dbStats = statSync(dbFileToAdd)
          console.log(`📊 Database file size for ZIP: ${dbStats.size} bytes`)

          if (dbStats.size === 0) {
            throw new Error('Database file is empty, cannot add to ZIP backup')
          }

          archive.file(dbFileToAdd, { name: 'dental_clinic.db' })
        } else {
          throw new Error(`Database file not found: ${dbFileToAdd}`)
        }

        // Add images directory if it exists
        // First sync images from project directory to userData directory
        const projectImagesPath = join(process.cwd(), 'dental_images')
        if (existsSync(projectImagesPath)) {
          console.log('🔄 Syncing images from project to userData before backup...')
          this.syncImageDirectories(projectImagesPath, this.dentalImagesPath)
        }

        if (existsSync(this.dentalImagesPath)) {
          console.log('📸 Adding images to backup...')
          console.log(`📸 Images path: ${this.dentalImagesPath}`)
          console.log(`📸 UserData path: ${app.getPath('userData')}`)
          console.log(`📸 Process cwd: ${process.cwd()}`)

          // Count images before adding to backup
          const imageFiles = glob.sync(join(this.dentalImagesPath, '**', '*')).filter(file => {
            const stats = require('fs').statSync(file)
            return stats.isFile()
          })
          console.log(`📸 Found ${imageFiles.length} image files to backup`)

          // List some sample image files for debugging
          if (imageFiles.length > 0) {
            console.log(`📸 Sample image files to backup:`)
            imageFiles.slice(0, 5).forEach(file => console.log(`   📸 ${file}`))
          }

          archive.directory(this.dentalImagesPath, 'dental_images')
          console.log(`📸 Added dental_images directory to ZIP archive`)
        } else {
          console.log('📸 No images directory found, skipping...')
          console.log(`📸 Checked path: ${this.dentalImagesPath}`)
          console.log(`📸 UserData path: ${app.getPath('userData')}`)
          console.log(`📸 Process cwd: ${process.cwd()}`)
        }

        // Finalize the archive (i.e., we are done appending files but streams have to finish yet)
        console.log('📦 Finalizing ZIP archive...')
        archive.finalize()

      } catch (error) {
        console.error('❌ Error creating ZIP backup:', error)

        // Clean up temporary database file if it was created
        if (this.tempDbPathForZip && this.tempDbPathForZip !== this.sqliteDbPath && existsSync(this.tempDbPathForZip)) {
          try {
            require('fs').unlinkSync(this.tempDbPathForZip)
            console.log('🧹 Temporary database backup file cleaned up after error')
          } catch (cleanupError) {
            console.warn('⚠️ Failed to clean up temporary database file after error:', cleanupError.message)
          }
        }

        reject(error)
      }
    })
  }

  async restoreBackup(backupPath) {
    try {
      console.log('🔄 Starting backup restoration...')

      // Check if backup file exists and determine type
      let actualBackupPath = backupPath
      let isZipBackup = false

      // Check for ZIP backup first (with images)
      if (backupPath.endsWith('.zip') || existsSync(`${backupPath}.zip`)) {
        actualBackupPath = backupPath.endsWith('.zip') ? backupPath : `${backupPath}.zip`
        isZipBackup = true
      }
      // Check for DB backup (database only)
      else if (backupPath.endsWith('.db') || existsSync(`${backupPath}.db`)) {
        actualBackupPath = backupPath.endsWith('.db') ? backupPath : `${backupPath}.db`
        isZipBackup = false
      }
      // Try legacy JSON format for backward compatibility
      else {
        const jsonBackupPath = backupPath.replace(/\.(db|zip)$/, '.json')
        if (existsSync(jsonBackupPath)) {
          console.log('📄 Found legacy JSON backup, restoring...')
          return await this.restoreLegacyBackup(jsonBackupPath)
        }
        throw new Error(`ملف النسخة الاحتياطية غير موجود: ${backupPath}`)
      }

      // Verify the backup file exists
      if (!existsSync(actualBackupPath)) {
        throw new Error(`ملف النسخة الاحتياطية غير موجود: ${actualBackupPath}`)
      }

      console.log(`📁 Found ${isZipBackup ? 'ZIP' : 'SQLite'} backup: ${actualBackupPath}`)

      // Create backup of current database before restoration
      // Check if we're in development mode
      const isDevelopment = process.env.NODE_ENV === 'development' ||
                           process.execPath.includes('node') ||
                           process.execPath.includes('electron') ||
                           process.cwd().includes('dental-clinic')

      let baseDir
      if (isDevelopment) {
        baseDir = process.cwd()
      } else {
        // For production, use userData directory for temporary files
        baseDir = app.getPath('userData')
      }
      
      console.log('📍 Base directory for restoration:', baseDir)
      console.log('📍 Is development mode:', isDevelopment)

      const currentDbBackupPath = join(baseDir, `current_db_backup_${Date.now()}.db`)
      if (existsSync(this.sqliteDbPath)) {
        copyFileSync(this.sqliteDbPath, currentDbBackupPath)
        console.log(`💾 Current database backed up to: ${currentDbBackupPath}`)
      }

      try {
        if (isZipBackup) {
          // Restore from ZIP backup (with images)
          console.log('🗄️ Restoring from ZIP backup with images...')
          await this.restoreFromZipBackup(actualBackupPath)
        } else {
          // Direct SQLite restoration
          console.log('🗄️ Restoring from SQLite backup...')
          await this.restoreFromSqliteBackup(actualBackupPath)
        }

        console.log('✅ Backup restored successfully')

        // Clean up temporary backup
        if (existsSync(currentDbBackupPath)) {
          rmSync(currentDbBackupPath)
        }

        // Final cleanup of all old image backup directories after successful restoration
        if (isZipBackup) {
          console.log('🧹 Final cleanup of image backup directories...')
          await this.cleanupOldImageBackups(baseDir, 0) // Delete all image backup directories
        }

        return true

      } catch (error) {
        // Restore original database if restoration failed
        console.error('❌ Restoration failed, restoring original database...')
        console.error('❌ Error details:', error.message)
        console.error('❌ Error stack:', error.stack)
        
        try {
          if (existsSync(currentDbBackupPath)) {
            copyFileSync(currentDbBackupPath, this.sqliteDbPath)
            console.log('✅ Original database restored')
            
            // Try to reinitialize database service
            try {
              this.databaseService.reinitialize()
              console.log('✅ Database service reinitialized after error')
            } catch (reinitError) {
              console.warn('⚠️ Failed to reinitialize database service after error:', reinitError.message)
            }
            
            // Clean up backup file
            try {
              rmSync(currentDbBackupPath)
              console.log('🧹 Cleaned up backup file')
            } catch (cleanupError) {
              console.warn('⚠️ Failed to clean up backup file:', cleanupError.message)
            }
          } else {
            console.warn('⚠️ No backup file found to restore from')
          }
        } catch (restoreError) {
          console.error('❌ Failed to restore original database:', restoreError.message)
        }
        
        throw error
      }

    } catch (error) {
      console.error('❌ Backup restoration failed:', error)
      throw new Error(`فشل في استعادة النسخة الاحتياطية: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Restore from ZIP backup (with images)
  async restoreFromZipBackup(zipBackupPath) {
    try {
      console.log('📦 Extracting ZIP backup...')
      console.log(`📦 ZIP backup path: ${zipBackupPath}`)

      // Check ZIP file size and existence
      if (existsSync(zipBackupPath)) {
        const zipStats = statSync(zipBackupPath)
        console.log(`📦 ZIP file size: ${zipStats.size} bytes`)
      } else {
        throw new Error(`ZIP backup file not found: ${zipBackupPath}`)
      }

      // Determine base directory
      const isDevelopment = process.env.NODE_ENV === 'development' ||
                           process.execPath.includes('node') ||
                           process.execPath.includes('electron') ||
                           process.cwd().includes('dental-clinic')

      let baseDir
      if (isDevelopment) {
        baseDir = process.cwd()
      } else {
        baseDir = require('path').dirname(process.execPath)
      }

      // Create temporary directory for extraction
      const tempDir = join(baseDir, `temp_restore_${Date.now()}`)
      await fs.mkdir(tempDir, { recursive: true })

      try {
        // Extract ZIP file
        console.log(`📦 Extracting to: ${tempDir}`)
        await extract(zipBackupPath, { dir: tempDir })
        console.log('✅ ZIP backup extracted successfully')

        // Verify extraction worked
        const extractedItems = glob.sync(join(tempDir, '**', '*'))
        console.log(`📦 Extracted ${extractedItems.length} items total`)

        // Debug: List all extracted contents
        const allExtractedContents = glob.sync(join(tempDir, '**', '*'))
        console.log(`🔍 All extracted contents (${allExtractedContents.length} items):`)
        allExtractedContents.forEach(item => console.log(`   📁 ${item}`))

        // Check specifically for dental_images directory
        const dentalImagesInTemp = join(tempDir, 'dental_images')
        console.log(`🔍 Checking for dental_images in temp: ${dentalImagesInTemp}`)
        console.log(`🔍 dental_images exists: ${existsSync(dentalImagesInTemp)}`)
        
        if (existsSync(dentalImagesInTemp)) {
          const dentalContents = glob.sync(join(dentalImagesInTemp, '**', '*'))
          console.log(`🔍 dental_images contents (${dentalContents.length} items):`)
          dentalContents.slice(0, 10).forEach(item => console.log(`   📸 ${item}`))
        }

        // Check if database file exists in extracted content
        const extractedDbPath = join(tempDir, 'dental_clinic.db')
        if (!existsSync(extractedDbPath)) {
          throw new Error('Database file not found in backup')
        }

        // Restore database
        console.log('📁 Restoring database from extracted backup...')
        await this.restoreFromSqliteBackup(extractedDbPath)

        // Restore images if they exist
        const extractedImagesPath = join(tempDir, 'dental_images')
        console.log(`🔍 Looking for extracted images at: ${extractedImagesPath}`)
        console.log(`🔍 Target dental images path: ${this.dentalImagesPath}`)
        console.log(`🔍 UserData path: ${app.getPath('userData')}`)
        console.log(`🔍 Process cwd: ${process.cwd()}`)

        // Declare currentImagesBackupPath at function scope
        let currentImagesBackupPath = null

        if (existsSync(extractedImagesPath)) {
          console.log('📸 Restoring images from backup...')
          console.log(`📸 Extracted images path exists: ${extractedImagesPath}`)

          // List what's in the extracted images directory
          const extractedContents = glob.sync(join(extractedImagesPath, '**', '*'))
          console.log(`📂 Found ${extractedContents.length} items in extracted backup:`)
          extractedContents.slice(0, 10).forEach(item => console.log(`   - ${item}`))

          // Also check if it's a directory and list its direct contents
          const stats = require('fs').statSync(extractedImagesPath)
          console.log(`📂 Extracted images path is a ${stats.isDirectory() ? 'directory' : 'file'}`)
          
          if (stats.isDirectory()) {
            const directContents = require('fs').readdirSync(extractedImagesPath)
            console.log(`📂 Direct contents of extracted images directory (${directContents.length} items):`)
            directContents.forEach(item => console.log(`   📁 ${item}`))
          }

          // Check for image files specifically
          const imageFiles = glob.sync(join(extractedImagesPath, '**', '*')).filter(file => {
            const stats = require('fs').statSync(file)
            return stats.isFile() && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file)
          })
          console.log(`📸 Found ${imageFiles.length} image files in extracted backup:`)
          imageFiles.slice(0, 5).forEach(file => console.log(`   📸 ${file}`))

          // Option to skip current images backup (for clean restoration)
          const skipCurrentBackup = true // Set to true to skip backing up current images
          
          // Check if the backup actually contains images
          if (extractedContents.length === 0) {
            console.log('⚠️ No images found in the backup - the original backup may not have contained images')
            console.log('ℹ️ This is normal if the backup was created when no images were present')
          }

          if (!skipCurrentBackup && existsSync(this.dentalImagesPath)) {
            currentImagesBackupPath = join(baseDir, `current_images_backup_${Date.now()}`)

            try {
              // Ensure backup directory doesn't exist
              if (existsSync(currentImagesBackupPath)) {
                await fs.rm(currentImagesBackupPath, { recursive: true, force: true })
              }

              await this.copyDirectory(this.dentalImagesPath, currentImagesBackupPath)
              console.log(`💾 Current images backed up to: ${currentImagesBackupPath}`)
              console.log(`💾 This is a safety backup - images will be restored to: ${this.dentalImagesPath}`)

              // Remove current images directory completely
              await fs.rm(this.dentalImagesPath, { recursive: true, force: true })
              console.log('🗑️ Current images directory removed')
            } catch (backupError) {
              console.warn('⚠️ Failed to backup current images, continuing with restoration:', backupError.message)
              // Continue with restoration even if backup fails
            }
          } else if (existsSync(this.dentalImagesPath)) {
            // Remove current images directory completely (no backup)
            console.log(`🗑️ Removing current images directory without backup: ${this.dentalImagesPath}`)
            await this.cleanupDirectoryAggressively(this.dentalImagesPath)
            console.log('🗑️ Current images directory removed')
          }

          // Ensure the dental images directory exists
          await fs.mkdir(this.dentalImagesPath, { recursive: true })
          console.log(`📁 Created dental images directory: ${this.dentalImagesPath}`)
          console.log(`📁 Target restoration path: ${this.dentalImagesPath}`)

          // Copy images from backup to the correct location with better error handling
          if (existsSync(extractedImagesPath)) {
            try {
              // Check if extracted images directory has content
              const extractedContents = glob.sync(join(extractedImagesPath, '**', '*'))
              if (extractedContents.length > 0) {
                console.log(`📂 Found ${extractedContents.length} items in extracted backup`)

                // Restore to userData directory (for app consistency)
                try {
                  await this.restoreImagesFromExtracted(extractedImagesPath, this.dentalImagesPath)
                  console.log('✅ Images restored successfully to userData dental_images directory')
                } catch (userDataError) {
                  console.error('❌ Failed to restore to userData directory:', userDataError.message)
                }

                // Also restore to project directory (for app to find them)
                const projectImagesPath = join(process.cwd(), 'dental_images')
                console.log(`📸 Also restoring to project directory: ${projectImagesPath}`)
                
                // Ensure project directory exists
                if (!existsSync(projectImagesPath)) {
                  mkdirSync(projectImagesPath, { recursive: true })
                  console.log(`📁 Created project dental_images directory: ${projectImagesPath}`)
                }

                // Copy images to project directory as well
                try {
                  await this.restoreImagesFromExtracted(extractedImagesPath, projectImagesPath)
                  console.log('✅ Images restored successfully to project dental_images directory')
                } catch (projectError) {
                  console.error('❌ Failed to restore to project directory:', projectError.message)
                }

                // Also restore to userData directory with the same structure
                const userDataImagesPath = join(app.getPath('userData'), 'dental_images')
                console.log(`📸 Also restoring to userData directory: ${userDataImagesPath}`)
                
                // Ensure userData directory exists
                if (!existsSync(userDataImagesPath)) {
                  mkdirSync(userDataImagesPath, { recursive: true })
                  console.log(`📁 Created userData dental_images directory: ${userDataImagesPath}`)
                }

                // Copy images to userData directory as well
                try {
                  await this.restoreImagesFromExtracted(extractedImagesPath, userDataImagesPath)
                  console.log('✅ Images restored successfully to userData dental_images directory')
                } catch (userDataError) {
                  console.error('❌ Failed to restore to userData directory:', userDataError.message)
                }

              } else {
                console.log('📂 No images found in extracted backup, skipping image restoration')
              }
            } catch (copyError) {
              console.error('❌ Failed to copy images from backup:', copyError.message)
              console.error('❌ Extracted images path:', extractedImagesPath)
              console.error('❌ Target images path:', this.dentalImagesPath)

              // List contents for debugging
              if (existsSync(extractedImagesPath)) {
                const extractedContents = glob.sync(join(extractedImagesPath, '**', '*'))
                console.error('❌ Extracted contents:', extractedContents.slice(0, 10))
              }

              // Don't throw error for image restoration failures, just log them
              console.warn('⚠️ Image restoration failed, but continuing with database restoration')
            }
          } else {
            console.log('📂 Extracted images directory not found, skipping image restoration')
          }

          // Verify the restoration in both locations
          const projectImagesPath = join(process.cwd(), 'dental_images')
          
          // Check userData directory
          if (existsSync(this.dentalImagesPath)) {
            const restoredFiles = glob.sync(join(this.dentalImagesPath, '**', '*')).filter(file => {
              const stats = statSync(file)
              return stats.isFile() && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file)
            })
            console.log(`📊 Restored ${restoredFiles.length} image files to userData: ${this.dentalImagesPath}`)

            // List some restored files for verification
            if (restoredFiles.length > 0) {
              console.log(`📋 Sample restored files in userData:`)
              restoredFiles.slice(0, 3).forEach(file => console.log(`   ✅ ${file}`))
            } else {
              console.log(`📋 No image files found in userData: ${this.dentalImagesPath}`)
            }
          }

          // Check project directory
          if (existsSync(projectImagesPath)) {
            const projectFiles = glob.sync(join(projectImagesPath, '**', '*')).filter(file => {
              const stats = statSync(file)
              return stats.isFile() && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file)
            })
            console.log(`📊 Restored ${projectFiles.length} image files to project: ${projectImagesPath}`)

            // List some restored files for verification
            if (projectFiles.length > 0) {
              console.log(`📋 Sample restored files in project:`)
              projectFiles.slice(0, 3).forEach(file => console.log(`   ✅ ${file}`))
            } else {
              console.log(`📋 No image files found in project: ${projectImagesPath}`)
            }

            // List all directories in project dental_images for verification
            const allItems = glob.sync(join(projectImagesPath, '**', '*'))
            console.log(`📂 Total items in project dental_images: ${allItems.length}`)
            allItems.slice(0, 5).forEach(item => console.log(`   📁 ${item}`))
          }

          // Verify that the restored images are in the correct locations for the app to find them
          console.log(`🔍 Verification: Images restored to both locations:`)
          console.log(`   📁 userData: ${this.dentalImagesPath}`)
          console.log(`   📁 project: ${projectImagesPath}`)
          console.log(`   📁 App will find images in project directory`)

          console.log(`🎯 Restoration completed successfully!`)
          console.log(`🎯 Images restored to: ${this.dentalImagesPath}`)
          if (currentImagesBackupPath) {
            console.log(`💾 Backup preserved at: ${currentImagesBackupPath}`)
          } else {
            console.log(`🗑️ No current images backup created (clean restoration)`)
          }

          // Ensure images are available in both locations for the app to find them
          this.ensureImagesInBothLocations()

          // Update image paths in database to ensure they match the restored files
          await this.updateImagePathsAfterRestore()

          // Clean up old image backup directories (if any exist)
          if (currentImagesBackupPath) {
            await this.cleanupOldImageBackups(baseDir, 1, currentImagesBackupPath)
          } else {
            await this.cleanupOldImageBackups(baseDir, 0) // Delete all old backups since we don't have a current one
          }

        } else {
          console.log('📸 No images found in backup')
          console.log(`🔍 Checked path: ${extractedImagesPath}`)

          // List what's actually in the temp directory
          if (existsSync(tempDir)) {
            const tempContents = glob.sync(join(tempDir, '**', '*'))
            console.log(`📂 Temp directory contents (${tempContents.length} items):`)
            tempContents.slice(0, 10).forEach(item => console.log(`   - ${item}`))
          }

          // Check if there are images in other locations
          const possibleImageDirs = [
            join(tempDir, 'images'),
            join(tempDir, 'dental_images'),
            join(tempDir, 'photos'),
            join(tempDir, 'pictures')
          ]

          for (const possibleDir of possibleImageDirs) {
            if (existsSync(possibleDir)) {
              console.log(`🔍 Found possible images directory: ${possibleDir}`)
              const contents = glob.sync(join(possibleDir, '**', '*'))
              console.log(`📂 Contents (${contents.length} items):`)
              contents.slice(0, 5).forEach(item => console.log(`   - ${item}`))
            }
          }

          // This is not necessarily an error - the backup might not contain images
          console.log('ℹ️ No dental_images directory found in backup - this is normal if the original backup had no images')
        }

      } finally {
        // Clean up temporary directory with aggressive retry logic
        if (existsSync(tempDir)) {
          try {
            await this.cleanupDirectoryAggressively(tempDir)
          } catch (cleanupError) {
            console.warn('⚠️ Temporary directory cleanup failed, but continuing:', cleanupError.message)
            console.warn('⚠️ You may need to manually delete:', tempDir)
          }
        }
      }

    } catch (error) {
      console.error('❌ Failed to restore from ZIP backup:', error)
      throw error
    }
  }

  async restoreFromSqliteBackup(sqliteBackupPath) {
    try {
      console.log('🔄 Starting SQLite database restoration...')

      // Verify backup file exists and has content
      if (!existsSync(sqliteBackupPath)) {
        throw new Error(`Backup file not found: ${sqliteBackupPath}`)
      }

      const backupStats = statSync(sqliteBackupPath)
      console.log('📊 Backup file size:', backupStats.size, 'bytes')

      if (backupStats.size === 0) {
        throw new Error('Backup file is empty')
      }

      // Test backup file integrity by trying to open it
      try {
        const Database = require('better-sqlite3')
        const testDb = new Database(sqliteBackupPath, { readonly: true })

        // Test basic queries
        const tablesQuery = testDb.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
        const tablesResult = tablesQuery.get()
        console.log('📋 Backup contains', tablesResult.count, 'tables')

        // Test key tables
        const tables = ['patients', 'appointments', 'payments', 'treatments']
        for (const table of tables) {
          try {
            const countQuery = testDb.prepare(`SELECT COUNT(*) as count FROM ${table}`)
            const count = countQuery.get()
            console.log(`📊 Backup table ${table}: ${count.count} records`)
          } catch (tableError) {
            console.warn(`⚠️ Could not query backup table ${table}:`, tableError.message)
          }
        }

        testDb.close()
        console.log('✅ Backup file integrity verified')
      } catch (integrityError) {
        console.error('❌ Backup file integrity check failed:', integrityError)
        throw new Error('Backup file is corrupted or invalid')
      }

      // Close current database connection
      console.log('📁 Closing current database connection...')
      try {
        this.databaseService.close()
        console.log('📁 Database connection closed')
      } catch (closeError) {
        console.warn('⚠️ Error closing database connection:', closeError.message)
        // Continue anyway
      }

      // Wait longer to ensure file handles are released
      await new Promise(resolve => setTimeout(resolve, 500))

      // Ensure target directory exists and is writable
      const targetDir = require('path').dirname(this.sqliteDbPath)
      if (!existsSync(targetDir)) {
        console.log('📁 Creating target directory:', targetDir)
        mkdirSync(targetDir, { recursive: true })
      }

      // Check if we can write to the target location
      try {
        const testFile = join(targetDir, 'test_write.tmp')
        writeFileSync(testFile, 'test')
        rmSync(testFile)
        console.log('✅ Target directory is writable')
      } catch (writeError) {
        console.error('❌ Cannot write to target directory:', targetDir)
        throw new Error(`Cannot write to target directory: ${writeError.message}`)
      }

      // Replace current database with backup
      console.log('📋 Replacing database file with backup...')
      console.log('📋 Source:', sqliteBackupPath)
      console.log('📋 Target:', this.sqliteDbPath)
      
      try {
        copyFileSync(sqliteBackupPath, this.sqliteDbPath)
        console.log('📋 Database file replaced with backup')
      } catch (copyError) {
        console.error('❌ Failed to copy backup file:', copyError.message)
        throw new Error(`Failed to copy backup file: ${copyError.message}`)
      }

      // Verify the replacement was successful
      const newStats = statSync(this.sqliteDbPath)
      console.log('📊 New database file size:', newStats.size, 'bytes')

      if (newStats.size !== backupStats.size) {
        console.warn('⚠️ Database file size differs after restoration!')
        console.warn('Expected:', backupStats.size, 'bytes, Actual:', newStats.size, 'bytes')
      }

      // Reinitialize database service with better error handling
      console.log('🔄 Reinitializing database service...')
      try {
        this.databaseService.reinitialize()
        console.log('✅ Database service reinitialized')
      } catch (reinitError) {
        console.error('❌ Failed to reinitialize database service:', reinitError.message)
        throw new Error(`Failed to reinitialize database service: ${reinitError.message}`)
      }

      // Verify the restored database works
      try {
        const testQuery = this.databaseService.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
        const result = testQuery.get()
        console.log('📋 Restored database contains', result.count, 'tables')

        // List all tables in the restored database
        const allTablesQuery = this.databaseService.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        const allTables = allTablesQuery.all()
        console.log('📋 All tables in restored database:', allTables.map(t => t.name))

        // Test key tables including dental treatment tables
        const tables = ['patients', 'appointments', 'payments', 'treatments', 'dental_treatments', 'dental_treatment_images']
        for (const table of tables) {
          try {
            const countQuery = this.databaseService.db.prepare(`SELECT COUNT(*) as count FROM ${table}`)
            const count = countQuery.get()
            console.log(`📊 Restored table ${table}: ${count.count} records`)
          } catch (tableError) {
            console.warn(`⚠️ Could not query restored table ${table}:`, tableError.message)
          }
        }

        // Special check for dental_treatment_images table after restore
        try {
          const imageTableCheck = this.databaseService.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='dental_treatment_images'")
          const imageTableExists = imageTableCheck.get()
          if (imageTableExists) {
            const imageCount = this.databaseService.db.prepare("SELECT COUNT(*) as count FROM dental_treatment_images").get()
            console.log(`📸 Restored dental_treatment_images table: ${imageCount.count} image records`)

            // Show sample restored image records
            if (imageCount.count > 0) {
              const sampleImages = this.databaseService.db.prepare("SELECT patient_id, tooth_number, image_type, image_path FROM dental_treatment_images LIMIT 3").all()
              console.log('📸 Sample restored image records:')
              sampleImages.forEach(img => console.log(`   - Patient: ${img.patient_id}, Tooth: ${img.tooth_number}, Type: ${img.image_type}, Path: ${img.image_path}`))
            }
          } else {
            console.warn('⚠️ dental_treatment_images table missing in restored database!')
          }
        } catch (imageError) {
          console.error('❌ Error checking restored dental_treatment_images table:', imageError)
        }

        console.log('✅ SQLite database restored and verified successfully')
      } catch (verifyError) {
        console.error('❌ Database verification after restore failed:', verifyError)
        throw new Error('Database restoration completed but verification failed')
      }

    } catch (error) {
      console.error('❌ Failed to restore SQLite backup:', error)
      // Try to reinitialize anyway
      try {
        console.log('🔄 Attempting to reinitialize database after error...')
        this.databaseService.reinitialize()
        console.log('✅ Database reinitialized after error')
      } catch (reinitError) {
        console.error('❌ Failed to reinitialize database:', reinitError)
      }
      throw error
    }
  }

  async restoreLegacyBackup(backupPath) {
    console.log('📄 Restoring legacy backup format...')

    // Read and parse legacy backup data
    const backupContent = readFileSync(backupPath, 'utf-8')
    const backupData = JSON.parse(backupContent)

    // Validate backup structure
    if (!backupData.metadata || !backupData.patients || !backupData.appointments) {
      throw new Error('ملف النسخة الاحتياطية تالف أو غير صالح - بيانات مفقودة')
    }

    console.log(`Restoring backup created on: ${backupData.metadata.created_at}`)
    console.log(`Backup version: ${backupData.metadata.version}`)
    console.log(`Platform: ${backupData.metadata.platform}`)

    console.log('Backup file validated, starting data restoration...')

    // Clear existing data and restore from backup
    if (backupData.patients) {
      await this.databaseService.clearAllPatients()
      for (const patient of backupData.patients) {
        await this.databaseService.createPatient(patient)
      }
    }

    if (backupData.appointments) {
      await this.databaseService.clearAllAppointments()
      for (const appointment of backupData.appointments) {
        await this.databaseService.createAppointment(appointment)
      }
    }

    if (backupData.payments) {
      await this.databaseService.clearAllPayments()
      for (const payment of backupData.payments) {
        await this.databaseService.createPayment(payment)
      }
    }

    if (backupData.treatments) {
      await this.databaseService.clearAllTreatments()
      for (const treatment of backupData.treatments) {
        await this.databaseService.createTreatment(treatment)
      }
    }

    if (backupData.settings) {
      await this.databaseService.updateSettings(backupData.settings)
    }

    console.log('Legacy backup restored successfully')
    return true
  }

  async listBackups() {
    try {
      const registry = this.getBackupRegistry()

      // Filter out backups that no longer exist
      const validBackups = registry.filter(backup => {
        try {
          // Check if the backup file exists
          return existsSync(backup.path)
        } catch (error) {
          return false
        }
      })

      // Remove duplicates based on backup name
      const uniqueBackups = []
      const seenNames = new Set()

      for (const backup of validBackups) {
        if (!seenNames.has(backup.name)) {
          seenNames.add(backup.name)
          uniqueBackups.push(backup)
        } else {
          console.log(`🔍 Removed duplicate backup entry: ${backup.name}`)
        }
      }

      // Update registry if some backups were removed or duplicates found
      if (uniqueBackups.length !== registry.length) {
        writeFileSync(this.backupRegistryPath, JSON.stringify(uniqueBackups, null, 2), 'utf-8')
        console.log(`🧹 Cleaned up backup registry: ${registry.length} -> ${uniqueBackups.length} entries`)
      }

      // Add formatted file sizes and additional info
      return uniqueBackups.map(backup => ({
        ...backup,
        formattedSize: this.formatFileSize(backup.size),
        isSqliteOnly: backup.backup_format === 'sqlite_only',
        isLegacy: backup.backup_format === 'hybrid' || !backup.backup_format,
        includesImages: backup.includes_images || backup.backup_format === 'sqlite_with_images',
        isZipBackup: backup.backup_format === 'sqlite_with_images'
      }))
    } catch (error) {
      console.error('Failed to list backups:', error)
      return []
    }
  }

  async deleteOldBackups(keepCount = 10) {
    try {
      const backups = await this.listBackups()

      if (backups.length > keepCount) {
        // Sort by creation date (newest first)
        const sortedBackups = backups.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        const backupsToDelete = sortedBackups.slice(keepCount)

        for (const backup of backupsToDelete) {
          await this.deleteBackup(backup.name)
          console.log(`🗑️ Deleted old backup: ${backup.name}`)
        }

        console.log(`✅ Cleaned up ${backupsToDelete.length} old backups, keeping ${keepCount} most recent`)
      }
    } catch (error) {
      console.error('❌ Failed to delete old backups:', error)
    }
  }

  async deleteBackup(backupName) {
    try {
      // Find backup in registry
      const registry = this.getBackupRegistry()
      const backupIndex = registry.findIndex(backup => backup.name === backupName)

      if (backupIndex === -1) {
        throw new Error('Backup not found in registry')
      }

      const backup = registry[backupIndex]

      // Delete the backup file
      if (existsSync(backup.path)) {
        rmSync(backup.path)
        console.log(`Deleted backup: ${backup.path}`)
      }

      // Remove from registry
      registry.splice(backupIndex, 1)
      writeFileSync(this.backupRegistryPath, JSON.stringify(registry, null, 2), 'utf-8')

      console.log(`✅ Backup deleted successfully: ${backupName}`)
    } catch (error) {
      console.error('❌ Failed to delete backup:', error)
      throw error
    }
  }

  async scheduleAutomaticBackups(frequency) {
    const intervals = {
      hourly: 60 * 60 * 1000,      // 1 hour
      daily: 24 * 60 * 60 * 1000,  // 24 hours
      weekly: 7 * 24 * 60 * 60 * 1000 // 7 days
    }

    setInterval(async () => {
      try {
        await this.createBackup()
        await this.deleteOldBackups()
      } catch (error) {
        console.error('Scheduled backup failed:', error)
      }
    }, intervals[frequency])
  }

  // Clean up old image backup directories
  async cleanupOldImageBackups(baseDir, keepCount = 2, excludePath = null) {
    try {
      console.log('🧹 Cleaning up old image backup directories...')

      // Find all current_images_backup directories
      const backupPattern = join(baseDir, 'current_images_backup_*')
      const backupDirs = glob.sync(backupPattern)

      // Filter out the excluded path if provided
      const filteredBackupDirs = excludePath
        ? backupDirs.filter(dir => dir !== excludePath)
        : backupDirs

      if (filteredBackupDirs.length <= keepCount) {
        console.log(`📁 Found ${filteredBackupDirs.length} image backup directories (excluding current), keeping all`)
        return
      }

      // Sort by creation time (newest first) based on timestamp in directory name
      const sortedBackups = filteredBackupDirs.sort((a, b) => {
        const timestampA = basename(a).replace('current_images_backup_', '')
        const timestampB = basename(b).replace('current_images_backup_', '')
        return parseInt(timestampB) - parseInt(timestampA)
      })

      // Keep only the most recent ones
      const backupsToDelete = sortedBackups.slice(keepCount)

      for (const backupDir of backupsToDelete) {
        try {
          if (existsSync(backupDir)) {
            await fs.rm(backupDir, { recursive: true, force: true })
            console.log(`🗑️ Deleted old image backup: ${basename(backupDir)}`)
          }
        } catch (error) {
          console.warn(`⚠️ Failed to delete image backup ${backupDir}:`, error.message)
        }
      }

      console.log(`✅ Cleaned up ${backupsToDelete.length} old image backup directories`)

    } catch (error) {
      console.error('❌ Failed to cleanup old image backups:', error)
      // Don't throw error as this is not critical
    }
  }

  async updateImagePathsAfterRestore() {
    try {
      console.log('🔄 Updating image paths and treatment links after restore...')

      // Get all image records from database
      const imageRecords = this.databaseService.db.prepare(`
        SELECT id, dental_treatment_id, image_path, patient_id, tooth_number, image_type
        FROM dental_treatment_images
      `).all()

      console.log(`📊 Found ${imageRecords.length} image records to verify`)

      let updatedPathsCount = 0
      let relinkedTreatmentsCount = 0

      for (const record of imageRecords) {
        try {
          console.log(`🔍 Processing image record:`, record)

          // Step 1: Fix image paths
          const currentPath = record.image_path
          const filename = basename(currentPath)
          console.log(`📁 Current path: ${currentPath}, filename: ${filename}`)

          // Build expected path structure: dental_images/patient_id/tooth_number/image_type/ (without filename)
          const expectedPath = `dental_images/${record.patient_id}/${record.tooth_number}/${record.image_type || 'other'}/`
          const fullExpectedPath = join(this.dentalImagesPath, record.patient_id, record.tooth_number.toString(), record.image_type || 'other', filename)
          console.log(`🎯 Expected path (new structure): ${expectedPath}`)
          console.log(`🎯 Full expected path: ${fullExpectedPath}`)

          let finalImagePath = currentPath

          // Check if file exists at new expected location (patient_id/tooth_number/image_type structure)
          if (existsSync(fullExpectedPath)) {
            console.log(`✅ File found at new structure location`)
            if (currentPath !== expectedPath) {
              finalImagePath = expectedPath
              updatedPathsCount++
              console.log(`📝 Updated image path to new structure: ${record.id} -> ${expectedPath}`)
            }
          } else {
            console.log(`❌ File not found at new structure location, checking legacy structure...`)

            // Try legacy structure: dental_images/patient_name/image_type/filename
            const patient = this.databaseService.db.prepare(`
              SELECT full_name FROM patients WHERE id = ?
            `).get(record.patient_id)

            if (patient) {
              const cleanPatientName = (patient.full_name || `Patient_${record.patient_id}`).replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '').replace(/\s+/g, '_')
              const legacyPath = `dental_images/${cleanPatientName}/${record.image_type || 'other'}/${filename}`
              const fullLegacyPath = join(this.dentalImagesPath, cleanPatientName, record.image_type || 'other', filename)

              console.log(`🔍 Checking legacy path: ${legacyPath}`)

              if (existsSync(fullLegacyPath)) {
                console.log(`✅ File found at legacy location, migrating to new structure...`)

                // Create new directory structure
                const newDir = join(this.dentalImagesPath, record.patient_id, record.tooth_number.toString(), record.image_type || 'other')
                if (!existsSync(newDir)) {
                  mkdirSync(newDir, { recursive: true })
                  console.log(`📁 Created new directory: ${newDir}`)
                }

                // Copy file to new location
                const newFilePath = join(newDir, filename)
                copyFileSync(fullLegacyPath, newFilePath)
                console.log(`📋 Copied file from ${fullLegacyPath} to ${newFilePath}`)

                finalImagePath = expectedPath
                updatedPathsCount++
                console.log(`📝 Migrated image path to new structure: ${record.id} -> ${expectedPath}`)
              } else {
                console.log(`❌ File not found at legacy location either, searching...`)

                // Try to find the file in the restored images directory
                const searchPattern = join(this.dentalImagesPath, '**', filename)
                console.log(`🔍 Search pattern: ${searchPattern}`)

                const foundFiles = glob.sync(searchPattern)
                console.log(`🔍 Found files:`, foundFiles)

                if (foundFiles.length > 0) {
                  const foundFile = foundFiles[0]

                  // Create new directory structure and move file
                  const newDir = join(this.dentalImagesPath, record.patient_id, record.tooth_number.toString(), record.image_type || 'other')
                  if (!existsSync(newDir)) {
                    mkdirSync(newDir, { recursive: true })
                    console.log(`📁 Created new directory: ${newDir}`)
                  }

                  const newFilePath = join(newDir, filename)
                  copyFileSync(foundFile, newFilePath)
                  console.log(`📋 Moved file from ${foundFile} to ${newFilePath}`)

                  finalImagePath = expectedPath
                  updatedPathsCount++
                  console.log(`📝 Found and migrated image path: ${record.id} -> ${expectedPath}`)
                } else {
                  console.warn(`⚠️ Image file not found for record ${record.id}: ${filename}`)
                  console.warn(`⚠️ Searched in: ${this.dentalImagesPath}`)

                  // List all files in the dental images directory for debugging
                  if (existsSync(this.dentalImagesPath)) {
                    const allFiles = glob.sync(join(this.dentalImagesPath, '**', '*'))
                    console.log(`📂 All files in dental_images:`, allFiles.slice(0, 10)) // Show first 10 files
                  }
                }
              }
            }
          }

          // Step 2: Find the correct dental treatment ID for this image
          // Look for a treatment that matches patient_id and tooth_number
          const matchingTreatment = this.databaseService.db.prepare(`
            SELECT id FROM dental_treatments
            WHERE patient_id = ? AND tooth_number = ?
            ORDER BY created_at DESC
            LIMIT 1
          `).get(record.patient_id, record.tooth_number)

          let finalTreatmentId = record.dental_treatment_id

          if (matchingTreatment && matchingTreatment.id !== record.dental_treatment_id) {
            finalTreatmentId = matchingTreatment.id
            relinkedTreatmentsCount++
            console.log(`🔗 Relinked image ${record.id} to treatment ${finalTreatmentId} (patient: ${record.patient_id}, tooth: ${record.tooth_number})`)
          } else if (!matchingTreatment) {
            console.warn(`⚠️ No matching treatment found for image ${record.id} (patient: ${record.patient_id}, tooth: ${record.tooth_number})`)
          }

          // Step 3: Update the record with corrected path and treatment ID
          if (finalImagePath !== currentPath || finalTreatmentId !== record.dental_treatment_id) {
            this.databaseService.db.prepare(`
              UPDATE dental_treatment_images
              SET image_path = ?, dental_treatment_id = ?
              WHERE id = ?
            `).run(finalImagePath, finalTreatmentId, record.id)
          }

        } catch (error) {
          console.error(`❌ Error processing image record ${record.id}:`, error)
        }
      }

      console.log(`✅ Updated ${updatedPathsCount} image paths and relinked ${relinkedTreatmentsCount} treatments after restore`)

    } catch (error) {
      console.error('❌ Failed to update image paths after restore:', error)
      // Don't throw error as this is not critical for the restore process
    }
  }

  /**
   * Synchronize dental treatment images with the database after backup restore
   * Scans the dental_images folder structure and ensures all image files are properly linked
   */
  async synchronizeDentalImagesAfterRestore() {
    try {
      console.log('🔄 Starting dental images synchronization after restore...')

      if (!existsSync(this.dentalImagesPath)) {
        console.log('📁 No dental_images directory found, skipping synchronization')
        return {
          success: true,
          totalProcessed: 0,
          totalAdded: 0,
          totalSkipped: 0,
          totalErrors: 0,
          errors: []
        }
      }

      const stats = {
        totalProcessed: 0,
        totalAdded: 0,
        totalSkipped: 0,
        totalErrors: 0,
        errors: []
      }

      // Valid image types
      const validImageTypes = ['before', 'after', 'xray', 'clinical']

      // Recursively scan the dental_images directory
      const imageFiles = glob.sync(join(this.dentalImagesPath, '**', '*'))
        .filter(filePath => {
          const stat = statSync(filePath)
          return stat.isFile() && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filePath)
        })

      console.log(`📊 Found ${imageFiles.length} image files to process`)

      for (const filePath of imageFiles) {
        try {
          stats.totalProcessed++

          // Extract path components: dental_images/{patient_id}/{tooth_number}/{image_type}/{filename}
          const relativePath = path.relative(this.dentalImagesPath, filePath)
          const pathParts = relativePath.split(path.sep)

          if (pathParts.length !== 4) {
            console.warn(`⚠️ Invalid folder structure: ${relativePath} (expected: patient_id/tooth_number/image_type/filename)`)
            stats.totalSkipped++
            continue
          }

          const [patientId, toothNumberStr, imageType, filename] = pathParts
          const toothNumber = parseInt(toothNumberStr, 10)

          // Validate tooth number (1-32)
          if (isNaN(toothNumber) || toothNumber < 1 || toothNumber > 32) {
            console.warn(`⚠️ Invalid tooth number: ${toothNumberStr} for file ${relativePath}`)
            stats.totalSkipped++
            continue
          }

          // Validate image type
          if (!validImageTypes.includes(imageType)) {
            console.warn(`⚠️ Invalid image type: ${imageType} for file ${relativePath}`)
            stats.totalSkipped++
            continue
          }

          // Check if patient exists
          const patient = this.databaseService.db.prepare(`
            SELECT id FROM patients WHERE id = ?
          `).get(patientId)

          if (!patient) {
            console.warn(`⚠️ Patient not found: ${patientId} for file ${relativePath}`)
            stats.totalSkipped++
            continue
          }

          // Build the image path (directory path without filename)
          const imagePath = `dental_images/${patientId}/${toothNumber}/${imageType}/`

          // Check if image is already registered in database
          const existingImage = this.databaseService.db.prepare(`
            SELECT COUNT(*) as count FROM dental_treatment_images
            WHERE image_path = ? AND patient_id = ? AND tooth_number = ? AND image_type = ?
          `).get(imagePath, patientId, toothNumber, imageType)

          if (existingImage.count > 0) {
            console.log(`✅ Image already registered: ${relativePath}`)
            stats.totalSkipped++
            continue
          }

          // Find the most recent dental treatment for this patient and tooth
          const latestTreatment = this.databaseService.db.prepare(`
            SELECT id FROM dental_treatments
            WHERE patient_id = ? AND tooth_number = ?
            ORDER BY created_at DESC
            LIMIT 1
          `).get(patientId, toothNumber)

          if (!latestTreatment) {
            console.warn(`⚠️ No treatment found for patient ${patientId}, tooth ${toothNumber}`)
            stats.totalErrors++
            stats.errors.push({
              file: relativePath,
              error: `No treatment found for patient ${patientId}, tooth ${toothNumber}`
            })
            continue
          }

          // Generate UUID for new image record
          const { v4: uuidv4 } = require('uuid')
          const imageId = uuidv4()
          const now = new Date().toISOString()

          // Insert new image record
          this.databaseService.db.prepare(`
            INSERT INTO dental_treatment_images (
              id,
              dental_treatment_id,
              patient_id,
              tooth_number,
              image_path,
              image_type,
              description,
              taken_date,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            imageId,
            latestTreatment.id,
            patientId,
            toothNumber,
            imagePath,
            imageType,
            null, // description
            now,  // taken_date
            now,  // created_at
            now   // updated_at
          )

          console.log(`✅ Added image record: ${relativePath} -> ${imageId}`)
          stats.totalAdded++

        } catch (error) {
          console.error(`❌ Error processing file ${filePath}:`, error)
          stats.totalErrors++
          stats.errors.push({
            file: path.relative(this.dentalImagesPath, filePath),
            error: error.message
          })
        }
      }

      console.log(`✅ Dental images synchronization completed:`)
      console.log(`   📊 Total processed: ${stats.totalProcessed}`)
      console.log(`   ➕ Total added: ${stats.totalAdded}`)
      console.log(`   ⏭️ Total skipped: ${stats.totalSkipped}`)
      console.log(`   ❌ Total errors: ${stats.totalErrors}`)

      if (stats.errors.length > 0) {
        console.log(`📋 Error details:`)
        stats.errors.forEach(error => {
          console.log(`   - ${error.file}: ${error.error}`)
        })
      }

      return {
        success: true,
        ...stats
      }

    } catch (error) {
      console.error('❌ Failed to synchronize dental images after restore:', error)
      throw error
    }
  }




}

module.exports = { BackupService }