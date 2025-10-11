/**
 * Used Licenses Tracker
 * يتتبع المفاتيح المُستخدمة لمنع استخدامها على أجهزة متعددة
 */

const fs = require('fs')
const path = require('path')
const { createHash } = require('crypto')

class UsedLicensesTracker {
  constructor() {
    this.usedLicensesFile = path.join(__dirname, '..', 'used-licenses.json')
    this.usedLicenses = this.loadUsedLicenses()
  }

  /**
   * تحميل قائمة المفاتيح المُستخدمة
   */
  loadUsedLicenses() {
    try {
      if (fs.existsSync(this.usedLicensesFile)) {
        const data = fs.readFileSync(this.usedLicensesFile, 'utf8')
        const parsed = JSON.parse(data)
        console.log(`📋 Loaded ${Object.keys(parsed.usedLicenses || {}).length} used licenses`)
        return parsed.usedLicenses || {}
      } else {
        console.log('📋 No used licenses file found, creating new tracker')
        return {}
      }
    } catch (error) {
      console.error('❌ Error loading used licenses:', error)
      return {}
    }
  }

  /**
   * حفظ قائمة المفاتيح المُستخدمة
   */
  saveUsedLicenses() {
    try {
      const data = {
        metadata: {
          title: 'Used License Keys Tracker',
          description: 'Tracks which license keys have been activated and on which devices',
          lastUpdated: new Date().toISOString(),
          totalUsedKeys: Object.keys(this.usedLicenses).length
        },
        usedLicenses: this.usedLicenses
      }

      console.log(`💾 Attempting to save to: ${this.usedLicensesFile}`)
      console.log(`📊 Data to save: ${Object.keys(this.usedLicenses).length} used licenses`)

      fs.writeFileSync(this.usedLicensesFile, JSON.stringify(data, null, 2), 'utf8')
      console.log(`✅ Successfully saved ${Object.keys(this.usedLicenses).length} used licenses`)
      return true
    } catch (error) {
      console.error('❌ Error saving used licenses:', error)
      console.error('❌ File path:', this.usedLicensesFile)
      console.error('❌ Error details:', error.message)
      return false
    }
  }

  /**
   * إنشاء hash للمفتاح (للأمان)
   */
  hashLicenseKey(licenseKey) {
    return createHash('sha256').update(licenseKey + 'dental-clinic-salt-2025').digest('hex')
  }

  /**
   * التحقق من أن المفتاح غير مُستخدم
   */
  isLicenseAvailable(licenseKey, currentHWID) {
    if (!licenseKey || !currentHWID) {
      return false
    }

    const hashedKey = this.hashLicenseKey(licenseKey.trim().toUpperCase())
    const usedLicense = this.usedLicenses[hashedKey]

    if (!usedLicense) {
      // المفتاح غير مُستخدم - متاح
      console.log(`✅ License key is available: ${licenseKey}`)
      return true
    }

    // التحقق من أن نفس الجهاز
    if (usedLicense.hwid === currentHWID) {
      console.log(`✅ License key already activated on this device: ${licenseKey}`)
      return true
    }

    // المفتاح مُستخدم على جهاز آخر
    console.log(`❌ License key already used on different device: ${licenseKey}`)
    console.log(`   Current HWID: ${currentHWID}`)
    console.log(`   Registered HWID: ${usedLicense.hwid}`)
    console.log(`   Activated on: ${usedLicense.activatedAt}`)

    return false
  }

  /**
   * تسجيل استخدام مفتاح
   */
  markLicenseAsUsed(licenseKey, hwid, additionalData = {}) {
    if (!licenseKey || !hwid) {
      return false
    }

    const hashedKey = this.hashLicenseKey(licenseKey.trim().toUpperCase())
    const now = new Date().toISOString()

    this.usedLicenses[hashedKey] = {
      hwid: hwid,
      activatedAt: now,
      lastValidated: now,
      activationCount: (this.usedLicenses[hashedKey]?.activationCount || 0) + 1,
      ...additionalData
    }

    const saved = this.saveUsedLicenses()

    if (saved) {
      console.log(`📝 License marked as used: ${licenseKey} on device ${hwid}`)
    }

    return saved
  }

  /**
   * تحديث آخر تحقق من المفتاح
   */
  updateLastValidation(licenseKey, hwid) {
    if (!licenseKey || !hwid) {
      return false
    }

    const hashedKey = this.hashLicenseKey(licenseKey.trim().toUpperCase())
    const usedLicense = this.usedLicenses[hashedKey]

    if (usedLicense && usedLicense.hwid === hwid) {
      usedLicense.lastValidated = new Date().toISOString()
      usedLicense.validationCount = (usedLicense.validationCount || 0) + 1

      return this.saveUsedLicenses()
    }

    return false
  }

