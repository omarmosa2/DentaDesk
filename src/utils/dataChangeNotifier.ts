/**
 * نظام إشعارات تغيير البيانات
 * يرسل أحداث عند تغيير أي بيانات في النظام لضمان التحديث في الوقت الفعلي
 */

export type DataChangeEvent =
  | 'patient:created' | 'patient:updated' | 'patient:deleted'
  | 'appointment:created' | 'appointment:updated' | 'appointment:deleted'
  | 'payment:created' | 'payment:updated' | 'payment:deleted'
  | 'treatment:created' | 'treatment:updated' | 'treatment:deleted'
  | 'prescription:created' | 'prescription:updated' | 'prescription:deleted'
  | 'inventory:created' | 'inventory:updated' | 'inventory:deleted'
  | 'need:created' | 'need:updated' | 'need:deleted'
  | 'lab_order:created' | 'lab_order:updated' | 'lab_order:deleted'
  | 'clinic_need:created' | 'clinic_need:updated' | 'clinic_need:deleted'
  | 'medication:created' | 'medication:updated' | 'medication:deleted'
  | 'lab:created' | 'lab:updated' | 'lab:deleted'

export interface DataChangePayload {
  id: string
  type: string
  data?: any
  timestamp: string
}

/**
 * كلاس لإدارة إشعارات تغيير البيانات
 */
export class DataChangeNotifier {
  private static listeners: Map<DataChangeEvent, Set<Function>> = new Map()

  /**
   * إضافة مستمع لحدث معين
   */
  static addEventListener(event: DataChangeEvent, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  /**
   * إزالة مستمع لحدث معين
   */
  static removeEventListener(event: DataChangeEvent, callback: Function) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback)
    }
  }

  /**
   * إرسال حدث تغيير البيانات
   */
  static emit(event: DataChangeEvent, payload: DataChangePayload) {
    console.log(`📡 Data change event: ${event}`, payload)

    // إرسال للمستمعين المباشرين
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(payload)
        } catch (error) {
          console.error(`Error in data change listener for ${event}:`, error)
        }
      })
    }

    // إرسال عبر window events للمكونات الأخرى
    window.dispatchEvent(new CustomEvent(event, { detail: payload }))

    // إرسال أحداث عامة للتوافق مع النظام الحالي
    const legacyEvents = this.getLegacyEventNames(event)
    legacyEvents.forEach(legacyEvent => {
      window.dispatchEvent(new CustomEvent(legacyEvent, { detail: payload }))
    })

    // إشعار نظام التنبيهات بالتغيير
    this.notifyAlertsSystem(event, payload)
  }

  /**
   * الحصول على أسماء الأحداث القديمة للتوافق
   */
  private static getLegacyEventNames(event: DataChangeEvent): string[] {
    const [entity, action] = event.split(':')
    return [
      `${entity}-${action}`,
      `${entity}-changed`,
      `data-changed`
    ]
  }

  /**
   * إشعار نظام التنبيهات بالتغيير
   */
  private static notifyAlertsSystem(event: DataChangeEvent, payload: DataChangePayload) {
    // إرسال حدث عام لتحديث التنبيهات
    window.dispatchEvent(new CustomEvent('alerts:data-changed', {
      detail: { event, payload }
    }))

    // إرسال حدث مباشر لنظام التنبيهات
    try {
      const { SmartAlertsService } = require('@/services/smartAlertsService')
      SmartAlertsService.emitEvent('data:changed', { event, payload })
    } catch (error) {
      console.warn('Could not notify alerts system:', error)
    }
  }

  /**
   * تنظيف جميع المستمعين
   */
  static clearAllListeners() {
    this.listeners.clear()
  }

  /**
   * الحصول على عدد المستمعين لحدث معين
   */
  static getListenerCount(event: DataChangeEvent): number {
    return this.listeners.get(event)?.size || 0
  }

  /**
   * الحصول على جميع الأحداث المسجلة
   */
  static getRegisteredEvents(): DataChangeEvent[] {
    return Array.from(this.listeners.keys())
  }
}

/**
 * دوال مساعدة لإرسال أحداث تغيير البيانات
 */

