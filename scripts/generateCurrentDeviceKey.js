/**
 * إنشاء مفتاح ترخيص للجهاز الحالي
 */

const { generateForCurrentDevice, getCurrentDeviceId } = require('../electron/deviceBoundLicenseGenerator.js')

console.log('🔑 إنشاء مفتاح ترخيص للجهاز الحالي...')

const deviceId = getCurrentDeviceId()
console.log(`💻 معرف الجهاز: ${deviceId.substring(0, 12)}...`)

const license = generateForCurrentDevice({ 
  licenseType: 'TEST',
  region: 'LOCAL',
  purpose: 'current-device-testing'
})

console.log('')
console.log('✅ تم إنشاء المفتاح بنجاح!')
console.log(`🔑 المفتاح: ${license.licenseKey}`)
console.log('')
console.log('💡 يمكنك الآن استخدام هذا المفتاح في التطبيق')
console.log('   هذا المفتاح يعمل فقط على هذا الجهاز')
