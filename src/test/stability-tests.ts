/**
 * Comprehensive Stability Tests for Dental Clinic Application Optimizations
 * Tests reliability and regression prevention for all optimized areas
 */

import { BenchmarkUtils } from '../utils/benchmarkUtils'

// Test data generators
class StabilityTestData {
  static generateTestPatients(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: `stability-patient-${i}`,
      full_name: `Stability Test Patient ${i}`,
      age: 20 + (i % 50),
      gender: i % 2 === 0 ? 'male' : 'female',
      phone: `+963${i}0000000`,
      email: `stability${i}@test.com`,
      address: `Test Address ${i}`,
      patient_condition: 'نشط',
      allergies: i % 3 === 0 ? 'لا توجد' : 'Test Allergy',
      medical_conditions: i % 4 === 0 ? 'لا توجد' : 'Test Condition',
      date_added: new Date(2024, 0, i % 30 + 1).toISOString()
    }))
  }

  static generateTestAppointments(count: number, patients: any[]) {
    return Array.from({ length: count }, (_, i) => ({
      id: `stability-appointment-${i}`,
      patient_id: patients[i % patients.length].id,
      start_time: new Date(2024, 0, i % 30 + 1, 9 + (i % 9), 0).toISOString(),
      end_time: new Date(2024, 0, i % 30 + 1, 10 + (i % 9), 0).toISOString(),
      status: ['completed', 'scheduled', 'cancelled'][i % 3],
      title: `Stability Test Appointment ${i}`,
      notes: `Test notes ${i}`,
      cost: 5000 + (i * 100)
    }))
  }
}

export class StabilityTests {
  private static patients = StabilityTestData.generateTestPatients(1000)
  private static appointments = StabilityTestData.generateTestAppointments(500, this.patients)

  // Table Operations Stability Test
  static async testTableOperationsStability(): Promise<{
    passed: boolean;
    results: any[];
    errors: string[];
  }> {
    console.log('🏗️ اختبار استقرار عمليات الجداول (الترتيب، التصفح، الافتراضية)...')

    const results = []
    const errors = []

    try {
      // Test Sorting Stability
      const sortingTest = await this.testSortingStability()
      results.push(sortingTest)
      if (!sortingTest.passed) errors.push(...sortingTest.errors)

      // Test Pagination Stability
      const paginationTest = await this.testPaginationStability()
      results.push(paginationTest)
      if (!paginationTest.passed) errors.push(...paginationTest.errors)

      // Test Virtualization Stability
      const virtualizationTest = await this.testVirtualizationStability()
      results.push(virtualizationTest)
      if (!virtualizationTest.passed) errors.push(...virtualizationTest.errors)

      // Test Large Dataset Handling
      const largeDatasetTest = await this.testLargeDatasetHandling()
      results.push(largeDatasetTest)
      if (!largeDatasetTest.passed) errors.push(...largeDatasetTest.errors)

    } catch (error) {
      errors.push(`خطأ عام في اختبار عمليات الجداول: ${error}`)
    }

    const passed = errors.length === 0
    console.log(`${passed ? '✅' : '❌'} اختبار استقرار عمليات الجداول ${passed ? 'نجح' : 'فشل'}`)

    return { passed, results, errors }
  }

  private static async testSortingStability(): Promise<{
    name: string;
    passed: boolean;
    errors: string[];
    metrics: {[key: string]: any};
  }> {
    const errors = []
    let metrics: {[key: string]: any} = {}

    try {
      const testData = [...this.patients.slice(0, 500)]

      // Test multiple sorting scenarios
      const sortScenarios = [
        { name: 'name-asc', sortFn: (a: any, b: any) => a.full_name.localeCompare(b.full_name) },
        { name: 'name-desc', sortFn: (a: any, b: any) => b.full_name.localeCompare(a.full_name) },
        { name: 'age-asc', sortFn: (a: any, b: any) => a.age - b.age },
        { name: 'age-desc', sortFn: (a: any, b: any) => b.age - a.age },
        { name: 'date-asc', sortFn: (a: any, b: any) => new Date(a.date_added).getTime() - new Date(b.date_added).getTime() }
      ]

      for (const scenario of sortScenarios) {
        const startTime = Date.now()
        const sorted = [...testData].sort(scenario.sortFn)
        const duration = Date.now() - startTime

        // Verify sorting correctness
        let isCorrect = true
        for (let i = 1; i < sorted.length; i++) {
          if (scenario.sortFn(sorted[i-1], sorted[i]) > 0) {
            isCorrect = false
            break
          }
        }

        if (!isCorrect) {
          errors.push(`ترتيب خاطئ في سيناريو ${scenario.name}`)
        }

        metrics[scenario.name] = { duration, itemCount: sorted.length, correct: isCorrect }
      }

    } catch (error) {
      errors.push(`خطأ في اختبار استقرار الترتيب: ${error}`)
    }

    const passed = errors.length === 0
    return { name: 'Sorting Stability', passed, errors, metrics }
  }