// أحداث المرضى
export const notifyPatientCreated = (id: string, data?: any) => {
  DataChangeNotifier.emit('patient:created', {
    id,
    type: 'patient',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyPatientUpdated = (id: string, data?: any) => {
  DataChangeNotifier.emit('patient:updated', {
    id,
    type: 'patient',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyPatientDeleted = (id: string) => {
  DataChangeNotifier.emit('patient:deleted', {
    id,
    type: 'patient',
    timestamp: new Date().toISOString()
  })
}

// أحداث المواعيد
export const notifyAppointmentCreated = (id: string, data?: any) => {
  DataChangeNotifier.emit('appointment:created', {
    id,
    type: 'appointment',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyAppointmentUpdated = (id: string, data?: any) => {
  DataChangeNotifier.emit('appointment:updated', {
    id,
    type: 'appointment',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyAppointmentDeleted = (id: string) => {
  DataChangeNotifier.emit('appointment:deleted', {
    id,
    type: 'appointment',
    timestamp: new Date().toISOString()
  })
}

// أحداث الدفعات
export const notifyPaymentCreated = (id: string, data?: any) => {
  DataChangeNotifier.emit('payment:created', {
    id,
    type: 'payment',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyPaymentUpdated = (id: string, data?: any) => {
  DataChangeNotifier.emit('payment:updated', {
    id,
    type: 'payment',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyPaymentDeleted = (id: string) => {
  DataChangeNotifier.emit('payment:deleted', {
    id,
    type: 'payment',
    timestamp: new Date().toISOString()
  })
}

// أحداث العلاجات
export const notifyTreatmentCreated = (id: string, data?: any) => {
  DataChangeNotifier.emit('treatment:created', {
    id,
    type: 'treatment',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyTreatmentUpdated = (id: string, data?: any) => {
  DataChangeNotifier.emit('treatment:updated', {
    id,
    type: 'treatment',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyTreatmentDeleted = (id: string) => {
  DataChangeNotifier.emit('treatment:deleted', {
    id,
    type: 'treatment',
    timestamp: new Date().toISOString()
  })
}

// أحداث الوصفات
export const notifyPrescriptionCreated = (id: string, data?: any) => {
  DataChangeNotifier.emit('prescription:created', {
    id,
    type: 'prescription',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyPrescriptionUpdated = (id: string, data?: any) => {
  DataChangeNotifier.emit('prescription:updated', {
    id,
    type: 'prescription',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyPrescriptionDeleted = (id: string) => {
  DataChangeNotifier.emit('prescription:deleted', {
    id,
    type: 'prescription',
    timestamp: new Date().toISOString()
  })
}

// أحداث المخزون
export const notifyInventoryCreated = (id: string, data?: any) => {
  DataChangeNotifier.emit('inventory:created', {
    id,
    type: 'inventory',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyInventoryUpdated = (id: string, data?: any) => {
  DataChangeNotifier.emit('inventory:updated', {
    id,
    type: 'inventory',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyInventoryDeleted = (id: string) => {
  DataChangeNotifier.emit('inventory:deleted', {
    id,
    type: 'inventory',
    timestamp: new Date().toISOString()
  })
}

// أحداث الاحتياجات
export const notifyNeedCreated = (id: string, data?: any) => {
  DataChangeNotifier.emit('need:created', {
    id,
    type: 'need',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyNeedUpdated = (id: string, data?: any) => {
  DataChangeNotifier.emit('need:updated', {
    id,
    type: 'need',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyNeedDeleted = (id: string) => {
  DataChangeNotifier.emit('need:deleted', {
    id,
    type: 'need',
    timestamp: new Date().toISOString()
  })
}

// أحداث طلبات المختبرات
export const notifyLabOrderCreated = (id: string, data?: any) => {
  DataChangeNotifier.emit('lab_order:created', {
    id,
    type: 'lab_order',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyLabOrderUpdated = (id: string, data?: any) => {
  DataChangeNotifier.emit('lab_order:updated', {
    id,
    type: 'lab_order',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyLabOrderDeleted = (id: string) => {
  DataChangeNotifier.emit('lab_order:deleted', {
    id,
    type: 'lab_order',
    timestamp: new Date().toISOString()
  })
}

// أحداث احتياجات العيادة
export const notifyClinicNeedCreated = (id: string, data?: any) => {
  DataChangeNotifier.emit('clinic_need:created', {
    id,
    type: 'clinic_need',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyClinicNeedUpdated = (id: string, data?: any) => {
  DataChangeNotifier.emit('clinic_need:updated', {
    id,
    type: 'clinic_need',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyClinicNeedDeleted = (id: string) => {
  DataChangeNotifier.emit('clinic_need:deleted', {
    id,
    type: 'clinic_need',
    timestamp: new Date().toISOString()
  })
}

// أحداث الأدوية
export const notifyMedicationCreated = (id: string, data?: any) => {
  DataChangeNotifier.emit('medication:created', {
    id,
    type: 'medication',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyMedicationUpdated = (id: string, data?: any) => {
  DataChangeNotifier.emit('medication:updated', {
    id,
    type: 'medication',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyMedicationDeleted = (id: string) => {
  DataChangeNotifier.emit('medication:deleted', {
    id,
    type: 'medication',
    timestamp: new Date().toISOString()
  })
}

// أحداث المختبرات
export const notifyLabCreated = (id: string, data?: any) => {
  DataChangeNotifier.emit('lab:created', {
    id,
    type: 'lab',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyLabUpdated = (id: string, data?: any) => {
  DataChangeNotifier.emit('lab:updated', {
    id,
    type: 'lab',
    data,
    timestamp: new Date().toISOString()
  })
}

export const notifyLabDeleted = (id: string) => {
  DataChangeNotifier.emit('lab:deleted', {
    id,
    type: 'lab',
    timestamp: new Date().toISOString()
  })
}
