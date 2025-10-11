import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Comprehensive currency configuration system
export interface CurrencyConfig {
  code: string
  symbol: string
  name: string
  nameAr: string
  decimals: number
  locale: string
  position: 'before' | 'after'
}

// Supported currencies with full configuration
export const SUPPORTED_CURRENCIES: { [key: string]: CurrencyConfig } = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    nameAr: 'دولار أمريكي',
    decimals: 2,
    locale: 'en-US',
    position: 'before'
  },
  SAR: {
    code: 'SAR',
    symbol: 'ر.س',
    name: 'Saudi Riyal',
    nameAr: 'ريال سعودي',
    decimals: 2,
    locale: 'ar-SA',
    position: 'after'
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    nameAr: 'درهم إماراتي',
    decimals: 2,
    locale: 'ar-AE',
    position: 'after'
  },
  KWD: {
    code: 'KWD',
    symbol: 'د.ك',
    name: 'Kuwaiti Dinar',
    nameAr: 'دينار كويتي',
    decimals: 3,
    locale: 'ar-KW',
    position: 'after'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    nameAr: 'يورو',
    decimals: 2,
    locale: 'en-EU',
    position: 'before'
  },
  EGP: {
    code: 'EGP',
    symbol: 'ج.م',
    name: 'Egyptian Pound',
    nameAr: 'جنيه مصري',
    decimals: 2,
    locale: 'ar-EG',
    position: 'after'
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    nameAr: 'جنيه إسترليني',
    decimals: 2,
    locale: 'en-GB',
    position: 'before'
  },
  QAR: {
    code: 'QAR',
    symbol: 'ر.ق',
    name: 'Qatari Riyal',
    nameAr: 'ريال قطري',
    decimals: 2,
    locale: 'ar-QA',
    position: 'after'
  },
  BHD: {
    code: 'BHD',
    symbol: 'د.ب',
    name: 'Bahraini Dinar',
    nameAr: 'دينار بحريني',
    decimals: 3,
    locale: 'ar-BH',
    position: 'after'
  },
  OMR: {
    code: 'OMR',
    symbol: 'ر.ع',
    name: 'Omani Rial',
    nameAr: 'ريال عماني',
    decimals: 3,
    locale: 'ar-OM',
    position: 'after'
  },
  SYP: {
    code: 'SYP',
    symbol: 'ل.س',
    name: 'Syrian Pound',
    nameAr: 'ليرة سورية',
    decimals: 2,
    locale: 'ar-SY',
    position: 'after'
  },
  TRY: {
    code: 'TRY',
    symbol: '₺',
    name: 'Turkish Lira',
    nameAr: 'ليرة تركية',
    decimals: 2,
    locale: 'tr-TR',
    position: 'after'
  }
}

// Currency mapping for Arabic currency names to ISO codes (backward compatibility)
const currencyMapping: { [key: string]: string } = {
  '$': 'USD',
  '$ أمريكي': 'USD',
  'ريال': 'SAR',
  'ريال سعودي': 'SAR',
  'درهم': 'AED',
  'درهم إماراتي': 'AED',
  'دينار': 'KWD',
  'دينار كويتي': 'KWD',
  'دولار': 'USD',
  'دولار أمريكي': 'USD',
  'يورو': 'EUR',
  'جنيه': 'EGP',
  'جنيه مصري': 'EGP',
  'SAR': 'SAR',
  'AED': 'AED',
  'KWD': 'KWD',
  'USD': 'USD',
  'EUR': 'EUR',
  'EGP': 'EGP',
  'GBP': 'GBP',
  'QAR': 'QAR',
  'BHD': 'BHD',
  'OMR': 'OMR',
  'ليرة': 'SYP',
  'ليرة سورية': 'SYP',
  'SYP': 'SYP',
  'ليرة تركية': 'TRY',
  'تركية': 'TRY',
  'TRY': 'TRY'
}

// Get currency configuration
export function getCurrencyConfig(currencyCode: string): CurrencyConfig {
  const code = currencyMapping[currencyCode] || currencyCode
  return SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.USD
}

