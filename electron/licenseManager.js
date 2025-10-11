const { machineIdSync } = require('node-machine-id')
const { createHash, createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } = require('crypto')
const { app } = require('electron')
const fs = require('fs')
const path = require('path')

// استيراد validator مفاتيح الإنتاج ونظام التتبع ونظام الربط بالجهاز
const { isValidLicense, getLicenseInfo: getProductionLicenseInfo } = require('./productionLicenseValidator')
const { isLicenseAvailable, markLicenseAsUsed, updateLastValidation } = require('./usedLicensesTracker')
const { validateDeviceBoundLicense, getCurrentDeviceId } = require('./deviceBoundLicenseGenerator')

// License configuration - يقبل كلا التنسيقين
const LICENSE_FORMAT_REGEX = /^[A-Z0-9]{4,5}-[A-Z0-9]{4,5}-[A-Z0-9]{4,5}-[A-Z0-9]{4,5}$/
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const KEY_DERIVATION_ITERATIONS = 100000
const APP_SALT = 'dental-clinic-license-salt-2025'

// Initialize secure store for license data

let licenseStore
let usingElectronStore = false

// Try to use electron-store first, fallback to file-based storage
try {
  const Store = require('electron-store')
  // Check if Store is a constructor
  if (typeof Store === 'function') {
    licenseStore = new Store({
      name: 'license-data',
      encryptionKey: 'dental-clinic-license-encryption-key-2025',
      cwd: app.getPath('userData')
    })
    usingElectronStore = true
    console.log('✅ Using electron-store for license data')
  } else {
    throw new Error('electron-store is not a constructor')
  }
} catch (error) {
  console.log('ℹ️ electron-store not available, using file-based storage')

  // Fallback to secure file-based storage
  const storePath = path.join(app.getPath('userData'), 'license-data.json')

  // Ensure directory exists
  const storeDir = path.dirname(storePath)
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true })
  }

  licenseStore = {
    get: (key) => {
      try {
        if (fs.existsSync(storePath)) {
          const data = JSON.parse(fs.readFileSync(storePath, 'utf8'))
          return data[key]
        }
      } catch (error) {
        console.error('Error reading license store:', error)
      }
      return undefined
    },

    set: (key, value) => {
      try {
        let data = {}
        if (fs.existsSync(storePath)) {
          try {
            data = JSON.parse(fs.readFileSync(storePath, 'utf8'))
          } catch (parseError) {
            console.warn('License store file corrupted, creating new one')
            data = {}
          }
        }
        data[key] = value

        // Write atomically using temporary file
        const tempPath = storePath + '.tmp'
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2))
        fs.renameSync(tempPath, storePath)

        console.log(`📝 License data saved: ${key}`)
      } catch (error) {
        console.error('Error writing license store:', error)
      }
    },

    has: (key) => {
      try {
        if (fs.existsSync(storePath)) {
          const data = JSON.parse(fs.readFileSync(storePath, 'utf8'))
          return key in data
        }
      } catch (error) {
        console.error('Error checking license store:', error)
      }
      return false
    },

    clear: () => {
      try {
        if (fs.existsSync(storePath)) {
          fs.unlinkSync(storePath)
          console.log('🗑️ License store cleared')
        }
      } catch (error) {
        console.error('Error clearing license store:', error)
      }
    },

    // Additional method to get store info
    getStorePath: () => storePath,
    isUsingElectronStore: () => false
  }

  console.log(`📁 License store path: ${storePath}`)
}

class LicenseManager {
  constructor() {
    this.currentHWID = this.generateHWID()
  }

  static getInstance() {
    if (!LicenseManager.instance) {
      LicenseManager.instance = new LicenseManager()
    }
    return LicenseManager.instance
  }

  /**
   * Generate unique hardware identifier for this machine
   */
  generateHWID() {
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
  validateLicenseFormat(licenseKey) {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return false
    }
    return LICENSE_FORMAT_REGEX.test(licenseKey.trim().toUpperCase())
  }

  /**
   * Check if license key exists in production licenses
   */
  isValidProductionLicense(licenseKey) {
    return isValidLicense(licenseKey)
  }

