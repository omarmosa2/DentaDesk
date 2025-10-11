import React, { useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useReportsStore } from '@/store/reportsStore'
import { useClinicNeedsStore } from '@/store/clinicNeedsStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useRealTimeReportsByType } from '@/hooks/useRealTimeReports'
import useTimeFilteredStats from '@/hooks/useTimeFilteredStats'
import { formatCurrency, formatDate } from '@/lib/utils'
import { validateNumericData, validateDateData, transformToChartData, groupDataByPeriod } from '@/lib/chartDataHelpers'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { useTheme } from '@/contexts/ThemeContext'
import { PdfService } from '@/services/pdfService'
import { ExportService } from '@/services/exportService'
import { notificationService } from '@/services/notificationService'
import TimeFilter, { TimeFilterOptions } from '@/components/ui/time-filter'
import CurrencyDisplay from '@/components/ui/currency-display'
import {
  ClipboardList,
  Package,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Users,
  Calendar
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'

const COLORS = {
  pending: '#f59e0b',
  ordered: '#3b82f6',
  received: '#10b981',
  cancelled: '#ef4444',
  urgent: '#dc2626',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#10b981'
}

const STATUS_LABELS = {
  pending: 'آجل',
  ordered: 'مطلوب',
  received: 'مستلم',
  cancelled: 'ملغي'
}

const PRIORITY_LABELS = {
  urgent: 'عاجل',
  high: 'عالي',
  medium: 'متوسط',
  low: 'منخفض'
}

export default function ClinicNeedsReports() {
  const { clinicNeedsReports, isLoading, isExporting, generateReport, clearCache } = useReportsStore()
  const { needs, loadNeeds } = useClinicNeedsStore()
  const { currency, settings } = useSettingsStore()
  const { isDarkMode } = useTheme()

  // Time filtering for clinic needs
  const needsStats = useTimeFilteredStats({
    data: needs,
    dateField: 'created_at',
    initialFilter: { preset: 'all', startDate: '', endDate: '' } // Show all data by default
  })

  // Use real-time reports hook for automatic updates
  useRealTimeReportsByType('clinicNeeds')

  useEffect(() => {
    generateReport('clinicNeeds')
    loadNeeds()
  }, [generateReport, loadNeeds])

  // Calculate filtered statistics
  const filteredNeedsStats = useMemo(() => {
    const filteredData = needsStats.filteredData

    if (!filteredData || filteredData.length === 0) {
      return {
        totalNeeds: 0,
        totalValue: 0,
        pendingCount: 0,
        orderedCount: 0,
        receivedCount: 0,
        cancelledCount: 0,
        urgentCount: 0,
        completionRate: 0,
        urgencyRate: 0,
        averageNeedValue: 0,
        needsByStatus: [],
        needsByPriority: [],
        needsByCategory: [],
        topExpensiveNeeds: []
      }
    }

    const totalNeeds = filteredData.length
    const totalValue = filteredData.reduce((sum, need) => sum + (need.price * need.quantity), 0)
    const averageNeedValue = totalNeeds > 0 ? totalValue / totalNeeds : 0

    const pendingCount = filteredData.filter(need => need.status === 'pending').length
    const orderedCount = filteredData.filter(need => need.status === 'ordered').length
    const receivedCount = filteredData.filter(need => need.status === 'received').length
    const cancelledCount = filteredData.filter(need => need.status === 'cancelled').length
    const urgentCount = filteredData.filter(need => need.priority === 'urgent').length

    const completionRate = totalNeeds > 0 ? (receivedCount / totalNeeds) * 100 : 0
    const urgencyRate = totalNeeds > 0 ? (urgentCount / totalNeeds) * 100 : 0

    // Status distribution
    const needsByStatus = [
      { name: STATUS_LABELS.pending, value: pendingCount, color: COLORS.pending },
      { name: STATUS_LABELS.ordered, value: orderedCount, color: COLORS.ordered },
      { name: STATUS_LABELS.received, value: receivedCount, color: COLORS.received },
      { name: STATUS_LABELS.cancelled, value: cancelledCount, color: COLORS.cancelled }
    ].filter(item => item.value > 0)

    // Priority distribution
    const priorityCounts = {
      urgent: filteredData.filter(need => need.priority === 'urgent').length,
      high: filteredData.filter(need => need.priority === 'high').length,
      medium: filteredData.filter(need => need.priority === 'medium').length,
      low: filteredData.filter(need => need.priority === 'low').length
    }

    const needsByPriority = [
      { name: PRIORITY_LABELS.urgent, value: priorityCounts.urgent, color: COLORS.urgent },
      { name: PRIORITY_LABELS.high, value: priorityCounts.high, color: COLORS.high },
      { name: PRIORITY_LABELS.medium, value: priorityCounts.medium, color: COLORS.medium },
      { name: PRIORITY_LABELS.low, value: priorityCounts.low, color: COLORS.low }
    ].filter(item => item.value > 0)

    // Category distribution
    const categoryMap = new Map()
    filteredData.forEach(need => {
      const category = need.category || 'غير محدد'
      const existing = categoryMap.get(category) || { count: 0, value: 0 }
      categoryMap.set(category, {
        count: existing.count + 1,
        value: existing.value + (need.price * need.quantity)
      })
    })

    const needsByCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      value: data.value
    })).sort((a, b) => b.value - a.value)

    // Top expensive needs
    const topExpensiveNeeds = filteredData
      .map(need => ({
        need_name: need.need_name,
        value: need.price * need.quantity,
        quantity: need.quantity,
        price: need.price
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    return {
      totalNeeds,
      totalValue,
      pendingCount,
      orderedCount,
      receivedCount,
      cancelledCount,
      urgentCount,
      completionRate,
      urgencyRate,
      averageNeedValue,
      needsByStatus,
      needsByPriority,
      needsByCategory,
      topExpensiveNeeds
    }
  }, [needsStats.filteredData])

  const handleExportPDF = async () => {
    try {
      if (!needsStats.filteredData || needsStats.filteredData.length === 0) {
        notificationService.error('لا توجد بيانات للتصدير')
        return
      }

      // Create comprehensive report data using filtered data and calculated stats
      const reportData = {
        ...stats,
        needsList: needsStats.filteredData,
        filterInfo: needsStats.filter.preset !== 'all'
          ? `الفترة: ${needsStats.filter.preset} (${needsStats.filter.startDate || ''} - ${needsStats.filter.endDate || ''})`
          : 'جميع البيانات',
        dataCount: needsStats.filteredData.length
      }

      await PdfService.exportClinicNeedsReport(reportData, {
        title: 'تقرير احتياجات العيادة',
        currency,
        isDarkMode
      })
      notificationService.success('تم تصدير التقرير بنجاح')
    } catch (error) {
      console.error('Error exporting PDF:', error)
      notificationService.error('فشل في تصدير التقرير')
    }
  }

  const handleExportCSV = async () => {
    try {
      // Use filtered data from the time filter instead of static report data
      const dataToExport = needsStats.filteredData

      if (!dataToExport || dataToExport.length === 0) {
        notificationService.error('لا توجد بيانات للتصدير')
        return
      }

      // Generate filename with filter info
      const filterInfo = needsStats.filter.preset !== 'all'
        ? `_${needsStats.filter.preset}_${needsStats.filter.startDate || ''}_${needsStats.filter.endDate || ''}`
        : ''

      const filename = `clinic-needs-report${filterInfo}`

      await ExportService.exportClinicNeedsToCSV(dataToExport, filename)
      notificationService.success(`تم تصدير ${dataToExport.length} احتياج بنجاح`)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      notificationService.error('فشل في تصدير البيانات')
    }
  }

  const handleRefresh = async () => {
    clearCache()
    await generateReport('clinicNeeds')
    await loadNeeds()
    notificationService.success('تم تحديث التقرير')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل تقرير احتياجات العيادة...</p>
        </div>
      </div>
    )
  }

  const stats = filteredNeedsStats

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            تقرير احتياجات العيادة
          </h2>
          <p className="text-muted-foreground mt-1">
            تحليل شامل لاحتياجات ومتطلبات العيادة
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 space-x-reverse"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center space-x-2 space-x-reverse"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center space-x-2 space-x-reverse"
          >
            <Download className="w-4 h-4" />
            <span>PDF</span>
          </Button>
        </div>
      </div>

      {/* Time Filter */}
      <TimeFilter
        value={needsStats.filter}
        onChange={needsStats.setFilter}
        className="w-full"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" dir="rtl">
        <Card className={getCardStyles("blue")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">إجمالي الاحتياجات</CardTitle>
            <ClipboardList className={`h-4 w-4 ${getIconStyles("blue")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">{stats.totalNeeds}</div>
            <p className="text-xs text-muted-foreground text-right">
              احتياج مسجل في النظام
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("green")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">القيمة الإجمالية</CardTitle>
            <DollarSign className={`h-4 w-4 ${getIconStyles("green")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              <CurrencyDisplay amount={stats.totalValue} currency={currency} />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              قيمة جميع الاحتياجات
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("orange")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">الاحتياجات الآجلة</CardTitle>
            <Clock className={`h-4 w-4 ${getIconStyles("orange")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground text-right">
              في انتظار الطلب
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("red")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">الاحتياجات العاجلة</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${getIconStyles("red")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">{stats.urgentCount}</div>
            <p className="text-xs text-muted-foreground text-right">
              تحتاج اهتمام فوري
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
        {/* Status Distribution Chart */}
        <Card dir="rtl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <PieChart className="w-5 h-5" />
              <span>توزيع الاحتياجات حسب الحالة</span>
            </CardTitle>
            <CardDescription>
              توزيع الاحتياجات حسب حالة الطلب ({stats.totalNeeds} احتياج إجمالي)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.needsByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                <div className="text-center">
                  <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد بيانات احتياجات متاحة</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={stats.needsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.needsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Priority Distribution Chart */}
        <Card dir="rtl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <BarChart3 className="w-5 h-5" />
              <span>توزيع الاحتياجات حسب الأولوية</span>
            </CardTitle>
            <CardDescription>
              توزيع الاحتياجات حسب مستوى الأولوية
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.needsByPriority.length === 0 ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد بيانات أولوية متاحة</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.needsByPriority}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {stats.needsByPriority.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <Tabs defaultValue="categories" className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories">الفئات</TabsTrigger>
          <TabsTrigger value="expensive">الأغلى سعراً</TabsTrigger>
          <TabsTrigger value="pending">الآجلة</TabsTrigger>
          <TabsTrigger value="urgent">العاجلة</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                الاحتياجات حسب الفئة ({stats.needsByCategory.length} فئة)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الفئة</TableHead>
                      <TableHead className="text-right">العدد</TableHead>
                      <TableHead className="text-right">القيمة الإجمالية</TableHead>
                      <TableHead className="text-right">متوسط القيمة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.needsByCategory.map((category, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-right">{category.category}</TableCell>
                        <TableCell className="text-right">{category.count}</TableCell>
                        <TableCell className="text-right">
                          <CurrencyDisplay amount={category.value} currency={currency} />
                        </TableCell>
                        <TableCell className="text-right">
                          <CurrencyDisplay amount={category.value / category.count} currency={currency} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expensive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                الاحتياجات الأغلى سعراً (أعلى 10)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">اسم الاحتياج</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">سعر الوحدة</TableHead>
                      <TableHead className="text-right">القيمة الإجمالية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.topExpensiveNeeds.map((need, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-right">{need.need_name}</TableCell>
                        <TableCell className="text-right">{need.quantity}</TableCell>
                        <TableCell className="text-right">
                          <CurrencyDisplay amount={need.price} currency={currency} />
                        </TableCell>
                        <TableCell className="text-right">
                          <CurrencyDisplay amount={need.value} currency={currency} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                الاحتياجات الآجلة ({stats.pendingCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">اسم الاحتياج</TableHead>
                      <TableHead className="text-right">الفئة</TableHead>
                      <TableHead className="text-right">الأولوية</TableHead>
                      <TableHead className="text-right">القيمة</TableHead>
                      <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {needsStats.filteredData
                      .filter(need => need.status === 'pending')
                      .slice(0, 10)
                      .map((need) => (
                        <TableRow key={need.id}>
                          <TableCell className="font-medium text-right">{need.need_name}</TableCell>
                          <TableCell className="text-right">{need.category || 'غير محدد'}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={need.priority === 'urgent' ? 'destructive' : 'secondary'}>
                              {PRIORITY_LABELS[need.priority]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <CurrencyDisplay amount={need.price * need.quantity} currency={currency} />
                          </TableCell>
                          <TableCell className="text-right">{formatDate(need.created_at)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="urgent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                الاحتياجات العاجلة ({stats.urgentCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">اسم الاحتياج</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الفئة</TableHead>
                      <TableHead className="text-right">القيمة</TableHead>
                      <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {needsStats.filteredData
                      .filter(need => need.priority === 'urgent')
                      .slice(0, 10)
                      .map((need) => (
                        <TableRow key={need.id}>
                          <TableCell className="font-medium text-right">{need.need_name}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={need.status === 'received' ? 'default' : 'secondary'}>
                              {STATUS_LABELS[need.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{need.category || 'غير محدد'}</TableCell>
                          <TableCell className="text-right">
                            <CurrencyDisplay amount={need.price * need.quantity} currency={currency} />
                          </TableCell>
                          <TableCell className="text-right">{formatDate(need.created_at)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