// Currency exchange rate configuration
export interface ExchangeRateConfig {
  from: string
  to: string
  rate: number
  lastUpdated: string
}

// Default exchange rates (can be updated from external API or settings)
const DEFAULT_EXCHANGE_RATES: { [key: string]: number } = {
  'USD_TO_SYP': 12500, // 1 USD = 12,500 SYP
  'SYP_TO_USD': 0.00008, // 1 SYP = 0.00008 USD
}

// Exchange rate storage
let exchangeRates = { ...DEFAULT_EXCHANGE_RATES }

// Get default currency from settings store (will be implemented)
let defaultCurrency = 'USD'

export function setDefaultCurrency(currency: string) {
  defaultCurrency = currency
}

export function getDefaultCurrency(): string {
  return defaultCurrency
}

// Currency conversion functions
export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  // If same currency, return original amount
  if (fromCurrency === toCurrency) {
    return amount
  }

  // Handle USD to SYP conversion
  if (fromCurrency === 'USD' && toCurrency === 'SYP') {
    return amount * getExchangeRate('USD_TO_SYP')
  }

  // Handle SYP to USD conversion
  if (fromCurrency === 'SYP' && toCurrency === 'USD') {
    return amount * getExchangeRate('SYP_TO_USD')
  }

  // For other currencies, return original amount (can be extended)
  console.warn(`Currency conversion not supported: ${fromCurrency} to ${toCurrency}`)
  return amount
}

export function getExchangeRate(pair: string): number {
  return exchangeRates[pair] || 1
}

export function setExchangeRate(pair: string, rate: number): void {
  exchangeRates[pair] = rate
}

export function updateExchangeRate(from: string, to: string, rate: number): void {
  const pair = `${from}_TO_${to}`.toUpperCase()
  exchangeRates[pair] = rate
}

export function resetExchangeRates(): void {
  exchangeRates = { ...DEFAULT_EXCHANGE_RATES }
}

export function getExchangeRates(): { [key: string]: number } {
  return { ...exchangeRates }
}

export function formatCurrency(amount: number, currency?: string): string {
  // Always use Western numerals regardless of parameter
  const validAmount = Number(amount)
  if (isNaN(validAmount) || !isFinite(validAmount)) {
    console.warn('Invalid amount for currency formatting:', amount)
    const config = getCurrencyConfig(currency || getDefaultCurrency())
    return formatCurrencyWithConfig(0, config) // Always use Western numerals
  }

  // Use provided currency or default
  const currencyCode = currency || getDefaultCurrency()
  const config = getCurrencyConfig(currencyCode)

  return formatCurrencyWithConfig(validAmount, config) // Always use Western numerals
}

// Enhanced currency formatting with full configuration support and performance optimizations
export function formatCurrencyWithConfig(amount: number, config: CurrencyConfig): string {
  const validAmount = Number(amount)
  if (isNaN(validAmount) || !isFinite(validAmount)) {
    const zeroAmount = `0.${'0'.repeat(config.decimals)}`
    return `${config.symbol}${zeroAmount}` // Always use Western numerals
  }

  try {
    // Use cached formatter for better performance
    const formatter = getCurrencyFormatter(config.locale, config.code, config.decimals)
    const formattedCurrency = formatter.format(validAmount)

    // Always return as-is since we're using English locale
    return formattedCurrency
  } catch (error) {
    // Fallback: manual formatting with symbol positioning
    console.warn(`Error formatting currency ${config.code}, using manual formatting`)

    try {
      const formatter = getNumberFormatter('en-US', {
        minimumFractionDigits: config.decimals,
        maximumFractionDigits: config.decimals,
      })
      const formattedNumber = formatter.format(validAmount)

      if (config.position === 'before') {
        return `${config.symbol}${formattedNumber}`
      } else {
        return `${formattedNumber} ${config.symbol}`
      }
    } catch (fallbackError) {
      // Ultimate fallback: simple formatting
      const fixedAmount = validAmount.toFixed(config.decimals)

      if (config.position === 'before') {
        return `${config.symbol}${fixedAmount}`
      } else {
        return `${fixedAmount} ${config.symbol}`
      }
    }
  }
}

