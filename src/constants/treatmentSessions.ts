// أنواع الجلسات المختلفة حسب نوع العلاج

export interface SessionType {
  value: string
  label: string
  description?: string
}

// جلسات علاج العصب
export const ENDODONTIC_SESSIONS: SessionType[] = [
  { value: 'drilling', label: 'حفر السن', description: 'فتح السن والوصول للعصب' },
  { value: 'nerve_extraction', label: 'سحب العصب', description: 'إزالة العصب المصاب' },
  { value: 'canal_cleaning', label: 'تنظيف القنوات', description: 'تنظيف وتطهير قنوات الجذر' },
  { value: 'canal_shaping', label: 'تشكيل القنوات', description: 'توسيع وتشكيل قنوات الجذر' },
  { value: 'medication', label: 'وضع الدواء', description: 'وضع مضاد حيوي داخل القنوات' },
  { value: 'filling', label: 'حشو القنوات', description: 'حشو نهائي لقنوات الجذر' },
  { value: 'crown_prep', label: 'تحضير للتاج', description: 'تحضير السن لوضع التاج' },
  { value: 'final_restoration', label: 'الترميم النهائي', description: 'وضع الحشوة أو التاج النهائي' }
]

// جلسات الحشوات
export const RESTORATIVE_SESSIONS: SessionType[] = [
  { value: 'cavity_prep', label: 'تحضير التجويف', description: 'إزالة التسوس وتحضير السن' },
  { value: 'base_placement', label: 'وضع القاعدة', description: 'وضع مادة القاعدة الواقية' },
  { value: 'filling_placement', label: 'وضع الحشوة', description: 'وضع مادة الحشو' },
  { value: 'polishing', label: 'تلميع', description: 'تلميع وتنعيم الحشوة' },
  { value: 'bite_adjustment', label: 'تعديل العضة', description: 'تعديل ارتفاع الحشوة' }
]

// جلسات التيجان والجسور والتعويضات
export const PROSTHETIC_SESSIONS: SessionType[] = [
  // جلسات التيجان والجسور الثابتة
  { value: 'tooth_prep', label: 'تحضير السن', description: 'برد وتشكيل السن' },
  { value: 'impression', label: 'أخذ الطبعة', description: 'أخذ طبعة للسن المحضر' },
  { value: 'temp_crown', label: 'تاج مؤقت', description: 'وضع تاج مؤقت' },
  { value: 'try_in', label: 'تجربة التاج', description: 'تجربة التاج النهائي' },
  { value: 'cementation', label: 'تثبيت التاج', description: 'تثبيت التاج بالإسمنت' },
  { value: 'final_adjustment', label: 'التعديل النهائي', description: 'تعديل العضة والتلميع' },

  // جلسات الأجهزة المتحركة
  { value: 'initial_impression', label: 'الطبعة الأولية', description: 'أخذ طبعة أولية للفكين' },
  { value: 'final_impression', label: 'الطبعة النهائية', description: 'أخذ طبعة نهائية دقيقة' },
  { value: 'bite_registration', label: 'تسجيل العضة', description: 'تحديد العلاقة بين الفكين' },
  { value: 'try_in_wax', label: 'تجربة الشمع', description: 'تجربة الأسنان على الشمع' },
  { value: 'denture_delivery', label: 'تسليم الجهاز', description: 'تسليم الجهاز المتحرك النهائي' },
  { value: 'denture_adjustment', label: 'تعديل الجهاز', description: 'تعديل وضبط الجهاز المتحرك' },
  { value: 'follow_up_denture', label: 'متابعة الجهاز', description: 'فحص ومتابعة الجهاز المتحرك' },

  // جلسات التعويضات فوق الزرعات
  { value: 'implant_impression', label: 'طبعة الزرعة', description: 'أخذ طبعة للزرعة المدفونة' },
  { value: 'abutment_placement', label: 'وضع الدعامة', description: 'تركيب دعامة فوق الزرعة' },
  { value: 'implant_crown_try', label: 'تجربة تاج الزرعة', description: 'تجربة التاج فوق الزرعة' },
  { value: 'implant_crown_delivery', label: 'تسليم تاج الزرعة', description: 'تثبيت التاج النهائي فوق الزرعة' },

  // جلسات القلوب والأوتاد
  { value: 'post_space_prep', label: 'تحضير مجرى الوتد', description: 'تحضير مجرى الوتد في الجذر' },
  { value: 'post_impression', label: 'طبعة الوتد', description: 'أخذ طبعة لمجرى الوتد' },
  { value: 'post_try_in', label: 'تجربة الوتد', description: 'تجربة القلب والوتد' },
  { value: 'post_cementation', label: 'تثبيت الوتد', description: 'تثبيت القلب والوتد بالإسمنت' },

  // جلسات الفينير
  { value: 'veneer_prep', label: 'تحضير الفينير', description: 'برد طفيف للسطح الأمامي' },
  { value: 'veneer_impression', label: 'طبعة الفينير', description: 'أخذ طبعة للأسنان المحضرة' },
  { value: 'veneer_try_in', label: 'تجربة الفينير', description: 'تجربة قشور الفينير' },
  { value: 'veneer_bonding', label: 'لصق الفينير', description: 'لصق قشور الفينير نهائياً' }
]

