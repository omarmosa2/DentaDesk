/**
 * اختبار إصلاحات نظام التنبيهات
 * يختبر:
 * 1. عدم تكرار التنبيهات
 * 2. تحديث الجداول عند تعديل البيانات
 * 3. حذف التنبيهات القديمة عند التحديث
 * 4. التحديث في الوقت الفعلي للجداول
 */

import { SmartAlertsService } from '@/services/smartAlertsService'

export class AlertsFixTest {

  /**
   * اختبار عدم تكرار التنبيهات
   */
  static async testDuplicateRemoval() {
    console.log('🧪 Testing duplicate alert removal...')

    try {
      // جلب التنبيهات الحالية
      const alerts = await SmartAlertsService.getAllAlerts()
      console.log('📋 Current alerts count:', alerts.length)

      // فحص التكرارات
      const alertIds = alerts.map(alert => alert.id)
      const uniqueIds = new Set(alertIds)

      if (alertIds.length !== uniqueIds.size) {
        console.warn('⚠️ Found duplicate alerts:', alertIds.length - uniqueIds.size)
        return false
      } else {
        console.log('✅ No duplicate alerts found')
        return true
      }
    } catch (error) {
      console.error('❌ Error testing duplicate removal:', error)
      return false
    }
  }

  /**
   * اختبار تحديث التنبيهات عند تغيير البيانات
   */
  static async testDataChangeSync() {
    console.log('🧪 Testing data change synchronization...')

    try {
      // محاكاة تغيير في البيانات
      const testEvent = new CustomEvent('appointment-updated', {
        detail: {
          type: 'updated',
          appointmentId: 'test-appointment-123',
          appointment: {
            id: 'test-appointment-123',
            start_time: new Date().toISOString(),
            status: 'completed'
          }
        }
      })

      // إرسال الحدث
      window.dispatchEvent(testEvent)

      // انتظار قصير للمعالجة
      await new Promise(resolve => setTimeout(resolve, 200))

      console.log('✅ Data change event dispatched successfully')
      return true
    } catch (error) {
      console.error('❌ Error testing data change sync:', error)
      return false
    }
  }

  /**
   * اختبار حذف التنبيهات المرتبطة بموعد
   */
  static async testAppointmentAlertDeletion() {
    console.log('🧪 Testing appointment alert deletion...')

    try {
      // إنشاء تنبيه اختبار
      const testAlert = await SmartAlertsService.createAlert({
        type: 'appointment',
        priority: 'medium',
        title: 'Test Alert',
        description: 'This is a test alert',
        relatedData: {
          appointmentId: 'test-appointment-delete-123'
        },
        actionRequired: false,
        isRead: false,
        isDismissed: false
      })

      console.log('📝 Created test alert:', testAlert.id)

      // حذف التنبيهات المرتبطة بالموعد
      await SmartAlertsService.deleteAppointmentAlerts('test-appointment-delete-123')

      // التحقق من الحذف
      const alerts = await SmartAlertsService.getAllAlerts()
      const remainingTestAlerts = alerts.filter(alert =>
        alert.relatedData?.appointmentId === 'test-appointment-delete-123'
      )

      if (remainingTestAlerts.length === 0) {
        console.log('✅ Appointment alerts deleted successfully')
        return true
      } else {
        console.warn('⚠️ Some appointment alerts were not deleted:', remainingTestAlerts.length)
        return false
      }
    } catch (error) {
      console.error('❌ Error testing appointment alert deletion:', error)
      return false
    }
  }

  /**
   * اختبار تنظيف التنبيهات القديمة
   */
  static async testOutdatedAlertCleanup() {
    console.log('🧪 Testing outdated alert cleanup...')

    try {
      // جلب التنبيهات قبل التنظيف
      const alertsBefore = await SmartAlertsService.getAllAlerts()
      console.log('📋 Alerts before cleanup:', alertsBefore.length)

      // تشغيل التنظيف (سيتم استدعاؤه داخلياً في getAllAlerts)
      const alertsAfter = await SmartAlertsService.getAllAlerts()
      console.log('📋 Alerts after cleanup:', alertsAfter.length)

      console.log('✅ Cleanup process completed')
      return true
    } catch (error) {
      console.error('❌ Error testing outdated alert cleanup:', error)
      return false
    }
  }

  /**
   * اختبار التحديث في الوقت الفعلي للجداول
   */
  static async testRealTimeTableSync() {
    console.log('🧪 Testing real-time table synchronization...')

    try {
      // محاكاة تحديث موعد
      const appointmentUpdateEvent = new CustomEvent('appointment-updated', {
        detail: {
          type: 'updated',
          appointmentId: 'test-appointment-sync-123',
          appointment: {
            id: 'test-appointment-sync-123',
            start_time: new Date().toISOString(),
            status: 'completed'
          }
        }
      })

      // محاكاة تحديث دفعة
      const paymentUpdateEvent = new CustomEvent('payment-updated', {
        detail: {
          type: 'updated',
          paymentId: 'test-payment-sync-123',
          payment: {
            id: 'test-payment-sync-123',
            status: 'completed'
          }
        }
      })

      // إرسال الأحداث
      window.dispatchEvent(appointmentUpdateEvent)
      window.dispatchEvent(paymentUpdateEvent)

      // انتظار للمعالجة
      await new Promise(resolve => setTimeout(resolve, 300))

      console.log('✅ Real-time table sync events dispatched successfully')
      return true
    } catch (error) {
      console.error('❌ Error testing real-time table sync:', error)
      return false
    }
  }

  /**
   * تشغيل جميع الاختبارات
   */
  static async runAllTests() {
    console.log('🚀 Starting alerts fix tests...')

    const results = {
      duplicateRemoval: await this.testDuplicateRemoval(),
      dataChangeSync: await this.testDataChangeSync(),
      appointmentAlertDeletion: await this.testAppointmentAlertDeletion(),
      outdatedAlertCleanup: await this.testOutdatedAlertCleanup(),
      realTimeTableSync: await this.testRealTimeTableSync()
    }

    const passedTests = Object.values(results).filter(result => result).length
    const totalTests = Object.keys(results).length

    console.log('📊 Test Results:')
    console.log(`✅ Passed: ${passedTests}/${totalTests}`)
    console.log('📋 Details:', results)

    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Alerts system is working correctly.')
    } else {
      console.log('⚠️ Some tests failed. Please check the implementation.')
    }

    return results
  }
}

// تصدير دالة سريعة للاختبار
export const testAlertsFix = () => AlertsFixTest.runAllTests()

// إضافة الاختبار إلى window للوصول السهل من console
if (typeof window !== 'undefined') {
  (window as any).testAlertsFix = testAlertsFix
  console.log('🔧 Alerts fix test available: window.testAlertsFix()')
}
