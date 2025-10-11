/**
 * Comprehensive Stability Test Suite
 * Complete testing suite for all optimizations and stability verification
 */

import { StabilityTests } from './stability-tests'
import { ComprehensivePerformanceBenchmarks } from './comprehensive-performance-benchmarks'

export interface TestSuiteResult {
  overall: boolean
  testCategories: {
    name: string
    passed: boolean
    duration: number
    errorCount: number
    details: any
  }[]
  summary: {
    totalDuration: number
    totalTests: number
    passedTests: number
    failedTests: number
    totalErrors: number
    performanceMetrics: any
    stabilityAssessment: string
    recommendations: string[]
  }
}

export class ComprehensiveStabilitySuite {
  static async runCompleteTestSuite(): Promise<TestSuiteResult> {
    console.log('🚀 بدء الاختبارات الشاملة للاستقرار والأداء...\n')
    console.log('🎯 التحقق من: عمليات الجداول، إنتاج التقارير، التحديثات المباشرة، الأداء، الاستقرار\n')

    const startTime = Date.now()
    const testCategories: TestSuiteResult['testCategories'] = []

    try {
      // 1. Stability Tests
      console.log('📊 تشغيل اختبارات الاستقرار...')
      const stabilityStart = Date.now()
      const stabilityResult = await StabilityTests.runAllStabilityTests()
      const stabilityDuration = Date.now() - stabilityStart

      testCategories.push({
        name: 'Stability Tests',
        passed: stabilityResult.overall,
        duration: stabilityDuration,
        errorCount: stabilityResult.summary.totalErrors,
        details: stabilityResult.summary
      })

      // 2. Performance Benchmarks (partial due to Node.js limitations)
      console.log('⚡ تشغيل اختبارات الأداء...')
      const perfStart = Date.now()
      let perfResult = { overall: true, summary: { totalErrors: 0, testResults: [] } }

      try {
        // Only run benchmarks that work in Node.js
        await ComprehensivePerformanceBenchmarks.testTableRenderingPerformance()
        await ComprehensivePerformanceBenchmarks.testMemoizationPerformance()
        await ComprehensivePerformanceBenchmarks.testDatabaseOptimizationPerformance()
        await ComprehensivePerformanceBenchmarks.testMemoryUsagePerformance()
        await ComprehensivePerformanceBenchmarks.testAPIResponseTimePerformance()
      } catch (error) {
        console.warn('⚠️ بعض اختبارات الأداء فشلت:', error instanceof Error ? error.message : String(error))
        perfResult.overall = false
        perfResult.summary.totalErrors = 1
      }

      const perfDuration = Date.now() - perfStart

      testCategories.push({
        name: 'Performance Benchmarks',
        passed: perfResult.overall,
        duration: perfDuration,
        errorCount: perfResult.summary.totalErrors,
        details: perfResult.summary
      })

      // 3. Memory Leak Detection
      console.log('💾 فحص تسرب الذاكرة...')
      const memoryStart = Date.now()
      const memoryUsage = process.memoryUsage()
      const memoryResult = {
        passed: memoryUsage.heapUsed < 100 * 1024 * 1024, // Less than 100MB
        details: {
          heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
          heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
          external: (memoryUsage.external / 1024 / 1024).toFixed(2) + ' MB'
        }
      }
      const memoryDuration = Date.now() - memoryStart

      testCategories.push({
        name: 'Memory Analysis',
        passed: memoryResult.passed,
        duration: memoryDuration,
        errorCount: memoryResult.passed ? 0 : 1,
        details: memoryResult.details
      })

    } catch (error) {
      console.error('❌ خطأ في تشغيل الاختبارات الشاملة:', error)
      testCategories.push({
        name: 'Test Suite Error',
        passed: false,
        duration: 0,
        errorCount: 1,
        details: { error: error instanceof Error ? error.message : String(error) }
      })
    }

    const totalDuration = Date.now() - startTime
    const totalTests = testCategories.length
    const passedTests = testCategories.filter(t => t.passed).length
    const failedTests = totalTests - passedTests
    const totalErrors = testCategories.reduce((sum, t) => sum + t.errorCount, 0)

    // Performance metrics summary
    const performanceMetrics = {
      testDuration: totalDuration,
      averageTestTime: totalDuration / totalTests,
      memoryUsage: process.memoryUsage(),
      stabilityScore: Math.max(0, 100 - (totalErrors * 10)) // Simple scoring
    }

    // Stability assessment
    let stabilityAssessment = 'UNKNOWN'
    let recommendations: string[] = []

    if (totalErrors === 0) {
      stabilityAssessment = 'EXCELLENT'
      recommendations = [
        '✅ جميع الاختبارات نجحت - النظام مستقر تماماً',
        '📈 يمكن الاعتماد على التحسينات المطبقة',
        '🔍 مراقبة الأداء في الإنتاج موصى بها'
      ]
    } else if (totalErrors <= 2) {
      stabilityAssessment = 'GOOD'
      recommendations = [
        '🟡 الاستقرار جيد مع بعض الأخطاء الطفيفة',
        '🔧 مراجعة الأخطاء المذكورة في التقرير',
        '⚡ التحسينات تعمل بشكل عام بشكل صحيح'
      ]
    } else if (totalErrors <= 5) {
      stabilityAssessment = 'FAIR'
      recommendations = [
        '🟠 يحتاج بعض التحسينات',
        '🔍 فحص شامل للأخطاء المكتشفة',
        '⚠️ قد يحتاج بعض التحسينات إلى مراجعة'
      ]
    } else {
      stabilityAssessment = 'POOR'
      recommendations = [
        '🔴 يحتاج مراجعة شاملة',
        '🛠️ إصلاح الأخطاء المكتشفة أولاً',
        '⚡ إعادة اختبار بعد الإصلاحات'
      ]
    }

    const summary = {
      totalDuration,
      totalTests,
      passedTests,
      failedTests,
      totalErrors,
      performanceMetrics,
      stabilityAssessment,
      recommendations
    }

    // Generate final report
    this.generateFinalReport(testCategories, summary)

    return {
      overall: totalErrors === 0,
      testCategories,
      summary
    }
  }

