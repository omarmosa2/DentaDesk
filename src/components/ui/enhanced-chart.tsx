/**
 * Enhanced Chart Component
 * Professional, theme-aware chart wrapper with consistent styling
 */

import React from 'react'
import { ResponsiveContainer } from 'recharts'
import { useTheme } from '@/contexts/ThemeContext'
import { getChartConfig } from '@/lib/utils'
import { ChartUtils } from '@/lib/chartHelpers'

interface EnhancedChartProps {
  children: React.ReactNode
  height?: number | 'mobile' | 'tablet' | 'desktop' | 'large'
  className?: string
  margin?: { top: number; right: number; left: number; bottom: number }
}

export function EnhancedChart({ 
  children, 
  height = 'desktop', 
  className = '',
  margin = ChartUtils.DEFAULT_CHART_MARGINS
}: EnhancedChartProps) {
  const { isDarkMode } = useTheme()
  
  // Get responsive height
  const chartHeight = typeof height === 'number' 
    ? height 
    : ChartUtils.getResponsiveHeight(height)

  return (
    <div className={`chart-container ${className}`}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        {React.cloneElement(children as React.ReactElement, {
          margin,
          ...((children as React.ReactElement).props || {})
        })}
      </ResponsiveContainer>
    </div>
  )
}

// Enhanced Pie Chart with professional styling
interface EnhancedPieChartProps {
  data: any[]
  dataKey: string
  nameKey?: string
  colors?: string[]
  showLabels?: boolean
  showTooltip?: boolean
  innerRadius?: number
  outerRadius?: number
  className?: string
}

export function EnhancedPieChart({
  data,
  dataKey,
  nameKey = 'name',
  colors,
  showLabels = true,
  showTooltip = true,
  innerRadius = 40,
  outerRadius = 100,
  className = ''
}: EnhancedPieChartProps) {
  const { isDarkMode } = useTheme()
  const chartConfig = getChartConfig(isDarkMode)
  
  return (
    <EnhancedChart className={className}>
      <div>
        {/* This would contain the actual Recharts PieChart component */}
        {/* Implementation would go here with proper styling */}
      </div>
    </EnhancedChart>
  )
}

// Enhanced Bar Chart with professional styling
interface EnhancedBarChartProps {
  data: any[]
  dataKey: string
  xAxisKey: string
  color?: string
  showGrid?: boolean
  showTooltip?: boolean
  className?: string
}

export function EnhancedBarChart({
  data,
  dataKey,
  xAxisKey,
  color,
  showGrid = true,
  showTooltip = true,
  className = ''
}: EnhancedBarChartProps) {
  const { isDarkMode } = useTheme()
  const chartConfig = getChartConfig(isDarkMode)
  
  return (
    <EnhancedChart className={className}>
      <div>
        {/* This would contain the actual Recharts BarChart component */}
        {/* Implementation would go here with proper styling */}
      </div>
    </EnhancedChart>
  )
}

// Enhanced Line Chart with professional styling
interface EnhancedLineChartProps {
  data: any[]
  dataKey: string
  xAxisKey: string
  color?: string
  showGrid?: boolean
  showTooltip?: boolean
  showDots?: boolean
  className?: string
}

export function EnhancedLineChart({
  data,
  dataKey,
  xAxisKey,
  color,
  showGrid = true,
  showTooltip = true,
  showDots = true,
  className = ''
}: EnhancedLineChartProps) {
  const { isDarkMode } = useTheme()
  const chartConfig = getChartConfig(isDarkMode)
  
  return (
    <EnhancedChart className={className}>
      <div>
        {/* This would contain the actual Recharts LineChart component */}
        {/* Implementation would go here with proper styling */}
      </div>
    </EnhancedChart>
  )
}

// Enhanced Area Chart with professional styling
interface EnhancedAreaChartProps {
  data: any[]
  dataKey: string
  xAxisKey: string
  color?: string
  showGrid?: boolean
  showTooltip?: boolean
  fillOpacity?: number
  className?: string
}

export function EnhancedAreaChart({
  data,
  dataKey,
  xAxisKey,
  color,
  showGrid = true,
  showTooltip = true,
  fillOpacity = 0.3,
  className = ''
}: EnhancedAreaChartProps) {
  const { isDarkMode } = useTheme()
  const chartConfig = getChartConfig(isDarkMode)
  
  return (
    <EnhancedChart className={className}>
      <div>
        {/* This would contain the actual Recharts AreaChart component */}
        {/* Implementation would go here with proper styling */}
      </div>
    </EnhancedChart>
  )
}

// Chart Legend Component
interface ChartLegendProps {
  items: Array<{
    name: string
    color: string
    value?: number | string
  }>
  className?: string
}

export function ChartLegend({ items, className = '' }: ChartLegendProps) {
  return (
    <div className={`flex flex-wrap gap-4 justify-center mt-4 ${className}`} dir="rtl">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm text-muted-foreground chart-legend">
            {item.name}
            {item.value && (
              <span className="font-medium text-foreground mr-1">
                ({item.value})
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

// Chart Loading State
export function ChartLoading({ height = 300 }: { height?: number }) {
  return (
    <div 
      className="flex items-center justify-center bg-muted/20 rounded-lg animate-pulse"
      style={{ height }}
    >
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">جاري تحميل المخطط...</p>
      </div>
    </div>
  )
}

// Chart Error State
export function ChartError({ 
  message = 'حدث خطأ في تحميل المخطط',
  onRetry,
  height = 300 
}: { 
  message?: string
  onRetry?: () => void
  height?: number 
}) {
  return (
    <div 
      className="flex items-center justify-center bg-destructive/5 border border-destructive/20 rounded-lg"
      style={{ height }}
    >
      <div className="text-center">
        <div className="w-8 h-8 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-2">
          <span className="text-destructive text-sm">!</span>
        </div>
        <p className="text-sm text-destructive mb-2">{message}</p>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="text-xs text-primary hover:underline"
          >
            إعادة المحاولة
          </button>
        )}
      </div>
    </div>
  )
}

// Chart Empty State
export function ChartEmpty({ 
  message = 'لا توجد بيانات للعرض',
  height = 300 
}: { 
  message?: string
  height?: number 
}) {
  return (
    <div 
      className="flex items-center justify-center bg-muted/10 rounded-lg"
      style={{ height }}
    >
      <div className="text-center">
        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center mx-auto mb-2">
          <span className="text-muted-foreground text-sm">📊</span>
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

export default EnhancedChart
