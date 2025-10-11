import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { ClinicSettings } from '../types'
import logger from '../utils/logger'

interface SettingsState {
  settings: ClinicSettings | null
  isLoading: boolean
  error: string | null
  isDarkMode: boolean
  language: string
  currency: string
  useArabicNumerals: boolean
  isLoaded: boolean; // Add a flag to indicate if settings have been loaded
  lastLoadAttempt?: number; // Track last load attempt to prevent retry loops
  consecutiveFailures?: number; // Track consecutive failures for circuit breaker
  lastSuccessfulLoad?: number; // Track last successful load to prevent unnecessary reloads
}

// Helper function to save clinic settings backup to localStorage
const saveSettingsBackup = (settings: ClinicSettings | null) => {
  if (settings && settings.clinic_name && settings.clinic_name !== 'عيادة الأسنان') {
    try {
      const backup = {
        clinic_name: settings.clinic_name,
        doctor_name: settings.doctor_name,
        clinic_logo: settings.clinic_logo,
        clinic_phone: settings.clinic_phone,
        clinic_email: settings.clinic_email,
        clinic_address: settings.clinic_address,
        timestamp: Date.now()
      }
      localStorage.setItem('dental-clinic-settings-backup', JSON.stringify(backup))
    } catch (error) {
      console.warn('Failed to save settings backup:', error)
    }
  }
}

// Helper function to restore clinic settings backup from localStorage
const restoreSettingsBackup = (): Partial<ClinicSettings> | null => {
  try {
    const backupStr = localStorage.getItem('dental-clinic-settings-backup')
    if (backupStr) {
      const backup = JSON.parse(backupStr)
      // Only restore if backup is recent (within 30 days) and has valid data
      if (backup.timestamp && (Date.now() - backup.timestamp) < 30 * 24 * 60 * 60 * 1000 &&
          backup.clinic_name && backup.clinic_name !== 'عيادة الأسنان') {
        return backup
      }
    }
  } catch (error) {
    console.warn('Failed to restore settings backup:', error)
  }
  return null
}

interface SettingsActions {
  // Data operations
  loadSettings: () => Promise<void>
  updateSettings: (settings: Partial<ClinicSettings>) => Promise<void>

  // UI preferences
  toggleDarkMode: () => void
  initializeDarkMode: () => void
  setLanguage: (language: string) => void
  setCurrency: (currency: string) => void
  setUseArabicNumerals: (useArabicNumerals: boolean) => void

  // Error handling
  clearError: () => void

  // Getters
  getWorkingDays: () => string[]
  isWorkingDay: (date: Date) => boolean
  getWorkingHours: () => { start: string; end: string }
  isWithinWorkingHours: (time: string) => boolean
}