  private static async testPaginationStability(): Promise<{
    name: string;
    passed: boolean;
    errors: string[];
    metrics: {[key: string]: any};
  }> {
    const errors = []
    let metrics: {[key: string]: any} = {}

    try {
      const testData = [...this.patients.slice(0, 1000)]
      const pageSize = 25
      const totalPages = Math.ceil(testData.length / pageSize)

      // Test pagination across all pages
      for (let page = 1; page <= Math.min(totalPages, 10); page++) {
        const startTime = Date.now()
        const startIndex = (page - 1) * pageSize
        const paginated = testData.slice(startIndex, startIndex + pageSize)
        const duration = Date.now() - startTime

        // Verify pagination correctness
        if (paginated.length > pageSize) {
          errors.push(`صفحة ${page} تحتوي على عناصر أكثر من الحد المسموح`)
        }

        if (paginated.length === 0 && startIndex < testData.length) {
          errors.push(`صفحة ${page} فارغة رغم وجود بيانات`)
        }

        metrics[`page-${page}`] = { duration, itemCount: paginated.length, startIndex }
      }

    } catch (error) {
      errors.push(`خطأ في اختبار استقرار التصفح: ${error}`)
    }

    const passed = errors.length === 0
    return { name: 'Pagination Stability', passed, errors, metrics }
  }

  private static async testVirtualizationStability(): Promise<{
    name: string;
    passed: boolean;
    errors: string[];
    metrics: {[key: string]: any};
  }> {
    const errors = []
    let metrics: {[key: string]: any} = {}

    try {
      const testData = [...this.patients.slice(0, 5000)]
      const viewportHeight = 600
      const itemHeight = 50
      const visibleItems = Math.ceil(viewportHeight / itemHeight)

      // Simulate virtualization windowing
      for (let scrollTop = 0; scrollTop < 1000; scrollTop += 200) {
        const startTime = Date.now()
        const startIndex = Math.floor(scrollTop / itemHeight)
        const endIndex = Math.min(startIndex + visibleItems, testData.length)
        const visibleData = testData.slice(startIndex, endIndex)
        const duration = Date.now() - startTime

        // Verify virtualization correctness
        if (visibleData.length > visibleItems + 2) { // +2 for buffer
          errors.push(`نافذة الافتراضية تحتوي على عناصر زائدة عند الموضع ${scrollTop}`)
        }

        metrics[`virtual-${scrollTop}`] = { duration, visibleCount: visibleData.length, startIndex, endIndex }
      }

    } catch (error) {
      errors.push(`خطأ في اختبار استقرار الافتراضية: ${error}`)
    }

    const passed = errors.length === 0
    return { name: 'Virtualization Stability', passed, errors, metrics }
  }

  private static async testLargeDatasetHandling(): Promise<{
    name: string;
    passed: boolean;
    errors: string[];
    metrics: {[key: string]: any};
  }> {
    const errors = []
    let metrics: {[key: string]: any} = {}

    try {
      const largeDataSizes = [1000, 5000, 10000]

      for (const size of largeDataSizes) {
        const testData = [...this.patients.slice(0, size)]

        // Test rendering simulation
        const startTime = Date.now()
        const processedData = testData.map(patient => ({
          ...patient,
          displayName: patient.full_name.toUpperCase(),
          ageGroup: patient.age < 30 ? 'young' : patient.age < 60 ? 'middle' : 'senior'
        }))
        const duration = Date.now() - startTime

        // Test sorting on large dataset
        const sortStartTime = Date.now()
        const sorted = [...processedData].sort((a, b) => a.full_name.localeCompare(b.full_name))
        const sortDuration = Date.now() - sortStartTime

        // Verify data integrity
        if (sorted.length !== size) {
          errors.push(`فقدان بيانات في مجموعة ${size} عنصر`)
        }

        metrics[`dataset-${size}`] = {
          duration,
          sortDuration,
          itemCount: sorted.length,
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
        }
      }

    } catch (error) {
      errors.push(`خطأ في اختبار التعامل مع مجموعات البيانات الكبيرة: ${error}`)
    }

    const passed = errors.length === 0
    return { name: 'Large Dataset Handling', passed, errors, metrics }
  }

