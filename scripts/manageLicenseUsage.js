/**
 * أداة إدارة استخدام مفاتيح الترخيص
 * License Usage Management Tool
 */

const { 
  tracker,
  getUsageStatistics,
  getUsedLicenseInfo,
  releaseLicense,
  resetAllData
} = require('../electron/usedLicensesTracker.js')

/**
 * عرض إحصائيات الاستخدام
 */
function displayUsageStatistics() {
  const stats = getUsageStatistics()
  
  console.log('📊 إحصائيات استخدام مفاتيح الترخيص')
  console.log('=' .repeat(60))
  console.log(`🔢 إجمالي المفاتيح المُستخدمة: ${stats.totalUsedLicenses}`)
  console.log(`💻 عدد الأجهزة الفريدة: ${stats.uniqueDevices}`)
  console.log('')
  
  if (Object.keys(stats.activationsByDate).length > 0) {
    console.log('📅 التفعيلات حسب التاريخ:')
    Object.entries(stats.activationsByDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 10)
      .forEach(([date, count]) => {
        console.log(`   ${date}: ${count} تفعيل`)
      })
    console.log('')
  }
  
  if (stats.recentActivations.length > 0) {
    console.log('🕒 أحدث التفعيلات:')
    stats.recentActivations.forEach((activation, index) => {
      const date = new Date(activation.activatedAt).toLocaleString('ar-SA')
      const deviceId = activation.hwid.substring(0, 8) + '...'
      console.log(`   ${index + 1}. ${date} - جهاز: ${deviceId}`)
    })
  }
}

/**
 * البحث عن معلومات مفتاح معين
 */
function searchLicenseInfo(licenseKey) {
  if (!licenseKey) {
    console.log('❌ يرجى تحديد مفتاح الترخيص')
    return
  }
  
  const info = getUsedLicenseInfo(licenseKey)
  
  console.log(`🔍 البحث عن مفتاح: ${licenseKey}`)
  console.log('=' .repeat(50))
  
  if (info) {
    console.log('✅ المفتاح مُستخدم:')
    console.log(`   🆔 معرف الجهاز: ${info.hwid}`)
    console.log(`   📅 تاريخ التفعيل: ${new Date(info.activatedAt).toLocaleString('ar-SA')}`)
    console.log(`   🕒 آخر تحقق: ${new Date(info.lastValidated).toLocaleString('ar-SA')}`)
    console.log(`   🔢 عدد التفعيلات: ${info.activationCount}`)
    console.log(`   ✅ عدد التحققات: ${info.validationCount}`)
  } else {
    console.log('⚪ المفتاح غير مُستخدم أو غير موجود')
  }
}

/**
 * إلغاء تسجيل مفتاح (للدعم الفني)
 */
function releaseLicenseKey(licenseKey) {
  if (!licenseKey) {
    console.log('❌ يرجى تحديد مفتاح الترخيص')
    return
  }
  
  console.log(`🔓 محاولة إلغاء تسجيل المفتاح: ${licenseKey}`)
  
  const info = getUsedLicenseInfo(licenseKey)
  if (info) {
    console.log('📋 معلومات المفتاح قبل الإلغاء:')
    console.log(`   🆔 معرف الجهاز: ${info.hwid}`)
    console.log(`   📅 تاريخ التفعيل: ${new Date(info.activatedAt).toLocaleString('ar-SA')}`)
    
    const released = releaseLicense(licenseKey)
    
    if (released) {
      console.log('✅ تم إلغاء تسجيل المفتاح بنجاح')
      console.log('💡 يمكن الآن استخدام المفتاح على جهاز جديد')
    } else {
      console.log('❌ فشل في إلغاء تسجيل المفتاح')
    }
  } else {
    console.log('⚠️ المفتاح غير مُسجل أصلاً')
  }
}

/**
 * عرض جميع المفاتيح المُستخدمة
 */
function listAllUsedLicenses() {
  const allUsed = tracker.usedLicenses
  const keys = Object.keys(allUsed)
  
  console.log('📋 جميع المفاتيح المُستخدمة')
  console.log('=' .repeat(60))
  console.log(`🔢 إجمالي المفاتيح: ${keys.length}`)
  console.log('')
  
  if (keys.length === 0) {
    console.log('⚪ لا توجد مفاتيح مُستخدمة')
    return
  }
  
  // ترتيب حسب تاريخ التفعيل
  const sortedLicenses = Object.entries(allUsed)
    .sort(([,a], [,b]) => new Date(b.activatedAt) - new Date(a.activatedAt))
  
  sortedLicenses.forEach(([hashedKey, license], index) => {
    const date = new Date(license.activatedAt).toLocaleDateString('ar-SA')
    const deviceId = license.hwid.substring(0, 12) + '...'
    const activations = license.activationCount || 1
    const validations = license.validationCount || 0
    
    console.log(`${index + 1}. Hash: ${hashedKey.substring(0, 16)}...`)
    console.log(`   📅 التفعيل: ${date}`)
    console.log(`   💻 الجهاز: ${deviceId}`)
    console.log(`   🔢 التفعيلات: ${activations} | التحققات: ${validations}`)
    console.log('')
  })
}

