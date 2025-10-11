import { DatabaseService } from './databaseService'

export class AutoSaveService {
  private interval: NodeJS.Timeout | null = null
  private saveInterval: number = 300000 // 5 minutes default
  private isRunning: boolean = false

  constructor(private databaseService: DatabaseService) {}

  start(intervalSeconds: number = 300): void {
    if (this.isRunning) {
      this.stop()
    }

    this.saveInterval = intervalSeconds * 1000
    this.isRunning = true

    console.log(`Auto-save service started with ${intervalSeconds}s interval`)

    this.interval = setInterval(() => {
      this.performAutoSave()
    }, this.saveInterval)
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.isRunning = false
    console.log('Auto-save service stopped')
  }

  updateInterval(intervalSeconds: number): void {
    this.saveInterval = intervalSeconds * 1000

    if (this.isRunning) {
      this.stop()
      this.start(intervalSeconds)
    }
  }

  private async performAutoSave(): Promise<void> {
    try {
      // Create a checkpoint in SQLite
      const Database = require('better-sqlite3')
      const { app } = require('electron')
      const { join } = require('path')

      const dbPath = join(app.getPath('userData'), 'dental_clinic.db')
      const db = new Database(dbPath)

      // SQLite WAL checkpoint
      db.pragma('wal_checkpoint(TRUNCATE)')

      db.close()

      console.log(`Auto-save completed at ${new Date().toISOString()}`)

    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }

  isActive(): boolean {
    return this.isRunning
  }

  getCurrentInterval(): number {
    return this.saveInterval / 1000
  }
}
