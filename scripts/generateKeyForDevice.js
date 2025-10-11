/**
 * إنشاء مفتاح ترخيص لمعرف جهاز محدد
 * Generate License Key for Specific Device ID
 */

const { generateForDevice } = require('../electron/deviceBoundLicenseGenerator.js')

/**
 * إنشاء مفتاح لمعرف جهاز محدد
 */
function generateKeyForSpecificDevice(deviceId, licenseType = 'STANDARD', region = 'GLOBAL') {
  try {
    console.log('🔑 إنشاء مفتاح ترخيص لجهاز محدد...')
    console.log(`💻 معرف الجهاز: ${deviceId.substring(0, 12)}...`)
    console.log(`📋 نوع الترخيص: ${licenseType}`)
    console.log(`🌍 المنطقة: ${region}`)
    console.log('')

    const license = generateForDevice(deviceId, {
      licenseType: licenseType,
      region: region,
      purpose: 'customer-specific',
      generatedBy: 'manual-request'
    })

    console.log('✅ تم إنشاء المفتاح بنجاح!')
    console.log('')
    console.log('📋 تفاصيل الترخيص:')
    console.log('=' .repeat(50))
    console.log(`🔑 المفتاح: ${license.licenseKey}`)
    console.log(`💻 معرف الجهاز: ${license.deviceId}`)
    console.log(`📅 تاريخ الإنشاء: ${new Date(license.generatedAt).toLocaleString('ar-SA')}`)
    console.log(`📋 نوع الترخيص: ${license.metadata.licenseType}`)
    console.log(`🌍 المنطقة: ${license.metadata.region}`)
    console.log(`⏰ صالح: مدى الحياة`)
    console.log(`🔒 مرتبط بالجهاز: نعم`)
    console.log('=' .repeat(50))
    console.log('')
    console.log('📧 أرسل هذا المفتاح للعميل:')
    console.log('🎯 ' + license.licenseKey)
    console.log('')
    console.log('💡 ملاحظات للعميل:')
    console.log('   • هذا المفتاح يعمل على جهازك فقط')
    console.log('   • أدخل المفتاح في شاشة تفعيل الترخيص')
    console.log('   • الترخيص صالح مدى الحياة')
    console.log('   • لا يحتاج اتصال إنترنت للتفعيل')

    return license

  } catch (error) {
    console.error('❌ خطأ في إنشاء المفتاح:', error.message)
    throw error
  }
}

/**
 * إنشاء عدة مفاتيح لأجهزة مختلفة
 */
function generateKeysForMultipleDevices(deviceIds, licenseType = 'STANDARD', region = 'GLOBAL') {
  console.log('🔑 إنشاء مفاتيح ترخيص لعدة أجهزة...')
  console.log(`📊 عدد الأجهزة: ${deviceIds.length}`)
  console.log(`📋 نوع الترخيص: ${licenseType}`)
  console.log(`🌍 المنطقة: ${region}`)
  console.log('')

  const licenses = []

  deviceIds.forEach((deviceId, index) => {
    try {
      console.log(`📱 الجهاز ${index + 1}/${deviceIds.length}: ${deviceId.substring(0, 12)}...`)
      
      const license = generateForDevice(deviceId, {
        licenseType: licenseType,
        region: region,
        purpose: 'bulk-generation',
        batchIndex: index + 1
      })

      licenses.push({
        deviceId: deviceId,
        licenseKey: license.licenseKey,
        metadata: license.metadata,
        generatedAt: license.generatedAt
      })

      console.log(`   🔑 المفتاح: ${license.licenseKey}`)

    } catch (error) {
      console.error(`   ❌ خطأ في الجهاز ${index + 1}: ${error.message}`)
    }
  })

  console.log('')
  console.log('✅ تم إنشاء جميع المفاتيح!')
  console.log(`📊 نجح: ${licenses.length}/${deviceIds.length}`)

  return licenses
}

/**
 * عرض تعليمات الاستخدام
 */