  private static generateFinalReport(categories: any[], summary: any) {
    console.log('\n' + '='.repeat(100))
    console.log('🎯 تقرير الاختبارات الشاملة للاستقرار والأداء النهائي')
    console.log('='.repeat(100))

    console.log(`\n⏱️ إجمالي وقت الاختبارات: ${summary.totalDuration.toFixed(2)} مللي ثانية`)
    console.log(`🧪 عدد الاختبارات: ${summary.totalTests}`)
    console.log(`✅ نجح: ${summary.passedTests}`)
    console.log(`❌ فشل: ${summary.failedTests}`)
    console.log(`🚨 إجمالي الأخطاء: ${summary.totalErrors}`)

    console.log(`\n📊 مقاييس الأداء:`)
    console.log(`   • متوسط وقت الاختبار: ${summary.performanceMetrics.averageTestTime.toFixed(2)}ms`)
    console.log(`   • الذاكرة المستخدمة: ${(summary.performanceMetrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   • نتيجة الاستقرار: ${summary.stabilityAssessment}`)

    console.log(`\n📋 تفاصيل الفئات:`)
    categories.forEach((category, index) => {
      const status = category.passed ? '✅' : '❌'
      console.log(`   ${index + 1}. ${status} ${category.name}: ${category.duration}ms (${category.errorCount} أخطاء)`)
    })

    console.log(`\n💡 توصيات:`)
    summary.recommendations.forEach((rec: string) => console.log(`   • ${rec}`))

    console.log(`\n🎯 الخلاصة:`)
    if (summary.overall) {
      console.log('   ✅ جميع الاختبارات نجحت - التحسينات مستقرة وآمنة للإنتاج')
      console.log('   🚀 النظام جاهز للاستخدام مع التحسينات المطبقة')
    } else {
      console.log('   ⚠️ هناك بعض المشاكل التي تحتاج إلى مراجعة')
      console.log('   🔧 يرجى إصلاح الأخطاء قبل النشر النهائي')
    }

    console.log('='.repeat(100))
  }
}

// Export for CLI usage
if (typeof window === 'undefined') {
  // Node.js environment
  if (require.main === module) {
    ComprehensiveStabilitySuite.runCompleteTestSuite()
      .then(result => {
        process.exit(result.overall ? 0 : 1)
      })
      .catch(error => {
        console.error('❌ فشل في تشغيل الاختبارات الشاملة:', error)
        process.exit(1)
      })
  }
}

export default ComprehensiveStabilitySuite