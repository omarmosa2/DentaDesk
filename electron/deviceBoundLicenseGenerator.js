/**
 * Device-Bound License Generator
 * مولد مفاتيح الترخيص المرتبطة بالجهاز
 *
 * كل مفتاح مُشفر مع معرف الجهاز ولا يعمل إلا عليه
 */

const crypto = require('crypto')
const { machineIdSync } = require('node-machine-id')

class DeviceBoundLicenseGenerator {
  constructor() {
    // مفتاح التشفير الرئيسي (يجب أن يكون سري ومحمي)
    this.masterKey = 'DENTAL_CLINIC_MASTER_KEY_2025_SECURE_ENCRYPTION'
    this.algorithm = 'aes-256-cbc'
    this.charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  }

  /**
   * الحصول على معرف الجهاز الحالي (متوافق مع licenseManager)
   */
  getCurrentDeviceId() {
    try {
      // استخدام نفس الطريقة المستخدمة في licenseManager
      const machineId = machineIdSync()
      const hash = crypto.createHash('sha256')
      hash.update(machineId + 'dental-clinic-license-salt-2025') // نفس APP_SALT
      return hash.digest('hex').substring(0, 32)
    } catch (error) {
      console.error('Error getting device ID:', error)
      // fallback متوافق مع licenseManager
      const fallbackData = `${process.platform}-${process.arch}-${Date.now()}`
      const hash = crypto.createHash('sha256')
      hash.update(fallbackData + 'dental-clinic-license-salt-2025')
      return hash.digest('hex').substring(0, 32)
    }
  }

  /**
   * إنشاء مفتاح ترخيص مرتبط بجهاز معين
   */
  generateDeviceBoundLicense(deviceId = null, metadata = {}) {
    try {
      const targetDeviceId = deviceId || this.getCurrentDeviceId()

      // إنشاء مفتاح باستخدام خوارزمية رياضية
      const licenseKey = this.generateAlgorithmicKey(targetDeviceId, metadata)

      console.log(`🔑 Generated device-bound license for device: ${targetDeviceId.substring(0, 8)}...`)

      return {
        licenseKey: licenseKey,
        deviceId: targetDeviceId,
        metadata: {
          licenseType: metadata.licenseType || 'STANDARD',
          region: metadata.region || 'GLOBAL',
          isLifetime: true,
          maxDevices: 1,
          ...metadata
        },
        generatedAt: new Date().toISOString()
      }

    } catch (error) {
      console.error('Error generating device-bound license:', error)
      throw error
    }
  }

  /**
   * إنشاء مفتاح خوارزمي مرتبط بالجهاز
   */
  generateAlgorithmicKey(deviceId, metadata = {}) {
    // إنشاء seed من معرف الجهاز والمفتاح الرئيسي
    const seed = deviceId + this.masterKey + (metadata.licenseType || 'STANDARD')

    // إنشاء hash أساسي
    const baseHash = crypto.createHash('sha256').update(seed).digest('hex')

    // تقسيم الـ hash إلى أجزاء (5 أحرف لكل جزء)
    const part1 = baseHash.substring(0, 5).toUpperCase()
    const part2 = baseHash.substring(8, 13).toUpperCase()
    const part3 = baseHash.substring(16, 21).toUpperCase()
    const part4 = baseHash.substring(24, 29).toUpperCase()

    // تنسيق المفتاح: XXXXX-XXXXX-XXXXX-XXXXX
    return `${part1}-${part2}-${part3}-${part4}`
  }

