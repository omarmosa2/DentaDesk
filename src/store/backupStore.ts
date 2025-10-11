import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface BackupInfo {
  name: string
  path: string
  size: number
  created_at: string
  version?: string
  platform?: string
  isSqliteOnly?: boolean
  includesImages?: boolean
  isLegacy?: boolean
}

interface BackupState {
  backups: BackupInfo[]
  isLoading: boolean
  error: string | null
  isCreatingBackup: boolean
  isRestoringBackup: boolean
  lastBackupDate: string | null
  autoBackupEnabled: boolean
  backupFrequency: 'daily' | 'weekly' | 'monthly'
}

interface BackupActions {
  // Data operations
  loadBackups: () => Promise<void>
  createBackup: (customPath?: string | null, includeImages?: boolean) => Promise<string>
  restoreBackup: (backupPath: string) => Promise<boolean>
  deleteBackup: (backupName: string) => Promise<void>

  // Auto backup settings
  setAutoBackupEnabled: (enabled: boolean) => void
  setBackupFrequency: (frequency: 'daily' | 'weekly' | 'monthly') => void

  // File operations
  selectBackupFile: () => Promise<string | null>

  // Testing
  runBackupTest: () => Promise<{ success: boolean; results: any[]; error?: string }>

  // Error handling
  clearError: () => void

  // Utilities
  formatBackupSize: (bytes: number) => string
  formatBackupDate: (dateString: string) => string
  getBackupStatus: () => {
    totalBackups: number
    lastBackup: string | null
    nextScheduledBackup: string | null
  }
}

type BackupStore = BackupState & BackupActions

