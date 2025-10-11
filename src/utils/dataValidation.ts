/**
 * Data Validation Utilities for Financial Reports
 * Provides comprehensive validation and sanitization for financial data
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedValue?: any
}

/**
 * Validates and sanitizes a numeric amount
 */
export function validateAmount(amount: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check if amount exists
  if (amount === null || amount === undefined) {
    errors.push('Amount is null or undefined')
    return { isValid: false, errors, warnings, sanitizedValue: 0 }
  }

  // Convert to number
  const numericAmount = Number(amount)
  
  // Check if conversion resulted in NaN
  if (isNaN(numericAmount)) {
    errors.push(`Invalid amount: ${amount} cannot be converted to number`)
    return { isValid: false, errors, warnings, sanitizedValue: 0 }
  }

  // Check if number is finite
  if (!isFinite(numericAmount)) {
    errors.push(`Amount is not finite: ${numericAmount}`)
    return { isValid: false, errors, warnings, sanitizedValue: 0 }
  }

  // Check for negative amounts (warning, not error)
  if (numericAmount < 0) {
    warnings.push(`Negative amount detected: ${numericAmount}`)
  }

  // Check for very large amounts (warning)
  if (numericAmount > 1000000) {
    warnings.push(`Very large amount detected: ${numericAmount}`)
  }

  // Round to 2 decimal places
  const sanitizedValue = Math.round(numericAmount * 100) / 100

  return {
    isValid: true,
    errors,
    warnings,
    sanitizedValue
  }
}

/**
 * Validates payment data structure
 */
export function validatePayment(payment: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!payment) {
    errors.push('Payment object is null or undefined')
    return { isValid: false, errors, warnings }
  }

  // Validate required fields
  if (!payment.id) {
    errors.push('Payment ID is missing')
  }

  if (!payment.patient_id) {
    errors.push('Patient ID is missing')
  }

  if (!payment.payment_date) {
    errors.push('Payment date is missing')
  } else {
    const date = new Date(payment.payment_date)
    if (isNaN(date.getTime())) {
      errors.push(`Invalid payment date: ${payment.payment_date}`)
    }
  }

  if (!payment.payment_method) {
    warnings.push('Payment method is missing')
  }

  if (!payment.status) {
    warnings.push('Payment status is missing')
  }

  // Validate amount
  const amountValidation = validateAmount(payment.amount)
  if (!amountValidation.isValid) {
    errors.push(...amountValidation.errors)
  }
  warnings.push(...amountValidation.warnings)

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates and sanitizes an array of payments
 */
export function validatePayments(payments: any[]): {
  validPayments: any[]
  invalidPayments: any[]
  totalErrors: number
  totalWarnings: number
} {
  if (!Array.isArray(payments)) {
    console.error('Payments is not an array:', payments)
    return {
      validPayments: [],
      invalidPayments: [],
      totalErrors: 1,
      totalWarnings: 0
    }
  }

  const validPayments: any[] = []
  const invalidPayments: any[] = []
  let totalErrors = 0
  let totalWarnings = 0

  payments.forEach((payment, index) => {
    const validation = validatePayment(payment)
    
    totalErrors += validation.errors.length
    totalWarnings += validation.warnings.length

    if (validation.isValid) {
      // Sanitize the payment amount
      const amountValidation = validateAmount(payment.amount)
      validPayments.push({
        ...payment,
        amount: amountValidation.sanitizedValue || 0
      })
    } else {
      console.warn(`Invalid payment at index ${index}:`, validation.errors)
      invalidPayments.push({
        payment,
        errors: validation.errors,
        warnings: validation.warnings
      })
    }
  })

  return {
    validPayments,
    invalidPayments,
    totalErrors,
    totalWarnings
  }
}

/**
 * Sanitizes financial calculation results
 */
export function sanitizeFinancialResult(result: any): number {
  const validation = validateAmount(result)
  return validation.sanitizedValue || 0
}

/**
 * Validates monthly revenue data
 */
export function validateMonthlyRevenue(monthlyData: { [key: string]: number }): {
  validData: { [key: string]: number }
  errors: string[]
} {
  const validData: { [key: string]: number } = {}
  const errors: string[] = []

  if (!monthlyData || typeof monthlyData !== 'object') {
    errors.push('Monthly data is not a valid object')
    return { validData, errors }
  }

  Object.entries(monthlyData).forEach(([month, amount]) => {
    // Validate month format (YYYY-MM)
    if (!month.match(/^\d{4}-\d{2}$/)) {
      errors.push(`Invalid month format: ${month}`)
      return
    }

    // Validate amount
    const amountValidation = validateAmount(amount)
    if (amountValidation.isValid) {
      validData[month] = amountValidation.sanitizedValue || 0
    } else {
      errors.push(`Invalid amount for month ${month}: ${amount}`)
    }
  })

  return { validData, errors }
}

/**
 * Validates payment method statistics
 */
export function validatePaymentMethodStats(methodStats: { [key: string]: number }): {
  validStats: { [key: string]: number }
  errors: string[]
} {
  const validStats: { [key: string]: number } = {}
  const errors: string[] = []

  if (!methodStats || typeof methodStats !== 'object') {
    errors.push('Payment method stats is not a valid object')
    return { validStats, errors }
  }

  const validMethods = ['cash', 'card', 'bank_transfer', 'check', 'insurance']

  Object.entries(methodStats).forEach(([method, amount]) => {
    // Validate method (optional warning)
    if (!validMethods.includes(method) && method !== 'unknown') {
      console.warn(`Unknown payment method: ${method}`)
    }

    // Validate amount
    const amountValidation = validateAmount(amount)
    if (amountValidation.isValid) {
      validStats[method] = amountValidation.sanitizedValue || 0
    } else {
      errors.push(`Invalid amount for payment method ${method}: ${amount}`)
    }
  })

  return { validStats, errors }
}
