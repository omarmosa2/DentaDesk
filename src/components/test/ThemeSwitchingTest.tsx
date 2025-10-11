import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import NewDashboardLayout from '../dashboard/NewDashboardLayout'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import {
  Sun,
  Moon,
  RotateCcw,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react'

interface LayoutMetrics {
  headerHeight: number
  sidebarWidth: number
  mainContentWidth: number
  floatingActionsPosition: { top: number, left: number }
  timestamp: number
}

interface PerformanceMetrics {
  themeSwitchTime: number
  layoutShift: boolean
  reflowCount: number
  renderTime: number
}

interface TestResult {
  testName: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  message: string
  metrics?: PerformanceMetrics
  layoutBefore?: LayoutMetrics
  layoutAfter?: LayoutMetrics
}

const ThemeSwitchingTest: React.FC = () => {
  const { isDarkMode, toggleDarkMode, setDarkMode } = useTheme()
  const [isAutoTesting, setIsAutoTesting] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [currentScreenSize, setCurrentScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const containerRef = useRef<HTMLDivElement>(null)
  const layoutObserverRef = useRef<ResizeObserver | null>(null)
  const performanceObserverRef = useRef<PerformanceObserver | null>(null)

  // Layout measurement functions
  const measureLayout = useCallback((): LayoutMetrics => {
    const header = document.querySelector('[data-testid="dashboard-header"]') as HTMLElement
    const sidebar = document.querySelector('[data-testid="dashboard-sidebar"]') as HTMLElement
    const main = document.querySelector('[data-testid="dashboard-main"]') as HTMLElement
    const floating = document.querySelector('[data-testid="floating-actions"]') as HTMLElement

    return {
      headerHeight: header?.offsetHeight || 0,
      sidebarWidth: sidebar?.offsetWidth || 0,
      mainContentWidth: main?.offsetWidth || 0,
      floatingActionsPosition: {
        top: floating?.offsetTop || 0,
        left: floating?.offsetLeft || 0
      },
      timestamp: Date.now()
    }
  }, [])

  // Performance monitoring
  const measurePerformance = useCallback(async (action: () => void): Promise<PerformanceMetrics> => {
    const startTime = performance.now()
    let reflowCount = 0

    // Monitor layout shifts
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          reflowCount++
        }
      }
    })
    observer.observe({ entryTypes: ['layout-shift'] })

    // Execute action
    const renderStart = performance.now()
    action()
    const renderEnd = performance.now()

    // Wait for theme transition
    await new Promise(resolve => setTimeout(resolve, 300))

    observer.disconnect()

    const totalTime = performance.now() - startTime
    const layoutShift = reflowCount > 0

    return {
      themeSwitchTime: totalTime,
      layoutShift,
      reflowCount,
      renderTime: renderEnd - renderStart
    }
  }, [])

  // Test scenarios
  const testScenarios = [
    {
      name: 'Manual Light to Dark Switch',
      action: () => setDarkMode(true),
      expectedTheme: 'dark'
    },
    {
      name: 'Manual Dark to Light Switch',
      action: () => setDarkMode(false),
      expectedTheme: 'light'
    },
    {
      name: 'Rapid Theme Switching (5 times)',
      action: async () => {
        for (let i = 0; i < 5; i++) {
          toggleDarkMode()
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    },
    {
      name: 'Theme Persistence Test',
      action: async () => {
        const originalTheme = isDarkMode
        toggleDarkMode()
        await new Promise(resolve => setTimeout(resolve, 500))
        // Simulate page reload by checking localStorage
        const stored = localStorage.getItem('dental-clinic-theme')
        const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
        return stored === current
      }
    },
    {
      name: 'Layout Integrity Test',
      action: async () => {
        const before = measureLayout()
        toggleDarkMode()
        await new Promise(resolve => setTimeout(resolve, 300))
        const after = measureLayout()

        // Check if layout dimensions remain consistent
        const headerDiff = Math.abs(before.headerHeight - after.headerHeight)
        const sidebarDiff = Math.abs(before.sidebarWidth - after.sidebarWidth)
        const mainDiff = Math.abs(before.mainContentWidth - after.mainContentWidth)

        return headerDiff <= 2 && sidebarDiff <= 2 && mainDiff <= 2
      }
    },
    {
      name: 'Visual Hierarchy Test',
      action: async () => {
        // Check contrast ratios and visual prominence
        const urgentAlerts = document.querySelector('[data-testid="urgent-alerts"]')
        const statistics = document.querySelectorAll('[data-testid="stat-card"]')

        let passed = true
        if (urgentAlerts) {
          const computedStyle = window.getComputedStyle(urgentAlerts)
          // Check if urgent alerts have higher visual prominence
          passed = computedStyle.animationName === 'pulse' || computedStyle.opacity === '1'
        }

        return passed
      }
    },
    {
      name: 'RTL Layout Test',
      action: async () => {
        const originalDir = document.documentElement.getAttribute('dir') || 'rtl'
        document.documentElement.setAttribute('dir', 'rtl')
        await new Promise(resolve => setTimeout(resolve, 100))

        const header = document.querySelector('[data-testid="dashboard-header"]')
        const sidebar = document.querySelector('[data-testid="dashboard-sidebar"]')
        const main = document.querySelector('[data-testid="dashboard-main"]')

        let rtlPassed = true

        if (header) {
          const headerStyle = window.getComputedStyle(header)
          rtlPassed = rtlPassed && headerStyle.textAlign === 'right'
        }

        if (sidebar) {
          const sidebarRect = sidebar.getBoundingClientRect()
          // Check if sidebar is positioned correctly in RTL
          rtlPassed = rtlPassed && sidebarRect.right > window.innerWidth / 2
        }

        // Restore original direction
        document.documentElement.setAttribute('dir', originalDir)

        return rtlPassed
      }
    },
    {
      name: 'Responsive Breakpoint Test',
      action: async () => {
        const breakpoints = [
          { name: 'mobile', width: 375, height: 667 },
          { name: 'tablet', width: 768, height: 1024 },
          { name: 'desktop', width: 1200, height: 800 }
        ]

        let responsivePassed = true

        for (const bp of breakpoints) {
          // Simulate viewport change
          Object.defineProperty(window, 'innerWidth', { value: bp.width, writable: true })
          Object.defineProperty(window, 'innerHeight', { value: bp.height, writable: true })

          // Trigger resize event
          window.dispatchEvent(new Event('resize'))
          await new Promise(resolve => setTimeout(resolve, 200))

          const sidebar = document.querySelector('[data-testid="dashboard-sidebar"]')
          const main = document.querySelector('[data-testid="dashboard-main"]')

          if (sidebar && main) {
            const sidebarRect = sidebar.getBoundingClientRect()
            const mainRect = main.getBoundingClientRect()

            // Check if elements don't overlap and maintain proper spacing
            const overlap = !(sidebarRect.right < mainRect.left || mainRect.right < sidebarRect.left)
            if (overlap) {
              responsivePassed = false
              break
            }
          }
        }

        return responsivePassed
      }
    },
    {
      name: 'Performance Test',
      action: async () => {
        const metrics = await measurePerformance(() => toggleDarkMode())

        // Check performance thresholds
        return metrics.themeSwitchTime < 1000 && !metrics.layoutShift
      }
    }
  ]

  // Run individual test
  const runTest = useCallback(async (testName: string) => {
    setTestResults(prev => prev.map(test =>
      test.testName === testName
        ? { ...test, status: 'running', message: 'Running test...' }
        : test
    ))

    try {
      const layoutBefore = measureLayout()
      const scenario = testScenarios.find(s => s.name === testName)
      if (!scenario) throw new Error('Test scenario not found')

      const metrics = await measurePerformance(scenario.action)
      const layoutAfter = measureLayout()

      // Validate results
      let passed = true
      let message = 'Test completed successfully'

      if (scenario.expectedTheme) {
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
        if (currentTheme !== scenario.expectedTheme) {
          passed = false
          message = `Expected theme: ${scenario.expectedTheme}, got: ${currentTheme}`
        }
      }

      // Check for excessive layout shifts
      if (metrics.layoutShift && metrics.reflowCount > 2) {
        passed = false
        message += '. Excessive layout shifts detected.'
      }

      // Check performance
      if (metrics.themeSwitchTime > 1000) {
        passed = false
        message += '. Theme switch took too long.'
      }

      setTestResults(prev => prev.map(test =>
        test.testName === testName
          ? {
              ...test,
              status: passed ? 'passed' : 'failed',
              message,
              metrics,
              layoutBefore,
              layoutAfter
            }
          : test
      ))

    } catch (error) {
      setTestResults(prev => prev.map(test =>
        test.testName === testName
          ? {
              ...test,
              status: 'failed',
              message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          : test
      ))
    }
  }, [measureLayout, measurePerformance, testScenarios, isDarkMode])

  // Auto testing sequence
  const runAutoTests = useCallback(async () => {
    setIsAutoTesting(true)

    for (const scenario of testScenarios) {
      await runTest(scenario.name)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait between tests
    }

    setIsAutoTesting(false)
  }, [runTest])

  // Initialize test results
  useEffect(() => {
    const initialResults: TestResult[] = testScenarios.map(scenario => ({
      testName: scenario.name,
      status: 'pending',
      message: 'Ready to run'
    }))
    setTestResults(initialResults)
  }, [])

  // Screen size simulation
  const simulateScreenSize = useCallback((size: 'mobile' | 'tablet' | 'desktop') => {
    setCurrentScreenSize(size)
    const container = containerRef.current
    if (!container) return

    switch (size) {
      case 'mobile':
        container.style.width = '375px'
        container.style.height = '667px'
        break
      case 'tablet':
        container.style.width = '768px'
        container.style.height = '1024px'
        break
      case 'desktop':
        container.style.width = '100%'
        container.style.height = '100%'
        break
    }
  }, [])

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-gray-400" />
      case 'running': return <RotateCcw className="w-4 h-4 text-blue-500 animate-spin" />
      case 'passed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'passed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-card p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Theme Switching Test Suite
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Test layout integrity and performance across light/dark themes
            </p>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="px-3 py-1">
              Current: {isDarkMode ? 'Dark' : 'Light'}
            </Badge>
            <Button
              onClick={toggleDarkMode}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              Toggle Theme
            </Button>
          </div>
        </div>

        {/* Screen Size Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Screen Size Simulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={currentScreenSize === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => simulateScreenSize('mobile')}
                className="flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                Mobile (375px)
              </Button>
              <Button
                variant={currentScreenSize === 'tablet' ? 'default' : 'outline'}
                size="sm"
                onClick={() => simulateScreenSize('tablet')}
                className="flex items-center gap-2"
              >
                <Tablet className="w-4 h-4" />
                Tablet (768px)
              </Button>
              <Button
                variant={currentScreenSize === 'desktop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => simulateScreenSize('desktop')}
                className="flex items-center gap-2"
              >
                <Monitor className="w-4 h-4" />
                Desktop (100%)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                onClick={runAutoTests}
                disabled={isAutoTesting}
                className="flex items-center gap-2"
              >
                {isAutoTesting ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isAutoTesting ? 'Running Tests...' : 'Run All Tests'}
              </Button>
              <Button
                onClick={() => setTestResults(prev => prev.map(test => ({ ...test, status: 'pending', message: 'Ready to run' })))}
                variant="outline"
              >
                Reset Tests
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((test, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <h3 className="font-medium">{test.testName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{test.message}</p>
                      {test.metrics && (
                        <div className="text-xs text-gray-500 mt-1 space-y-1">
                          <div>Switch time: {test.metrics.themeSwitchTime.toFixed(2)}ms</div>
                          <div>Render time: {test.metrics.renderTime.toFixed(2)}ms</div>
                          <div>Layout shifts: {test.metrics.reflowCount}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(test.status)}>
                      {test.status.toUpperCase()}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runTest(test.testName)}
                      disabled={test.status === 'running' || isAutoTesting}
                    >
                      Run
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={containerRef}
              className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800"
              style={{ height: currentScreenSize === 'desktop' ? '600px' : 'auto' }}
            >
              <NewDashboardLayout
                onNavigateToPatients={() => console.log('Navigate to patients')}
                onNavigateToAppointments={() => console.log('Navigate to appointments')}
                onNavigateToPayments={() => console.log('Navigate to payments')}
                onNavigateToTreatments={() => console.log('Navigate to treatments')}
                onAddPatient={() => console.log('Add patient')}
                onAddAppointment={() => console.log('Add appointment')}
                onAddPayment={() => console.log('Add payment')}
                onOpenSettings={() => console.log('Open settings')}
              />
            </div>
          </CardContent>
        </Card>

        {/* RTL Test Section */}
        <Card>
          <CardHeader>
            <CardTitle>RTL Compatibility Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Test RTL layout behavior by checking text alignment, icon positioning, and overall layout flow.
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => document.documentElement.setAttribute('dir', 'ltr')}
                >
                  Force LTR
                </Button>
                <Button
                  variant="outline"
                  onClick={() => document.documentElement.setAttribute('dir', 'rtl')}
                >
                  Force RTL
                </Button>
                <Badge variant="outline">
                  Current dir: {document.documentElement.getAttribute('dir') || 'auto'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ThemeSwitchingTest