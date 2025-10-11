/**
 * عرض قائمة مفاتيح الترخيص المحددة مسبقاً
 * Display Predefined License Keys
 */

const { 
  PREDEFINED_LICENSES, 
  LICENSE_CATEGORIES, 
  getLicenseStatistics,
  searchLicenses,
  getRandomPredefinedLicense 
} = require('../electron/predefinedLicenses.js')

/**
 * عرض جميع المفاتيح حسب الفئة
 */
function displayAllLicenses() {
  console.log('🔑 قائمة مفاتيح الترخيص المحددة مسبقاً')
  console.log('=' .repeat(80))
  
  for (const [category, licenses] of Object.entries(PREDEFINED_LICENSES)) {
    const categoryInfo = LICENSE_CATEGORIES[category]
    
    console.log(`\n📋 ${categoryInfo.name} (${category})`)
    console.log(`📝 ${categoryInfo.description}`)
    console.log(`✨ الميزات: ${categoryInfo.features.join(' • ')}`)
    console.log(`🔢 عدد المفاتيح: ${licenses.length}`)
    console.log('-' .repeat(60))
    
    licenses.forEach((license, index) => {
      console.log(`   ${index + 1}. ${license}`)
    })
    
    console.log('')
  }
}

/**
 * عرض إحصائيات المفاتيح
 */
function displayStatistics() {
  const stats = getLicenseStatistics()
  
  console.log('\n📊 إحصائيات مفاتيح الترخيص')
  console.log('=' .repeat(50))
  console.log(`📈 إجمالي المفاتيح: ${stats.total}`)
  console.log('')
  
  for (const [category, info] of Object.entries(stats)) {
    if (category !== 'total') {
      console.log(`📂 ${info.name}: ${info.count} مفتاح`)
    }
  }
}

/**
 * عرض مفاتيح فئة معينة
 */
function displayCategory(categoryName) {
  if (!PREDEFINED_LICENSES[categoryName]) {
    console.log(`❌ الفئة غير موجودة: ${categoryName}`)
    console.log(`📋 الفئات المتاحة: ${Object.keys(PREDEFINED_LICENSES).join(', ')}`)
    return
  }
  
  const licenses = PREDEFINED_LICENSES[categoryName]
  const categoryInfo = LICENSE_CATEGORIES[categoryName]
  
  console.log(`🔑 مفاتيح فئة: ${categoryInfo.name}`)
  console.log('=' .repeat(60))
  console.log(`📝 الوصف: ${categoryInfo.description}`)
  console.log(`✨ الميزات: ${categoryInfo.features.join(' • ')}`)
  console.log(`🔢 عدد المفاتيح: ${licenses.length}`)
  console.log('')
  
  licenses.forEach((license, index) => {
    console.log(`   ${index + 1}. ${license}`)
  })
}

/**
 * البحث في المفاتيح
 */
function searchInLicenses(searchTerm) {
  const results = searchLicenses(searchTerm)
  
  console.log(`🔍 نتائج البحث عن: "${searchTerm}"`)
  console.log('=' .repeat(50))
  console.log(`📊 عدد النتائج: ${results.length}`)
  console.log('')
  
  if (results.length === 0) {
    console.log('❌ لم يتم العثور على نتائج')
    return
  }
  
  results.forEach((result, index) => {
    console.log(`   ${index + 1}. ${result.key}`)
    console.log(`      📂 الفئة: ${result.categoryInfo.name}`)
    console.log(`      📝 الوصف: ${result.categoryInfo.description}`)
    console.log('')
  })
}

/**
 * عرض مفاتيح عشوائية
 */
function displayRandomLicenses(count = 5, category = null) {
  console.log(`🎲 مفاتيح عشوائية${category ? ` من فئة ${category}` : ''}`)
  console.log('=' .repeat(50))
  
  const randomLicenses = []
  for (let i = 0; i < count; i++) {
    const randomLicense = getRandomPredefinedLicense(category)
    if (randomLicense && !randomLicenses.find(l => l.key === randomLicense.key)) {
      randomLicenses.push(randomLicense)
    }
  }
  
  randomLicenses.forEach((license, index) => {
    console.log(`   ${index + 1}. ${license.key}`)
    console.log(`      📂 الفئة: ${license.categoryInfo.name}`)
    console.log('')
  })
}

/**
 * عرض مفاتيح موصى بها للاستخدام
 */
