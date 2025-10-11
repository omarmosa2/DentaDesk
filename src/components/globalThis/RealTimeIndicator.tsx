import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wifi, WifiOff, RefreshCw, Bell } from 'lucide-react'
import { useGlobalStore } from '@/store/globalStore'

interface RealTimeIndicatorProps {
  showRefreshButton?: boolean
  compact?: boolean
  className?: string
}

/**
 * مؤشر التحديثات في الوقت الفعلي للتنبيهات
 * يعرض حالة الاتصال والتحديثات الفورية
 */
export default function RealTimeIndicator({
  showRefreshButton = true,
  compact = false,
  className = ''
}: RealTimeIndicatorProps) {
  const { unreadAlertsCount, loadAlerts } = useGlobalStore()
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [updateCount, setUpdateCount] = useState(0)

  useEffect(() => {
    console.log('🔔 Setting up real-time indicator...')

    // دالة معالجة الأحداث
    const handleUpdate = () => {
      console.log('🔔 Real-time indicator: Update received')
      setLastUpdate(new Date())
      setUpdateCount(prev => prev + 1)
      setIsConnected(true)
    }

    // أحداث التنبيهات
    const alertEvents = [
      'alerts:alerts:changed',
      'alerts:alert:updated',
      'alerts:alert:created',
      'alerts:alert:deleted'
    ]

    // أحداث تغيير البيانات
    const dataEvents = [
      'patient-added', 'patient-updated', 'patient-deleted',
      'appointment-added', 'appointment-updated', 'appointment-deleted',
      'payment-added', 'payment-updated', 'payment-deleted'
    ]

    // تسجيل المستمعين
    const allEvents = [...alertEvents, ...dataEvents]
    allEvents.forEach(eventName => {
      window.addEventListener(eventName, handleUpdate)
    })

    // مراقبة حالة الاتصال
    const checkConnection = () => {
      const now = new Date()
      const timeDiff = now.getTime() - lastUpdate.getTime()

      // إذا لم يتم تحديث لأكثر من دقيقتين، اعتبر الاتصال منقطع
      if (timeDiff > 120000) { // 2 minutes
        setIsConnected(false)
      }
    }

    // فحص الاتصال كل 30 ثانية
    const connectionInterval = setInterval(checkConnection, 30000)

    return () => {
      console.log('🔔 Cleaning up real-time indicator...')

      // إزالة المستمعين
      allEvents.forEach(eventName => {
        window.removeEventListener(eventName, handleUpdate)
      })

      clearInterval(connectionInterval)
    }
  }, [lastUpdate])

  const formatLastUpdate = () => {
    const now = new Date()
    const diff = now.getTime() - lastUpdate.getTime()

    if (diff < 60000) { // أقل من دقيقة
      return 'الآن'
    } else if (diff < 3600000) { // أقل من ساعة
      const minutes = Math.floor(diff / 60000)
      return `منذ ${minutes} دقيقة`
    } else {
      const hours = Math.floor(diff / 3600000)
      return `منذ ${hours} ساعة`
    }
  }

  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered from real-time indicator')
    await loadAlerts()
    setLastUpdate(new Date())
    setIsConnected(true)
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isConnected ? (
          <Wifi className="w-4 h-4 text-green-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
        {unreadAlertsCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {unreadAlertsCount}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 p-3 bg-card border rounded-lg ${className}`}>
      <div className="flex items-center gap-2">
        {isConnected ? (
          <Wifi className="w-5 h-5 text-green-500" />
        ) : (
          <WifiOff className="w-5 h-5 text-red-500" />
        )}
        <div className="text-sm">
          <p className="font-medium">
            التحديث في الوقت الفعلي: {isConnected ? 'متصل' : 'منقطع'}
          </p>
          <p className="text-muted-foreground">
            آخر تحديث: {formatLastUpdate()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {unreadAlertsCount > 0 && (
          <div className="flex items-center gap-1">
            <Bell className="w-4 h-4 text-orange-500" />
            <Badge variant="destructive">
              {unreadAlertsCount}
            </Badge>
          </div>
        )}

        <Badge variant="secondary" className="text-xs">
          {updateCount} تحديث
        </Badge>

        {showRefreshButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-8"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            تحديث
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * مؤشر مبسط للتحديثات في الوقت الفعلي
 */
export function SimpleRealTimeIndicator({ className = '' }: { className?: string }) {
  return (
    <RealTimeIndicator
      showRefreshButton={false}
      compact={true}
      className={className}
    />
  )
}

/**
 * مؤشر كامل للتحديثات في الوقت الفعلي
 */
export function FullRealTimeIndicator({ className = '' }: { className?: string }) {
  return (
    <RealTimeIndicator
      showRefreshButton={true}
      compact={false}
      className={className}
    />
  )
}
