import type {
  SearchResults,
  SearchCriteria,
  SearchResult,
  Patient,
  Appointment,
  Payment,
  ToothTreatment,
  Prescription
} from '@/types'
import { getTreatmentNameInArabic } from '@/data/teethData'

/**
 * خدمة البحث الشامل
 * تبحث عبر جميع مكونات النظام وتعيد نتائج مترابطة
 */
export class GlobalSearchService {

  /**
   * البحث الشامل الرئيسي
   */
  static async performGlobalSearch(criteria: SearchCriteria): Promise<SearchResults> {
    const startTime = Date.now()

    try {
      // تحديد الأنواع المطلوب البحث فيها
      const searchTypes = criteria.types || ['patient', 'appointment', 'payment', 'treatment', 'prescription']

      // تنفيذ البحث بشكل متوازي
      const searchPromises = []

      if (searchTypes.includes('patient')) {
        searchPromises.push(this.searchPatients(criteria))
      }
      if (searchTypes.includes('appointment')) {
        searchPromises.push(this.searchAppointments(criteria))
      }
      if (searchTypes.includes('payment')) {
        searchPromises.push(this.searchPayments(criteria))
      }
      if (searchTypes.includes('treatment')) {
        searchPromises.push(this.searchTreatments(criteria))
      }
      if (searchTypes.includes('prescription')) {
        searchPromises.push(this.searchPrescriptions(criteria))
      }

      const results = await Promise.all(searchPromises)

      // تجميع النتائج
      const searchResults: SearchResults = {
        patients: searchTypes.includes('patient') ? results[searchTypes.indexOf('patient')] || [] : [],
        appointments: searchTypes.includes('appointment') ? results[searchTypes.indexOf('appointment')] || [] : [],
        payments: searchTypes.includes('payment') ? results[searchTypes.indexOf('payment')] || [] : [],
        treatments: searchTypes.includes('treatment') ? results[searchTypes.indexOf('treatment')] || [] : [],
        prescriptions: searchTypes.includes('prescription') ? results[searchTypes.indexOf('prescription')] || [] : [],
        totalCount: 0,
        searchTime: Date.now() - startTime,
        query: criteria.query
      }

      // حساب العدد الإجمالي
      searchResults.totalCount =
        searchResults.patients.length +
        searchResults.appointments.length +
        searchResults.payments.length +
        searchResults.treatments.length +
        searchResults.prescriptions.length

      // ترتيب النتائج حسب الصلة
      this.sortResultsByRelevance(searchResults, criteria)

      // تطبيق الحد الأقصى للنتائج
      if (criteria.limit) {
        this.limitResults(searchResults, criteria.limit)
      }

      return searchResults

    } catch (error) {
      console.error('Global search error:', error)
      throw new Error('فشل في البحث الشامل')
    }
  }

  /**
   * البحث في المرضى
   */
  private static async searchPatients(criteria: SearchCriteria): Promise<SearchResult[]> {
    try {
      const patients = await window.electronAPI?.patients?.search?.(criteria.query) || []

      return patients.map((patient: Patient) => ({
        id: patient.id,
        type: 'patient' as const,
        title: patient.full_name,
        subtitle: `#${patient.serial_number} | ${patient.age} سنة | ${patient.gender === 'male' ? 'ذكر' : 'أنثى'}`,
        description: `📞 ${patient.phone || 'غير محدد'} | 📧 ${patient.email || 'غير محدد'}`,
        relevanceScore: this.calculateRelevanceScore(criteria.query, [
          patient.full_name,
          patient.serial_number,
          patient.phone || '',
          patient.email || ''
        ]),
        data: patient,
        relatedData: {
          patientId: patient.id
        }
      }))
    } catch (error) {
      console.error('Search patients error:', error)
      return []
    }
  }