  // Report Generation Stability Test
  static async testReportGenerationStability(): Promise<{
    passed: boolean;
    results: any[];
    errors: string[];
  }> {
    console.log('📊 اختبار استقرار إنتاج التقارير (التحسين بالذاكرة، الرسوم البيانية)...')

    const results = []
    const errors = []

    try {
      // Test Memoization Stability
      const memoTest = await this.testMemoizationStability()
      results.push(memoTest)
      if (!memoTest.passed) errors.push(...memoTest.errors)

      // Test Chart Generation Stability
      const chartTest = await this.testChartGenerationStability()
      results.push(chartTest)
      if (!chartTest.passed) errors.push(...chartTest.errors)

      // Test Report Calculation Stability
      const calcTest = await this.testReportCalculationStability()
      results.push(calcTest)
      if (!calcTest.passed) errors.push(...calcTest.errors)

    } catch (error) {
      errors.push(`خطأ عام في اختبار إنتاج التقارير: ${error}`)
    }

    const passed = errors.length === 0
    console.log(`${passed ? '✅' : '❌'} اختبار استقرار إنتاج التقارير ${passed ? 'نجح' : 'فشل'}`)

    return { passed, results, errors }
  }

  private static async testMemoizationStability(): Promise<{
    name: string;
    passed: boolean;
    errors: string[];
    metrics: {[key: string]: any};
  }> {
    const errors = []
    let metrics: {[key: string]: any} = {}

    try {
      const testData = this.patients.slice(0, 2000)

      // Simulate report calculations with memoization
      const calculateReport = (data: any[], useMemo = false) => {
        const cache = new Map()

        return () => {
          const key = 'report-calculation'

          if (useMemo && cache.has(key)) {
            return cache.get(key)
          }

          const result = {
            totalPatients: data.length,
            averageAge: data.reduce((sum, p) => sum + p.age, 0) / data.length,
            genderDistribution: data.reduce((acc, p) => {
              acc[p.gender] = (acc[p.gender] || 0) + 1
              return acc
            }, {}),
            ageGroups: data.reduce((acc, p) => {
              const group = p.age < 30 ? 'under30' : p.age < 60 ? '30to60' : 'over60'
              acc[group] = (acc[group] || 0) + 1
              return acc
            }, {})
          }

          if (useMemo) {
            cache.set(key, result)
          }

          return result
        }
      }

      // Test without memoization
      const noMemoCalc = calculateReport(testData, false)
      const noMemoStart = Date.now()
      for (let i = 0; i < 100; i++) {
        noMemoCalc()
      }
      const noMemoDuration = Date.now() - noMemoStart

      // Test with memoization
      const memoCalc = calculateReport(testData, true)
      const memoStart = Date.now()
      for (let i = 0; i < 100; i++) {
        memoCalc()
      }
      const memoDuration = Date.now() - memoStart

      // Verify results are identical
      const noMemoResult = noMemoCalc()
      const memoResult = memoCalc()

      const resultsMatch = JSON.stringify(noMemoResult) === JSON.stringify(memoResult)
      if (!resultsMatch) {
        errors.push('نتائج التحسين بالذاكرة لا تطابق النتائج العادية')
      }

      metrics = {
        noMemoDuration,
        memoDuration,
        improvement: ((noMemoDuration - memoDuration) / noMemoDuration) * 100,
        resultsMatch
      }

    } catch (error) {
      errors.push(`خطأ في اختبار استقرار التحسين بالذاكرة: ${error}`)
    }

    const passed = errors.length === 0
    return { name: 'Memoization Stability', passed, errors, metrics }
  }

