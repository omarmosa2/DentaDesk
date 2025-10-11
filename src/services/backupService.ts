import { app } from 'electron'
import { join, basename } from 'path'
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, statSync, copyFileSync, rmSync, readFileSync, writeFileSync } from 'fs'
import { DatabaseService } from './databaseService'

export class BackupService {
  private backupDir: string
  private backupRegistryPath: string
  private sqliteDbPath: string

  constructor(private databaseService: DatabaseService) {
    this.backupDir = join(app.getPath('userData'), 'backups')
    this.backupRegistryPath = join(app.getPath('userData'), 'backup_registry.json')
    this.sqliteDbPath = join(app.getPath('userData'), 'dental_clinic.db')
    this.ensureBackupDirectory()
    this.ensureBackupRegistry()
  }

  private ensureBackupDirectory() {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true })
    }
  }

  private ensureBackupRegistry() {
    if (!existsSync(this.backupRegistryPath)) {
      const fs = require('fs')
      fs.writeFileSync(this.backupRegistryPath, JSON.stringify([], null, 2), 'utf-8')
    }
  }

  private getBackupRegistry(): any[] {
    try {
      const fs = require('fs')
      const content = fs.readFileSync(this.backupRegistryPath, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.error('Failed to read backup registry:', error)
      return []
    }
  }

  private addToBackupRegistry(backupInfo: any) {
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

      const fs = require('fs')
      fs.writeFileSync(this.backupRegistryPath, JSON.stringify(registry, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to update backup registry:', error)
    }
  }

  async createBackup(customPath?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupName = `backup_${timestamp}`

    try {
      console.log('🚀 Starting SQLite backup creation...')

      let backupPath: string
      if (customPath) {
        // Use the custom path provided by user (remove extension if provided)
        backupPath = customPath.replace(/\.(json|db|sqlite)$/, '') + '.db'
      } else {
        // Use default backup directory
        backupPath = join(this.backupDir, `${backupName}.db`)
      }

      // Create SQLite database backup (direct file copy)
      if (existsSync(this.sqliteDbPath)) {
        console.log('📁 Creating SQLite database backup...')
        copyFileSync(this.sqliteDbPath, backupPath)
        console.log('✅ SQLite database backup created')
      } else {
        throw new Error('SQLite database file not found')
      }

      // Get file stats
      const sqliteStats = statSync(backupPath)

      // Create metadata for backup registry
      const metadata = {
        created_at: new Date().toISOString(),
        version: '3.0.0', // Updated version for SQLite-only
        platform: process.platform,
        backup_type: 'full',
        database_type: 'sqlite',
        backup_format: 'sqlite_only' // SQLite only
      }

      // Add to backup registry
      const backupInfo = {
        name: basename(backupPath, '.db'),
        path: backupPath,
        size: sqliteStats.size,
        created_at: metadata.created_at,
        version: metadata.version,
        platform: metadata.platform,
        database_type: 'sqlite',
        backup_format: 'sqlite_only'
      }
      this.addToBackupRegistry(backupInfo)

      console.log(`✅ SQLite backup created successfully:`)
      console.log(`   File: ${backupPath}`)
      console.log(`   Size: ${this.formatFileSize(sqliteStats.size)}`)

      return backupPath

    } catch (error) {
      console.error('❌ Backup creation failed:', error)
      throw new Error(`فشل في إنشاء النسخة الاحتياطية: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async restoreBackup(backupPath: string): Promise<boolean> {
    try {
      console.log('🔄 Starting backup restoration...')

      // Check if backup file exists
      let actualBackupPath = backupPath

      // If path doesn't have .db extension, add it
      if (!backupPath.endsWith('.db')) {
        actualBackupPath = `${backupPath}.db`
      }

      // Check if the backup file exists
      if (!existsSync(actualBackupPath)) {
        // Try legacy JSON format for backward compatibility
        const jsonBackupPath = backupPath.replace(/\.db$/, '.json')
        if (existsSync(jsonBackupPath)) {
          console.log('📄 Found legacy JSON backup, restoring...')
          return await this.restoreLegacyBackup(jsonBackupPath)
        }
        throw new Error(`ملف النسخة الاحتياطية غير موجود: ${actualBackupPath}`)
      }

      console.log(`📁 Found SQLite backup: ${actualBackupPath}`)

      // Create backup of current database before restoration
      const currentDbBackupPath = join(app.getPath('userData'), `current_db_backup_${Date.now()}.db`)
      if (existsSync(this.sqliteDbPath)) {
        copyFileSync(this.sqliteDbPath, currentDbBackupPath)
        console.log(`💾 Current database backed up to: ${currentDbBackupPath}`)
      }

      try {
        // Direct SQLite restoration
        console.log('🗄️ Restoring from SQLite backup...')
        await this.restoreFromSqliteBackup(actualBackupPath)

        console.log('✅ Backup restored successfully')

        // Clean up temporary backup
        if (existsSync(currentDbBackupPath)) {
          rmSync(currentDbBackupPath)
        }

        return true

      } catch (error) {
        // Restore original database if restoration failed
        console.error('❌ Restoration failed, restoring original database...')
        if (existsSync(currentDbBackupPath)) {
          copyFileSync(currentDbBackupPath, this.sqliteDbPath)
          rmSync(currentDbBackupPath)
          console.log('✅ Original database restored')
        }
        throw error
      }

    } catch (error) {
      console.error('❌ Backup restoration failed:', error)
      throw new Error(`فشل في استعادة النسخة الاحتياطية: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async restoreFromSqliteBackup(sqliteBackupPath: string): Promise<void> {
    // Close current database connection
    this.databaseService.close()

    // Replace current database with backup
    copyFileSync(sqliteBackupPath, this.sqliteDbPath)

    // Reinitialize database service
    // Note: The application will need to restart or reinitialize the database service
    console.log('🔄 SQLite database restored. Application restart may be required.')
  }



  private async restoreLegacyBackup(backupPath: string): Promise<boolean> {
    console.log('📄 Restoring legacy backup format...')

    // Read and parse legacy backup data
    const backupContent = readFileSync(backupPath, 'utf-8')
    const backupData = JSON.parse(backupContent)

    // Use JSON restoration method for legacy backups
    await this.restoreFromJsonBackup(backupPath)
    return true
  }

  async listBackups(): Promise<any[]> {
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
        isLegacy: backup.backup_format === 'hybrid' || !backup.backup_format
      }))
    } catch (error) {
      console.error('Failed to list backups:', error)
      return []
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  async deleteOldBackups(keepCount: number = 10): Promise<void> {
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

  async deleteBackup(backupName: string): Promise<void> {
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

  async scheduleAutomaticBackups(frequency: 'hourly' | 'daily' | 'weekly'): Promise<void> {
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


}