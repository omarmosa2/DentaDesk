import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Calendar, Filter, X, ChevronDown, CalendarDays } from 'lucide-react'
import { getWeekStart } from '@/lib/utils'

export interface TimeFilterOptions {
  preset: 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'
  startDate?: string
  endDate?: string
}

interface TimeFilterProps {
  value?: TimeFilterOptions
  onChange: (filter: TimeFilterOptions) => void
  onClear?: () => void
  className?: string
  showTitle?: boolean
  title?: string
  defaultOpen?: boolean
}

export function TimeFilter({
  value,
  onChange,
  onClear,
  className = '',
  showTitle = true,
  title = 'فلترة زمنية',
  defaultOpen = false
}: TimeFilterProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // Provide default value if value is undefined
  const safeValue: TimeFilterOptions = value || {
    preset: 'all',
    startDate: '',
    endDate: ''
  }
  // دالة مساعدة لتحويل التاريخ إلى تنسيق محلي YYYY-MM-DD
  const formatDateToLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handlePresetChange = (preset: TimeFilterOptions['preset']) => {
    const today = new Date()
    let startDate = ''
    let endDate = formatDateToLocal(today)

    switch (preset) {
      case 'all':
        startDate = ''
        endDate = ''
        break
      case 'today':
        startDate = formatDateToLocal(today)
        break
      case 'week':
        const weekStart = getWeekStart(today)
        startDate = formatDateToLocal(weekStart)
        break
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        startDate = formatDateToLocal(monthStart)
        break
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1)
        startDate = formatDateToLocal(yearStart)
        break
      case 'custom':
        // Keep existing dates for custom
        startDate = safeValue.startDate || ''
        endDate = safeValue.endDate || ''
        break
    }

    onChange({
      preset,
      startDate,
      endDate
    })
  }

  const handleDateChange = (field: 'startDate' | 'endDate', date: string) => {
    onChange({
      ...safeValue,
      [field]: date,
      preset: 'custom'
    })
  }

  const handleClear = () => {
    const defaultFilter: TimeFilterOptions = {
      preset: 'all',
      startDate: '',
      endDate: ''
    }

    onChange(defaultFilter)
    onClear?.()
  }

  const getPresetLabel = (preset: TimeFilterOptions['preset']) => {
    switch (preset) {
      case 'all':
        return 'جميع البيانات'
      case 'today':
        return 'اليوم'
      case 'week':
        return 'هذا الأسبوع'
      case 'month':
        return 'هذا الشهر'
      case 'year':
        return 'هذه السنة'
      case 'custom':
        return 'فترة مخصصة'
      default:
        return 'جميع البيانات'
    }
  }

  return (
    <div className={`${className}`} dir="rtl">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between text-sm h-9"
            size="sm"
          >
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              <span>{title}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3">
          <Card className="border-muted" dir="rtl">
            <CardContent className="p-4 space-y-3">
              {/* Preset Selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-right block text-muted-foreground">
                  اختر الفترة الزمنية للفلترة
                </label>
                <Select value={safeValue.preset} onValueChange={handlePresetChange}>
                  <SelectTrigger className="text-right h-8 text-sm" dir="rtl">
                    <SelectValue placeholder="اختر الفترة الزمنية" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">جميع البيانات</SelectItem>
                    <SelectItem value="today">اليوم</SelectItem>
                    <SelectItem value="week">هذا الأسبوع</SelectItem>
                    <SelectItem value="month">هذا الشهر</SelectItem>
                    <SelectItem value="year">هذه السنة</SelectItem>
                    <SelectItem value="custom">فترة مخصصة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {safeValue.preset === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-right block text-muted-foreground">
                      من تاريخ (بداية الفترة)
                    </label>
                    <Input
                      type="date"
                      value={safeValue.startDate || ''}
                      onChange={(e) => handleDateChange('startDate', e.target.value)}
                      className="text-right h-8 text-sm"
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-right block text-muted-foreground">
                      إلى تاريخ (نهاية الفترة)
                    </label>
                    <Input
                      type="date"
                      value={safeValue.endDate || ''}
                      onChange={(e) => handleDateChange('endDate', e.target.value)}
                      className="text-right h-8 text-sm"
                      dir="rtl"
                    />
                  </div>
                </div>
              )}

              {/* Current Selection Display */}
              <div className="bg-muted/30 p-2 rounded text-right">
                <div className="text-xs text-muted-foreground mb-1">الفترة المحددة:</div>
                <div className="text-sm font-medium">
                  {getPresetLabel(safeValue.preset)}
                  {safeValue.startDate && safeValue.endDate && (
                    <div className="text-xs text-muted-foreground mt-1">
                      من {new Date(safeValue.startDate).toLocaleDateString('en-GB')}
                      إلى {new Date(safeValue.endDate).toLocaleDateString('en-GB')}
                    </div>
                  )}
                </div>
              </div>

              {/* Clear Button */}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleClear} className="h-7 text-xs">
                  <X className="w-3 h-3 ml-1" />
                  إعادة تعيين
                </Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export default TimeFilter
