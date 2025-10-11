import {
  Payment,
  Appointment,
  ToothTreatment,
  Patient,
  PendingPaymentItem,
  PendingPaymentsSummary,
  PendingPaymentsFilter,
  ComprehensiveInvoiceSettings,
  ComprehensiveInvoiceData,
  ClinicSettings
} from '@/types'
import { getTreatmentNameInArabic } from '@/data/teethData'

/**
 * خدمة حسابات المدفوعات الآجلة
 * تضمن دقة الحسابات ومنع الأخطاء المحاسبية
 */
export class PendingPaymentsService {

  /**
   * حساب نطاق التاريخ بناءً على الفلتر
   */
  static calculateDateRange(filter: PendingPaymentsFilter): { from: string; to: string } {
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    switch (filter.date_range) {
      case 'last_month': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        return {
          from: lastMonth.toISOString().split('T')[0],
          to: today
        }
      }
      case 'last_3_months': {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        return {
          from: threeMonthsAgo.toISOString().split('T')[0],
          to: today
        }
      }
      case 'last_6_months': {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
        return {
          from: sixMonthsAgo.toISOString().split('T')[0],
          to: today
        }
      }
      case 'last_year': {
        const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        return {
          from: lastYear.toISOString().split('T')[0],
          to: today
        }
      }
      case 'custom': {
        return {
          from: filter.custom_start_date || today,
          to: filter.custom_end_date || today
        }
      }
      default:
        return { from: today, to: today }
    }
  }

  /**
   * فلترة المدفوعات الآجلة حسب التاريخ
   */
  static filterPaymentsByDate(
    payments: Payment[],
    dateRange: { from: string; to: string }
  ): Payment[] {
    return payments.filter(payment => {
      const paymentDate = payment.payment_date
      return paymentDate >= dateRange.from && paymentDate <= dateRange.to
    })
  }

  /**
   * الحصول على المدفوعات الآجلة لمريض محدد
   */
  static async getPatientPendingPayments(
    patientId: string,
    filter: PendingPaymentsFilter,
    payments: Payment[],
    appointments: Appointment[] = [],
    treatments: ToothTreatment[] = []
  ): Promise<PendingPaymentItem[]> {
    try {
      const dateRange = this.calculateDateRange(filter)

      // التحقق من وجود البيانات المطلوبة
      const safePayments = payments || []
      const safeAppointments = appointments || []
      const safeTreatments = treatments || []

      // فلترة المدفوعات الآجلة للمريض
      const patientPendingPayments = safePayments.filter(payment =>
        payment.patient_id === patientId &&
        payment.status === 'pending'
      )

      // فلترة حسب التاريخ
      const filteredPayments = this.filterPaymentsByDate(patientPendingPayments, dateRange)

      // تحويل المدفوعات إلى عناصر فاتورة
      const pendingItems: PendingPaymentItem[] = []

      for (const payment of filteredPayments) {
        // البحث عن الموعد المرتبط
        const appointment = payment.appointment_id
          ? safeAppointments.find(apt => apt.id === payment.appointment_id)
          : undefined

        // البحث عن العلاج المرتبط مباشرة (النظام الجديد)
        const directTreatment = payment.tooth_treatment_id
          ? safeTreatments.find(treatment => treatment.id === payment.tooth_treatment_id)
          : undefined

        // البحث عن العلاجات المرتبطة بالموعد (النظام القديم)
        const appointmentTreatments = appointment
          ? safeTreatments.filter(treatment => treatment.appointment_id === appointment.id)
          : []

        // تحديد العلاج المستخدم (أولوية للعلاج المرتبط مباشرة)
        const relatedTreatment = directTreatment || (appointmentTreatments.length === 1 ? appointmentTreatments[0] : undefined)
        const allRelatedTreatments = directTreatment ? [directTreatment] : appointmentTreatments

        // إنشاء عنصر فاتورة للدفعة
        // للمدفوعات الآجلة، استخدام المبلغ الإجمالي المطلوب إذا كان المبلغ المدفوع 0
        const paymentAmount = payment.amount || 0

        // تحديد المبلغ الآجل حسب نوع الدفعة
        let pendingAmount = paymentAmount
        let totalAmountDue = 0
        let remainingBalance = 0

        if (payment.tooth_treatment_id) {
          // دفعة مرتبطة بعلاج مباشرة
          totalAmountDue = payment.treatment_total_cost || 0
          remainingBalance = payment.treatment_remaining_balance || 0
          pendingAmount = remainingBalance > 0 ? remainingBalance : totalAmountDue
        } else if (payment.appointment_id) {
          // دفعة مرتبطة بموعد
          totalAmountDue = payment.appointment_total_cost || payment.total_amount_due || 0
          remainingBalance = payment.appointment_remaining_balance || payment.remaining_balance || 0
          pendingAmount = remainingBalance > 0 ? remainingBalance : totalAmountDue
        } else {
          // دفعة عامة
          totalAmountDue = payment.total_amount_due || 0
          remainingBalance = payment.remaining_balance || 0
          if (paymentAmount === 0 && totalAmountDue > 0) {
            pendingAmount = totalAmountDue
          } else if (paymentAmount === 0 && remainingBalance > 0) {
            pendingAmount = remainingBalance
          } else if (remainingBalance > 0) {
            pendingAmount = remainingBalance
          }
        }

        // تحضير اسم العلاج بالعربية
        let treatmentTypeArabic: string | undefined
        if (relatedTreatment?.treatment_type) {
          treatmentTypeArabic = getTreatmentNameInArabic(relatedTreatment.treatment_type)
          // إذا لم تنجح الترجمة، استخدم النص الأصلي
          if (treatmentTypeArabic === relatedTreatment.treatment_type) {
            // محاولة ترجمة يدوية للعلاجات الشائعة
            const manualTranslations: { [key: string]: string } = {
              'pediatric_pulp_treatment': 'معالجة لبية',
              'pulp_therapy': 'مداولة لبية',
              'filling_metal': 'حشو معدني',
              'filling_cosmetic': 'حشو تجميلي',
              'crown_ceramic': 'تاج خزفي',
              'extraction_simple': 'قلع بسيط'
            }
            treatmentTypeArabic = manualTranslations[relatedTreatment.treatment_type] || relatedTreatment.treatment_type
          }
        } else if (allRelatedTreatments.length > 0) {
          treatmentTypeArabic = allRelatedTreatments
            .map(t => {
              let translated = getTreatmentNameInArabic(t.treatment_type)
              if (translated === t.treatment_type) {
                const manualTranslations: { [key: string]: string } = {
                  'pediatric_pulp_treatment': 'معالجة لبية',
                  'pulp_therapy': 'مداولة لبية',
                  'filling_metal': 'حشو معدني',
                  'filling_cosmetic': 'حشو تجميلي',
                  'crown_ceramic': 'تاج خزفي',
                  'extraction_simple': 'قلع بسيط'
                }
                translated = manualTranslations[t.treatment_type] || t.treatment_type
              }
              return translated
            })
            .join(', ')
        }

        // تنظيف الوصف من معرفات العلاج
        let cleanDescription = payment.description
        if (cleanDescription) {
          // إزالة معرف العلاج من الوصف مثل [علاج:uuid]
          cleanDescription = cleanDescription.replace(/\[علاج:[^\]]+\]/g, '').trim()
          // إزالة الأقواس الفارغة إذا كانت موجودة
          cleanDescription = cleanDescription.replace(/^\s*-\s*/, '').trim()
          // إذا أصبح الوصف فارغاً، استخدم اسم العلاج
          if (!cleanDescription && treatmentTypeArabic) {
            cleanDescription = treatmentTypeArabic
          }
        }

        // إذا لم يكن لدينا اسم علاج بالعربية، حاول استخراجه من الوصف
        if (!treatmentTypeArabic && cleanDescription) {
          // البحث عن أنماط شائعة في الوصف
          const descriptionPatterns: { [key: string]: string } = {
            'pediatric_pulp_treatment': 'معالجة لبية',
            'معالجة لبية': 'معالجة لبية',
            'علاج عصب': 'علاج عصب',
            'حشو': 'حشو',
            'تاج': 'تاج',
            'قلع': 'قلع'
          }

          for (const [pattern, arabicName] of Object.entries(descriptionPatterns)) {
            if (cleanDescription.includes(pattern)) {
              treatmentTypeArabic = arabicName
              break
            }
          }
        }

        // تنظيف الملاحظات أيضاً من معرفات العلاج
        let cleanNotes = payment.notes
        if (cleanNotes) {
          cleanNotes = cleanNotes.replace(/\[علاج:[^\]]+\]/g, '').trim()
          cleanNotes = cleanNotes.replace(/^\s*-\s*/, '').trim()
        }

        const item: PendingPaymentItem = {
          id: payment.id,
          patient_id: payment.patient_id,
          appointment_id: payment.appointment_id,
          tooth_treatment_id: payment.tooth_treatment_id, // إضافة معرف العلاج
          appointment_date: appointment?.start_time?.split('T')[0],
          appointment_title: appointment?.title,
          treatment_type: treatmentTypeArabic, // استخدام الترجمة العربية
          tooth_number: relatedTreatment?.tooth_number,
          tooth_name: relatedTreatment?.tooth_name,
          amount: this.roundToTwoDecimals(pendingAmount),
          description: cleanDescription, // استخدام الوصف المنظف
          payment_date: payment.payment_date,
          notes: cleanNotes,
          discount_amount: this.roundToTwoDecimals(payment.discount_amount || 0),
          tax_amount: this.roundToTwoDecimals(payment.tax_amount || 0),
          total_amount: this.roundToTwoDecimals(payment.total_amount || pendingAmount),
          // إضافة حقول للعلاجات
          treatment_total_cost: payment.treatment_total_cost,
          treatment_remaining_balance: payment.treatment_remaining_balance,
          // إضافة حقول للمواعيد
          appointment_total_cost: payment.appointment_total_cost,
          appointment_remaining_balance: payment.appointment_remaining_balance
        }



        pendingItems.push(item)
      }

      // لا حاجة لإضافة أي شيء آخر - فقط المدفوعات الآجلة من جدول المدفوعات

      return pendingItems.sort((a, b) =>
        new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
      )

    } catch (error) {
      console.error('خطأ في جلب المدفوعات الآجلة:', error)
      throw new Error('فشل في جلب المدفوعات الآجلة')
    }
  }



  /**
   * حساب ملخص المدفوعات الآجلة مع الخصومات والضرائب
   */
  static calculatePendingPaymentsSummary(
    patientId: string,
    patientName: string,
    items: PendingPaymentItem[],
    settings: ComprehensiveInvoiceSettings,
    dateRange: { from: string; to: string }
  ): PendingPaymentsSummary {
    // حساب المجموع الفرعي
    const subtotal = this.roundToTwoDecimals(
      items.reduce((sum, item) => sum + item.amount, 0)
    )

    // حساب الخصم
    let totalDiscount = 0
    if (settings.apply_discount && settings.discount_value > 0) {
      if (settings.discount_type === 'percentage') {
        totalDiscount = this.roundToTwoDecimals((subtotal * settings.discount_value) / 100)
      } else {
        totalDiscount = this.roundToTwoDecimals(Math.min(settings.discount_value, subtotal))
      }
    }

    // حساب المبلغ بعد الخصم
    const amountAfterDiscount = this.roundToTwoDecimals(subtotal - totalDiscount)

    // حساب الضريبة
    let totalTax = 0
    if (settings.include_tax && settings.tax_rate > 0) {
      totalTax = this.roundToTwoDecimals((amountAfterDiscount * settings.tax_rate) / 100)
    }

    // حساب المجموع النهائي
    const finalTotal = this.roundToTwoDecimals(amountAfterDiscount + totalTax)

    return {
      patient_id: patientId,
      patient_name: patientName,
      total_pending_amount: subtotal,
      total_items: items.length,
      items: items,
      subtotal: subtotal,
      total_discount: totalDiscount,
      total_tax: totalTax,
      final_total: finalTotal,
      date_range: dateRange
    }
  }

  /**
   * تقريب الرقم إلى منزلتين عشريتين لضمان دقة الحسابات
   */
  private static roundToTwoDecimals(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100
  }

  /**
   * توليد رقم فاتورة فريد
   */
  static generateInvoiceNumber(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')

    return `INV-${year}${month}${day}-${time}-${random}`
  }

  /**
   * إنشاء بيانات الفاتورة الشاملة
   */
  static createComprehensiveInvoiceData(
    patient: Patient,
    summary: PendingPaymentsSummary,
    settings: ComprehensiveInvoiceSettings,
    clinicInfo: ClinicSettings
  ): ComprehensiveInvoiceData {
    return {
      invoice_number: this.generateInvoiceNumber(),
      invoice_date: new Date().toISOString().split('T')[0],
      patient: patient,
      summary: summary,
      settings: settings,
      clinic_info: clinicInfo,
      generated_at: new Date().toISOString()
    }
  }

  /**
   * التحقق من صحة البيانات المالية
   */
  static validateFinancialData(summary: PendingPaymentsSummary): boolean {
    // التحقق من أن المجموع الفرعي يساوي مجموع العناصر
    const calculatedSubtotal = this.roundToTwoDecimals(
      summary.items.reduce((sum, item) => sum + item.amount, 0)
    )

    if (Math.abs(calculatedSubtotal - summary.subtotal) > 0.01) {
      console.error('خطأ في حساب المجموع الفرعي')
      return false
    }

    // التحقق من أن المجموع النهائي صحيح
    const expectedFinalTotal = this.roundToTwoDecimals(
      summary.subtotal - summary.total_discount + summary.total_tax
    )

    if (Math.abs(expectedFinalTotal - summary.final_total) > 0.01) {
      console.error('خطأ في حساب المجموع النهائي')
      return false
    }

    return true
  }
}