// Format currency with symbol only (no decimals for display) - optimized
export function formatCurrencySymbol(amount: number, currency?: string): string {
  const currencyCode = currency || getDefaultCurrency()
  const config = getCurrencyConfig(currencyCode)

  const validAmount = Number(amount)
  if (isNaN(validAmount) || !isFinite(validAmount)) {
    return config.symbol
  }

  try {
    // Use cached formatter for better performance
    const formatter = getNumberFormatter(config.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
    const formattedNumber = formatter.format(Math.round(validAmount))

    if (config.position === 'before') {
      return `${config.symbol}${formattedNumber}`
    } else {
      return `${formattedNumber} ${config.symbol}`
    }
  } catch (error) {
    const roundedAmount = Math.round(validAmount).toString()

    if (config.position === 'before') {
      return `${config.symbol}${roundedAmount}`
    } else {
      return `${roundedAmount} ${config.symbol}`
    }
  }
}

// Import Gregorian calendar configuration
import { GREGORIAN_MONTHS_AR, formatGregorianMonthYear as formatGregorianMonthYearCore, parseGregorianMonthString } from './gregorianCalendar'

// Gregorian months in Arabic - التقويم الميلادي
// This application uses ONLY Gregorian calendar system
const gregorianMonths = GREGORIAN_MONTHS_AR

// Using English numerals only - no conversion needed

// Cache for Intl.NumberFormat instances to improve performance
const numberFormatCache = new Map<string, Intl.NumberFormat>()
const currencyFormatCache = new Map<string, Intl.NumberFormat>()

function getNumberFormatter(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const cacheKey = `${locale}-${JSON.stringify(options)}`

  if (!numberFormatCache.has(cacheKey)) {
    // Always use English locale for number formatting to ensure Western numerals
    numberFormatCache.set(cacheKey, new Intl.NumberFormat('en-US', options))
  }

  return numberFormatCache.get(cacheKey)!
}

function getCurrencyFormatter(locale: string, currency: string, decimals: number): Intl.NumberFormat {
  const cacheKey = `${locale}-${currency}-${decimals}`

  if (!currencyFormatCache.has(cacheKey)) {
    // Always use English locale for number formatting to ensure Western numerals
    currencyFormatCache.set(cacheKey, new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }))
  }

  return currencyFormatCache.get(cacheKey)!
}

// Removed unused function

// Removed unused functions - always use Western numerals

export function formatDate(dateString: string | Date | null | undefined): string {
  // Handle null, undefined, or empty string cases
  if (!dateString) {
    return '--'
  }

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return '--'
    }

    // Using Gregorian calendar system - التقويم الميلادي
    const day = date.getDate()
    const month = date.getMonth() + 1 // Add 1 because getMonth() returns 0-11
    const year = date.getFullYear()

    // Format as DD/MM/YYYY (Gregorian format)
    const formattedDay = day.toString().padStart(2, '0')
    const formattedMonth = month.toString().padStart(2, '0')

    return `${formattedDay}/${formattedMonth}/${year}`
  } catch (error) {
    console.warn('Error formatting date:', error, 'Input:', dateString)
    return '--'
  }
}

// formatGregorianDate function - same as formatDate since we're using Gregorian calendar
export function formatGregorianDate(dateString: string | Date): string {
  return formatDate(dateString)
}

export function formatDateTime(dateString: string | Date | null | undefined): string {
  // Handle null, undefined, or empty string cases
  if (!dateString) {
    return '--'
  }

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return '--'
    }

    // Using Gregorian calendar system - التقويم الميلادي
    const day = date.getDate()
    const month = date.getMonth() + 1 // Add 1 because getMonth() returns 0-11
    const year = date.getFullYear()

    // Format date as DD/MM/YYYY (Gregorian format)
    const formattedDay = day.toString().padStart(2, '0')
    const formattedMonth = month.toString().padStart(2, '0')
    const formattedDate = `${formattedDay}/${formattedMonth}/${year}`

    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })

    return `${formattedDate} - ${time}`
  } catch (error) {
    console.warn('Error formatting date time:', error, 'Input:', dateString)
    return '--'
  }
}

