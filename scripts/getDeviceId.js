/**
 * أداة استخراج معرف الجهاز للعميل
 * Device ID Extractor for Customer
 */

const { machineIdSync } = require('node-machine-id')
const crypto = require('crypto')

function getDeviceId() {
  try {
    const machineId = machineIdSync()
    // إنشاء hash ثابت من معرف الجهاز (نفس الطريقة في النظام)
    return crypto.createHash('sha256').update(machineId).digest('hex').substring(0, 32)
  } catch (error) {
    console.error('خطأ في الحصول على معرف الجهاز:', error)
    // fallback إذا فشل في الحصول على معرف الجهاز
    return crypto.createHash('sha256').update('fallback-device-id').digest('hex').substring(0, 32)
  }
}

function main() {
  console.log('🔍 أداة استخراج معرف الجهاز')
  console.log('=' .repeat(50))
  console.log('')
  
  const deviceId = getDeviceId()
  
  console.log('✅ تم استخراج معرف الجهاز بنجاح!')
  console.log('')
  console.log('🆔 معرف الجهاز الكامل:')
  console.log(`   ${deviceId}`)
  console.log('')
  console.log('🆔 معرف الجهاز المختصر:')
  console.log(`   ${deviceId.substring(0, 12)}...`)
  console.log('')
  console.log('📧 أرسل هذا المعرف للمطور لإنشاء مفتاح الترخيص:')
  console.log('=' .repeat(60))
  console.log(deviceId)
  console.log('=' .repeat(60))
  console.log('')
  console.log('💡 ملاحظات مهمة:')
  console.log('   • هذا المعرف فريد لجهازك فقط')
  console.log('   • مفتاح الترخيص سيعمل على هذا الجهاز فقط')
  console.log('   • لا تشارك هذا المعرف مع أشخاص آخرين')
  console.log('   • احتفظ بنسخة من هذا المعرف للمراجع')
}

if (require.main === module) {
  main()
}

module.exports = { getDeviceId }