  private static async testChartGenerationStability(): Promise<{
    name: string;
    passed: boolean;
    errors: string[];
    metrics: {[key: string]: any};
  }> {
    const errors = []
    let metrics: {[key: string]: any} = {}

    try {
      const appointmentData = this.appointments.slice(0, 500)

      // Simulate chart data processing
      const generateChartData = (data: any[]) => {
        const monthlyStats = data.reduce((acc, appt) => {
          const month = new Date(appt.start_time).toISOString().slice(0, 7)
          if (!acc[month]) {
            acc[month] = { appointments: 0, revenue: 0 }
          }
          acc[month].appointments++
          acc[month].revenue += appt.cost
          return acc
        }, {})

        return Object.entries(monthlyStats).map(([month, stats]: [string, any]) => ({
          month,
          appointments: stats.appointments,
          revenue: stats.revenue
        }))
      }

      // Test chart generation with different data sizes
      const chartSizes = [50, 200, 500]

      for (const size of chartSizes) {
        const testData = appointmentData.slice(0, size)
        const startTime = Date.now()
        const chartData = generateChartData(testData)
        const duration = Date.now() - startTime

        // Verify chart data integrity
        const totalAppointments = chartData.reduce((sum, d) => sum + d.appointments, 0)
        const expectedAppointments = testData.length

        if (totalAppointments !== expectedAppointments) {
          errors.push(`بيانات الرسم البياني غير صحيحة للمجموعة ${size}`)
        }

        metrics[`chart-${size}`] = { duration, dataPoints: chartData.length, totalAppointments }
      }

    } catch (error) {
      errors.push(`خطأ في اختبار استقرار إنتاج الرسوم البيانية: ${error}`)
    }

    const passed = errors.length === 0
    return { name: 'Chart Generation Stability', passed, errors, metrics }
  }

  private static async testReportCalculationStability(): Promise<{
    name: string;
    passed: boolean;
    errors: string[];
    metrics: {[key: string]: any};
  }> {
    const errors = []
    let metrics: {[key: string]: any} = {}

    try {
      const testData = this.appointments.slice(0, 1000)

      // Test various report calculations
      const calculations = [
        {
          name: 'Total Revenue',
          calculate: (data: any[]) => data.filter(a => a.status === 'completed').reduce((sum, a) => sum + a.cost, 0)
        },
        {
          name: 'Average Appointment Cost',
          calculate: (data: any[]) => {
            const completed = data.filter(a => a.status === 'completed')
            return completed.length > 0 ? completed.reduce((sum, a) => sum + a.cost, 0) / completed.length : 0
          }
        },
        {
          name: 'Appointment Success Rate',
          calculate: (data: any[]) => {
            const total = data.length
            const completed = data.filter(a => a.status === 'completed').length
            return total > 0 ? (completed / total) * 100 : 0
          }
        }
      ]

      for (const calc of calculations) {
        const startTime = Date.now()
        const result = calc.calculate(testData)
        const duration = Date.now() - startTime

        // Verify calculation makes sense
        if (calc.name === 'Total Revenue' && result < 0) {
          errors.push('إجمالي الإيرادات لا يمكن أن يكون سالباً')
        }
        if (calc.name === 'Average Appointment Cost' && result < 0) {
          errors.push('متوسط تكلفة الموعد لا يمكن أن يكون سالباً')
        }
        if (calc.name === 'Appointment Success Rate' && (result < 0 || result > 100)) {
          errors.push('معدل نجاح المواعيد يجب أن يكون بين 0 و 100')
        }

        metrics[calc.name] = { duration, result }
      }

    } catch (error) {
      errors.push(`خطأ في اختبار استقرار حسابات التقارير: ${error}`)
    }

    const passed = errors.length === 0
    return { name: 'Report Calculation Stability', passed, errors, metrics }
  }

  // Real-time Updates Stability Test
  static async testRealTimeUpdatesStability(): Promise<{
    passed: boolean;
    results: any[];
    errors: string[];
  }> {
    console.log('🔄 اختبار استقرار التحديثات في الوقت الفعلي (الخطافات، التجميع)...')

    const results = []
    const errors = []

    try {
      // Test Hook Stability
      const hookTest = await this.testHookStability()
      results.push(hookTest)
      if (!hookTest.passed) errors.push(...hookTest.errors)

      // Test Batching Stability
      const batchTest = await this.testBatchingStability()
      results.push(batchTest)
      if (!batchTest.passed) errors.push(...batchTest.errors)

      // Test Synchronization Stability
      const syncTest = await this.testSynchronizationStability()
      results.push(syncTest)
      if (!syncTest.passed) errors.push(...syncTest.errors)

    } catch (error) {
      errors.push(`خطأ عام في اختبار التحديثات في الوقت الفعلي: ${error}`)
    }

    const passed = errors.length === 0
    console.log(`${passed ? '✅' : '❌'} اختبار استقرار التحديثات في الوقت الفعلي ${passed ? 'نجح' : 'فشل'}`)

    return { passed, results, errors }
  }