type SettingsStore = SettingsState & SettingsActions

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        settings: null,
        isLoading: false,
        error: null,
        isDarkMode: false,
        language: 'en',
        currency: 'USD',
        useArabicNumerals: false,
        isLoaded: false, // Initialize isLoaded to false

        // Data operations
        loadSettings: async () => {
          const startTime = performance.now()
          const currentState = get()
          
          // Prevent multiple simultaneous loading attempts
          if (currentState.isLoading) {
            logger.warn('Settings already loading, skipping duplicate request')
            return
          }
          
          // If settings are already loaded and recent (within 30 seconds), skip loading
          if (currentState.isLoaded && currentState.settings && 
              (Date.now() - (currentState as any).lastSuccessfulLoad || 0) < 30000) {
            logger.debug('Settings recently loaded, skipping duplicate request')
            return
          }
          
          // Circuit breaker pattern - prevent excessive retries
          const consecutiveFailures = currentState.consecutiveFailures || 0
          if (consecutiveFailures >= 3) {
            logger.warn(`Settings loading circuit breaker open - ${consecutiveFailures} consecutive failures`)
            return
          }
          
          // Prevent retry loops - if we've already tried and failed recently, don't retry immediately
          if (currentState.isLoaded && currentState.error && (Date.now() - (currentState as any).lastLoadAttempt || 0) < 5000) {
            logger.warn('Settings load failed recently, skipping retry to prevent loop')
            return
          }
          
          set({ isLoading: true, error: null, lastLoadAttempt: Date.now() })
          
          try {
            const apiStartTime = performance.now()
            
            // Check if electronAPI is available
            if (!window.electronAPI || !window.electronAPI.settings || !window.electronAPI.settings.get) {
              throw new Error('electronAPI.settings.get is not available')
            }
            
            // Add timeout to prevent hanging
            const settingsPromise = window.electronAPI.settings.get()
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Settings loading timeout after 10 seconds')), 10000)
            )

            logger.debug('Settings Store: About to call window.electronAPI.settings.get()')
            const settings: any = await Promise.race([settingsPromise, timeoutPromise])
            logger.debug('Settings Store: Received settings from electronAPI:', {
              has_settings: !!settings,
              clinic_name: settings?.clinic_name,
              has_clinic_logo: !!settings?.clinic_logo,
              clinic_logo_length: settings?.clinic_logo?.length || 0
            })
            const apiEndTime = performance.now()
            logger.debug(`Settings API Call: ${(apiEndTime - apiStartTime).toFixed(2)}ms`)
            
            // Validate settings response
            if (!settings) {
              throw new Error('Settings API returned null or undefined')
            }

            // Handle empty or invalid clinic_logo to prevent image loading errors
            if (settings.clinic_logo && (settings.clinic_logo.trim() === '' || settings.clinic_logo === 'null' || settings.clinic_logo === 'undefined')) {
              logger.warn('Settings Store: Invalid clinic_logo detected, setting to null to prevent errors')
              settings.clinic_logo = null
            }

            // If settings are missing or incomplete, try to restore from localStorage backup
            if (!settings || !settings.clinic_name || settings.clinic_name === 'عيادة الأسنان') {
              const backupStartTime = performance.now()
              const backup = restoreSettingsBackup()
              if (backup) {
                // Update settings with backup data
                const restoredSettings = {
                  ...settings,
                  ...backup
                }
                await window.electronAPI.settings.update(backup)
                set({
                  settings: restoredSettings,
                  language: settings?.language || 'ar',
                  currency: settings?.currency || 'USD',
                  isLoading: false,
                  isLoaded: true // Mark as loaded
                })
                try { (window as any).__CLINIC_SETTINGS__ = restoredSettings } catch {}
                // Save the restored settings as a new backup
                saveSettingsBackup(restoredSettings)
                const backupEndTime = performance.now()
                logger.debug(`Settings Backup Restore: ${(backupEndTime - backupStartTime).toFixed(2)}ms`)
                logger.success(`Settings Store: Load Settings: ${(backupEndTime - startTime).toFixed(2)}ms`)
                
                // Reset failure counter on success
                set({ consecutiveFailures: 0 })
                return
              }
            }

            const updateStartTime = performance.now()
            set({
              settings,
              language: settings?.language || 'ar',
              currency: settings?.currency || 'USD',
              useArabicNumerals: settings?.use_arabic_numerals || false,
              isLoading: false,
              isLoaded: true // Mark as loaded
            })
            try { (window as any).__CLINIC_SETTINGS__ = settings } catch {}
            const updateEndTime = performance.now()
            logger.debug(`Settings State Update: ${(updateEndTime - updateStartTime).toFixed(2)}ms`)

            // Save backup of loaded settings
            saveSettingsBackup(settings)
            const endTime = performance.now()
            logger.success(`Settings Store: Load Settings: ${(endTime - startTime).toFixed(2)}ms`)
            
            // Reset failure counter and update last successful load time
            set({ 
              consecutiveFailures: 0,
              lastSuccessfulLoad: Date.now()
            })
          } catch (error) {
            const endTime = performance.now()
            
            // Check if this is an image loading error
            const isImageError = error instanceof Error && 
              (error.message.includes('Failed to load image from path') || 
               error.message.includes('Failed to load image'))
            
            // Log detailed error information
            const errorDetails = {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
              type: typeof error,
              error: error,
              isImageError: isImageError
            }
            
            if (isImageError) {
              logger.warn(`Settings Store: Image Loading Error (non-critical): ${(endTime - startTime).toFixed(2)}ms`, errorDetails)
              // For image errors, don't increment failure counter as it's not critical
              set({
                error: null, // Clear error for image loading issues
                isLoading: false,
                isLoaded: true,
                consecutiveFailures: 0 // Reset failure counter for image errors
              })
            } else {
              logger.error(`Settings Store: Load Settings Failed: ${(endTime - startTime).toFixed(2)}ms`, errorDetails)
              
              // Increment failure counter for non-image errors
              const currentFailures = get().consecutiveFailures || 0
              set({
                error: error instanceof Error ? error.message : 'Failed to load settings',
                isLoading: false,
                isLoaded: true, // Even on error, consider it an attempt to load
                consecutiveFailures: currentFailures + 1
              })
            }
          }
        },

        updateSettings: async (settingsData) => {
          set({ isLoading: true, error: null })
          try {
            const updatedSettings = await window.electronAPI.settings.update(settingsData)
            set({
              settings: updatedSettings,
              language: updatedSettings.language,
              currency: updatedSettings.currency,
              useArabicNumerals: updatedSettings.use_arabic_numerals || false,
              isLoading: false,
              isLoaded: true
            })
            try { (window as any).__CLINIC_SETTINGS__ = updatedSettings } catch {}

            // Save backup immediately after successful update
            saveSettingsBackup(updatedSettings)

            // Force update of localStorage backup after successful database update
            // This ensures the backup is always in sync with the database
            setTimeout(() => {
              const currentState = get()
              if (currentState.settings) {
                // Trigger a state update to refresh the persisted backup
                set({ settings: currentState.settings })
              }
            }, 10)
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update settings',
              isLoading: false,
              isLoaded: true
            })
          }
        },

        // UI preferences
        toggleDarkMode: () => {
          const startTime = performance.now()
          logger.performance('Theme switch initiated')

          const { isDarkMode, settings } = get()
          const newDarkMode = !isDarkMode

          // Preserve current settings before theme change
          const currentSettings = settings

          // Update state with preserved settings to prevent UI flicker
          set({
            isDarkMode: newDarkMode,
            settings: currentSettings // Explicitly preserve settings
          })

          // Use requestAnimationFrame for smooth DOM updates
          requestAnimationFrame(() => {
            const domStartTime = performance.now()

            // Apply both dark class and data-theme attribute for consistency
            if (newDarkMode) {
              document.documentElement.classList.add('dark')
              document.documentElement.setAttribute('data-theme', 'dark')
              localStorage.setItem('dental-clinic-theme', 'dark')
              logger.performance(`DOM class added (dark mode): ${(performance.now() - domStartTime).toFixed(2)}ms`)
            } else {
              document.documentElement.classList.remove('dark')
              document.documentElement.setAttribute('data-theme', 'light')
              localStorage.setItem('dental-clinic-theme', 'light')
              logger.performance(`DOM class removed (light mode): ${(performance.now() - domStartTime).toFixed(2)}ms`)
            }
          })

          // Save settings backup immediately to prevent data loss (non-blocking)
          if (currentSettings) {
            try {
              const backupStartTime = performance.now()
              localStorage.setItem('dental-clinic-settings-backup', JSON.stringify({
                clinic_name: currentSettings.clinic_name,
                doctor_name: currentSettings.doctor_name,
                clinic_logo: currentSettings.clinic_logo,
                clinic_phone: currentSettings.clinic_phone,
                clinic_email: currentSettings.clinic_email,
                clinic_address: currentSettings.clinic_address,
                backup_timestamp: Date.now()
              }))
              logger.performance(`Settings backup saved: ${(performance.now() - backupStartTime).toFixed(2)}ms`)
            } catch (error) {
              console.warn('Failed to save settings backup:', error)
            }
          }

          // Update settings in database if available (non-blocking)
          // Note: Theme is stored in localStorage, not database to avoid sync issues
          logger.performance(`Theme switch completed: ${(performance.now() - startTime).toFixed(2)}ms total`)

          logger.performance(`Theme switch state update: ${(performance.now() - startTime).toFixed(2)}ms`)
        },

        // Initialize dark mode from stored preference
        initializeDarkMode: () => {
          const storedTheme = localStorage.getItem('dental-clinic-theme')
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          const currentState = get()

          let shouldBeDark = false

          if (storedTheme) {
            shouldBeDark = storedTheme === 'dark'
          } else {
            shouldBeDark = systemPrefersDark
            // Save the system preference to localStorage
            localStorage.setItem('dental-clinic-theme', shouldBeDark ? 'dark' : 'light')
          }

          // Preserve current settings during theme initialization
          const currentSettings = currentState.settings

          // Only update if different from current state
          if (shouldBeDark !== currentState.isDarkMode) {
            set({
              isDarkMode: shouldBeDark,
              // Keep settings visible during theme initialization
              settings: currentSettings
            })

            // Apply both dark class and data-theme attribute for consistency
            if (shouldBeDark) {
              document.documentElement.classList.add('dark')
              document.documentElement.setAttribute('data-theme', 'dark')
            } else {
              document.documentElement.classList.remove('dark')
              document.documentElement.setAttribute('data-theme', 'light')
            }
          }

          // Removed the call to get().loadSettings() from here
          // Settings loading is handled by App.tsx's initializeApp effect
        },

        setLanguage: (language) => {
          set({ language })
          // Update settings in database
          get().updateSettings({ language })
        },

        setCurrency: (currency) => {
          set({ currency })
          // Update settings in database
          get().updateSettings({ currency })
        },

        setUseArabicNumerals: (useArabicNumerals) => {
          set({ useArabicNumerals })
          // Update settings in database
          get().updateSettings({ use_arabic_numerals: useArabicNumerals })
        },

        // Error handling
        clearError: () => {
          set({ error: null })
        },

        // Getters
        getWorkingDays: () => {
          const { settings } = get()
          if (!settings?.working_days) return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          return settings.working_days.split(',').map(day => day.trim())
        },

        isWorkingDay: (date) => {
          const workingDays = get().getWorkingDays()
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          const dayName = dayNames[date.getDay()]
          return workingDays.includes(dayName)
        },

        getWorkingHours: () => {
          const { settings } = get()
          return {
            start: settings?.working_hours_start || '09:00',
            end: settings?.working_hours_end || '17:00'
          }
        },

        isWithinWorkingHours: (time) => {
          const { start, end } = get().getWorkingHours()
          return time >= start && time <= end
        }
      }),
      {
        name: 'settings-store',
        partialize: (state) => ({
          language: state.language,
          currency: state.currency,
          isDarkMode: state.isDarkMode,
          // Keep a backup of essential clinic settings in localStorage
          // This helps prevent data loss during theme switching
          clinicSettingsBackup: state.settings ? {
            clinic_name: state.settings.clinic_name,
            doctor_name: state.settings.doctor_name,
            clinic_logo: state.settings.clinic_logo,
            clinic_phone: state.settings.clinic_phone,
            clinic_email: state.settings.clinic_email,
            clinic_address: state.settings.clinic_address,
            // Add timestamp for backup validation
            backup_timestamp: Date.now()
          } : null
        }),
        // Force immediate persistence to prevent data loss
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name)
            if (!str) return null
            return JSON.parse(str)
          },
          setItem: (name, value) => {
            localStorage.setItem(name, JSON.stringify(value))
            // Also save a separate backup for extra safety
            if (value.state?.clinicSettingsBackup) {
              localStorage.setItem('dental-clinic-settings-backup', JSON.stringify(value.state.clinicSettingsBackup))
            }
          },
          removeItem: (name) => localStorage.removeItem(name),
        }
      }
    ),
    {
      name: 'settings-store',
    }
  )
)
