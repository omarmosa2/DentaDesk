import type {
  PatientIntegratedData,
  Patient,
  Appointment,
  ToothTreatment,
  Payment,
  Prescription,
  LabOrder,
  PatientTreatmentTimeline,
  TreatmentPlan
} from '@/types'

/**
 * خدمة التكامل الشامل للمريض
 * تجمع جميع البيانات المرتبطة بالمريض من مختلف الجداول
 */
export class PatientIntegrationService {

  /**
   * جلب جميع البيانات المتكاملة للمريض
   */
  static async getPatientIntegratedData(patientId: string): Promise<PatientIntegratedData | null> {
    try {
      // جلب بيانات المريض الأساسية من جميع المرضى
      const allPatients = await window.electronAPI?.patients?.getAll?.() || []
      const patient = allPatients.find(p => p.id === patientId)

      if (!patient) {
        throw new Error('المريض غير موجود')
      }

      // جلب جميع البيانات المرتبطة بالمريض بشكل متوازي مع تحسين الأداء
      const [
        appointments,
        treatments,
        payments,
        prescriptions,
        labOrders,
        timeline,
        treatmentPlans
      ] = await Promise.all([
        this.getPatientAppointments(patientId),
        this.getPatientTreatments(patientId),
        this.getPatientPayments(patientId),
        this.getPatientPrescriptions(patientId),
        this.getPatientLabOrders(patientId),
        this.getPatientTimeline(patientId),
        this.getPatientTreatmentPlans(patientId)
      ])

      // حساب الإحصائيات
      const stats = this.calculatePatientStats({
        appointments,
        treatments,
        payments,
        prescriptions,
        labOrders
      })

      return {
        patient,
        appointments,
        treatments,
        payments,
        prescriptions,
        labOrders,
        timeline,
        treatmentPlans,
        stats
      }
    } catch (error) {
      console.error('خطأ في جلب البيانات المتكاملة للمريض:', error)
      return null
    }
  }

  /**
   * جلب جميع البيانات المتكاملة للمريض باستخدام استعلام واحد محسن (موصى به)
   * هذا الطريقة تحتاج إلى تنفيذ في الـ backend
   */
  static async getPatientIntegratedDataOptimized(patientId: string): Promise<PatientIntegratedData | null> {
    try {
      // هذا طريقة مثالية تحتاج إلى backend implementation
      // const result = await window.electronAPI?.patients?.getIntegratedData?.(patientId)

      // للوقت الحالي، نستخدم الطريقة المحسنة الموجودة
      return this.getPatientIntegratedDataWithCaching(patientId)
    } catch (error) {
      console.error('خطأ في جلب البيانات المتكاملة المحسنة للمريض:', error)
      // fallback to the original method
      return this.getPatientIntegratedData(patientId)
    }
  }

  /**
   * جلب البيانات المتكاملة مع caching لتحسين الأداء
   */
  private static patientDataCache = new Map<string, { data: PatientIntegratedData | null, timestamp: number }>()
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

  static async getPatientIntegratedDataWithCaching(patientId: string): Promise<PatientIntegratedData | null> {
    // Check cache first
    const cached = this.patientDataCache.get(patientId)
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL_MS) {
      return cached.data
    }

    // Fetch fresh data
    const data = await this.getPatientIntegratedData(patientId)

    // Cache the result
    this.patientDataCache.set(patientId, { data, timestamp: Date.now() })

