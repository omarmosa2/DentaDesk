// Comprehensive Benchmarking Utilities for Performance Measurement
// Provides utilities for timing, memory tracking, resource monitoring, and before/after comparisons

export interface BenchmarkResult {
  name: string
  startTime: number
  endTime: number
  duration: number
  memoryUsage?: {
    before: number
    after: number
    delta: number
  }
  cpuUsage?: number
  networkRequests?: number
  domNodes?: number
  timestamp: Date
}

export interface MemorySnapshot {
  used: number
  total: number
  limit: number
  timestamp: number
}

export class BenchmarkUtils {
  private static results: BenchmarkResult[] = []
  private static baselineResults: BenchmarkResult[] = []

  // Performance timing utilities
  static startTimer(name: string): () => BenchmarkResult {
    const startTime = performance.now()
    const startMemory = this.getMemoryUsage()

    return () => {
      const endTime = performance.now()
      const endMemory = this.getMemoryUsage()
      const duration = endTime - startTime

      const result: BenchmarkResult = {
        name,
        startTime,
        endTime,
        duration,
        memoryUsage: startMemory && endMemory ? {
          before: startMemory.used,
          after: endMemory.used,
          delta: endMemory.used - startMemory.used
        } : undefined,
        timestamp: new Date()
      }

      this.results.push(result)
      return result
    }
  }

