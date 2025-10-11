import { useState, useEffect, useCallback } from 'react'

interface LicenseData {
  license?: string
  hwid: string
  activated: boolean
  timestamp?: number
}

interface MachineInfo {
  hwid: string
  platform: string
  arch: string
  error?: string
}

interface LicenseStatus {
  isValid: boolean
  error?: string
  isFirstRun: boolean
  licenseData?: LicenseData
}

interface LicenseActivationResult {
  success: boolean
  error?: string
  licenseData?: LicenseData
}

interface LicenseState {
  isLicenseValid: boolean
  isFirstRun: boolean
  isLoading: boolean
  error: string | null
  licenseData: LicenseData | null
  machineInfo: MachineInfo | null
}

export function useLicense() {
  const [licenseState, setLicenseState] = useState<LicenseState>({
    isLicenseValid: false,
    isFirstRun: true,
    isLoading: true,
    error: null,
    licenseData: null,
    machineInfo: null
  })

  /**
   * Check license status from main process
   */
  const checkLicenseStatus = useCallback(async (): Promise<LicenseStatus> => {
    try {
      console.log('🔐 Checking license status...')
      
      if (!window.electronAPI?.license?.checkStatus) {
        throw new Error('License API not available')
      }

      const result = await window.electronAPI.license.checkStatus()
      console.log('🔐 License status result:', result)
      
      return result
    } catch (error) {
      console.error('❌ Error checking license status:', error)
      return {
        isValid: false,
        error: 'Failed to check license status',
        isFirstRun: true
      }
    }
  }, [])

  /**
   * Get machine information
   */
  const getMachineInfo = useCallback(async (): Promise<MachineInfo> => {
    try {
      console.log('🔐 Getting machine info...')
      
      if (!window.electronAPI?.license?.getMachineInfo) {
        throw new Error('License API not available')
      }

      const result = await window.electronAPI.license.getMachineInfo()
      console.log('🔐 Machine info result:', result)
      
      return result
    } catch (error) {
      console.error('❌ Error getting machine info:', error)
      return {
        hwid: 'error',
        platform: 'unknown',
        arch: 'unknown',
        error: 'Failed to get machine info'
      }
    }
  }, [])

  /**
   * Activate license with provided key
   */
  const activateLicense = useCallback(async (licenseKey: string): Promise<LicenseActivationResult> => {
    try {
      console.log('🔐 Activating license...')
      
      if (!window.electronAPI?.license?.activate) {
        throw new Error('License API not available')
      }

      if (!licenseKey || typeof licenseKey !== 'string') {
        throw new Error('Invalid license key provided')
      }

      const result = await window.electronAPI.license.activate(licenseKey.trim())
      console.log('🔐 License activation result:', result.success)
      
      if (result.success) {
        // Refresh license status after successful activation
        await refreshLicenseStatus()
      }
      
      return result
    } catch (error) {
      console.error('❌ Error activating license:', error)
      return {
        success: false,
        error: 'Failed to activate license'
      }
    }
  }, [])

  /**
   * Get detailed license information
   */
  const getLicenseInfo = useCallback(async (): Promise<LicenseData | null> => {
    try {
      console.log('🔐 Getting license info...')
      
      if (!window.electronAPI?.license?.getLicenseInfo) {
        throw new Error('License API not available')
      }

      const result = await window.electronAPI.license.getLicenseInfo()
      console.log('🔐 License info result:', result)
      
      return result
    } catch (error) {
      console.error('❌ Error getting license info:', error)
      return null
    }
  }, [])

  /**
   * Clear license data (development only)
   */
  const clearLicenseData = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Clearing license data...')
      
      if (!window.electronAPI?.license?.clearData) {
        throw new Error('License API not available')
      }

      const result = await window.electronAPI.license.clearData()
      console.log('🔐 License clear result:', result.success)
      
      if (result.success) {
        // Refresh license status after clearing
        await refreshLicenseStatus()
      }
      
      return result
    } catch (error) {
      console.error('❌ Error clearing license data:', error)
      return {
        success: false,
        error: 'Failed to clear license data'
      }
    }
  }, [])

  /**
   * Refresh license status and update state
   */
  const refreshLicenseStatus = useCallback(async () => {
    setLicenseState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Get license status and machine info in parallel
      const [licenseStatus, machineInfo, licenseInfo] = await Promise.all([
        checkLicenseStatus(),
        getMachineInfo(),
        getLicenseInfo()
      ])

      setLicenseState({
        isLicenseValid: licenseStatus.isValid,
        isFirstRun: licenseStatus.isFirstRun,
        isLoading: false,
        error: licenseStatus.error || machineInfo.error || null,
        licenseData: licenseInfo,
        machineInfo: machineInfo
      })

      console.log('🔐 License state updated:', {
        isValid: licenseStatus.isValid,
        isFirstRun: licenseStatus.isFirstRun,
        hasError: !!(licenseStatus.error || machineInfo.error)
      })

    } catch (error) {
      console.error('❌ Error refreshing license status:', error)
      setLicenseState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to refresh license status'
      }))
    }
  }, [checkLicenseStatus, getMachineInfo, getLicenseInfo])

  /**
   * Initialize license checking on mount
   */
  useEffect(() => {
    console.log('🔐 Initializing license hook...')
    refreshLicenseStatus()
  }, [refreshLicenseStatus])

  /**
   * Validate license key format
   */
  const validateLicenseFormat = useCallback((licenseKey: string): boolean => {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return false
    }
    
    const regex = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/
    return regex.test(licenseKey.trim().toUpperCase())
  }, [])

  /**
   * Format license key for display
   */
  const formatLicenseKey = useCallback((value: string): string => {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase()
    
    // Split into groups of 5 characters
    const groups = []
    for (let i = 0; i < cleaned.length; i += 5) {
      groups.push(cleaned.slice(i, i + 5))
    }
    
    // Join with hyphens, limit to 4 groups (20 characters total)
    return groups.slice(0, 4).join('-')
  }, [])

  return {
    // State
    isLicenseValid: licenseState.isLicenseValid,
    isFirstRun: licenseState.isFirstRun,
    isLoading: licenseState.isLoading,
    error: licenseState.error,
    licenseData: licenseState.licenseData,
    machineInfo: licenseState.machineInfo,

    // Actions
    activateLicense,
    refreshLicenseStatus,
    clearLicenseData,
    getLicenseInfo,
    getMachineInfo,
    checkLicenseStatus,

    // Utilities
    validateLicenseFormat,
    formatLicenseKey
  }
}