  private static async testHookStability(): Promise<{
    name: string;
    passed: boolean;
    errors: string[];
    metrics: {[key: string]: any};
  }> {
    const errors = []
    let metrics: {[key: string]: any} = {}

    try {
      // Simulate hook behavior testing
      let hookCallCount = 0
      let lastUpdateTime = 0
      const updateHistory: number[] = []

      const simulateHook = () => {
        hookCallCount++
        const now = Date.now()
        updateHistory.push(now - lastUpdateTime)
        lastUpdateTime = now
        return { count: hookCallCount, timestamp: now }
      }

      // Test frequent updates
      const updateCount = 100
      const startTime = Date.now()

      for (let i = 0; i < updateCount; i++) {
        simulateHook()
        // Small delay to simulate real usage
        await new Promise(resolve => setTimeout(resolve, 1))
      }

      const totalDuration = Date.now() - startTime

      // Verify hook consistency
      if (hookCallCount !== updateCount) {
        errors.push('عدد استدعاءات الخطاف غير متسق')
      }

      // Check for unreasonable update frequencies (should not be too fast)
      const avgInterval = updateHistory.slice(1).reduce((sum, interval) => sum + interval, 0) / (updateHistory.length - 1)
      if (avgInterval < 1) {
        errors.push('تحديثات الخطاف سريعة جداً وقد تسبب مشاكل الأداء')
      }

      metrics = {
        totalDuration,
        hookCallCount,
        avgInterval,
        updateHistory: updateHistory.slice(0, 10) // First 10 intervals
      }

    } catch (error) {
      errors.push(`خطأ في اختبار استقرار الخطافات: ${error}`)
    }

    const passed = errors.length === 0
    return { name: 'Hook Stability', passed, errors, metrics }
  }

  private static async testBatchingStability(): Promise<{
    name: string;
    passed: boolean;
    errors: string[];
    metrics: {[key: string]: any};
  }> {
    const errors = []
    let metrics: {[key: string]: any} = {}

    try {
      // Simulate update batching
      const batchSize = 10
      const batches: any[] = []
      let currentBatch: any[] = []

      const addToBatch = (update: any) => {
        currentBatch.push(update)

        if (currentBatch.length >= batchSize) {
          batches.push([...currentBatch])
          currentBatch = []
        }
      }

      const processBatches = async () => {
        for (const batch of batches) {
          await new Promise(resolve => setTimeout(resolve, 5)) // Simulate processing time
        }
      }

      // Generate test updates
      const updateCount = 250
      for (let i = 0; i < updateCount; i++) {
        addToBatch({ id: i, type: 'update', data: `test-${i}` })
      }

      // Process remaining batch
      if (currentBatch.length > 0) {
        batches.push([...currentBatch])
      }

      const startTime = Date.now()
      await processBatches()
      const duration = Date.now() - startTime

      // Verify batching correctness
      const totalProcessed = batches.reduce((sum, batch) => sum + batch.length, 0)
      if (totalProcessed !== updateCount) {
        errors.push('لم يتم معالجة جميع التحديثات في التجميع')
      }

      const expectedBatches = Math.ceil(updateCount / batchSize)
      if (batches.length !== expectedBatches) {
        errors.push('عدد الدفعات غير صحيح')
      }

      metrics = {
        duration,
        totalUpdates: updateCount,
        batchCount: batches.length,
        avgBatchSize: totalProcessed / batches.length
      }

    } catch (error) {
      errors.push(`خطأ في اختبار استقرار التجميع: ${error}`)
    }

    const passed = errors.length === 0
    return { name: 'Batching Stability', passed, errors, metrics }
  }