export function formatTime(dateString: string | null | undefined): string {
  // Handle null, undefined, or empty string cases
  if (!dateString) {
    return '--'
  }

  try {
    const date = new Date(dateString)

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return '--'
    }

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  } catch (error) {
    console.warn('Error formatting time:', error, 'Input:', dateString)
    return '--'
  }
}

export function getCurrentGregorianDate(): string {
  const today = new Date()
  return formatDate(today)
}

/**
 * حساب بداية الأسبوع (الأحد)
 * Calculate start of week (Sunday)
 */
export function getWeekStart(date: Date = new Date()): Date {
  const weekStart = new Date(date)
  const dayOfWeek = weekStart.getDay() // 0 = الأحد، 1 = الاثنين، إلخ
  weekStart.setDate(date.getDate() - dayOfWeek)
  weekStart.setHours(0, 0, 0, 0) // تعيين بداية اليوم
  return weekStart
}

/**
 * حساب نهاية الأسبوع (السبت)
 * Calculate end of week (Saturday)
 */
export function getWeekEnd(date: Date = new Date()): Date {
  const weekEnd = new Date(date)
  const dayOfWeek = weekEnd.getDay() // 0 = الأحد، 1 = الاثنين، إلخ
  weekEnd.setDate(date.getDate() + (6 - dayOfWeek))
  weekEnd.setHours(23, 59, 59, 999) // تعيين نهاية اليوم
  return weekEnd
}

export function getGregorianMonthName(monthNumber: number): string {
  return gregorianMonths[monthNumber] || ''
}

// Format month and year using Gregorian calendar with Arabic month names
export function formatGregorianMonthYear(year: number, monthIndex: number): string {
  return formatGregorianMonthYearCore(year, monthIndex)
}

// Parse YYYY-MM format and return Gregorian month name with year
export function parseAndFormatGregorianMonth(monthString: string): string {
  return parseGregorianMonthString(monthString)
}

