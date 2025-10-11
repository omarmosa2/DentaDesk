import { useEffect, useCallback, useRef } from 'react'
import { SmartAlertsService } from '@/services/smartAlertsService'
import { useGlobalStore } from '@/store/globalStore'

/**
 * Hook لإدارة التحديثات في الوقت الفعلي للتنبيهات
 * يضمن أن أي تعديل على التنبيهات يتم تحديثه فوراً في جميع أنحاء التطبيق
 */
export function useRealTimeAlerts() {
  const { loadAlerts } = useGlobalStore()
  const listenersRef = useRef<Map<string, Function>>(new Map())
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const pendingRefreshRef = useRef<boolean>(false)

  // دالة لإعادة تحميل التنبيهات مع تجميع الطلبات واستخدام requestAnimationFrame
  const refreshAlerts = useCallback(() => {
    console.log('🔄 useRealTimeAlerts: refreshAlerts triggered')

    // إلغاء أي تحديث مؤجل سابق
    if (refreshTimeoutRef.current) {
      console.log('🔄 useRealTimeAlerts: Clearing previous timeout')
      clearTimeout(refreshTimeoutRef.current)
    }

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
    }

    // تحديد أن هناك تحديث آجل
    pendingRefreshRef.current = true

    // استخدام requestAnimationFrame لتجميع الأحداث السريعة
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null

      // تأجيل التحديث لتجميع الطلبات المتعددة
      refreshTimeoutRef.current = setTimeout(() => {
        if (pendingRefreshRef.current) {
          console.log('🔄 useRealTimeAlerts: Executing loadAlerts...')
          loadAlerts()
          pendingRefreshRef.current = false
        }
        refreshTimeoutRef.current = null
      }, 300)
    })
  }, [loadAlerts])

  useEffect(() => {
    console.log('🔔 Setting up real-time alerts listeners...')

    // معالج واحد لجميع أحداث تغيير البيانات
    const handleDataChanged = (event?: any) => {
      const eventType = event?.type || event?.detail?.event || 'unknown'
      console.log('📡 Data changed, refreshing alerts...', eventType)
      refreshAlerts()
    }

    // حفظ المراجع للمستمعين
    listenersRef.current.set('handleDataChanged', handleDataChanged)

    // أحداث تغيير البيانات المجمعة
    const dataChangeEvents = [
      'patient-added', 'patient-updated', 'patient-deleted', 'patient-changed',
      'appointment-added', 'appointment-updated', 'appointment-deleted', 'appointment-changed',
      'payment-added', 'payment-updated', 'payment-deleted', 'payment-changed',
      'treatment-added', 'treatment-updated', 'treatment-deleted', 'treatment-changed',
      'prescription-added', 'prescription-updated', 'prescription-deleted', 'prescription-changed',
      'inventory-added', 'inventory-updated', 'inventory-deleted', 'inventory-changed'
    ]

    // تسجيل معالج واحد لجميع أحداث تغيير البيانات
    dataChangeEvents.forEach(eventName => {
      window.addEventListener(eventName, handleDataChanged)
    })

    // دالة التنظيف المحسنة
    return () => {
      console.log('🔔 Cleaning up real-time alerts listeners...')

      // إلغاء أي تحديث مؤجل
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }

      // إزالة جميع مستمعي أحداث تغيير البيانات
      if (listenersRef.current.has('handleDataChanged')) {
        const handler = listenersRef.current.get('handleDataChanged')!
        dataChangeEvents.forEach(eventName => {
          window.removeEventListener(eventName, handler as EventListener)
        })
      }

      // تنظيف المراجع
      listenersRef.current.clear()
      pendingRefreshRef.current = false
    }
  }, [refreshAlerts])

  return {
    refreshAlerts
  }
}

/**
 * Hook مبسط لاستخدام التحديثات في الوقت الفعلي
 * يمكن استخدامه في أي مكون يحتاج لمراقبة تغييرات التنبيهات
 */
export function useAlertUpdates() {
  const { alerts, unreadAlertsCount, loadAlerts } = useGlobalStore()

  // إعداد التحديثات في الوقت الفعلي
  useRealTimeAlerts()

  return {
    alerts,
    unreadAlertsCount,
    refreshAlerts: loadAlerts
  }
}

/**
 * Hook لمراقبة تنبيه محدد
 */
export function useAlertMonitor(alertId: string) {
  const { alerts } = useGlobalStore()

  // العثور على التنبيه المحدد
  const alert = alerts.find(a => a.id === alertId)

  useEffect(() => {
    if (!alertId) return

    const handleAlertUpdated = (data: any) => {
      if (data.alertId === alertId) {
        console.log(`🔔 Monitored alert ${alertId} updated:`, data.updates)
      }
    }

    const handleAlertDeleted = (data: any) => {
      if (data.alertId === alertId) {
        console.log(`🔔 Monitored alert ${alertId} deleted`)
      }
    }

    // تسجيل المستمعين
    SmartAlertsService.addEventListener('alert:updated', handleAlertUpdated)
    SmartAlertsService.addEventListener('alert:deleted', handleAlertDeleted)

    return () => {
      // تنظيف المستمعين
      SmartAlertsService.removeEventListener('alert:updated', handleAlertUpdated)
      SmartAlertsService.removeEventListener('alert:deleted', handleAlertDeleted)
    }
  }, [alertId])

  return alert
}
