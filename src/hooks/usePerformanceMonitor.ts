import { useEffect, useRef, useState } from 'react'

interface PerformanceMetrics {
  renderCount: number
  lastRenderTime: number
  averageRenderTime: number
  totalRenderTime: number
}

export function usePerformanceMonitor(componentName: string, enabled: boolean = false) {
  const renderCountRef = useRef(0)
  const renderTimesRef = useRef<number[]>([])
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    totalRenderTime: 0
  })

  useEffect(() => {
    if (!enabled) return

    const startTime = performance.now()
    renderCountRef.current += 1

    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime

      renderTimesRef.current.push(renderTime)

      // Keep only last 100 render times for memory efficiency
      if (renderTimesRef.current.length > 100) {
        renderTimesRef.current = renderTimesRef.current.slice(-100)
      }

      const totalTime = renderTimesRef.current.reduce((sum, time) => sum + time, 0)
      const averageTime = totalTime / renderTimesRef.current.length

      setMetrics({
        renderCount: renderCountRef.current,
        lastRenderTime: renderTime,
        averageRenderTime: averageTime,
        totalRenderTime: totalTime
      })

      // Log performance warnings
      if (renderTime > 16.67) { // More than one frame at 60fps
        console.warn(`${componentName} slow render: ${renderTime.toFixed(2)}ms`)
      }
    }
  })

  return metrics
}

// Performance monitoring for theme switching
export function useThemeSwitchPerformance() {
  const [themeSwitchTimes, setThemeSwitchTimes] = useState<number[]>([])

  const recordThemeSwitch = (startTime: number) => {
    const endTime = performance.now()
    const switchTime = endTime - startTime

    setThemeSwitchTimes(prev => {
      const newTimes = [...prev, switchTime]
      return newTimes.length > 10 ? newTimes.slice(-10) : newTimes
    })

    console.log(`Theme switch completed in ${switchTime.toFixed(2)}ms`)
    return switchTime
  }

  const getAverageSwitchTime = () => {
    if (themeSwitchTimes.length === 0) return 0
    return themeSwitchTimes.reduce((sum, time) => sum + time, 0) / themeSwitchTimes.length
  }

  return {
    recordThemeSwitch,
    getAverageSwitchTime,
    themeSwitchTimes
  }
}

// Performance monitoring for currency operations
export function useCurrencyPerformance() {
  const [formatTimes, setFormatTimes] = useState<number[]>([])

  const recordFormatTime = (startTime: number) => {
    const endTime = performance.now()
    const formatTime = endTime - startTime

    setFormatTimes(prev => {
      const newTimes = [...prev, formatTime]
      return newTimes.length > 100 ? newTimes.slice(-100) : newTimes
    })

    return formatTime
  }

  const getAverageFormatTime = () => {
    if (formatTimes.length === 0) return 0
    return formatTimes.reduce((sum, time) => sum + time, 0) / formatTimes.length
  }

  return {
    recordFormatTime,
    getAverageFormatTime,
    formatTimes
  }
}