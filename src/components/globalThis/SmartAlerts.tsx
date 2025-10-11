import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle,
  Calendar,
  DollarSign,
  Activity,
  FileText,
  Package,
  Pill,
  UserCheck,
  RefreshCw
} from 'lucide-react'
import { useGlobalStore } from '@/store/globalStore'
import { SmartAlertsService } from '@/services/smartAlertsService'
import { useRealTimeAlerts } from '@/hooks/useRealTimeAlerts'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/hooks/use-toast'
import type { SmartAlert } from '@/types'

// البيانات الحقيقية فقط - لا توجد بيانات تجريبية كما هو محدد في المتطلبات

interface SmartAlertsProps {
  maxVisible?: number
  showHeader?: boolean
  compact?: boolean
  onAlertClick?: (alert: SmartAlert) => void
  showReadAlerts?: boolean
}

// Helper function to format time distance
function formatTimeDistance(dateInput: string | Date): string {
  try {
    // Handle invalid input
    if (!dateInput) {
      return 'غير محدد'
    }

    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'تاريخ غير صحيح'
    }

    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return 'منذ لحظات'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `منذ ${minutes} دقيقة`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `منذ ${hours} ساعة`
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400)
      return `منذ ${days} يوم`
    } else {
      const months = Math.floor(diffInSeconds / 2592000)
      return `منذ ${months} شهر`
    }
  } catch (error) {
    console.error('Error formatting time distance:', error)
    return 'خطأ في التاريخ'
  }
}

// Helper function to safely format date
function formatSafeDate(dateInput: string | Date): string {
  try {
    if (!dateInput) {
      return '--'
    }

    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '--'
    }

    // Format as DD/MM/YYYY
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  } catch (error) {
    console.error('Error formatting date:', error)
    return '--'
  }
}

