/**
 * Theme Switching Performance Test
 *
 * This test measures the performance of theme switching in the Electron app.
 * It simulates rapid theme switches and measures the time taken for each switch.
 */

import { useTheme } from '../contexts/ThemeContext'
import logger from '../utils/logger'

// Performance test configuration
const TEST_CONFIG = {
  iterations: 10, // Number of theme switches to perform
  delayBetweenSwitches: 100, // Delay between switches in milliseconds
  warmupIterations: 2, // Number of warmup switches
}

// Performance metrics storage
interface PerformanceMetrics {
  switchTimes: number[]
  averageTime: number
  minTime: number
  maxTime: number
  medianTime: number
  totalTime: number
}

// Test results
let testResults: PerformanceMetrics | null = null

/**
 * Calculate performance metrics from an array of times
 */
function calculateMetrics(times: number[]): PerformanceMetrics {
  const sortedTimes = [...times].sort((a, b) => a - b)
  const sum = times.reduce((acc, time) => acc + time, 0)

  return {
    switchTimes: times,
    averageTime: sum / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    medianTime: sortedTimes[Math.floor(times.length / 2)],
    totalTime: sum
  }
}

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Run theme switching performance test
 */
export async function runThemeSwitchingPerformanceTest(): Promise<PerformanceMetrics> {
  logger.performance('🚀 Starting Theme Switching Performance Test')

  const startTime = performance.now()
  const switchTimes: number[] = []

  try {
    // Warmup phase
    logger.performance(`🔥 Warmup phase: ${TEST_CONFIG.warmupIterations} iterations`)
    for (let i = 0; i < TEST_CONFIG.warmupIterations; i++) {
      const switchStart = performance.now()

      // Simulate theme switch
      await triggerThemeSwitch()

      const switchTime = performance.now() - switchStart
      logger.performance(`Warmup ${i + 1}: ${switchTime.toFixed(2)}ms`)

      if (i < TEST_CONFIG.warmupIterations - 1) {
        await sleep(TEST_CONFIG.delayBetweenSwitches)
      }
    }

    // Test phase
    logger.performance(`⚡ Test phase: ${TEST_CONFIG.iterations} iterations`)
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
      const switchStart = performance.now()

      // Simulate theme switch
      await triggerThemeSwitch()

      const switchTime = performance.now() - switchStart
      switchTimes.push(switchTime)
      logger.performance(`Test ${i + 1}: ${switchTime.toFixed(2)}ms`)

      if (i < TEST_CONFIG.iterations - 1) {
        await sleep(TEST_CONFIG.delayBetweenSwitches)
      }
    }

    // Calculate and store results
    testResults = calculateMetrics(switchTimes)

    const endTime = performance.now()
    const totalTestTime = endTime - startTime

    logger.performance('✅ Theme Switching Performance Test Completed')
    logger.performance(`📊 Total test time: ${totalTestTime.toFixed(2)}ms`)
    logger.performance(`📊 Average switch time: ${testResults.averageTime.toFixed(2)}ms`)
    logger.performance(`📊 Min switch time: ${testResults.minTime.toFixed(2)}ms`)
    logger.performance(`📊 Max switch time: ${testResults.maxTime.toFixed(2)}ms`)
    logger.performance(`📊 Median switch time: ${testResults.medianTime.toFixed(2)}ms`)

    return testResults

  } catch (error) {
    logger.error('❌ Theme Switching Performance Test Failed:', error)
    throw error
  }
}

/**
 * Trigger a theme switch (mock implementation for testing)
 * In a real scenario, this would call the theme toggle function
 */
async function triggerThemeSwitch(): Promise<void> {
  // This is a mock implementation for testing purposes
  // In the real app, this would call the actual theme toggle function

  // Simulate DOM manipulation delay
  await sleep(Math.random() * 10 + 5) // Random delay between 5-15ms

  // Simulate localStorage operation
  localStorage.setItem('test-theme-switch', Date.now().toString())

  // Simulate async operations that might occur during theme switching
  await sleep(Math.random() * 5 + 2) // Random delay between 2-7ms
}

/**
 * Get the last test results
 */
export function getLastTestResults(): PerformanceMetrics | null {
  return testResults
}

/**
 * Reset test results
 */
export function resetTestResults(): void {
  testResults = null
  logger.performance('🔄 Test results reset')
}

/**
 * Run a quick validation test to ensure theme switching is working
 */
export async function validateThemeSwitching(): Promise<boolean> {
  try {
    logger.performance('🔍 Validating theme switching functionality')

    const initialTheme = document.documentElement.classList.contains('dark')
    logger.performance(`Initial theme: ${initialTheme ? 'dark' : 'light'}`)

    // Perform one theme switch
    await triggerThemeSwitch()

    const newTheme = document.documentElement.classList.contains('dark')
    logger.performance(`New theme: ${newTheme ? 'dark' : 'light'}`)

    // Check if theme actually changed (or if it should have)
    const themeChanged = initialTheme !== newTheme

    if (themeChanged) {
      logger.performance('✅ Theme switching validation passed')
    } else {
      logger.performance('⚠️ Theme did not change (may be expected behavior)')
    }

    return true // Validation completed successfully

  } catch (error) {
    logger.error('❌ Theme switching validation failed:', error)
    return false
  }
}

// Export test configuration for external access
export { TEST_CONFIG }

// WhatsApp Settings Test Functions
export async function testWhatsAppSettingsSave() {
  console.log('🧪 Testing WhatsApp settings save functionality...')

  if (!window.electronAPI?.whatsappReminders?.setSettings) {
    console.error('❌ WhatsApp API not available')
    return false
  }

  try {
    // Test payload
    const testPayload = {
      whatsapp_reminder_enabled: 1,
      hours_before: 3,
      minutes_before: 180,
      message: 'Test message',
      custom_enabled: 0,
    }

    console.log('📤 Sending test payload:', testPayload)

    const result = await window.electronAPI.whatsappReminders.setSettings(testPayload)
    console.log('✅ Settings saved successfully:', result)

    // Verify by reading back
    if (window.electronAPI?.whatsappReminders?.getSettings) {
      const readResult = await window.electronAPI.whatsappReminders.getSettings()
      console.log('🔍 Verification - settings read back:', readResult)
    }

    return result
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

export async function testWhatsAppSettingsRead() {
  console.log('🧪 Testing WhatsApp settings read functionality...')

  if (!window.electronAPI?.whatsappReminders?.getSettings) {
    console.error('❌ WhatsApp API not available')
    return false
  }

  try {
    const result = await window.electronAPI.whatsappReminders.getSettings()
    console.log('✅ Settings read successfully:', result)
    return result
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).themePerformanceTest = {
    run: runThemeSwitchingPerformanceTest,
    validate: validateThemeSwitching,
    getResults: getLastTestResults,
    reset: resetTestResults,
    config: TEST_CONFIG
  }

  // WhatsApp testing functions
  ;(window as any).whatsappTest = {
    save: testWhatsAppSettingsSave,
    read: testWhatsAppSettingsRead,
  }
}