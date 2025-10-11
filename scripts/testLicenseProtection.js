/**
 * اختبار حماية مفاتيح الترخيص
 * Test License Protection System
 */

const { 
  isValidLicense, 
  getLicenseInfo: getProductionLicenseInfo 
} = require('../electron/productionLicenseValidator.js')

const { 
  isLicenseAvailable, 
  markLicenseAsUsed, 
  getUsedLicenseInfo,
  resetAllData
} = require('../electron/usedLicensesTracker.js')

/**
 * محاكاة معرفات أجهزة مختلفة
 */
const MOCK_HWIDS = {
  device1: 'd164d1d5e8f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7',
  device2: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
  device3: 'f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8',
  device4: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3'
}

/**
 * اختبار تفعيل مفتاح على جهاز واحد
 */
function testSingleDeviceActivation() {
  console.log('🧪 اختبار 1: تفعيل مفتاح على جهاز واحد')
  console.log('=' .repeat(60))
  
  const testKey = 'E0420-NS3CG-78FTY-XNQNB'
  const device1 = MOCK_HWIDS.device1
  
  console.log(`🔑 المفتاح: ${testKey}`)
  console.log(`💻 الجهاز: ${device1.substring(0, 12)}...`)
  
  // التحقق من صحة المفتاح
  const isValid = isValidLicense(testKey)
  console.log(`✅ صحة المفتاح: ${isValid ? 'صالح' : 'غير صالح'}`)
  
  if (!isValid) {
    console.log('❌ المفتاح غير صالح، لا يمكن المتابعة')
    return false
  }
  
  // التحقق من التوفر
  const isAvailable = isLicenseAvailable(testKey, device1)
  console.log(`🔓 متاح للاستخدام: ${isAvailable ? 'نعم' : 'لا'}`)
  
  if (isAvailable) {
    // تسجيل الاستخدام
    const marked = markLicenseAsUsed(testKey, device1, {
      testDevice: 'device1',
      testTime: new Date().toISOString()
    })
    
    console.log(`📝 تم التسجيل: ${marked ? 'نعم' : 'لا'}`)
    
    if (marked) {
      const info = getUsedLicenseInfo(testKey)
      console.log('📋 معلومات الاستخدام:')
      console.log(`   🆔 معرف الجهاز: ${info.hwid.substring(0, 12)}...`)
      console.log(`   📅 تاريخ التفعيل: ${new Date(info.activatedAt).toLocaleString('ar-SA')}`)
    }
  }
  
  console.log('')
  return isAvailable && isValid
}

/**
 * اختبار محاولة استخدام نفس المفتاح على جهاز آخر
 */
function testSecondDeviceRejection() {
  console.log('🧪 اختبار 2: محاولة استخدام نفس المفتاح على جهاز آخر')
  console.log('=' .repeat(60))
  
  const testKey = 'E0420-NS3CG-78FTY-XNQNB'
  const device2 = MOCK_HWIDS.device2
  
  console.log(`🔑 المفتاح: ${testKey}`)
  console.log(`💻 الجهاز الثاني: ${device2.substring(0, 12)}...`)
  
  // التحقق من صحة المفتاح
  const isValid = isValidLicense(testKey)
  console.log(`✅ صحة المفتاح: ${isValid ? 'صالح' : 'غير صالح'}`)
  
  // التحقق من التوفر (يجب أن يكون غير متاح)
  const isAvailable = isLicenseAvailable(testKey, device2)
  console.log(`🔓 متاح للاستخدام: ${isAvailable ? 'نعم' : 'لا'}`)
  
  if (!isAvailable) {
    console.log('✅ النظام يعمل بشكل صحيح - المفتاح مرفوض على الجهاز الثاني')
    
    // عرض معلومات الجهاز المُسجل
    const info = getUsedLicenseInfo(testKey)
    if (info) {
      console.log('📋 المفتاح مُسجل على:')
      console.log(`   🆔 معرف الجهاز: ${info.hwid.substring(0, 12)}...`)
      console.log(`   📅 تاريخ التفعيل: ${new Date(info.activatedAt).toLocaleString('ar-SA')}`)
    }
  } else {
    console.log('❌ خطأ في النظام - المفتاح لا يجب أن يكون متاحاً!')
  }
  
  console.log('')
  return !isAvailable // النجاح يعني الرفض
}

/**
 * اختبار استخدام نفس المفتاح على نفس الجهاز مرة أخرى
 */
function testSameDeviceReactivation() {
  console.log('🧪 اختبار 3: إعادة استخدام المفتاح على نفس الجهاز')
  console.log('=' .repeat(60))
  
  const testKey = 'E0420-NS3CG-78FTY-XNQNB'
  const device1 = MOCK_HWIDS.device1
  
  console.log(`🔑 المفتاح: ${testKey}`)
  console.log(`💻 نفس الجهاز: ${device1.substring(0, 12)}...`)
  
  // التحقق من التوفر (يجب أن يكون متاحاً لنفس الجهاز)
  const isAvailable = isLicenseAvailable(testKey, device1)
  console.log(`🔓 متاح للاستخدام: ${isAvailable ? 'نعم' : 'لا'}`)
  
  if (isAvailable) {
    console.log('✅ النظام يعمل بشكل صحيح - المفتاح متاح لنفس الجهاز')
  } else {
    console.log('❌ خطأ في النظام - المفتاح يجب أن يكون متاحاً لنفس الجهاز!')
  }
  
  console.log('')
  return isAvailable
}

