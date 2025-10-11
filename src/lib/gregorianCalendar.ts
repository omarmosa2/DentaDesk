/**
 * Gregorian Calendar Configuration
 * التقويم الميلادي - إعدادات مركزية
 * 
 * This file ensures that ALL date displays in the application use ONLY Gregorian calendar
 * هذا الملف يضمن أن جميع عروض التاريخ في التطبيق تستخدم التقويم الميلادي فقط
 */

// Gregorian months in Arabic - أسماء الأشهر الميلادية بالعربية
export const GREGORIAN_MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
] as const

// Gregorian months short names in Arabic
export const GREGORIAN_MONTHS_SHORT_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
] as const

// Weekdays in Arabic
export const WEEKDAYS_AR = [
  'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
] as const

// Short weekdays in Arabic
export const WEEKDAYS_SHORT_AR = [
  'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'
] as const

/**
 * Format a date using Gregorian calendar with Arabic month names
 * تنسيق التاريخ باستخدام التقويم الميلادي مع أسماء الأشهر العربية
 */
export function formatGregorianDate(date: Date): string {
  if (!date || isNaN(date.getTime())) {
    return '--'
  }

  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

/**
 * Format month and year using Gregorian calendar with Arabic month names
 * تنسيق الشهر والسنة باستخدام التقويم الميلادي مع أسماء الأشهر العربية
 */
export function formatGregorianMonthYear(year: number, monthIndex: number): string {
  if (monthIndex < 0 || monthIndex > 11) {
    console.warn('Invalid month index:', monthIndex)
    return `${year}`
  }
  return `${GREGORIAN_MONTHS_AR[monthIndex]} ${year}`
}

/**
 * Parse YYYY-MM format and return Gregorian month name with year
 * تحليل تنسيق YYYY-MM وإرجاع اسم الشهر الميلادي مع السنة
 */
export function parseGregorianMonthString(monthString: string): string {
  try {
    const [year, monthNum] = monthString.split('-')
    const monthIndex = Number(monthNum) - 1 // Convert to 0-based index
    
    if (monthIndex < 0 || monthIndex > 11) {
      console.warn('Invalid month in string:', monthString)
      return monthString
    }
    
    return formatGregorianMonthYear(Number(year), monthIndex)
  } catch (error) {
    console.warn('Error parsing month string:', monthString, error)
    return monthString
  }
}

/**
 * Get Gregorian month name by index (0-11)
 * الحصول على اسم الشهر الميلادي بالفهرس
 */
export function getGregorianMonthName(monthIndex: number): string {
  if (monthIndex < 0 || monthIndex > 11) {
    console.warn('Invalid month index:', monthIndex)
    return ''
  }
  return GREGORIAN_MONTHS_AR[monthIndex]
}

/**
 * Format date and time using Gregorian calendar
 * تنسيق التاريخ والوقت باستخدام التقويم الميلادي
 */
export function formatGregorianDateTime(date: Date): string {
  if (!date || isNaN(date.getTime())) {
    return '--'
  }

  const formattedDate = formatGregorianDate(date)
  const time = date.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  return `${formattedDate} - ${time}`
}

/**
 * Ensure a date object uses Gregorian calendar
 * التأكد من أن كائن التاريخ يستخدم التقويم الميلادي
 */
export function ensureGregorianDate(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date input:', dateInput)
      return null
    }
    
    // JavaScript Date object always uses Gregorian calendar
    // كائن Date في JavaScript يستخدم دائماً التقويم الميلادي
    return date
  } catch (error) {
    console.warn('Error processing date:', dateInput, error)
    return null
  }
}

/**
 * Configuration for moment.js to use Gregorian calendar with Arabic locale
 * إعدادات moment.js لاستخدام التقويم الميلادي مع اللغة العربية
 */
export const MOMENT_GREGORIAN_CONFIG = {
  calendar: {
    lastDay: '[أمس في] LT',
    sameDay: '[اليوم في] LT',
    nextDay: '[غداً في] LT',
    lastWeek: 'dddd [الماضي في] LT',
    nextWeek: 'dddd [في] LT',
    sameElse: 'L'
  },
  longDateFormat: {
    LT: 'HH:mm',
    LTS: 'HH:mm:ss',
    L: 'DD/MM/YYYY', // Gregorian date format
    LL: 'D MMMM YYYY', // Gregorian date format
    LLL: 'D MMMM YYYY HH:mm', // Gregorian date format
    LLLL: 'dddd D MMMM YYYY HH:mm' // Gregorian date format
  },
  months: GREGORIAN_MONTHS_AR,
  monthsShort: GREGORIAN_MONTHS_SHORT_AR,
  weekdays: WEEKDAYS_AR,
  weekdaysShort: WEEKDAYS_SHORT_AR,
  weekdaysMin: ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'],
  week: {
    dow: 6, // Saturday is the first day of the week
    doy: 12 // The week that contains Jan 12th is the first week of the year
  }
}

/**
 * Validate that a date is using Gregorian calendar
 * التحقق من أن التاريخ يستخدم التقويم الميلادي
 */
export function validateGregorianDate(date: Date): boolean {
  if (!date || isNaN(date.getTime())) {
    return false
  }
  
  // Check if year is within reasonable Gregorian range
  const year = date.getFullYear()
  return year >= 1900 && year <= 2100
}

/**
 * Convert any date display to use Gregorian calendar format
 * تحويل أي عرض تاريخ لاستخدام تنسيق التقويم الميلادي
 */
export function forceGregorianDisplay(dateInput: any): string {
  const date = ensureGregorianDate(dateInput)
  if (!date) return '--'
  
  return formatGregorianDate(date)
}
