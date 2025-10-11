/**
 * مولد مفاتيح الترخيص للإنتاج
 * Production License Keys Generator
 * 
 * ينشئ 1000 مفتاح ترخيص عشوائي تماماً لا يمكن التنبؤ به
 * للاستخدام في بيع النسخ التجارية
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// إعدادات المولد
const CONFIG = {
  totalKeys: 1000,
  outputFile: 'production-licenses.json',
  backupFile: 'production-licenses-backup.json',
  charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  segmentLength: 5,
  segmentCount: 4,
  useSecureRandom: true
}

/**
 * إنشاء حرف عشوائي آمن
 */
function getSecureRandomChar() {
  const randomBytes = crypto.randomBytes(1)
  const randomIndex = randomBytes[0] % CONFIG.charset.length
  return CONFIG.charset[randomIndex]
}

/**
 * إنشاء مقطع عشوائي آمن (5 أحرف)
 */
function generateSecureSegment() {
  let segment = ''
  for (let i = 0; i < CONFIG.segmentLength; i++) {
    segment += getSecureRandomChar()
  }
  return segment
}

/**
 * إنشاء مفتاح ترخيص عشوائي آمن
 */
function generateSecureLicenseKey() {
  const segments = []
  for (let i = 0; i < CONFIG.segmentCount; i++) {
    segments.push(generateSecureSegment())
  }
  return segments.join('-')
}

/**
 * التحقق من عدم تكرار المفتاح
 */
function isUniqueKey(key, existingKeys) {
  return !existingKeys.has(key)
}

/**
 * إنشاء معرف فريد للمفتاح
 */
function generateKeyId() {
  return crypto.randomUUID()
}

/**
 * إنشاء hash للمفتاح للتحقق من الصحة
 */
function generateKeyHash(key) {
  return crypto.createHash('sha256').update(key + 'dental-clinic-salt-2025').digest('hex')
}

/**
 * إنشاء معلومات إضافية للمفتاح
 */
function generateKeyMetadata(keyIndex) {
  const creationDate = new Date().toISOString()
  const expiryDate = null // مدى الحياة
  
  // أنواع الترخيص العشوائية
  const licenseTypes = [
    'STANDARD',
    'PROFESSIONAL', 
    'ENTERPRISE',
    'PREMIUM',
    'ULTIMATE'
  ]
  
  const regions = [
    'GLOBAL',
    'MENA',
    'GCC',
    'SAUDI',
    'UAE',
    'KUWAIT',
    'QATAR',
    'BAHRAIN',
    'OMAN'
  ]
  
  return {
    keyIndex: keyIndex + 1,
    licenseType: licenseTypes[Math.floor(Math.random() * licenseTypes.length)],
    region: regions[Math.floor(Math.random() * regions.length)],
    maxDevices: 1, // مفتاح واحد لجهاز واحد
    isLifetime: true,
    createdAt: creationDate,
    expiresAt: expiryDate,
    isActive: true,
    isUsed: false,
    usedAt: null,
    usedBy: null,
    deviceId: null
  }
}

/**
 * إنشاء مجموعة مفاتيح الترخيص
 */
