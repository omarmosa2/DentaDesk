import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useExpensesStore } from '@/store/expensesStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useCurrency } from '@/contexts/CurrencyContext'
import CurrencyDisplay from '@/components/ui/currency-display'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { notify } from '@/services/notificationService'
import { ExportService } from '@/services/exportService'
import { ClinicExpense } from '@/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import AddExpenseDialog from '@/components/expenses/AddExpenseDialog'
import DeleteExpenseDialog from '@/components/expenses/DeleteExpenseDialog'
import ExpensesTable from '@/components/expenses/ExpensesTable'
import ExpenseDetailsModal from '@/components/expenses/ExpenseDetailsModal'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Receipt,
  DollarSign,
  CreditCard,
  Clock,
  AlertTriangle,
  Download,
  Filter,
  X,
  FileText
} from 'lucide-react'

export default function Expenses() {
  const {
    expenses,
    filteredExpenses,
    isLoading,
    error,
    searchQuery,
    filters,
    categories,
    vendors,
    expenseTypes,
    analytics,
    loadExpenses,
    deleteExpense,
    updateExpense,
    setSearchQuery,
    setFilters,
    clearError
  } = useExpensesStore()

  const { settings } = useSettingsStore()
  const { formatAmount } = useCurrency()
  const { toast } = useToast()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ClinicExpense | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<ClinicExpense | null>(null)
  const [selectedExpenseForDetails, setSelectedExpenseForDetails] = useState<ClinicExpense | null>(null)
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null)

  // Filter states
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [expenseTypeFilter, setExpenseTypeFilter] = useState('all')
  const [amountRangeFilter, setAmountRangeFilter] = useState<{min: string, max: string}>({min: '', max: ''})
  const [dateRangeFilter, setDateRangeFilter] = useState<{start: string, end: string}>({start: '', end: ''})

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  // Apply advanced filters to expenses
  const filteredExpensesWithAdvancedFilters = React.useMemo(() => {
    let filtered = [...filteredExpenses]

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(expense => expense.status === statusFilter)
    }

    // Expense type filter
    if (expenseTypeFilter !== 'all') {
      filtered = filtered.filter(expense => expense.expense_type === expenseTypeFilter)
    }

    // Amount range filter
    if (amountRangeFilter.min && amountRangeFilter.max) {
      const minAmount = parseFloat(amountRangeFilter.min)
      const maxAmount = parseFloat(amountRangeFilter.max)
      filtered = filtered.filter(expense => expense.amount >= minAmount && expense.amount <= maxAmount)
    }

    // Date range filter
    if (dateRangeFilter.start && dateRangeFilter.end) {
      const startDate = new Date(dateRangeFilter.start)
      const endDate = new Date(dateRangeFilter.end)
      endDate.setHours(23, 59, 59, 999) // Include the entire end date

      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.payment_date)
        return expenseDate >= startDate && expenseDate <= endDate
      })
    }

    return filtered
  }, [filteredExpenses, statusFilter, expenseTypeFilter, amountRangeFilter, dateRangeFilter])

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setExpenseTypeFilter('all')
    setAmountRangeFilter({min: '', max: ''})
    setDateRangeFilter({start: '', end: ''})
    setShowFilters(false)
  }

  const handleEdit = (expense: ClinicExpense) => {
    setEditingExpense(expense)
    setShowAddDialog(true)
  }

  const handleDelete = (expense: ClinicExpense) => {
    setDeletingExpense(expense)
    setShowDeleteDialog(true)
    setDeletingExpenseId(expense.id)
  }

  const handleViewDetails = (expense: ClinicExpense) => {
    setSelectedExpenseForDetails(expense)
    setShowDetailsModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingExpenseId) return

    try {
      await deleteExpense(deletingExpenseId)
      notify.deleteSuccess('تم حذف المصروف بنجاح')
      setShowDeleteDialog(false)
      setDeletingExpense(null)
      setDeletingExpenseId(null)
    } catch (error) {
      notify.deleteError('فشل في حذف المصروف')
    }
  }

  const handleCloseAddDialog = () => {
    setShowAddDialog(false)
    setEditingExpense(null)
  }

  const handleCloseDeleteDialog = () => {
    setShowDeleteDialog(false)
    setDeletingExpense(null)
  }

  const handleMarkAsPaid = async (expense: ClinicExpense) => {
    try {
      await updateExpense(expense.id, { status: 'paid' })
      toast({
        title: 'تم تحديث الحالة',
        description: 'تم تحديث حالة المصروف إلى مدفوع بنجاح',
      })
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث حالة المصروف',
        variant: 'destructive',
      })
    }
  }

  const handleExportExcel = async () => {
    try {
      if (filteredExpensesWithAdvancedFilters.length === 0) {
        notify.noDataToExport('لا توجد بيانات مصروفات للتصدير')
        return
      }

      await ExportService.exportClinicExpensesToExcel(filteredExpensesWithAdvancedFilters)

      notify.exportSuccess(`تم تصدير ${filteredExpensesWithAdvancedFilters.length} مصروف بنجاح إلى ملف Excel مع التنسيق الجميل!`)
    } catch (error) {
      console.error('Error exporting clinic expenses:', error)
      notify.exportError('فشل في تصدير بيانات المصروفات')
    }
  }

  const handleExportPDF = async () => {
    try {
      console.log('🔄 Starting PDF export process...')

      if (filteredExpensesWithAdvancedFilters.length === 0) {
        console.warn('⚠️ No expenses data to export')
        notify.noDataToExport('لا توجد بيانات مصروفات للتصدير بصيغة PDF.')
        return
      }

      console.log(`📊 Exporting ${filteredExpensesWithAdvancedFilters.length} expenses`)

      // Calculate comprehensive statistics for the report
      const totalAmount = filteredExpensesWithAdvancedFilters.reduce((sum, expense) => sum + expense.amount, 0)
      const paidAmount = filteredExpensesWithAdvancedFilters.filter(expense => expense.status === 'paid').reduce((sum, expense) => sum + expense.amount, 0)
      const pendingAmount = filteredExpensesWithAdvancedFilters.filter(expense => expense.status === 'pending').reduce((sum, expense) => sum + expense.amount, 0)
      const overdueAmount = filteredExpensesWithAdvancedFilters.filter(expense => expense.status === 'overdue').reduce((sum, expense) => sum + expense.amount, 0)
      const cancelledAmount = filteredExpensesWithAdvancedFilters.filter(expense => expense.status === 'cancelled').reduce((sum, expense) => sum + expense.amount, 0)

      console.log('📈 Calculated statistics:', {
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount,
        cancelledAmount
      })

      // Calculate expenses by type
      const expensesByType = filteredExpensesWithAdvancedFilters.reduce((acc, expense) => {
        const type = expense.expense_type
        if (!acc[type]) {
          acc[type] = { amount: 0, count: 0 }
        }
        acc[type].amount += expense.amount
        acc[type].count++
        return acc
      }, {} as Record<string, { amount: number; count: number }>)

      const expensesByTypeArray = Object.entries(expensesByType).map(([type, stats]) => ({
        type,
        amount: stats.amount,
        count: stats.count,
        percentage: totalAmount > 0 ? (stats.amount / totalAmount) * 100 : 0
      }))

      // Calculate expenses by payment method
      const expensesByPaymentMethod = filteredExpensesWithAdvancedFilters.reduce((acc, expense) => {
        const method = expense.payment_method
        if (!acc[method]) {
          acc[method] = { amount: 0, count: 0 }
        }
        acc[method].amount += expense.amount
        acc[method].count++
        return acc
      }, {} as Record<string, { amount: number; count: number }>)

      const expensesByPaymentMethodArray = Object.entries(expensesByPaymentMethod).map(([method, stats]) => ({
        method,
        amount: stats.amount,
        count: stats.count,
        percentage: totalAmount > 0 ? (stats.amount / totalAmount) * 100 : 0
      }))

      const clinicName = settings?.clinic_name || 'عيادة الأسنان الحديثة'
      console.log('🏥 Clinic name for export:', clinicName)

      console.log('🚀 Calling ExportService.exportClinicExpensesToPDF...')
      await ExportService.exportClinicExpensesToPDF(filteredExpensesWithAdvancedFilters, clinicName)
      console.log('✅ PDF export completed successfully')

      notify.exportSuccess(`تم تصدير ${filteredExpensesWithAdvancedFilters.length} مصروف بنجاح إلى ملف PDF مع التنسيق الجميل!`)
    } catch (error) {
      console.error('❌ Error exporting expenses (PDF):', error)
      notify.exportError('فشل في تصدير بيانات المصروفات إلى PDF')
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">خطأ في تحميل البيانات</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => { clearError(); loadExpenses() }}>
            إعادة المحاولة
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-8 h-8 text-primary" />
            مصروفات العيادة
          </h1>
          <p className="text-muted-foreground mt-1">
            إدارة المصروفات التشغيلية للعيادة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={filteredExpensesWithAdvancedFilters.length === 0}>
                <Download className="w-4 h-4 ml-2" />
                تصدير
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportExcel} className="arabic-enhanced">
                <Download className="w-4 h-4 ml-2" />
                تصدير Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* <DropdownMenuItem onClick={handleExportPDF} className="arabic-enhanced">
                <FileText className="w-4 h-4 ml-2" />
                تصدير PDF
              </DropdownMenuItem> */}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة مصروف
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي المصروفات"
          value={<CurrencyDisplay amount={analytics.totalAmount} />}
          icon={<DollarSign />}
          color="blue"
        />
        <StatCard
          title="المدفوع"
          value={<CurrencyDisplay amount={analytics.paidAmount} />}
          icon={<CreditCard />}
          color="green"
        />
        <StatCard
          title="الآجل"
          value={<CurrencyDisplay amount={analytics.pendingAmount} />}
          icon={<Clock />}
          color="yellow"
        />
        <StatCard
          title="المتأخر"
          value={<CurrencyDisplay amount={analytics.overdueAmount} />}
          icon={<AlertTriangle />}
          color="red"
        />
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4" dir="rtl">
            <div className="flex items-center gap-4" dir="rtl">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="البحث بالاسم أو النوع أو المورد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 text-right"
                  dir="rtl"
                />
              </div>
              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    تصفية
                    {(statusFilter !== 'all' || expenseTypeFilter !== 'all' || amountRangeFilter.min || amountRangeFilter.max || dateRangeFilter.start || dateRangeFilter.end) && (
                      <span className="mr-2 w-2 h-2 bg-primary rounded-full"></span>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
              {(searchQuery || statusFilter !== 'all' || expenseTypeFilter !== 'all' || amountRangeFilter.min || amountRangeFilter.max || dateRangeFilter.start || dateRangeFilter.end) && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="w-4 h-4 mr-2" />
                  مسح الكل
                </Button>
              )}
            </div>

            {/* Advanced Filters */}
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <CollapsibleContent className="space-y-4" dir="rtl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg" dir="rtl">
                  {/* Status Filter */}
                  <div className="space-y-2 text-right">
                    <label className="text-sm font-medium">الحالة</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter} dir="rtl">
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="جميع الحالات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الحالات</SelectItem>
                        <SelectItem value="paid">مدفوع</SelectItem>
                        <SelectItem value="pending">آجل</SelectItem>
                        <SelectItem value="overdue">متأخر</SelectItem>
                        <SelectItem value="cancelled">ملغي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Expense Type Filter */}
                  <div className="space-y-2 text-right">
                    <label className="text-sm font-medium">نوع المصروف</label>
                    <Select value={expenseTypeFilter} onValueChange={setExpenseTypeFilter} dir="rtl">
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="جميع الأنواع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الأنواع</SelectItem>
                        <SelectItem value="salary">الرواتب</SelectItem>
                        <SelectItem value="utilities">المرافق</SelectItem>
                        <SelectItem value="rent">الإيجار</SelectItem>
                        <SelectItem value="maintenance">الصيانة</SelectItem>
                        <SelectItem value="supplies">المستلزمات</SelectItem>
                        <SelectItem value="insurance">التأمين</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount Range Filter */}
                  <div className="space-y-2 text-right">
                    <label className="text-sm font-medium">نطاق المبلغ</label>
                    <div className="space-y-2">
                      <Input
                        type="number"
                        placeholder="من مبلغ"
                        value={amountRangeFilter.min}
                        onChange={(e) => setAmountRangeFilter(prev => ({...prev, min: e.target.value}))}
                        className="text-right"
                        dir="rtl"
                      />
                      <Input
                        type="number"
                        placeholder="إلى مبلغ"
                        value={amountRangeFilter.max}
                        onChange={(e) => setAmountRangeFilter(prev => ({...prev, max: e.target.value}))}
                        className="text-right"
                        dir="rtl"
                      />
                    </div>
                  </div>

                  {/* Date Range Filter */}
                  <div className="space-y-2 text-right">
                    <label className="text-sm font-medium">تاريخ الدفع</label>
                    <div className="space-y-2">
                      <Input
                        type="date"
                        placeholder="من تاريخ"
                        value={dateRangeFilter.start}
                        onChange={(e) => setDateRangeFilter(prev => ({...prev, start: e.target.value}))}
                        className="text-right"
                        dir="rtl"
                      />
                      <Input
                        type="date"
                        placeholder="إلى تاريخ"
                        value={dateRangeFilter.end}
                        onChange={(e) => setDateRangeFilter(prev => ({...prev, end: e.target.value}))}
                        className="text-right"
                        dir="rtl"
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <div className="space-y-6">
        <ExpensesTable
          expenses={filteredExpensesWithAdvancedFilters}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          onMarkAsPaid={handleMarkAsPaid}
        />
      </div>

      {/* Dialogs */}
      <AddExpenseDialog
        open={showAddDialog}
        onOpenChange={handleCloseAddDialog}
        editingExpense={editingExpense}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl" className="arabic-enhanced">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 arabic-enhanced">
              <Trash2 className="w-5 h-5 text-destructive" />
              تأكيد حذف المصروف
            </AlertDialogTitle>
            <AlertDialogDescription className="arabic-enhanced">
              هل أنت متأكد من حذف هذا المصروف؟
              <br />
              <strong className="text-destructive">تحذير: لا يمكن التراجع عن هذا الإجراء!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse">
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90 arabic-enhanced"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              تأكيد الحذف
            </AlertDialogAction>
            <AlertDialogCancel className="arabic-enhanced">
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Expense Details Modal */}
      <ExpenseDetailsModal
        expense={selectedExpenseForDetails}
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
      />
    </div>
  )
}

// Stat Card Component
interface StatCardProps {
  title: string
  value: string | number | React.ReactNode
  icon: React.ReactNode
  color: 'blue' | 'green' | 'yellow' | 'red'
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400'
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-lg border rounded-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
          <div className={`p-3 rounded-full bg-muted ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