  /**
   * Get production license information
   */
  getProductionLicenseInfo(licenseKey) {
    return getProductionLicenseInfo(licenseKey)
  }

  /**
   * Encrypt license data using AES-256-GCM
   */
  encryptLicenseData(data) {
    try {
      const key = pbkdf2Sync(APP_SALT, 'license-encryption', KEY_DERIVATION_ITERATIONS, 32, 'sha256')
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
  decryptLicenseData(encryptedData) {
    try {
      const key = pbkdf2Sync(APP_SALT, 'license-encryption', KEY_DERIVATION_ITERATIONS, 32, 'sha256')
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

      return JSON.parse(decrypted)
    } catch (error) {
      console.error('Error decrypting license data:', error)
      throw new Error('Failed to decrypt license data')
    }
  }

  /**
   * Store license data securely
   */
  async storeLicense(licenseKey, hwid) {
    try {
      if (!this.validateLicenseFormat(licenseKey)) {
        throw new Error('Invalid license key format')
      }

      const licenseData = {
        license: licenseKey.trim().toUpperCase(),
        hwid: hwid,
        timestamp: Date.now(),
        activated: true
      }

      const encryptedData = this.encryptLicenseData(licenseData)
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
  async validateStoredLicense() {
    try {
      // في بيئة التطوير، اعتبار الترخيص صالحاً دائماً
      const isDev = process.env.NODE_ENV === 'development' || !require('electron').app.isPackaged
      if (isDev) {
        console.log('🔧 Development mode: License validation bypassed')
        return {
          isValid: true,
          licenseData: {
            license: 'DEV-LICENSE-KEY',
            activated: true,
            hwid: this.currentHWID
          }
        }
      }

      const encryptedData = licenseStore.get('licenseData')

      if (!encryptedData) {
        return {
          isValid: false,
          error: 'No license found'
        }
      }

      const licenseData = this.decryptLicenseData(encryptedData)

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

      // تحديث آخر تحقق في نظام التتبع
      updateLastValidation(licenseData.license, this.currentHWID)

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
  async activateLicense(licenseKey) {
    try {
      // Validate format first
      if (!this.validateLicenseFormat(licenseKey)) {
        return {
          isValid: false,
          error: 'تنسيق مفتاح الترخيص غير صحيح. التنسيق المطلوب: XXXXX-XXXXX-XXXXX-XXXXX'
        }
      }

      const normalizedKey = licenseKey.trim().toUpperCase()

      // أولاً: محاولة التحقق كمفتاح مرتبط بالجهاز (النظام الجديد)
      console.log('🔍 Attempting device-bound license validation...')
      const deviceBoundValidation = validateDeviceBoundLicense(normalizedKey)

      if (deviceBoundValidation.isValid) {
        console.log('✅ Device-bound license validation successful')

        // Store the license with current hardware ID
        const success = await this.storeLicense(normalizedKey, this.currentHWID)

        if (success) {
          const licenseData = {
            license: normalizedKey,
            hwid: this.currentHWID,
            timestamp: Date.now(),
            activated: true,
            licenseType: 'DEVICE_BOUND',
            deviceBound: true,
            metadata: deviceBoundValidation.licenseData.metadata,
            category: 'DEVICE_BOUND',
            categoryInfo: {
              name: 'Device-Bound License',
              description: 'Secure device-bound license with maximum protection'
            }
          }

          console.log(`🎉 Device-bound license activated successfully: ${normalizedKey}`)

          return {
            isValid: true,
            licenseData: licenseData
          }
        } else {
          return {
            isValid: false,
            error: 'فشل في حفظ بيانات الترخيص'
          }
        }
      }

      // ثانياً: التحقق من النظام القديم (مفاتيح الإنتاج)
      console.log('🔍 Attempting production license validation...')

      // التحقق من أن المفتاح موجود في مفاتيح الإنتاج
      if (!this.isValidProductionLicense(normalizedKey)) {
        console.log(`❌ License key not valid in any system: ${normalizedKey}`)
        return {
          isValid: false,
          error: 'مفتاح الترخيص غير صالح أو غير مُعتمد. يرجى التأكد من صحة المفتاح.'
        }
      }

      // التحقق من أن المفتاح غير مُستخدم على جهاز آخر
      if (!isLicenseAvailable(normalizedKey, this.currentHWID)) {
        console.log(`❌ License key already used on different device: ${normalizedKey}`)
        return {
          isValid: false,
          error: 'مفتاح الترخيص مُستخدم بالفعل على جهاز آخر. كل مفتاح يعمل على جهاز واحد فقط.'
        }
      }

      // الحصول على معلومات المفتاح
      const licenseInfo = this.getProductionLicenseInfo(normalizedKey)
      console.log(`✅ Valid production license found:`, licenseInfo)

      // Store the license with current hardware ID
      const success = await this.storeLicense(normalizedKey, this.currentHWID)

      if (success) {
        const licenseData = {
          license: normalizedKey,
          hwid: this.currentHWID,
          timestamp: Date.now(),
          activated: true,
          licenseId: licenseInfo.id || null,
          licenseHash: licenseInfo.hash || null,
          isProduction: licenseInfo.isProduction || false,
          metadata: licenseInfo.metadata || null,
          category: licenseInfo.category || 'PRODUCTION',
          categoryInfo: licenseInfo.categoryInfo || { name: 'Production License', description: 'Commercial production license' }
        }

        const categoryName = licenseInfo.categoryInfo ? licenseInfo.categoryInfo.name : 'Production License'
        console.log(`🎉 License activated successfully: ${normalizedKey} (${categoryName})`)

        // تسجيل المفتاح كمُستخدم
        const marked = markLicenseAsUsed(normalizedKey, this.currentHWID, {
          licenseId: licenseInfo.id,
          category: licenseInfo.category,
          activatedBy: 'user'
        })

        if (marked) {
          console.log(`📝 License marked as used in tracker: ${normalizedKey}`)
        } else {
          console.warn(`⚠️ Failed to mark license as used in tracker: ${normalizedKey}`)
        }

        return {
          isValid: true,
          licenseData: licenseData
        }
      } else {
        return {
          isValid: false,
          error: 'فشل في حفظ بيانات الترخيص'
        }
      }
    } catch (error) {
      console.error('Error activating license:', error)
      return {
        isValid: false,
        error: 'فشل في تفعيل الترخيص'
      }
    }
  }

  /**
   * Clear license data (for testing/reset)
   */
  async clearLicenseData() {
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
  getCurrentHWID() {
    return this.currentHWID || this.generateHWID()
  }

  /**
   * Check if license is required (first run detection)
   */
  isFirstRun() {
    try {
      const hasLicense = licenseStore.has('licenseData')
      const lastValidation = licenseStore.get('lastValidation')

      // Consider it first run if no license data exists
      return !hasLicense
    } catch (error) {
      console.error('Error checking first run status:', error)
      return true // Default to requiring license on error
    }
  }

  /**
   * Get license information (for display purposes)
   */
  async getLicenseInfo() {
    try {
      const validation = await this.validateStoredLicense()

      if (validation.isValid && validation.licenseData) {
        return {
          license: validation.licenseData.license,
          hwid: validation.licenseData.hwid,
          activated: validation.licenseData.activated,
          timestamp: validation.licenseData.timestamp,
          storageType: usingElectronStore ? 'electron-store' : 'file-based'
        }
      }

      return {
        hwid: this.getCurrentHWID(),
        activated: false,
        storageType: usingElectronStore ? 'electron-store' : 'file-based'
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

  /**
   * Get storage information for debugging
   */
  getStorageInfo() {
    return {
      usingElectronStore: usingElectronStore,
      storageType: usingElectronStore ? 'electron-store' : 'file-based',
      storePath: licenseStore.getStorePath ? licenseStore.getStorePath() : 'unknown'
    }
  }
}

// Export singleton instance
const licenseManager = LicenseManager.getInstance()

module.exports = {
  LicenseManager,
  licenseManager
}