function generateProductionLicenses() {
  console.log('🔑 بدء إنشاء مفاتيح الترخيص للإنتاج...')
  console.log(`📊 العدد المطلوب: ${CONFIG.totalKeys} مفتاح`)
  console.log('🔒 استخدام التشفير الآمن: نعم')
  console.log('')

  const licenses = []
  const existingKeys = new Set()
  const startTime = Date.now()

  for (let i = 0; i < CONFIG.totalKeys; i++) {
    let attempts = 0
    let licenseKey
    
    // التأكد من عدم التكرار
    do {
      licenseKey = generateSecureLicenseKey()
      attempts++
      
      if (attempts > 100) {
        console.error(`❌ فشل في إنشاء مفتاح فريد بعد ${attempts} محاولة`)
        process.exit(1)
      }
    } while (!isUniqueKey(licenseKey, existingKeys))
    
    existingKeys.add(licenseKey)
    
    // إنشاء بيانات المفتاح
    const keyData = {
      id: generateKeyId(),
      key: licenseKey,
      hash: generateKeyHash(licenseKey),
      metadata: generateKeyMetadata(i)
    }
    
    licenses.push(keyData)
    
    // عرض التقدم
    if ((i + 1) % 100 === 0) {
      const progress = ((i + 1) / CONFIG.totalKeys * 100).toFixed(1)
      console.log(`📈 التقدم: ${i + 1}/${CONFIG.totalKeys} (${progress}%)`)
    }
  }

  const endTime = Date.now()
  const duration = (endTime - startTime) / 1000

  console.log('')
  console.log('✅ تم إنشاء جميع المفاتيح بنجاح!')
  console.log(`⏱️ الوقت المستغرق: ${duration.toFixed(2)} ثانية`)
  console.log(`🔢 إجمالي المفاتيح: ${licenses.length}`)
  console.log(`🔒 مفاتيح فريدة: ${existingKeys.size}`)

  return licenses
}

/**
 * حفظ المفاتيح في ملف JSON
 */
function saveLicensesToFile(licenses, filename) {
  const outputPath = path.join(__dirname, '..', filename)
  
  const fileData = {
    metadata: {
      title: 'مفاتيح ترخيص نظام إدارة العيادة',
      description: 'مفاتيح ترخيص للاستخدام التجاري - مدى الحياة',
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      totalKeys: licenses.length,
      format: 'XXXXX-XXXXX-XXXXX-XXXXX',
      isLifetime: true,
      maxDevicesPerKey: 1,
      generator: 'Production License Generator v1.0'
    },
    statistics: {
      totalKeys: licenses.length,
      activeKeys: licenses.filter(l => l.metadata.isActive).length,
      usedKeys: licenses.filter(l => l.metadata.isUsed).length,
      availableKeys: licenses.filter(l => l.metadata.isActive && !l.metadata.isUsed).length,
      licenseTypes: getLicenseTypeStats(licenses),
      regions: getRegionStats(licenses)
    },
    licenses: licenses
  }

  try {
    fs.writeFileSync(outputPath, JSON.stringify(fileData, null, 2), 'utf8')
    console.log(`💾 تم حفظ المفاتيح في: ${outputPath}`)
    
    // إنشاء نسخة احتياطية
    const backupPath = path.join(__dirname, '..', CONFIG.backupFile)
    fs.writeFileSync(backupPath, JSON.stringify(fileData, null, 2), 'utf8')
    console.log(`💾 تم حفظ النسخة الاحتياطية في: ${backupPath}`)
    
    return outputPath
  } catch (error) {
    console.error('❌ خطأ في حفظ الملف:', error)
    throw error
  }
}

/**
 * إحصائيات أنواع التراخيص
 */
function getLicenseTypeStats(licenses) {
  const stats = {}
  licenses.forEach(license => {
    const type = license.metadata.licenseType
    stats[type] = (stats[type] || 0) + 1
  })
  return stats
}

/**
 * إحصائيات المناطق
 */
function getRegionStats(licenses) {
  const stats = {}
  licenses.forEach(license => {
    const region = license.metadata.region
    stats[region] = (stats[region] || 0) + 1
  })
  return stats
}

/**
 * إنشاء ملف مفاتيح مبسط للتوزيع
 */
function createSimplifiedKeysFile(licenses) {
  const simplifiedPath = path.join(__dirname, '..', 'simple-license-keys.txt')
  
  const keysOnly = licenses.map(license => license.key).join('\n')
  
  const header = `# مفاتيح ترخيص نظام إدارة العيادة
# تم الإنشاء في: ${new Date().toLocaleString('ar-SA')}
# إجمالي المفاتيح: ${licenses.length}
# نوع الترخيص: مدى الحياة
# ملاحظة: كل مفتاح يعمل على جهاز واحد فقط
#
# تنسيق المفتاح: XXXXX-XXXXX-XXXXX-XXXXX
# مثال: ABCDE-12345-FGHIJ-67890
#
# ========================================

`

  fs.writeFileSync(simplifiedPath, header + keysOnly, 'utf8')
  console.log(`📄 تم حفظ ملف المفاتيح المبسط في: ${simplifiedPath}`)
  
  return simplifiedPath
}

