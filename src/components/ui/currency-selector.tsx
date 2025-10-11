import React, { useState } from 'react'
import { DollarSign, ChevronDown } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'

interface CurrencySelectorProps {
  className?: string
  showLabel?: boolean
  variant?: 'default' | 'compact'
}

export function CurrencySelector({ 
  className = '', 
  showLabel = true, 
  variant = 'default' 
}: CurrencySelectorProps) {
  const { currentCurrency, setCurrency, getSupportedCurrencies, getCurrencyName, getCurrencySymbol } = useCurrency()
  const [isOpen, setIsOpen] = useState(false)
  
  const supportedCurrencies = getSupportedCurrencies()
  const currentSymbol = getCurrencySymbol()
  const currentName = getCurrencyName(undefined, true) // Get Arabic name

  const handleCurrencyChange = (currencyCode: string) => {
    setCurrency(currencyCode)
    setIsOpen(false)
  }

  if (variant === 'compact') {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 text-xs ${className}`}
          >
            <DollarSign className="w-3 h-3 ml-1" />
            {currentSymbol}
            <ChevronDown className="w-3 h-3 mr-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {Object.entries(supportedCurrencies).map(([code, config]) => (
            <DropdownMenuItem
              key={code}
              onClick={() => handleCurrencyChange(code)}
              className={`cursor-pointer ${currentCurrency === code ? 'bg-accent dark:bg-gray-700' : ''}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm">{config.nameAr}</span>
                <span className="text-xs text-muted-foreground dark:text-gray-400">{config.symbol}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`flex items-center gap-2 ${className}`}
        >
          <DollarSign className="w-4 h-4" />
          {showLabel && (
            <span className="hidden sm:inline">
              {currentName}
            </span>
          )}
          <span className="font-mono">{currentSymbol}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="p-2 text-xs text-muted-foreground border-b dark:text-gray-300 dark:border-gray-700">
          اختر العملة المستخدمة
        </div>
        {Object.entries(supportedCurrencies).map(([code, config]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleCurrencyChange(code)}
            className={`cursor-pointer p-3 ${currentCurrency === code ? 'bg-accent dark:bg-gray-700' : ''}`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="font-medium">{config.nameAr}</span>
                <span className="text-xs text-muted-foreground dark:text-gray-400">{config.name}</span>
              </div>
              <span className="font-mono text-sm">{config.symbol}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default CurrencySelector
