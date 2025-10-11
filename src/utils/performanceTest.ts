import { formatCurrency, formatCurrencyWithConfig, SUPPORTED_CURRENCIES } from '../lib/utils'

// Performance test for currency formatting functions
export function runCurrencyPerformanceTest() {
  console.log('🧪 Running Currency Performance Tests...')

  const testAmounts = [0, 1, 10, 100, 1000, 10000, 100000, 1234.56, 999999.99]
  const currencies = Object.keys(SUPPORTED_CURRENCIES)

  // Test formatCurrency performance
  console.log('📊 Testing formatCurrency performance...')
  const formatStart = performance.now()

  for (let i = 0; i < 1000; i++) {
    const amount = testAmounts[i % testAmounts.length]
    const currency = currencies[i % currencies.length]
    formatCurrency(amount, currency, true)
  }

  const formatEnd = performance.now()
  const formatTime = formatEnd - formatStart
  console.log(`✅ formatCurrency: ${formatTime.toFixed(2)}ms for 1000 operations`)

  // Test formatCurrencyWithConfig performance
  console.log('📊 Testing formatCurrencyWithConfig performance...')
  const configStart = performance.now()

  for (let i = 0; i < 1000; i++) {
    const amount = testAmounts[i % testAmounts.length]
    const currency = currencies[i % currencies.length]
    const config = SUPPORTED_CURRENCIES[currency]
    formatCurrencyWithConfig(amount, config, true)
  }

  const configEnd = performance.now()
  const configTime = configEnd - configStart
  console.log(`✅ formatCurrencyWithConfig: ${configTime.toFixed(2)}ms for 1000 operations`)

  // Test cached vs non-cached performance
  console.log('📊 Testing caching performance...')
  const cacheStart = performance.now()

  for (let i = 0; i < 1000; i++) {
    const amount = testAmounts[i % testAmounts.length]
    const config = SUPPORTED_CURRENCIES.USD
    formatCurrencyWithConfig(amount, config, true)
  }

  const cacheEnd = performance.now()
  const cacheTime = cacheEnd - cacheStart
  console.log(`✅ Cached formatting: ${cacheTime.toFixed(2)}ms for 1000 operations`)

  return {
    formatCurrency: formatTime,
    formatCurrencyWithConfig: configTime,
    cachedFormatting: cacheTime
  }
}

// Performance test for theme switching
export function runThemeSwitchingTest() {
  console.log('🎨 Running Theme Switching Performance Tests...')

  const iterations = 100
  let switchTimes: number[] = []

  // Simulate theme context updates
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()

    // Simulate DOM class manipulation
    document.documentElement.classList.toggle('dark')

    const end = performance.now()
    switchTimes.push(end - start)
  }

  const avgTime = switchTimes.reduce((sum, time) => sum + time, 0) / iterations
  const maxTime = Math.max(...switchTimes)
  const minTime = Math.min(...switchTimes)

  console.log(`✅ Theme switching: ${avgTime.toFixed(3)}ms average (${iterations} iterations)`)
  console.log(`📈 Max: ${maxTime.toFixed(3)}ms, Min: ${minTime.toFixed(3)}ms`)

  return {
    average: avgTime,
    max: maxTime,
    min: minTime,
    iterations
  }
}

// Performance test for component re-renders
export function runReRenderTest() {
  console.log('🔄 Running Re-render Performance Tests...')

  const iterations = 1000
  let renderTimes: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()

    // Simulate component update (this would be measured in React DevTools in real scenario)
    // For now, we'll measure the overhead of context updates
    const testData = {
      theme: i % 2 === 0 ? 'light' : 'dark',
      currency: i % 3 === 0 ? 'USD' : 'SAR',
      arabicNumerals: i % 4 === 0
    }

    // Simulate processing that happens in contexts
    JSON.stringify(testData)

    const end = performance.now()
    renderTimes.push(end - start)
  }

  const avgTime = renderTimes.reduce((sum, time) => sum + time, 0) / iterations
  console.log(`✅ Re-render simulation: ${avgTime.toFixed(4)}ms average (${iterations} iterations)`)

  return {
    average: avgTime,
    iterations
  }
}

// Comprehensive performance report
export function generatePerformanceReport() {
  console.log('📋 Generating Performance Report...')

  const currencyResults = runCurrencyPerformanceTest()
  const themeResults = runThemeSwitchingTest()
  const renderResults = runReRenderTest()

  const report = {
    timestamp: new Date().toISOString(),
    currency: currencyResults,
    theme: themeResults,
    render: renderResults,
    summary: {
      totalOperations: 1000 + 100 + 1000,
      averageResponseTime: (
        (currencyResults.formatCurrency + currencyResults.formatCurrencyWithConfig + currencyResults.cachedFormatting) / 3 +
        themeResults.average +
        renderResults.average
      ) / 3
    }
  }

  console.log('📊 Performance Report Summary:')
  console.log(`   💰 Currency formatting: ${(currencyResults.cachedFormatting / 1000 * 1000000).toFixed(0)}μs/op`)
  console.log(`   🎨 Theme switching: ${(themeResults.average * 1000).toFixed(0)}μs/op`)
  console.log(`   🔄 Re-renders: ${(renderResults.average * 1000).toFixed(0)}μs/op`)

  return report
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).runPerformanceTests = generatePerformanceReport
}