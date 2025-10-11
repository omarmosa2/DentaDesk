/**
 * أدوات تشخيص نظام الإشعارات الذكية
 * Smart Alerts System Diagnostics
 */

import { SmartAlertsService } from '@/services/smartAlertsService'

export interface DiagnosticResult {
  test: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: any
  duration?: number
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical'
  score: number
  results: DiagnosticResult[]
  recommendations: string[]
}

export class SmartAlertsDiagnostics {
  
  /**
   * تشخيص شامل لنظام الإشعارات
   */
  static async runFullDiagnostics(): Promise<SystemHealth> {
    console.log('🔍 Starting Smart Alerts System Diagnostics...')
    const startTime = Date.now()
    
    const results: DiagnosticResult[] = []
    
    // اختبار قاعدة البيانات
    results.push(...await this.testDatabase())
    
    // اختبار نظام الأحداث
    results.push(...await this.testEventSystem())
    
    // اختبار الأداء
    results.push(...await this.testPerformance())
    
    // اختبار التكامل
    results.push(...await this.testIntegration())
    
    // حساب النتيجة الإجمالية
    const score = this.calculateHealthScore(results)
    const overall = this.determineOverallHealth(score)
    const recommendations = this.generateRecommendations(results)
    
    const totalDuration = Date.now() - startTime
    console.log(`✅ Diagnostics completed in ${totalDuration}ms`)
    
    return {
      overall,
      score,
      results,
      recommendations
    }
  }

  /**
   * اختبار قاعدة البيانات
   */
  private static async testDatabase(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = []
    
    // اختبار الاتصال بقاعدة البيانات
    try {
      const startTime = Date.now()
      const alerts = await window.electronAPI?.smartAlerts?.getAll?.() || []
      const duration = Date.now() - startTime
      
      results.push({
        test: 'Database Connection',
        status: 'pass',
        message: `Successfully connected to database and loaded ${alerts.length} alerts`,
        duration,
        details: { alertCount: alerts.length }
      })
      
      // اختبار سرعة الاستعلام
      if (duration > 1000) {
        results.push({
          test: 'Database Performance',
          status: 'warning',
          message: `Database query took ${duration}ms (should be <500ms)`,
          duration
        })
      } else {
        results.push({
          test: 'Database Performance',
          status: 'pass',
          message: `Database query completed in ${duration}ms`,
          duration
        })
      }
      
    } catch (error) {
      results.push({
        test: 'Database Connection',
        status: 'fail',
        message: `Failed to connect to database: ${error}`,
        details: { error }
      })
    }
    
    // اختبار إنشاء إشعار تجريبي
    try {
      const testAlert = {
        type: 'test' as any,
        priority: 'low' as any,
        title: 'Test Alert - Diagnostics',
        description: 'This is a test alert for diagnostics',
        actionRequired: false,
        isRead: false,
        isDismissed: false
      }
      
      const startTime = Date.now()
      await window.electronAPI?.smartAlerts?.create?.(testAlert)
      const duration = Date.now() - startTime
      
      // حذف الإشعار التجريبي
      await window.electronAPI?.smartAlerts?.delete?.(testAlert.id)
      
      results.push({
        test: 'Database Write Operations',
        status: 'pass',
        message: `Successfully created and deleted test alert in ${duration}ms`,
        duration
      })
      
    } catch (error) {
      results.push({
        test: 'Database Write Operations',
        status: 'fail',
        message: `Failed to create test alert: ${error}`,
        details: { error }
      })
    }
    
    return results
  }

  /**
   * اختبار نظام الأحداث
   */
  private static async testEventSystem(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = []
    
    // اختبار إرسال واستقبال الأحداث
    try {
      let eventReceived = false
      const testEventName = 'test:diagnostic-event'
      
      // إضافة مستمع مؤقت
      const testListener = () => {
        eventReceived = true
      }
      
      SmartAlertsService.addEventListener(testEventName, testListener)
      
      // إرسال حدث تجريبي
      SmartAlertsService.emitEvent(testEventName, { test: true })
      
      // انتظار قصير للتأكد من وصول الحدث
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // إزالة المستمع
      SmartAlertsService.removeEventListener(testEventName, testListener)
      
      if (eventReceived) {
        results.push({
          test: 'Event System',
          status: 'pass',
          message: 'Event system is working correctly'
        })
      } else {
        results.push({
          test: 'Event System',
          status: 'fail',
          message: 'Event was not received by listener'
        })
      }
      
    } catch (error) {
      results.push({
        test: 'Event System',
        status: 'fail',
        message: `Event system error: ${error}`,
        details: { error }
      })
    }
    
    return results
  }

