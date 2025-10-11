import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Keyboard, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'

interface QuickShortcutHintProps {
  className?: string
}

const hints = [
  { key: 'F1', description: 'الإعدادات' },
  { key: 'A/ش', description: 'مريض جديد' },
  { key: 'S/س', description: 'موعد جديد' },
  { key: 'D/ي', description: 'دفعة جديدة' },
  { key: 'R/ق', description: 'تحديث' },
  { key: 'F/ب', description: 'بحث' },
  { key: '0-9', description: 'تنقل سريع' }
]

export default function QuickShortcutHint({ className }: QuickShortcutHintProps) {
  const { isDarkMode } = useTheme()
  const [currentHint, setCurrentHint] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (!isVisible || isPaused) return

    const interval = setInterval(() => {
      setCurrentHint((prev) => (prev + 1) % hints.length)
    }, 3000) // Change hint every 3 seconds

    return () => clearInterval(interval)
  }, [isVisible, isPaused])

  if (!isVisible) return null

  const hint = hints[currentHint]

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300",
        isDarkMode
          ? "bg-gradient-to-r from-blue-950/30 to-indigo-950/30 border-blue-800/50 shadow-lg shadow-blue-900/20"
          : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm",
        className
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Keyboard className={`w-3 h-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
      <span className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
        نصيحة:
      </span>
      <Badge
        variant="secondary"
        className={cn(
          "text-xs px-1.5 py-0.5 font-mono",
          isDarkMode
            ? "bg-blue-900/50 text-blue-200 border-blue-700/50"
            : "bg-blue-100 text-blue-800 border-blue-300"
        )}
      >
        {hint.key}
      </Badge>
      <span className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
        {hint.description}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(false)}
        className={cn(
          "h-4 w-4 p-0 ml-1 transition-colors",
          isDarkMode
            ? "text-blue-400 hover:text-blue-200 hover:bg-blue-900/30"
            : "text-blue-500 hover:text-blue-700 hover:bg-blue-100"
        )}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  )
}
