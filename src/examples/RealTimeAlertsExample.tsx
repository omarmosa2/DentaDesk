import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react'
import { useGlobalStore } from '@/store/globalStore'
import { useRealTimeAlerts, useAlertUpdates } from '@/hooks/useRealTimeAlerts'
import { useDataNotifier, useAllDataChangeListener } from '@/hooks/useDataChangeNotifications'
import { SmartAlertsService } from '@/services/smartAlertsService'
import { FullRealTimeIndicator } from '@/components/globalThis/RealTimeIndicator'

/**
 * مثال عملي لاستخدام نظام التحديث في الوقت الفعلي للتنبيهات
 * يوضح كيفية:
 * 1. عرض التنبيهات مع التحديث التلقائي
 * 2. إنشاء وتعديل وحذف التنبيهات
 * 3. إرسال إشعارات تغيير البيانات
 * 4. مراقبة جميع التغييرات في الوقت الفعلي
 */
export default function RealTimeAlertsExample() {
  const { alerts, unreadAlertsCount, markAlertAsRead, dismissAlert, createAlert } = useGlobalStore()
  
  // إعداد التحديثات في الوقت الفعلي
  const { refreshAlerts } = useRealTimeAlerts()
  const { alerts: realtimeAlerts } = useAlertUpdates()
  
  // نظام إشعارات تغيير البيانات
  const {
    notifyPatientCreated,
    notifyPatientUpdated,
    notifyAppointmentCreated,
    notifyPaymentCreated
  } = useDataNotifier()

  // حالة المكون
  const [newAlertTitle, setNewAlertTitle] = useState('')
  const [newAlertDescription, setNewAlertDescription] = useState('')
  const [dataChangeLog, setDataChangeLog] = useState<string[]>([])

  // الاستماع لجميع تغييرات البيانات
  useAllDataChangeListener((event, payload) => {
    const logEntry = `${new Date().toLocaleTimeString()}: ${event} - ${payload.type} (${payload.id})`
    setDataChangeLog(prev => [logEntry, ...prev.slice(0, 9)]) // آخر 10 أحداث
  }, [])

  // إنشاء تنبيه جديد
  const handleCreateAlert = async () => {
    if (!newAlertTitle.trim()) return

    try {
      await createAlert({
        type: 'custom',
        priority: 'medium',
        title: newAlertTitle,
        description: newAlertDescription || 'تنبيه مخصص',
        actionRequired: true,
        isRead: false,
        isDismissed: false
      })

      setNewAlertTitle('')
      setNewAlertDescription('')
      
      console.log('✅ تم إنشاء التنبيه - سيظهر تلقائياً في جميع أنحاء التطبيق')
    } catch (error) {
      console.error('خطأ في إنشاء التنبيه:', error)
    }
  }

  // محاكاة تغييرات البيانات
  const simulateDataChanges = () => {
    const patientId = `patient_${Date.now()}`
    const appointmentId = `appointment_${Date.now()}`
    const paymentId = `payment_${Date.now()}`

    // محاكاة إنشاء مريض جديد
    setTimeout(() => {
      notifyPatientCreated(patientId, { name: 'مريض تجريبي', phone: '123456789' })
    }, 1000)

    // محاكاة إنشاء موعد جديد
    setTimeout(() => {
      notifyAppointmentCreated(appointmentId, { 
        patientId, 
        date: new Date().toISOString(),
        title: 'موعد تجريبي'
      })
    }, 2000)

    // محاكاة إنشاء دفعة جديدة
    setTimeout(() => {
      notifyPaymentCreated(paymentId, { 
        patientId, 
        amount: 500,
        method: 'cash'
      })
    }, 3000)

    // محاكاة تحديث المريض
    setTimeout(() => {
      notifyPatientUpdated(patientId, { name: 'مريض محدث', phone: '987654321' })
    }, 4000)
  }

  // تحديث تنبيه محدد
  const handleUpdateAlert = async (alertId: string) => {
    try {
      await SmartAlertsService.updateAlert(alertId, {
        title: `تنبيه محدث - ${new Date().toLocaleTimeString()}`,
        description: 'تم تحديث هذا التنبيه تلقائياً'
      })
      
      console.log('✅ تم تحديث التنبيه - سيظهر التحديث تلقائياً في جميع أنحاء التطبيق')
    } catch (error) {
      console.error('خطأ في تحديث التنبيه:', error)
    }
  }

  // حذف تنبيه
  const handleDeleteAlert = async (alertId: string) => {
    try {
      await SmartAlertsService.deleteAlert(alertId)
      
      console.log('✅ تم حذف التنبيه - سيختفي تلقائياً من جميع أنحاء التطبيق')
    } catch (error) {
      console.error('خطأ في حذف التنبيه:', error)
    }
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">مثال نظام التحديث في الوقت الفعلي للتنبيهات</h1>
        <FullRealTimeIndicator />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* قسم إنشاء التنبيهات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              إنشاء تنبيه جديد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="عنوان التنبيه"
              value={newAlertTitle}
              onChange={(e) => setNewAlertTitle(e.target.value)}
            />
            <Input
              placeholder="وصف التنبيه (اختياري)"
              value={newAlertDescription}
              onChange={(e) => setNewAlertDescription(e.target.value)}
            />
            <Button onClick={handleCreateAlert} disabled={!newAlertTitle.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              إنشاء تنبيه
            </Button>
          </CardContent>
        </Card>

        {/* قسم محاكاة تغييرات البيانات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              محاكاة تغييرات البيانات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              اضغط لمحاكاة تغييرات في البيانات وملاحظة كيف تؤثر على التنبيهات
            </p>
            <Button onClick={simulateDataChanges}>
              <RefreshCw className="w-4 h-4 mr-2" />
              محاكاة تغييرات البيانات
            </Button>
            <Button onClick={refreshAlerts} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              تحديث يدوي للتنبيهات
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* قسم التنبيهات الحالية */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              التنبيهات الحالية
              {unreadAlertsCount > 0 && (
                <Badge variant="destructive">{unreadAlertsCount}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد تنبيهات حالياً
              </p>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 border rounded-lg ${
                      alert.isRead ? 'bg-muted/30' : 'bg-background'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {alert.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={alert.priority === 'high' ? 'destructive' : 'secondary'}>
                            {alert.priority}
                          </Badge>
                          {!alert.isRead && (
                            <Badge variant="outline">غير مقروء</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!alert.isRead && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAlertAsRead(alert.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateAlert(alert.id)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAlert(alert.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* قسم سجل تغييرات البيانات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              سجل تغييرات البيانات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dataChangeLog.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد تغييرات مسجلة
              </p>
            ) : (
              <div className="space-y-2">
                {dataChangeLog.map((log, index) => (
                  <div
                    key={index}
                    className="text-sm p-2 bg-muted/30 rounded border-r-2 border-primary"
                  >
                    {log}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* معلومات النظام */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات النظام</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>إجمالي التنبيهات:</strong> {alerts.length}
            </div>
            <div>
              <strong>غير مقروءة:</strong> {unreadAlertsCount}
            </div>
            <div>
              <strong>أحداث البيانات:</strong> {dataChangeLog.length}
            </div>
          </div>
          <Separator className="my-4" />
          <div className="text-xs text-muted-foreground">
            <p>• جميع التحديثات تتم في الوقت الفعلي بدون إعادة تحميل</p>
            <p>• أي تعديل على التنبيهات يظهر فوراً في جميع أنحاء التطبيق</p>
            <p>• تغييرات البيانات تؤدي لإعادة توليد التنبيهات تلقائياً</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
