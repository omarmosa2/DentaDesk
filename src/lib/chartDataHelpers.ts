/**
 * Enhanced Chart Data Helpers
 * Utilities to ensure proper data formatting and display for all chart types
 * Includes comprehensive data validation, accuracy improvements, and real-time data integration
 */

import { formatCurrency, formatDate } from './utils'

// Enhanced data validation helpers with comprehensive checks
export function validateNumericData(data: any[]): boolean {
  if (!Array.isArray(data) || data.length === 0) return false

  return data.every(item =>
    typeof item === 'object' &&
    item !== null &&
    Object.values(item).some(value =>
      typeof value === 'number' &&
      !isNaN(value) &&
      isFinite(value)
    )
  )
}

export function validateDateData(data: any[], dateField: string): boolean {
  if (!Array.isArray(data) || data.length === 0) return false

  return data.every(item => {
    const dateValue = item[dateField]
    if (!dateValue) return false

    const date = new Date(dateValue)
    return !isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100
  })
}

// Enhanced data transformation helpers with accuracy improvements
export function transformToChartData<T extends Record<string, any>>(
  data: T[],
  keyField: string,
  valueField: string,
  labelTransform?: (key: string) => string
): Array<{ name: string; value: number }> {
  if (!Array.isArray(data) || data.length === 0) {
    return []
  }

  const result = data
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const value = Number(item[valueField])
      return {
        name: labelTransform ? labelTransform(item[keyField]) : String(item[keyField] || 'غير محدد'),
        value: isNaN(value) ? 0 : Math.round(value * 100) / 100 // Round to 2 decimal places
      }
    })
    .filter(item => item.value > 0)

  return result
}

export function groupDataByPeriod<T extends Record<string, any>>(
  data: T[],
  dateField: string,
  valueField: string,
  period: 'day' | 'week' | 'month' | 'year' = 'month'
): Array<{ period: string; value: number; count: number }> {
  if (!Array.isArray(data) || data.length === 0) {
    return []
  }

  const groups: Record<string, { value: number; count: number }> = {}

  data.forEach(item => {
    if (!item || typeof item !== 'object') return

    const date = new Date(item[dateField])
    if (isNaN(date.getTime())) return

    let periodKey: string
    switch (period) {
      case 'day':
        periodKey = formatDate(date, 'short') // Use DD/MM/YYYY format
        break
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        periodKey = formatDate(weekStart, 'short')
        break
      case 'month':
        periodKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
        break
      case 'year':
        periodKey = String(date.getFullYear())
        break
      default:
        periodKey = formatDate(date, 'short')
    }

    if (!groups[periodKey]) {
      groups[periodKey] = { value: 0, count: 0 }
    }

    const value = Number(item[valueField])
    if (!isNaN(value) && isFinite(value)) {
      groups[periodKey].value += value
      groups[periodKey].count += 1
    }
  })

  return Object.entries(groups)
    .map(([period, data]) => ({
      period,
      value: Math.round(data.value * 100) / 100, // Round to 2 decimal places
      count: data.count
    }))
    .sort((a, b) => {
      // Enhanced sorting for different period formats
      if (period === 'month') {
        const [monthA, yearA] = a.period.split('/')
        const [monthB, yearB] = b.period.split('/')
        return new Date(Number(yearA), Number(monthA) - 1).getTime() -
               new Date(Number(yearB), Number(monthB) - 1).getTime()
      }
      return a.period.localeCompare(b.period)
    })
}

// Enhanced financial data processing with USD currency support
export function processFinancialData(
  data: any[],
  amountField: string = 'amount',
  currency: string = 'USD'
): Array<{ label: string; amount: number; formattedAmount: string }> {
  if (!Array.isArray(data) || data.length === 0) {
    return []
  }

  return data
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const amount = Number(item[amountField])
      const validAmount = isNaN(amount) ? 0 : Math.round(amount * 100) / 100

      return {
        label: String(item.label || item.name || 'غير محدد'),
        amount: validAmount,
        formattedAmount: formatCurrency(validAmount, currency)
      }
    })
    .filter(item => item.amount > 0)
    .sort((a, b) => b.amount - a.amount) // Sort by amount descending
}

// Ensure gender distribution includes both male and female
export function ensureGenderDistribution(data: Array<{ gender: string; count: number }>) {
  // The data now comes with Arabic labels already from the service
  return data.filter(item => item.count > 0).map(item => ({
    ...item,
    gender: item.gender || 'غير محدد'
  }))
}

// Ensure age distribution includes all age groups with data
export function ensureAgeDistribution(data: Array<{ ageGroup: string; count: number }>) {
  return data.filter(item => item.count > 0).map(item => ({
    ...item,
    ageGroup: item.ageGroup || 'غير محدد'
  }))
}

// Ensure appointment status includes all statuses with data
export function ensureAppointmentStatusData(data: Array<{ name: string; value: number; color: string }>) {
  return data.filter(item => item.value > 0)
}

// Ensure payment status includes all statuses with data
export function ensurePaymentStatusData(data: Array<{ name: string; value: number; color: string }>) {
  return data.filter(item => item.value > 0)
}

// Ensure payment method data includes all methods with data
export function ensurePaymentMethodData(data: Array<{ method: string; amount: number }>) {
  return data.filter(item => item.amount > 0).map(item => ({
    ...item,
    method: item.method || 'غير محدد'
  }))
}