  /**
   * إلغاء تسجيل مفتاح (للدعم الفني)
   */
  releaseLicense(licenseKey) {
    if (!licenseKey) {
      return false
    }

    const hashedKey = this.hashLicenseKey(licenseKey.trim().toUpperCase())

    if (this.usedLicenses[hashedKey]) {
      delete this.usedLicenses[hashedKey]
      const saved = this.saveUsedLicenses()

      if (saved) {
        console.log(`🔓 License released: ${licenseKey}`)
      }

      return saved
    }

    console.log(`⚠️ License not found in used licenses: ${licenseKey}`)
    return false
  }

  /**
   * الحصول على معلومات مفتاح مُستخدم
   */
  getUsedLicenseInfo(licenseKey) {
    if (!licenseKey) {
      return null
    }

    const hashedKey = this.hashLicenseKey(licenseKey.trim().toUpperCase())
    const usedLicense = this.usedLicenses[hashedKey]

    if (usedLicense) {
      return {
        hwid: usedLicense.hwid,
        activatedAt: usedLicense.activatedAt,
        lastValidated: usedLicense.lastValidated,
        activationCount: usedLicense.activationCount || 1,
        validationCount: usedLicense.validationCount || 0
      }
    }

    return null
  }

  /**
   * الحصول على إحصائيات الاستخدام
   */
  getUsageStatistics() {
    const totalUsed = Object.keys(this.usedLicenses).length
    const deviceCounts = {}
    const activationDates = {}

    Object.values(this.usedLicenses).forEach(license => {
      // إحصائيات الأجهزة
      const devicePrefix = license.hwid.substring(0, 8)
      deviceCounts[devicePrefix] = (deviceCounts[devicePrefix] || 0) + 1

      // إحصائيات التواريخ
      const date = license.activatedAt.split('T')[0]
      activationDates[date] = (activationDates[date] || 0) + 1
    })

    return {
      totalUsedLicenses: totalUsed,
      uniqueDevices: Object.keys(deviceCounts).length,
      activationsByDate: activationDates,
      recentActivations: this.getRecentActivations(7) // آخر 7 أيام
    }
  }

  /**
   * الحصول على التفعيلات الحديثة
   */
  getRecentActivations(days = 7) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    return Object.values(this.usedLicenses)
      .filter(license => new Date(license.activatedAt) >= cutoffDate)
      .sort((a, b) => new Date(b.activatedAt) - new Date(a.activatedAt))
      .slice(0, 10) // أحدث 10 تفعيلات
  }

  /**
   * تنظيف البيانات القديمة (اختياري)
   */
  cleanup(olderThanDays = 365) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    let cleanedCount = 0
    const newUsedLicenses = {}

    Object.entries(this.usedLicenses).forEach(([hashedKey, license]) => {
      if (new Date(license.lastValidated || license.activatedAt) >= cutoffDate) {
        newUsedLicenses[hashedKey] = license
      } else {
        cleanedCount++
      }
    })

    if (cleanedCount > 0) {
      this.usedLicenses = newUsedLicenses
      this.saveUsedLicenses()
      console.log(`🧹 Cleaned up ${cleanedCount} old license records`)
    }

    return cleanedCount
  }

  /**
   * إعادة تعيين جميع البيانات (للاختبار فقط)
   */
  resetAllData() {
    this.usedLicenses = {}
    const saved = this.saveUsedLicenses()

    if (saved) {
      console.log('🔄 All used licenses data has been reset')
    }

    return saved
  }
}

// إنشاء instance واحد للاستخدام
const tracker = new UsedLicensesTracker()

module.exports = {
  UsedLicensesTracker,
  tracker,
  isLicenseAvailable: (key, hwid) => tracker.isLicenseAvailable(key, hwid),
  markLicenseAsUsed: (key, hwid, data) => tracker.markLicenseAsUsed(key, hwid, data),
  updateLastValidation: (key, hwid) => tracker.updateLastValidation(key, hwid),
  releaseLicense: (key) => tracker.releaseLicense(key),
  getUsedLicenseInfo: (key) => tracker.getUsedLicenseInfo(key),
  getUsageStatistics: () => tracker.getUsageStatistics(),
  resetAllData: () => tracker.resetAllData()
}