// Function to get status color (keeping existing functionality)
export function getStatusColor(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'bg-primary/10 text-primary border-primary/20'
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
    case 'cancelled':
      return 'bg-destructive/10 text-destructive border-destructive/20'
    case 'no_show':
      return 'bg-muted text-muted-foreground border-border'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

// Professional chart color schemes for better data visualization
export const chartColorSchemes = {
  // Primary color scheme - Professional blues and teals
  primary: [
    '#0ea5e9', // Sky blue
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#1e40af', // Dark blue
    '#0284c7', // Sky 600
    '#0369a1', // Sky 700
    '#075985', // Sky 800
    '#0c4a6e'  // Sky 900
  ],

  // Medical color scheme - Health-focused colors
  medical: [
    '#10b981', // Emerald (success/healthy)
    '#059669', // Emerald 600
    '#047857', // Emerald 700
    '#065f46', // Emerald 800
    '#064e3b', // Emerald 900
    '#22c55e', // Green 500
    '#16a34a', // Green 600
    '#15803d'  // Green 700
  ],

  // Status color scheme - For appointment/payment statuses
  status: [
    '#10b981', // Completed (green)
    '#f59e0b', // Pending (amber)
    '#ef4444', // Cancelled/Failed (red)
    '#6b7280', // No show (gray)
    '#8b5cf6', // Scheduled (purple)
    '#06b6d4', // In progress (cyan)
    '#f97316', // Warning (orange)
    '#ec4899'  // Priority (pink)
  ],

  // Financial color scheme - Money-related visualizations
  financial: [
    '#059669', // Revenue (green)
    '#dc2626', // Expenses (red)
    '#d97706', // Pending (amber)
    '#7c3aed', // Profit (purple)
    '#0891b2', // Cash flow (cyan)
    '#be185d', // Debt (pink)
    '#ea580c', // Investment (orange)
    '#4338ca'  // Savings (indigo)
  ],

  // Categorical color scheme - For diverse data categories
  categorical: [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#ec4899', // Pink
    '#84cc16', // Lime
    '#6366f1'  // Indigo
  ],

  // Gradient color scheme - For area charts and backgrounds
  gradients: {
    blue: ['#dbeafe', '#3b82f6'],
    green: ['#dcfce7', '#10b981'],
    purple: ['#f3e8ff', '#8b5cf6'],
    orange: ['#fed7aa', '#f97316'],
    red: ['#fecaca', '#ef4444'],
    cyan: ['#cffafe', '#06b6d4']
  },

  // Inventory color scheme - For stock and supply management
  inventory: [
    '#10b981', // In stock (green)
    '#f59e0b', // Low stock (amber)
    '#ef4444', // Out of stock (red)
    '#8b5cf6', // Ordered (purple)
    '#06b6d4', // Received (cyan)
    '#f97316', // Expired (orange)
    '#ec4899', // Reserved (pink)
    '#6b7280'  // Discontinued (gray)
  ],

  // Patient demographics color scheme
  demographics: [
    '#3b82f6', // Male (blue)
    '#ec4899', // Female (pink)
    '#10b981', // Adult (green)
    '#f59e0b', // Senior (amber)
    '#8b5cf6', // Child (purple)
    '#06b6d4', // Teen (cyan)
    '#f97316', // Infant (orange)
    '#6b7280'  // Unknown (gray)
  ],

  // Treatment type color scheme
  treatments: [
    '#10b981', // Cleaning (green)
    '#3b82f6', // Filling (blue)
    '#8b5cf6', // Root canal (purple)
    '#f59e0b', // Crown (amber)
    '#ef4444', // Extraction (red)
    '#06b6d4', // Orthodontics (cyan)
    '#f97316', // Implant (orange)
    '#ec4899'  // Cosmetic (pink)
  ]
}

// Get theme-aware chart colors
export function getChartColors(scheme: keyof typeof chartColorSchemes = 'primary', isDarkMode: boolean = false): string[] {
  const colors = chartColorSchemes[scheme]

  // Ensure colors is an array
  if (!Array.isArray(colors)) {
    return []
  }

  if (isDarkMode) {
    // Brighten colors for dark mode
    return colors.map((color: string) => {
      // Convert hex to RGB and brighten
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)

      // Increase brightness by 20%
      const brightenedR = Math.min(255, Math.round(r * 1.2))
      const brightenedG = Math.min(255, Math.round(g * 1.2))
      const brightenedB = Math.min(255, Math.round(b * 1.2))

      return `#${brightenedR.toString(16).padStart(2, '0')}${brightenedG.toString(16).padStart(2, '0')}${brightenedB.toString(16).padStart(2, '0')}`
    })
  }

  return colors
}

