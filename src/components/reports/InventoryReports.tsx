import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useReportsStore } from '@/store/reportsStore'
import { useRealTimeReportsByType } from '@/hooks/useRealTimeReports'
import { formatCurrency, formatDate, getChartColors, getChartConfig, getChartColorsWithFallback, formatChartValue } from '@/lib/utils'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { useSettingsStore } from '@/store/settingsStore'
import { useTheme } from '@/contexts/ThemeContext'
import CurrencyDisplay from '@/components/ui/currency-display'
import { PdfService } from '@/services/pdfService'
import { notify } from '@/services/notificationService'
import TimeFilter, { TimeFilterOptions } from '@/components/ui/time-filter'
import useTimeFilteredStats from '@/hooks/useTimeFilteredStats'
import { useInventoryStore } from '@/store/inventoryStore'
import {
  Package,
  AlertTriangle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  Search,
  Eye,
  RefreshCw,
  BarChart3,
  PieChart
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts'

interface StatCardProps {
  title: string
  value: number | string | React.ReactNode
  icon: React.ComponentType<any>
  color: string
  trend?: { value: number; isPositive: boolean }
  description?: string
}

function InventoryReportsComponent() {
  const { currency, settings } = useSettingsStore()
  const { inventoryReports, isLoading, isExporting, generateReport, exportReport, clearCache } = useReportsStore()
  const { isDarkMode } = useTheme()
  const { items, loadItems } = useInventoryStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [alertFilter, setAlertFilter] = useState('all')

  // Time filtering for inventory
  const inventoryStats = useTimeFilteredStats({
    data: items,
    dateField: 'created_at',
    initialFilter: { preset: 'all', startDate: '', endDate: '' } // Show all data by default
  })

  // Use real-time reports hook for automatic updates
  useRealTimeReportsByType('inventory')

  useEffect(() => {
    generateReport('inventory')
    loadItems()
  }, [generateReport, loadItems])

  // Get professional chart colors
  const categoricalColors = getChartColors('categorical', isDarkMode)
  const primaryColors = getChartColors('primary', isDarkMode)
  const chartConfiguration = getChartConfig(isDarkMode)



  const StatCard = ({ title, value, icon: Icon, color, trend, description }: StatCardProps) => (
    <Card className={getCardStyles(color)} dir="rtl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground text-right">{title}</p>
            <div className="flex items-center space-x-2 space-x-reverse justify-end">
              <p className="text-2xl font-bold text-foreground">{value}</p>
              {trend && (
                <div className={`flex items-center text-sm ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span className="ml-1">{Math.abs(trend.value)}%</span>
                  {trend.isPositive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                </div>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-full ${getIconStyles(color)}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )

  // Filter stock alerts based on search and filters
  const filteredStockAlerts = inventoryReports?.stockAlerts?.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter

    const matchesAlert = alertFilter === 'all' || (() => {
      const today = new Date()
      const isExpired = item.expiry_date && new Date(item.expiry_date) < today
      const isExpiringSoon = item.expiry_date && (() => {
        const expiryDate = new Date(item.expiry_date)
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0
      })()
      const isLowStock = item.quantity <= item.minimum_stock && item.quantity > 0
      const isOutOfStock = item.quantity === 0

      switch (alertFilter) {
        case 'low_stock': return isLowStock
        case 'out_of_stock': return isOutOfStock
        case 'expired': return isExpired
        case 'expiring_soon': return isExpiringSoon
        default: return true
      }
    })()

    return matchesSearch && matchesCategory && matchesAlert
  }) || []

  // Filter expiry alerts
  const filteredExpiryAlerts = inventoryReports?.expiryAlerts?.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  }) || []

  // Get unique categories for filter
  const categories = Array.from(new Set([
    ...(inventoryReports?.stockAlerts?.map(item => item.category).filter(Boolean) || []),
    ...(inventoryReports?.expiryAlerts?.map(item => item.category).filter(Boolean) || [])
  ]))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse text-sky-600 mx-auto mb-4" />
          <p className="text-muted-foreground">جاري تحميل تقارير المخزون...</p>
        </div>
      </div>
    )
  }

  if (!inventoryReports) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">لا توجد بيانات</h3>
        <p className="text-muted-foreground">لم يتم العثور على بيانات المخزون</p>
        <Button
          onClick={() => generateReport('inventory')}
          className="mt-4"
          variant="outline"
        >
          <RefreshCw className="w-4 h-4 ml-2" />
          إعادة تحميل
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">تقارير المخزون</h2>
          <p className="text-muted-foreground mt-1">
            إحصائيات وتحليلات شاملة للمخزون والتنبيهات
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await generateReport('inventory')
                // Show success message
                const event = new CustomEvent('showToast', {
                  detail: {
                    title: 'تم التحديث بنجاح',
                    description: 'تم تحديث تقارير المخزون',
                    type: 'success'
                  }
                })
                window.dispatchEvent(event)
              } catch (error) {
                const event = new CustomEvent('showToast', {
                  detail: {
                    title: 'خطأ في التحديث',
                    description: 'فشل في تحديث التقارير',
                    type: 'error'
                  }
                })
                window.dispatchEvent(event)
              }
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              // Use filtered data for export
              const dataToExport = inventoryStats.filteredData

              if (dataToExport.length === 0) {
                notify.noDataToExport('لا توجد بيانات مخزون للتصدير')
                return
              }

              try {
                // Calculate statistics from filtered data
                const totalValue = dataToExport.reduce((sum, item) => sum + ((item.unit_price || item.cost_per_unit || 0) * item.quantity), 0)
                const lowStockItems = dataToExport.filter(item => item.quantity <= item.minimum_stock && item.quantity > 0).length
                const expiredItems = dataToExport.filter(item => {
                  if (!item.expiry_date) return false
                  return new Date(item.expiry_date) < new Date()
                }).length
                const outOfStockItems = dataToExport.filter(item => item.quantity === 0).length

                // Add filter information to report
                const filterInfo = inventoryStats.timeFilter.startDate && inventoryStats.timeFilter.endDate
                  ? `من ${inventoryStats.timeFilter.startDate} إلى ${inventoryStats.timeFilter.endDate}`
                  : 'جميع البيانات'

                const reportData = {
                  'نطاق البيانات': filterInfo,
                  'إجمالي العناصر': dataToExport.length,
                  'القيمة الإجمالية': totalValue,
                  'عناصر منخفضة المخزون': lowStockItems,
                  'عناصر منتهية الصلاحية': expiredItems,
                  'عناصر نفدت من المخزون': outOfStockItems,
                  'تاريخ التقرير': formatDate(new Date())
                }

                // Create CSV with BOM for Arabic support
                const csvContent = '\uFEFF' + [
                  'المؤشر,القيمة',
                  ...Object.entries(reportData).map(([key, value]) =>
                    `"${key}","${value}"`
                  )
                ].join('\n')

                // تحويل إلى Excel مباشرة
                await ExportService.convertCSVToExcel(csvContent, 'inventory', {
                  format: 'csv',
                  includeCharts: false,
                  includeDetails: true,
                  language: 'ar'
                })

                notify.exportSuccess(`تم تصدير تقرير المخزون بنجاح! (${dataToExport.length} عنصر)`)
              } catch (error) {
                console.error('Error exporting CSV:', error)
                notify.exportError('فشل في تصدير تقرير المخزون')
              }
            }}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير اكسل
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={async () => {
              try {
                // Use filtered data for export
                const dataToExport = inventoryStats.filteredData

                if (dataToExport.length === 0) {
                  notify.noDataToExport('لا توجد بيانات مخزون للتصدير')
                  return
                }

                // Create inventory report data structure using filtered data
                const pdfReportData = {
                  ...inventoryReports,
                  totalItems: dataToExport.length,
                  totalValue: dataToExport.reduce((sum, item) => sum + ((item.unit_price || item.cost_per_unit || 0) * item.quantity), 0),
                  lowStockItems: dataToExport.filter(item => item.quantity <= item.minimum_stock && item.quantity > 0).length,
                  expiredItems: dataToExport.filter(item => {
                    if (!item.expiry_date) return false
                    return new Date(item.expiry_date) < new Date()
                  }).length,
                  outOfStockItems: dataToExport.filter(item => item.quantity === 0).length,
                  // Add the actual inventory items for display in PDF
                  inventoryItems: dataToExport,
                  // Add filter information
                  filterInfo: inventoryStats.timeFilter.startDate && inventoryStats.timeFilter.endDate
                    ? `البيانات من ${inventoryStats.timeFilter.startDate} إلى ${inventoryStats.timeFilter.endDate}`
                    : 'جميع البيانات',
                  dataCount: dataToExport.length
                }

                await PdfService.exportInventoryReport(pdfReportData, settings)
                notify.exportSuccess(`تم تصدير تقرير المخزون كملف PDF بنجاح (${dataToExport.length} عنصر)`)
              } catch (error) {
                console.error('Error exporting PDF:', error)
                notify.exportError('فشل في تصدير التقرير كملف PDF')
              }
            }}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير PDF
          </Button>
        </div>
      </div>

      {/* Time Filter Section */}
      <TimeFilter
        value={inventoryStats.timeFilter}
        onChange={inventoryStats.handleFilterChange}
        onClear={inventoryStats.resetFilter}
        title="فلترة زمنية - المخزون"
        defaultOpen={false}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" dir="rtl">
        <StatCard
          title="إجمالي العناصر"
          value={inventoryStats.filteredData.length}
          icon={Package}
          color="blue"
          description="العدد الكلي لعناصر المخزون في الفترة المحددة"
          trend={inventoryStats.trend}
        />
        <StatCard
          title="القيمة الإجمالية"
          value={<CurrencyDisplay
            amount={inventoryStats.filteredData.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)}
            currency={currency}
          />}
          icon={TrendingUp}
          color="green"
          description="القيمة الإجمالية للمخزون في الفترة المحددة"
        />
        <StatCard
          title="مخزون منخفض"
          value={inventoryStats.filteredData.filter(item => item.quantity <= item.minimum_stock && item.quantity > 0).length}
          icon={AlertTriangle}
          color="yellow"
          description="عناصر تحتاج إعادة تموين"
        />
        <StatCard
          title="منتهية الصلاحية"
          value={inventoryStats.filteredData.filter(item => {
            if (!item.expiry_date) return false
            return new Date(item.expiry_date) < new Date()
          }).length}
          icon={Calendar}
          color="red"
          description="عناصر منتهية الصلاحية"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
        {/* Items by Category Chart */}
        <Card dir="rtl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <PieChart className="w-5 h-5" />
              <span>التوزيع حسب الفئة</span>
            </CardTitle>
            <CardDescription>توزيع عناصر المخزون حسب الفئات</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={chartConfiguration.responsive.desktop.height}>
              <RechartsPieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <Pie
                  data={inventoryReports.itemsByCategory.filter(item => item.count > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, count, percent }) =>
                    count > 0 ? `${category}: ${count} (${(percent * 100).toFixed(0)}%)` : ''
                  }
                  outerRadius={120}
                  innerRadius={50}
                  fill="#8884d8"
                  dataKey="count"
                  stroke={isDarkMode ? '#1f2937' : '#ffffff'}
                  strokeWidth={2}
                  paddingAngle={2}
                  isAnimationActive={false}
                  animationDuration={0}
                >
                  {inventoryReports.itemsByCategory.filter(item => item.count > 0).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={categoricalColors[index % categoricalColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, 'عدد العناصر']}
                  labelFormatter={(label) => `الفئة: ${label}`}
                  contentStyle={chartConfiguration.tooltip}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Items by Supplier Chart */}
        <Card dir="rtl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <BarChart3 className="w-5 h-5" />
              <span>التوزيع حسب المورد</span>
            </CardTitle>
            <CardDescription>توزيع عناصر المخزون حسب الموردين</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={chartConfiguration.responsive.desktop.height}>
              <BarChart
                data={inventoryReports.itemsBySupplier.filter(item => item.count > 0).slice(0, 8)}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                barCategoryGap="20%"
              >
                <CartesianGrid
                  strokeDasharray={chartConfiguration.grid.strokeDasharray}
                  stroke={chartConfiguration.grid.stroke}
                  strokeOpacity={chartConfiguration.grid.strokeOpacity}
                />
                <XAxis
                  dataKey="supplier"
                  tick={{ fontSize: 14, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                  axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                  tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 14, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                  axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                  tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                  domain={[0, 'dataMax + 1']}
                />
                <Tooltip
                  formatter={(value, name) => [value, 'عدد العناصر']}
                  labelFormatter={(label) => `المورد: ${label}`}
                  contentStyle={chartConfiguration.tooltip}
                />
                <Bar
                  dataKey="count"
                  fill={primaryColors[1]}
                  radius={[4, 4, 0, 0]}
                  minPointSize={5}
                  maxBarSize={100}
                  isAnimationActive={false}
                  animationDuration={0}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Usage Trend Chart */}
      <Card dir="rtl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <TrendingUp className="w-5 h-5" />
            <span>اتجاه الاستخدام</span>
          </CardTitle>
          <CardDescription>معدل استخدام المخزون شهرياً</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={chartConfiguration.responsive.desktop.height}>
            <AreaChart data={inventoryReports.usageTrend} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid
                strokeDasharray={chartConfiguration.grid.strokeDasharray}
                stroke={chartConfiguration.grid.stroke}
                strokeOpacity={chartConfiguration.grid.strokeOpacity}
              />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
              />
              <Tooltip
                formatter={(value, name) => [value, 'معدل الاستخدام']}
                labelFormatter={(label) => `الفترة: ${label}`}
                contentStyle={chartConfiguration.tooltip}
              />
              <Area
                type="monotone"
                dataKey="usage"
                stroke={primaryColors[3]}
                fill={primaryColors[3]}
                fillOpacity={0.3}
                strokeWidth={3}
                isAnimationActive={false}
                animationDuration={0}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stock Alerts Section */}
      <Card dir="rtl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <AlertTriangle className="w-5 h-5" />
            <span>تنبيهات المخزون</span>
          </CardTitle>
          <CardDescription>العناصر التي تحتاج انتباهك</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">البحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="البحث بالاسم أو الفئة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="category-filter">الفئة</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="alert-filter">نوع التنبيه</Label>
              <Select value={alertFilter} onValueChange={setAlertFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع التنبيهات</SelectItem>
                  <SelectItem value="low_stock">مخزون منخفض</SelectItem>
                  <SelectItem value="out_of_stock">نفد المخزون</SelectItem>
                  <SelectItem value="expired">منتهي الصلاحية</SelectItem>
                  <SelectItem value="expiring_soon">ينتهي قريباً</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stock Alerts Table - RTL Layout with Centered Headers */}
          <div className="border rounded-lg overflow-hidden" dir="rtl">
            <div className="overflow-x-auto">
              <table className="w-full table-center-all">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-center p-3 font-medium">#</th>
                    <th className="text-center p-3 font-medium">اسم العنصر</th>
                    <th className="text-center p-3 font-medium">الفئة</th>
                    <th className="text-center p-3 font-medium">الكمية الحالية</th>
                    <th className="text-center p-3 font-medium">الحد الأدنى</th>
                    <th className="text-center p-3 font-medium">تاريخ الانتهاء</th>
                    <th className="text-center p-3 font-medium">نوع التنبيه</th>
                    <th className="text-center p-3 font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStockAlerts.map((item, index) => {
                    const today = new Date()
                    const isExpired = item.expiry_date && new Date(item.expiry_date) < today
                    const isExpiringSoon = item.expiry_date && (() => {
                      const expiryDate = new Date(item.expiry_date)
                      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                      return daysUntilExpiry <= 30 && daysUntilExpiry > 0
                    })()
                    const isLowStock = item.quantity <= item.minimum_stock && item.quantity > 0
                    const isOutOfStock = item.quantity === 0

                    let alertType = ''
                    let alertColor = ''

                    if (isOutOfStock) {
                      alertType = 'نفد المخزون'
                      alertColor = 'destructive'
                    } else if (isExpired) {
                      alertType = 'منتهي الصلاحية'
                      alertColor = 'destructive'
                    } else if (isLowStock) {
                      alertType = 'مخزون منخفض'
                      alertColor = 'warning'
                    } else if (isExpiringSoon) {
                      alertType = 'ينتهي قريباً'
                      alertColor = 'warning'
                    }

                    return (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                        <td className="p-3 font-medium text-center">{index + 1}</td>
                        <td className="p-3 font-medium text-center table-cell-wrap-truncate-md">{item.name}</td>
                        <td className="p-3 text-muted-foreground text-center table-cell-wrap-truncate-sm">{item.category || '-'}</td>
                        <td className="p-3 text-muted-foreground text-center">
                          {item.quantity} {item.unit || 'قطعة'}
                        </td>
                        <td className="p-3 text-muted-foreground text-center">
                          {item.minimum_stock} {item.unit || 'قطعة'}
                        </td>
                        <td className="p-3 text-muted-foreground text-center">
                          {item.expiry_date ? formatDate(item.expiry_date) : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant={alertColor as any}>{alertType}</Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {filteredStockAlerts.length === 0 && (
              <div className="text-center py-8">
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  {inventoryReports?.stockAlerts?.length === 0
                    ? "لا توجد تنبيهات للمخزون - جميع العناصر في حالة جيدة"
                    : "لا توجد تنبيهات مطابقة للبحث"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  إجمالي التنبيهات: {inventoryReports?.stockAlerts?.length || 0}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default InventoryReportsComponent