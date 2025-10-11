import React, { useState, useMemo } from 'react'
import { InventoryItem } from '@/types'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Edit,
  Trash2,
  Eye,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useCurrency } from '@/contexts/CurrencyContext'

interface InventoryTableProps {
  items: InventoryItem[]
  isLoading: boolean
  onEdit: (item: InventoryItem) => void
  onDelete: (itemId: string) => void
  onViewDetails: (item: InventoryItem) => void
}

type SortField = 'name' | 'category' | 'quantity' | 'cost_per_unit' | 'total_value' | 'expiry_date'
type SortDirection = 'asc' | 'desc'

export default function InventoryTable({
  items,
  isLoading,
  onEdit,
  onDelete,
  onViewDetails
}: InventoryTableProps) {
  const { toast } = useToast()
  const { formatAmount } = useCurrency()
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Get unique categories for filter
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(items.map(item => item.category).filter(Boolean))]
    return uniqueCategories.sort()
  }, [items])

  // Enhanced items with calculated fields and filtering
  const enhancedItems = useMemo(() => {
    const today = new Date()

    let filtered = items.map(item => {
      const totalValue = (item.quantity || 0) * (item.cost_per_unit || 0)
      const isLowStock = item.quantity <= item.minimum_stock
      const isExpired = item.expiry_date && new Date(item.expiry_date) < today
      const isExpiringSoon = item.expiry_date && !isExpired &&
        new Date(item.expiry_date) <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

      let status = 'normal'
      if (item.quantity === 0) status = 'out_of_stock'
      else if (isExpired) status = 'expired'
      else if (isExpiringSoon) status = 'expiring_soon'
      else if (isLowStock) status = 'low_stock'

      return {
        ...item,
        total_value: totalValue,
        status,
        isLowStock,
        isExpired,
        isExpiringSoon
      }
    })

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.supplier?.toLowerCase().includes(query)
      )
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter)
    }

    return filtered
  }, [items, searchQuery, categoryFilter, statusFilter])

  // Sorting logic
  const sortedItems = useMemo(() => {
    return [...enhancedItems].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'category':
          aValue = a.category?.toLowerCase() || ''
          bValue = b.category?.toLowerCase() || ''
          break
        case 'quantity':
          aValue = a.quantity
          bValue = b.quantity
          break
        case 'cost_per_unit':
          aValue = a.cost_per_unit || 0
          bValue = b.cost_per_unit || 0
          break
        case 'total_value':
          aValue = a.total_value
          bValue = b.total_value
          break
        case 'expiry_date':
          aValue = a.expiry_date ? new Date(a.expiry_date) : new Date('9999-12-31')
          bValue = b.expiry_date ? new Date(b.expiry_date) : new Date('9999-12-31')
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [enhancedItems, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedItems.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedItems = sortedItems.slice(startIndex, startIndex + pageSize)

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  // Reset page when search or filter changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, categoryFilter, statusFilter])

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none text-center"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1 justify-center">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="w-4 h-4" />
          ) : (
            <ArrowDown className="w-4 h-4" />
          )
        ) : (
          <ArrowUpDown className="w-4 h-4 opacity-50" />
        )}
      </div>
    </TableHead>
  )

  const getStatusBadge = (item: any) => {
    switch (item.status) {
      case 'out_of_stock':
        return (
          <Badge variant="destructive" className="arabic-enhanced">
            <AlertTriangle className="w-3 h-3 mr-1" />
            نفد المخزون
          </Badge>
        )
      case 'expired':
        return (
          <Badge variant="destructive" className="arabic-enhanced">
            <Clock className="w-3 h-3 mr-1" />
            منتهي الصلاحية
          </Badge>
        )
      case 'expiring_soon':
        return (
          <Badge variant="secondary" className="arabic-enhanced">
            <Clock className="w-3 h-3 mr-1" />
            ينتهي قريباً
          </Badge>
        )
      case 'low_stock':
        return (
          <Badge variant="outline" className="arabic-enhanced border-yellow-500 text-yellow-700">
            <AlertTriangle className="w-3 h-3 mr-1" />
            مخزون منخفض
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="arabic-enhanced border-green-500 text-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            طبيعي
          </Badge>
        )
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'out_of_stock': return 'نفد المخزون'
      case 'expired': return 'منتهي الصلاحية'
      case 'expiring_soon': return 'ينتهي قريباً'
      case 'low_stock': return 'مخزون منخفض'
      default: return 'طبيعي'
    }
  }

  if (isLoading) {
    return (
      <div className="border rounded-lg" dir="rtl">
        <Table className="table-center-all">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-center">#</TableHead>
              <TableHead className="text-center">اسم العنصر</TableHead>
              <TableHead className="text-center">الفئة</TableHead>
              <TableHead className="text-center">الكمية</TableHead>
              <TableHead className="text-center">سعر الوحدة</TableHead>
              <TableHead className="text-center">القيمة الإجمالية</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center">الاجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                {[...Array(8)].map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="border rounded-lg" dir="rtl">
        <Table className="table-center-all">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-center">#</TableHead>
              <TableHead className="text-center">اسم العنصر</TableHead>
              <TableHead className="text-center">الفئة</TableHead>
              <TableHead className="text-center">الكمية</TableHead>
              <TableHead className="text-center">سعر الوحدة</TableHead>
              <TableHead className="text-center">القيمة الإجمالية</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center">الاجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <Package className="w-12 h-12 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground arabic-enhanced">لا توجد عناصر مخزون</p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Search and Filter Controls - RTL Layout: Search → Status → Category */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 items-start sm:items-center">
          {/* Search Field - First in RTL order */}
          <div className="relative flex-1 max-w-sm order-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="البحث في المخزون..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 arabic-enhanced text-right border-2 focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Status Filter - Second in RTL order */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px] order-2 border-2 focus:border-primary/50 transition-colors">
              <Filter className="w-4 h-4 mr-2 text-orange-500" />
              <SelectValue placeholder="تصفية حسب الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="normal">طبيعي</SelectItem>
              <SelectItem value="low_stock">مخزون منخفض</SelectItem>
              <SelectItem value="out_of_stock">نفد المخزون</SelectItem>
              <SelectItem value="expiring_soon">ينتهي قريباً</SelectItem>
              <SelectItem value="expired">منتهي الصلاحية</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter - Third in RTL order */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px] order-3 border-2 focus:border-primary/50 transition-colors">
              <Filter className="w-4 h-4 mr-2 text-blue-500" />
              <SelectValue placeholder="تصفية حسب الفئة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الفئات</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Items Count */}
        <div className="text-sm text-muted-foreground arabic-enhanced bg-muted/30 px-3 py-2 rounded-lg border">
          إجمالي العناصر: <span className="font-semibold text-foreground">{enhancedItems.length}</span>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="table-center-all">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-center">
                  <span className="arabic-enhanced font-medium">#</span>
                </TableHead>
                <SortableHeader field="name">
                  <span className="arabic-enhanced font-medium">اسم العنصر</span>
                </SortableHeader>
                <SortableHeader field="category">
                  <span className="arabic-enhanced font-medium">الفئة</span>
                </SortableHeader>
                <SortableHeader field="quantity">
                  <span className="arabic-enhanced font-medium">الكمية</span>
                </SortableHeader>
                <SortableHeader field="cost_per_unit">
                  <span className="arabic-enhanced font-medium">سعر الوحدة</span>
                </SortableHeader>
                <SortableHeader field="total_value">
                  <span className="arabic-enhanced font-medium">القيمة الإجمالية</span>
                </SortableHeader>
                <TableHead className="text-center">
                  <span className="arabic-enhanced font-medium">الحالة</span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="arabic-enhanced font-medium">الاجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((item, index) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-center">
                    {startIndex + index + 1}
                  </TableCell>
                  <TableCell className="font-medium text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                        {item.name.charAt(0)}
                      </div>
                      <div>
                        <span className="arabic-enhanced">{item.name}</span>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {item.category ? (
                      <Badge variant="outline" className="arabic-enhanced">
                        {item.category}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-medium">{item.quantity}</span>
                      <span className="text-muted-foreground text-sm">{item.unit || 'قطعة'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {item.cost_per_unit ? (
                      <span className="font-medium">{formatAmount(item.cost_per_unit)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">{formatAmount(item.total_value)}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(item)}
                  </TableCell>
                  <TableCell className="min-w-[200px] text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="action-btn-view"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onViewDetails(item)
                        }}
                      >
                        <Eye className="w-4 h-4 ml-1" />
                        <span className="text-xs arabic-enhanced">عرض</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="action-btn-edit"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onEdit(item)
                        }}
                      >
                        <Edit className="w-4 h-4 ml-1" />
                        <span className="text-xs arabic-enhanced">تعديل</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="action-btn-delete"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onDelete(item.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4 ml-1" />
                        <span className="text-xs arabic-enhanced">حذف</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      {sortedItems.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center space-x-2 space-x-reverse">
            <p className="text-sm text-muted-foreground arabic-enhanced">
              عرض {startIndex + 1} إلى {Math.min(startIndex + pageSize, sortedItems.length)} من {sortedItems.length} عنصر
            </p>
          </div>

          <div className="flex items-center space-x-6 space-x-reverse lg:space-x-8">
            <div className="flex items-center space-x-2 space-x-reverse">
              <p className="text-sm font-medium arabic-enhanced">عدد الصفوف لكل صفحة</p>
              <Select
                value={`${pageSize}`}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[5, 10, 20, 30, 50].map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-[100px] items-center justify-center text-sm font-medium arabic-enhanced">
              صفحة {currentPage} من {totalPages}
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">الذهاب إلى الصفحة الأولى</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">الذهاب إلى الصفحة السابقة</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">الذهاب إلى الصفحة التالية</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">الذهاب إلى الصفحة الأخيرة</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
