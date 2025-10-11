import { machineIdSync } from 'node-machine-id'
import { createHash, createCipheriv, createDecipheriv, randomBytes, pbkdf2 } from 'crypto' // Import pbkdf2
import Store from 'electron-store'
import { app } from 'electron'

// License configuration
const LICENSE_FORMAT_REGEX = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const KEY_DERIVATION_ITERATIONS = 100000
const APP_SALT = 'dental-clinic-license-salt-2025'

// Initialize secure store for license data
const licenseStore = new Store({
  name: 'license-data',
  encryptionKey: 'dental-clinic-license-encryption-key-2025',
  cwd: app.getPath('userData')
})

interface LicenseData {
  license: string
  hwid: string
  timestamp: number
  activated: boolean
}

interface LicenseValidationResult {
  isValid: boolean
  error?: string
  licenseData?: LicenseData
}

export class LicenseManager {
  private static instance: LicenseManager
  private currentHWID: string | null = null

  private constructor() {
    // Initialize HWID asynchronously to avoid blocking the constructor
    ;(async () => {
      this.currentHWID = await this.generateHWIDAsync()
    })()
  }

  public static getInstance(): LicenseManager {
    if (!LicenseManager.instance) {
      LicenseManager.instance = new LicenseManager()
    }
    return LicenseManager.instance
  }

  /**
   * Generate unique hardware identifier for this machine
   */
  public async generateHWIDAsync(): Promise<string> {
    try {
      // Get machine ID and create a hash for privacy
      const machineId = machineIdSync()
      const hash = createHash('sha256')
      hash.update(machineId + APP_SALT)
      return hash.digest('hex').substring(0, 32)
    } catch (error) {
      console.error('Error generating HWID:', error)
      // Fallback HWID generation using system info
      const fallbackData = `${process.platform}-${process.arch}-${Date.now()}`
      const hash = createHash('sha256')
      hash.update(fallbackData + APP_SALT)
      return hash.digest('hex').substring(0, 32)
    }
  }

