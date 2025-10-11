// Benchmark Runner Script
// Executes comprehensive performance benchmarks and collects results

import { ComprehensivePerformanceBenchmarks } from './comprehensive-performance-benchmarks'

async function runBenchmarks(): Promise<void> {
  console.log('🚀 بدء تشغيل اختبارات الأداء الشاملة...\n')

  try {
    await ComprehensivePerformanceBenchmarks.runAllBenchmarks()
    console.log('\n✅ تم إنهاء جميع اختبارات الأداء بنجاح!')
  } catch (error) {
    console.error('❌ فشل في تشغيل اختبارات الأداء:', error)
    process.exit(1)
  }
}

// Run benchmarks when executed directly
if (require.main === module) {
  runBenchmarks()
}

export { runBenchmarks }