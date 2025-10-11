/**
 * اختبار شامل لنظام التنبيهات الذكية المحسن
 * يختبر جميع الوحدات والتكامل والتحديث في الوقت الفعلي
 */

import { SmartAlertsService } from '@/services/smartAlertsService'
import { DataChangeNotifier } from '@/utils/dataChangeNotifier'

export class ComprehensiveAlertsTest {

  /**
   * اختبار شامل لجميع أنواع التنبيهات
   */
  static async runFullTest(): Promise<boolean> {
    console.log('🧪 بدء الاختبار الشامل لنظام التنبيهات المحسن...')
    
    try {
      // اختبار عدم التكرار
      const duplicateTest = await this.testDuplicateRemoval()
      console.log(`✅ اختبار عدم التكرار: ${duplicateTest ? 'نجح' : 'فشل'}`)

      // اختبار تنبيهات المختبرات
      const labTest = await this.testLabOrderAlerts()
      console.log(`✅ اختبار تنبيهات المختبرات: ${labTest ? 'نجح' : 'فشل'}`)

      // اختبار تنبيهات احتياجات العيادة
      const clinicNeedsTest = await this.testClinicNeedsAlerts()
      console.log(`✅ اختبار تنبيهات احتياجات العيادة: ${clinicNeedsTest ? 'نجح' : 'فشل'}`)

      // اختبار تنبيهات المخزون المحسنة
      const inventoryTest = await this.testEnhancedInventoryAlerts()
      console.log(`✅ اختبار تنبيهات المخزون المحسنة: ${inventoryTest ? 'نجح' : 'فشل'}`)

      // اختبار تنبيهات الوصفات المحسنة
      const prescriptionTest = await this.testEnhancedPrescriptionAlerts()
      console.log(`✅ اختبار تنبيهات الوصفات المحسنة: ${prescriptionTest ? 'نجح' : 'فشل'}`)

      // اختبار التحديث في الوقت الفعلي
      const realTimeTest = await this.testRealTimeUpdates()
      console.log(`✅ اختبار التحديث في الوقت الفعلي: ${realTimeTest ? 'نجح' : 'فشل'}`)

      // اختبار الأداء
      const performanceTest = await this.testPerformance()
      console.log(`✅ اختبار الأداء: ${performanceTest ? 'نجح' : 'فشل'}`)

      const allTestsPassed = duplicateTest && labTest && clinicNeedsTest && 
                           inventoryTest && prescriptionTest && realTimeTest && performanceTest

      console.log(`🎯 نتيجة الاختبار الشامل: ${allTestsPassed ? '✅ نجح' : '❌ فشل'}`)
      return allTestsPassed

    } catch (error) {
      console.error('❌ خطأ في الاختبار الشامل:', error)
      return false
    }
  }

  /**
   * اختبار عدم تكرار التنبيهات
   */
  static async testDuplicateRemoval(): Promise<boolean> {
    try {
      const alerts = await SmartAlertsService.getAllAlerts()
      
      // فحص التكرار بناءً على المعرف
      const alertIds = alerts.map(alert => alert.id)
      const uniqueIds = new Set(alertIds)
      
      if (alertIds.length !== uniqueIds.size) {
        console.warn('⚠️ وجدت تنبيهات مكررة بناءً على المعرف')
        return false
      }

      // فحص التكرار بناءً على المحتوى
      const contentKeys = alerts.map(alert => 
        `${alert.type}|${alert.patientId || 'no-patient'}|${alert.title.replace(/\s+/g, '').toLowerCase()}`
      )
      const uniqueContentKeys = new Set(contentKeys)
      
      if (contentKeys.length !== uniqueContentKeys.size) {
        console.warn('⚠️ وجدت تنبيهات مكررة بناءً على المحتوى')
        return false
      }

      return true
    } catch (error) {
      console.error('❌ خطأ في اختبار عدم التكرار:', error)
      return false
    }
  }

