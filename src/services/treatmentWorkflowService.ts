import type { 
  TreatmentPlan, 
  TreatmentPlanItem, 
  ToothTreatment, 
  Appointment, 
  Prescription, 
  LabOrder,
  PatientTreatmentTimeline
} from '@/types'
import { PatientIntegrationService } from './patientIntegrationService'

/**
 * خدمة workflow العلاج
 * تدير تدفق العمل الكامل للعلاج من التشخيص إلى الانتهاء
 */
export class TreatmentWorkflowService {

  /**
   * إنشاء خطة علاج شاملة للمريض
   */
  static async createTreatmentPlan(planData: Omit<TreatmentPlan, 'id' | 'created_at' | 'updated_at'>): Promise<TreatmentPlan | null> {
    try {
      const plan = await window.electronAPI?.treatmentPlans?.create?.(planData)
      
      if (plan) {
        // إنشاء حدث في الجدول الزمني
        await PatientIntegrationService.createTimelineEvent({
          patient_id: plan.patient_id,
          timeline_type: 'note',
          title: `تم إنشاء خطة علاج: ${plan.plan_name}`,
          description: plan.description,
          event_date: new Date().toISOString(),
          status: 'active',
          priority: 1
        })
      }
      
      return plan || null
    } catch (error) {
      console.error('خطأ في إنشاء خطة العلاج:', error)
      return null
    }
  }

  /**
   * إضافة عنصر لخطة العلاج
   */
  static async addTreatmentPlanItem(itemData: Omit<TreatmentPlanItem, 'id' | 'created_at' | 'updated_at'>): Promise<TreatmentPlanItem | null> {
    try {
      return await window.electronAPI?.treatmentPlanItems?.create?.(itemData) || null
    } catch (error) {
      console.error('خطأ في إضافة عنصر خطة العلاج:', error)
      return null
    }
  }

  /**
   * بدء تنفيذ خطة العلاج
   */
  static async startTreatmentPlan(planId: string): Promise<boolean> {
    try {
      const result = await window.electronAPI?.treatmentPlans?.update?.(planId, {
        status: 'active',
        start_date: new Date().toISOString().split('T')[0]
      })

      if (result) {
        // إنشاء حدث في الجدول الزمني
        await PatientIntegrationService.createTimelineEvent({
          patient_id: result.patient_id,
          timeline_type: 'note',
          title: 'بدء تنفيذ خطة العلاج',
          description: `تم بدء تنفيذ خطة العلاج: ${result.plan_name}`,
          event_date: new Date().toISOString(),
          status: 'active',
          priority: 1
        })
      }

      return !!result
    } catch (error) {
      console.error('خطأ في بدء خطة العلاج:', error)
      return false
    }
  }

  /**
   * إنشاء موعد مرتبط بعلاج سن
   */
  static async createTreatmentAppointment(appointmentData: any, toothTreatmentId?: string): Promise<Appointment | null> {
    try {
      const appointment = await window.electronAPI?.appointments?.create?.(appointmentData)
      
      if (appointment && toothTreatmentId) {
        // ربط الموعد بعلاج السن
        await window.electronAPI?.toothTreatments?.update?.(toothTreatmentId, {
          appointment_id: appointment.id,
          treatment_status: 'in_progress'
        })

        // إنشاء حدث في الجدول الزمني
        await PatientIntegrationService.createTimelineEvent({
          patient_id: appointment.patient_id,
          appointment_id: appointment.id,
          tooth_treatment_id: toothTreatmentId,
          timeline_type: 'appointment',
          title: `موعد علاج: ${appointment.title}`,
          description: appointment.description,
          event_date: appointment.start_time,
          status: 'active',
          priority: 1
        })
      }
      
      return appointment || null
    } catch (error) {
      console.error('خطأ في إنشاء موعد العلاج:', error)
      return null
    }
  }

  /**
   * إكمال علاج سن
   */
  static async completeTreatment(toothTreatmentId: string, completionNotes?: string): Promise<boolean> {
    try {
      const treatment = await window.electronAPI?.toothTreatments?.update?.(toothTreatmentId, {
        treatment_status: 'completed',
        completion_date: new Date().toISOString().split('T')[0],
        notes: completionNotes
      })

      if (treatment) {
        // إنشاء حدث في الجدول الزمني
        await PatientIntegrationService.createTimelineEvent({
          patient_id: treatment.patient_id,
          tooth_treatment_id: toothTreatmentId,
          timeline_type: 'treatment',
          title: `تم إكمال العلاج: ${treatment.treatment_type}`,
          description: `تم إكمال علاج السن رقم ${treatment.tooth_number} - ${treatment.tooth_name}`,
          event_date: new Date().toISOString(),
          status: 'completed',
          priority: 1
        })

        // التحقق من إكمال خطة العلاج
        await this.checkTreatmentPlanCompletion(treatment.patient_id)
      }

      return !!treatment
    } catch (error) {
      console.error('خطأ في إكمال العلاج:', error)
      return false
    }
  }