function displayUsage() {
  console.log('📖 أداة إنشاء مفتاح ترخيص لجهاز محدد')
  console.log('=' .repeat(60))
  console.log('')
  console.log('🔧 الاستخدام:')
  console.log('   node scripts/generateKeyForDevice.js [معرف_الجهاز] [نوع_الترخيص] [المنطقة]')
  console.log('')
  console.log('📋 المعاملات:')
  console.log('   معرف_الجهاز    - معرف الجهاز الذي حصلت عليه من العميل (مطلوب)')
  console.log('   نوع_الترخيص    - نوع الترخيص (اختياري، افتراضي: STANDARD)')
  console.log('   المنطقة        - المنطقة الجغرافية (اختياري، افتراضي: GLOBAL)')
  console.log('')
  console.log('📋 أنواع التراخيص المتاحة:')
  console.log('   STANDARD      - ترخيص عادي')
  console.log('   PROFESSIONAL  - ترخيص احترافي')
  console.log('   ENTERPRISE    - ترخيص مؤسسي')
  console.log('   PREMIUM       - ترخيص مميز')
  console.log('   ULTIMATE      - ترخيص شامل')
  console.log('')
  console.log('🌍 المناطق المتاحة:')
  console.log('   GLOBAL        - عالمي')
  console.log('   SAUDI         - السعودية')
  console.log('   UAE           - الإمارات')
  console.log('   KUWAIT        - الكويت')
  console.log('   QATAR         - قطر')
  console.log('   BAHRAIN       - البحرين')
  console.log('   OMAN          - عمان')
  console.log('   GCC           - دول الخليج')
  console.log('   MENA          - الشرق الأوسط وشمال أفريقيا')
  console.log('')
  console.log('💡 أمثلة:')
  console.log('   # مفتاح عادي عالمي')
  console.log('   node scripts/generateKeyForDevice.js 40677b86a3f4d164d1d5e8f9a2b3c4d5')
  console.log('')
  console.log('   # مفتاح احترافي سعودي')
  console.log('   node scripts/generateKeyForDevice.js 40677b86a3f4d164d1d5e8f9a2b3c4d5 PROFESSIONAL SAUDI')
  console.log('')
  console.log('   # مفتاح مميز إماراتي')
  console.log('   node scripts/generateKeyForDevice.js 40677b86a3f4d164d1d5e8f9a2b3c4d5 PREMIUM UAE')
  console.log('')
  console.log('🔍 كيفية الحصول على معرف الجهاز:')
  console.log('   1. العميل يشغل التطبيق')
  console.log('   2. يظهر معرف الجهاز في شاشة تفعيل الترخيص')
  console.log('   3. العميل ينسخ المعرف ويرسله لك')
  console.log('   4. تستخدم هذه الأداة لإنشاء مفتاح مخصص')
  console.log('   5. ترسل المفتاح للعميل')
}

/**
 * التحقق من صحة معرف الجهاز
 */
function validateDeviceId(deviceId) {
  if (!deviceId || typeof deviceId !== 'string') {
    return false
  }

  // يجب أن يكون 32 حرف hex
  const regex = /^[a-f0-9]{32}$/i
  return regex.test(deviceId)
}

/**
 * الدالة الرئيسية
 */
function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    displayUsage()
    return
  }

  const deviceId = args[0]
  const licenseType = args[1] || 'STANDARD'
  const region = args[2] || 'GLOBAL'

  // التحقق من صحة معرف الجهاز
  if (!validateDeviceId(deviceId)) {
    console.error('❌ معرف الجهاز غير صالح!')
    console.error('💡 يجب أن يكون معرف الجهاز مكون من 32 حرف hex')
    console.error('📋 مثال صحيح: 40677b86a3f4d164d1d5e8f9a2b3c4d5')
    console.error('')
    console.error('🔍 للحصول على التعليمات الكاملة:')
    console.error('   node scripts/generateKeyForDevice.js help')
    process.exit(1)
  }

  // التحقق من نوع الترخيص
  const validLicenseTypes = ['STANDARD', 'PROFESSIONAL', 'ENTERPRISE', 'PREMIUM', 'ULTIMATE']
  if (!validLicenseTypes.includes(licenseType.toUpperCase())) {
    console.error(`❌ نوع الترخيص غير صالح: ${licenseType}`)
    console.error(`📋 الأنواع المتاحة: ${validLicenseTypes.join(', ')}`)
    process.exit(1)
  }

  // التحقق من المنطقة
  const validRegions = ['GLOBAL', 'SAUDI', 'UAE', 'KUWAIT', 'QATAR', 'BAHRAIN', 'OMAN', 'GCC', 'MENA']
  if (!validRegions.includes(region.toUpperCase())) {
    console.error(`❌ المنطقة غير صالحة: ${region}`)
    console.error(`🌍 المناطق المتاحة: ${validRegions.join(', ')}`)
    process.exit(1)
  }

  try {
    generateKeyForSpecificDevice(deviceId, licenseType.toUpperCase(), region.toUpperCase())
  } catch (error) {
    console.error('❌ فشل في إنشاء المفتاح:', error.message)
    process.exit(1)
  }
}

// تشغيل الدالة الرئيسية
if (require.main === module) {
  main()
}

module.exports = {
  generateKeyForSpecificDevice,
  generateKeysForMultipleDevices,
  validateDeviceId
}
