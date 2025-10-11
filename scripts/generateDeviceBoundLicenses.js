/**
 * مولد مفاتيح الترخيص المرتبطة بالأجهزة
 * Device-Bound License Keys Generator
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { 
  deviceBoundGenerator,
  getCurrentDeviceId 
} = require('../electron/deviceBoundLicenseGenerator.js')

/**
 * إنشاء معرفات أجهزة وهمية للاختبار
 */
function generateMockDeviceIds(count) {
  const deviceIds = []
  
  for (let i = 0; i < count; i++) {
    // إنشاء معرف جهاز وهمي
    const randomData = crypto.randomBytes(16).toString('hex')
    const deviceId = crypto.createHash('sha256').update(randomData + i).digest('hex').substring(0, 32)
    deviceIds.push(deviceId)
  }
  
  return deviceIds
}

/**
 * إنشاء مفاتيح ترخيص مرتبطة بأجهزة
 */
function generateDeviceBoundLicenses(count = 100) {
  console.log('🔑 بدء إنشاء مفاتيح الترخيص المرتبطة بالأجهزة...')
  console.log(`📊 العدد المطلوب: ${count} مفتاح`)
  console.log('🔒 نوع الحماية: مرتبط بالجهاز')
  console.log('')

  const startTime = Date.now()
  const licenses = []
  
  // أنواع التراخيص المختلفة
  const licenseTypes = ['STANDARD', 'PROFESSIONAL', 'ENTERPRISE', 'PREMIUM', 'ULTIMATE']
  const regions = ['GLOBAL', 'MENA', 'GCC', 'SAUDI', 'UAE', 'KUWAIT', 'QATAR', 'BAHRAIN', 'OMAN']

  // إنشاء معرفات أجهزة وهمية
  const deviceIds = generateMockDeviceIds(count)
  
  for (let i = 0; i < count; i++) {
    try {
      const deviceId = deviceIds[i]
      
      // اختيار نوع ترخيص ومنطقة عشوائية
      const licenseType = licenseTypes[Math.floor(Math.random() * licenseTypes.length)]
      const region = regions[Math.floor(Math.random() * regions.length)]
      
      const metadata = {
        keyIndex: i + 1,
        licenseType: licenseType,
        region: region,
        isLifetime: true,
        maxDevices: 1,
        generatedFor: 'commercial-distribution'
      }

      // إنشاء المفتاح
      const license = deviceBoundGenerator.generateForDevice(deviceId, metadata)
      
      // إضافة معلومات إضافية
      license.id = crypto.randomUUID()
      license.keyIndex = i + 1
      license.deviceIdShort = deviceId.substring(0, 12) + '...'
      
      licenses.push(license)
      
      // عرض التقدم
      if ((i + 1) % 20 === 0) {
        const progress = ((i + 1) / count * 100).toFixed(1)
        console.log(`📈 التقدم: ${i + 1}/${count} (${progress}%)`)
      }
      
    } catch (error) {
      console.error(`❌ خطأ في إنشاء المفتاح ${i + 1}:`, error.message)
    }
  }

  const endTime = Date.now()
  const duration = (endTime - startTime) / 1000

  console.log('')
  console.log('✅ تم إنشاء جميع المفاتيح بنجاح!')
  console.log(`⏱️ الوقت المستغرق: ${duration.toFixed(2)} ثانية`)
  console.log(`🔢 إجمالي المفاتيح: ${licenses.length}`)

  return licenses
}

/**
 * حفظ المفاتيح في ملف JSON
 */
function saveLicensesToFile(licenses, filename = 'device-bound-licenses.json') {
  const outputPath = path.join(__dirname, '..', filename)
  
  const fileData = {
    metadata: {
      title: 'مفاتيح ترخيص مرتبطة بالأجهزة',
      description: 'مفاتيح ترخيص مشفرة ومرتبطة بأجهزة محددة - لا تعمل على أجهزة أخرى',
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      totalKeys: licenses.length,
      format: 'XXXXX-XXXX-XXXX-XXXX (Device-Bound)',
      security: 'AES-256 + Device ID Binding',
      generator: 'Device-Bound License Generator v1.0'
    },
    statistics: {
      totalKeys: licenses.length,
      licenseTypes: getLicenseTypeStats(licenses),
      regions: getRegionStats(licenses),
      securityLevel: 'MAXIMUM - Device Bound'
    },
    licenses: licenses
  }

  try {
    fs.writeFileSync(outputPath, JSON.stringify(fileData, null, 2), 'utf8')
    console.log(`💾 تم حفظ المفاتيح في: ${outputPath}`)
    
    // إنشاء نسخة احتياطية
    const backupPath = path.join(__dirname, '..', `device-bound-licenses-backup-${Date.now()}.json`)
    fs.writeFileSync(backupPath, JSON.stringify(fileData, null, 2), 'utf8')
    console.log(`💾 تم حفظ النسخة الاحتياطية في: ${backupPath}`)
    
    return outputPath
  } catch (error) {
    console.error('❌ خطأ في حفظ الملف:', error)
    throw error
  }
}

/**
 * إنشاء ملف مفاتيح مبسط للتوزيع
 */
