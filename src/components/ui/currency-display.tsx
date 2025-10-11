import React from 'react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { formatCurrency, getCurrencyConfig } from '@/lib/utils'

interface CurrencyDisplayProps {
  amount: number
  currency?: string
  className?: string
  fallbackFormat?: boolean
  showSymbolOnly?: boolean
  useGlobalCurrency?: boolean
}

export function CurrencyDisplay({
  amount,
  currency,
  className = '',
  fallbackFormat = true,
  showSymbolOnly = false,
  useGlobalCurrency = true
}: CurrencyDisplayProps) {
  const { currentCurrency, formatAmount, formatAmountSymbol, useArabicNumerals } = useCurrency()

  // Determine which currency to use
  const effectiveCurrency = useGlobalCurrency
    ? (currency || currentCurrency)
    : (currency || 'USD')

  // Safely convert amount to number to prevent "Cannot convert object to primitive value" error
  const safeAmount = React.useMemo(() => {
    if (typeof amount === 'number') {
      return isNaN(amount) || !isFinite(amount) ? 0 : amount
    }
    if (typeof amount === 'string') {
      const parsed = parseFloat(amount)
      return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed
    }
    if (typeof amount === 'object' && amount !== null) {
      // Handle objects that might have a numeric value
      const objAmount = amount as any
      if (objAmount && typeof objAmount === 'object' && 'value' in objAmount) {
        return Number(objAmount.value) || 0
      }
      if (objAmount && typeof objAmount === 'object' && 'amount' in objAmount) {
        return Number(objAmount.amount) || 0
      }
      // Try to convert object to number
      const numValue = Number(objAmount)
      return isNaN(numValue) || !isFinite(numValue) ? 0 : numValue
    }
    return 0
  }, [amount])

  try {
    // Use the appropriate formatting function with safe amount
    const formattedValue = showSymbolOnly
      ? formatAmountSymbol(safeAmount, effectiveCurrency)
      : formatAmount(safeAmount, effectiveCurrency)

    return (
      <span className={className}>
        {formattedValue}
      </span>
    )
  } catch (error) {
    console.warn('Error formatting currency:', error)

    if (fallbackFormat) {
      // Fallback formatting using currency config
      const config = getCurrencyConfig(effectiveCurrency)

      try {
        const formattedNumber = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: showSymbolOnly ? 0 : config.decimals,
          maximumFractionDigits: showSymbolOnly ? 0 : config.decimals,
        }).format(amount)

        const displayValue = config.position === 'before'
          ? `${config.symbol}${formattedNumber}`
          : `${formattedNumber} ${config.symbol}`

        return (
          <span className={className}>
            {displayValue}
          </span>
        )
      } catch (fallbackError) {
        // Ultimate fallback
        const config = getCurrencyConfig(effectiveCurrency)
        const fixedAmount = showSymbolOnly
          ? Math.round(amount).toString()
          : amount.toFixed(config.decimals)

        const displayValue = config.position === 'before'
          ? `${config.symbol}${fixedAmount}`
          : `${fixedAmount} ${config.symbol}`

        return (
          <span className={className}>
            {displayValue}
          </span>
        )
      }
    }

    return (
      <span className={className}>
        {amount} {effectiveCurrency}
      </span>
    )
  }
}

export default CurrencyDisplay
