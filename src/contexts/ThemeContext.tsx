import React, { createContext, useContext, useEffect, ReactNode, useMemo, useCallback, memo } from 'react'
import { useSettingsStore } from '../store/settingsStore'

interface ThemeContextType {
  isDarkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (isDark: boolean) => void
  theme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { isDarkMode, toggleDarkMode: storeToggleDarkMode, initializeDarkMode, loadSettings, settings, isLoaded } = useSettingsStore()

  // Optimized theme application with reduced DOM manipulations
  useEffect(() => {
    if (!isLoaded) return // Wait for settings to be loaded

    let isApplying = false

    const applyThemeOptimized = () => {
      // Prevent concurrent theme applications
      if (isApplying) return
      isApplying = true

      try {
        const htmlElement = document.documentElement
        const currentTheme = htmlElement.getAttribute('data-theme')
        const currentDarkClass = htmlElement.classList.contains('dark')
        const targetTheme = isDarkMode ? 'dark' : 'light'

        // Only apply theme if it actually changed
        if (currentTheme !== targetTheme || currentDarkClass !== isDarkMode) {
          // Apply both data-theme attribute and dark class for consistency
          htmlElement.setAttribute('data-theme', targetTheme)
          
          if (isDarkMode) {
            htmlElement.classList.add('dark')
          } else {
            htmlElement.classList.remove('dark')
          }

          // Use CSS containment for better performance
          htmlElement.style.setProperty('contain', 'layout style paint')

          // Enable transitions after a brief delay to prevent flicker
          requestAnimationFrame(() => {
            htmlElement.style.setProperty('--theme-transition-duration', '0.2s')
            htmlElement.classList.add('theme-transitions-enabled')
            isApplying = false
          })
        } else {
          isApplying = false
        }
      } catch (error) {
        console.warn('Theme application failed:', error)
        isApplying = false
      }
    }

    // Debounce theme application to prevent excessive DOM manipulations
    const timeoutId = setTimeout(applyThemeOptimized, 0)

    return () => {
      clearTimeout(timeoutId)
      isApplying = false
    }
  }, [isDarkMode, isLoaded]) // Only depend on isDarkMode and isLoaded

  const toggleDarkMode = useCallback(() => {
    storeToggleDarkMode()
  }, [storeToggleDarkMode])

  const setDarkMode = useCallback((isDark: boolean) => {
    if (isDark !== isDarkMode) {
      storeToggleDarkMode()
    }
  }, [isDarkMode, storeToggleDarkMode])