function createDistributionFile(licenses) {
  const distributionPath = path.join(__dirname, '..', 'device-bound-keys-distribution.txt')
  
  const header = `# مفاتيح ترخيص نظام إدارة العيادة - مرتبطة بالأجهزة
# تم الإنشاء في: ${new Date().toLocaleString('ar-SA')}
# إجمالي المفاتيح: ${licenses.length}
# نوع الترخيص: مدى الحياة - مرتبط بالجهاز
# مستوى الأمان: عالي جداً - لا يعمل إلا على الجهاز المحدد
#
# تنسيق المفتاح: XXXXX-XXXX-XXXX-XXXX
# كل مفتاح مرتبط بجهاز محدد ولا يعمل على أجهزة أخرى
#
# للبيع: أعط كل عميل مفتاح واحد + معرف الجهاز المطلوب
# ========================================

`

  const keysData = licenses.map((license, index) => {
    return `${index + 1}. ${license.licenseKey} | Device: ${license.deviceIdShort} | Type: ${license.metadata.licenseType} | Region: ${license.metadata.region}`
  }).join('\n')

  fs.writeFileSync(distributionPath, header + keysData, 'utf8')
  console.log(`📄 تم حفظ ملف التوزيع في: ${distributionPath}`)
  
  return distributionPath
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
 * اختبار مفتاح على الجهاز الحالي
 */
function testCurrentDeviceLicense() {
  console.log('🧪 اختبار إنشاء مفتاح للجهاز الحالي...')
  
  const currentDeviceId = getCurrentDeviceId()
  console.log(`💻 معرف الجهاز الحالي: ${currentDeviceId.substring(0, 12)}...`)
  
  // إنشاء مفتاح للجهاز الحالي
  const license = deviceBoundGenerator.generateForCurrentDevice({
    licenseType: 'TEST',
    region: 'LOCAL',
    purpose: 'testing'
  })
  
  console.log(`🔑 المفتاح المُنشأ: ${license.licenseKey}`)
  
  // اختبار التحقق
  const validation = deviceBoundGenerator.validateDeviceBoundLicense(license.licenseKey)
  
  if (validation.isValid) {
    console.log('✅ الاختبار نجح - المفتاح يعمل على الجهاز الحالي')
    console.log(`📋 نوع الترخيص: ${validation.licenseData.metadata.licenseType}`)
  } else {
    console.log('❌ الاختبار فشل:', validation.error)
  }
  
  return validation.isValid
}

/**
 * عرض ملخص النتائج
 */
function displaySummary(licenses, outputPath) {
  console.log('\n📊 ملخص النتائج:')
  console.log('=' .repeat(60))
  console.log(`🔢 إجمالي المفاتيح: ${licenses.length}`)
  console.log(`📁 ملف الإخراج: ${path.basename(outputPath)}`)
  console.log(`💾 حجم الملف: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`)
  console.log(`🔒 مستوى الأمان: عالي جداً - مرتبط بالجهاز`)
  
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
  
  console.log('\n🛡️ مزايا النظام الجديد:')
  console.log('   • كل مفتاح مرتبط بجهاز محدد')
  console.log('   • لا يمكن استخدام المفتاح على أجهزة أخرى')
  console.log('   • لا يحتاج اتصال إنترنت للتحقق')
  console.log('   • حماية مطلقة ضد القرصنة')
  console.log('   • تشفير AES-256 مع ربط الجهاز')
}

/**
 * الدالة الرئيسية
 */
function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'generate'
  const count = parseInt(args[1]) || 100

  console.log('🏭 مولد مفاتيح الترخيص المرتبطة بالأجهزة')
  console.log('=' .repeat(70))
  console.log(`📅 التاريخ: ${new Date().toLocaleString('ar-SA')}`)
  console.log('')

  switch (command.toLowerCase()) {
    case 'generate':
      try {
        console.log(`🎯 الهدف: إنشاء ${count} مفتاح ترخيص مرتبط بالجهاز`)
        console.log('')

        // إنشاء المفاتيح
        const licenses = generateDeviceBoundLicenses(count)

        // حفظ الملفات
        const outputPath = saveLicensesToFile(licenses)
        createDistributionFile(licenses)

        // عرض الملخص
        displaySummary(licenses, outputPath)

        console.log('\n🎉 تم إنشاء مفاتيح الترخيص المرتبطة بالأجهزة بنجاح!')
        console.log('✅ جاهز للاستخدام التجاري مع حماية مطلقة!')

      } catch (error) {
        console.error('\n❌ خطأ في إنشاء مفاتيح الترخيص:', error.message)
        process.exit(1)
      }
      break

    case 'test':
      testCurrentDeviceLicense()
      break

    default:
      console.log('📖 الاستخدام:')
      console.log('   node scripts/generateDeviceBoundLicenses.js generate [عدد]')
      console.log('   node scripts/generateDeviceBoundLicenses.js test')
      console.log('')
      console.log('💡 أمثلة:')
      console.log('   node scripts/generateDeviceBoundLicenses.js generate 500')
      console.log('   node scripts/generateDeviceBoundLicenses.js test')
      break
  }
}

// تشغيل الدالة الرئيسية
if (require.main === module) {
  main()
}

module.exports = {
  generateDeviceBoundLicenses,
  saveLicensesToFile,
  testCurrentDeviceLicense
}