  /**
   * البحث في المواعيد
   */
  private static async searchAppointments(criteria: SearchCriteria): Promise<SearchResult[]> {
    try {
      // البحث في المواعيد باستخدام API الإلكتروني
      const appointments = await window.electronAPI?.appointments?.search?.(criteria.query) || []

      return appointments.map((appointment: Appointment) => ({
        id: appointment.id,
        type: 'appointment' as const,
        title: appointment.title,
        subtitle: `${appointment.patient_name || 'مريض غير محدد'} | ${this.formatDate(appointment.start_time)}`,
        description: `🕐 ${this.formatTime(appointment.start_time)} - ${this.formatTime(appointment.end_time)} | ${this.getStatusText(appointment.status)}`,
        relevanceScore: this.calculateRelevanceScore(criteria.query, [
          appointment.title,
          appointment.description || '',
          appointment.patient_name || '',
          appointment.notes || ''
        ]),
        data: appointment,
        relatedData: {
          patientId: appointment.patient_id,
          appointmentId: appointment.id
        }
      }))
    } catch (error) {
      console.error('Search appointments error:', error)
      return []
    }
  }

  /**
   * البحث في الدفعات
   */
  private static async searchPayments(criteria: SearchCriteria): Promise<SearchResult[]> {
    try {
      const payments = await window.electronAPI?.payments?.search?.(criteria.query) || []

      return payments.map((payment: Payment) => ({
        id: payment.id,
        type: 'payment' as const,
        title: `دفعة ${payment.amount}$ - ${payment.patient_name || 'مريض غير محدد'}`,
        subtitle: `${this.formatDate(payment.payment_date)} | ${payment.receipt_number || 'بدون رقم إيصال'}`,
        description: `💳 ${payment.payment_method === 'cash' ? 'نقدي' : 'تحويل بنكي'} | ${this.getPaymentStatusText(payment.status)}`,
        relevanceScore: this.calculateRelevanceScore(criteria.query, [
          payment.patient?.full_name || '',
          payment.description || '',
          payment.receipt_number || '',
          payment.notes || ''
        ]),
        data: payment,
        relatedData: {
          patientId: payment.patient_id,
          paymentId: payment.id,
          appointmentId: payment.appointment_id
        }
      }))
    } catch (error) {
      console.error('Search payments error:', error)
      return []
    }
  }

  /**
   * البحث في العلاجات
   */
  private static async searchTreatments(criteria: SearchCriteria): Promise<SearchResult[]> {
    try {
      const treatments = await window.electronAPI?.treatments?.search?.(criteria.query) || []

      return treatments.map((treatment: ToothTreatment) => ({
        id: treatment.id,
        type: 'treatment' as const,
        title: `${getTreatmentNameInArabic(treatment.treatment_type)} - السن ${treatment.tooth_number}`,
        subtitle: `${treatment.patient_name || 'مريض غير محدد'} | ${this.getTreatmentStatusText(treatment.treatment_status)}`,
        description: `🦷 ${treatment.tooth_name} | 💰 ${treatment.cost || 0}$`,
        relevanceScore: this.calculateRelevanceScore(criteria.query, [
          getTreatmentNameInArabic(treatment.treatment_type),
          treatment.tooth_name,
          treatment.patient?.full_name || '',
          treatment.notes || ''
        ]),
        data: treatment,
        relatedData: {
          patientId: treatment.patient_id,
          treatmentId: treatment.id,
          appointmentId: treatment.appointment_id
        }
      }))
    } catch (error) {
      console.error('Search treatments error:', error)
      return []
    }
  }