export const useBackupStore = create<BackupStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      backups: [],
      isLoading: false,
      error: null,
      isCreatingBackup: false,
      isRestoringBackup: false,
      lastBackupDate: null,
      autoBackupEnabled: true,
      backupFrequency: 'daily',

      // Data operations
      loadBackups: async () => {
        set({ isLoading: true, error: null })
        try {
          const [backupList, settings] = await Promise.all([
            window.electronAPI.backup.list(),
            window.electronAPI.settings.get()
          ])

          // Convert backup list to BackupInfo objects if needed
          const backups: BackupInfo[] = Array.isArray(backupList) && backupList.length > 0 && typeof backupList[0] === 'string'
            ? (backupList as string[]).map((name: string) => ({
                name,
                path: name,
                size: 0,
                created_at: new Date().toISOString(),
                version: '1.0.0'
              }))
            : (backupList as unknown as BackupInfo[])

          set({
            backups,
            isLoading: false,
            lastBackupDate: backups.length > 0 ? backups[0].created_at : null,
            autoBackupEnabled: settings?.backup_frequency !== 'disabled' && settings?.backup_frequency !== undefined,
            backupFrequency: (settings?.backup_frequency === 'disabled' || settings?.backup_frequency === 'hourly')
              ? 'daily'
              : (settings?.backup_frequency as 'daily' | 'weekly' | 'monthly' || 'daily')
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'فشل في تحميل قائمة النسخ الاحتياطية',
            isLoading: false
          })
        }
      },

      createBackup: async (customPath?: string | null, includeImages?: boolean) => {
        set({ isCreatingBackup: true, error: null })
        try {
          const backupPath = await window.electronAPI.backup.create(customPath, includeImages)

          // Reload backups list
          await get().loadBackups()

          set({ isCreatingBackup: false })
          return backupPath
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'فشل في إنشاء النسخة الاحتياطية',
            isCreatingBackup: false
          })
          throw error
        }
      },

      restoreBackup: async (backupPath: string) => {
        set({ isRestoringBackup: true, error: null })
        try {
          const success = await window.electronAPI.backup.restore(backupPath)
          set({ isRestoringBackup: false })
          return success
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'فشل في استعادة النسخة الاحتياطية',
            isRestoringBackup: false
          })
          throw error
        }
      },

      deleteBackup: async (backupName: string) => {
        set({ isLoading: true, error: null })
        try {
          await window.electronAPI.backup.delete(backupName)

          // Reload backups list
          await get().loadBackups()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'فشل في حذف النسخة الاحتياطية',
            isLoading: false
          })
          throw error
        }
      },

      // Auto backup settings
      setAutoBackupEnabled: async (enabled: boolean) => {
        set({ autoBackupEnabled: enabled })

        // Update settings in database
        try {
          const currentFrequency = get().backupFrequency
          const mappedFrequency = currentFrequency === 'monthly' ? 'weekly' : currentFrequency
          await window.electronAPI.settings.update({
            backup_frequency: enabled ? mappedFrequency : 'disabled'
          })
        } catch (error) {
          console.error('Failed to update backup settings:', error)
        }
      },

      setBackupFrequency: async (frequency: 'daily' | 'weekly' | 'monthly') => {
        set({ backupFrequency: frequency })

        // Update settings in database if auto backup is enabled
        const { autoBackupEnabled } = get()
        if (autoBackupEnabled) {
          try {
            const mappedFrequency = frequency === 'monthly' ? 'weekly' : frequency
            await window.electronAPI.settings.update({ backup_frequency: mappedFrequency })
          } catch (error) {
            console.error('Failed to update backup frequency:', error)
          }
        }
      },

      // File operations
      selectBackupFile: async () => {
        try {
          const result = await window.electronAPI.dialog.showOpenDialog({
            title: 'اختر ملف النسخة الاحتياطية',
            filters: [
              { name: 'نسخ احتياطية مع صور', extensions: ['zip'] },
              { name: 'ملفات قاعدة البيانات', extensions: ['db', 'sqlite'] },
              { name: 'ملفات النسخ الاحتياطية القديمة', extensions: ['json'] },
              { name: 'ملفات النسخ الاحتياطية الأخرى', extensions: ['backup', 'bak'] },
              { name: 'جميع الملفات', extensions: ['*'] }
            ],
            properties: ['openFile']
          })

          return result.canceled ? null : result.filePaths[0]
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'فشل في اختيار الملف'
          })
          return null
        }
      },

      runBackupTest: async () => {
        set({ isLoading: true, error: null })
        try {
          const result = await window.electronAPI.backup.test()
          set({ isLoading: false })
          return result
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'فشل في تشغيل اختبار النسخ الاحتياطي',
            isLoading: false
          })
          return {
            success: false,
            results: [],
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      },

      // Error handling
      clearError: () => {
        set({ error: null })
      },

      // Utilities
      formatBackupSize: (bytes: number) => {
        const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت']
        if (bytes === 0) return '0 بايت'
        const i = Math.floor(Math.log(bytes) / Math.log(1024))
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
      },

      formatBackupDate: (dateString: string) => {
        const date = new Date(dateString)
        const day = date.getDate()
        const month = date.getMonth() + 1 // Add 1 because getMonth() returns 0-11
        const year = date.getFullYear()
        const hours = date.getHours()
        const minutes = date.getMinutes()

        // Format date as DD/MM/YYYY
        const formattedDay = day.toString().padStart(2, '0')
        const formattedMonth = month.toString().padStart(2, '0')
        const formattedHours = hours.toString().padStart(2, '0')
        const formattedMinutes = minutes.toString().padStart(2, '0')

        return `${formattedDay}/${formattedMonth}/${year} في ${formattedHours}:${formattedMinutes}`
      },

      getBackupStatus: () => {
        const { backups, backupFrequency, lastBackupDate } = get()

        let nextScheduledBackup = null
        if (lastBackupDate) {
          const lastDate = new Date(lastBackupDate)
          const nextDate = new Date(lastDate)

          switch (backupFrequency) {
            case 'daily':
              nextDate.setDate(nextDate.getDate() + 1)
              break
            case 'weekly':
              nextDate.setDate(nextDate.getDate() + 7)
              break
            case 'monthly':
              nextDate.setMonth(nextDate.getMonth() + 1)
              break
          }

          // Format next scheduled backup date in DD/MM/YYYY format
          const nextDay = nextDate.getDate()
          const nextMonth = nextDate.getMonth() + 1 // Add 1 because getMonth() returns 0-11
          const nextYear = nextDate.getFullYear()

          const formattedNextDay = nextDay.toString().padStart(2, '0')
          const formattedNextMonth = nextMonth.toString().padStart(2, '0')

          nextScheduledBackup = `${formattedNextDay}/${formattedNextMonth}/${nextYear}`
        }

        return {
          totalBackups: backups.length,
          lastBackup: lastBackupDate ? get().formatBackupDate(lastBackupDate) : null,
          nextScheduledBackup
        }
      }
    }),
    {
      name: 'backup-store'
    }
  )
)
