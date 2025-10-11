const { app, dialog } = require('electron')
const { join, basename, dirname } = require('path')
const path = require('path')
const { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, rmSync, readFileSync, writeFileSync, lstatSync } = require('fs')
const fs = require('fs').promises
const archiver = require('archiver')
const extract = require('extract-zip')
const glob = require('glob')

class ProductionBackupService {
  constructor(databaseService) {
    this.databaseService = databaseService
    this.initializePaths()
    this.ensureDirectories()
  }

  initializePaths() {
    try {
      // Get userData directory - this is always writable in production
      this.userDataPath = app.getPath('userData')
      console.log('📍 UserData path:', this.userDataPath)

      // Database path
      this.databasePath = join(this.userDataPath, 'dental_clinic.db')
      console.log('📍 Database path:', this.databasePath)

      // Backup directory
      this.backupDir = join(this.userDataPath, 'backups')
      console.log('📍 Backup directory:', this.backupDir)

      // Backup registry
      this.registryPath = join(this.userDataPath, 'backup_registry.json')
      console.log('📍 Registry path:', this.registryPath)

      // Images directory
      this.imagesDir = join(this.userDataPath, 'dental_images')
      console.log('📍 Images directory:', this.imagesDir)

      // Temporary directory for operations
      this.tempDir = join(this.userDataPath, 'temp')
      console.log('📍 Temp directory:', this.tempDir)

    } catch (error) {
      console.error('❌ Failed to initialize paths:', error)
      throw new Error('Failed to initialize backup service paths')
    }
  }