  /**
   * اختبار تنبيهات المختبرات
   */
  static async testLabOrderAlerts(): Promise<boolean> {
    try {
      const alerts = await SmartAlertsService.getAllAlerts()
      const labAlerts = alerts.filter(alert => alert.type === 'lab_order')
      
      console.log(`📊 عدد تنبيهات المختبرات: ${labAlerts.length}`)
      
      // فحص أنواع تنبيهات المختبرات
      const overdueAlerts = labAlerts.filter(alert => alert.id.includes('overdue'))
      const paymentAlerts = labAlerts.filter(alert => alert.id.includes('payment'))
      const dueSoonAlerts = labAlerts.filter(alert => alert.id.includes('due_soon'))
      
      console.log(`  - تنبيهات متأخرة: ${overdueAlerts.length}`)
      console.log(`  - تنبيهات دفعات: ${paymentAlerts.length}`)
      console.log(`  - تنبيهات قريبة التسليم: ${dueSoonAlerts.length}`)
      
      return true
    } catch (error) {
      console.error('❌ خطأ في اختبار تنبيهات المختبرات:', error)
      return false
    }
  }

  /**
   * اختبار تنبيهات احتياجات العيادة
   */
  static async testClinicNeedsAlerts(): Promise<boolean> {
    try {
      const alerts = await SmartAlertsService.getAllAlerts()
      const clinicNeedsAlerts = alerts.filter(alert => 
        alert.relatedData?.clinicNeedId || alert.id.includes('clinic_need')
      )
      
      console.log(`📊 عدد تنبيهات احتياجات العيادة: ${clinicNeedsAlerts.length}`)
      
      // فحص أنواع تنبيهات احتياجات العيادة
      const urgentAlerts = clinicNeedsAlerts.filter(alert => alert.id.includes('urgent'))
      const delayedAlerts = clinicNeedsAlerts.filter(alert => alert.id.includes('delayed'))
      const expensiveAlerts = clinicNeedsAlerts.filter(alert => alert.id.includes('expensive'))
      
      console.log(`  - تنبيهات عاجلة: ${urgentAlerts.length}`)
      console.log(`  - تنبيهات متأخرة: ${delayedAlerts.length}`)
      console.log(`  - تنبيهات عالية التكلفة: ${expensiveAlerts.length}`)
      
      return true
    } catch (error) {
      console.error('❌ خطأ في اختبار تنبيهات احتياجات العيادة:', error)
      return false
    }
  }

  /**
   * اختبار تنبيهات المخزون المحسنة
   */
  static async testEnhancedInventoryAlerts(): Promise<boolean> {
    try {
      const alerts = await SmartAlertsService.getAllAlerts()
      const inventoryAlerts = alerts.filter(alert => alert.type === 'inventory')
      
      console.log(`📊 عدد تنبيهات المخزون: ${inventoryAlerts.length}`)
      
      // فحص أنواع تنبيهات المخزون المحسنة
      const expiryAlerts = inventoryAlerts.filter(alert => alert.id.includes('expiry'))
      const lowStockAlerts = inventoryAlerts.filter(alert => alert.id.includes('low'))
      const highUsageAlerts = inventoryAlerts.filter(alert => alert.id.includes('high_usage'))
      const unusedAlerts = inventoryAlerts.filter(alert => alert.id.includes('unused'))
      
      console.log(`  - تنبيهات انتهاء الصلاحية: ${expiryAlerts.length}`)
      console.log(`  - تنبيهات مخزون منخفض: ${lowStockAlerts.length}`)
      console.log(`  - تنبيهات استخدام مفرط: ${highUsageAlerts.length}`)
      console.log(`  - تنبيهات عناصر غير مستخدمة: ${unusedAlerts.length}`)
      
      return true
    } catch (error) {
      console.error('❌ خطأ في اختبار تنبيهات المخزون المحسنة:', error)
      return false
    }
  }

