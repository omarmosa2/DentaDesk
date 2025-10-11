import React, { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { Button } from './ui/button'

interface ThemeToggleProps {
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showLabel?: boolean
}

export function ThemeToggle({
  variant = 'ghost',
  size = 'icon',
  showLabel = false
}: ThemeToggleProps) {
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [isSwitching, setIsSwitching] = useState(false)

  const handleToggle = async () => {
    if (isSwitching) return // Prevent rapid clicks

    setIsSwitching(true)
    try {
      await toggleDarkMode()
    } finally {
      // Reset after a short delay to prevent rapid toggling
      setTimeout(() => setIsSwitching(false), 300)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      disabled={isSwitching}
      className={`transition-all duration-200 ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isDarkMode ? 'تبديل إلى الوضع الفاتح' : 'تبديل إلى الوضع المظلم'}
    >
      {isDarkMode ? (
        <Sun className={`h-4 w-4 transition-transform duration-200 ${isSwitching ? 'rotate-180' : ''}`} />
      ) : (
        <Moon className={`h-4 w-4 transition-transform duration-200 ${isSwitching ? 'rotate-180' : ''}`} />
      )}
      {showLabel && (
        <span className="ml-2">
          {isDarkMode ? 'فاتح' : 'مظلم'}
        </span>
      )}
    </Button>
  )
}

export default ThemeToggle
