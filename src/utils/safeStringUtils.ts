/**
 * Safe string conversion utilities to prevent "Cannot convert object to primitive value" errors
 */

// Global safety measures for primitive conversion
if (typeof window !== 'undefined') {
  // Override Object.prototype.toString to prevent primitive conversion errors
  const originalObjectToString = Object.prototype.toString
  Object.prototype.toString = function() {
    try {
      return originalObjectToString.call(this)
    } catch (error) {
      return '[Object]'
    }
  }

  // Override Array.prototype.toString
  const originalArrayToString = Array.prototype.toString
  Array.prototype.toString = function() {
    try {
      return originalArrayToString.call(this)
    } catch (error) {
      return '[Array]'
    }
  }

  // Override Date.prototype.toString
  const originalDateToString = Date.prototype.toString
  Date.prototype.toString = function() {
    try {
      return originalDateToString.call(this)
    } catch (error) {
      return '[Date]'
    }
  }
}

/**
 * Safely converts any value to a string without throwing errors
 * @param value - The value to convert to string
 * @returns A safe string representation of the value
 */
export const safeString = (value: any): string => {
  // Handle primitive types
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number') {
    return isNaN(value) ? '0' : value.toString()
  }
  if (typeof value === 'boolean') {
    return value.toString()
  }
  
  // Handle Date objects
  if (value instanceof Date) {
    try {
      return value.toISOString()
    } catch (error) {
      return 'Invalid Date'
    }
  }
  
  // Handle null and undefined
  if (value === null) {
    return ''
  }
  if (value === undefined) {
    return ''
  }
  
  // Handle objects
  if (typeof value === 'object' && value !== null) {
    // Try common object properties first
    if (value.name !== undefined) {
      return safeString(value.name)
    }
    if (value.title !== undefined) {
      return safeString(value.title)
    }
    if (value.text !== undefined) {
      return safeString(value.text)
    }
    if (value.label !== undefined) {
      return safeString(value.label)
    }
    if (value.value !== undefined) {
      return safeString(value.value)
    }
    
    // Try custom toString method
    try {
      if (typeof value.toString === 'function' && value.toString !== Object.prototype.toString) {
        const result = value.toString()
        if (typeof result === 'string') {
          return result
        }
      }
    } catch (error) {
      // Continue to fallback
    }
    
    // Try JSON.stringify as fallback
    try {
      const jsonString = JSON.stringify(value)
      if (jsonString && jsonString !== '{}' && jsonString !== '[]') {
        return jsonString
      }
    } catch (error) {
      // Continue to fallback
    }
    
    // Final fallback for objects
    return '[Object]'
  }
  
  // Handle functions
  if (typeof value === 'function') {
    return '[Function]'
  }
  
  // Handle symbols
  if (typeof value === 'symbol') {
    try {
      return value.toString()
    } catch (error) {
      return '[Symbol]'
    }
  }
  
  // Handle bigint
  if (typeof value === 'bigint') {
    return value.toString()
  }
  
  // Final fallback - return a safe string representation
  return '[Unknown]'
}

/**
 * Safely converts any value to a number
 * @param value - The value to convert to number
 * @returns A safe number representation of the value
 */
export const safeNumber = (value: any): number => {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  
  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }
  
  if (value instanceof Date) {
    return value.getTime()
  }
  
  if (value === null || value === undefined) {
    return 0
  }
  
  // Try to extract number from object
  if (typeof value === 'object' && value !== null) {
    if (typeof value.valueOf === 'function') {
      try {
        const valueOf = value.valueOf()
        if (typeof valueOf === 'number') {
          return isNaN(valueOf) ? 0 : valueOf
        }
      } catch (error) {
        // Continue to fallback
      }
    }
  }
  
  // Final fallback
  try {
    const parsed = parseFloat(safeString(value))
    return isNaN(parsed) ? 0 : parsed
  } catch (error) {
    return 0
  }
}

/**
 * Safely formats a date to string
 * @param value - The date value to format
 * @returns A formatted date string
 */
export const safeDateString = (value: any): string => {
  if (!value) return ''
  
  try {
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      return ''
    }
    
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  } catch (error) {
    return ''
  }
}

/**
 * Safely formats a number as currency
 * @param value - The value to format as currency
 * @param currency - The currency code (optional)
 * @returns A formatted currency string
 */
export const safeCurrencyString = (value: any, currency: string = 'SYP'): string => {
  const num = safeNumber(value)
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num)
  } catch (error) {
    // Fallback to simple formatting
    const symbols: { [key: string]: string } = {
      'SYP': 'ل.س',
      'USD': '$',
      'EUR': '€',
      'SAR': 'ر.س'
    }
    const symbol = symbols[currency] || currency
    return `${num.toLocaleString('en-US')} ${symbol}`
  }
}
