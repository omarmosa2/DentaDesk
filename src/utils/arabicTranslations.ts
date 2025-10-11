/**
 * مركز الترجمة العربية لجميع بيانات النظام
 * Arabic Translation Center for all system data
 */

import { getTreatmentByValue } from '@/data/teethData'

// متغير لتخزين العلاجات المخصصة
let customTreatmentsCache: { [key: string]: string } = {}
let isLoadingCustomTreatments = false

// دالة لتحميل جميع العلاجات المخصصة مرة واحدة
const loadCustomTreatments = async (): Promise<void> => {
  if (isLoadingCustomTreatments) return

  isLoadingCustomTreatments = true
  try {
    if (window.electronAPI?.treatments?.getAll) {
      const treatments = await window.electronAPI.treatments.getAll()
      if (treatments && Array.isArray(treatments)) {
        treatments.forEach((treatment: any) => {
          if (treatment.id && treatment.name) {
            customTreatmentsCache[treatment.id] = treatment.name
          }
        })
      }
    }
  } catch (error) {
    console.warn('خطأ في تحميل العلاجات المخصصة:', error)
  } finally {
    isLoadingCustomTreatments = false
  }
}

// دالة للحصول على اسم العلاج المخصص
const getCustomTreatmentName = (treatmentId: string): string => {
  // التأكد من أن treatmentId هو string
  if (typeof treatmentId !== 'string') {
    console.warn('getCustomTreatmentName: treatmentId is not a string:', treatmentId)
    return 'غير محدد'
  }

  // إذا كان في الكاش، أرجعه
  if (customTreatmentsCache[treatmentId]) {
    return customTreatmentsCache[treatmentId]
  }

  // إذا لم يكن محمل، حمل العلاجات المخصصة
  if (!isLoadingCustomTreatments && Object.keys(customTreatmentsCache).length === 0) {
    loadCustomTreatments()
  }

  // إرجاع معرف العلاج مؤقتاً حتى يتم التحميل
  return treatmentId
}

// دالة لتحديث كاش العلاجات المخصصة
export const updateCustomTreatmentCache = (treatmentId: string, treatmentName: string) => {
  customTreatmentsCache[treatmentId] = treatmentName
}

// دالة لمسح كاش العلاجات المخصصة
export const clearCustomTreatmentCache = () => {
  customTreatmentsCache = {}
}

// دالة لإعادة تحميل العلاجات المخصصة
export const reloadCustomTreatments = async (): Promise<void> => {
  clearCustomTreatmentCache()
  await loadCustomTreatments()
}

// ترجمة أنواع العلاجات
export const getTreatmentNameInArabic = (treatmentType: string): string => {
  // التأكد من أن treatmentType هو string أو null/undefined
  if (typeof treatmentType !== 'string') {
    console.warn('getTreatmentNameInArabic: treatmentType is not a string:', treatmentType)
    return 'غير محدد'
  }

  if (!treatmentType) return 'غير محدد'

  // أولاً، تحقق من العلاجات المحددة مسبقاً في TREATMENT_TYPES
  const predefinedTreatment = getTreatmentByValue(treatmentType)
  if (predefinedTreatment) {
    return predefinedTreatment.label
  }

  // إذا لم يكن من العلاجات المحددة مسبقاً، فهو علاج مخصص بـ UUID
  // نحتاج للبحث عنه في قاعدة البيانات
  return getCustomTreatmentName(treatmentType)
}

// ترجمة فئات العلاجات
export const getCategoryNameInArabic = (category: string): string => {
  // التأكد من أن category هو string أو null/undefined
  if (typeof category !== 'string') {
    console.warn('getCategoryNameInArabic: category is not a string:', category)
    return 'غير محدد'
  }

  if (!category) return 'غير محدد'

  // If category is already in Arabic, return it
  if (category && (category.includes('العلاجات') || category.includes('علاج') || category.includes('التعويضات'))) {
    return category
  }

  // Map English categories to Arabic
  const categoryMap: { [key: string]: string } = {
    'preventive': 'العلاجات الوقائية',
    'restorative': 'الترميمية (المحافظة)',
    'endodontic': 'علاج العصب',
    'surgical': 'العلاجات الجراحية',
    'cosmetic': 'العلاجات التجميلية',
    'orthodontic': 'علاجات التقويم',
    'periodontal': 'علاجات اللثة',
    'pediatric': 'علاجات الأطفال',
    'prosthetic': 'التعويضات'
  }

  return categoryMap[category] || category
}

