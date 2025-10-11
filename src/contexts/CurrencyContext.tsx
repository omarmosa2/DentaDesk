import React, { createContext, useContext, useEffect, ReactNode, useMemo, useCallback } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import {
  CurrencyConfig,
  getCurrencyConfig,
  setDefaultCurrency,
  getDefaultCurrency,
  SUPPORTED_CURRENCIES,
  formatCurrency,
  formatCurrencyWithConfig,
  formatCurrencySymbol
} from '../lib/utils'

interface CurrencyContextType {
  // Current currency configuration
  currentCurrency: string
  currencyConfig: CurrencyConfig
  useArabicNumerals: boolean

  // Currency management
  setCurrency: (currency: string) => void
  setUseArabicNumerals: (useArabic: boolean) => void
  getSupportedCurrencies: () => { [key: string]: CurrencyConfig }

  // Formatting functions that use current currency
  formatAmount: (amount: number, currency?: string, useArabicNumerals?: boolean) => string
  formatAmountSymbol: (amount: number, currency?: string, useArabicNumerals?: boolean) => string
  formatAmountWithConfig: (amount: number, config?: CurrencyConfig, useArabicNumerals?: boolean) => string

  // Currency information
  getCurrencySymbol: (currency?: string) => string
  getCurrencyName: (currency?: string, useArabic?: boolean) => string
  getCurrencyDecimals: (currency?: string) => number
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

interface CurrencyProviderProps {
  children: ReactNode
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const { currency, setCurrency: setStoreCurrency, useArabicNumerals, setUseArabicNumerals, settings, loadSettings } = useSettingsStore()

  // Load settings on mount if not already loaded
  useEffect(() => {
    if (!settings) {
      loadSettings()
    }
  }, [settings, loadSettings])

  // Get current currency from settings or default
  const currentCurrency = currency || settings?.currency || 'USD'
  const currencyConfig = getCurrencyConfig(currentCurrency)

  // Update default currency when it changes
  useEffect(() => {
    setDefaultCurrency(currentCurrency)
  }, [currentCurrency])

  // Currency management functions
  const setCurrency = useCallback((newCurrency: string) => {
    if (SUPPORTED_CURRENCIES[newCurrency]) {
      setStoreCurrency(newCurrency)
      setDefaultCurrency(newCurrency)
    } else {
      console.warn(`Unsupported currency: ${newCurrency}`)
    }
  }, [setStoreCurrency])

  const handleSetUseArabicNumerals = useCallback((useArabic: boolean) => {
    setUseArabicNumerals(useArabic)
  }, [setUseArabicNumerals])

  const getSupportedCurrencies = useCallback(() => {
    return SUPPORTED_CURRENCIES
  }, [])

  // Always use Western numerals regardless of settings
  const currentUseArabicNumerals = false

  // Formatting functions that use current currency by default - always use Western numerals with thousands separators
  const formatAmount = useCallback((amount: number, currency?: string, useArabicNumeralsOverride?: boolean) => {
    return formatCurrency(amount, currency || currentCurrency)
  }, [currentCurrency])

  const formatAmountSymbol = useCallback((amount: number, currency?: string, useArabicNumeralsOverride?: boolean) => {
    return formatCurrencySymbol(amount, currency || currentCurrency)
  }, [currentCurrency])

  const formatAmountWithConfig = useCallback((amount: number, config?: CurrencyConfig, useArabicNumeralsOverride?: boolean) => {
    return formatCurrencyWithConfig(amount, config || currencyConfig)
  }, [currencyConfig])

  // Currency information functions
  const getCurrencySymbol = useCallback((currency?: string) => {
    const config = getCurrencyConfig(currency || currentCurrency)
    return config.symbol
  }, [currentCurrency])

  const getCurrencyName = useCallback((currency?: string, useArabic: boolean = false) => {
    const config = getCurrencyConfig(currency || currentCurrency)
    return useArabic ? config.nameAr : config.name
  }, [currentCurrency])

  const getCurrencyDecimals = useCallback((currency?: string) => {
    const config = getCurrencyConfig(currency || currentCurrency)
    return config.decimals
  }, [currentCurrency])

  const contextValue = useMemo<CurrencyContextType>(() => ({
    // Current currency configuration
    currentCurrency,
    currencyConfig,
    useArabicNumerals: currentUseArabicNumerals,

    // Currency management
    setCurrency,
    setUseArabicNumerals: handleSetUseArabicNumerals,
    getSupportedCurrencies,

    // Formatting functions
    formatAmount,
    formatAmountSymbol,
    formatAmountWithConfig,

    // Currency information
    getCurrencySymbol,
    getCurrencyName,
    getCurrencyDecimals
  }), [
    currentCurrency,
    currencyConfig,
    currentUseArabicNumerals,
    setCurrency,
    handleSetUseArabicNumerals,
    getSupportedCurrencies,
    formatAmount,
    formatAmountSymbol,
    formatAmountWithConfig,
    getCurrencySymbol,
    getCurrencyName,
    getCurrencyDecimals
  ])

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  )
}

// Custom hook to use currency context
export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}

// Convenience hooks for common operations
export function useFormatCurrency() {
  const { formatAmount } = useCurrency()
  return formatAmount
}

export function useCurrencySymbol() {
  const { getCurrencySymbol } = useCurrency()
  return getCurrencySymbol()
}

export function useCurrentCurrency() {
  const { currentCurrency, currencyConfig } = useCurrency()
  return { currency: currentCurrency, config: currencyConfig }
}

export default CurrencyContext
