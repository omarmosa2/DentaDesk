import { useState, useEffect, useCallback } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import logger from '../utils/logger'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  passwordEnabled: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    passwordEnabled: false
  })

  const { settings, loadSettings } = useSettingsStore()

  const checkAuthStatus = useCallback(async () => {
    try {
      logger.auth('Checking auth status...')

      // Ensure settings are loaded before proceeding
      if (!settings?.isLoaded) { // Use optional chaining here
        await loadSettings();
      }
      const currentSettings = useSettingsStore.getState().settings; // Get latest settings after loading

      const passwordEnabled = currentSettings?.password_enabled === 1
      const hasPassword = currentSettings?.app_password && currentSettings.app_password.length > 0

      logger.auth('Password enabled:', passwordEnabled)
      logger.auth('Has password:', hasPassword)

      if (!passwordEnabled || !hasPassword) {
        // No password protection enabled
        logger.auth('No password protection, allowing access')
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          passwordEnabled: false
        })
        return
      }

      // Check if user has valid session
      const hasValidSession = sessionStorage.getItem('dental_clinic_auth') === 'true'
      logger.auth('Has valid session:', hasValidSession)

      if (hasValidSession) {
        // User has valid session, allow access
        logger.auth('Valid session found, allowing access')
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          passwordEnabled: true
        })
      } else {
        // No valid session, require authentication
        logger.auth('No valid session, requiring authentication')
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          passwordEnabled: true
        })
      }
    } catch (error) {
      logger.error('Error checking auth status:', error)
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        passwordEnabled: false
      })
    }
  }, [settings, loadSettings])

  useEffect(() => {
    checkAuthStatus()
  }, [checkAuthStatus])

  const login = async (password: string): Promise<boolean> => {
    try {
      logger.auth('Attempting login...')

      // Use settings from the store
      const currentSettings = useSettingsStore.getState().settings;

      if (!currentSettings?.app_password) {
        logger.auth('No password set in settings')
        return false
      }

      // Hash the input password and compare with stored hash
      const hashedInput = await hashPassword(password)
      logger.auth('Password hashed, comparing...')

      if (hashedInput === currentSettings.app_password) {
        logger.success('Password correct, setting session')
        sessionStorage.setItem('dental_clinic_auth', 'true')
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true
        }))
        return true
      }

      logger.failure('Password incorrect')
      return false
    } catch (error) {
      logger.error('Login error:', error)
      return false
    }
  }

  const logout = async () => {
    // Clear session storage only (keep localStorage for theme and other preferences)
    sessionStorage.removeItem('dental_clinic_auth')

    // Also clear via Electron IPC if available
    try {
      if (window.electronAPI?.auth?.clearSession) {
        await window.electronAPI.auth.clearSession()
      }
    } catch (error) {
      logger.debug('Could not clear session via Electron:', error)
    }

    setAuthState(prev => ({
      ...prev,
      isAuthenticated: false
    }))
  }

  const setPassword = async (password: string): Promise<boolean> => {
    try {
      logger.auth('Setting password...')
      const hashedPassword = await hashPassword(password)

      logger.auth('Updating settings with hashed password...')
      const updatedSettings = await withTimeout(
        window.electronAPI.settings.update({
          app_password: hashedPassword,
          password_enabled: 1
        }),
        10000 // 10 second timeout
      )

      logger.auth('Settings updated:', updatedSettings)

      if (updatedSettings) {
        // Update auth state directly without reloading settings to avoid loop
        setAuthState(prev => ({
          ...prev,
          passwordEnabled: true
        }))
        logger.success('Password set successfully')
        return true
      }

      logger.failure('Failed to update settings')
      return false
    } catch (error) {
      logger.error('Error setting password:', error)
      return false
    }
  }

  const removePassword = async (): Promise<boolean> => {
    try {
      logger.auth('Removing password...')
      const updatedSettings = await withTimeout(
        window.electronAPI.settings.update({
          app_password: null,
          password_enabled: 0
        }),
        10000 // 10 second timeout
      )

      logger.auth('Settings updated:', updatedSettings)

      if (updatedSettings) {
        // Update auth state directly without reloading settings to avoid loop
        setAuthState(prev => ({
          ...prev,
          passwordEnabled: false,
          isAuthenticated: true
        }))
        logger.success('Password removed successfully')
        return true
      }

      logger.failure('Failed to update settings')
      return false
    } catch (error) {
      logger.error('Error removing password:', error)
      return false
    }
  }

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    try {
      logger.auth('Changing password...')

      // Use settings from the store
      const currentSettings = useSettingsStore.getState().settings;

      if (!currentSettings?.app_password) {
        logger.auth('No existing password found')
        return false
      }

      // Verify old password
      const hashedOld = await hashPassword(oldPassword)
      if (hashedOld !== currentSettings.app_password) {
        logger.failure('Old password is incorrect')
        return false
      }

      // Set new password
      const hashedNew = await hashPassword(newPassword)
      logger.auth('Updating with new password...')

      const updatedSettings = await withTimeout(
        window.electronAPI.settings.update({
          app_password: hashedNew
        }),
        10000 // 10 second timeout
      )

      logger.auth('Settings updated:', updatedSettings)

      if (updatedSettings) {
        logger.success('Password changed successfully')
        return true
      }

      logger.failure('Failed to update settings')
      return false
    } catch (error) {
      logger.error('Error changing password:', error)
      return false
    }
  }

  return {
    ...authState,
    login,
    logout,
    setPassword,
    removePassword,
    changePassword,
    checkAuthStatus
  }
}

// Simple hash function for password (in production, use bcrypt or similar)
async function hashPassword(password: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(password + 'dental_clinic_salt_2024')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch (error) {
    logger.error('Error hashing password:', error)
    throw error
  }
}

// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    )
  ])
}