  // Memory usage tracking
  static getMemoryUsage(): MemorySnapshot | null {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory
      return {
        used: mem.usedJSHeapSize,
        total: mem.totalJSHeapSize,
        limit: mem.jsHeapSizeLimit,
        timestamp: performance.now()
      }
    }
    return null
  }

  // DOM performance tracking
  static getDOMMetrics(): {
    nodeCount: number
    elementCount: number
    renderTime?: number
  } {
    const nodeCount = document.getElementsByTagName('*').length
    const elementCount = document.body ? document.body.getElementsByTagName('*').length : 0

    return {
      nodeCount,
      elementCount
    }
  }

  // Network request tracking (simplified)
  static trackNetworkRequests(): Promise<number> {
    // For now, return a simple count - can be enhanced with proper network monitoring
    return Promise.resolve(0)
  }

  // CPU usage estimation
  static async getCPUUsage(): Promise<number> {
    const startTime = performance.now()
    let iterations = 0

    // Simple CPU stress test
    while (performance.now() - startTime < 100) {
      iterations++
    }

    return iterations / 100 // Normalized score
  }

  // Before/after comparison utilities
  static setBaseline(result: BenchmarkResult): void {
    this.baselineResults.push(result)
  }

  static compareWithBaseline(currentResult: BenchmarkResult): {
    improvement: number
    status: 'improved' | 'degraded' | 'stable'
    baselineDuration?: number
  } {
    const baseline = this.baselineResults.find(b => b.name === currentResult.name)

    if (!baseline) {
      return { improvement: 0, status: 'stable' }
    }

    const improvement = ((baseline.duration - currentResult.duration) / baseline.duration) * 100
    const status = improvement > 5 ? 'improved' : improvement < -5 ? 'degraded' : 'stable'

    return {
      improvement,
      status,
      baselineDuration: baseline.duration
    }
  }

  // Resource leak detection
  static detectMemoryLeaks(): Promise<{
    hasLeaks: boolean
    leakSize: number
    recommendations: string[]
  }> {
    return new Promise((resolve) => {
      const initialMemory = this.getMemoryUsage()
      let peakMemory = initialMemory?.used || 0

      const checkInterval = setInterval(() => {
        const currentMemory = this.getMemoryUsage()
        if (currentMemory && currentMemory.used > peakMemory) {
          peakMemory = currentMemory.used
        }
      }, 100)

      setTimeout(() => {
        clearInterval(checkInterval)
        const finalMemory = this.getMemoryUsage()

        if (!initialMemory || !finalMemory) {
          resolve({ hasLeaks: false, leakSize: 0, recommendations: [] })
          return
        }

        const leakSize = finalMemory.used - initialMemory.used
        const hasLeaks = leakSize > 1000000 // 1MB threshold

        const recommendations = []
        if (hasLeaks) {
          recommendations.push('Consider implementing proper cleanup in useEffect')
          recommendations.push('Check for circular references in data structures')
          recommendations.push('Use React.memo and useMemo for expensive operations')
          recommendations.push('Implement proper component unmounting')
        }

        resolve({ hasLeaks, leakSize, recommendations })
      }, 10000) // Monitor for 10 seconds
    })
  }

  // Load time measurement for components/pages
  static measureLoadTime(
    componentName: string,
    loadFunction: () => Promise<void> | void
  ): Promise<BenchmarkResult> {
    return new Promise(async (resolve) => {
      const endTimer = this.startTimer(`Load: ${componentName}`)
      await loadFunction()
      const result = endTimer()
      resolve(result)
    })
  }

  // Table virtualization performance test
  static async testTableVirtualization(
    tableName: string,
    rowCount: number,
    renderFunction: () => void
  ): Promise<BenchmarkResult> {
    const endTimer = this.startTimer(`Table Render: ${tableName}`)

    // Simulate scroll and render operations
    for (let i = 0; i < Math.min(rowCount / 10, 10); i++) {
      renderFunction()
      await new Promise(resolve => setTimeout(resolve, 10)) // Simulate scroll delay
    }

    return endTimer()
  }

  // Report generation performance test
  static async testReportGeneration(
    reportName: string,
    dataSize: number,
    generateFunction: () => Promise<void>
  ): Promise<BenchmarkResult> {
    const endTimer = this.startTimer(`Report: ${reportName}`)
    await generateFunction()
    const result = endTimer()
    result.networkRequests = await this.trackNetworkRequests()
    return result
  }

  // Dashboard loading performance test
  static async testDashboardLoading(
    dashboardName: string,
    loadFunction: () => Promise<void>
  ): Promise<{
    result: BenchmarkResult
    resourceUsage: {
      memory: MemorySnapshot | null
      dom: {
        nodeCount: number
        elementCount: number
        renderTime?: number
      }
    }
  }> {
    const endTimer = this.startTimer(`Dashboard: ${dashboardName}`)
    await loadFunction()
    const result = endTimer()

    const resourceUsage = {
      memory: this.getMemoryUsage(),
      dom: this.getDOMMetrics()
    }

    return { result, resourceUsage }
  }

  // API response time simulation
  static async simulateAPITime(
    endpoint: string,
    responseTime: number,
    success: boolean = true
  ): Promise<BenchmarkResult> {
    const endTimer = this.startTimer(`API: ${endpoint}`)

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, responseTime))

    if (!success) {
      throw new Error('API simulation failed')
    }

    return endTimer()
  }

  // Generate comprehensive performance report
  static generatePerformanceReport(): {
    summary: {
      totalTests: number
      averageDuration: number
      memoryEfficiency: number
      improvementRate: number
    }
    details: BenchmarkResult[]
    recommendations: string[]
  } {
    const totalTests = this.results.length
    const averageDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / totalTests
    const memoryEfficiency = this.results
      .filter(r => r.memoryUsage)
      .reduce((sum, r) => sum + (r.memoryUsage!.delta < 0 ? 1 : 0), 0) / this.results.filter(r => r.memoryUsage).length

    const improvementRate = this.results
      .map(r => this.compareWithBaseline(r).improvement)
      .reduce((sum, imp) => sum + imp, 0) / this.results.length

    const recommendations = []
    if (averageDuration > 100) {
      recommendations.push('Consider implementing lazy loading for heavy components')
    }
    if (memoryEfficiency < 0.7) {
      recommendations.push('Memory usage is high - consider memoization and virtualization')
    }
    if (improvementRate < 10) {
      recommendations.push('Performance improvements below target - review optimization strategies')
    }

    return {
      summary: {
        totalTests,
        averageDuration,
        memoryEfficiency,
        improvementRate
      },
      details: [...this.results],
      recommendations
    }
  }

  // Export results for external analysis
  static exportResults(): string {
    return JSON.stringify({
      results: this.results,
      baselines: this.baselineResults,
      report: this.generatePerformanceReport(),
      timestamp: new Date().toISOString()
    }, null, 2)
  }

  // Clear all results
  static clearResults(): void {
    this.results = []
  }

  // Load baseline results from storage
  static loadBaselines(baselines: BenchmarkResult[]): void {
    this.baselineResults = baselines
  }
}

// Utility for running benchmarks in sequence
export async function runBenchmarkSuite(
  benchmarks: Array<{
    name: string
    run: () => Promise<void>
  }>
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = []

  for (const benchmark of benchmarks) {
    console.log(`🏃 Running benchmark: ${benchmark.name}`)
    const startTime = performance.now()

    try {
      await benchmark.run()
      const duration = performance.now() - startTime
      results.push({
        name: benchmark.name,
        startTime,
        endTime: performance.now(),
        duration,
        timestamp: new Date()
      })
      console.log(`✅ ${benchmark.name} completed in ${duration.toFixed(2)}ms`)
    } catch (error) {
      console.error(`❌ ${benchmark.name} failed:`, error)
      results.push({
        name: benchmark.name,
        startTime,
        endTime: performance.now(),
        duration: performance.now() - startTime,
        timestamp: new Date()
      })
    }
  }

  return results
}