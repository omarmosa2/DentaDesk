/**
 * Unified card styling utilities for consistent dark/light mode support
 * across all components in the dental clinic application
 */

export const getCardStyles = (color: string) => {
  const baseStyles = "transition-all duration-200 hover:shadow-lg border rounded-lg"

  switch (color) {
    case "green":
      return `${baseStyles} card-green`
    case "yellow":
      return `${baseStyles} card-yellow`
    case "orange":
      return `${baseStyles} card-orange`
    case "red":
      return `${baseStyles} card-red`
    case "blue":
      return `${baseStyles} card-blue`
    case "purple":
      return `${baseStyles} card-purple`
    case "emerald":
      return `${baseStyles} card-emerald`
    case "cyan":
      return `${baseStyles} card-cyan`
    case "indigo":
      return `${baseStyles} card-indigo`
    case "pink":
      return `${baseStyles} bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800`
    case "slate":
      return `${baseStyles} bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800`
    case "gray":
      return `${baseStyles} card-gray`
    default:
      return `${baseStyles} card-gray`
  }
}

export const getIconStyles = (color: string) => {
  switch (color) {
    case "green":
      return "text-green-700 dark:text-green-300"
    case "yellow":
      return "text-yellow-700 dark:text-yellow-300"
    case "orange":
      return "text-orange-700 dark:text-orange-300"
    case "red":
      return "text-red-700 dark:text-red-300"
    case "blue":
      return "text-blue-700 dark:text-blue-300"
    case "purple":
      return "text-purple-700 dark:text-purple-300"
    case "emerald":
      return "text-emerald-700 dark:text-emerald-300"
    case "cyan":
      return "text-cyan-700 dark:text-cyan-300"
    case "indigo":
      return "text-indigo-700 dark:text-indigo-300"
    case "pink":
      return "text-pink-700 dark:text-pink-300"
    case "slate":
      return "text-slate-700 dark:text-slate-300"
    default:
      return "text-gray-700 dark:text-gray-300"
  }
}

/**
 * Get card styles based on data type for consistent theming
 */
export const getCardStylesByType = (type: 'financial' | 'patient' | 'appointment' | 'inventory' | 'alert' | 'success' | 'warning' | 'info' | 'default') => {
  switch (type) {
    case 'financial':
      return getCardStyles('green')
    case 'patient':
      return getCardStyles('blue')
    case 'appointment':
      return getCardStyles('purple')
    case 'inventory':
      return getCardStyles('orange')
    case 'alert':
      return getCardStyles('red')
    case 'success':
      return getCardStyles('emerald')
    case 'warning':
      return getCardStyles('yellow')
    case 'info':
      return getCardStyles('cyan')
    default:
      return getCardStyles('gray')
  }
}

/**
 * Get icon styles based on data type for consistent theming
 */
export const getIconStylesByType = (type: 'financial' | 'patient' | 'appointment' | 'inventory' | 'alert' | 'success' | 'warning' | 'info' | 'default') => {
  switch (type) {
    case 'financial':
      return getIconStyles('green')
    case 'patient':
      return getIconStyles('blue')
    case 'appointment':
      return getIconStyles('purple')
    case 'inventory':
      return getIconStyles('orange')
    case 'alert':
      return getIconStyles('red')
    case 'success':
      return getIconStyles('emerald')
    case 'warning':
      return getIconStyles('yellow')
    case 'info':
      return getIconStyles('cyan')
    default:
      return getIconStyles('gray')
  }
}