function displayRecommendedLicenses() {
  console.log('⭐ مفاتيح ترخيص موصى بها للاستخدام الفوري')
  console.log('=' .repeat(60))
  
  const recommended = [
    ...PREDEFINED_LICENSES.main.slice(0, 5),
    ...PREDEFINED_LICENSES.trial.slice(0, 3),
    ...PREDEFINED_LICENSES.specialized.slice(0, 2)
  ]
  
  console.log('🏥 للعيادات العامة:')
  PREDEFINED_LICENSES.main.slice(0, 5).forEach((license, index) => {
    console.log(`   ${index + 1}. ${license}`)
  })
  
  console.log('\n🧪 للاختبار والتجريب:')
  PREDEFINED_LICENSES.trial.slice(0, 3).forEach((license, index) => {
    console.log(`   ${index + 1}. ${license}`)
  })
  
  console.log('\n🏥 للعيادات المتخصصة:')
  PREDEFINED_LICENSES.specialized.slice(0, 2).forEach((license, index) => {
    console.log(`   ${index + 1}. ${license}`)
  })
  
  console.log('\n💡 نصائح:')
  console.log('   • استخدم مفاتيح العيادات العامة للاستخدام اليومي')
  console.log('   • استخدم مفاتيح التجريب للاختبار والتطوير')
  console.log('   • كل مفتاح يرتبط بجهاز واحد فقط')
  console.log('   • المفاتيح دائمة ولا تنتهي صلاحيتها')
}

/**
 * عرض تعليمات الاستخدام
 */
function displayUsage() {
  console.log('📖 تعليمات استخدام أداة عرض مفاتيح الترخيص')
  console.log('=' .repeat(60))
  console.log('')
  console.log('🔧 الاستخدام:')
  console.log('   node scripts/showPredefinedLicenses.js [أمر] [معامل]')
  console.log('')
  console.log('📋 الأوامر المتاحة:')
  console.log('   all              - عرض جميع المفاتيح')
  console.log('   stats            - عرض الإحصائيات')
  console.log('   category [اسم]   - عرض مفاتيح فئة معينة')
  console.log('   search [نص]      - البحث في المفاتيح')
  console.log('   random [عدد]     - عرض مفاتيح عشوائية')
  console.log('   recommended      - عرض مفاتيح موصى بها')
  console.log('   help             - عرض هذه التعليمات')
  console.log('')
  console.log('📂 الفئات المتاحة:')
  Object.keys(PREDEFINED_LICENSES).forEach(category => {
    const info = LICENSE_CATEGORIES[category]
    console.log(`   ${category.padEnd(12)} - ${info.name}`)
  })
  console.log('')
  console.log('💡 أمثلة:')
  console.log('   node scripts/showPredefinedLicenses.js recommended')
  console.log('   node scripts/showPredefinedLicenses.js category main')
  console.log('   node scripts/showPredefinedLicenses.js search DENTA')
  console.log('   node scripts/showPredefinedLicenses.js random 3')
}

/**
 * الدالة الرئيسية
 */
function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'recommended'
  const parameter = args[1]

  console.log('🔐 أداة عرض مفاتيح الترخيص المحددة مسبقاً')
  console.log(`📅 تاريخ اليوم: ${new Date().toLocaleDateString('ar-SA')}`)
  console.log('')

  switch (command.toLowerCase()) {
    case 'all':
    case 'الكل':
      displayAllLicenses()
      break
      
    case 'stats':
    case 'إحصائيات':
      displayStatistics()
      break
      
    case 'category':
    case 'فئة':
      if (!parameter) {
        console.log('❌ يرجى تحديد اسم الفئة')
        console.log(`📋 الفئات المتاحة: ${Object.keys(PREDEFINED_LICENSES).join(', ')}`)
      } else {
        displayCategory(parameter)
      }
      break
      
    case 'search':
    case 'بحث':
      if (!parameter) {
        console.log('❌ يرجى تحديد نص البحث')
      } else {
        searchInLicenses(parameter)
      }
      break
      
    case 'random':
    case 'عشوائي':
      const count = parameter ? parseInt(parameter) : 5
      displayRandomLicenses(count)
      break
      
    case 'recommended':
    case 'موصى':
    default:
      displayRecommendedLicenses()
      break
      
    case 'help':
    case 'مساعدة':
      displayUsage()
      break
  }
  
  console.log('\n🔗 للمزيد من المعلومات:')
  console.log('   node scripts/showPredefinedLicenses.js help')
}

// تشغيل الدالة الرئيسية
if (require.main === module) {
  main()
}

module.exports = {
  displayAllLicenses,
  displayStatistics,
  displayCategory,
  searchInLicenses,
  displayRandomLicenses,
  displayRecommendedLicenses,
  displayUsage
}