    return data
  }

  /**
   * تنظيف cache البيانات
   */
  static clearPatientDataCache(patientId?: string) {
    if (patientId) {
      this.patientDataCache.delete(patientId)
    } else {
      this.patientDataCache.clear()
    }
  }

  /**
   * جلب مواعيد المريض
   */
  private static async getPatientAppointments(patientId: string): Promise<Appointment[]> {
    try {
      return await window.electronAPI?.appointments?.getByPatient?.(patientId) || []
    } catch (error) {
      console.error('خطأ في جلب مواعيد المريض:', error)
      return []
    }
  }

  /**
   * جلب علاجات المريض
   */
  private static async getPatientTreatments(patientId: string): Promise<ToothTreatment[]> {
    try {
      return await window.electronAPI?.toothTreatments?.getByPatient?.(patientId) || []
    } catch (error) {
      console.error('خطأ في جلب علاجات المريض:', error)
      return []
    }
  }

  /**
   * جلب دفعات المريض
   */
  private static async getPatientPayments(patientId: string): Promise<Payment[]> {
    try {
      return await window.electronAPI?.payments?.getByPatient?.(patientId) || []
    } catch (error) {
      console.error('خطأ في جلب دفعات المريض:', error)
      return []
    }
  }

  /**
   * جلب وصفات المريض
   */
  private static async getPatientPrescriptions(patientId: string): Promise<Prescription[]> {
    try {
      return await window.electronAPI?.prescriptions?.getByPatient?.(patientId) || []
    } catch (error) {
      console.error('خطأ في جلب وصفات المريض:', error)
      return []
    }
  }

  /**
   * جلب طلبات المختبر للمريض
   */
  private static async getPatientLabOrders(patientId: string): Promise<LabOrder[]> {
    try {
      return await window.electronAPI?.labOrders?.getByPatient?.(patientId) || []
    } catch (error) {
      console.error('خطأ في جلب طلبات المختبر للمريض:', error)
      return []
    }
  }

  /**
   * جلب الجدول الزمني للمريض
   */
  private static async getPatientTimeline(patientId: string): Promise<PatientTreatmentTimeline[]> {
    try {
      return await window.electronAPI?.patientTimeline?.getByPatient?.(patientId) || []
    } catch (error) {
      console.error('خطأ في جلب الجدول الزمني للمريض:', error)
      return []
    }
  }

  /**
   * جلب خطط العلاج للمريض
   */
  private static async getPatientTreatmentPlans(patientId: string): Promise<TreatmentPlan[]> {
    try {
      return await window.electronAPI?.treatmentPlans?.getByPatient?.(patientId) || []
    } catch (error) {
      console.error('خطأ في جلب خطط العلاج للمريض:', error)
      return []
    }
  }

  /**
   * حساب إحصائيات المريض بطريقة محسنة
   */
  private static calculatePatientStats(data: {
    appointments: Appointment[]
    treatments: ToothTreatment[]
    payments: Payment[]
    prescriptions: Prescription[]
    labOrders: LabOrder[]
  }) {
    const { appointments, treatments, payments } = data

    // حساب إجمالي المواعيد
    const totalAppointments = appointments.length

    // حساب العلاجات المكتملة والآجلة باستخدام Set للأداء الأفضل
    const treatmentStatusCounts = treatments.reduce((acc, t) => {
      acc[t.treatment_status] = (acc[t.treatment_status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const completedTreatments = treatmentStatusCounts['completed'] || 0
    const pendingTreatments = (treatmentStatusCounts['planned'] || 0) + (treatmentStatusCounts['in_progress'] || 0)

    // تحسين حساب المبالغ المالية باستخدام Map للأداء الأفضل
    const paymentMap = new Map<string, Payment[]>()
    const generalPayments: Payment[] = []

    // تجميع المدفوعات حسب الموعد لتجنب الـ filtering المتكرر
    payments.forEach(payment => {
      if (payment.appointment_id) {
        if (!paymentMap.has(payment.appointment_id)) {
          paymentMap.set(payment.appointment_id, [])
        }
        paymentMap.get(payment.appointment_id)!.push(payment)
      } else {
        generalPayments.push(payment)
      }
    })

    let totalPaid = 0
    let totalDue = 0

    // حساب المدفوعات المرتبطة بالمواعيد بكفاءة أعلى
    appointments.forEach(appointment => {
      if (appointment.cost) {
        const appointmentPayments = paymentMap.get(appointment.id) || []
        const appointmentTotalPaid = appointmentPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
        totalDue += appointment.cost
        totalPaid += appointmentTotalPaid
      }
    })

    // إضافة المدفوعات العامة غير المرتبطة بمواعيد
    generalPayments.forEach(payment => {
      totalPaid += payment.amount || 0
      if (payment.total_amount_due) {
        totalDue += payment.total_amount_due
      }
    })

    // حساب المبلغ المتبقي بشكل صحيح: الإجمالي المطلوب - الإجمالي المدفوع
    const remainingBalance = Math.max(0, totalDue - totalPaid)

    // تحسين البحث عن آخر زيارة والموعد القادم
    const currentTime = new Date().getTime()

    // فلترة المواعيد المكتملة وغير المكتملة في عملية واحدة
    const completedAppointments: Appointment[] = []
    const scheduledAppointments: Appointment[] = []

    appointments.forEach(apt => {
      if (apt.status === 'completed') {
        completedAppointments.push(apt)
      } else if (apt.status === 'scheduled') {
        scheduledAppointments.push(apt)
      }
    })

    // آخر زيارة - فرز المواعيد المكتملة
    let lastVisit: string | undefined
    if (completedAppointments.length > 0) {
      completedAppointments.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
      lastVisit = completedAppointments[0].start_time
    }

    // الموعد القادم - فرز المواعيد المجدولة المستقبلية
    let nextAppointment: string | undefined
    const futureAppointments = scheduledAppointments.filter(apt => new Date(apt.start_time).getTime() > currentTime)
    if (futureAppointments.length > 0) {
      futureAppointments.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      nextAppointment = futureAppointments[0].start_time
    }

    return {
      totalAppointments,
      completedTreatments,
      pendingTreatments,
      totalPaid: Math.round(totalPaid * 100) / 100, // تحسين الدقة
      remainingBalance: Math.round(remainingBalance * 100) / 100,
      lastVisit,
      nextAppointment
    }
  }

  /**
   * إنشاء حدث في الجدول الزمني للمريض
   */
  static async createTimelineEvent(event: Omit<PatientTreatmentTimeline, 'id' | 'created_at' | 'updated_at'>): Promise<PatientTreatmentTimeline | null> {
    try {
      return await window.electronAPI?.patientTimeline?.create?.(event) || null
    } catch (error) {
      console.error('خطأ في إنشاء حدث الجدول الزمني:', error)
      return null
    }
  }

  /**
   * ربط الوصفة بعلاج سن محدد
   */
  static async linkPrescriptionToTreatment(prescriptionId: string, toothTreatmentId: string): Promise<boolean> {
    try {
      const result = await window.electronAPI?.prescriptions?.update?.(prescriptionId, {
        tooth_treatment_id: toothTreatmentId
      })
      return !!result
    } catch (error) {
      console.error('خطأ في ربط الوصفة بالعلاج:', error)
      return false
    }
  }

  /**
   * ربط طلب المختبر بعلاج سن محدد
   */
  static async linkLabOrderToTreatment(labOrderId: string, toothTreatmentId: string, appointmentId?: string): Promise<boolean> {
    try {
      const updateData: any = { tooth_treatment_id: toothTreatmentId }
      if (appointmentId) {
        updateData.appointment_id = appointmentId
      }

      const result = await window.electronAPI?.labOrders?.update?.(labOrderId, updateData)
      return !!result
    } catch (error) {
      console.error('خطأ في ربط طلب المختبر بالعلاج:', error)
      return false
    }
  }

  /**
   * الحصول على تقرير شامل للمريض
   */
  static async generatePatientReport(patientId: string): Promise<any> {
    const integratedData = await this.getPatientIntegratedData(patientId)
    if (!integratedData) {
      throw new Error('لا يمكن جلب بيانات المريض')
    }

    return {
      patient: integratedData.patient,
      summary: integratedData.stats,
      treatmentHistory: integratedData.treatments,
      appointmentHistory: integratedData.appointments,
      financialSummary: {
        totalPaid: integratedData.stats.totalPaid,
        remainingBalance: integratedData.stats.remainingBalance,
        paymentHistory: integratedData.payments
      },
      prescriptionHistory: integratedData.prescriptions,
      labOrderHistory: integratedData.labOrders,
      timeline: integratedData.timeline,
      treatmentPlans: integratedData.treatmentPlans,
      generatedAt: new Date().toISOString()
    }
  }
}