  const value = useMemo<ThemeContextType>(() => ({
    isDarkMode,
    toggleDarkMode,
    setDarkMode,
    theme: isDarkMode ? 'dark' : 'light',
  }), [isDarkMode, toggleDarkMode, setDarkMode])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Optimized hook for theme-aware styling with memoized classes
export function useThemeClasses() {
  const { isDarkMode } = useTheme()

  return useMemo(() => {
    const baseClasses = {
      // Background classes
      bgPrimary: 'bg-background',
      bgSecondary: 'bg-card',
      bgTertiary: 'bg-muted',

      // Text classes
      textPrimary: 'text-foreground',
      textSecondary: 'text-muted-foreground',
      textMuted: 'text-muted-foreground',

      // Border classes
      border: 'border-border',
      borderLight: 'border-input',
      borderFocus: 'border-ring',

      // Navigation classes
      nav: 'bg-background border-border shadow-sm',
      navItem: 'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors rounded-md px-3 py-2',
      navItemActive: 'text-primary bg-accent border-l-2 border-primary font-medium',

      // Table classes
      tableHeader: 'bg-muted text-foreground font-semibold',
      tableRow: 'hover:bg-accent/50 transition-colors',
      tableCell: 'text-foreground border-border',

      // Dialog classes
      dialogHeader: 'text-foreground font-semibold',
      dialogContent: 'text-muted-foreground',

      // Button classes
      buttonGhost: 'hover:bg-accent hover:text-accent-foreground active:scale-[0.98] transition-colors',
    }

    // Theme-specific classes that actually change
    const themeClasses = {
      bgElevated: isDarkMode ? 'bg-card shadow-lg shadow-black/10' : 'bg-card shadow-sm',

      textHighContrast: 'text-foreground',
      textMediumContrast: isDarkMode ? 'text-muted-foreground' : 'text-muted-foreground',

      card: isDarkMode
        ? 'bg-card border-border text-card-foreground shadow-lg shadow-black/10 hover:shadow-xl'
        : 'bg-card border-border text-card-foreground shadow-sm hover:shadow-md',

      buttonPrimary: isDarkMode
        ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98]'
        : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md active:scale-[0.98]',

      buttonSecondary: isDarkMode
        ? 'bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border shadow-lg shadow-secondary/20 active:scale-[0.98]'
        : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border shadow-md active:scale-[0.98]',

      buttonOutline: isDarkMode
        ? 'border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-ring/50 active:scale-[0.98] shadow-md'
        : 'border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-ring/50 active:scale-[0.98] shadow-sm',

      input: isDarkMode
        ? 'bg-background border-input text-foreground placeholder-muted-foreground focus:border-ring shadow-md'
        : 'bg-background border-input text-foreground placeholder-muted-foreground focus:border-ring shadow-sm',

      table: isDarkMode
        ? 'bg-card border-border shadow-lg shadow-black/10'
        : 'bg-background border-border shadow-sm',

      dialog: isDarkMode
        ? 'bg-card border-border shadow-xl shadow-black/20'
        : 'bg-background border-border shadow-lg',
    }

    // Status classes - grouped by theme for better performance
    const statusClasses = isDarkMode ? {
      statusScheduled: 'bg-primary/20 text-primary border border-primary/30 rounded-full px-2 py-1 text-xs font-medium',
      statusCompleted: 'bg-green-900/20 text-green-400 border border-green-800 rounded-full px-2 py-1 text-xs font-medium',
      statusCancelled: 'bg-destructive/20 text-destructive border border-destructive/30 rounded-full px-2 py-1 text-xs font-medium',
      statusNoShow: 'bg-muted text-muted-foreground border border-border rounded-full px-2 py-1 text-xs font-medium',
      statusInProgress: 'bg-amber-900/20 text-amber-400 border border-amber-800 rounded-full px-2 py-1 text-xs font-medium',
      notificationSuccess: 'bg-green-900/20 text-green-400 border border-green-800 shadow-lg',
      notificationError: 'bg-red-900/20 text-red-400 border border-red-800 shadow-lg',
      notificationWarning: 'bg-amber-900/20 text-amber-400 border border-amber-800 shadow-lg',
      notificationInfo: 'bg-blue-900/20 text-blue-400 border border-blue-800 shadow-lg',
      alertError: 'bg-destructive/20 border-destructive/30',
      alertWarning: 'bg-amber-900/20 border-amber-800/50',
      alertSuccess: 'bg-green-900/20 border-green-800/50',
      alertInfo: 'bg-blue-900/20 border-blue-800/50',
    } : {
      statusScheduled: 'bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-1 text-xs font-medium',
      statusCompleted: 'bg-green-100 text-green-800 border border-green-200 rounded-full px-2 py-1 text-xs font-medium',
      statusCancelled: 'bg-destructive/10 text-destructive border border-destructive/20 rounded-full px-2 py-1 text-xs font-medium',
      statusNoShow: 'bg-muted text-muted-foreground border border-border rounded-full px-2 py-1 text-xs font-medium',
      statusInProgress: 'bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-2 py-1 text-xs font-medium',
      notificationSuccess: 'bg-green-50 text-green-800 border border-green-200 shadow-md',
      notificationError: 'bg-red-50 text-red-800 border border-red-200 shadow-md',
      notificationWarning: 'bg-amber-50 text-amber-800 border border-amber-200 shadow-md',
      notificationInfo: 'bg-blue-50 text-blue-800 border border-blue-200 shadow-md',
      alertError: 'bg-destructive/10 border-destructive/20',
      alertWarning: 'bg-amber-50 border-amber-200',
      alertSuccess: 'bg-green-50 border-green-200',
      alertInfo: 'bg-blue-50 border-blue-200',
    }

    return {
      ...baseClasses,
      ...themeClasses,
      ...statusClasses,
    }
  }, [isDarkMode])
}

// Memoized utility functions for theme-aware colors - Medical Theme
const lightThemeColors = {
  primary: '#0ea5e9',
  primaryHover: '#0284c7',
  secondary: '#0ea5e9',
  secondaryHover: '#0369a1',
  success: '#059669',
  successHover: '#047857',
  warning: '#d97706',
  warningHover: '#b45309',
  error: '#dc2626',
  errorHover: '#b91c1c',
  background: '#ffffff',
  surface: '#f8fafc',
  surfaceElevated: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#cbd5e1',
  accent: '#f1f5f9',
  accentHover: '#e2e8f0',
  primaryLight: '#f0f9ff',
  primaryMedium: '#e0f2fe',
  primaryDark: '#0369a1',
  successBg: '#ecfdf5',
  warningBg: '#fffbeb',
  errorBg: '#fef2f2',
  infoBg: '#eff6ff',
}