  /**
   * البحث في الوصفات
   */
  private static async searchPrescriptions(criteria: SearchCriteria): Promise<SearchResult[]> {
    try {
      const prescriptions = await window.electronAPI?.prescriptions?.search?.(criteria.query) || []

      return prescriptions.map((prescription: Prescription) => ({
        id: prescription.id,
        type: 'prescription' as const,
        title: `وصفة ${prescription.patient_name || 'مريض غير محدد'}`,
        subtitle: `${this.formatDate(prescription.prescription_date)} | ${prescription.medications?.length || 0} دواء`,
        description: `💊 ${prescription.medications?.map(m => m.medication_name).join(', ') || 'لا توجد أدوية'}`,
        relevanceScore: this.calculateRelevanceScore(criteria.query, [
          prescription.patient?.full_name || '',
          prescription.notes || '',
          ...(prescription.medications?.map(m => m.medication_name || '') || [])
        ]),
        data: prescription,
        relatedData: {
          patientId: prescription.patient_id,
          appointmentId: prescription.appointment_id,
          treatmentId: prescription.tooth_treatment_id
        }
      }))
    } catch (error) {
      console.error('Search prescriptions error:', error)
      return []
    }
  }

  /**
   * حساب درجة الصلة
   */
  private static calculateRelevanceScore(query: string, fields: string[]): number {
    const queryLower = query.toLowerCase()
    let score = 0

    fields.forEach(field => {
      if (field) {
        const fieldLower = field.toLowerCase()

        // تطابق كامل
        if (fieldLower === queryLower) {
          score += 100
        }
        // يبدأ بالاستعلام
        else if (fieldLower.startsWith(queryLower)) {
          score += 80
        }
        // يحتوي على الاستعلام
        else if (fieldLower.includes(queryLower)) {
          score += 60
        }
        // تطابق جزئي
        else {
          const words = queryLower.split(' ')
          words.forEach(word => {
            if (word.length > 2 && fieldLower.includes(word)) {
              score += 20
            }
          })
        }
      }
    })

    return score
  }

  /**
   * ترتيب النتائج حسب الصلة
   */
  private static sortResultsByRelevance(results: SearchResults, criteria: SearchCriteria): void {
    const sortFn = (a: SearchResult, b: SearchResult) => {
      if (criteria.sortBy === 'relevance') {
        return criteria.sortOrder === 'asc' ? a.relevanceScore - b.relevanceScore : b.relevanceScore - a.relevanceScore
      } else if (criteria.sortBy === 'name') {
        return criteria.sortOrder === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
      }
      return 0
    }

    results.patients.sort(sortFn)
    results.appointments.sort(sortFn)
    results.payments.sort(sortFn)
    results.treatments.sort(sortFn)
    results.prescriptions.sort(sortFn)
  }

  /**
   * تطبيق الحد الأقصى للنتائج
   */
  private static limitResults(results: SearchResults, limit: number): void {
    const totalResults = results.totalCount
    if (totalResults <= limit) return

    // توزيع النتائج بالتساوي
    const perType = Math.floor(limit / 5)
    const remainder = limit % 5

    results.patients = results.patients.slice(0, perType + (remainder > 0 ? 1 : 0))
    results.appointments = results.appointments.slice(0, perType + (remainder > 1 ? 1 : 0))
    results.payments = results.payments.slice(0, perType + (remainder > 2 ? 1 : 0))
    results.treatments = results.treatments.slice(0, perType + (remainder > 3 ? 1 : 0))
    results.prescriptions = results.prescriptions.slice(0, perType + (remainder > 4 ? 1 : 0))

    results.totalCount = limit
  }

  // Helper methods
  private static formatDate(dateString: string): string {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return '--'
      }

      // Format as DD/MM/YYYY (Gregorian format)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()

      return `${day}/${month}/${year}`
    } catch (error) {
      return '--'
    }
  }

  private static formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  private static getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'scheduled': '🟡 مجدول',
      'completed': '🟢 مكتمل',
      'cancelled': '🔴 ملغي',
      'no_show': '⚫ لم يحضر'
    }
    return statusMap[status] || status
  }

  private static getPaymentStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'completed': '🟢 مكتمل',
      'partial': '🟡 جزئي',
      'pending': '🔴 آجل'
    }
    return statusMap[status] || status
  }

  private static getTreatmentStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'planned': '🟡 مخطط',
      'in_progress': '🔵 قيد التنفيذ',
      'completed': '🟢 مكتمل',
      'cancelled': '🔴 ملغي'
    }
    return statusMap[status] || status
  }
}