  /**
   * Validate license key format
   */
  public validateLicenseFormat(licenseKey: string): boolean {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return false
    }
    return LICENSE_FORMAT_REGEX.test(licenseKey.trim().toUpperCase())
  }

  /**
   * Encrypt license data using AES-256-GCM
   */
  private async encryptLicenseData(data: LicenseData): Promise<string> {
    try {
      // Use asynchronous pbkdf2
      const key = await new Promise<Buffer>((resolve, reject) => {
        pbkdf2(APP_SALT, 'license-encryption', KEY_DERIVATION_ITERATIONS, 32, 'sha256', (err, derivedKey) => {
          if (err) reject(err)
          resolve(derivedKey)
        })
      })
      const iv = randomBytes(16)
      const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv)

      const jsonData = JSON.stringify(data)
      let encrypted = cipher.update(jsonData, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      const authTag = cipher.getAuthTag()

      // Combine IV, auth tag, and encrypted data
      const result = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
      return Buffer.from(result).toString('base64')
    } catch (error) {
      console.error('Error encrypting license data:', error)
      throw new Error('Failed to encrypt license data')
    }
  }

  /**
   * Decrypt license data
   */
  private async decryptLicenseData(encryptedData: string): Promise<LicenseData> {
    try {
      // Use asynchronous pbkdf2
      const key = await new Promise<Buffer>((resolve, reject) => {
        pbkdf2(APP_SALT, 'license-encryption', KEY_DERIVATION_ITERATIONS, 32, 'sha256', (err, derivedKey) => {
          if (err) reject(err)
          resolve(derivedKey)
        })
      })

      const decodedData = Buffer.from(encryptedData, 'base64').toString('utf8')
      const [ivHex, authTagHex, encrypted] = decodedData.split(':')

      if (!ivHex || !authTagHex || !encrypted) {
        throw new Error('Invalid encrypted data format')
      }

      const iv = Buffer.from(ivHex, 'hex')
      const authTag = Buffer.from(authTagHex, 'hex')
      const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return JSON.parse(decrypted) as LicenseData
    } catch (error) {
      console.error('Error decrypting license data:', error)
      throw new Error('Failed to decrypt license data')
    }
  }

  /**
   * Store license data securely
   */
  public async storeLicense(licenseKey: string, hwid: string): Promise<boolean> {
    try {
      if (!this.validateLicenseFormat(licenseKey)) {
        throw new Error('Invalid license key format')
      }

      const licenseData: LicenseData = {
        license: licenseKey.trim().toUpperCase(),
        hwid: hwid,
        timestamp: Date.now(),
        activated: true
      }

      const encryptedData = await this.encryptLicenseData(licenseData) // Await encryption
      licenseStore.set('licenseData', encryptedData)
      licenseStore.set('lastValidation', Date.now())

      console.log('License stored successfully')
      return true
    } catch (error) {
      console.error('Error storing license:', error)
      return false
    }
  }

  /**
   * Validate stored license
   */
  public async validateStoredLicense(): Promise<LicenseValidationResult> {
    try {
      const encryptedData = licenseStore.get('licenseData') as string

      if (!encryptedData) {
        return {
          isValid: false,
          error: 'No license found', // Keep this error for now, as useLicense.ts will handle isFirstRun based on this.
          // The critical change is ensuring isFirstRun is true when no license data.
          // This will be handled by the checkStatus IPC in main.ts/preload.ts
        }
      }

      const licenseData = await this.decryptLicenseData(encryptedData) // Await decryption

      // Validate license format
      if (!this.validateLicenseFormat(licenseData.license)) {
        return {
          isValid: false,
          error: 'Invalid license format'
        }
      }

      // Validate hardware binding
      if (licenseData.hwid !== this.currentHWID) {
        return {
          isValid: false,
          error: 'License is bound to different hardware'
        }
      }

      // Check if license is activated
      if (!licenseData.activated) {
        return {
          isValid: false,
          error: 'License is not activated'
        }
      }

      // Update last validation timestamp
      licenseStore.set('lastValidation', Date.now())

      return {
        isValid: true,
        licenseData: licenseData
      }
    } catch (error) {
      console.error('Error validating license:', error)
      return {
        isValid: false,
        error: 'License validation failed'
      }
    }
  }

  /**
   * Activate license with hardware binding
   */
  public async activateLicense(licenseKey: string): Promise<LicenseValidationResult> {
    try {
      // Validate format first
      if (!this.validateLicenseFormat(licenseKey)) {
        return {
          isValid: false,
          error: 'Invalid license key format. Expected format: XXXXX-XXXXX-XXXXX-XXXXX'
        }
      }

      // For this implementation, we'll accept any properly formatted license key
      // In a real-world scenario, you would validate against a server or predefined list
      const normalizedKey = licenseKey.trim().toUpperCase()

      // Store the license with current hardware ID
      const success = await this.storeLicense(normalizedKey, this.currentHWID!) // Await storeLicense

      if (success) {
        const licenseData: LicenseData = {
          license: normalizedKey,
          hwid: this.currentHWID!,
          timestamp: Date.now(),
          activated: true
        }

        return {
          isValid: true,
          licenseData: licenseData
        }
      } else {
        return {
          isValid: false,
          error: 'Failed to store license data'
        }
      }
    } catch (error) {
      console.error('Error activating license:', error)
      return {
        isValid: false,
        error: 'License activation failed'
      }
    }
  }

  /**
   * Clear license data (for testing/reset)
   */
  public async clearLicenseData(): Promise<void> {
    try {
      licenseStore.clear()
      console.log('License data cleared')
    } catch (error) {
      console.error('Error clearing license data:', error)
      throw error
    }
  }

  /**
   * Get current hardware ID
   */
  public getCurrentHWID(): string {
    // Ensure HWID is available, if not, attempt to generate it (this should ideally be avoided post-constructor)
    if (!this.currentHWID) {
      console.warn('Current HWID not yet available, generating synchronously as fallback.')
      this.currentHWID = machineIdSync() // Fallback to synchronous if not set
    }
    return this.currentHWID || 'unknown'
  }

  /**
   * Check if license is required (first run detection)
   */
  public isFirstRun(): boolean {
    try {
      const hasLicense = licenseStore.has('licenseData')
      // const lastValidation = licenseStore.get('lastValidation') // Not strictly needed for first run check

      // If no license data exists, it's considered a first run
      return !hasLicense
    } catch (error) {
      console.error('Error checking first run status:', error)
      return true // Default to requiring license on error to be safe
    }
  }

  /**
   * Get license information (for display purposes)
   */
  public async getLicenseInfo(): Promise<{ license?: string; hwid: string; activated: boolean; timestamp?: number; storageType?: string } | null> {
    try {
      const validation = await this.validateStoredLicense()

      if (validation.isValid && validation.licenseData) {
        return {
          license: validation.licenseData.license,
          hwid: validation.licenseData.hwid,
          activated: validation.licenseData.activated,
          timestamp: validation.licenseData.timestamp,
          storageType: 'electron-store' // Always use electron-store now
        }
      }

      return {
        hwid: this.getCurrentHWID(),
        activated: false,
        storageType: 'electron-store' // Always use electron-store now
      }
    } catch (error) {
      console.error('Error getting license info:', error)
      return {
        hwid: this.getCurrentHWID(),
        activated: false,
        storageType: 'error'
      }
    }
  }
}

// Export singleton instance
export const licenseManager = LicenseManager.getInstance()
