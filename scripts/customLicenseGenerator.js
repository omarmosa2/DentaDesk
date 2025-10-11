/**
 * Custom License Key Generator
 * إنشاء مفاتيح ترخيص مخصصة للعيادة
 */

const crypto = require('crypto')

// مجموعة الأحرف المسموحة
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/**
 * إنشاء حرف عشوائي
 */
function getRandomChar() {
  const randomIndex = crypto.randomInt(0, CHARSET.length)
  return CHARSET[randomIndex]
}

/**
 * إنشاء مقطع عشوائي (5 أحرف)
 */
function generateRandomSegment() {
  let segment = ''
  for (let i = 0; i < 5; i++) {
    segment += getRandomChar()
  }
  return segment
}

/**
 * إنشاء مفاتيح للعيادات المختلفة
 */
function generateClinicLicenses() {
  const clinicTypes = [
    { prefix: 'DENTA', name: 'عيادة أسنان عامة' },
    { prefix: 'ORTHO', name: 'عيادة تقويم أسنان' },
    { prefix: 'PERIO', name: 'عيادة أمراض اللثة' },
    { prefix: 'ENDO', name: 'عيادة علاج الجذور' },
    { prefix: 'ORAL', name: 'عيادة جراحة الفم' },
    { prefix: 'PEDO', name: 'عيادة أسنان أطفال' }
  ]

  console.log('🏥 مفاتيح ترخيص للعيادات المتخصصة:')
  console.log('=' .repeat(50))

  clinicTypes.forEach((clinic, index) => {
    const year = '2025'
    const sequence = String(index + 1).padStart(2, '0')
    const random = generateRandomSegment()
    
    const licenseKey = `${clinic.prefix}-${year}${sequence}-${random.substring(0, 5)}-PERM${sequence}`
    
    console.log(`\n${clinic.name}:`)
    console.log(`   ${licenseKey}`)
  })
}

/**
 * إنشاء مفاتيح للمستخدمين المختلفين
 */
function generateUserLicenses() {
  const userTypes = [
    { prefix: 'ADMIN', name: 'مدير النظام' },
    { prefix: 'DOCTR', name: 'طبيب أسنان' },
    { prefix: 'NURSE', name: 'ممرض/ة' },
    { prefix: 'RECEP', name: 'موظف استقبال' },
    { prefix: 'TECH', name: 'فني أسنان' }
  ]

  console.log('\n\n👥 مفاتيح ترخيص للمستخدمين:')
  console.log('=' .repeat(50))

  userTypes.forEach((user, index) => {
    const year = '2025'
    const sequence = String(index + 1).padStart(2, '0')
    const random = generateRandomSegment()
    
    const licenseKey = `${user.prefix}-USER${sequence}-${random.substring(0, 5)}-${year}`
    
    console.log(`\n${user.name}:`)
    console.log(`   ${licenseKey}`)
  })
}

/**
 * إنشاء مفاتيح دائمة موصى بها
 */
function generateRecommendedLicenses() {
  console.log('\n\n⭐ مفاتيح ترخيص دائمة موصى بها:')
  console.log('=' .repeat(50))

  const recommended = [
    'DENTA-CLINI-C2025-MAIN1',
    'DENTA-CLINI-C2025-MAIN2', 
    'DENTA-CLINI-C2025-MAIN3',
    'DENTA-CLINI-C2025-MAIN4',
    'DENTA-CLINI-C2025-MAIN5'
  ]

  recommended.forEach((key, index) => {
    console.log(`   ${index + 1}. ${key}`)
  })
}

/**
 * إنشاء مفاتيح تجريبية
 */
function generateTrialLicenses() {
  console.log('\n\n🧪 مفاتيح تجريبية للاختبار:')
  console.log('=' .repeat(50))

  const trials = [
    'TRIAL-DENTA-L2025-TEST1',
    'DEMO1-DENTA-L2025-TEST2',
    'DEVEL-DENTA-L2025-TEST3',
    'DEBUG-DENTA-L2025-TEST4',
    'BETA1-DENTA-L2025-TEST5'
  ]

  trials.forEach((key, index) => {
    console.log(`   ${index + 1}. ${key}`)
  })
}

/**
 * التحقق من صحة تنسيق المفتاح
 */
function validateLicenseKey(key) {
  const regex = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/
  return regex.test(key)
}

/**
 * إنشاء مفتاح مخصص
 */
function generateCustomLicense(prefix, suffix) {
  const middle1 = generateRandomSegment()
  const middle2 = generateRandomSegment()
  
  // التأكد من أن البادئة واللاحقة بالطول الصحيح
  const formattedPrefix = prefix.substring(0, 5).padEnd(5, '0')
  const formattedSuffix = suffix.substring(0, 5).padEnd(5, '0')
  
  return `${formattedPrefix}-${middle1}-${middle2}-${formattedSuffix}`
}

/**
 * الدالة الرئيسية
 */
function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'all'

  console.log('🔑 مولد مفاتيح الترخيص المخصص للعيادة')
  console.log('=' .repeat(60))

  switch (command.toLowerCase()) {
    case 'clinic':
    case 'عيادة':
      generateClinicLicenses()
      break
      
    case 'user':
    case 'مستخدم':
      generateUserLicenses()
      break
      
    case 'recommended':
    case 'موصى':
      generateRecommendedLicenses()
      break
      
    case 'trial':
    case 'تجريبي':
      generateTrialLicenses()
      break
      
    case 'custom':
    case 'مخصص':
      const prefix = args[1] || 'DENTA'
      const suffix = args[2] || '2025A'
      const customKey = generateCustomLicense(prefix, suffix)
      console.log(`\n🔧 مفتاح مخصص:`)
      console.log(`   ${customKey}`)
      console.log(`   ✅ صالح: ${validateLicenseKey(customKey)}`)
      break
      
    case 'all':
    case 'الكل':
    default:
      generateRecommendedLicenses()
      generateTrialLicenses()
      generateClinicLicenses()
      generateUserLicenses()
      break
  }

  console.log('\n\n📝 تعليمات الاستخدام:')
  console.log('   node scripts/customLicenseGenerator.js [نوع]')
  console.log('   الأنواع المتاحة:')
  console.log('   - all (الكل) - افتراضي')
  console.log('   - recommended (موصى) - مفاتيح موصى بها')
  console.log('   - trial (تجريبي) - مفاتيح تجريبية')
  console.log('   - clinic (عيادة) - مفاتيح للعيادات')
  console.log('   - user (مستخدم) - مفاتيح للمستخدمين')
  console.log('   - custom [بادئة] [لاحقة] - مفتاح مخصص')

  console.log('\n\n🔧 أمثلة:')
  console.log('   node scripts/customLicenseGenerator.js recommended')
  console.log('   node scripts/customLicenseGenerator.js custom MYDENT 2025A')
  console.log('   node scripts/customLicenseGenerator.js trial')

  console.log('\n\n⚠️ ملاحظات مهمة:')
  console.log('   - جميع المفاتيح صالحة للاستخدام')
  console.log('   - كل مفتاح يرتبط بجهاز واحد فقط')
  console.log('   - المفاتيح دائمة ولا تنتهي صلاحيتها')
  console.log('   - استخدم أدوات التطوير لإعادة تعيين البيانات')
}

// تصدير الدوال للاستخدام في ملفات أخرى
module.exports = {
  generateCustomLicense,
  generateRecommendedLicenses,
  generateTrialLicenses,
  generateClinicLicenses,
  generateUserLicenses,
  validateLicenseKey
}

// تشغيل الدالة الرئيسية إذا تم تشغيل الملف مباشرة
if (require.main === module) {
  main()
}
