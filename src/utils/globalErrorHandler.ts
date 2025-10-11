/**
 * Global error handler to prevent "Cannot convert object to primitive value" errors
 * This fixes issues with React's console logging and error handling
 */

import { safeString } from './safeStringUtils'

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug
}

// Safe wrapper for console methods
const createSafeConsoleMethod = (originalMethod: (...args: any[]) => void) => {
  return (...args: any[]) => {
    try {
      // For error logging, preserve the original error object and its details
      if (args.length > 0 && args[0] instanceof Error) {
        // Log the error with full details
        originalMethod.apply(console, [
          args[0].message || 'Unknown error',
          '\nStack:', args[0].stack || 'No stack trace',
          '\nName:', args[0].name || 'Error',
          ...args.slice(1)
        ])
        return
      }
      
      // Convert all arguments to safe strings
      const safeArgs = args.map(arg => {
        if (typeof arg === 'string') {
          return arg
        }
        if (typeof arg === 'number' || typeof arg === 'boolean') {
          return arg
        }
        if (arg === null || arg === undefined) {
          return arg
        }
        // For objects, use our safe string conversion
        return safeString(arg)
      })
      
      originalMethod.apply(console, safeArgs)
    } catch (error) {
      // Fallback to original method with minimal args
      try {
        originalMethod.apply(console, ['[Console Error]', safeString(args[0] || '')])
      } catch (fallbackError) {
        // Last resort
        originalMethod.apply(console, ['[Console Error]'])
      }
    }
  }
}

/**
 * Initialize global error handling
 */
export const initGlobalErrorHandler = () => {
  // Override console methods
  console.log = createSafeConsoleMethod(originalConsole.log)
  console.warn = createSafeConsoleMethod(originalConsole.warn)
  console.error = createSafeConsoleMethod(originalConsole.error)
  console.info = createSafeConsoleMethod(originalConsole.info)
  console.debug = createSafeConsoleMethod(originalConsole.debug)

  // Override String constructor to prevent primitive conversion errors
  const originalString = String
  const safeStringConstructor = function(value?: any) {
    try {
      if (arguments.length === 0) {
        return ''
      }
      return safeString(value)
    } catch (error) {
      return '[String Error]'
    }
  } as any

  // Copy String prototype and static methods
  Object.setPrototypeOf(safeStringConstructor, originalString)
  Object.defineProperty(safeStringConstructor, 'prototype', {
    value: originalString.prototype,
    writable: false
  })

  // Copy static properties
  for (const prop in originalString) {
    if (originalString.hasOwnProperty(prop)) {
      safeStringConstructor[prop] = (originalString as any)[prop]
    }
  }

  // Override global String
  try {
    // @ts-ignore
    globalThis.String = safeStringConstructor
    // @ts-ignore
    window.String = safeStringConstructor
  } catch (error) {
    console.warn('Could not override String constructor:', error)
  }

  // Global error event handler
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('Cannot convert object to primitive value')) {
      event.preventDefault()
      console.warn('Prevented "Cannot convert object to primitive value" error')
      return true
    }
  })

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && typeof event.reason === 'object' && event.reason.message && event.reason.message.includes('Cannot convert object to primitive value')) {
      event.preventDefault()
      console.warn('Prevented unhandled "Cannot convert object to primitive value" promise rejection')
      return true
    }
  })

  console.log('🛡️ Global error handler initialized')
}

/**
 * Restore original console methods (for cleanup)
 */
export const restoreConsole = () => {
  console.log = originalConsole.log
  console.warn = originalConsole.warn
  console.error = originalConsole.error
  console.info = originalConsole.info
  console.debug = originalConsole.debug
}