// ترجمة حالات العلاجات
export const getStatusLabelInArabic = (status: string): string => {
  // التأكد من أن status هو string أو null/undefined
  if (typeof status !== 'string') {
    console.warn('getStatusLabelInArabic: status is not a string:', status)
    return 'غير محدد'
  }

  if (!status) return 'غير محدد'

  const statusLabels: { [key: string]: string } = {
    'planned': 'مخطط',
    'in_progress': 'قيد التنفيذ',
    'completed': 'مكتمل',
    'cancelled': 'ملغي',
    'pending': 'آجل',
    'active': 'نشط',
    'inactive': 'غير نشط'
  }

  return statusLabels[status] || status
}

// ترجمة حالات المواعيد
export const getAppointmentStatusInArabic = (status: string): string => {
  if (!status) return 'غير محدد'

  const statusLabels: { [key: string]: string } = {
    'scheduled': 'مجدول',
    'confirmed': 'مؤكد',
    'completed': 'مكتمل',
    'cancelled': 'ملغي',
    'no_show': 'لم يحضر',
    'rescheduled': 'أعيد جدولته'
  }

  return statusLabels[status] || status
}

// ترجمة حالات المدفوعات
export const getPaymentStatusInArabic = (status: string): string => {
  if (!status) return 'غير محدد'

  const statusLabels: { [key: string]: string } = {
    'pending': 'آجل',
    'completed': 'مكتمل',
    'partial': 'جزئي',
    'cancelled': 'ملغي',
    'refunded': 'مسترد'
  }

  return statusLabels[status] || status
}

// ترجمة طرق الدفع
export const getPaymentMethodInArabic = (method: string): string => {
  if (!method) return 'غير محدد'

  const methodLabels: { [key: string]: string } = {
    'cash': 'نقدي',
    'card': 'بطاقة',
    'bank_transfer': 'تحويل بنكي',
    'check': 'شيك',
    'installment': 'تقسيط'
  }

  return methodLabels[method] || method
}

// ترجمة أولويات احتياجات العيادة
export const getPriorityLabelInArabic = (priority: string): string => {
  if (!priority) return 'غير محدد'

  const priorityLabels: { [key: string]: string } = {
    'urgent': 'عاجل',
    'high': 'عالي',
    'medium': 'متوسط',
    'low': 'منخفض'
  }

  return priorityLabels[priority] || priority
}

// ترجمة حالات احتياجات العيادة
export const getClinicNeedStatusInArabic = (status: string): string => {
  if (!status) return 'غير محدد'

  const statusLabels: { [key: string]: string } = {
    'pending': 'آجل',
    'ordered': 'مطلوب',
    'received': 'مستلم',
    'cancelled': 'ملغي'
  }

  return statusLabels[status] || status
}

// ترجمة أنواع المخزون
export const getInventoryTypeInArabic = (type: string): string => {
  if (!type) return 'غير محدد'

  const typeLabels: { [key: string]: string } = {
    'medication': 'دواء',
    'equipment': 'معدات',
    'supplies': 'مستلزمات',
    'material': 'مواد'
  }

  return typeLabels[type] || type
}

// دالة شاملة لترجمة أي نص حسب النوع
export const translateToArabic = (text: string, type: 'treatment' | 'category' | 'status' | 'appointment_status' | 'payment_status' | 'payment_method' | 'priority' | 'clinic_need_status' | 'inventory_type'): string => {
  switch (type) {
    case 'treatment':
      return getTreatmentNameInArabic(text)
    case 'category':
      return getCategoryNameInArabic(text)
    case 'status':
      return getStatusLabelInArabic(text)
    case 'appointment_status':
      return getAppointmentStatusInArabic(text)
    case 'payment_status':
      return getPaymentStatusInArabic(text)
    case 'payment_method':
      return getPaymentMethodInArabic(text)
    case 'priority':
      return getPriorityLabelInArabic(text)
    case 'clinic_need_status':
      return getClinicNeedStatusInArabic(text)
    case 'inventory_type':
      return getInventoryTypeInArabic(text)
    default:
      return text
  }
}