// Enhanced professional chart configuration
export const chartConfig = {
  // Responsive breakpoints with improved heights
  responsive: {
    mobile: { width: '100%', height: 280 },
    tablet: { width: '100%', height: 320 },
    desktop: { width: '100%', height: 380 },
    large: { width: '100%', height: 420 }
  },

  // Grid and axis styling
  grid: {
    strokeDasharray: '3 3',
    stroke: '#e5e7eb', // Light gray
    strokeOpacity: 0.5
  },

  darkGrid: {
    strokeDasharray: '3 3',
    stroke: '#374151', // Dark gray
    strokeOpacity: 0.7
  },

  // Enhanced axis styling
  axis: {
    light: {
      tick: { fontSize: 12, fill: '#6b7280', fontFamily: 'Inter, sans-serif' },
      axisLine: { stroke: '#d1d5db', strokeWidth: 1 },
      tickLine: { stroke: '#d1d5db', strokeWidth: 1 }
    },
    dark: {
      tick: { fontSize: 12, fill: '#9ca3af', fontFamily: 'Inter, sans-serif' },
      axisLine: { stroke: '#4b5563', strokeWidth: 1 },
      tickLine: { stroke: '#4b5563', strokeWidth: 1 }
    }
  },

  // Enhanced tooltip styling with RTL support
  tooltip: {
    contentStyle: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      fontSize: '14px',
      fontWeight: '500',
      fontFamily: 'Inter, sans-serif',
      direction: 'rtl',
      textAlign: 'right'
    },

    darkContentStyle: {
      backgroundColor: '#1f2937',
      border: '1px solid #374151',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
      fontSize: '14px',
      fontWeight: '500',
      color: '#f9fafb',
      fontFamily: 'Inter, sans-serif',
      direction: 'rtl',
      textAlign: 'right'
    }
  },

  // Enhanced animation settings
  animation: {
    duration: 800,
    easing: 'ease-in-out',
    delay: 0
  },

  // Chart-specific configurations
  pie: {
    outerRadius: 120,
    innerRadius: 50,
    paddingAngle: 2,
    strokeWidth: 2
  },

  bar: {
    radius: [4, 4, 0, 0],
    minPointSize: 5,
    maxBarSize: 100,
    barCategoryGap: '20%'
  },

  line: {
    strokeWidth: 3,
    dot: { strokeWidth: 2, r: 4 },
    activeDot: { r: 6, strokeWidth: 2 }
  },

  area: {
    strokeWidth: 3,
    fillOpacity: 0.3
  }
}

// Get enhanced chart configuration based on theme
export function getChartConfig(isDarkMode: boolean = false) {
  return {
    ...chartConfig,
    grid: isDarkMode ? chartConfig.darkGrid : chartConfig.grid,
    tooltip: isDarkMode ? chartConfig.tooltip.darkContentStyle : chartConfig.tooltip.contentStyle,
    axis: isDarkMode ? chartConfig.axis.dark : chartConfig.axis.light
  }
}

// Get chart colors with automatic fallback
export function getChartColorsWithFallback(
  scheme: keyof typeof chartColorSchemes = 'primary',
  isDarkMode: boolean = false,
  dataLength: number = 1
): string[] {
  const colors = getChartColors(scheme, isDarkMode)

  // If we need more colors than available, cycle through them
  if (dataLength > colors.length) {
    const result: string[] = []
    for (let i = 0; i < dataLength; i++) {
      result.push(colors[i % colors.length])
    }
    return result
  }

  return colors.slice(0, dataLength)
}

// Format chart values with proper currency and number formatting
export function formatChartValue(
  value: number,
  type: 'currency' | 'percentage' | 'number' = 'number',
  currency?: string
): string {
  // Always use Western numerals regardless of parameter
  const validValue = Number(value)
  if (isNaN(validValue) || !isFinite(validValue)) {
    console.warn('Invalid value for chart formatting:', value)
    switch (type) {
      case 'currency':
        const config = getCurrencyConfig(currency || getDefaultCurrency())
        const zeroAmount = `0.${'0'.repeat(config.decimals)}`
        return `${config.symbol}${zeroAmount}`
      case 'percentage':
        return '0%'
      case 'number':
      default:
        return '0'
    }
  }

  try {
    switch (type) {
      case 'currency':
        return formatCurrency(validValue, currency || getDefaultCurrency()) // Always use Western numerals
      case 'percentage':
        const percentage = Math.round(validValue * 10) / 10
        return `${isNaN(percentage) ? 0 : percentage}%`
      case 'number':
      default:
        try {
          const formattedNumber = validValue.toLocaleString('en-US', { maximumFractionDigits: 2 })
          return formattedNumber
        } catch (localeError) {
          // Fallback to simple formatting
          const fixedNumber = validValue.toFixed(2)
          return fixedNumber
        }
    }
  } catch (error) {
    console.warn('Error formatting chart value:', error)
    return validValue.toString()
  }
}

// Function to get initials from full name
export function getInitials(fullName: string): string {
  if (!fullName) return '??'

  const names = fullName.trim().split(' ')
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase()
  }

  // Take first letter of first name and first letter of last name
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
}

// Function to calculate age from date of birth (keeping for backward compatibility)
export function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}
