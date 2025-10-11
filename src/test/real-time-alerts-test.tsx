import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Plus, Edit, Trash2, RefreshCw } from 'lucide-react'
import { useGlobalStore } from '@/store/globalStore'
import { useRealTimeAlerts } from '@/hooks/useRealTimeAlerts'
import { SmartAlertsService } from '@/services/smartAlertsService'
import { SimpleRealTimeIndicator, FullRealTimeIndicator } from '@/components/globalThis/RealTimeIndicator'

/**
 * صفحة اختبار نظام التحديث في الوقت الفعلي للتنبيهات
 */
export default function RealTimeAlertsTest() {
  const { 
    alerts, 
    unreadAlertsCount, 
    loadAlerts, 
    markAlertAsRead, 
    dismissAlert, 
    createAlert 
  } = useGlobalStore()
  
  // إعداد التحديثات في الوقت الفعلي
  const { refreshAlerts } = useRealTimeAlerts()
  
  const [testMessage, setTestMessage] = useState('')

  // اختبار إنشاء تنبيه جديد
  const testCreateAlert = async () => {
    try {
      await createAlert({
        type: 'custom',
        priority: 'high',
        title: `تنبيه تجريبي - ${new Date().toLocaleTimeString()}`,
        description: 'هذا تنبيه تجريبي لاختبار النظام',
        actionRequired: true,
        isRead: false,
        isDismissed: false
      })
      setTestMessage('✅ تم إنشاء التنبيه - يجب أن يظهر فوراً')
    } catch (error) {
      setTestMessage('❌ خطأ في إنشاء التنبيه: ' + error)
    }
  }

  // اختبار تحديث تنبيه
  const testUpdateAlert = async () => {
    if (alerts.length === 0) {
      setTestMessage('❌ لا توجد تنبيهات للتحديث')
      return
    }

    try {
      const firstAlert = alerts[0]
      await SmartAlertsService.updateAlert(firstAlert.id, {
        title: `تنبيه محدث - ${new Date().toLocaleTimeString()}`,
        description: 'تم تحديث هذا التنبيه تلقائياً'
      })
      setTestMessage('✅ تم تحديث التنبيه - يجب أن يظهر التحديث فوراً')
    } catch (error) {
      setTestMessage('❌ خطأ في تحديث التنبيه: ' + error)
    }
  }

  // اختبار حذف تنبيه
  const testDeleteAlert = async () => {
    if (alerts.length === 0) {
      setTestMessage('❌ لا توجد تنبيهات للحذف')
      return
    }

    try {
      const lastAlert = alerts[alerts.length - 1]
      await SmartAlertsService.deleteAlert(lastAlert.id)
      setTestMessage('✅ تم حذف التنبيه - يجب أن يختفي فوراً')
    } catch (error) {
      setTestMessage('❌ خطأ في حذف التنبيه: ' + error)
    }
  }

  // محاكاة تغيير البيانات
  const simulateDataChange = () => {
    // إرسال حدث تغيير البيانات
    window.dispatchEvent(new CustomEvent('patient-added', {
      detail: { id: Date.now(), name: 'مريض تجريبي' }
    }))
    setTestMessage('✅ تم إرسال حدث تغيير البيانات - يجب أن تتحدث التنبيهات')
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">اختبار نظام التحديث في الوقت الفعلي</h1>
        <FullRealTimeIndicator />
      </div>

      {/* رسالة الاختبار */}
      {testMessage && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm">{testMessage}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* أزرار الاختبار */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              اختبارات النظام
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={testCreateAlert} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              اختبار إنشاء تنبيه
            </Button>
            
            <Button onClick={testUpdateAlert} variant="outline" className="w-full">
              <Edit className="w-4 h-4 mr-2" />
              اختبار تحديث تنبيه
            </Button>
            
            <Button onClick={testDeleteAlert} variant="outline" className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              اختبار حذف تنبيه
            </Button>
            
            <Button onClick={simulateDataChange} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              محاكاة تغيير البيانات
            </Button>
            
            <Button onClick={refreshAlerts} variant="secondary" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              تحديث يدوي
            </Button>
          </CardContent>
        </Card>

        {/* معلومات النظام */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              معلومات التنبيهات
              <SimpleRealTimeIndicator />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>إجمالي التنبيهات:</span>
              <Badge variant="secondary">{alerts.length}</Badge>
            </div>
            
            <div className="flex justify-between">
              <span>غير مقروءة:</span>
              <Badge variant={unreadAlertsCount > 0 ? "destructive" : "secondary"}>
                {unreadAlertsCount}
              </Badge>
            </div>
            
            <div className="flex justify-between">
              <span>مقروءة:</span>
              <Badge variant="outline">
                {alerts.filter(a => a.isRead).length}
              </Badge>
            </div>
            
            <div className="flex justify-between">
              <span>مخفية:</span>
              <Badge variant="outline">
                {alerts.filter(a => a.isDismissed).length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* قائمة التنبيهات */}
      <Card>
        <CardHeader>
          <CardTitle>التنبيهات الحالية</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              لا توجد تنبيهات حالياً
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 10).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 border rounded-lg ${
                    alert.isRead ? 'bg-muted/30' : 'bg-background'
                  } ${alert.isDismissed ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={
                          alert.priority === 'high' ? 'destructive' : 
                          alert.priority === 'medium' ? 'default' : 'secondary'
                        }>
                          {alert.priority}
                        </Badge>
                        {!alert.isRead && (
                          <Badge variant="outline">غير مقروء</Badge>
                        )}
                        {alert.isDismissed && (
                          <Badge variant="outline">مخفي</Badge>
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
                          قراءة
                        </Button>
                      )}
                      {!alert.isDismissed && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissAlert(alert.id)}
                        >
                          إخفاء
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* تعليمات الاختبار */}
      <Card>
        <CardHeader>
          <CardTitle>تعليمات الاختبار</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <p>• اضغط "اختبار إنشاء تنبيه" لإنشاء تنبيه جديد - يجب أن يظهر فوراً</p>
            <p>• اضغط "اختبار تحديث تنبيه" لتحديث أول تنبيه - يجب أن يتحدث فوراً</p>
            <p>• اضغط "اختبار حذف تنبيه" لحذف آخر تنبيه - يجب أن يختفي فوراً</p>
            <p>• اضغط "محاكاة تغيير البيانات" لإرسال حدث تغيير - يجب أن تتحدث التنبيهات</p>
            <p>• راقب المؤشر الأخضر/الأحمر لحالة الاتصال</p>
            <p>• راقب عداد التحديثات في المؤشر</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