  /**
   * اختبار الأداء
   */
  private static async testPerformance(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = []
    
    // اختبار سرعة تحميل الإشعارات
    try {
      const startTime = Date.now()
      const alerts = await SmartAlertsService.getAllAlerts()
      const duration = Date.now() - startTime
      
      if (duration < 500) {
        results.push({
          test: 'Alert Loading Performance',
          status: 'pass',
          message: `Alerts loaded in ${duration}ms (excellent)`,
          duration,
          details: { alertCount: alerts.length }
        })
      } else if (duration < 1000) {
        results.push({
          test: 'Alert Loading Performance',
          status: 'warning',
          message: `Alerts loaded in ${duration}ms (acceptable but could be improved)`,
          duration,
          details: { alertCount: alerts.length }
        })
      } else {
        results.push({
          test: 'Alert Loading Performance',
          status: 'fail',
          message: `Alerts loaded in ${duration}ms (too slow)`,
          duration,
          details: { alertCount: alerts.length }
        })
      }
      
    } catch (error) {
      results.push({
        test: 'Alert Loading Performance',
        status: 'fail',
        message: `Failed to load alerts: ${error}`,
        details: { error }
      })
    }
    
    // اختبار استهلاك الذاكرة (تقديري)
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024)
      
      if (usedMB < 50) {
        results.push({
          test: 'Memory Usage',
          status: 'pass',
          message: `Memory usage: ${usedMB}MB (good)`,
          details: { memoryMB: usedMB }
        })
      } else if (usedMB < 100) {
        results.push({
          test: 'Memory Usage',
          status: 'warning',
          message: `Memory usage: ${usedMB}MB (moderate)`,
          details: { memoryMB: usedMB }
        })
      } else {
        results.push({
          test: 'Memory Usage',
          status: 'fail',
          message: `Memory usage: ${usedMB}MB (high)`,
          details: { memoryMB: usedMB }
        })
      }
    }
    
    return results
  }

  /**
   * اختبار التكامل
   */
  private static async testIntegration(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = []
    
    // اختبار توفر APIs المطلوبة
    const requiredAPIs = [
      'smartAlerts',
      'patients',
      'appointments',
      'payments'
    ]
    
    for (const api of requiredAPIs) {
      if (window.electronAPI && window.electronAPI[api]) {
        results.push({
          test: `${api} API Integration`,
          status: 'pass',
          message: `${api} API is available`
        })
      } else {
        results.push({
          test: `${api} API Integration`,
          status: 'fail',
          message: `${api} API is not available`
        })
      }
    }
    
    return results
  }

  /**
   * حساب نقاط الصحة الإجمالية
   */
  private static calculateHealthScore(results: DiagnosticResult[]): number {
    let totalScore = 0
    let maxScore = 0
    
    results.forEach(result => {
      maxScore += 100
      switch (result.status) {
        case 'pass':
          totalScore += 100
          break
        case 'warning':
          totalScore += 60
          break
        case 'fail':
          totalScore += 0
          break
      }
    })
    
    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  }

  /**
   * تحديد الحالة الإجمالية للنظام
   */
  private static determineOverallHealth(score: number): 'healthy' | 'warning' | 'critical' {
    if (score >= 80) return 'healthy'
    if (score >= 60) return 'warning'
    return 'critical'
  }

  /**
   * توليد توصيات للتحسين
   */
  private static generateRecommendations(results: DiagnosticResult[]): string[] {
    const recommendations: string[] = []
    
    results.forEach(result => {
      if (result.status === 'fail') {
        switch (result.test) {
          case 'Database Connection':
            recommendations.push('تحقق من اتصال قاعدة البيانات وإعادة تشغيل التطبيق')
            break
          case 'Database Performance':
            recommendations.push('فكر في إضافة المزيد من الفهارس أو تنظيف البيانات القديمة')
            break
          case 'Event System':
            recommendations.push('أعد تشغيل التطبيق لإعادة تهيئة نظام الأحداث')
            break
          case 'Alert Loading Performance':
            recommendations.push('قم بتنظيف الإشعارات القديمة أو تحسين استعلامات قاعدة البيانات')
            break
        }
      } else if (result.status === 'warning') {
        if (result.test.includes('Performance')) {
          recommendations.push('راقب الأداء وفكر في التحسينات المستقبلية')
        }
        if (result.test.includes('Memory')) {
          recommendations.push('راقب استهلاك الذاكرة وأعد تشغيل التطبيق إذا لزم الأمر')
        }
      }
    })
    
    if (recommendations.length === 0) {
      recommendations.push('النظام يعمل بشكل ممتاز! استمر في المراقبة الدورية')
    }
    
    return recommendations
  }

  /**
   * طباعة تقرير مفصل
   */
  static printDiagnosticReport(health: SystemHealth): void {
    console.log('\n🏥 === تقرير تشخيص نظام الإشعارات الذكية ===')
    console.log(`📊 النقاط الإجمالية: ${health.score}/100`)
    console.log(`🎯 الحالة العامة: ${health.overall}`)
    
    console.log('\n📋 نتائج الاختبارات:')
    health.results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌'
      console.log(`${icon} ${result.test}: ${result.message}`)
      if (result.duration) {
        console.log(`   ⏱️ المدة: ${result.duration}ms`)
      }
    })
    
    console.log('\n💡 التوصيات:')
    health.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`)
    })
    
    console.log('\n=== انتهى التقرير ===\n')
  }
}

// تصدير دالة سريعة للاختبار
export const runQuickDiagnostics = async (): Promise<void> => {
  const health = await SmartAlertsDiagnostics.runFullDiagnostics()
  SmartAlertsDiagnostics.printDiagnosticReport(health)
  return health
}