  /**
   * إنشاء وصفة طبية مرتبطة بعلاج
   */
  static async createTreatmentPrescription(
    prescriptionData: any, 
    toothTreatmentId?: string,
    appointmentId?: string
  ): Promise<Prescription | null> {
    try {
      const prescriptionWithLinks = {
        ...prescriptionData,
        tooth_treatment_id: toothTreatmentId,
        appointment_id: appointmentId
      }

      const prescription = await window.electronAPI?.prescriptions?.create?.(prescriptionWithLinks)
      
      if (prescription) {
        // إنشاء حدث في الجدول الزمني
        await PatientIntegrationService.createTimelineEvent({
          patient_id: prescription.patient_id,
          appointment_id: appointmentId,
          tooth_treatment_id: toothTreatmentId,
          prescription_id: prescription.id,
          timeline_type: 'prescription',
          title: 'وصفة طبية جديدة',
          description: prescription.notes || 'تم إنشاء وصفة طبية',
          event_date: prescription.prescription_date,
          status: 'active',
          priority: 2
        })
      }
      
      return prescription || null
    } catch (error) {
      console.error('خطأ في إنشاء الوصفة الطبية:', error)
      return null
    }
  }

  /**
   * إنشاء طلب مختبر مرتبط بعلاج
   */
  static async createTreatmentLabOrder(
    labOrderData: any, 
    toothTreatmentId?: string,
    appointmentId?: string
  ): Promise<LabOrder | null> {
    try {
      const labOrderWithLinks = {
        ...labOrderData,
        tooth_treatment_id: toothTreatmentId,
        appointment_id: appointmentId
      }

      const labOrder = await window.electronAPI?.labOrders?.create?.(labOrderWithLinks)
      
      if (labOrder) {
        // إنشاء حدث في الجدول الزمني
        await PatientIntegrationService.createTimelineEvent({
          patient_id: labOrder.patient_id!,
          appointment_id: appointmentId,
          tooth_treatment_id: toothTreatmentId,
          lab_order_id: labOrder.id,
          timeline_type: 'lab_order',
          title: `طلب مختبر: ${labOrder.service_name}`,
          description: labOrder.notes || 'تم إنشاء طلب مختبر',
          event_date: labOrder.order_date,
          status: 'active',
          priority: 2
        })
      }
      
      return labOrder || null
    } catch (error) {
      console.error('خطأ في إنشاء طلب المختبر:', error)
      return null
    }
  }

  /**
   * التحقق من إكمال خطة العلاج
   */
  private static async checkTreatmentPlanCompletion(patientId: string): Promise<void> {
    try {
      const treatmentPlans = await window.electronAPI?.treatmentPlans?.getByPatient?.(patientId) || []
      
      for (const plan of treatmentPlans) {
        if (plan.status === 'active') {
          const planItems = await window.electronAPI?.treatmentPlanItems?.getByPlan?.(plan.id) || []
          const completedItems = planItems.filter(item => item.status === 'completed')
          
          if (planItems.length > 0 && completedItems.length === planItems.length) {
            // إكمال خطة العلاج
            await window.electronAPI?.treatmentPlans?.update?.(plan.id, {
              status: 'completed',
              actual_completion_date: new Date().toISOString().split('T')[0]
            })

            // إنشاء حدث في الجدول الزمني
            await PatientIntegrationService.createTimelineEvent({
              patient_id: patientId,
              timeline_type: 'note',
              title: 'تم إكمال خطة العلاج',
              description: `تم إكمال خطة العلاج: ${plan.plan_name}`,
              event_date: new Date().toISOString(),
              status: 'completed',
              priority: 1
            })
          }
        }
      }
    } catch (error) {
      console.error('خطأ في التحقق من إكمال خطة العلاج:', error)
    }
  }

  /**
   * الحصول على حالة تقدم العلاج للمريض
   */
  static async getTreatmentProgress(patientId: string): Promise<any> {
    try {
      const integratedData = await PatientIntegrationService.getPatientIntegratedData(patientId)
      if (!integratedData) {
        return null
      }

      const { treatments, treatmentPlans, appointments, prescriptions, labOrders } = integratedData

      // حساب تقدم العلاجات
      const totalTreatments = treatments.length
      const completedTreatments = treatments.filter(t => t.treatment_status === 'completed').length
      const inProgressTreatments = treatments.filter(t => t.treatment_status === 'in_progress').length
      const plannedTreatments = treatments.filter(t => t.treatment_status === 'planned').length

      // حساب تقدم خطط العلاج
      const activePlans = treatmentPlans.filter(p => p.status === 'active')
      const completedPlans = treatmentPlans.filter(p => p.status === 'completed')

      return {
        treatments: {
          total: totalTreatments,
          completed: completedTreatments,
          inProgress: inProgressTreatments,
          planned: plannedTreatments,
          completionPercentage: totalTreatments > 0 ? (completedTreatments / totalTreatments) * 100 : 0
        },
        treatmentPlans: {
          total: treatmentPlans.length,
          active: activePlans.length,
          completed: completedPlans.length
        },
        upcomingAppointments: appointments.filter(apt => 
          apt.status === 'scheduled' && new Date(apt.start_time) > new Date()
        ).length,
        activePrescriptions: prescriptions.filter(p => 
          new Date(p.prescription_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // آخر 30 يوم
        ).length,
        pendingLabOrders: labOrders.filter(lo => lo.status === 'آجل').length
      }
    } catch (error) {
      console.error('خطأ في حساب تقدم العلاج:', error)
      return null
    }
  }
}
