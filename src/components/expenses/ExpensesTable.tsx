import React, { useState, useMemo } from 'react'
// Removed react-window import due to build issues
import { ClinicExpense } from '@/types'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Edit,
  Trash2,
  Eye,
  Receipt,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  DollarSign,
  Calendar,
  MoreHorizontal
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useCurrency } from '@/contexts/CurrencyContext'
import CurrencyDisplay from '@/components/ui/currency-display'

interface ExpensesTableProps {
  expenses: ClinicExpense[]
  isLoading: boolean
  onEdit: (expense: ClinicExpense) => void
  onDelete: (expense: ClinicExpense) => void
  onViewDetails: (expense: ClinicExpense) => void
  onMarkAsPaid?: (expense: ClinicExpense) => void
}

type SortField = 'expense_name' | 'amount' | 'expense_type' | 'payment_date' | 'status' | 'vendor'
type SortDirection = 'asc' | 'desc' | null

export default function ExpensesTable({
  expenses,
  isLoading,
  onEdit,
  onDelete,
  onViewDetails,
  onMarkAsPaid
}: ExpensesTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { formatAmount } = useCurrency()

  // دالة الترتيب
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortedAndPaginatedExpenses = useMemo(() => {
    let sortedExpenses = expenses

    // Apply sorting
    if (sortField && sortDirection) {
      sortedExpenses = [...expenses].sort((a, b) => {
        let aValue = a[sortField]
        let bValue = b[sortField]

        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return sortDirection === 'asc' ? 1 : -1
        if (bValue == null) return sortDirection === 'asc' ? -1 : 1

        // Convert to string for comparison
        aValue = String(aValue).toLowerCase()
        bValue = String(bValue).toLowerCase()

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    // Apply pagination
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedExpenses = sortedExpenses.slice(startIndex, endIndex)

    return {
      expenses: paginatedExpenses,
      totalPages: Math.ceil(sortedExpenses.length / pageSize),
      totalCount: sortedExpenses.length
    }
  }, [expenses, sortField, sortDirection, currentPage, pageSize])

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 opacity-50" />
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-4 h-4" />
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="w-4 h-4" />
    }
    return <ArrowUpDown className="w-4 h-4 opacity-50" />
  }

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none text-center"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-center space-x-1 space-x-reverse">
        <span>{children}</span>
        {getSortIcon(field)}
      </div>
    </TableHead>
  )

  // دالة الحصول على اسم نوع المصروف بالعربية
  const getExpenseTypeName = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'salary': 'الرواتب',
      'utilities': 'المرافق',
      'rent': 'الإيجار',
      'maintenance': 'الصيانة',
      'supplies': 'المستلزمات',
      'insurance': 'التأمين',
      'other': 'أخرى'
    }
    return typeMap[type] || type
  }

  // دالة الحصول على اسم طريقة الدفع بالعربية
  const getPaymentMethodName = (method: string) => {
    const methodMap: { [key: string]: string } = {
      'cash': 'نقدي',
      'bank_transfer': 'تحويل بنكي',
      'check': 'شيك',
      'credit_card': 'بطاقة ائتمانية'
    }
    return methodMap[method] || method
  }

  // دالة الحصول على لون الحالة
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default'
      case 'pending': return 'secondary'
      case 'overdue': return 'destructive'
      case 'cancelled': return 'outline'
      default: return 'outline'
    }
  }

  // دالة الحصول على اسم الحالة بالعربية
  const getStatusName = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'paid': 'مدفوع',
      'pending': 'آجل',
      'overdue': 'متأخر',
      'cancelled': 'ملغي'
    }
    return statusMap[status] || status
  }

  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <Table className="table-center-all">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">#</TableHead>
              <TableHead className="text-center">اسم المصروف</TableHead>
              <TableHead className="text-center">المبلغ</TableHead>
              <TableHead className="text-center">النوع</TableHead>
              <TableHead className="text-center">تاريخ الدفع</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                {[...Array(7)].map((_, cellIndex) => (
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

  if (expenses.length === 0) {
    return (
      <div className="border rounded-lg">
        <Table className="table-center-all">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center w-12 max-w-12 min-w-12">
                <span className="arabic-enhanced font-medium text-xs">#</span>
              </TableHead>
              <SortableHeader field="expense_name">اسم المصروف</SortableHeader>
              <SortableHeader field="amount">المبلغ</SortableHeader>
              <SortableHeader field="expense_type">النوع</SortableHeader>
              <SortableHeader field="payment_date">تاريخ الدفع</SortableHeader>
              <SortableHeader field="status">الحالة</SortableHeader>
              <TableHead className="text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <div className="flex flex-col items-center space-y-2">
                  <Receipt className="w-12 h-12 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">لا توجد مصروفات</p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  const { expenses: paginatedExpenses, totalPages, totalCount } = getSortedAndPaginatedExpenses

  // Calculate start index for serial numbers
  const startIndex = (currentPage - 1) * pageSize


  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize))
    setCurrentPage(1) // Reset to first page when changing page size
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="table-center-all" dir="rtl">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-center w-12 max-w-12 min-w-12">
                  <span className="arabic-enhanced font-medium text-xs">#</span>
                </TableHead>
                <SortableHeader field="expense_name">
                  <span className="arabic-enhanced font-medium">اسم المصروف</span>
                </SortableHeader>
                <SortableHeader field="amount">
                  <span className="arabic-enhanced font-medium">المبلغ</span>
                </SortableHeader>
                <SortableHeader field="expense_type">
                  <span className="arabic-enhanced font-medium">النوع</span>
                </SortableHeader>
                <SortableHeader field="vendor">
                  <span className="arabic-enhanced font-medium">المورد</span>
                </SortableHeader>
                <SortableHeader field="payment_date">
                  <span className="arabic-enhanced font-medium">تاريخ الدفع</span>
                </SortableHeader>
                <SortableHeader field="status">
                  <span className="arabic-enhanced font-medium">الحالة</span>
                </SortableHeader>
                <TableHead className="text-center">
                  <span className="arabic-enhanced font-medium">الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExpenses.map((expense, index) => {
                const currentIndex = startIndex + index + 1
                return (
                  <TableRow key={expense.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-center w-12 max-w-12 min-w-12 text-xs">
                      {currentIndex}
                    </TableCell>
                    <TableCell className="font-medium text-center">
                      <div className="flex items-center justify-center space-x-2 space-x-reverse">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <span className="arabic-enhanced">{expense.expense_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      <CurrencyDisplay amount={expense.amount} />
                    </TableCell>
                    <TableCell className="min-w-[120px] text-center">
                      <Badge variant="outline" className="max-w-[120px] truncate arabic-enhanced">
                        {getExpenseTypeName(expense.expense_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[120px] text-center table-cell-wrap-truncate-sm">
                      <span className="arabic-enhanced">
                        {expense.vendor || <span className="text-muted-foreground text-sm arabic-enhanced">غير محدد</span>}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-1 space-x-reverse">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm arabic-enhanced">
                          {formatDate(expense.payment_date)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getStatusBadgeVariant(expense.status)} className="arabic-enhanced">
                        {getStatusName(expense.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-auto text-center" dir="rtl">
                      <div className="flex items-center justify-center gap-1" dir="rtl">
                        {/* الأزرار الرئيسية الثلاثة */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="action-btn-view h-8 px-2 min-w-0"
                          onClick={() => onViewDetails(expense)}
                          title="عرض تفاصيل المصروف"
                        >
                          <Eye className="w-3 h-3" />
                          <span className="text-xs arabic-enhanced hidden sm:inline mr-1">عرض</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="action-btn-edit h-8 px-2 min-w-0"
                          onClick={() => onEdit(expense)}
                          title="تعديل بيانات المصروف"
                        >
                          <Edit className="w-3 h-3" />
                          <span className="text-xs arabic-enhanced hidden sm:inline mr-1">تعديل</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="action-btn-delete text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2 min-w-0"
                          onClick={() => onDelete(expense)}
                          title="حذف المصروف"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span className="text-xs arabic-enhanced hidden sm:inline mr-1">حذف</span>
                        </Button>

                        {/* قائمة مزيد للأزرار الإضافية */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 min-w-0"
                              title="المزيد من الخيارات"
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="expenses-actions-dropdown">
                            {expense.status === 'pending' && onMarkAsPaid && (
                              <DropdownMenuItem
                                onClick={() => onMarkAsPaid(expense)}
                                className="dropdown-item"
                              >
                                <DollarSign className="w-4 h-4 ml-2" />
                                <span className="arabic-enhanced">تحديد كمدفوع</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onViewDetails(expense)}
                              className="dropdown-item"
                            >
                              <Eye className="w-4 h-4 ml-2" />
                              <span className="arabic-enhanced">عرض التفاصيل الكاملة</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
        </Table>
      </div>
    </div>

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-2" dir="rtl">
          <div className="flex items-center space-x-2 space-x-reverse">
            <p className="text-sm text-muted-foreground arabic-enhanced">
              عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, totalCount)} من {totalCount} مصروف
            </p>
          </div>

          <div className="flex items-center space-x-6 space-x-reverse lg:space-x-8">
            <div className="flex items-center space-x-2 space-x-reverse">
              <p className="text-sm font-medium arabic-enhanced">عدد الصفوف لكل صفحة</p>
              <Select
                value={`${pageSize}`}
                onValueChange={handlePageSizeChange}
                dir="rtl"
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 50, 100].map((size) => (
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