  /**
   * التحقق من صحة مفتاح الترخيص للجهاز الحالي
   */
  validateDeviceBoundLicense(licenseKey) {
    try {
      const currentDeviceId = this.getCurrentDeviceId()

      console.log(`🔍 Validating license for device: ${currentDeviceId.substring(0, 8)}...`)

      // التحقق الخوارزمي من المفتاح
      const isValid = this.validateAlgorithmicKey(licenseKey, currentDeviceId)

      if (!isValid) {
        console.log('❌ Algorithmic validation failed - key not bound to this device')
        return {
          isValid: false,
          error: 'License key is bound to a different device'
        }
      }

      console.log('✅ Device-bound license validation successful')

      // إنشاء بيانات ترخيص للمفتاح الصالح
      const licenseData = {
        deviceId: currentDeviceId,
        timestamp: Date.now(),
        version: '1.0.0',
        type: 'DEVICE_BOUND',
        metadata: {
          licenseType: 'ALGORITHMIC',
          region: 'GLOBAL',
          isLifetime: true,
          maxDevices: 1,
          validatedAt: new Date().toISOString()
        }
      }

      return {
        isValid: true,
        licenseData: licenseData,
        deviceId: currentDeviceId
      }

    } catch (error) {
      console.error('Error validating device-bound license:', error)
      return {
        isValid: false,
        error: 'License validation failed: ' + error.message
      }
    }
  }

  /**
   * التحقق الخوارزمي من المفتاح
   */
  validateAlgorithmicKey(licenseKey, deviceId) {
    try {
      // تجربة أنواع تراخيص مختلفة
      const licenseTypes = ['STANDARD', 'PROFESSIONAL', 'ENTERPRISE', 'PREMIUM', 'ULTIMATE', 'TEST']

      console.log(`🔍 Testing key ${licenseKey} against device ${deviceId.substring(0, 8)}...`)

      for (const licenseType of licenseTypes) {
        const expectedKey = this.generateAlgorithmicKey(deviceId, { licenseType })
        console.log(`   Testing ${licenseType}: expected ${expectedKey}`)
        if (expectedKey === licenseKey) {
          console.log(`✅ Key matches for license type: ${licenseType}`)
          return true
        }
      }

      console.log('❌ Key does not match any expected pattern for this device')
      return false

    } catch (error) {
      console.error('Algorithmic validation error:', error)
      return false
    }
  }

  /**
   * تشفير بيانات الترخيص
   */
  encryptLicenseData(data) {
    const dataString = JSON.stringify(data)
    const key = crypto.scryptSync(this.masterKey, 'salt', 32)
    const iv = crypto.randomBytes(16)

    const cipher = crypto.createCipheriv(this.algorithm, key, iv)
    let encrypted = cipher.update(dataString, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    // دمج IV مع البيانات المشفرة
    return iv.toString('hex') + ':' + encrypted
  }

  /**
   * فك تشفير بيانات الترخيص
   */
  decryptLicenseData(encryptedData) {
    try {
      const [ivHex, encrypted] = encryptedData.split(':')
      const iv = Buffer.from(ivHex, 'hex')
      const key = crypto.scryptSync(this.masterKey, 'salt', 32)

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv)
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return JSON.parse(decrypted)
    } catch (error) {
      console.error('Decryption error:', error)
      return null
    }
  }

  /**
   * تحويل البيانات المشفرة إلى تنسيق مفتاح
   */
  formatAsLicenseKey(encryptedData, deviceId) {
    // إنشاء checksum من البيانات المشفرة ومعرف الجهاز
    const checksum = crypto.createHash('md5')
      .update(encryptedData + deviceId)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase()

    // تحويل جزء من البيانات المشفرة إلى أحرف وأرقام
    const dataHash = crypto.createHash('sha256')
      .update(encryptedData)
      .digest('hex')
      .substring(0, 12)
      .toUpperCase()

    // تنسيق المفتاح: CHECKSUM-DATAHASH-DEVICEHASH
    const deviceHash = deviceId.substring(0, 8).toUpperCase()

    return `${checksum}-${dataHash.substring(0, 4)}-${dataHash.substring(4, 8)}-${dataHash.substring(8, 12)}`
  }

