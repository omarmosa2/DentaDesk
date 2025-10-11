import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useReportsStore } from '@/store/reportsStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useRealTimeReportsByType } from '@/hooks/useRealTimeReports'
import { getChartColors, getChartConfig, getChartColorsWithFallback, formatChartValue, formatGregorianMonthYear } from '@/lib/utils'
import { validateNumericData, validateDateData, transformToChartData, groupDataByPeriod, ensureAppointmentStatusData } from '@/lib/chartDataHelpers'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { useTheme } from '@/contexts/ThemeContext'
import { PdfService } from '@/services/pdfService'
import { ExportService } from '@/services/exportService'
import { notify } from '@/services/notificationService'
import TimeFilter from '@/components/ui/time-filter'
import useTimeFilteredStats from '@/hooks/useTimeFilteredStats'
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  BarChart3,
  PieChart
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

export default function AppointmentReports() {
  const { appointmentReports, isLoading, isExporting, generateReport, clearCache } = useReportsStore()
  const { appointments, loadAppointments } = useAppointmentStore()
  const { settings } = useSettingsStore()
  const { isDarkMode } = useTheme()

  // Time filtering for appointments
  const appointmentStats = useTimeFilteredStats({
    data: appointments,
    dateField: 'start_time',
    initialFilter: { preset: 'all', startDate: '', endDate: '' } // Show all data by default
  })

  // Use real-time reports hook for automatic updates
  useRealTimeReportsByType('appointments')

  useEffect(() => {
    generateReport('appointments')
    loadAppointments()
  }, [generateReport, loadAppointments])



  // Use data from reports service if available, otherwise fallback to store data
  // Always use filtered data for accurate statistics
  const getReportData = () => {
    // Use filtered data from appointmentStats for accurate calculations
    const dataToUse = appointmentStats.filteredData.length > 0 ? appointmentStats.filteredData : appointments

    // Always use filtered data from appointmentStore for accurate statistics
    // This ensures consistency between what's displayed and what's exported

    // Calculate from filtered data for accurate statistics
    const total = dataToUse.length
    const completed = dataToUse.filter(apt => apt.status === 'completed').length
    const cancelled = dataToUse.filter(apt => apt.status === 'cancelled').length
    const pending = dataToUse.filter(apt => apt.status === 'scheduled').length
    const noShow = dataToUse.filter(apt => apt.status === 'no_show').length

    const attendanceRate = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 1000) / 10 : 0



    return {
      total,
      completed,
      cancelled,
      pending,
      noShow,
      attendanceRate: attendanceRate.toFixed(1),
      cancellationRate: cancellationRate.toFixed(1),
      appointmentsByStatus: [],
      appointmentTrend: []
    }
  }

  const stats = getReportData()

  // Get professional chart colors
  const categoricalColors = getChartColors('categorical', isDarkMode)
  const primaryColors = getChartColors('primary', isDarkMode)
  const statusColors = getChartColorsWithFallback('status', isDarkMode, 8)
  const chartConfiguration = getChartConfig(isDarkMode)

  // Enhanced appointment status data with validation
  const statusData = (() => {
    try {
      const data = [
        { name: 'مكتمل', value: stats.completed, color: statusColors[0] }, // Green for completed
        { name: 'مجدول', value: stats.pending, color: statusColors[4] }, // Purple for scheduled
        { name: 'ملغي', value: stats.cancelled, color: statusColors[2] }, // Red for cancelled
        { name: 'لم يحضر', value: stats.noShow, color: statusColors[3] } // Gray for no show
      ].map(item => ({
        ...item,
        percentage: stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0
      }))

      return ensureAppointmentStatusData(data)
    } catch (error) {
      console.error('Appointment Reports: Error processing status data:', error)
      return []
    }
  })()

  // Enhanced monthly appointments data with comprehensive validation
  const monthlyChartData = (() => {
    try {
      // Use data from reports service if available
      if (appointmentReports?.appointmentTrend && appointmentReports.appointmentTrend.length > 0) {
        return appointmentReports.appointmentTrend.map(item => ({
          month: item.period,
          count: item.count,
          formattedCount: `${item.count} موعد`
        }))
      }

      // Fallback to calculating from store data
      if (!validateDateData(appointments, 'start_time')) {
        console.warn('Appointment Reports: Invalid date data detected')
      }

      const monthlyData = appointments.reduce((acc, apt) => {
        try {
          if (!apt || !apt.start_time) return acc

          const date = new Date(apt.start_time)
          // Enhanced date validation
          if (isNaN(date.getTime()) || date.getFullYear() < 1900 || date.getFullYear() > 2100) {
            console.warn('Invalid appointment start_time:', apt.start_time)
            return acc
          }

          // Use Gregorian calendar with Arabic month names
          const month = date.getMonth() // 0-11
          const year = date.getFullYear()
          const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                             'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
          const monthName = `${monthNames[month]} ${year}`

          acc[monthName] = (acc[monthName] || 0) + 1
          return acc
        } catch (error) {
          console.warn('Error processing appointment date:', apt.start_time, error)
          return acc
        }
      }, {} as Record<string, number>)

      const chartData = Object.entries(monthlyData)
        .map(([month, count]) => {
          // Extract just the month name for display
          const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                             'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
          const monthName = monthNames.find(m => month.includes(m)) || month.split(' ')[0]
          
          return {
            month: monthName, // Show only month name
            fullMonth: month, // Keep full month for sorting
            count,
            formattedCount: `${count} موعد`
          }
        })
        .sort((a, b) => {
          // Sort chronologically using full month data
          const monthOrder = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                             'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
          const aMonthIndex = monthOrder.findIndex(m => a.fullMonth.includes(m))
          const bMonthIndex = monthOrder.findIndex(m => b.fullMonth.includes(m))
          
          if (aMonthIndex !== bMonthIndex) {
            return aMonthIndex - bMonthIndex
          }
          
          // If same month, sort by year
          const aYear = parseInt(a.fullMonth.split(' ')[1]) || 0
          const bYear = parseInt(b.fullMonth.split(' ')[1]) || 0
          return aYear - bYear
        })
        .filter(item => item.count > 0) // Only include months with appointments

      // Validate the final data
      if (!validateNumericData(chartData)) {
        console.warn('Appointment Reports: Invalid monthly chart data')
        return []
      }

      return chartData
    } catch (error) {
      console.error('Appointment Reports: Error processing monthly data:', error)
      return []
    }
  })()

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">تقارير المواعيد</h2>
          <p className="text-muted-foreground mt-1">
            إحصائيات وتحليلات شاملة للمواعيد
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                // Clear cache to force fresh data
                clearCache()
                await generateReport('appointments')
                await loadAppointments()
                // Show success message
                const event = new CustomEvent('showToast', {
                  detail: {
                    title: 'تم التحديث بنجاح',
                    description: 'تم تحديث تقارير المواعيد',
                    type: 'success'
                  }
                })
                window.dispatchEvent(event)
              } catch (error) {
                console.error('Error refreshing appointment reports:', error)
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
              const dataToExport = appointmentStats.filteredData.length > 0 ? appointmentStats.filteredData : appointments

              if (dataToExport.length === 0) {
                notify.noDataToExport('لا توجد بيانات مواعيد للتصدير')
                return
              }

              try {
                // Add filter information to report
                const filterInfo = appointmentStats.timeFilter.startDate && appointmentStats.timeFilter.endDate
                  ? `من ${appointmentStats.timeFilter.startDate} إلى ${appointmentStats.timeFilter.endDate}`
                  : 'جميع البيانات'

                // Calculate treatment distribution from filtered data
                const treatmentCounts: { [key: string]: number } = {}
                dataToExport.forEach(apt => {
                  const treatmentName = apt.treatment_name || 'غير محدد'
                  treatmentCounts[treatmentName] = (treatmentCounts[treatmentName] || 0) + 1
                })

                const appointmentsByTreatment = Object.entries(treatmentCounts)
                  .map(([treatment, count]) => ({ treatment, count }))
                  .sort((a, b) => b.count - a.count)

                // Create appointment report data structure using filtered data
                const appointmentReportData = {
                  totalAppointments: stats.total,
                  completedAppointments: stats.completed,
                  cancelledAppointments: stats.cancelled,
                  scheduledAppointments: stats.pending,
                  noShowAppointments: stats.noShow,
                  attendanceRate: parseFloat(stats.attendanceRate),
                  cancellationRate: parseFloat(stats.cancellationRate),
                  appointmentsByStatus: statusData.map(item => ({
                    status: item.name,
                    count: item.value,
                    percentage: stats.total > 0 ? (item.value / stats.total) * 100 : 0
                  })),
                  appointmentsByTreatment: appointmentsByTreatment,
                  appointmentsByDay: [],
                  appointmentsByHour: [],
                  peakHours: [],
                  appointmentTrend: [],
                  appointmentsList: dataToExport, // Add filtered appointments list
                  filterInfo: filterInfo,
                  dataCount: dataToExport.length
                }

                // Use the enhanced CSV export function
                const csvContent = '\uFEFF' + ExportService.generateAppointmentCSV(appointmentReportData, {
                  format: 'csv',
                  includeCharts: false,
                  includeDetails: true,
                  language: 'ar'
                })

                // تحويل إلى Excel مباشرة
                await ExportService.convertCSVToExcel(csvContent, 'appointments', {
                  format: 'csv',
                  includeCharts: false,
                  includeDetails: true,
                  language: 'ar'
                })

                notify.exportSuccess(`تم تصدير تقرير المواعيد بنجاح! (${dataToExport.length} موعد)`)
              } catch (error) {
                console.error('Error exporting CSV:', error)
                notify.exportError('فشل في تصدير تقرير المواعيد')
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
                const dataToExport = appointmentStats.filteredData.length > 0 ? appointmentStats.filteredData : appointments

                if (dataToExport.length === 0) {
                  notify.noDataToExport('لا توجد بيانات مواعيد للتصدير')
                  return
                }

                // Create appointment report data structure using filtered data
                const reportData = {
                  totalAppointments: stats.total,
                  completedAppointments: stats.completed,
                  cancelledAppointments: stats.cancelled,
                  noShowAppointments: stats.noShow,
                  attendanceRate: parseFloat(stats.attendanceRate),
                  cancellationRate: parseFloat(stats.cancellationRate),
                  appointmentsByStatus: statusData.map(item => ({
                    status: item.name,
                    count: item.value,
                    percentage: stats.total > 0 ? (item.value / stats.total) * 100 : 0
                  })),
                  peakHours: [],
                  monthlyTrend: monthlyChartData,
                  // Add filter information
                  filterInfo: appointmentStats.timeFilter.startDate && appointmentStats.timeFilter.endDate
                    ? `البيانات من ${appointmentStats.timeFilter.startDate} إلى ${appointmentStats.timeFilter.endDate}`
                    : 'جميع البيانات',
                  dataCount: dataToExport.length
                }

                await PdfService.exportAppointmentReport(reportData, settings)
                notify.exportSuccess(`تم تصدير تقرير المواعيد كملف PDF بنجاح (${dataToExport.length} موعد)`)
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
        value={appointmentStats.timeFilter}
        onChange={appointmentStats.handleFilterChange}
        onClear={appointmentStats.resetFilter}
        title="فلترة زمنية - المواعيد"
        defaultOpen={false}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6" dir="rtl">
        <Card className={getCardStyles("purple")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">إجمالي المواعيد</CardTitle>
            <Calendar className={`h-4 w-4 ${getIconStyles("purple")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">{appointments.length}</div>
            <p className="text-xs text-muted-foreground text-right">
              إجمالي المواعيد المسجلة
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("blue")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">
              {appointmentStats.timeFilter.preset === 'all' || (!appointmentStats.timeFilter.startDate && !appointmentStats.timeFilter.endDate) ? 'المواعيد الحالية' : 'المواعيد المفلترة'}
            </CardTitle>
            <Users className={`h-4 w-4 ${getIconStyles("blue")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              {appointmentStats.timeFilter.preset === 'all' || (!appointmentStats.timeFilter.startDate && !appointmentStats.timeFilter.endDate)
                ? appointments.length
                : appointmentStats.filteredData.length}
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {appointmentStats.timeFilter.preset === 'all' || (!appointmentStats.timeFilter.startDate && !appointmentStats.timeFilter.endDate)
                ? 'جميع المواعيد'
                : 'المواعيد في الفترة المحددة'}
            </p>
            {appointmentStats.trend && (
              <div className={`text-xs flex items-center justify-end mt-1 ${
                appointmentStats.trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                <span className="ml-1">{Math.abs(appointmentStats.trend.changePercent)}%</span>
                {appointmentStats.trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={getCardStyles("emerald")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">المواعيد المكتملة</CardTitle>
            <CheckCircle className={`h-4 w-4 ${getIconStyles("emerald")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              {stats.completed}
            </div>
            <p className="text-xs text-muted-foreground text-right">
              معدل الحضور: {stats.attendanceRate}%
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("orange")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">المواعيد الملغية</CardTitle>
            <XCircle className={`h-4 w-4 ${getIconStyles("orange")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              {stats.cancelled}
            </div>
            <p className="text-xs text-muted-foreground text-right">
              معدل الإلغاء: {stats.cancellationRate}%
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("cyan")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">المواعيد المجدولة</CardTitle>
            <Clock className={`h-4 w-4 ${getIconStyles("cyan")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              {stats.pending}
            </div>
            <p className="text-xs text-muted-foreground text-right">
              في انتظار التنفيذ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
        {/* Enhanced Status Distribution Chart */}
        <Card dir="rtl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <PieChart className="w-5 h-5" />
              <span>توزيع حالات المواعيد</span>
            </CardTitle>
            <CardDescription>
              توزيع المواعيد حسب الحالة ({stats.total} موعد إجمالي)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                <div className="text-center">
                  <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد بيانات مواعيد متاحة</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={chartConfiguration.responsive.desktop.height}>
                <RechartsPieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <Pie
                    data={statusData}
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
                    {statusData.map((entry, index) => (
                      <Cell key={`appointment-status-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      `${value} موعد`,
                      'العدد'
                    ]}
                    labelFormatter={(label) => `الحالة: ${label}`}
                    contentStyle={chartConfiguration.tooltip}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            )}

            {/* Status Legend */}
            {statusData.length > 0 && (
              <div className="mt-6 flex flex-col items-center space-y-3">
                <div className="text-sm font-medium text-foreground mb-2">
                  تفاصيل التوزيع
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                  {statusData.map((status, index) => (
                    <div key={`status-legend-${index}`} className="flex items-center justify-center space-x-2 space-x-reverse bg-muted/30 rounded-lg p-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: status.color }}
                      />
                      <div className="text-center">
                        <div className="font-medium text-foreground">
                          {status.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {status.value} موعد ({status.percentage}%)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Monthly Appointments Chart */}
        <Card dir="rtl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <BarChart3 className="w-5 h-5" />
              <span>المواعيد الشهرية</span>
            </CardTitle>
            <CardDescription>
              عدد المواعيد حسب الشهر ({monthlyChartData.length} شهر)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyChartData.length === 0 ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد بيانات مواعيد شهرية متاحة</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={chartConfiguration.responsive.desktop.height}>
                <BarChart
                  data={monthlyChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  barCategoryGap={chartConfiguration.bar.barCategoryGap}
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
                    height={100}
                    dy={15}
                  />
                  <YAxis
                    tick={{ fontSize: 14, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                    axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    domain={[0, 'dataMax + 1']}
                    tickFormatter={(value) => `${value} موعد`}
                  />
                  <Tooltip
                    formatter={(value, name) => [`${value} موعد`, 'العدد']}
                    labelFormatter={(label) => `الشهر: ${label}`}
                    contentStyle={chartConfiguration.tooltip}
                  />
                  <Bar
                    dataKey="count"
                    fill={primaryColors[1]}
                    radius={[4, 4, 0, 0]}
                    minPointSize={5}
                    maxBarSize={100}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Monthly Summary */}
            {monthlyChartData.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-xs text-muted-foreground">أعلى شهر</div>
                  <div className="font-semibold">
                    {Math.max(...monthlyChartData.map(d => d.count))} موعد
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-xs text-muted-foreground">متوسط شهري</div>
                  <div className="font-semibold">
                    {Math.round(monthlyChartData.reduce((sum, d) => sum + d.count, 0) / monthlyChartData.length)} موعد
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-xs text-muted-foreground">أقل شهر</div>
                  <div className="font-semibold">
                    {Math.min(...monthlyChartData.map(d => d.count))} موعد
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
