/**
 * تشغيل جميع اختبارات التحقق والصحة
 * Run all validation and health tests
 */

import StartupPerformanceTest from './comprehensive-performance-test';
import DatabaseQueriesTest from './database-queries-test';
import SystemConsistencyTest from './system-consistency-test';

// تقرير النتائج الشامل
export class ValidationTestRunner {
  private static instance: ValidationTestRunner;

  static getInstance(): ValidationTestRunner {
    if (!ValidationTestRunner.instance) {
      ValidationTestRunner.instance = new ValidationTestRunner();
    }
    return ValidationTestRunner.instance;
  }

  /**
   * تشغيل جميع اختبارات التحقق
   * Run all validation tests
   */
  async runAllValidationTests(): Promise<{
    success: boolean;
    results: {
      startupPerformance: any;
      databaseQueries: any;
      systemConsistency: any;
      overall: {
        totalTests: number;
        passedTests: number;
        failedTests: number;
        successRate: number;
      };
    };
    summary: string;
    recommendations: string[];
  }> {
    console.log('🚀 Starting comprehensive validation tests...');
    console.log('=' .repeat(60));

    const results = {
      startupPerformance: null as any,
      databaseQueries: null as any,
      systemConsistency: null as any,
      overall: null as any
    };

    let passedTests = 0;
    let totalTests = 0;

    // Initialize overall results
    results.overall = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      successRate: 0
    };

    try {
      // اختبار أداء بدء التشغيل
      console.log('\n📊 1. Startup Performance Tests');
      console.log('-'.repeat(40));
      const startupTester = StartupPerformanceTest.getInstance();
      const startupResults = await startupTester.runAllTests();
      results.startupPerformance = startupResults;

      if (startupResults.success) passedTests++;
      totalTests++;

      // اختبار استعلامات قاعدة البيانات
      console.log('\n📊 2. Database Queries Tests');
      console.log('-'.repeat(40));
      const dbTester = DatabaseQueriesTest.getInstance();
      const dbResults = await dbTester.runAllTests();
      results.databaseQueries = dbResults;

      if (dbResults.success) passedTests++;
      totalTests++;

      // اختبار التناسق العام
      console.log('\n📊 3. System Consistency Tests');
      console.log('-'.repeat(40));
      const consistencyTester = SystemConsistencyTest.getInstance();
      const consistencyResults = await consistencyTester.runAllTests();
      results.systemConsistency = consistencyResults;

      if (consistencyResults.success) passedTests++;
      totalTests++;

    } catch (error) {
      console.error('❌ Error running validation tests:', error);
    }

    // حساب النتائج الإجمالية
    const overall = {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
    };

    // تحديد النتيجة النهائية
    const allPassed = overall.passedTests === overall.totalTests;

    // إنشاء الملخص
    let summary = '';
    if (allPassed) {
      summary = `🎉 تم اجتياز جميع الاختبارات بنجاح! (${overall.passedTests}/${overall.totalTests})`;
    } else {
      summary = `⚠️ بعض الاختبارات فشلت. ${overall.passedTests}/${overall.totalTests} نجحت (${overall.successRate}%)`;
    }

    // التوصيات
    const recommendations = this.generateRecommendations(results);

    // عرض النتائج النهائية
    this.displayFinalResults(results, overall);

    console.log('\n' + '='.repeat(60));
    console.log('📋 FINAL SUMMARY');
    console.log('='.repeat(60));
    console.log(summary);
    console.log(`\n📊 معدل النجاح: ${overall.successRate}%`);
    console.log(`✅ الاختبارات الناجحة: ${overall.passedTests}`);
    console.log(`❌ الاختبارات الفاشلة: ${overall.failedTests}`);

    if (recommendations.length > 0) {
      console.log('\n💡 التوصيات:');
      recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }

