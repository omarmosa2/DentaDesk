/**
 * قائمة مفاتيح الترخيص المحددة مسبقاً
 * Predefined License Keys for Dental Clinic Management System
 */

// قائمة المفاتيح المعتمدة مسبقاً
const PREDEFINED_LICENSES = {
  // مفاتيح العيادات الرئيسية - Main Clinic Licenses
  main: [
    'DENTA-CLINI-C2025-MAIN1',
    'DENTA-CLINI-C2025-MAIN2', 
    'DENTA-CLINI-C2025-MAIN3',
    'DENTA-CLINI-C2025-MAIN4',
    'DENTA-CLINI-C2025-MAIN5',
    'DENTA-CLINI-C2025-MAIN6',
    'DENTA-CLINI-C2025-MAIN7',
    'DENTA-CLINI-C2025-MAIN8',
    'DENTA-CLINI-C2025-MAIN9',
    'DENTA-PRIME-2025A-GOLD1'
  ],

  // مفاتيح العيادات المتخصصة - Specialized Clinics
  specialized: [
    'ORTHO-DENTA-L2025-SPEC1',  // تقويم الأسنان
    'PERIO-DENTA-L2025-SPEC2',  // أمراض اللثة
    'ENDO-DENTA-L2025-SPEC3',   // علاج الجذور
    'ORAL-SURGE-RY2025-SPEC4',  // جراحة الفم
    'PEDO-DENTA-L2025-SPEC5',   // أسنان الأطفال
    'PROSTH-DENT-AL2025-SPC6',  // التركيبات
    'COSME-DENT-AL2025-SPC7',   // تجميل الأسنان
    'IMPLA-DENT-AL2025-SPC8'    // زراعة الأسنان
  ],

  // مفاتيح المؤسسات الطبية - Medical Institutions
  institutions: [
    'HOSPI-DENTA-L2025-INST1',  // مستشفى
    'MEDIC-CENTE-R2025-INST2',  // مركز طبي
    'UNIVE-DENTA-L2025-INST3',  // جامعة
    'GOVER-CLINI-C2025-INST4',  // عيادة حكومية
    'PRIVA-HOSPI-T2025-INST5'   // مستشفى خاص
  ],

  // مفاتيح تجريبية ومؤقتة - Trial & Demo
  trial: [
    'TRIAL-DENTA-L2025-TEST1',
    'DEMO1-DENTA-L2025-TEST2',
    'DEVEL-DENTA-L2025-TEST3',
    'DEBUG-DENTA-L2025-TEST4',
    'BETA1-DENTA-L2025-TEST5',
    'ALPHA-DENTA-L2025-TEST6',
    'SAMPL-DENTA-L2025-TEST7'
  ],

  // مفاتيح VIP ومميزة - VIP & Premium
  premium: [
    'PLATI-DENTA-L2025-VIP01',  // بلاتينيوم
    'GOLD1-DENTA-L2025-VIP02',  // ذهبي
    'SILVE-DENTA-L2025-VIP03',  // فضي
    'DIAMO-DENTA-L2025-VIP04',  // ماسي
    'ROYAL-DENTA-L2025-VIP05'   // ملكي
  ],

  // مفاتيح المناطق الجغرافية - Regional Licenses
  regional: [
    'RIYADH-DENT-AL2025-REG1',  // الرياض
    'JEDDAH-DENT-AL2025-REG2',  // جدة
    'DAMMAM-DENT-AL2025-REG3',  // الدمام
    'MAKKAH-DENT-AL2025-REG4',  // مكة
    'MEDINA-DENT-AL2025-REG5',  // المدينة
    'TABUK1-DENT-AL2025-REG6',  // تبوك
    'ABHA01-DENT-AL2025-REG7',  // أبها
    'HAIL01-DENT-AL2025-REG8'   // حائل
  ],

  // مفاتيح الشركاء - Partner Licenses
  partners: [
    'PARTN-DENTA-L2025-PRT01',
    'RESELL-DENT-AL2025-PRT02',
    'DISTRI-DENT-AL2025-PRT03',
    'VENDOR-DENT-AL2025-PRT04',
    'SUPPLI-DENT-AL2025-PRT05'
  ]
}

// قائمة شاملة بجميع المفاتيح
const ALL_PREDEFINED_LICENSES = [
  ...PREDEFINED_LICENSES.main,
  ...PREDEFINED_LICENSES.specialized,
  ...PREDEFINED_LICENSES.institutions,
  ...PREDEFINED_LICENSES.trial,
  ...PREDEFINED_LICENSES.premium,
  ...PREDEFINED_LICENSES.regional,
  ...PREDEFINED_LICENSES.partners
]

