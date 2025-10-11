/**
 * Arabic Keyboard Mapping Utilities
 * مساعدات تطبيق خريطة لوحة المفاتيح العربية
 */

/**
 * خريطة تطبيق الأحرف العربية إلى الإنجليزية
 * Arabic to English character mapping
 */
export const ARABIC_TO_ENGLISH_MAP: Record<string, string> = {
  // Action shortcuts (ASD) - اختصارات الإضافة السريعة
  'ش': 'a',  // A - مريض جديد (ش = A)
  'س': 's',  // S - موعد جديد (س = S)
  'ي': 'd',  // D - دفعة جديدة (ي = D)

  // Navigation shortcuts (0-9) - اختصارات التنقل
  '0': '0',  // 0 - لوحة التحكم
  '1': '1',  // 1 - المرضى
  '2': '2',  // 2 - المواعيد
  '3': '3',  // 3 - الدفعات
  '4': '4',  // 4 - المخزون
  '5': '5',  // 5 - المختبرات
  '6': '6',  // 6 - الأدوية والوصفات
  '7': '7',  // 7 - العلاجات السنية
  '8': '8',  // 8 - احتياجات العيادة
  '9': '9',  // 9 - التقارير

  // General shortcuts - الاختصارات العامة
  'ق': 'r',  // R - تحديث (ق = R)
  'ب': 'f'   // F - بحث في الصفحة (ب = F)
}

/**
 * خريطة عكسية من الإنجليزية إلى العربية
 * Reverse mapping from English to Arabic
 */
export const ENGLISH_TO_ARABIC_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(ARABIC_TO_ENGLISH_MAP).map(([arabic, english]) => [english, arabic])
)

/**
 * فحص ما إذا كان الحرف عربياً
 * Check if a character is Arabic
 */
export function isArabicChar(char: string): boolean {
  const arabicRange = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
  return arabicRange.test(char)
}

/**
 * تطبيق خريطة الأحرف العربية على المفتاح المضغوط
 * Map Arabic character to English equivalent
 */
export function mapArabicKey(key: string): string {
  return ARABIC_TO_ENGLISH_MAP[key] || key
}

/**
 * تطبيق خريطة الأحرف الإنجليزية على العربية
 * Map English character to Arabic equivalent
 */
export function mapEnglishKey(key: string): string {
  return ENGLISH_TO_ARABIC_MAP[key] || key
}

/**
 * فحص تطابق المفتاح مع الاختصار مع دعم العربية
 * Check if key matches shortcut with Arabic support
 */
export function matchesShortcut(pressedKey: string, shortcutKey: string): boolean {
  const normalizedPressed = pressedKey.toLowerCase()
  const normalizedShortcut = shortcutKey.toLowerCase()

  // Direct match
  if (normalizedPressed === normalizedShortcut) {
    return true
  }

  // Arabic to English mapping
  const mappedPressed = mapArabicKey(normalizedPressed)
  if (mappedPressed !== normalizedPressed && mappedPressed === normalizedShortcut) {
    return true
  }

  // English to Arabic mapping
  const mappedShortcut = mapEnglishKey(normalizedShortcut)
  if (mappedShortcut !== normalizedShortcut && normalizedPressed === mappedShortcut) {
    return true
  }

  return false
}

/**
 * معالج أحداث لوحة المفاتيح مع دعم العربية
 * Enhanced keyboard event handler with Arabic support
 */
export interface EnhancedKeyboardEvent {
  originalKey: string
  mappedKey: string
  isArabic: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  preventDefault: () => void
}

/**
 * تحويل حدث لوحة المفاتيح إلى حدث محسن
 * Convert keyboard event to enhanced event
 */
export function enhanceKeyboardEvent(event: KeyboardEvent): EnhancedKeyboardEvent {
  const originalKey = event.key
  const mappedKey = mapArabicKey(originalKey)
  const isArabic = isArabicChar(originalKey)

  return {
    originalKey,
    mappedKey,
    isArabic,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    preventDefault: () => event.preventDefault()
  }
}

/**
 * إنشاء معالج اختصارات محسن
 * Create enhanced shortcut handler
 */
export function createShortcutHandler(shortcuts: Record<string, () => void>) {
  return (event: KeyboardEvent) => {
    const enhanced = enhanceKeyboardEvent(event)

    // Check for matching shortcut
    for (const [shortcutKey, handler] of Object.entries(shortcuts)) {
      if (matchesShortcut(enhanced.originalKey, shortcutKey)) {
        enhanced.preventDefault()
        handler()
        break
      }
    }
  }
}

/**
 * تنسيق عرض الاختصار مع دعم العربية
 * Format shortcut display with Arabic support
 */
export function formatShortcutDisplay(key: string): string {
  const parts = key.split('/')
  if (parts.length > 1) {
    return parts.join(' / ')
  }

  const arabicEquivalent = mapEnglishKey(key.toLowerCase())
  if (arabicEquivalent !== key.toLowerCase()) {
    return `${key.toUpperCase()} / ${arabicEquivalent}`
  }

  return key.toUpperCase()
}

/**
 * الحصول على جميع المفاتيح المكافئة للاختصار
 * Get all equivalent keys for a shortcut
 */
export function getEquivalentKeys(key: string): string[] {
  const keys = [key]
  const mapped = mapArabicKey(key)
  if (mapped !== key) {
    keys.push(mapped)
  }

  const reverse = mapEnglishKey(key)
  if (reverse !== key && !keys.includes(reverse)) {
    keys.push(reverse)
  }

  return keys
}
