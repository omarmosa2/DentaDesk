import { useEffect, useCallback, useRef } from 'react'
import { useAppointmentStore } from '@/store/appointmentStore'
import { usePaymentStore } from '@/store/paymentStore'
import { usePatientStore } from '@/store/patientStore'
import { usePrescriptionStore } from '@/store/prescriptionStore'
import { useInventoryStore } from '@/store/inventoryStore'

/**
 * Hook لضمان تحديث الجداول في الوقت الفعلي عند تغيير البيانات
 * يحل مشكلة عدم تحديث الجداول عند تعديل البيانات
 */
export function useRealTimeTableSync() {
  const { loadAppointments } = useAppointmentStore()
  const { loadPayments } = usePaymentStore()
  const { loadPatients } = usePatientStore()
  const { loadPrescriptions } = usePrescriptionStore()
  const { loadItems: loadInventoryItems } = useInventoryStore()

  const pendingUpdatesRef = useRef<Set<string>>(new Set())
  const rafIdRef = useRef<number | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // دالة لإعادة تحميل جميع البيانات
  const refreshAllTables = useCallback(async () => {
    console.log('🔄 Refreshing all tables...')
    try {
      await Promise.all([
        loadAppointments(),
        loadPayments(),
        loadPatients(),
        loadPrescriptions(),
        loadInventoryItems()
      ])
      console.log('✅ All tables refreshed successfully')
    } catch (error) {
      console.error('❌ Error refreshing tables:', error)
    }
  }, [loadAppointments, loadPayments, loadPatients, loadPrescriptions, loadInventoryItems])

  // دالة لإعادة تحميل جدول محدد مع تجميع
  const refreshTable = useCallback(async (tableType: string) => {
    console.log(`🔄 Refreshing ${tableType} table...`)
    try {
      switch (tableType) {
        case 'appointments':
          await loadAppointments()
          break
        case 'payments':
          await loadPayments()
          break
        case 'patients':
          await loadPatients()
          break
        case 'prescriptions':
          await loadPrescriptions()
          break
        case 'inventory':
          await loadInventoryItems()
          break
        default:
          console.warn('Unknown table type:', tableType)
      }
      console.log(`✅ ${tableType} table refreshed successfully`)
    } catch (error) {
      console.error(`❌ Error refreshing ${tableType} table:`, error)
    }
  }, [loadAppointments, loadPayments, loadPatients, loadPrescriptions, loadInventoryItems])

  // دالة معالجة الأحداث المجمعة
  const batchRefresh = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const tablesToRefresh = Array.from(pendingUpdatesRef.current)
      pendingUpdatesRef.current.clear()

      tablesToRefresh.forEach(table => {
        refreshTable(table)
      })

      debounceTimeoutRef.current = null
    }, 100) // Increased from 50ms to 100ms
  }, [refreshTable])

  useEffect(() => {
    console.log('🔔 Setting up real-time table sync listeners...')

    // خريطة لربط الأحداث بالجداول
    const eventToTableMap: Record<string, string[]> = {
      'appointment-added': ['appointments'],
      'appointment-updated': ['appointments'],
      'appointment-deleted': ['appointments'],
      'appointment-changed': ['appointments'],
      'payment-added': ['payments'],
      'payment-updated': ['payments'],
      'payment-deleted': ['payments'],
      'payment-changed': ['payments'],
      'patient-added': ['patients', 'appointments', 'payments'], // تحديث الجداول المرتبطة
      'patient-updated': ['patients', 'appointments', 'payments'],
      'patient-deleted': ['patients', 'appointments', 'payments'],
      'patient-changed': ['patients', 'appointments', 'payments'],
      'prescription-added': ['prescriptions'],
      'prescription-updated': ['prescriptions'],
      'prescription-deleted': ['prescriptions'],
      'prescription-changed': ['prescriptions'],
      'inventory-added': ['inventory'],
      'inventory-updated': ['inventory'],
      'inventory-deleted': ['inventory'],
      'inventory-changed': ['inventory']
    }

    // معالج واحد لجميع الأحداث
    const handleDataChange = (event: Event) => {
      const eventName = event.type
      const tables = eventToTableMap[eventName]

      if (tables) {
        console.log(`📡 ${eventName} detected, queuing tables for update:`, tables)
        tables.forEach(table => pendingUpdatesRef.current.add(table))

        // استخدام requestAnimationFrame لتجميع الأحداث السريعة
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(() => {
            batchRefresh()
            rafIdRef.current = null
          })
        }
      }
    }

    // جميع الأحداث المطلوب مراقبتها
    const allEvents = Object.keys(eventToTableMap)

    // تسجيل معالج واحد لجميع الأحداث
    allEvents.forEach(eventName => {
      window.addEventListener(eventName, handleDataChange)
    })

    // دالة التنظيف المحسنة
    return () => {
      console.log('🔔 Cleaning up real-time table sync listeners...')

      // إلغاء أي تحديث مؤجل
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
        debounceTimeoutRef.current = null
      }

      // إزالة جميع المستمعين
      allEvents.forEach(eventName => {
        window.removeEventListener(eventName, handleDataChange)
      })

      // تنظيف المجموعات
      pendingUpdatesRef.current.clear()
    }
  }, [batchRefresh, refreshTable])

  return {
    refreshAllTables,
    refreshTable
  }
}

/**
 * Hook مبسط لتحديث جدول محدد
 */
export function useTableRefresh(tableType: string) {
  const { refreshTable } = useRealTimeTableSync()

  const refresh = useCallback(() => {
    refreshTable(tableType)
  }, [refreshTable, tableType])

  return { refresh }
}

/**
 * Hook لتحديث جداول متعددة
 */
export function useMultiTableRefresh(tableTypes: string[]) {
  const { refreshTable } = useRealTimeTableSync()

  const refresh = useCallback(() => {
    tableTypes.forEach(tableType => {
      refreshTable(tableType)
    })
  }, [refreshTable, tableTypes])

  return { refresh }
}