/**
 * اختبار مفتاح جديد على جهاز جديد
 */
function testNewKeyNewDevice() {
  console.log('🧪 اختبار 4: مفتاح جديد على جهاز جديد')
  console.log('=' .repeat(60))
  
  const testKey = '8WUY2-MYJ8G-0DNDC-QB8BA' // مفتاح جديد
  const device3 = MOCK_HWIDS.device3
  
  console.log(`🔑 المفتاح الجديد: ${testKey}`)
  console.log(`💻 الجهاز الجديد: ${device3.substring(0, 12)}...`)
  
  // التحقق من صحة المفتاح
  const isValid = isValidLicense(testKey)
  console.log(`✅ صحة المفتاح: ${isValid ? 'صالح' : 'غير صالح'}`)
  
  // التحقق من التوفر
  const isAvailable = isLicenseAvailable(testKey, device3)
  console.log(`🔓 متاح للاستخدام: ${isAvailable ? 'نعم' : 'لا'}`)
  
  if (isValid && isAvailable) {
    // تسجيل الاستخدام
    const marked = markLicenseAsUsed(testKey, device3, {
      testDevice: 'device3',
      testTime: new Date().toISOString()
    })
    
    console.log(`📝 تم التسجيل: ${marked ? 'نعم' : 'لا'}`)
    console.log('✅ النظام يعمل بشكل صحيح - مفتاح جديد يعمل على جهاز جديد')
  } else {
    console.log('❌ خطأ في النظام - مفتاح صالح يجب أن يعمل على جهاز جديد!')
  }
  
  console.log('')
  return isValid && isAvailable
}

/**
 * اختبار مفتاح غير صالح
 */
function testInvalidKey() {
  console.log('🧪 اختبار 5: مفتاح غير صالح')
  console.log('=' .repeat(60))
  
  const invalidKey = 'INVALID-KEY-TEST-1234'
  const device4 = MOCK_HWIDS.device4
  
  console.log(`🔑 المفتاح غير الصالح: ${invalidKey}`)
  console.log(`💻 الجهاز: ${device4.substring(0, 12)}...`)
  
  // التحقق من صحة المفتاح
  const isValid = isValidLicense(invalidKey)
  console.log(`✅ صحة المفتاح: ${isValid ? 'صالح' : 'غير صالح'}`)
  
  if (!isValid) {
    console.log('✅ النظام يعمل بشكل صحيح - المفتاح غير الصالح مرفوض')
  } else {
    console.log('❌ خطأ في النظام - مفتاح غير صالح لا يجب أن يُقبل!')
  }
  
  console.log('')
  return !isValid // النجاح يعني الرفض
}

/**
 * عرض ملخص النتائج
 */
function displayTestSummary(results) {
  console.log('📊 ملخص نتائج الاختبار')
  console.log('=' .repeat(60))
  
  const testNames = [
    'تفعيل مفتاح على جهاز واحد',
    'رفض المفتاح على جهاز آخر', 
    'إعادة استخدام على نفس الجهاز',
    'مفتاح جديد على جهاز جديد',
    'رفض مفتاح غير صالح'
  ]
  
  let passedTests = 0
  
  results.forEach((result, index) => {
    const status = result ? '✅ نجح' : '❌ فشل'
    console.log(`${index + 1}. ${testNames[index]}: ${status}`)
    if (result) passedTests++
  })
  
  console.log('')
  console.log(`📈 النتيجة النهائية: ${passedTests}/${results.length} اختبار نجح`)
  
  if (passedTests === results.length) {
    console.log('🎉 جميع الاختبارات نجحت! النظام يعمل بشكل مثالي!')
  } else {
    console.log('⚠️ بعض الاختبارات فشلت. يحتاج النظام إلى مراجعة.')
  }
  
  return passedTests === results.length
}

/**
 * تشغيل جميع الاختبارات
 */
function runAllTests() {
  console.log('🔐 اختبار نظام حماية مفاتيح الترخيص')
  console.log('=' .repeat(80))
  console.log(`📅 تاريخ الاختبار: ${new Date().toLocaleString('ar-SA')}`)
  console.log('')
  
  // إعادة تعيين البيانات للاختبار النظيف
  console.log('🔄 إعادة تعيين بيانات الاختبار...')
  resetAllData()
  console.log('')
  
  const results = []
  
  // تشغيل الاختبارات
  results.push(testSingleDeviceActivation())
  results.push(testSecondDeviceRejection())
  results.push(testSameDeviceReactivation())
  results.push(testNewKeyNewDevice())
  results.push(testInvalidKey())
  
  // عرض الملخص
  const allPassed = displayTestSummary(results)
  
  return allPassed
}

/**
 * الدالة الرئيسية
 */
function main() {
  const args = process.argv.slice(2)
  const testType = args[0] || 'all'
  
  switch (testType.toLowerCase()) {
    case 'single':
      testSingleDeviceActivation()
      break
      
    case 'reject':
      testSecondDeviceRejection()
      break
      
    case 'same':
      testSameDeviceReactivation()
      break
      
    case 'new':
      testNewKeyNewDevice()
      break
      
    case 'invalid':
      testInvalidKey()
      break
      
    case 'all':
    default:
      runAllTests()
      break
  }
}

// تشغيل الدالة الرئيسية
if (require.main === module) {
  main()
}

module.exports = {
  testSingleDeviceActivation,
  testSecondDeviceRejection,
  testSameDeviceReactivation,
  testNewKeyNewDevice,
  testInvalidKey,
  runAllTests
}
