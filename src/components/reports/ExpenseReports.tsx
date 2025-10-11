import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useReportsStore } from '@/store/reportsStore'
import { useExpensesStore } from '@/store/expensesStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useRealTimeReportsByType } from '@/hooks/useRealTimeReports'
import { useCurrency } from '@/contexts/CurrencyContext'
import { formatCurrency, formatDate, getChartColors, getChartConfig, formatChartValue } from '@/lib/utils'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { useTheme } from '@/contexts/ThemeContext'
import CurrencyDisplay from '@/components/ui/currency-display'
import { ExportService } from '@/services/exportService'
import { notify } from '@/services/notificationService'
import TimeFilter, { TimeFilterOptions } from '@/components/ui/time-filter'
import useTimeFilteredStats from '@/hooks/useTimeFilteredStats'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  RefreshCw,
  Download,
  PieChart,
  BarChart3,
  Calendar,
  Building2,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'

export default function ExpenseReports() {
  const { expenses, analytics: expensesAnalytics, loadExpenses } = useExpensesStore()
  const { currentCurrency, formatAmount } = useCurrency()
  const { settings } = useSettingsStore()
  const { isDarkMode } = useTheme()

  // Time filtering for expenses
  const expenseStats = useTimeFilteredStats({
    data: expenses,
    dateField: 'payment_date',
    initialFilter: { preset: 'all', startDate: '', endDate: '' }
  })

  // Use real-time reports hook for automatic updates
  useRealTimeReportsByType('financial')

  // Memoize event handler to prevent unnecessary re-renders
  const handleExpenseDataChange = useCallback((event: CustomEvent) => {
    console.log('🔄 Expense data changed:', event.detail)
    // Reload expense data to ensure synchronization
    loadExpenses()
  }, [loadExpenses])

  // Real-time synchronization for expense data changes
  useEffect(() => {
    // Listen for expense data change events
    window.addEventListener('clinic-expenses-changed', handleExpenseDataChange as EventListener)

    return () => {
      window.removeEventListener('clinic-expenses-changed', handleExpenseDataChange as EventListener)
    }
  }, [handleExpenseDataChange])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  // Get professional chart colors
  const categoricalColors = getChartColors('categorical', isDarkMode)
  const primaryColors = getChartColors('primary', isDarkMode)
  const chartConfiguration = getChartConfig(isDarkMode)

  // Calculate expenses analytics from filtered data
  const validateAmount = (amount: any): number => {
    const num = Number(amount)
    return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
  }

  // Memoize filtered expenses to prevent unnecessary re-computations
  const safeExpenseStats = useMemo(() => expenseStats || { filteredData: [] }, [expenseStats])
  const filteredExpenses = useMemo(() => {
    const data = Array.isArray(safeExpenseStats.filteredData) && safeExpenseStats.filteredData.length > 0
      ? safeExpenseStats.filteredData
      : expenses.filter(e => e.status === 'paid')
    return data
  }, [safeExpenseStats, expenses])

  // Calculate comprehensive expense analytics - memoized
  const expenseAnalytics = useMemo(() => {
    const totalAmount = filteredExpenses.reduce((sum, expense) => sum + validateAmount(expense.amount), 0)
    const totalExpenses = filteredExpenses.length
    const averageAmount = totalExpenses > 0 ? totalAmount / totalExpenses : 0

    // Expenses by type
    const expensesByType: Record<string, number> = {}
    filteredExpenses.forEach(expense => {
      const type = expense.expense_type || 'other'
      expensesByType[type] = (expensesByType[type] || 0) + validateAmount(expense.amount)
    })

    // Expenses by vendor
    const expensesByVendor: Record<string, number> = {}
    filteredExpenses.forEach(expense => {
      const vendor = expense.vendor || 'غير محدد'
      expensesByVendor[vendor] = (expensesByVendor[vendor] || 0) + validateAmount(expense.amount)
    })

    // Monthly expenses
    const monthlyExpenses: Record<string, number> = {}
    filteredExpenses.forEach(expense => {
      try {
        const date = new Date(expense.payment_date)
        if (!isNaN(date.getTime())) {
          const month = date.toISOString().slice(0, 7) // YYYY-MM
          monthlyExpenses[month] = (monthlyExpenses[month] || 0) + validateAmount(expense.amount)
        }
      } catch (error) {
        console.warn('Invalid expense date:', expense.payment_date)
      }
    })

    // Status breakdown - use ALL expenses but only count filtered ones for paid status
    // For pending and overdue, we need to show the overall status but filter based on time
    const allExpenses = expenses || []
    const pendingExpenses = allExpenses.filter(e => e.status === 'pending')
    const overdueExpenses = allExpenses.filter(e => e.status === 'overdue')

    // Apply time filter to pending and overdue expenses
    const filteredPendingExpenses = expenseStats?.filteredData?.filter(e => e.status === 'pending') || pendingExpenses
    const filteredOverdueExpenses = expenseStats?.filteredData?.filter(e => e.status === 'overdue') || overdueExpenses

    const statusBreakdown = {
      paid: filteredExpenses.filter(e => e.status === 'paid').length,
      pending: filteredPendingExpenses.length,
      overdue: filteredOverdueExpenses.length
    }

    return {
      totalAmount,
      totalExpenses,
      averageAmount,
      expensesByType,
      expensesByVendor,
      monthlyExpenses,
      statusBreakdown
    }
  }, [filteredExpenses, expenses])

  // Chart data preparation - memoized
  const expensesByTypeData = useMemo(() => Object.entries(expenseAnalytics.expensesByType).map(([type, amount]) => ({
    name: type === 'salary' ? 'رواتب' :
          type === 'utilities' ? 'مرافق' :
          type === 'rent' ? 'إيجار' :
          type === 'maintenance' ? 'صيانة' :
          type === 'supplies' ? 'مستلزمات' :
          type === 'insurance' ? 'تأمين' :
          type === 'other' ? 'أخرى' : type,
    value: validateAmount(amount),
    percentage: expenseAnalytics.totalAmount > 0 ? (validateAmount(amount) / expenseAnalytics.totalAmount) * 100 : 0
  })), [expenseAnalytics])

  const expensesByVendorData = useMemo(() => Object.entries(expenseAnalytics.expensesByVendor)
    .sort(([,a], [,b]) => validateAmount(b) - validateAmount(a))
    .slice(0, 10)
    .map(([vendor, amount]) => ({
      vendor: vendor.length > 20 ? vendor.substring(0, 20) + '...' : vendor,
      amount: validateAmount(amount),
      percentage: expenseAnalytics.totalAmount > 0 ? (validateAmount(amount) / expenseAnalytics.totalAmount) * 100 : 0
    })), [expenseAnalytics])

  const monthlyExpenseData = useMemo(() => Object.entries(expenseAnalytics.monthlyExpenses)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => {
      const date = new Date(month + '-01')
      const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ]
      return {
        month: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
        amount: validateAmount(amount),
        originalMonth: month
      }
    }), [expenseAnalytics])

  const handleExport = useCallback(async () => {
    try {
      if (filteredExpenses.length === 0) {
        notify.noDataToExport('لا توجد بيانات مصروفات للتصدير')
        return
      }

      await ExportService.exportClinicExpensesToExcel(filteredExpenses)
      notify.exportSuccess(`تم تصدير ${filteredExpenses.length} مصروف بنجاح إلى ملف Excel!`)
    } catch (error) {
      console.error('Error exporting expense reports:', error)
      notify.exportError('فشل في تصدير تقارير المصروفات')
    }
  }, [filteredExpenses])

  const handleRefresh = useCallback(async () => {
    try {
      await loadExpenses()
      const event = new CustomEvent('showToast', {
        detail: {
          title: 'تم التحديث بنجاح',
          description: 'تم تحديث تقارير المصروفات',
          type: 'success'
        }
      })
      window.dispatchEvent(event)
    } catch (error) {
      console.error('Error refreshing expense reports:', error)
      const event = new CustomEvent('showToast', {
        detail: {
          title: 'خطأ في التحديث',
          description: 'فشل في تحديث تقارير المصروفات',
          type: 'error'
        }
      })
      window.dispatchEvent(event)
    }
  }, [loadExpenses])

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">تقارير مصروفات العيادة</h2>
          <p className="text-muted-foreground mt-1">
            تحليل شامل لمصروفات العيادة وإحصائيات مفصلة
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>البيانات محدثة في الوقت الفعلي</span>
            </div>
            {filteredExpenses.length > 0 && (
              <div className="text-xs text-muted-foreground">
                • {filteredExpenses.length} مصروف
                {expenseStats.timeFilter?.startDate && expenseStats.timeFilter?.endDate &&
                  ` (مفلترة)`
                }
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredExpenses.length === 0}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير Excel
          </Button>
        </div>
      </div>

      {/* Time Filter Section */}
      <TimeFilter
        value={expenseStats.timeFilter}
        onChange={expenseStats.handleFilterChange}
        onClear={expenseStats.resetFilter}
        title="فلترة زمنية - المصروفات"
        defaultOpen={false}
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className={getCardStyles("red")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">إجمالي المصروفات</CardTitle>
            <DollarSign className={`h-4 w-4 ${getIconStyles("red")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              <CurrencyDisplay
                amount={expenseAnalytics.totalAmount}
                currency={currentCurrency}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              من {expenseAnalytics.totalExpenses} مصروف
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("blue")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">متوسط المصروف</CardTitle>
            <BarChart3 className={`h-4 w-4 ${getIconStyles("blue")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              <CurrencyDisplay
                amount={expenseAnalytics.averageAmount}
                currency={currentCurrency}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              متوسط قيمة المصروف
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("green")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">المصروفات المدفوعة</CardTitle>
            <CheckCircle className={`h-4 w-4 ${getIconStyles("green")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              {expenseAnalytics.statusBreakdown.paid}
            </div>
            <p className="text-xs text-muted-foreground text-right">
              مصروفات مكتملة الدفع
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("yellow")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">المصروفات الآجلة</CardTitle>
            <Clock className={`h-4 w-4 ${getIconStyles("yellow")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              {expenseAnalytics.statusBreakdown.pending + expenseAnalytics.statusBreakdown.overdue}
            </div>
            <p className="text-xs text-muted-foreground text-right">
              في انتظار الدفع أو متأخرة
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <PieChart className="w-5 h-5" />
              <span>توزيع المصروفات حسب النوع</span>
            </CardTitle>
            <CardDescription>
              توزيع المصروفات المدفوعة حسب النوع ({formatAmount(expenseAnalytics.totalAmount)} إجمالي)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expensesByTypeData.length === 0 ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                <div className="text-center">
                  <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد بيانات مصروفات حسب النوع</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={chartConfiguration.responsive.desktop.height}>
                <RechartsPieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <Pie
                    data={expensesByTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    innerRadius={50}
                    fill="#8884d8"
                    dataKey="value"
                    stroke={isDarkMode ? '#1f2937' : '#ffffff'}
                    strokeWidth={2}
                    paddingAngle={2}
                  >
                    {expensesByTypeData.map((entry, index) => (
                      <Cell key={`expense-type-${index}`} fill={categoricalColors[index % categoricalColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      formatAmount(Number(value)),
                      'المبلغ'
                    ]}
                    labelFormatter={(label) => `نوع المصروف: ${label}`}
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#374151' : '#d1d5db'}`,
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            )}

            {/* Type Legend */}
            {expensesByTypeData.length > 0 && (
              <div className="mt-6 flex flex-col items-center space-y-3">
                <div className="text-sm font-medium text-foreground mb-2">
                  تفاصيل التوزيع
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                  {expensesByTypeData.map((type, index) => (
                    <div key={`type-legend-${index}`} className="flex items-center justify-center space-x-2 space-x-reverse bg-muted/30 rounded-lg p-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: categoricalColors[index % categoricalColors.length] }}
                      />
                      <div className="text-center">
                        <div className="font-medium text-foreground">
                          {type.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <CurrencyDisplay amount={type.value} /> ({type.percentage.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Vendor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Building2 className="w-5 h-5" />
              <span>أكبر الموردين</span>
            </CardTitle>
            <CardDescription>
              أكبر 10 موردين حسب إجمالي المصروفات
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expensesByVendorData.length === 0 ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                <div className="text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد بيانات موردين</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={chartConfiguration.responsive.desktop.height}>
                <BarChart
                  data={expensesByVendorData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  layout="horizontal"
                >
                  <CartesianGrid
                    strokeDasharray={chartConfiguration.grid.strokeDasharray}
                    stroke={chartConfiguration.grid.stroke}
                    strokeOpacity={chartConfiguration.grid.strokeOpacity}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                    axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    tickFormatter={(value) => formatChartValue(value, 'currency', currentCurrency)}
                  />
                  <YAxis
                    type="category"
                    dataKey="vendor"
                    tick={{ fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                    axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    width={120}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatAmount(Number(value)),
                      'المبلغ'
                    ]}
                    labelFormatter={(label) => `المورد: ${label}`}
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#374151' : '#d1d5db'}`,
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  />
                  <Bar
                    dataKey="amount"
                    fill={primaryColors[2]}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Expenses Chart */}
      {monthlyExpenseData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <TrendingUp className="w-5 h-5" />
              <span>المصروفات الشهرية</span>
            </CardTitle>
            <CardDescription>
              تطور المصروفات عبر الأشهر ({monthlyExpenseData.length} شهر)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={chartConfiguration.responsive.large.height}>
              <AreaChart
                data={monthlyExpenseData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray={chartConfiguration.grid.strokeDasharray}
                  stroke={chartConfiguration.grid.stroke}
                  strokeOpacity={chartConfiguration.grid.strokeOpacity}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                  axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                  tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                  axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                  tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                  tickFormatter={(value) => formatChartValue(value, 'currency', currentCurrency)}
                  domain={[0, 'dataMax + 100']}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value), currentCurrency), 'المصروفات']}
                  labelFormatter={(label) => `الشهر: ${label}`}
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#374151' : '#d1d5db'}`,
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={primaryColors[3]}
                  fill={primaryColors[3]}
                  fillOpacity={0.3}
                  strokeWidth={3}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Monthly Summary */}
            {monthlyExpenseData.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-xs text-muted-foreground">أعلى شهر</div>
                  <div className="font-semibold">
                    {(() => {
                      const amounts = monthlyExpenseData.map(d => d.amount).filter(a => a > 0)
                      return amounts.length > 0
                        ? formatCurrency(Math.max(...amounts), currentCurrency)
                        : formatCurrency(0, currentCurrency)
                    })()}
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-xs text-muted-foreground">متوسط شهري</div>
                  <div className="font-semibold">
                    {(() => {
                      const amounts = monthlyExpenseData.map(d => d.amount).filter(a => a > 0)
                      return amounts.length > 0
                        ? formatCurrency(amounts.reduce((sum, a) => sum + a, 0) / amounts.length, currentCurrency)
                        : formatCurrency(0, currentCurrency)
                    })()}
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-xs text-muted-foreground">أقل شهر</div>
                  <div className="font-semibold">
                    {(() => {
                      const amounts = monthlyExpenseData.map(d => d.amount).filter(a => a > 0)
                      return amounts.length > 0
                        ? formatCurrency(Math.min(...amounts), currentCurrency)
                        : formatCurrency(0, currentCurrency)
                    })()}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Expenses Table */}
      {filteredExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Receipt className="w-5 h-5" />
              <span>المصروفات الحديثة</span>
            </CardTitle>
            <CardDescription>
              آخر {Math.min(10, filteredExpenses.length)} مصروف
              {expenseStats.timeFilter?.startDate && expenseStats.timeFilter?.endDate &&
                ` في الفترة من ${expenseStats.timeFilter.startDate} إلى ${expenseStats.timeFilter.endDate}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-right p-3 font-semibold text-muted-foreground">اسم المصروف</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">النوع</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">المبلغ</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">المورد</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">حالة الدفع</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">تاريخ الدفع</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses
                    .sort((a, b) => new Date(b.payment_date || b.created_at).getTime() - new Date(a.payment_date || a.created_at).getTime())
                    .slice(0, 10)
                    .map((expense, index) => {
                      const statusColors = {
                        'paid': 'text-green-600 bg-green-50 dark:bg-green-900/20',
                        'pending': 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
                        'overdue': 'text-red-600 bg-red-50 dark:bg-red-900/20',
                        'cancelled': 'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
                      }

                      const statusLabels = {
                        'paid': 'مدفوع',
                        'pending': 'آجل',
                        'overdue': 'متأخر',
                        'cancelled': 'ملغي'
                      }

                      const typeLabels = {
                        'salary': 'رواتب',
                        'utilities': 'مرافق',
                        'rent': 'إيجار',
                        'maintenance': 'صيانة',
                        'supplies': 'مستلزمات',
                        'insurance': 'تأمين',
                        'other': 'أخرى'
                      }

                      return (
                        <tr key={expense.id || index} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                          <td className="p-3 text-right">
                            <div className="font-medium">
                              {expense.expense_name || 'غير محدد'}
                            </div>
                            {expense.description && (
                              <div className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                                {expense.description}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-sm">
                              {typeLabels[expense.expense_type] || expense.expense_type || 'غير محدد'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="font-semibold">
                              <CurrencyDisplay
                                amount={expense.amount}
                                currency={currentCurrency}
                              />
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-sm">
                              {expense.vendor || 'غير محدد'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[expense.status] || 'text-gray-600 bg-gray-50'}`}>
                              {statusLabels[expense.status] || expense.status || 'غير محدد'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-sm text-muted-foreground">
                              {formatDate(expense.payment_date || expense.created_at)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>

            {filteredExpenses.length > 10 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  عرض 10 من أصل {filteredExpenses.length} مصروف
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}