// معلومات إضافية عن كل نوع من المفاتيح
const LICENSE_CATEGORIES = {
  main: {
    name: 'العيادات الرئيسية',
    description: 'مفاتيح للعيادات العامة والأساسية',
    features: ['جميع الميزات', 'دعم كامل', 'تحديثات مجانية']
  },
  specialized: {
    name: 'العيادات المتخصصة',
    description: 'مفاتيح للعيادات المتخصصة في مجالات محددة',
    features: ['ميزات متخصصة', 'قوالب مخصصة', 'تقارير متقدمة']
  },
  institutions: {
    name: 'المؤسسات الطبية',
    description: 'مفاتيح للمستشفيات والمراكز الطبية الكبيرة',
    features: ['إدارة متعددة المستخدمين', 'تكامل مع الأنظمة', 'أمان عالي']
  },
  trial: {
    name: 'تجريبي وتطوير',
    description: 'مفاتيح للاختبار والتطوير',
    features: ['جميع الميزات', 'للاختبار فقط', 'بيانات تجريبية']
  },
  premium: {
    name: 'مميز وVIP',
    description: 'مفاتيح للعملاء المميزين',
    features: ['ميزات حصرية', 'دعم أولوية', 'تخصيص كامل']
  },
  regional: {
    name: 'المناطق الجغرافية',
    description: 'مفاتيح مخصصة للمناطق المختلفة',
    features: ['تخصيص محلي', 'لغة المنطقة', 'قوانين محلية']
  },
  partners: {
    name: 'الشركاء',
    description: 'مفاتيح للشركاء والموزعين',
    features: ['صلاحيات خاصة', 'إدارة العملاء', 'عمولات']
  }
}

/**
 * التحقق من صحة مفتاح الترخيص المحدد مسبقاً
 */
function isPredefinedLicense(licenseKey) {
  if (!licenseKey || typeof licenseKey !== 'string') {
    return false
  }
  
  const normalizedKey = licenseKey.trim().toUpperCase()
  return ALL_PREDEFINED_LICENSES.includes(normalizedKey)
}

/**
 * الحصول على معلومات مفتاح الترخيص
 */
function getLicenseInfo(licenseKey) {
  if (!isPredefinedLicense(licenseKey)) {
    return null
  }

  const normalizedKey = licenseKey.trim().toUpperCase()
  
  // البحث عن الفئة التي ينتمي إليها المفتاح
  for (const [category, licenses] of Object.entries(PREDEFINED_LICENSES)) {
    if (licenses.includes(normalizedKey)) {
      return {
        key: normalizedKey,
        category: category,
        categoryInfo: LICENSE_CATEGORIES[category],
        isValid: true,
        isPredefined: true
      }
    }
  }
  
  return null
}

/**
 * الحصول على جميع المفاتيح حسب الفئة
 */
function getLicensesByCategory(category) {
  if (!PREDEFINED_LICENSES[category]) {
    return []
  }
  
  return PREDEFINED_LICENSES[category].map(key => ({
    key: key,
    category: category,
    categoryInfo: LICENSE_CATEGORIES[category]
  }))
}

/**
 * الحصول على إحصائيات المفاتيح
 */
function getLicenseStatistics() {
  const stats = {}
  
  for (const [category, licenses] of Object.entries(PREDEFINED_LICENSES)) {
    stats[category] = {
      count: licenses.length,
      name: LICENSE_CATEGORIES[category].name,
      licenses: licenses
    }
  }
  
  stats.total = ALL_PREDEFINED_LICENSES.length
  
  return stats
}

/**
 * البحث عن مفاتيح بنص معين
 */
function searchLicenses(searchTerm) {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return []
  }
  
  const term = searchTerm.toUpperCase()
  
  return ALL_PREDEFINED_LICENSES
    .filter(license => license.includes(term))
    .map(license => getLicenseInfo(license))
    .filter(info => info !== null)
}

/**
 * إنشاء مفتاح عشوائي من قائمة محددة
 */
function getRandomPredefinedLicense(category = null) {
  let licenses
  
  if (category && PREDEFINED_LICENSES[category]) {
    licenses = PREDEFINED_LICENSES[category]
  } else {
    licenses = ALL_PREDEFINED_LICENSES
  }
  
  if (licenses.length === 0) {
    return null
  }
  
  const randomIndex = Math.floor(Math.random() * licenses.length)
  const selectedLicense = licenses[randomIndex]
  
  return getLicenseInfo(selectedLicense)
}

// تصدير الدوال والبيانات
module.exports = {
  PREDEFINED_LICENSES,
  ALL_PREDEFINED_LICENSES,
  LICENSE_CATEGORIES,
  isPredefinedLicense,
  getLicenseInfo,
  getLicensesByCategory,
  getLicenseStatistics,
  searchLicenses,
  getRandomPredefinedLicense
}