// جلسات قلع الأسنان
export const SURGICAL_SESSIONS: SessionType[] = [
  { value: 'consultation', label: 'استشارة', description: 'فحص وتقييم الحالة' },
  { value: 'anesthesia', label: 'تخدير', description: 'تخدير موضعي' },
  { value: 'extraction', label: 'القلع', description: 'قلع السن' },
  { value: 'suturing', label: 'خياطة', description: 'خياطة الجرح إذا لزم' },
  { value: 'follow_up', label: 'متابعة', description: 'فحص الشفاء' },
  { value: 'suture_removal', label: 'إزالة الخيوط', description: 'إزالة الخيوط الجراحية' }
]

// جلسات تنظيف الأسنان واللثة
export const PERIODONTAL_SESSIONS: SessionType[] = [
  { value: 'scaling', label: 'تنظيف فوق اللثة', description: 'إزالة الجير فوق خط اللثة' },
  { value: 'root_planing', label: 'تنظيف تحت اللثة', description: 'تنظيف الجذور تحت اللثة' },
  { value: 'polishing', label: 'تلميع', description: 'تلميع الأسنان' },
  { value: 'fluoride', label: 'فلورايد', description: 'تطبيق الفلورايد' },
  { value: 'maintenance', label: 'صيانة دورية', description: 'تنظيف دوري للمتابعة' }
]

// جلسات أسنان الأطفال
export const PEDIATRIC_SESSIONS: SessionType[] = [
  { value: 'examination', label: 'فحص', description: 'فحص أسنان الطفل' },
  { value: 'cleaning', label: 'تنظيف', description: 'تنظيف أسنان الطفل' },
  { value: 'fluoride_treatment', label: 'علاج بالفلورايد', description: 'تطبيق الفلورايد الوقائي' },
  { value: 'sealant', label: 'مادة سادة', description: 'وضع مادة سادة للشقوق' },
  { value: 'pulp_treatment', label: 'علاج العصب', description: 'علاج عصب سن لبني' },
  { value: 'space_maintainer', label: 'حافظ مسافة', description: 'وضع جهاز حافظ المسافة' }
]

// جلسات التجميل
export const COSMETIC_SESSIONS: SessionType[] = [
  { value: 'consultation', label: 'استشارة تجميلية', description: 'تقييم الحالة التجميلية' },
  { value: 'teeth_whitening', label: 'تبييض الأسنان', description: 'جلسة تبييض' },
  { value: 'veneer_prep', label: 'تحضير للقشرة', description: 'تحضير السن للقشرة التجميلية' },
  { value: 'veneer_placement', label: 'وضع القشرة', description: 'تثبيت القشرة التجميلية' },
  { value: 'polishing', label: 'تلميع تجميلي', description: 'تلميع وتنعيم نهائي' }
]

// دالة للحصول على أنواع الجلسات حسب تصنيف العلاج
export const getSessionTypesByCategory = (category: string): SessionType[] => {
  switch (category.toLowerCase()) {
    case 'علاج العصب':
    case 'endodontic':
      return ENDODONTIC_SESSIONS

    case 'ترميمي/تحفظي':
    case 'restorative':
      return RESTORATIVE_SESSIONS

    case 'تركيبات':
    case 'prosthetic':
      return PROSTHETIC_SESSIONS

    case 'جراحي':
    case 'surgical':
      return SURGICAL_SESSIONS

    case 'لثة':
    case 'periodontal':
      return PERIODONTAL_SESSIONS

    case 'أطفال':
    case 'pediatric':
      return PEDIATRIC_SESSIONS

    case 'تجميلي':
    case 'cosmetic':
      return COSMETIC_SESSIONS

    default:
      // إرجاع جلسات عامة للعلاجات غير المصنفة
      return [
        { value: 'consultation', label: 'استشارة', description: 'استشارة وفحص' },
        { value: 'treatment', label: 'علاج', description: 'جلسة علاج' },
        { value: 'follow_up', label: 'متابعة', description: 'جلسة متابعة' }
      ]
  }
}

// دالة للحصول على جميع أنواع الجلسات
export const getAllSessionTypes = (): SessionType[] => {
  return [
    ...ENDODONTIC_SESSIONS,
    ...RESTORATIVE_SESSIONS,
    ...PROSTHETIC_SESSIONS,
    ...SURGICAL_SESSIONS,
    ...PERIODONTAL_SESSIONS,
    ...PEDIATRIC_SESSIONS,
    ...COSMETIC_SESSIONS
  ].filter((session, index, self) =>
    index === self.findIndex(s => s.value === session.value)
  ) // إزالة التكرارات
}
