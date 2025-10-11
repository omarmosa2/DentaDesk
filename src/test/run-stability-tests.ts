// Stability Tests Runner Script
// Executes comprehensive stability tests for optimized areas

import { StabilityTests } from './stability-tests'

async function runStabilityTests(): Promise<void> {
  console.log('🧪 بدء تشغيل اختبارات الاستقرار الشاملة...\n')

  try {
    const result = await StabilityTests.runAllStabilityTests()
    console.log('\n✅ تم إنهاء جميع اختبارات الاستقرار بنجاح!')

    // Exit with appropriate code
    process.exit(result.overall ? 0 : 1)

  } catch (error) {
    console.error('❌ فشل في تشغيل اختبارات الاستقرار:', error)
    process.exit(1)
  }
}

// Run tests when executed directly
if (require.main === module) {
  runStabilityTests()
}

export { runStabilityTests }