  ensureDirectories() {
    try {
      // Create all necessary directories
      const directories = [
        this.backupDir,
        this.imagesDir,
        this.tempDir
      ]

      for (const dir of directories) {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true })
          console.log('📁 Created directory:', dir)
        }
      }

      // Create registry file if it doesn't exist
      if (!existsSync(this.registryPath)) {
        writeFileSync(this.registryPath, JSON.stringify([], null, 2), 'utf-8')
        console.log('📄 Created backup registry file')
      }

      // Test write permissions
      this.testWritePermissions()

    } catch (error) {
      console.error('❌ Failed to ensure directories:', error)
      throw error
    }
  }

  testWritePermissions() {
    try {
      const testFile = join(this.userDataPath, 'test_write.tmp')
      writeFileSync(testFile, 'test')
      rmSync(testFile)
      console.log('✅ Write permissions verified')
    } catch (error) {
      console.error('❌ Write permission test failed:', error.message)
      throw new Error('No write permissions in userData directory')
    }
  }

  // Create backup with or without images
  async createBackup(options = {}) {
    const {
      includeImages = false,
      customPath = null,
      description = ''
    } = options

    try {
      console.log('🚀 Starting production backup creation...')
      console.log('📸 Include images:', includeImages)
      console.log('📍 Custom path:', customPath)

      // Generate backup name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupName = `backup_${timestamp}`
      
      // Determine backup path
      let backupPath
      if (customPath) {
        // If custom path is provided, use it directly
        backupPath = customPath
        console.log('📍 Using custom path:', backupPath)
      } else {
        const extension = includeImages ? '.zip' : '.db'
        backupPath = join(this.backupDir, `${backupName}${extension}`)
        console.log('📍 Using default path:', backupPath)
      }

      console.log('📍 Target backup path:', backupPath)

      // Verify database exists
      if (!existsSync(this.databasePath)) {
        throw new Error('Database file not found')
      }

      // Check database size
      const dbStats = statSync(this.databasePath)
      console.log('📊 Database size:', dbStats.size, 'bytes')

      if (dbStats.size === 0) {
        throw new Error('Database file is empty')
      }

      // Create backup
      if (includeImages) {
        await this.createBackupWithImages(backupPath)
      } else {
        await this.createDatabaseBackup(backupPath)
      }

      // Verify backup
      if (!existsSync(backupPath)) {
        throw new Error('Backup file was not created')
      }

      const backupStats = statSync(backupPath)
      console.log('📊 Backup size:', backupStats.size, 'bytes')

      // Add to registry
      const backupInfo = {
        id: Date.now().toString(),
        name: basename(backupPath, includeImages ? '.zip' : '.db'),
        path: backupPath,
        size: backupStats.size,
        created_at: new Date().toISOString(),
        type: includeImages ? 'with_images' : 'database_only',
        description: description,
        version: '1.0.0'
      }

      this.addToRegistry(backupInfo)

      console.log('✅ Backup created successfully:', backupPath)
      return {
        success: true,
        path: backupPath,
        size: backupStats.size,
        type: includeImages ? 'with_images' : 'database_only'
      }

    } catch (error) {
      console.error('❌ Backup creation failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Create database-only backup
  async createDatabaseBackup(backupPath) {
    try {
      console.log('📋 Creating database backup...')

      // Force WAL checkpoint
      if (this.databaseService && this.databaseService.db) {
        try {
          this.databaseService.db.pragma('wal_checkpoint(TRUNCATE)')
          console.log('✅ WAL checkpoint completed')
        } catch (checkpointError) {
          console.warn('⚠️ WAL checkpoint failed:', checkpointError.message)
        }
      }

      // Wait for file handles to be released
      await new Promise(resolve => setTimeout(resolve, 200))

      // Ensure target directory exists
      const targetDir = dirname(backupPath)
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true })
        console.log('📁 Created target directory:', targetDir)
      }

      // Copy database file
      copyFileSync(this.databasePath, backupPath)
      console.log('✅ Database backup created at:', backupPath)

      // Verify backup
      await this.verifyBackup(backupPath)

    } catch (error) {
      console.error('❌ Database backup failed:', error)
      throw error
    }
  }

  // Create backup with images
  async createBackupWithImages(backupPath) {
    try {
      console.log('📦 Creating backup with images...')

      // Create temporary database backup
      const tempDbPath = join(this.tempDir, `temp_db_${Date.now()}.db`)
      await this.createDatabaseBackup(tempDbPath)

      // Create ZIP archive
      const output = require('fs').createWriteStream(backupPath)
      const archive = archiver('zip', { zlib: { level: 9 } })

      return new Promise((resolve, reject) => {
        output.on('close', () => {
          console.log('✅ ZIP backup created:', archive.pointer(), 'bytes')
          // Clean up temp file
          if (existsSync(tempDbPath)) {
            rmSync(tempDbPath)
          }
          resolve()
        })

        archive.on('error', (err) => {
          console.error('❌ Archive error:', err)
          reject(err)
        })

        archive.pipe(output)

        // Add database
        archive.file(tempDbPath, { name: 'dental_clinic.db' })

        // Add images if they exist
        if (existsSync(this.imagesDir)) {
          const imageFiles = glob.sync(join(this.imagesDir, '**', '*')).filter(file => {
            const stats = statSync(file)
            return stats.isFile() && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file)
          })

          if (imageFiles.length > 0) {
            console.log('📸 Adding', imageFiles.length, 'images to backup')
            archive.directory(this.imagesDir, 'dental_images')
          } else {
            console.log('📸 No images found to backup')
          }
        }

        archive.finalize()
      })

    } catch (error) {
      console.error('❌ Backup with images failed:', error)
      throw error
    }
  }

  // Verify backup integrity
  async verifyBackup(backupPath) {
    try {
      console.log('🔍 Verifying backup integrity...')

      const Database = require('better-sqlite3')
      const testDb = new Database(backupPath, { readonly: true })

      // Test basic structure
      const tablesQuery = testDb.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
      const tablesResult = tablesQuery.get()
      console.log('📋 Backup contains', tablesResult.count, 'tables')

      if (tablesResult.count === 0) {
        throw new Error('Backup contains no tables')
      }

      // Test key tables
      const keyTables = ['patients', 'appointments', 'payments', 'treatments']
      let totalRecords = 0

      for (const table of keyTables) {
        try {
          const countQuery = testDb.prepare(`SELECT COUNT(*) as count FROM ${table}`)
          const count = countQuery.get()
          console.log(`📊 Table ${table}: ${count.count} records`)
          totalRecords += count.count
        } catch (tableError) {
          console.log(`📋 Table ${table} not found (normal)`)
        }
      }

      console.log('📊 Total records:', totalRecords)

      // Test integrity
      const integrityQuery = testDb.prepare("PRAGMA integrity_check")
      const integrityResult = integrityQuery.get()

      if (integrityResult && integrityResult.integrity_check !== 'ok') {
        throw new Error(`Database integrity check failed: ${integrityResult.integrity_check}`)
      }

      testDb.close()
      console.log('✅ Backup verification passed')

    } catch (error) {
      console.error('❌ Backup verification failed:', error)
      throw error
    }
  }

  // Restore backup
  async restoreBackup(backupPath) {
    try {
      console.log('🔄 Starting backup restoration...')
      console.log('📍 Backup path:', backupPath)

      // Verify backup exists
      if (!existsSync(backupPath)) {
        throw new Error('Backup file not found')
      }

      // Determine backup type
      const isZipBackup = backupPath.endsWith('.zip')
      console.log('📦 Backup type:', isZipBackup ? 'ZIP (with images)' : 'Database only')

      // Create backup of current database
      const currentBackupPath = join(this.tempDir, `current_backup_${Date.now()}.db`)
      if (existsSync(this.databasePath)) {
        copyFileSync(this.databasePath, currentBackupPath)
        console.log('💾 Current database backed up to:', currentBackupPath)
      }

      try {
        if (isZipBackup) {
          await this.restoreFromZip(backupPath)
        } else {
          await this.restoreFromDatabase(backupPath)
        }

        console.log('✅ Backup restored successfully')

        // Clean up current backup
        if (existsSync(currentBackupPath)) {
          rmSync(currentBackupPath)
        }

        return { success: true }

      } catch (error) {
        // Restore original database
        console.error('❌ Restoration failed, restoring original database...')
        if (existsSync(currentBackupPath)) {
          copyFileSync(currentBackupPath, this.databasePath)
          console.log('✅ Original database restored')
          rmSync(currentBackupPath)
        }
        throw error
      }

    } catch (error) {
      console.error('❌ Backup restoration failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Restore from database file
  async restoreFromDatabase(backupPath) {
    try {
      console.log('📋 Restoring from database file...')

      // Verify backup
      await this.verifyBackup(backupPath)

      // Close current database
      if (this.databaseService && this.databaseService.close) {
        this.databaseService.close()
        console.log('📁 Database connection closed')
      }

      // Wait for file handles to be released
      await new Promise(resolve => setTimeout(resolve, 500))

      // Replace database
      copyFileSync(backupPath, this.databasePath)
      console.log('📋 Database replaced')

      // Reinitialize database service
      if (this.databaseService && this.databaseService.reinitialize) {
        this.databaseService.reinitialize()
        console.log('✅ Database service reinitialized')
      }

    } catch (error) {
      console.error('❌ Database restoration failed:', error)
      throw error
    }
  }

  // Restore from ZIP file
  async restoreFromZip(backupPath) {
    try {
      console.log('📦 Restoring from ZIP file...')

      // Create temp directory for extraction
      const extractDir = join(this.tempDir, `extract_${Date.now()}`)
      mkdirSync(extractDir, { recursive: true })

      try {
        // Extract ZIP
        await extract(backupPath, { dir: extractDir })
        console.log('📦 ZIP extracted to:', extractDir)

        // Find database file
        const dbFile = join(extractDir, 'dental_clinic.db')
        if (!existsSync(dbFile)) {
          throw new Error('Database file not found in ZIP')
        }

        // Restore database
        await this.restoreFromDatabase(dbFile)

        // Restore images if they exist
        const imagesDir = join(extractDir, 'dental_images')
        if (existsSync(imagesDir)) {
          console.log('📸 Restoring images...')
          
          // Clear current images
          if (existsSync(this.imagesDir)) {
            await fs.rm(this.imagesDir, { recursive: true, force: true })
          }
          
          // Copy images
          await this.copyDirectory(imagesDir, this.imagesDir)
          console.log('✅ Images restored')
        }

      } finally {
        // Clean up temp directory
        if (existsSync(extractDir)) {
          await fs.rm(extractDir, { recursive: true, force: true })
        }
      }

    } catch (error) {
      console.error('❌ ZIP restoration failed:', error)
      throw error
    }
  }

  // Copy directory recursively
  async copyDirectory(source, destination) {
    if (!existsSync(source)) return

    if (!existsSync(destination)) {
      mkdirSync(destination, { recursive: true })
    }

    const items = await fs.readdir(source)

    for (const item of items) {
      const sourcePath = join(source, item)
      const destPath = join(destination, item)
      const stats = await fs.lstat(sourcePath)

      if (stats.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath)
      } else {
        await fs.copyFile(sourcePath, destPath)
      }
    }
  }

  // List backups
  async listBackups() {
    try {
      const registry = this.getRegistry()
      return registry.map(backup => ({
        ...backup,
        formattedSize: this.formatFileSize(backup.size),
        createdDate: new Date(backup.created_at).toLocaleDateString(),
        createdTime: new Date(backup.created_at).toLocaleTimeString()
      }))
    } catch (error) {
      console.error('❌ Failed to list backups:', error)
      return []
    }
  }

  // Delete backup
  async deleteBackup(backupId) {
    try {
      const registry = this.getRegistry()
      const backupIndex = registry.findIndex(backup => backup.id === backupId)

      if (backupIndex === -1) {
        throw new Error('Backup not found')
      }

      const backup = registry[backupIndex]

      // Delete file
      if (existsSync(backup.path)) {
        rmSync(backup.path)
        console.log('🗑️ Backup file deleted:', backup.path)
      }

      // Remove from registry
      registry.splice(backupIndex, 1)
      this.saveRegistry(registry)

      console.log('✅ Backup deleted:', backupId)
      return { success: true }

    } catch (error) {
      console.error('❌ Failed to delete backup:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Registry management
  getRegistry() {
    try {
      const content = readFileSync(this.registryPath, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.error('❌ Failed to read registry:', error)
      return []
    }
  }

  addToRegistry(backupInfo) {
    try {
      const registry = this.getRegistry()
      registry.unshift(backupInfo) // Add to beginning

      // Keep only last 50 backups
      if (registry.length > 50) {
        registry.splice(50)
      }

      this.saveRegistry(registry)
      console.log('📝 Added backup to registry:', backupInfo.name)

    } catch (error) {
      console.error('❌ Failed to add to registry:', error)
    }
  }

  saveRegistry(registry) {
    try {
      writeFileSync(this.registryPath, JSON.stringify(registry, null, 2), 'utf-8')
    } catch (error) {
      console.error('❌ Failed to save registry:', error)
    }
  }

  // Utility functions
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get backup statistics
  async getBackupStats() {
    try {
      const backups = await this.listBackups()
      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0)
      const withImages = backups.filter(backup => backup.type === 'with_images').length
      const databaseOnly = backups.filter(backup => backup.type === 'database_only').length

      return {
        totalBackups: backups.length,
        totalSize: this.formatFileSize(totalSize),
        withImages,
        databaseOnly,
        lastBackup: backups.length > 0 ? backups[0].created_at : null
      }
    } catch (error) {
      console.error('❌ Failed to get backup stats:', error)
      return {
        totalBackups: 0,
        totalSize: '0 Bytes',
        withImages: 0,
        databaseOnly: 0,
        lastBackup: null
      }
    }
  }
}

module.exports = { ProductionBackupService }
