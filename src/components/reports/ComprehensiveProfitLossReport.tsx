import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText,
  Download,
  Users,
  Calendar,
  Building2,
  Package,
  BarChart3,
  PieChart,
  Receipt,
  Filter
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
  Cell
} from 'recharts'
import { usePaymentStore } from '@/store/paymentStore'
import { useExpensesStore } from '@/store/expensesStore'
import { useLabOrderStore } from '@/store/labOrderStore'
import { useClinicNeedsStore } from '@/store/clinicNeedsStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { usePatientStore } from '@/store/patientStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useTheme } from '@/contexts/ThemeContext'
import { ComprehensiveProfitLossService } from '@/services/comprehensiveProfitLossService'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'

import CurrencyDisplay from '@/components/ui/currency-display'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExportService } from '@/services/exportService'
import { PdfService } from '@/services/pdfService'
import { notify } from '@/services/notificationService'
import { TIME_PERIODS, TimePeriod } from '@/services/comprehensiveExportService'
import type { ComprehensiveProfitLossReport } from '@/types'
import { safeString, safeNumber } from '@/utils/safeStringUtils'

function ComprehensiveProfitLossReportComponent() {
  const { payments } = usePaymentStore()
  const { expenses: clinicExpenses } = useExpensesStore()
  const { labOrders } = useLabOrderStore()
  const { needs: clinicNeeds } = useClinicNeedsStore()
  const { items: inventoryItems } = useInventoryStore()
  const { patients } = usePatientStore()
  const { appointments } = useAppointmentStore()
  const { currency, settings } = useSettingsStore()
  const { isDarkMode } = useTheme()

  const [reportData, setReportData] = useState<ComprehensiveProfitLossReport | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('this_month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Memoize store data to prevent unnecessary re-computations
  const storeData = useMemo(() => ({
    payments,
    clinicExpenses,
    labOrders,
    clinicNeeds,
    inventoryItems,
    patients,
    appointments
  }), [payments, clinicExpenses, labOrders, clinicNeeds, inventoryItems, patients, appointments])
  // دالة مساعدة لتحويل التاريخ إلى تنسيق محلي YYYY-MM-DD
  const formatDateToLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // دالة لتحويل TimePeriod إلى نطاق تاريخ
  const getDateRangeFromPeriod = (period: TimePeriod, customStart?: string, customEnd?: string) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (period) {
      case 'all':
        return null

      case 'today':
        return {
          start: formatDateToLocal(today),
          end: formatDateToLocal(today)
        }

      case 'yesterday':
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        return {
          start: formatDateToLocal(yesterday),
          end: formatDateToLocal(yesterday)
        }

      case 'this_week':
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        return {
          start: formatDateToLocal(weekStart),
          end: formatDateToLocal(today)
        }

      case 'last_week':
        const lastWeekEnd = new Date(today)
        lastWeekEnd.setDate(today.getDate() - today.getDay() - 1)
        const lastWeekStart = new Date(lastWeekEnd)
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6)
        return {
          start: formatDateToLocal(lastWeekStart),
          end: formatDateToLocal(lastWeekEnd)
        }

      case 'this_month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        return {
          start: formatDateToLocal(monthStart),
          end: formatDateToLocal(today)
        }

      case 'last_month':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
        return {
          start: formatDateToLocal(lastMonthStart),
          end: formatDateToLocal(lastMonthEnd)
        }

      case 'this_quarter':
        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)
        return {
          start: formatDateToLocal(quarterStart),
          end: formatDateToLocal(today)
        }

      case 'last_quarter':
        const lastQuarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 - 3, 1)
        const lastQuarterEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 0)
        return {
          start: formatDateToLocal(lastQuarterStart),
          end: formatDateToLocal(lastQuarterEnd)
        }

      case 'this_year':
        const yearStart = new Date(today.getFullYear(), 0, 1)
        return {
          start: formatDateToLocal(yearStart),
          end: formatDateToLocal(today)
        }

      case 'last_year':
        const lastYearStart = new Date(today.getFullYear() - 1, 0, 1)
        const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31)
        return {
          start: formatDateToLocal(lastYearStart),
          end: formatDateToLocal(lastYearEnd)
        }

      case 'last_30_days':
        const thirtyDaysAgo = new Date(today)
        thirtyDaysAgo.setDate(today.getDate() - 30)
        return {
          start: formatDateToLocal(thirtyDaysAgo),
          end: formatDateToLocal(today)
        }

      case 'last_90_days':
        const ninetyDaysAgo = new Date(today)
        ninetyDaysAgo.setDate(today.getDate() - 90)
        return {
          start: formatDateToLocal(ninetyDaysAgo),
          end: formatDateToLocal(today)
        }

      case 'custom':
        if (customStart && customEnd) {
          return {
            start: customStart,
            end: customEnd
          }
        }
        return null

      default:
        return null
    }
  }

  // Memoize date range calculation
  const dateRange = useMemo(() => getDateRangeFromPeriod(selectedPeriod, customStartDate, customEndDate), [selectedPeriod, customStartDate, customEndDate])


  // إنشاء التقرير - memoized callback to prevent unnecessary re-renders
  const generateReport = useCallback(async () => {
    setIsLoading(true)
    try {
      const reportFilter = dateRange ? { dateRange } : undefined

      const report = ComprehensiveProfitLossService.generateComprehensiveProfitLossReport(
        storeData.payments,
        storeData.labOrders,
        storeData.clinicNeeds,
        storeData.inventoryItems,
        storeData.patients,
        storeData.appointments,
        reportFilter,
        storeData.clinicExpenses // تمرير مصروفات العيادة المباشرة
      )
      setReportData(report)
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('Error generating comprehensive profit/loss report:', error)
    } finally {
      setIsLoading(false)
    }
  }, [storeData, dateRange])

  // تصدير Excel - memoized callback for stability
  const handleExportExcel = useCallback(async () => {
    if (!reportData) {
      notify.error('لا توجد بيانات للتصدير')
      return
    }

    setIsExporting(true)
    try {
      await ExportService.exportProfitLossToExcel({
        reportData,
        ...storeData,
        filter: dateRange,
        currency
      })
      notify.success('تم تصدير تقرير الأرباح والخسائر إلى Excel بنجاح')
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('Error exporting to Excel:', error)
      notify.error('فشل في تصدير التقرير إلى Excel')
    } finally {
      setIsExporting(false)
    }
  }, [reportData, storeData, dateRange, currency])

  // تصدير PDF - memoized callback for stability
  const handleExportPDF = useCallback(async () => {
    if (!reportData) {
      notify.error('لا توجد بيانات للتصدير')
      return
    }

    setIsExporting(true)
    try {
      await PdfService.exportProfitLossReport({
        reportData,
        ...storeData,
        filter: dateRange,
        currency
      }, settings)
      notify.success('تم تصدير تقرير الأرباح والخسائر إلى PDF بنجاح')
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('Error exporting to PDF:', error)
      notify.error('فشل في تصدير التقرير إلى PDF')
    } finally {
      setIsExporting(false)
    }
  }, [reportData, storeData, dateRange, currency, settings])

  // إنشاء التقرير عند تحميل المكون أو تغيير الفلتر
  useEffect(() => {
    generateReport()
  }, [generateReport])

  // ألوان المخططات - memoized (moved before early return to avoid Rules of Hooks violation)
  const chartColors = useMemo(() => ({
    primary: isDarkMode ? '#3b82f6' : '#2563eb',
    secondary: isDarkMode ? '#10b981' : '#059669',
    warning: isDarkMode ? '#f59e0b' : '#d97706',
    danger: isDarkMode ? '#ef4444' : '#dc2626',
    purple: isDarkMode ? '#8b5cf6' : '#7c3aed',
    teal: isDarkMode ? '#14b8a6' : '#0d9488'
  }), [isDarkMode])

  // بيانات توزيع الإيرادات - memoized (moved before early return to avoid Rules of Hooks violation)
  const revenueDistributionData = useMemo(() => {
    if (!reportData) return []
    const { revenue } = reportData
    return [
      {
        name: 'مدفوعات مكتملة',
        value: revenue.completedPayments,
        color: chartColors.secondary,
        percentage: revenue.totalRevenue > 0 ? ((revenue.completedPayments / revenue.totalRevenue) * 100).toFixed(1) : '0'
      },
      {
        name: 'مدفوعات جزئية',
        value: revenue.partialPayments,
        color: chartColors.warning,
        percentage: revenue.totalRevenue > 0 ? ((revenue.partialPayments / revenue.totalRevenue) * 100).toFixed(1) : '0'
      },
      {
        name: 'مبالغ آجلة',
        value: revenue.pendingAmount || 0,
        color: chartColors.danger,
        percentage: revenue.totalRevenue > 0 ? (((revenue.pendingAmount || 0) / revenue.totalRevenue) * 100).toFixed(1) : '0'
      },
      {
        name: 'مبالغ متبقية',
        value: revenue.remainingBalances,
        color: chartColors.purple,
        percentage: revenue.totalRevenue > 0 ? ((revenue.remainingBalances / revenue.totalRevenue) * 100).toFixed(1) : '0'
      }
    ].filter(item => item.value > 0)
  }, [reportData, chartColors])

  // بيانات توزيع المصروفات - memoized (moved before early return to avoid Rules of Hooks violation)
  const expensesDistributionData = useMemo(() => {
    if (!reportData) return []
    const { expenses, calculations } = reportData
    return [
      {
        name: 'طلبات المخابر',
        value: expenses.labOrdersTotal,
        color: chartColors.primary,
        percentage: calculations.totalExpenses > 0 ? ((expenses.labOrdersTotal / calculations.totalExpenses) * 100).toFixed(1) : '0'
      },
      {
        name: 'احتياجات العيادة',
        value: expenses.clinicNeedsTotal,
        color: chartColors.secondary,
        percentage: calculations.totalExpenses > 0 ? ((expenses.clinicNeedsTotal / calculations.totalExpenses) * 100).toFixed(1) : '0'
      },
      {
        name: 'تكلفة المخزون',
        value: expenses.inventoryExpenses,
        color: chartColors.warning,
        percentage: calculations.totalExpenses > 0 ? ((expenses.inventoryExpenses / calculations.totalExpenses) * 100).toFixed(1) : '0'
      },
      {
        name: 'مصروفات مباشرة',
        value: expenses.clinicExpensesTotal || 0,
        color: chartColors.danger,
        percentage: calculations.totalExpenses > 0 ? (((expenses.clinicExpensesTotal || 0) / calculations.totalExpenses) * 100).toFixed(1) : '0'
      }
    ].filter(item => item.value > 0)
  }, [reportData, chartColors])

  // بيانات مقارنة الإيرادات والمصروفات - memoized (moved before early return to avoid Rules of Hooks violation)
  const comparisonData = useMemo(() => {
    if (!reportData) return []
    const { revenue, calculations } = reportData
    return [
      {
        name: 'الإيرادات',
        value: revenue.totalRevenue,
        type: 'revenue'
      },
      {
        name: 'المصروفات',
        value: calculations.totalExpenses,
        type: 'expenses'
      },
      {
        name: 'صافي الربح',
        value: calculations.isProfit ? calculations.netProfit : -calculations.lossAmount,
        type: 'profit'
      }
    ]
  }, [reportData])

  // دالة لرسم المخططات - memoized to prevent unnecessary re-renders (moved before early return to avoid Rules of Hooks violation)
  const renderCharts = useMemo(() => {
    if (!reportData) {
      return <div>Loading charts...</div>
    }

    const { revenue, expenses, calculations, details, filterInfo } = reportData

    // إعدادات المخططات
    const chartConfig = {
      tooltip: {
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
        borderRadius: '8px',
        color: isDarkMode ? '#f9fafb' : '#111827'
      },
      grid: {
        strokeDasharray: '3 3',
        stroke: isDarkMode ? '#374151' : '#e5e7eb',
        strokeOpacity: 0.5
      }
    }

    return (
      <>
        {/* مخططات توزيع الإيرادات والمصروفات */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
          {/* مخطط توزيع الإيرادات */}
          <Card dir="rtl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <PieChart className="w-5 h-5" />
                <span>توزيع الإيرادات</span>
              </CardTitle>
              <CardDescription>
                توزيع الإيرادات حسب نوع المدفوعات ({revenueDistributionData.length} فئة)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {revenueDistributionData.length === 0 ? (
                <div className="flex items-center justify-center h-80 text-muted-foreground">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد بيانات إيرادات متاحة</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <Pie
                      data={revenueDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) =>
                        `${name}: ${percentage}%`
                      }
                      outerRadius={100}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      stroke={isDarkMode ? '#1f2937' : '#ffffff'}
                      strokeWidth={2}
                      paddingAngle={2}
                    >
                      {revenueDistributionData.map((entry, index) => (
                        <Cell key={`revenue-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        Number(value).toLocaleString('ar-EG', { style: 'currency', currency }),
                        'المبلغ'
                      ]}
                      labelFormatter={(label) => `نوع الإيراد: ${label}`}
                      contentStyle={chartConfig.tooltip}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}

              {/* مفتاح الإيرادات */}
              {revenueDistributionData.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  {revenueDistributionData.map((item, index) => (
                    <div key={`revenue-legend-${index}`} className="flex items-center space-x-2 space-x-reverse">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">
                        {item.name}: <CurrencyDisplay amount={item.value} currency={currency} /> ({item.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* مخطط توزيع المصروفات */}
          <Card dir="rtl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <PieChart className="w-5 h-5" />
                <span>توزيع المصروفات</span>
              </CardTitle>
              <CardDescription>
                توزيع المصروفات حسب النوع ({expensesDistributionData.length} فئة)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expensesDistributionData.length === 0 ? (
                <div className="flex items-center justify-center h-80 text-muted-foreground">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد مصروفات متاحة</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <Pie
                      data={expensesDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) =>
                        `${name}: ${percentage}%`
                      }
                      outerRadius={100}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      stroke={isDarkMode ? '#1f2937' : '#ffffff'}
                      strokeWidth={2}
                      paddingAngle={2}
                    >
                      {expensesDistributionData.map((entry, index) => (
                        <Cell key={`expense-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        Number(value).toLocaleString('ar-EG', { style: 'currency', currency }),
                        'المبلغ'
                      ]}
                      labelFormatter={(label) => `نوع المصروف: ${label}`}
                      contentStyle={chartConfig.tooltip}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}

              {/* مفتاح المصروفات */}
              {expensesDistributionData.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  {expensesDistributionData.map((item, index) => (
                    <div key={`expense-legend-${index}`} className="flex items-center space-x-2 space-x-reverse">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">
                        {item.name}: <CurrencyDisplay amount={item.value} currency={currency} /> ({item.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* مخطط مقارنة الإيرادات والمصروفات */}
        <Card dir="rtl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <BarChart3 className="w-5 h-5" />
              <span>مقارنة الإيرادات والمصروفات</span>
            </CardTitle>
            <CardDescription>
              مقارنة شاملة بين الإيرادات والمصروفات وصافي الربح/الخسارة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={comparisonData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                barCategoryGap="20%"
              >
                <CartesianGrid
                  strokeDasharray={chartConfig.grid.strokeDasharray}
                  stroke={chartConfig.grid.stroke}
                  strokeOpacity={chartConfig.grid.strokeOpacity}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 14, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                  axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                  tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                />
                <YAxis
                  tick={{ fontSize: 14, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                  axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                  tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                  tickFormatter={(value) => {
                    if (Math.abs(value) >= 1000) {
                      return `${(value / 1000).toFixed(0)}k`
                    }
                    return safeString(value)
                  }}
                />
                <Tooltip
                  formatter={(value) => [
                    Number(value).toLocaleString('ar-EG', { style: 'currency', currency }),
                    'المبلغ'
                  ]}
                  labelFormatter={(label) => label}
                  contentStyle={chartConfig.tooltip}
                />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  minPointSize={5}
                  maxBarSize={100}
                  isAnimationActive={false}
                  animationDuration={0}
                >
                  {comparisonData.map((entry, index) => (
                    <Cell
                      key={`comparison-${index}`}
                      fill={
                        entry.type === 'revenue' ? chartColors.secondary :
                        entry.type === 'expenses' ? chartColors.danger :
                        entry.value >= 0 ? chartColors.secondary : chartColors.danger
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* ملخص المقارنة */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/50 rounded">
                <div className="text-xs text-green-600 dark:text-green-400">الإيرادات</div>
                <div className="font-semibold text-green-700 dark:text-green-300">
                  <CurrencyDisplay amount={revenue.totalRevenue} currency={currency} />
                </div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950/50 rounded">
                <div className="text-xs text-red-600 dark:text-red-400">المصروفات</div>
                <div className="font-semibold text-red-700 dark:text-red-300">
                  <CurrencyDisplay amount={calculations.totalExpenses} currency={currency} />
                </div>
              </div>
              <div className={`text-center p-3 rounded ${calculations.isProfit ? 'bg-blue-50 dark:bg-blue-950/50' : 'bg-orange-50 dark:bg-orange-950/50'}`}>
                <div className={`text-xs ${calculations.isProfit ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {calculations.isProfit ? 'صافي الربح' : 'صافي الخسارة'}
                </div>
                <div className={`font-semibold ${calculations.isProfit ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
                  <CurrencyDisplay
                    amount={calculations.isProfit ? calculations.netProfit : calculations.lossAmount}
                    currency={currency}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* مخطط تفصيلي للمدفوعات */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
          {/* مخطط حالات المدفوعات */}
          <Card dir="rtl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <Receipt className="w-5 h-5" />
                <span>حالات المدفوعات</span>
              </CardTitle>
              <CardDescription>
                توزيع المدفوعات حسب الحالة ({payments.length} مدفوعة)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const paymentStatusData = [
                  {
                    name: 'مكتملة',
                    value: payments.filter(p => p.status === 'completed').length,
                    color: chartColors.secondary,
                    amount: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0)
                  },
                  {
                    name: 'جزئية',
                    value: payments.filter(p => p.status === 'partial').length,
                    color: chartColors.warning,
                    amount: payments.filter(p => p.status === 'partial').reduce((sum, p) => sum + (p.amount || 0), 0)
                  },
                  {
                    name: 'آجلة',
                    value: payments.filter(p => p.status === 'pending').length,
                    color: chartColors.danger,
                    amount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.total_amount_due || p.amount || 0), 0)
                  }
                ].filter(item => item.value > 0)

                return paymentStatusData.length === 0 ? (
                  <div className="flex items-center justify-center h-80 text-muted-foreground">
                    <div className="text-center">
                      <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد مدفوعات متاحة</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={paymentStatusData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        barCategoryGap="20%"
                      >
                        <CartesianGrid
                          strokeDasharray={chartConfig.grid.strokeDasharray}
                          stroke={chartConfig.grid.stroke}
                          strokeOpacity={chartConfig.grid.strokeOpacity}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 14, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                          axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                          tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                        />
                        <YAxis
                          tick={{ fontSize: 14, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                          axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                          tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                        />
                        <Tooltip
                          formatter={(value, _, props) => [
                            `${value} مدفوعة`,
                            'العدد',
                            Number(props?.payload?.amount ?? 0).toLocaleString('ar-EG', { style: 'currency', currency })
                          ]}
                          labelFormatter={(label) => `الحالة: ${label}`}
                          contentStyle={chartConfig.tooltip}
                        />
                        <Bar
                          dataKey="value"
                          radius={[4, 4, 0, 0]}
                          minPointSize={5}
                          maxBarSize={80}
                        >
                          {paymentStatusData.map((entry, index) => (
                            <Cell key={`status-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    {/* ملخص حالات المدفوعات */}
                    <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                      {paymentStatusData.map((status, index) => (
                        <div key={`status-summary-${index}`} className="text-center p-2 bg-muted/50 rounded">
                          <div className="text-xs text-muted-foreground">{status.name}</div>
                          <div className="font-semibold">{status.value} مدفوعة</div>
                          <div className="text-xs">
                            <CurrencyDisplay amount={status.amount} currency={currency} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )
              })()}
            </CardContent>
          </Card>

          {/* مخطط هامش الربح */}
          <Card dir="rtl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <TrendingUp className="w-5 h-5" />
                <span>تحليل الربحية</span>
              </CardTitle>
              <CardDescription>
                تحليل مفصل لهامش الربح والأداء المالي
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* مؤشر هامش الربح */}
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">
                    <span className={calculations.isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {calculations.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">هامش الربح</div>
                </div>

                {/* شريط تقدم هامش الربح */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>الأداء المالي</span>
                    <span className={calculations.isProfit ? 'text-green-600' : 'text-red-600'}>
                      {calculations.isProfit ? 'ربح' : 'خسارة'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        calculations.isProfit ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.min(Math.abs(calculations.profitMargin), 100)}%`
                      }}
                    />
                  </div>
                </div>

                {/* إحصائيات مفصلة */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded">
                    <div className="text-xs text-blue-600 dark:text-blue-400">نسبة المصروفات</div>
                    <div className="font-semibold text-blue-700 dark:text-blue-300">
                      {revenue.totalRevenue > 0 ? ((calculations.totalExpenses / revenue.totalRevenue) * 100).toFixed(1) : '0'}%
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/50 rounded">
                    <div className="text-xs text-purple-600 dark:text-purple-400">كفاءة التكلفة</div>
                    <div className="font-semibold text-purple-700 dark:text-purple-300">
                      {calculations.totalExpenses > 0 ? ((revenue.totalRevenue / calculations.totalExpenses) * 100).toFixed(0) : '0'}%
                    </div>
                  </div>
                  <div className="p-3 bg-teal-50 dark:bg-teal-950/50 rounded">
                    <div className="text-xs text-teal-600 dark:text-teal-400">متوسط المعاملة</div>
                    <div className="font-semibold text-teal-700 dark:text-teal-300">
                      <CurrencyDisplay
                        amount={payments.length > 0 ? revenue.totalRevenue / payments.length : 0}
                        currency={currency}
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/50 rounded">
                    <div className="text-xs text-orange-600 dark:text-orange-400">المبالغ الآجلة</div>
                    <div className="font-semibold text-orange-700 dark:text-orange-300">
                      <CurrencyDisplay amount={revenue.pendingAmount || 0} currency={currency} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }, [reportData, revenueDistributionData, expensesDistributionData, comparisonData, chartColors, currency, isDarkMode, payments])

  if (isLoading || !reportData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">جاري حساب التقرير الشامل...</p>
        </div>
      </div>
    )
  }

  const { revenue, expenses, calculations, details, filterInfo } = reportData


  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Calculator className="w-6 h-6" />
            التقرير الشامل للأرباح والخسائر
          </h2>
          <p className="text-muted-foreground mt-1">
            تحليل مالي شامل يربط جميع جوانب العيادة - {filterInfo.dateRange}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={isExporting || !reportData}
          >
            <Download className="w-4 h-4 ml-2" />
            {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExporting || !reportData}
          >
            <FileText className="w-4 h-4 ml-2" />
            {isExporting ? 'جاري التصدير...' : 'تصدير اكسل'}
          </Button>
        </div>
      </div>

      {/* Time Filter */}
      <Card className={getCardStyles("blue")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Filter className={`w-5 h-5 ${getIconStyles("blue")}`} />
            فلترة التقرير
          </CardTitle>
          <CardDescription>
            اختر الفترة الزمنية للتقرير الشامل للأرباح والخسائر
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Period Selection */}
            <div className="space-y-2">
              <Label htmlFor="period">الفترة الزمنية</Label>
              <Select value={selectedPeriod} onValueChange={(value: TimePeriod) => setSelectedPeriod(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفترة الزمنية" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIME_PERIODS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {selectedPeriod === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="startDate">تاريخ البداية</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">تاريخ النهاية</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* النتيجة النهائية */}
      <Card className={calculations.isProfit ? getCardStyles("green") : getCardStyles("red")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            {calculations.isProfit ? (
              <>
                <TrendingUp className={`w-6 h-6 ${getIconStyles("green")}`} />
                <span>ربح</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {calculations.profitMargin.toFixed(1)}%
                </Badge>
              </>
            ) : (
              <>
                <TrendingDown className={`w-6 h-6 ${getIconStyles("red")}`} />
                <span>خسارة</span>
                <Badge variant="destructive">
                  خسارة
                </Badge>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {calculations.isProfit ? (
              <CurrencyDisplay amount={calculations.netProfit} currency={currency} />
            ) : (
              <CurrencyDisplay amount={calculations.lossAmount} currency={currency} />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {calculations.isProfit
              ? `صافي الربح بنسبة ${calculations.profitMargin.toFixed(1)}%`
              : `إجمالي الخسارة من العمليات`
            }
          </p>
        </CardContent>
      </Card>

      {/* الإيرادات والمصروفات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* الإيرادات */}
        <Card className={getCardStyles("blue")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <TrendingUp className={`w-5 h-5 ${getIconStyles("blue")}`} />
              إجمالي الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={revenue.totalRevenue} currency={currency} />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">المدفوعات المكتملة</span>
                <CurrencyDisplay amount={revenue.completedPayments} currency={currency} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">المدفوعات الجزئية</span>
                <CurrencyDisplay amount={revenue.partialPayments} currency={currency} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">المبالغ المتبقية</span>
                <CurrencyDisplay amount={revenue.remainingBalances} currency={currency} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* المصروفات */}
        <Card className={getCardStyles("red")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <TrendingDown className={`w-5 h-5 ${getIconStyles("red")}`} />
              إجمالي المصروفات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={calculations.totalExpenses} currency={currency} />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">مدفوعات المخابر</span>
                <CurrencyDisplay amount={expenses.labOrdersTotal} currency={currency} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">متبقي المخابر</span>
                <CurrencyDisplay amount={expenses.labOrdersRemaining} currency={currency} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">احتياجات العيادة</span>
                <CurrencyDisplay amount={expenses.clinicNeedsTotal} currency={currency} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">متبقي الاحتياجات</span>
                <CurrencyDisplay amount={expenses.clinicNeedsRemaining} currency={currency} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">قيمة المخزون</span>
                <CurrencyDisplay amount={expenses.inventoryExpenses} currency={currency} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">مصروفات العيادة المباشرة</span>
                <CurrencyDisplay amount={expenses.clinicExpensesTotal || 0} currency={currency} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* إحصائيات إضافية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={getCardStyles("purple")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className={`w-8 h-8 ${getIconStyles("purple")}`} />
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المرضى</p>
                <p className="text-xl font-bold">{details.totalPatients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={getCardStyles("orange")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className={`w-8 h-8 ${getIconStyles("orange")}`} />
              <div>
                <p className="text-sm text-muted-foreground">المواعيد</p>
                <p className="text-xl font-bold">{details.totalAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={getCardStyles("cyan")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className={`w-8 h-8 ${getIconStyles("cyan")}`} />
              <div>
                <p className="text-sm text-muted-foreground">طلبات المخابر</p>
                <p className="text-xl font-bold">{details.totalLabOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={getCardStyles("indigo")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className={`w-8 h-8 ${getIconStyles("indigo")}`} />
              <div>
                <p className="text-sm text-muted-foreground">احتياجات العيادة</p>
                <p className="text-xl font-bold">{details.totalClinicNeeds}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* متوسطات الإيرادات */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">متوسط الإيرادات لكل مريض</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={details.averageRevenuePerPatient} currency={currency} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">متوسط الإيرادات لكل موعد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={details.averageRevenuePerAppointment} currency={currency} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* معلومات الفلترة */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">معلومات التقرير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">الفترة المحددة: </span>
              <span className="font-medium">{TIME_PERIODS[selectedPeriod]}</span>
            </div>
            <div>
              <span className="text-muted-foreground">نطاق التواريخ: </span>
              <span className="font-medium">{filterInfo.dateRange}</span>
            </div>
            <div>
              <span className="text-muted-foreground">إجمالي السجلات: </span>
              <span className="font-medium">{filterInfo.totalRecords}</span>
            </div>
            <div>
              <span className="text-muted-foreground">السجلات المفلترة: </span>
              <span className="font-medium">{filterInfo.filteredRecords}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* المخططات والرسوم البيانية */}
      {renderCharts}
    </div>
  )

}

export default ComprehensiveProfitLossReportComponent