const darkThemeColors = {
  primary: '#38bdf8',
  primaryHover: '#0ea5e9',
  secondary: '#0ea5e9',
  secondaryHover: '#0284c7',
  success: '#10b981',
  successHover: '#059669',
  warning: '#f59e0b',
  warningHover: '#d97706',
  error: '#ef4444',
  errorHover: '#dc2626',
  background: '#0f172a',
  surface: '#1e293b',
  surfaceElevated: '#334155',
  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
  border: '#334155',
  borderLight: '#475569',
  accent: '#1e293b',
  accentHover: '#334155',
  primaryLight: '#0c1929',
  primaryMedium: '#1e293b',
  primaryDark: '#0284c7',
  successBg: '#064e3b',
  warningBg: '#78350f',
  errorBg: '#7f1d1d',
  infoBg: '#1e3a8a',
}

// Performance monitoring hook
export function useThemePerformanceMonitor() {
  const { isDarkMode } = useTheme()

  useEffect(() => {
    const startTime = performance.now()

    // Monitor theme switching performance
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.name.includes('theme') || entry.duration > 16) { // Log slow operations
          console.log(`🎨 Theme Performance: ${entry.name} took ${entry.duration.toFixed(2)}ms`)
        }
      })
    })

    observer.observe({ entryTypes: ['measure', 'navigation'] })

    return () => {
      observer.disconnect()
      const endTime = performance.now()
      const duration = endTime - startTime

      if (duration > 50) { // Log slow theme operations
        console.log(`🎨 Theme operation took ${duration.toFixed(2)}ms`)
      }
    }
  }, [isDarkMode])

  return null
}

// Optimized wrapper component for theme-aware components
export const OptimizedThemeWrapper = memo(function OptimizedThemeWrapper({
  children,
  className = '',
  enableContainment = true,
  ...props
}: {
  children: React.ReactNode
  className?: string
  enableContainment?: boolean
} & React.HTMLAttributes<HTMLDivElement>) {
  const { isDarkMode } = useTheme()

  return (
    <div
      {...props}
      className={`theme-container ${enableContainment ? 'theme-optimized' : ''} ${className}`}
      data-theme-aware="true"
    >
      {children}
    </div>
  )
})

// Utility function to get theme-aware colors - Medical Theme
export function getThemeColors(isDarkMode: boolean) {
  return isDarkMode ? darkThemeColors : lightThemeColors
}

// Utility function to get status colors - Medical Theme
const lightStatusColors = {
  scheduled: {
    bg: 'var(--primary-100)',
    text: '#0ea5e9',
    border: '#0ea5e9',
  },
  completed: {
    bg: 'var(--success-bg)',
    text: '#059669',
    border: '#059669',
  },
  cancelled: {
    bg: 'var(--error-bg)',
    text: '#dc2626',
    border: '#dc2626',
  },
  inProgress: {
    bg: 'var(--warning-bg)',
    text: '#d97706',
    border: '#d97706',
  },
  noShow: {
    bg: 'var(--bg-tertiary)',
    text: '#94a3b8',
    border: '#cbd5e1',
  },
  confirmed: {
    bg: 'var(--info-bg)',
    text: '#2563eb',
    border: '#2563eb',
  },
}

const darkStatusColors = {
  scheduled: {
    bg: 'var(--primary-50)',
    text: '#38bdf8',
    border: '#38bdf8',
  },
  completed: {
    bg: 'var(--success-bg)',
    text: '#10b981',
    border: '#10b981',
  },
  cancelled: {
    bg: 'var(--error-bg)',
    text: '#ef4444',
    border: '#ef4444',
  },
  inProgress: {
    bg: 'var(--warning-bg)',
    text: '#f59e0b',
    border: '#f59e0b',
  },
  noShow: {
    bg: 'var(--bg-secondary)',
    text: '#64748b',
    border: '#475569',
  },
  confirmed: {
    bg: 'var(--info-bg)',
    text: '#3b82f6',
    border: '#3b82f6',
  },
}

export function getStatusColors(isDarkMode: boolean) {
  return isDarkMode ? darkStatusColors : lightStatusColors
}
