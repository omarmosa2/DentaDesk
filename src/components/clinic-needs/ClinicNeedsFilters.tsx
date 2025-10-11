import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Search, Filter, X } from 'lucide-react'

interface ClinicNeedsFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  filters: {
    category?: string
    priority?: string
    status?: string
  }
  onFilterChange: (key: string, value: string) => void
  categories: string[]
  suppliers: string[]
  onClearFilters: () => void
}

const ClinicNeedsFilters: React.FC<ClinicNeedsFiltersProps> = ({
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
  categories,
  suppliers,
  onClearFilters
}) => {
  const hasActiveFilters = searchQuery || filters.category || filters.priority || filters.status

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            البحث والتصفية
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              مسح الفلاتر
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="البحث في الاحتياجات..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Category Filter */}
          <Select
            value={filters.category || 'all'}
            onValueChange={(value) => onFilterChange('category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="الفئة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الفئات</SelectItem>
              <SelectItem value="أدوات طبية">أدوات طبية</SelectItem>
              <SelectItem value="مواد استهلاكية">مواد استهلاكية</SelectItem>
              <SelectItem value="أجهزة">أجهزة</SelectItem>
              <SelectItem value="أثاث">أثاث</SelectItem>
              <SelectItem value="مواد تنظيف">مواد تنظيف</SelectItem>
              <SelectItem value="أخرى">أخرى</SelectItem>
              {categories
                .filter(category => !['أدوات طبية', 'مواد استهلاكية', 'أجهزة', 'أثاث', 'مواد تنظيف', 'أخرى'].includes(category))
                .map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select
            value={filters.priority || 'all'}
            onValueChange={(value) => onFilterChange('priority', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="الأولوية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأولويات</SelectItem>
              <SelectItem value="urgent">عاجل</SelectItem>
              <SelectItem value="high">عالي</SelectItem>
              <SelectItem value="medium">متوسط</SelectItem>
              <SelectItem value="low">منخفض</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => onFilterChange('status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="pending">آجل</SelectItem>
              <SelectItem value="ordered">مطلوب</SelectItem>
              <SelectItem value="received">مستلم</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter Summary */}
        {hasActiveFilters && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground">
              الفلاتر النشطة:
              {searchQuery && (
                <span className="inline-block bg-primary/10 text-primary px-2 py-1 rounded mr-2 text-xs">
                  البحث: "{searchQuery}"
                </span>
              )}
              {filters.category && filters.category !== 'all' && (
                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2 text-xs">
                  الفئة: {filters.category}
                </span>
              )}
              {filters.priority && filters.priority !== 'all' && (
                <span className="inline-block bg-orange-100 text-orange-800 px-2 py-1 rounded mr-2 text-xs">
                  الأولوية: {getPriorityLabel(filters.priority)}
                </span>
              )}
              {filters.status && filters.status !== 'all' && (
                <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded mr-2 text-xs">
                  الحالة: {getStatusLabel(filters.status)}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const getPriorityLabel = (priority: string) => {
  const labels = {
    low: 'منخفض',
    medium: 'متوسط',
    high: 'عالي',
    urgent: 'عاجل'
  }
  return labels[priority as keyof typeof labels] || priority
}

const getStatusLabel = (status: string) => {
  const labels = {
    pending: 'آجل',
    ordered: 'مطلوب',
    received: 'مستلم',
    cancelled: 'ملغي'
  }
  return labels[status as keyof typeof labels] || status
}

export default ClinicNeedsFilters