/**
 * تنظيف البيانات القديمة
 */
function cleanupOldData(days = 365) {
  console.log(`🧹 تنظيف البيانات الأقدم من ${days} يوم...`)
  
  const cleaned = tracker.cleanup(days)
  
  if (cleaned > 0) {
    console.log(`✅ تم حذف ${cleaned} سجل قديم`)
  } else {
    console.log('ℹ️ لا توجد بيانات قديمة للحذف')
  }
}

/**
 * إعادة تعيين جميع البيانات
 */
function resetAllUsageData() {
  console.log('⚠️ تحذير: سيتم حذف جميع بيانات الاستخدام!')
  console.log('هذا يعني أن جميع المفاتيح ستصبح متاحة للاستخدام مرة أخرى.')
  
  // في بيئة الإنتاج، يجب إضافة تأكيد من المستخدم
  const reset = resetAllData()
  
  if (reset) {
    console.log('✅ تم إعادة تعيين جميع بيانات الاستخدام')
    console.log('💡 جميع المفاتيح أصبحت متاحة للاستخدام')
  } else {
    console.log('❌ فشل في إعادة تعيين البيانات')
  }
}

/**
 * تصدير تقرير الاستخدام
 */
function exportUsageReport() {
  const stats = getUsageStatistics()
  const allUsed = tracker.usedLicenses
  
  const report = {
    generatedAt: new Date().toISOString(),
    summary: stats,
    usedLicenses: Object.entries(allUsed).map(([hashedKey, license]) => ({
      hashedKey: hashedKey,
      deviceId: license.hwid.substring(0, 12) + '...',
      activatedAt: license.activatedAt,
      lastValidated: license.lastValidated,
      activationCount: license.activationCount || 1,
      validationCount: license.validationCount || 0
    }))
  }
  
  const fs = require('fs')
  const path = require('path')
  const reportPath = path.join(__dirname, '..', `usage-report-${Date.now()}.json`)
  
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')
    console.log(`📄 تم تصدير التقرير: ${reportPath}`)
  } catch (error) {
    console.error('❌ خطأ في تصدير التقرير:', error)
  }
}

/**
 * عرض تعليمات الاستخدام
 */
function displayUsage() {
  console.log('📖 أداة إدارة استخدام مفاتيح الترخيص')
  console.log('=' .repeat(60))
  console.log('')
  console.log('🔧 الاستخدام:')
  console.log('   node scripts/manageLicenseUsage.js [أمر] [معامل]')
  console.log('')
  console.log('📋 الأوامر المتاحة:')
  console.log('   stats              - عرض إحصائيات الاستخدام')
  console.log('   search [مفتاح]     - البحث عن معلومات مفتاح')
  console.log('   release [مفتاح]    - إلغاء تسجيل مفتاح')
  console.log('   list               - عرض جميع المفاتيح المُستخدمة')
  console.log('   cleanup [أيام]     - تنظيف البيانات القديمة')
  console.log('   reset              - إعادة تعيين جميع البيانات')
  console.log('   export             - تصدير تقرير الاستخدام')
  console.log('   help               - عرض هذه التعليمات')
  console.log('')
  console.log('💡 أمثلة:')
  console.log('   node scripts/manageLicenseUsage.js stats')
  console.log('   node scripts/manageLicenseUsage.js search E0420-NS3CG-78FTY-XNQNB')
  console.log('   node scripts/manageLicenseUsage.js release E0420-NS3CG-78FTY-XNQNB')
  console.log('   node scripts/manageLicenseUsage.js cleanup 30')
}

/**
 * الدالة الرئيسية
 */
function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'stats'
  const parameter = args[1]

  console.log('🔐 أداة إدارة استخدام مفاتيح الترخيص')
  console.log(`📅 تاريخ اليوم: ${new Date().toLocaleDateString('ar-SA')}`)
  console.log('')

  switch (command.toLowerCase()) {
    case 'stats':
    case 'إحصائيات':
      displayUsageStatistics()
      break
      
    case 'search':
    case 'بحث':
      searchLicenseInfo(parameter)
      break
      
    case 'release':
    case 'إلغاء':
      releaseLicenseKey(parameter)
      break
      
    case 'list':
    case 'قائمة':
      listAllUsedLicenses()
      break
      
    case 'cleanup':
    case 'تنظيف':
      const days = parameter ? parseInt(parameter) : 365
      cleanupOldData(days)
      break
      
    case 'reset':
    case 'إعادة':
      resetAllUsageData()
      break
      
    case 'export':
    case 'تصدير':
      exportUsageReport()
      break
      
    case 'help':
    case 'مساعدة':
    default:
      displayUsage()
      break
  }
}

// تشغيل الدالة الرئيسية
if (require.main === module) {
  main()
}

module.exports = {
  displayUsageStatistics,
  searchLicenseInfo,
  releaseLicenseKey,
  listAllUsedLicenses,
  cleanupOldData,
  resetAllUsageData,
  exportUsageReport
}
