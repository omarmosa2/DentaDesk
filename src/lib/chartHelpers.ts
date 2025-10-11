/**
 * Chart helpers and utilities for professional data visualization
 * Provides consistent styling, colors, and configurations across all charts
 */

import { getChartColors, getChartConfig } from './utils'

// Chart component wrapper with professional styling
export interface ChartWrapperProps {
  isDarkMode: boolean
  height?: number
  margin?: { top: number; right: number; left: number; bottom: number }
}

// Default chart margins for consistent spacing
export const DEFAULT_CHART_MARGINS = {
  top: 20,
  right: 30,
  left: 20,
  bottom: 20
}

// Professional chart heights for different screen sizes
export const CHART_HEIGHTS = {
  mobile: 250,
  tablet: 300,
  desktop: 350,
  large: 400
}

// Get responsive chart height based on screen size
export function getResponsiveHeight(size: 'mobile' | 'tablet' | 'desktop' | 'large' = 'desktop'): number {
  return CHART_HEIGHTS[size]
}

// Get professional axis styling
export function getAxisStyles(isDarkMode: boolean) {
  return {
    tick: {
      fontSize: 12,
      fill: isDarkMode ? '#9ca3af' : '#6b7280',
      fontFamily: 'Tajawal, system-ui, sans-serif'
    },
    axisLine: {
      stroke: isDarkMode ? '#4b5563' : '#d1d5db',
      strokeWidth: 1
    },
    tickLine: {
      stroke: isDarkMode ? '#4b5563' : '#d1d5db',
      strokeWidth: 1
    }
  }
}

// Get professional grid styling
export function getGridStyles(isDarkMode: boolean) {
  return {
    strokeDasharray: '3 3',
    stroke: isDarkMode ? '#374151' : '#e5e7eb',
    strokeOpacity: isDarkMode ? 0.7 : 0.5,
    strokeWidth: 1
  }
}

// Get professional tooltip styling
export function getTooltipStyles(isDarkMode: boolean) {
  return {
    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
    border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
    borderRadius: '8px',
    boxShadow: isDarkMode
      ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
      : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    fontSize: '14px',
    fontWeight: '500',
    color: isDarkMode ? '#f9fafb' : '#1f2937',
    fontFamily: 'Tajawal, system-ui, sans-serif',
    padding: '12px',
    textAlign: 'right' as const,
    direction: 'rtl' as const
  }
}

// Professional pie chart configuration
export function getPieChartConfig(isDarkMode: boolean) {
  return {
    outerRadius: 100,
    innerRadius: 40,
    stroke: isDarkMode ? '#1f2937' : '#ffffff',
    strokeWidth: 2,
    paddingAngle: 2
  }
}

// Professional bar chart configuration
export function getBarChartConfig(isDarkMode: boolean) {
  return {
    radius: [4, 4, 0, 0] as [number, number, number, number],
    strokeWidth: 0
  }
}

// Professional line chart configuration
export function getLineChartConfig(isDarkMode: boolean) {
  return {
    strokeWidth: 3,
    dot: {
      strokeWidth: 2,
      r: 4
    },
    activeDot: {
      r: 6,
      strokeWidth: 2
    }
  }
}

// Professional area chart configuration
export function getAreaChartConfig(isDarkMode: boolean) {
  return {
    strokeWidth: 3,
    fillOpacity: 0.3,
    dot: {
      strokeWidth: 2,
      r: 4
    }
  }
}

// Color schemes for different chart types
export const CHART_COLOR_SCHEMES = {
  // Status colors for appointment/payment states
  status: {
    completed: '#10b981',    // Green
    pending: '#f59e0b',      // Amber
    cancelled: '#ef4444',    // Red
    failed: '#ef4444',       // Red
    scheduled: '#8b5cf6',    // Purple
    noShow: '#6b7280',       // Gray
    refunded: '#6b7280'      // Gray
  },

  // Financial colors for money-related data
  financial: {
    revenue: '#059669',      // Green
    expenses: '#dc2626',     // Red
    profit: '#7c3aed',       // Purple
    pending: '#d97706',      // Amber
    cashFlow: '#0891b2'      // Cyan
  },

  // Medical colors for health-related data
  medical: {
    healthy: '#10b981',      // Green
    warning: '#f59e0b',      // Amber
    critical: '#ef4444',     // Red
    normal: '#3b82f6'        // Blue
  },

  // Inventory colors for stock-related data
  inventory: {
    inStock: '#10b981',      // Green
    lowStock: '#f59e0b',     // Amber
    outOfStock: '#ef4444',   // Red
    expired: '#dc2626'       // Dark red
  }
}

// Get semantic colors for specific data types
export function getSemanticColors(type: keyof typeof CHART_COLOR_SCHEMES, isDarkMode: boolean = false) {
  const colors = CHART_COLOR_SCHEMES[type]

  if (isDarkMode) {
    // Brighten colors for dark mode
    const brightenedColors: Record<string, string> = {}
    Object.entries(colors).forEach(([key, color]) => {
      // Convert hex to RGB and brighten
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)

      // Increase brightness by 15%
      const brightenedR = Math.min(255, Math.round(r * 1.15))
      const brightenedG = Math.min(255, Math.round(g * 1.15))
      const brightenedB = Math.min(255, Math.round(b * 1.15))

      brightenedColors[key] = `#${brightenedR.toString(16).padStart(2, '0')}${brightenedG.toString(16).padStart(2, '0')}${brightenedB.toString(16).padStart(2, '0')}`
    })
    return brightenedColors
  }

  return colors
}

// Format numbers for chart display
export function formatChartNumber(value: number, type: 'currency' | 'percentage' | 'count' = 'count', currency?: string): string {
  switch (type) {
    case 'currency':
      // Import formatCurrency dynamically to avoid circular dependencies
      const { formatCurrency } = require('@/lib/utils')
      // Use dynamic currency formatting without hardcoded currency
      return formatCurrency(value)

    case 'percentage':
      return `${value.toFixed(1)}%`

    case 'count':
    default:
      return new Intl.NumberFormat('en-US').format(value)
  }
}

// Create professional chart label formatter
export function createLabelFormatter(prefix: string = '', suffix: string = '') {
  return (label: string) => `${prefix}${label}${suffix}`
}

// Create professional value formatter for tooltips
export function createValueFormatter(type: 'currency' | 'percentage' | 'count' = 'count', currency?: string) {
  return (value: number, name?: string) => [
    formatChartNumber(value, type, currency),
    name || ''
  ]
}

// Animation configuration for smooth chart transitions
export const CHART_ANIMATIONS = {
  duration: 800,
  easing: 'ease-in-out' as const,
  delay: 0
}

// Export all chart utilities as a single object
export const ChartUtils = {
  getResponsiveHeight,
  getAxisStyles,
  getGridStyles,
  getTooltipStyles,
  getPieChartConfig,
  getBarChartConfig,
  getLineChartConfig,
  getAreaChartConfig,
  getSemanticColors,
  formatChartNumber,
  createLabelFormatter,
  createValueFormatter,
  DEFAULT_CHART_MARGINS,
  CHART_HEIGHTS,
  CHART_ANIMATIONS
}