    return {
      success: allPassed,
      results: {
        ...results,
        overall
      },
      summary,
      recommendations
    };
  }

  /**
   * إنشاء التوصيات بناءً على النتائج
   * Generate recommendations based on results
   */
  private generateRecommendations(results: any): string[] {
    const recommendations: string[] = [];

    if (!results.startupPerformance?.success) {
      recommendations.push('فحص تحسينات أداء بدء التشغيل - قد تحتاج إلى مراجعة Lazy Loading');
    }

    if (!results.databaseQueries?.success) {
      recommendations.push('فحص استعلامات قاعدة البيانات - قد تحتاج إلى تحسين الفهارس أو الاستعلامات');
    }

    if (!results.systemConsistency?.success) {
      recommendations.push('فحص تناسق النظام - تحقق من CSS ومتغيرات الثيم');
    }

    if (recommendations.length === 0) {
      recommendations.push('جميع التحسينات تعمل بشكل صحيح ✅');
    }

    return recommendations;
  }

  /**
   * عرض النتائج النهائية
   * Display final results
   */
  private displayFinalResults(results: any, overall: any): void {
    console.log('\n📊 DETAILED RESULTS');
    console.log('='.repeat(60));

    // نتائج اختبار أداء بدء التشغيل
    if (results.startupPerformance) {
      console.log('\n📈 Startup Performance:');
      console.log(`  Status: ${results.startupPerformance.success ? '✅ PASS' : '❌ FAIL'}`);
      if (results.startupPerformance.results) {
        Object.entries(results.startupPerformance.results).forEach(([test, passed]) => {
          console.log(`    - ${test}: ${passed ? '✅' : '❌'}`);
        });
      }
    }

    // نتائج اختبار استعلامات قاعدة البيانات
    if (results.databaseQueries) {
      console.log('\n🗄️ Database Queries:');
      console.log(`  Status: ${results.databaseQueries.success ? '✅ PASS' : '❌ FAIL'}`);
      if (results.databaseQueries.results) {
        Object.entries(results.databaseQueries.results).forEach(([test, passed]) => {
          console.log(`    - ${test}: ${passed ? '✅' : '❌'}`);
        });
      }
    }

    // نتائج اختبار التناسق العام
    if (results.systemConsistency) {
      console.log('\n🔧 System Consistency:');
      console.log(`  Status: ${results.systemConsistency.success ? '✅ PASS' : '❌ FAIL'}`);
      if (results.systemConsistency.results) {
        Object.entries(results.systemConsistency.results).forEach(([test, passed]) => {
          console.log(`    - ${test}: ${passed ? '✅' : '❌'}`);
        });
      }
    }

    console.log('\n📊 OVERALL SCORE:');
    console.log(`  ${overall.passedTests}/${overall.totalTests} tests passed (${overall.successRate}%)`);
  }
}

// تشغيل الاختبارات التلقائي
export async function runValidationTests(): Promise<void> {
  try {
    console.log('🧪 DentaDesk - Comprehensive Validation Tests');
    console.log('=' .repeat(60));
    console.log('هذا الاختبار الشامل يتحقق من:');
    console.log('✅ أداء بدء التشغيل والتحميل الكسول');
    console.log('✅ صحة استعلامات قاعدة البيانات');
    console.log('✅ تناسق النظام والثيم');
    console.log('✅ عدم وجود أخطاء في الكود');
    console.log('✅ عمل جميع الوظائف الأساسية');
    console.log('=' .repeat(60));

    const runner = ValidationTestRunner.getInstance();
    const results = await runner.runAllValidationTests();

    console.log('\n' + results.summary);

    if (results.success) {
      console.log('\n🎉 جميع التحسينات تم تطبيقها بنجاح وتعمل بشكل صحيح!');
      console.log('✅ يمكنك الآن تشغيل التطبيق بدون مخاوف من الأخطاء');
    } else {
      console.log('\n⚠️ يرجى مراجعة النتائج أعلاه وإصلاح المشاكل المحددة');
      console.log('💡 يمكنك إعادة تشغيل الاختبارات بعد الإصلاحات');
    }

  } catch (error) {
    console.error('❌ Error running validation tests:', error);
    console.log('\n⚠️ فشل في تشغيل اختبارات التحقق');
    console.log('يرجى التأكد من أن جميع الملفات المطلوبة موجودة وصحيحة');
  }
}

// تشغيل تلقائي عند الاستيراد
if (typeof window !== 'undefined') {
  // انتظار تحميل الصفحة بالكامل
  window.addEventListener('load', () => {
    setTimeout(() => {
      console.log('\n🚀 Auto-running validation tests...');
      runValidationTests();
    }, 2000); // انتظار ثانيتين بعد التحميل
  });
}

export default ValidationTestRunner;