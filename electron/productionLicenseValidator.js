/**
 * Production License Validator
 * يتحقق من صحة مفاتيح الترخيص من ملف الإنتاج
 */

const fs = require('fs')
const path = require('path')

class ProductionLicenseValidator {
  constructor() {
    this.productionLicenses = null
    this.loadProductionLicenses()
  }

  /**
   * تحميل مفاتيح الترخيص من ملف الإنتاج
   */
  loadProductionLicenses() {
    try {
      const licensePath = path.join(__dirname, '..', 'production-licenses.json')
      
      if (fs.existsSync(licensePath)) {
        const licenseData = JSON.parse(fs.readFileSync(licensePath, 'utf8'))
        this.productionLicenses = licenseData.licenses
        console.log(`✅ Loaded ${this.productionLicenses.length} production license keys`)
        return true
      } else {
        console.log('⚠️ Production licenses file not found')
        return false
      }
    } catch (error) {
      console.error('❌ Error loading production licenses:', error)
      return false
    }
  }

  /**
   * التحقق من صحة مفتاح الترخيص
   */
  isValidLicense(licenseKey) {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return false
    }

    if (!this.productionLicenses || !Array.isArray(this.productionLicenses)) {
      console.log('⚠️ Production licenses not loaded')
      return false
    }

    const normalizedKey = licenseKey.trim().toUpperCase()
    const isValid = this.productionLicenses.some(license => license.key === normalizedKey)
    
    console.log(`🔍 License validation: ${normalizedKey} -> ${isValid ? 'VALID' : 'INVALID'}`)
    return isValid
  }

  /**
   * الحصول على معلومات مفتاح الترخيص
   */
  getLicenseInfo(licenseKey) {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return null
    }

    if (!this.productionLicenses || !Array.isArray(this.productionLicenses)) {
      return null
    }

    const normalizedKey = licenseKey.trim().toUpperCase()
    const license = this.productionLicenses.find(l => l.key === normalizedKey)
    
    if (license) {
      return {
        key: license.key,
        id: license.id,
        hash: license.hash,
        metadata: license.metadata,
        isProduction: true,
        category: 'PRODUCTION',
        categoryInfo: {
          name: 'Production License',
          description: 'Commercial production license',
          features: ['Full Features', 'Lifetime Support', 'Commercial Use']
        }
      }
    }

    return null
  }

  /**
   * الحصول على إحصائيات المفاتيح
   */
  getStatistics() {
    if (!this.productionLicenses || !Array.isArray(this.productionLicenses)) {
      return {
        total: 0,
        loaded: false
      }
    }

    const stats = {
      total: this.productionLicenses.length,
      loaded: true,
      byType: {},
      byRegion: {}
    }

    // إحصائيات حسب النوع
    this.productionLicenses.forEach(license => {
      const type = license.metadata?.licenseType || 'UNKNOWN'
      stats.byType[type] = (stats.byType[type] || 0) + 1

      const region = license.metadata?.region || 'UNKNOWN'
      stats.byRegion[region] = (stats.byRegion[region] || 0) + 1
    })

    return stats
  }

  /**
   * البحث في المفاتيح
   */
  searchLicenses(searchTerm) {
    if (!searchTerm || !this.productionLicenses) {
      return []
    }

    const term = searchTerm.toUpperCase()
    return this.productionLicenses
      .filter(license => license.key.includes(term))
      .map(license => this.getLicenseInfo(license.key))
      .filter(info => info !== null)
  }

  /**
   * الحصول على مفتاح عشوائي
   */
  getRandomLicense() {
    if (!this.productionLicenses || this.productionLicenses.length === 0) {
      return null
    }

    const randomIndex = Math.floor(Math.random() * this.productionLicenses.length)
    const license = this.productionLicenses[randomIndex]
    return this.getLicenseInfo(license.key)
  }

  /**
   * التحقق من حالة التحميل
   */
  isLoaded() {
    return this.productionLicenses !== null && Array.isArray(this.productionLicenses)
  }

  /**
   * إعادة تحميل المفاتيح
   */
  reload() {
    this.productionLicenses = null
    return this.loadProductionLicenses()
  }
}

// إنشاء instance واحد للاستخدام
const validator = new ProductionLicenseValidator()

module.exports = {
  ProductionLicenseValidator,
  validator,
  isValidLicense: (key) => validator.isValidLicense(key),
  getLicenseInfo: (key) => validator.getLicenseInfo(key),
  getStatistics: () => validator.getStatistics(),
  searchLicenses: (term) => validator.searchLicenses(term),
  getRandomLicense: () => validator.getRandomLicense(),
  isLoaded: () => validator.isLoaded(),
  reload: () => validator.reload()
}