// Ensure inventory category data includes all categories with data
export function ensureInventoryCategoryData(data: Array<{ category: string; count: number }>) {
  return data.filter(item => item.count > 0).map(item => ({
    ...item,
    category: item.category || 'غير محدد'
  }))
}

// Ensure supplier data includes all suppliers with data
export function ensureSupplierData(data: Array<{ supplier: string; count: number }>) {
  return data.filter(item => item.count > 0).map(item => ({
    ...item,
    supplier: item.supplier || 'غير محدد'
  })).slice(0, 10) // Limit to top 10 suppliers
}

// Ensure monthly data includes all months with data
export function ensureMonthlyData(data: Array<{ month: string; count?: number; revenue?: number; usage?: number }>) {
  return data.filter(item =>
    (item.count && item.count > 0) ||
    (item.revenue && item.revenue > 0) ||
    (item.usage && item.usage > 0)
  ).map(item => ({
    ...item,
    month: item.month || 'غير محدد'
  }))
}

// Format chart data for better display
export function formatChartData<T extends Record<string, any>>(
  data: T[],
  options: {
    filterEmpty?: boolean
    maxItems?: number
    sortBy?: keyof T
    sortOrder?: 'asc' | 'desc'
  } = {}
): T[] {
  let result = [...data]

  // Filter empty values if requested
  if (options.filterEmpty) {
    result = result.filter(item => {
      const values = Object.values(item)
      return values.some(value =>
        typeof value === 'number' ? value > 0 : Boolean(value)
      )
    })
  }

  // Sort if requested
  if (options.sortBy) {
    result.sort((a, b) => {
      const aVal = a[options.sortBy!]
      const bVal = b[options.sortBy!]

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return options.sortOrder === 'desc' ? bVal - aVal : aVal - bVal
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return options.sortOrder === 'desc'
          ? bVal.localeCompare(aVal, 'ar')
          : aVal.localeCompare(bVal, 'ar')
      }

      return 0
    })
  }

  // Limit items if requested
  if (options.maxItems && options.maxItems > 0) {
    result = result.slice(0, options.maxItems)
  }

  return result
}

// Validate chart data before rendering
export function validateChartData(data: any[], requiredFields: string[]): boolean {
  if (!Array.isArray(data) || data.length === 0) {
    return false
  }

  return data.every(item =>
    requiredFields.every(field =>
      item.hasOwnProperty(field) && item[field] !== undefined && item[field] !== null
    )
  )
}

// Get chart data with fallback
export function getChartDataWithFallback<T>(
  data: T[] | null | undefined,
  fallback: T[] = [],
  validator?: (data: T[]) => boolean
): T[] {
  if (!data || !Array.isArray(data)) {
    return fallback
  }

  if (validator && !validator(data)) {
    return fallback
  }

  return data
}

// Create empty state data for charts
export function createEmptyChartData(type: 'pie' | 'bar' | 'line' | 'area') {
  switch (type) {
    case 'pie':
      return [{ name: 'لا توجد بيانات', value: 1, color: '#e5e7eb' }]
    case 'bar':
      return [{ name: 'لا توجد بيانات', value: 0 }]
    case 'line':
    case 'area':
      return [{ name: 'لا توجد بيانات', value: 0 }]
    default:
      return []
  }
}

// Calculate percentages for pie charts
export function calculatePercentages<T extends { value: number }>(data: T[]): (T & { percentage: number })[] {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (total === 0) {
    return data.map(item => ({ ...item, percentage: 0 }))
  }

  return data.map(item => ({
    ...item,
    percentage: (item.value / total) * 100
  }))
}

// Generate chart colors based on data length
export function generateChartColors(dataLength: number, colorScheme: string[] = []): string[] {
  const defaultColors = [
    '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6366f1'
  ]

  const colors = colorScheme.length > 0 ? colorScheme : defaultColors
  const result: string[] = []

  for (let i = 0; i < dataLength; i++) {
    result.push(colors[i % colors.length])
  }

  return result
}

// Format labels for Arabic display
export function formatArabicLabel(label: string): string {
  const labelMap: Record<string, string> = {
    'male': 'ذكر',
    'female': 'أنثى',
    'completed': 'مكتمل',
    'pending': 'آجل',
    'cancelled': 'ملغي',
    'scheduled': 'مجدول',
    'no_show': 'لم يحضر',
    'failed': 'فاشل',
    'refunded': 'مسترد',
    'cash': 'نقداً',
    'card': 'بطاقة ائتمان',
    'bank_transfer': 'تحويل بنكي',
    'check': 'شيك',
    'insurance': 'تأمين'
  }

  return labelMap[label] || label
}

// Ensure minimum bar height for visibility
export function ensureMinimumBarHeight(data: Array<{ value: number }>, minHeight: number = 1) {
  return data.map(item => ({
    ...item,
    value: Math.max(item.value, item.value > 0 ? minHeight : 0)
  }))
}

// Group small values into "أخرى" category for pie charts
export function groupSmallValues<T extends { value: number; name: string }>(
  data: T[],
  threshold: number = 5 // percentage
): T[] {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const thresholdValue = (total * threshold) / 100

  const largeItems = data.filter(item => item.value >= thresholdValue)
  const smallItems = data.filter(item => item.value < thresholdValue)

  if (smallItems.length === 0) {
    return largeItems
  }

  const otherValue = smallItems.reduce((sum, item) => sum + item.value, 0)
  const otherItem = {
    ...smallItems[0],
    name: 'أخرى',
    value: otherValue
  }

  return [...largeItems, otherItem]
}