export default function SmartAlerts({
  maxVisible = 5,
  showHeader = true,
  compact = false,
  onAlertClick,
  showReadAlerts = false
}: SmartAlertsProps) {
  const {
    alerts,
    unreadAlertsCount,
    isLoadingAlerts,
    loadAlerts,
    markAlertAsRead
  } = useGlobalStore()

  // إعداد التحديثات في الوقت الفعلي
  const { refreshAlerts } = useRealTimeAlerts()

  // إعداد الثيم
  const { isDarkMode } = useTheme()

  // إعداد Toast notifications
  const { toast } = useToast()

  const [showRead, setShowRead] = useState(showReadAlerts)
  const [lastUnreadCount, setLastUnreadCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showUnreadOnly, setShowUnreadOnly] = useState(true)

  useEffect(() => {
    // تحميل الإشعارات عند بدء تشغيل المكون
    console.log('🔔 SmartAlerts: Initial load')
    loadAlerts()

    // تحديث دوري محسّن: كل 30 ثانية للتنبيهات العادية وكل 10 ثوانٍ للتنبيهات العاجلة
    const normalInterval = setInterval(() => {
      console.log('🔄 SmartAlerts: Normal refresh (every 30s)')
      loadAlerts()
    }, 30000) // 30 ثانية

    // تحديث سريع للتنبيهات العاجلة
    const urgentInterval = setInterval(() => {
      if (unreadAlertsCount > 0) {
        console.log('🚨 SmartAlerts: Urgent refresh (every 10s)')
        loadAlerts()
      }
    }, 10000) // 10 ثوانٍ عند وجود تنبيهات غير مقروءة

    return () => {
      clearInterval(normalInterval)
      clearInterval(urgentInterval)
    }
  }, [loadAlerts, unreadAlertsCount])

  // تحديث showRead عند تغيير showReadAlerts prop
  useEffect(() => {
    setShowRead(showReadAlerts)
  }, [showReadAlerts])

  // كشف التنبيهات الجديدة وإظهار تنبيهات بصرية
  useEffect(() => {
    // الكشف عن زيادة في عدد التنبيهات غير المقروءة
    if (unreadAlertsCount > lastUnreadCount && lastUnreadCount !== 0) {
      const newAlertsCount = unreadAlertsCount - lastUnreadCount

      // إظهار تنبيه بصري للتنبيهات الجديدة
      toast({
        title: "🔔 تنبيهات جديدة",
        description: `تم إضافة ${newAlertsCount} تنبيه${newAlertsCount > 1 ? '' : ''} جديد${newAlertsCount > 1 ? 'ة' : ''}`,
        duration: 4000
      })

      // تشغيل التأثير البصري
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 2000)
    }

    setLastUnreadCount(unreadAlertsCount)
  }, [unreadAlertsCount, lastUnreadCount, toast])

  // Filter and sort alerts
  const filteredAlerts = alerts
    .filter(alert => !alert.isDismissed)
    .filter(alert => {
      // Hide snoozed alerts
      if (alert.snoozeUntil) {
        const snoozeDate = new Date(alert.snoozeUntil)
        return snoozeDate <= new Date()
      }
      return true
    })
    .filter(alert => {
      // Filter based on showRead state and showUnreadOnly state
      if (showRead) {
        // Show all alerts when showRead is enabled
        return true
      } else if (showUnreadOnly) {
        // Show only unread alerts
        return !alert.isRead
      } else {
        // Show all alerts when showUnreadOnly is disabled
        return true
      }
    })

  // Only apply maxVisible limit when showing unread only or when showRead is false
  // When showUnreadOnly is false (showing all), don't limit the number
  const visibleAlerts = showUnreadOnly || !showRead
    ? filteredAlerts.slice(0, maxVisible)
    : filteredAlerts

  // Count read and unread alerts for display
  const readAlertsCount = alerts.filter(alert => alert.isRead && !alert.isDismissed).length
  const totalAlertsCount = alerts.filter(alert => !alert.isDismissed).length

  // Get alert icon
  const getAlertIcon = (alert: SmartAlert) => {
    switch (alert.type) {
      case 'appointment':
        return <Calendar className="w-4 h-4" />
      case 'payment':
        return <DollarSign className="w-4 h-4" />
      case 'treatment':
        return <Activity className="w-4 h-4" />
      case 'prescription':
        return <Pill className="w-4 h-4" />
      case 'follow_up':
        return <UserCheck className="w-4 h-4" />
      case 'lab_order':
        return <FileText className="w-4 h-4" />
      case 'inventory':
        return <Package className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  // Get priority color with dark mode support
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return isDarkMode
          ? 'text-red-400 bg-red-900/20 border-red-800/50'
          : 'text-red-500 bg-red-50 border-red-200'
      case 'medium':
        return isDarkMode
          ? 'text-yellow-400 bg-yellow-900/20 border-yellow-800/50'
          : 'text-yellow-500 bg-yellow-50 border-yellow-200'
      case 'low':
        return isDarkMode
          ? 'text-blue-400 bg-blue-900/20 border-blue-800/50'
          : 'text-blue-500 bg-blue-50 border-blue-200'
      default:
        return isDarkMode
          ? 'text-gray-400 bg-gray-900/20 border-gray-800/50'
          : 'text-gray-500 bg-gray-50 border-gray-200'
    }
  }

  // Get priority label
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'عاجل'
      case 'medium': return 'متوسط'
      case 'low': return 'منخفض'
      default: return priority
    }
  }

  // Handle alert click
  const handleAlertClick = async (alert: SmartAlert) => {
    if (!alert.isRead) {
      await markAlertAsRead(alert.id)
    }



    // Show alert details in console for debugging
    console.log('🔔 Alert clicked:', {
      title: alert.title,
      description: alert.description,
      type: alert.type,
      priority: alert.priority,
      patientName: alert.patientName,
      relatedData: alert.relatedData
    })

    // Show a visual feedback toast (disabled for cleaner UI)
    // showAlertToast(alert)

    onAlertClick?.(alert)
  }







  // Mark alert as read function
  const markAsRead = async (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    console.log('🔔 Mark as read button clicked for alert:', alertId)

    try {
      console.log('🔄 Calling markAlertAsRead...')
      await markAlertAsRead(alertId)
      console.log('✅ markAlertAsRead completed successfully')

      // Force a reload of alerts to ensure UI updates immediately
      console.log('🔄 Reloading alerts to update UI...')
      await loadAlerts()
      console.log('✅ Alerts reloaded successfully')

      toast({
        title: "✅ تم التحديث",
        description: "تم تحديد الإشعار كمقروء",
        duration: 2000,
      })
    } catch (error) {
      console.error('❌ Error marking alert as read:', error)
      toast({
        title: "❌ خطأ",
        description: "فشل في تحديث الإشعار",
        variant: "destructive",
      })
    }
  }

  if (isLoadingAlerts) {
    return (
      <Card className={compact ? 'shadow-sm' : ''}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5" />
              التنبيهات الذكية
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div
      className={`space-y-4 md:space-y-5 lg:space-y-6 animate-fade-in ${isAnimating ? 'animate-pulse' : ''}`}
      dir="rtl"
      data-alerts-component
    >
      <Card className={`${compact ? 'shadow-sm' : ''} bg-card border-border hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 ${
        unreadAlertsCount > 0 ? 'ring-2 ring-primary/20 ring-offset-2' : ''
      } ${isAnimating ? 'shadow-2xl scale-105' : ''}`}>
        {showHeader && (
          <CardHeader className="p-4 md:p-5 lg:p-6 pb-3 md:pb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg md:text-xl lg:text-2xl flex items-center gap-2 font-tajawal">
                <Bell className={`w-5 h-5 md:w-6 md:h-6 ${unreadAlertsCount > 0 ? 'animate-bounce' : ''}`} />
                التنبيهات الذكية
                {unreadAlertsCount > 0 && (
                  <Badge variant="destructive" className="text-xs px-2 py-1 bg-destructive/10 text-destructive border-destructive/20 animate-pulse">
                    {unreadAlertsCount}
                  </Badge>
                )}
              </CardTitle>
              {/* أزرار التحكم */}
              <div className="flex gap-2">
                {/* زر التحديث اليدوي */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('🔄 Manual refresh triggered')
                    loadAlerts()
                  }}
                  className="h-8 px-3"
                  disabled={isLoadingAlerts}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingAlerts ? 'animate-spin' : ''}`} />
                </Button>

                {/* زر عرض المقروء */}
                {readAlertsCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRead(!showRead)}
                    className="h-8 px-3 text-xs"
                  >
                    {showRead ? 'إخفاء المقروء' : 'عرض المقروء'}
                  </Button>
                )}

                {/* زر عرض الكل/غير المقروء فقط */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                  className="h-8 px-3 text-xs"
                >
                  {showUnreadOnly ? 'عرض الكل' : 'غير المقروء فقط'}
                </Button>
              </div>
            </div>

            {/* إحصائيات التنبيهات المحسّنة */}
            <div className="text-xs md:text-sm text-muted-foreground mt-2 md:mt-3 font-tajawal">
              <div className="flex flex-wrap gap-4">
                <span>المجموع: <strong>{totalAlertsCount}</strong></span>
                <span>غير مقروءة: <strong className="text-primary">{unreadAlertsCount}</strong></span>
                <span>مقروءة: <strong>{readAlertsCount}</strong></span>
                {alerts.filter(a => a.priority === 'high' && !a.isRead).length > 0 && (
                  <span className="text-red-500">عاجلة: <strong>{alerts.filter(a => a.priority === 'high' && !a.isRead).length}</strong></span>
                )}
              </div>
            </div>
          </CardHeader>
        )}

       <CardContent className={`${showHeader ? '' : 'pt-6'} p-4 md:p-5 lg:p-6`}>
         {/* ملخص سريع للتنبيهات العاجلة */}
         {visibleAlerts.filter(a => a.priority === 'high' && !a.isRead).length > 0 && (
           <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
             <div className="flex items-center gap-2">
               <AlertTriangle className="w-4 h-4 text-red-500" />
               <span className="text-sm font-medium text-red-700 dark:text-red-300">
                 {visibleAlerts.filter(a => a.priority === 'high' && !a.isRead).length} تنبيه عاجل يتطلب انتباهك فوراً
               </span>
             </div>
           </div>
         )}

         {visibleAlerts.length === 0 ? (
           <div className="text-center py-6 md:py-8 text-muted-foreground">
             <CheckCircle className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-4 opacity-50" />
             <p className="text-sm md:text-base font-tajawal">
               {showRead
                 ? (totalAlertsCount === 0 ? 'لا توجد تنبيهات' : 'لا توجد تنبيهات في هذا العرض')
                 : showUnreadOnly
                   ? 'لا توجد تنبيهات غير مقروءة'
                   : 'لا توجد تنبيهات'
               }
             </p>
             {!showRead && showUnreadOnly && readAlertsCount > 0 && (
               <div className="mt-3">
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => setShowRead(true)}
                   className="text-xs"
                 >
                   عرض التنبيهات المقروءة ({readAlertsCount})
                 </Button>
               </div>
             )}
           </div>
         ) : (
           <div className="space-y-3 md:space-y-4">
             {visibleAlerts.map((alert, index) => (
               <div key={alert.id}>
                 <div
                   className={`p-3 md:p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                     alert.isRead
                       ? isDarkMode
                         ? 'bg-muted/10 border-muted/30 hover:bg-muted/20 hover:border-muted/50'
                         : 'bg-muted/20 border-muted/40 hover:bg-muted/30 hover:border-muted/60'
                       : isDarkMode
                         ? `${getPriorityColor(alert.priority)} hover:opacity-90 hover:shadow-md`
                         : `${getPriorityColor(alert.priority)} hover:opacity-85 hover:shadow-lg`
                   }`}
                   onClick={() => handleAlertClick(alert)}
                   role="button"
                   tabIndex={0}
                   aria-label={`تنبيه: ${alert.title} - ${getPriorityLabel(alert.priority)}`}
                 >
                   <div className="flex items-start gap-3" dir="rtl">
                     <div className={`p-2 md:p-3 rounded-full shrink-0 ${
                       isDarkMode
                         ? `${getPriorityColor(alert.priority)} bg-opacity-20 border border-current border-opacity-30`
                         : `${getPriorityColor(alert.priority)} bg-opacity-10 border border-current border-opacity-20`
                     }`}>
                       {getAlertIcon(alert)}
                     </div>

                     <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-1 md:mb-2">
                         <h4 className="font-medium text-sm md:text-base truncate font-tajawal">{alert.title}</h4>
                         <Badge variant="outline" className="text-xs px-2 py-1 border-primary/20 text-primary">
                           {getPriorityLabel(alert.priority)}
                         </Badge>
                         {!alert.isRead && (
                           <div className="w-2 h-2 bg-primary rounded-full" aria-label="تنبيه غير مقروء"></div>
                         )}
                       </div>

                       <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3 line-clamp-2">
                         {alert.description}
                       </p>

                       {alert.patientName && (
                         <p className="text-xs md:text-sm font-medium text-primary mb-2 flex items-center gap-1">
                           <UserCheck className="w-3 h-3 md:w-4 md:h-4" />
                           {alert.patientName}
                         </p>
                       )}

                       <div className="flex items-center justify-between">
                         <span className="text-xs md:text-sm text-muted-foreground">
                           {formatTimeDistance(alert.createdAt)}
                         </span>

                         {alert.dueDate && (
                           <span className="text-xs md:text-sm text-muted-foreground">
                             📅 {formatSafeDate(alert.dueDate)}
                           </span>
                         )}
                       </div>

                       {/* زر تحديد كمقروء فقط */}
                       {!alert.isRead && (
                         <div className="mt-2 md:mt-3">
                           <Button
                             size="sm"
                             variant="outline"
                             className="h-7 md:h-8 text-xs md:text-sm hover:bg-primary/10 hover:text-primary transition-all duration-200"
                             onClick={(e) => markAsRead(alert.id, e)}
                             aria-label={`تحديد التنبيه "${alert.title}" كمقروء`}
                           >
                             <CheckCircle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                             تحديد كمقروء
                           </Button>
                         </div>
                       )}
                     </div>
                   </div>
                 </div>

                 {index < visibleAlerts.length - 1 && (
                   <Separator className={`my-2 md:my-3 ${isDarkMode ? 'bg-muted/30' : ''}`} />
                 )}
               </div>
             ))}
           </div>
         )}
       </CardContent>
     </Card>
   </div>
 )
}