/**
 * التحقق من صحة المفاتيح المُنشأة
 */
function validateGeneratedKeys(licenses) {
  console.log('\n🔍 التحقق من صحة المفاتيح المُنشأة...')
  
  const regex = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/
  let validCount = 0
  let invalidKeys = []
  
  licenses.forEach((license, index) => {
    if (regex.test(license.key)) {
      validCount++
    } else {
      invalidKeys.push({ index, key: license.key })
    }
  })
  
  console.log(`✅ مفاتيح صالحة: ${validCount}/${licenses.length}`)
  
  if (invalidKeys.length > 0) {
    console.log(`❌ مفاتيح غير صالحة: ${invalidKeys.length}`)
    invalidKeys.forEach(invalid => {
      console.log(`   ${invalid.index}: ${invalid.key}`)
    })
    return false
  }
  
  console.log('✅ جميع المفاتيح صالحة!')
  return true
}

/**
 * عرض ملخص النتائج
 */
function displaySummary(licenses, outputPath) {
  console.log('\n📊 ملخص النتائج:')
  console.log('=' .repeat(50))
  console.log(`🔢 إجمالي المفاتيح: ${licenses.length}`)
  console.log(`📁 ملف الإخراج: ${path.basename(outputPath)}`)
  console.log(`💾 حجم الملف: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`)
  
  console.log('\n📈 إحصائيات أنواع التراخيص:')
  const typeStats = getLicenseTypeStats(licenses)
  Object.entries(typeStats).forEach(([type, count]) => {
    console.log(`   ${type}: ${count} مفتاح`)
  })
  
  console.log('\n🌍 إحصائيات المناطق:')
  const regionStats = getRegionStats(licenses)
  Object.entries(regionStats).forEach(([region, count]) => {
    console.log(`   ${region}: ${count} مفتاح`)
  })
  
  console.log('\n💡 نصائح للاستخدام:')
  console.log('   • احتفظ بنسخة احتياطية من الملف')
  console.log('   • لا تشارك المفاتيح قبل البيع')
  console.log('   • كل مفتاح يعمل على جهاز واحد فقط')
  console.log('   • المفاتيح صالحة مدى الحياة')
  console.log('   • استخدم نظام تتبع لإدارة المفاتيح المباعة')
}

/**
 * الدالة الرئيسية
 */
function main() {
  const args = process.argv.slice(2)
  const requestedCount = parseInt(args[0]) || CONFIG.totalKeys

  console.log('🏭 مولد مفاتيح الترخيص للإنتاج')
  console.log('=' .repeat(60))
  console.log(`📅 التاريخ: ${new Date().toLocaleString('ar-SA')}`)
  console.log(`🎯 الهدف: إنشاء ${requestedCount} مفتاح ترخيص`)
  console.log('')

  try {
    // تحديث العدد المطلوب
    CONFIG.totalKeys = requestedCount

    // إنشاء المفاتيح
    const licenses = generateProductionLicenses()

    // التحقق من الصحة
    if (!validateGeneratedKeys(licenses)) {
      throw new Error('فشل في التحقق من صحة المفاتيح')
    }

    // حفظ الملفات
    const outputPath = saveLicensesToFile(licenses, CONFIG.outputFile)
    createSimplifiedKeysFile(licenses)

    // عرض الملخص
    displaySummary(licenses, outputPath)

    console.log('\n🎉 تم إنشاء مفاتيح الترخيص بنجاح!')
    console.log('✅ جاهز للاستخدام التجاري')

  } catch (error) {
    console.error('\n❌ خطأ في إنشاء مفاتيح الترخيص:', error.message)
    process.exit(1)
  }
}

// تشغيل الدالة الرئيسية
if (require.main === module) {
  main()
}

module.exports = {
  generateProductionLicenses,
  generateSecureLicenseKey,
  saveLicensesToFile,
  validateGeneratedKeys
}