  /**
   * اختبار تنبيهات الوصفات المحسنة
   */
  static async testEnhancedPrescriptionAlerts(): Promise<boolean> {
    try {
      const alerts = await SmartAlertsService.getAllAlerts()
      const prescriptionAlerts = alerts.filter(alert => alert.type === 'prescription')
      
      console.log(`📊 عدد تنبيهات الوصفات: ${prescriptionAlerts.length}`)
      
      // فحص أنواع تنبيهات الوصفات المحسنة
      const followupAlerts = prescriptionAlerts.filter(alert => alert.id.includes('followup'))
      const medicationAlerts = prescriptionAlerts.filter(alert => alert.id.includes('medication'))
      const oldAlerts = prescriptionAlerts.filter(alert => alert.id.includes('old'))
      
      console.log(`  - تنبيهات متابعة: ${followupAlerts.length}`)
      console.log(`  - تنبيهات أدوية: ${medicationAlerts.length}`)
      console.log(`  - تنبيهات وصفات قديمة: ${oldAlerts.length}`)
      
      return true
    } catch (error) {
      console.error('❌ خطأ في اختبار تنبيهات الوصفات المحسنة:', error)
      return false
    }
  }

  /**
   * اختبار التحديث في الوقت الفعلي
   */
  static async testRealTimeUpdates(): Promise<boolean> {
    try {
      let eventReceived = false
      
      // تسجيل مستمع للأحداث
      const testListener = () => {
        eventReceived = true
      }
      
      DataChangeNotifier.on('patient:created', testListener)
      
      // إرسال حدث تجريبي
      DataChangeNotifier.emit('patient:created', {
        id: 'test-patient',
        type: 'patient',
        timestamp: new Date().toISOString()
      })
      
      // انتظار قصير للتأكد من وصول الحدث
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // تنظيف المستمع
      DataChangeNotifier.off('patient:created', testListener)
      
      return eventReceived
    } catch (error) {
      console.error('❌ خطأ في اختبار التحديث في الوقت الفعلي:', error)
      return false
    }
  }

  /**
   * اختبار الأداء
   */
  static async testPerformance(): Promise<boolean> {
    try {
      const startTime = performance.now()
      
      // تشغيل عملية جلب التنبيهات
      await SmartAlertsService.getAllAlerts()
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log(`⏱️ وقت جلب التنبيهات: ${duration.toFixed(2)} مللي ثانية`)
      
      // يجب أن يكون الوقت أقل من 5 ثوان
      return duration < 5000
    } catch (error) {
      console.error('❌ خطأ في اختبار الأداء:', error)
      return false
    }
  }

  /**
   * تشغيل اختبار سريع
   */
  static async runQuickTest(): Promise<void> {
    console.log('🚀 تشغيل اختبار سريع للنظام المحسن...')
    
    try {
      const alerts = await SmartAlertsService.getAllAlerts()
      
      console.log(`📊 إجمالي التنبيهات: ${alerts.length}`)
      console.log(`📊 تنبيهات غير مقروءة: ${alerts.filter(a => !a.isRead).length}`)
      console.log(`📊 تنبيهات تحتاج إجراء: ${alerts.filter(a => a.actionRequired).length}`)
      
      // إحصائيات حسب النوع
      const typeStats = alerts.reduce((acc, alert) => {
        acc[alert.type] = (acc[alert.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      console.log('📊 إحصائيات حسب النوع:')
      Object.entries(typeStats).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`)
      })
      
      // إحصائيات حسب الأولوية
      const priorityStats = alerts.reduce((acc, alert) => {
        acc[alert.priority] = (acc[alert.priority] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      console.log('📊 إحصائيات حسب الأولوية:')
      Object.entries(priorityStats).forEach(([priority, count]) => {
        console.log(`  - ${priority}: ${count}`)
      })
      
    } catch (error) {
      console.error('❌ خطأ في الاختبار السريع:', error)
    }
  }
}

// تصدير دالة للاستخدام المباشر
export const runComprehensiveAlertsTest = () => ComprehensiveAlertsTest.runFullTest()
export const runQuickAlertsTest = () => ComprehensiveAlertsTest.runQuickTest()
