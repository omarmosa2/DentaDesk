/**
 * اختبار اختصارات لوحة المفاتيح مع دعم الأحرف العربية
 * Keyboard shortcuts test with Arabic character support
 */

import { matchesShortcut, mapArabicKey, ARABIC_TO_ENGLISH_MAP } from '../utils/arabicKeyboardMapping'

// اختبار تطبيق الأحرف العربية
console.log('=== اختبار تطبيق الأحرف العربية ===')

// اختبار اختصارات ASD
console.log('اختبار اختصارات ASD:')
console.log('ش -> a:', mapArabicKey('ش')) // يجب أن يعطي 'a'
console.log('س -> s:', mapArabicKey('س')) // يجب أن يعطي 's'
console.log('ي -> d:', mapArabicKey('ي')) // يجب أن يعطي 'd'

// اختبار الأرقام العربية
console.log('\nاختبار الأرقام العربية:')
console.log('٠ -> 0:', mapArabicKey('٠')) // يجب أن يعطي '0'
console.log('١ -> 1:', mapArabicKey('١')) // يجب أن يعطي '1'
console.log('٢ -> 2:', mapArabicKey('٢')) // يجب أن يعطي '2'

// اختبار الأحرف العامة
console.log('\nاختبار الأحرف العامة:')
console.log('ف -> f:', mapArabicKey('ف')) // يجب أن يعطي 'f'
console.log('ب -> b:', mapArabicKey('ب')) // يجب أن يعطي 'b'
console.log('ر -> r:', mapArabicKey('ر')) // يجب أن يعطي 'r'
console.log('ك -> k:', mapArabicKey('ك')) // يجب أن يعطي 'k'

// اختبار تطابق الاختصارات
console.log('\n=== اختبار تطابق الاختصارات ===')
console.log('matchesShortcut("ش", "a"):', matchesShortcut('ش', 'a')) // يجب أن يعطي true
console.log('matchesShortcut("س", "s"):', matchesShortcut('س', 's')) // يجب أن يعطي true
console.log('matchesShortcut("ي", "d"):', matchesShortcut('ي', 'd')) // يجب أن يعطي true
console.log('matchesShortcut("ف", "f"):', matchesShortcut('ف', 'f')) // يجب أن يعطي true
console.log('matchesShortcut("ب", "b"):', matchesShortcut('ب', 'b')) // يجب أن يعطي true

// اختبار الأحرف غير المطابقة
console.log('\nاختبار الأحرف غير المطابقة:')
console.log('matchesShortcut("ش", "x"):', matchesShortcut('ش', 'x')) // يجب أن يعطي false
console.log('matchesShortcut("غ", "f"):', matchesShortcut('غ', 'f')) // يجب أن يعطي false

// عرض جميع التطبيقات المتاحة
console.log('\n=== جميع التطبيقات المتاحة ===')
Object.entries(ARABIC_TO_ENGLISH_MAP).forEach(([arabic, english]) => {
  console.log(`${arabic} -> ${english}`)
})
