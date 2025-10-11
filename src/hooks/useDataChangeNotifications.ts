import { useEffect, useCallback } from 'react'
import {
  DataChangeNotifier,
  DataChangeEvent,
  DataChangePayload
} from '@/utils/dataChangeNotifier'

/**
 * Hook لاستخدام إشعارات تغيير البيانات
 */
export function useDataChangeNotifications() {

  /**
   * إرسال إشعار تغيير البيانات
   */
  const notifyDataChange = useCallback((event: DataChangeEvent, payload: DataChangePayload) => {
    DataChangeNotifier.emit(event, payload)
  }, [])

  /**
   * الاستماع لحدث تغيير البيانات
   */
  const addEventListener = useCallback((event: DataChangeEvent, callback: Function) => {
    DataChangeNotifier.addEventListener(event, callback)

    return () => {
      DataChangeNotifier.removeEventListener(event, callback)
    }
  }, [])

  return {
    notifyDataChange,
    addEventListener
  }
}

/**
 * Hook للاستماع لأحداث تغيير البيانات المحددة
 */
export function useDataChangeListener(
  events: DataChangeEvent | DataChangeEvent[],
  callback: (event: DataChangeEvent, payload: DataChangePayload) => void,
  deps: any[] = []
) {
  const eventsArray = Array.isArray(events) ? events : [events]

  useEffect(() => {
    const cleanupFunctions: (() => void)[] = []

    eventsArray.forEach(event => {
      const handler = (payload: DataChangePayload) => {
        callback(event, payload)
      }

      DataChangeNotifier.addEventListener(event, handler)

      cleanupFunctions.push(() => {
        DataChangeNotifier.removeEventListener(event, handler)
      })
    })

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [eventsArray, callback, ...deps])
}

/**
 * Hook للاستماع لجميع أحداث تغيير البيانات
 */
export function useAllDataChangeListener(
  callback: (event: DataChangeEvent, payload: DataChangePayload) => void,
  deps: any[] = []
) {
  const allEvents: DataChangeEvent[] = [
    'patient:created', 'patient:updated', 'patient:deleted',
    'appointment:created', 'appointment:updated', 'appointment:deleted',
    'payment:created', 'payment:updated', 'payment:deleted',
    'treatment:created', 'treatment:updated', 'treatment:deleted',
    'prescription:created', 'prescription:updated', 'prescription:deleted',
    'inventory:created', 'inventory:updated', 'inventory:deleted',
    'need:created', 'need:updated', 'need:deleted'
  ]

  useDataChangeListener(allEvents, callback, deps)
}

/**
 * Hook للاستماع لأحداث تغيير بيانات المرضى
 */
export function usePatientChangeListener(
  callback: (event: DataChangeEvent, payload: DataChangePayload) => void,
  deps: any[] = []
) {
  const patientEvents: DataChangeEvent[] = [
    'patient:created', 'patient:updated', 'patient:deleted'
  ]

  useDataChangeListener(patientEvents, callback, deps)
}

/**
 * Hook للاستماع لأحداث تغيير بيانات المواعيد
 */
export function useAppointmentChangeListener(
  callback: (event: DataChangeEvent, payload: DataChangePayload) => void,
  deps: any[] = []
) {
  const appointmentEvents: DataChangeEvent[] = [
    'appointment:created', 'appointment:updated', 'appointment:deleted'
  ]

  useDataChangeListener(appointmentEvents, callback, deps)
}

/**
 * Hook للاستماع لأحداث تغيير بيانات الدفعات
 */
export function usePaymentChangeListener(
  callback: (event: DataChangeEvent, payload: DataChangePayload) => void,
  deps: any[] = []
) {
  const paymentEvents: DataChangeEvent[] = [
    'payment:created', 'payment:updated', 'payment:deleted'
  ]

  useDataChangeListener(paymentEvents, callback, deps)
}

/**
 * Hook للاستماع لأحداث تغيير بيانات العلاجات
 */
export function useTreatmentChangeListener(
  callback: (event: DataChangeEvent, payload: DataChangePayload) => void,
  deps: any[] = []
) {
  const treatmentEvents: DataChangeEvent[] = [
    'treatment:created', 'treatment:updated', 'treatment:deleted'
  ]

  useDataChangeListener(treatmentEvents, callback, deps)
}

/**
 * Hook للاستماع لأحداث تغيير بيانات الوصفات
 */
export function usePrescriptionChangeListener(
  callback: (event: DataChangeEvent, payload: DataChangePayload) => void,
  deps: any[] = []
) {
  const prescriptionEvents: DataChangeEvent[] = [
    'prescription:created', 'prescription:updated', 'prescription:deleted'
  ]

  useDataChangeListener(prescriptionEvents, callback, deps)
}

/**
 * Hook للاستماع لأحداث تغيير بيانات المخزون
 */
export function useInventoryChangeListener(
  callback: (event: DataChangeEvent, payload: DataChangePayload) => void,
  deps: any[] = []
) {
  const inventoryEvents: DataChangeEvent[] = [
    'inventory:created', 'inventory:updated', 'inventory:deleted'
  ]

  useDataChangeListener(inventoryEvents, callback, deps)
}

/**
 * Hook للاستماع لأحداث تغيير بيانات الاحتياجات
 */
export function useNeedChangeListener(
  callback: (event: DataChangeEvent, payload: DataChangePayload) => void,
  deps: any[] = []
) {
  const needEvents: DataChangeEvent[] = [
    'need:created', 'need:updated', 'need:deleted'
  ]

  useDataChangeListener(needEvents, callback, deps)
}

/**
 * Hook مبسط لإرسال إشعارات تغيير البيانات
 */
export function useDataNotifier() {
  return {
    // المرضى
    notifyPatientCreated: (id: string, data?: any) => {
      DataChangeNotifier.emit('patient:created', {
        id, type: 'patient', data, timestamp: new Date().toISOString()
      })
    },
    notifyPatientUpdated: (id: string, data?: any) => {
      DataChangeNotifier.emit('patient:updated', {
        id, type: 'patient', data, timestamp: new Date().toISOString()
      })
    },
    notifyPatientDeleted: (id: string) => {
      DataChangeNotifier.emit('patient:deleted', {
        id, type: 'patient', timestamp: new Date().toISOString()
      })
    },

    // المواعيد
    notifyAppointmentCreated: (id: string, data?: any) => {
      DataChangeNotifier.emit('appointment:created', {
        id, type: 'appointment', data, timestamp: new Date().toISOString()
      })
    },
    notifyAppointmentUpdated: (id: string, data?: any) => {
      DataChangeNotifier.emit('appointment:updated', {
        id, type: 'appointment', data, timestamp: new Date().toISOString()
      })
    },
    notifyAppointmentDeleted: (id: string) => {
      DataChangeNotifier.emit('appointment:deleted', {
        id, type: 'appointment', timestamp: new Date().toISOString()
      })
    },

    // الدفعات
    notifyPaymentCreated: (id: string, data?: any) => {
      DataChangeNotifier.emit('payment:created', {
        id, type: 'payment', data, timestamp: new Date().toISOString()
      })
    },
    notifyPaymentUpdated: (id: string, data?: any) => {
      DataChangeNotifier.emit('payment:updated', {
        id, type: 'payment', data, timestamp: new Date().toISOString()
      })
    },
    notifyPaymentDeleted: (id: string) => {
      DataChangeNotifier.emit('payment:deleted', {
        id, type: 'payment', timestamp: new Date().toISOString()
      })
    },

    // العلاجات
    notifyTreatmentCreated: (id: string, data?: any) => {
      DataChangeNotifier.emit('treatment:created', {
        id, type: 'treatment', data, timestamp: new Date().toISOString()
      })
    },
    notifyTreatmentUpdated: (id: string, data?: any) => {
      DataChangeNotifier.emit('treatment:updated', {
        id, type: 'treatment', data, timestamp: new Date().toISOString()
      })
    },
    notifyTreatmentDeleted: (id: string) => {
      DataChangeNotifier.emit('treatment:deleted', {
        id, type: 'treatment', timestamp: new Date().toISOString()
      })
    },

    // الوصفات
    notifyPrescriptionCreated: (id: string, data?: any) => {
      DataChangeNotifier.emit('prescription:created', {
        id, type: 'prescription', data, timestamp: new Date().toISOString()
      })
    },
    notifyPrescriptionUpdated: (id: string, data?: any) => {
      DataChangeNotifier.emit('prescription:updated', {
        id, type: 'prescription', data, timestamp: new Date().toISOString()
      })
    },
    notifyPrescriptionDeleted: (id: string) => {
      DataChangeNotifier.emit('prescription:deleted', {
        id, type: 'prescription', timestamp: new Date().toISOString()
      })
    },

    // المخزون
    notifyInventoryCreated: (id: string, data?: any) => {
      DataChangeNotifier.emit('inventory:created', {
        id, type: 'inventory', data, timestamp: new Date().toISOString()
      })
    },
    notifyInventoryUpdated: (id: string, data?: any) => {
      DataChangeNotifier.emit('inventory:updated', {
        id, type: 'inventory', data, timestamp: new Date().toISOString()
      })
    },
    notifyInventoryDeleted: (id: string) => {
      DataChangeNotifier.emit('inventory:deleted', {
        id, type: 'inventory', timestamp: new Date().toISOString()
      })
    },

    // الاحتياجات
    notifyNeedCreated: (id: string, data?: any) => {
      DataChangeNotifier.emit('need:created', {
        id, type: 'need', data, timestamp: new Date().toISOString()
      })
    },
    notifyNeedUpdated: (id: string, data?: any) => {
      DataChangeNotifier.emit('need:updated', {
        id, type: 'need', data, timestamp: new Date().toISOString()
      })
    },
    notifyNeedDeleted: (id: string) => {
      DataChangeNotifier.emit('need:deleted', {
        id, type: 'need', timestamp: new Date().toISOString()
      })
    },

    // طلبات المختبرات
    notifyLabOrderCreated: (id: string, data?: any) => {
      DataChangeNotifier.emit('lab_order:created', {
        id, type: 'lab_order', data, timestamp: new Date().toISOString()
      })
    },
    notifyLabOrderUpdated: (id: string, data?: any) => {
      DataChangeNotifier.emit('lab_order:updated', {
        id, type: 'lab_order', data, timestamp: new Date().toISOString()
      })
    },
    notifyLabOrderDeleted: (id: string) => {
      DataChangeNotifier.emit('lab_order:deleted', {
        id, type: 'lab_order', timestamp: new Date().toISOString()
      })
    },

    // احتياجات العيادة
    notifyClinicNeedCreated: (id: string, data?: any) => {
      DataChangeNotifier.emit('clinic_need:created', {
        id, type: 'clinic_need', data, timestamp: new Date().toISOString()
      })
    },
    notifyClinicNeedUpdated: (id: string, data?: any) => {
      DataChangeNotifier.emit('clinic_need:updated', {
        id, type: 'clinic_need', data, timestamp: new Date().toISOString()
      })
    },
    notifyClinicNeedDeleted: (id: string) => {
      DataChangeNotifier.emit('clinic_need:deleted', {
        id, type: 'clinic_need', timestamp: new Date().toISOString()
      })
    },

    // الأدوية
    notifyMedicationCreated: (id: string, data?: any) => {
      DataChangeNotifier.emit('medication:created', {
        id, type: 'medication', data, timestamp: new Date().toISOString()
      })
    },
    notifyMedicationUpdated: (id: string, data?: any) => {
      DataChangeNotifier.emit('medication:updated', {
        id, type: 'medication', data, timestamp: new Date().toISOString()
      })
    },
    notifyMedicationDeleted: (id: string) => {
      DataChangeNotifier.emit('medication:deleted', {
        id, type: 'medication', timestamp: new Date().toISOString()
      })
    },

    // المختبرات
    notifyLabCreated: (id: string, data?: any) => {
      DataChangeNotifier.emit('lab:created', {
        id, type: 'lab', data, timestamp: new Date().toISOString()
      })
    },
    notifyLabUpdated: (id: string, data?: any) => {
      DataChangeNotifier.emit('lab:updated', {
        id, type: 'lab', data, timestamp: new Date().toISOString()
      })
    },
    notifyLabDeleted: (id: string) => {
      DataChangeNotifier.emit('lab:deleted', {
        id, type: 'lab', timestamp: new Date().toISOString()
      })
    }
  }
}