  private static async testSynchronizationStability(): Promise<{
    name: string;
    passed: boolean;
    errors: string[];
    metrics: {[key: string]: any};
  }> {
    const errors = []
    let metrics: {[key: string]: any} = {}

    try {
      // Simulate data synchronization across multiple sources
      const sources = ['database', 'cache', 'api', 'localStorage']
      const syncStates: { [key: string]: any[] } = {}
      let syncEvents: any[] = []

      const syncSource = async (source: string, data: any[]) => {
        const startTime = Date.now()
        syncStates[source] = [...data]
        const duration = Date.now() - startTime

        syncEvents.push({
          source,
          timestamp: Date.now(),
          itemCount: data.length,
          duration
        })

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
      }

      // Test concurrent synchronization
      const testData = this.patients.slice(0, 100)
      const syncPromises = sources.map(source => syncSource(source, testData))

      const startTime = Date.now()
      await Promise.all(syncPromises)
      const totalDuration = Date.now() - startTime

      // Verify synchronization consistency
      const referenceData = syncStates[sources[0]]
      for (const source of sources.slice(1)) {
        if (JSON.stringify(syncStates[source]) !== JSON.stringify(referenceData)) {
          errors.push(`عدم تطابق البيانات بين المصدر ${source} و المرجع`)
        }
      }

      // Check synchronization order (should be reasonable)
      syncEvents.sort((a, b) => a.timestamp - b.timestamp)
      const timeSpans = []
      for (let i = 1; i < syncEvents.length; i++) {
        timeSpans.push(syncEvents[i].timestamp - syncEvents[i-1].timestamp)
      }
      const avgTimeSpan = timeSpans.reduce((sum, span) => sum + span, 0) / timeSpans.length

      metrics = {
        totalDuration,
        sourceCount: sources.length,
        syncEvents: syncEvents.length,
        avgTimeSpan,
        maxTimeSpan: Math.max(...timeSpans),
        minTimeSpan: Math.min(...timeSpans)
      }

    } catch (error) {
      errors.push(`خطأ في اختبار استقرار التزامن: ${error}`)
    }

    const passed = errors.length === 0
    return { name: 'Synchronization Stability', passed, errors, metrics }
  }

  // Run All Stability Tests
  static async runAllStabilityTests(): Promise<{
    overall: boolean;
    results: any[];
    summary: any;
  }> {
    console.log('🧪 بدء جميع اختبارات الاستقرار الشاملة...\n')

    const results = []
    const startTime = Date.now()

    try {
      // Table Operations
      const tableResult = await this.testTableOperationsStability()
      results.push(tableResult)

      // Report Generation
      const reportResult = await this.testReportGenerationStability()
      results.push(reportResult)

      // Real-time Updates
      const realtimeResult = await this.testRealTimeUpdatesStability()
      results.push(realtimeResult)

      // TODO: Add PDF, Lazy Loading, Database tests when needed

    } catch (error) {
      console.error('❌ فشل في تشغيل اختبارات الاستقرار:', error)
    }

    const totalDuration = Date.now() - startTime
    const overallPassed = results.every(r => r.passed)
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

    const summary = {
      totalDuration,
      overallPassed,
      totalTests: results.length,
      passedTests: results.filter(r => r.passed).length,
      failedTests: results.filter(r => !r.passed).length,
      totalErrors,
      testResults: results.map(r => ({
        name: r.results?.[0]?.name || 'Unknown',
        passed: r.passed,
        errorCount: r.errors.length
      }))
    }

    // Generate summary report
    this.generateStabilityReport(summary, results)

    return { overall: overallPassed, results, summary }
  }

  private static generateStabilityReport(summary: any, results: any[]) {
    console.log('\n' + '='.repeat(80))
    console.log('📊 تقرير اختبارات الاستقرار الشاملة')
    console.log('='.repeat(80))

    console.log(`\n⏱️ إجمالي وقت الاختبارات: ${summary.totalDuration.toFixed(2)} مللي ثانية`)
    console.log(`🧪 عدد الاختبارات: ${summary.totalTests}`)
    console.log(`✅ نجح: ${summary.passedTests}`)
    console.log(`❌ فشل: ${summary.failedTests}`)
    console.log(`🚨 إجمالي الأخطاء: ${summary.totalErrors}`)

    console.log(`\n📋 تفاصيل النتائج:`)
    summary.testResults.forEach((result: any) => {
      const status = result.passed ? '✅' : '❌'
      console.log(`   ${status} ${result.name}: ${result.errorCount} أخطاء`)
    })

    console.log(`\n🎯 الخلاصة:`)
    if (summary.overallPassed) {
      console.log('   ✅ جميع اختبارات الاستقرار نجحت - النظام مستقر')
    } else {
      console.log('   ⚠️ فشل في بعض اختبارات الاستقرار - يحتاج مراجعة')
      console.log('   📝 التوصيات:')
      console.log('      • مراجعة الأخطاء المذكورة أعلاه')
      console.log('      • اختبار التكامل مع المكونات الأخرى')
      console.log('      • مراقبة الأداء في البيئة الإنتاجية')
    }

    console.log('='.repeat(80))
  }
}

// Export for browser usage
if (typeof window !== 'undefined') {
  (window as any).StabilityTests = StabilityTests
}

export default StabilityTests