  /**
   * فك تشفير مفتاح الترخيص
   */
  decryptLicenseKey(licenseKey, deviceId) {
    try {
      // استخراج المكونات من المفتاح
      const parts = licenseKey.split('-')
      if (parts.length !== 4) {
        throw new Error('Invalid license key format')
      }

      const [checksum, part1, part2, part3] = parts
      const dataHash = (part1 + part2 + part3).toLowerCase()

      // إعادة بناء البيانات المشفرة من hash
      // هذا مبسط - في الواقع نحتاج لحفظ البيانات المشفرة في قاعدة بيانات
      // أو استخدام خوارزمية أكثر تعقيداً

      // للتبسيط، سنستخدم نظام تحقق مبني على الخوارزمية
      return this.validateKeyAlgorithmically(licenseKey, deviceId)

    } catch (error) {
      console.error('Error decrypting license key:', error)
      return null
    }
  }

  /**
   * التحقق الخوارزمي من المفتاح
   */
  validateKeyAlgorithmically(licenseKey, deviceId) {
    try {
      // خوارزمية تحقق مبنية على معرف الجهاز والمفتاح
      const keyHash = crypto.createHash('sha256')
        .update(licenseKey + deviceId + this.masterKey)
        .digest('hex')

      // التحقق من نمط معين في الـ hash
      const validationPattern = keyHash.substring(0, 8)
      const expectedPattern = crypto.createHash('md5')
        .update(deviceId + 'DENTAL_CLINIC_VALIDATION')
        .digest('hex')
        .substring(0, 8)

      // مقارنة الأنماط
      if (validationPattern === expectedPattern) {
        // إنشاء بيانات ترخيص افتراضية للمفتاح الصالح
        return {
          deviceId: deviceId,
          timestamp: Date.now(),
          version: '1.0.0',
          type: 'DEVICE_BOUND',
          metadata: {
            licenseType: 'ALGORITHMIC',
            region: 'GLOBAL',
            isLifetime: true,
            maxDevices: 1,
            validatedAt: new Date().toISOString()
          }
        }
      }

      return null
    } catch (error) {
      console.error('Algorithmic validation error:', error)
      return null
    }
  }

  /**
   * التحقق من صحة بيانات الترخيص
   */
  validateLicenseData(data) {
    if (!data || typeof data !== 'object') return false
    if (!data.deviceId || !data.timestamp || !data.version) return false
    if (!data.metadata || typeof data.metadata !== 'object') return false

    // التحقق من أن الترخيص لم ينته
    if (data.metadata.expiresAt && new Date(data.metadata.expiresAt) < new Date()) {
      return false
    }

    return true
  }

  /**
   * إنشاء مفتاح للجهاز الحالي
   */
  generateForCurrentDevice(metadata = {}) {
    return this.generateDeviceBoundLicense(null, metadata)
  }

  /**
   * إنشاء مفتاح لمعرف جهاز محدد
   */
  generateForDevice(deviceId, metadata = {}) {
    return this.generateDeviceBoundLicense(deviceId, metadata)
  }

  /**
   * إنشاء عدة مفاتيح لأجهزة مختلفة
   */
  generateMultipleLicenses(deviceIds, metadata = {}) {
    const licenses = []

    deviceIds.forEach((deviceId, index) => {
      const licenseMetadata = {
        ...metadata,
        keyIndex: index + 1,
        generatedInBatch: true
      }

      const license = this.generateDeviceBoundLicense(deviceId, licenseMetadata)
      licenses.push(license)
    })

    return licenses
  }
}

// إنشاء instance واحد
const deviceBoundGenerator = new DeviceBoundLicenseGenerator()

module.exports = {
  DeviceBoundLicenseGenerator,
  deviceBoundGenerator,
  generateForCurrentDevice: (metadata) => deviceBoundGenerator.generateForCurrentDevice(metadata),
  generateForDevice: (deviceId, metadata) => deviceBoundGenerator.generateForDevice(deviceId, metadata),
  validateDeviceBoundLicense: (key) => deviceBoundGenerator.validateDeviceBoundLicense(key),
  getCurrentDeviceId: () => deviceBoundGenerator.getCurrentDeviceId()
}
