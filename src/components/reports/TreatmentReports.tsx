import React, { useEffect, useState, useMemo, useCallback, memo } from 'react'
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { useReportsStore } from '@/store/reportsStore'
import { useDentalTreatmentStore } from '@/store/dentalTreatmentStore'
import { usePatientStore } from '@/store/patientStore'
import { safeString, safeNumber } from '@/utils/safeStringUtils'
import { useSettingsStore } from '@/store/settingsStore'
import { useTheme } from '@/contexts/ThemeContext'
import { useRealTimeReportsByType } from '@/hooks/useRealTimeReports'
import useTimeFilteredStats from '@/hooks/useTimeFilteredStats'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import CurrencyDisplay from '@/components/ui/currency-display'
import RealTimeIndicator from '@/components/ui/real-time-indicator'
import TimeFilter from '@/components/ui/time-filter'
import { PdfService } from '@/services/pdfService'
import { ExportService } from '@/services/exportService'
import { notify } from '@/services/notificationService'
import { useTreatmentNames } from '@/hooks/useTreatmentNames'
import { getTreatmentNameInArabic, getCategoryNameInArabic, getStatusLabelInArabic } from '@/utils/arabicTranslations'
import {
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  Users,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  RefreshCw,
  Stethoscope
} from 'lucide-react'

// Color palette for charts
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']

interface StatCardProps {
  title: string
  value: React.ReactNode
  icon: React.ComponentType<any>
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  description?: string
  trend?: { value: number; isPositive: boolean }
}

function StatCard({ title, value, icon: Icon, color, description, trend }: StatCardProps) {
  return (
    <Card className={getCardStyles(color)} dir="rtl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground text-right">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${getIconStyles(color)}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground text-right mb-1">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground text-right">{description}</p>
        )}
        {trend && (
          <div className={`text-xs flex items-center justify-end mt-1 ${
            trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            <TrendingUp className={`h-3 w-3 ml-1 ${trend.isPositive ? '' : 'rotate-180'}`} />
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TreatmentReportsComponent() {
  const { treatmentReports, isLoading, isExporting, generateReport, clearCache } = useReportsStore()
  const { toothTreatments, loadToothTreatments } = useDentalTreatmentStore()
  const { patients, loadPatients } = usePatientStore()
  const { currency, settings } = useSettingsStore()
  const { isDarkMode } = useTheme()

  // Helper function to safely convert values to numbers
  const safeNumber = (value: any): number => {
    if (typeof value === 'number') {
      return isNaN(value) || !isFinite(value) ? 0 : value
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value)
      return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed
    }
    if (typeof value === 'object' && value !== null) {
      if (value instanceof Date) {
        return value.getTime() // Convert Date to timestamp if treated as number
      }
      if (value.value !== undefined) {
        return safeNumber(value.value)
      }
      if (value.amount !== undefined) {
        return safeNumber(value.amount)
      }
      if (value.count !== undefined) {
        return safeNumber(value.count)
      }
      // Attempt to convert object to number directly as a last resort
      const numValue = Number(value)
      return isNaN(numValue) || !isFinite(numValue) ? 0 : numValue
    }
    return 0
  }

  // Using shared safe string utilities

  // Load custom treatment names for proper display
  const { refreshTreatmentNames } = useTreatmentNames()

  // Time filtering for treatments
  const treatmentStats = useTimeFilteredStats({
    data: toothTreatments,
    dateField: 'created_at',
    initialFilter: { preset: 'all', startDate: '', endDate: '' } // Show all data by default
  })

  // Use real-time reports hook for automatic updates
  useRealTimeReportsByType('treatments')

  useEffect(() => {
    generateReport('treatments')
    loadToothTreatments()
    loadPatients()
    refreshTreatmentNames() // تحديث أسماء العلاجات المخصصة
  }, [generateReport, loadToothTreatments, loadPatients, refreshTreatmentNames])

  // Calculate filtered statistics
  const filteredTreatmentStats = useMemo(() => {
    const filteredData = treatmentStats.filteredData

    if (!filteredData || filteredData.length === 0) {
      return {
        totalTreatments: 0,
        completedTreatments: 0,
        plannedTreatments: 0,
        inProgressTreatments: 0,
        cancelledTreatments: 0,
        totalRevenue: 0,
        averageTreatmentCost: 0,
        completionRate: 0,
        treatmentsByStatus: [],
        treatmentsByCategory: [],
        treatmentsByType: [],
        revenueByCategory: [],
        pendingTreatments: [],
        overdueTreatments: []
      }
    }

    // Calculate basic counts
    const totalTreatments = filteredData.length
    const completedTreatments = filteredData.filter(t => t.status === 'completed').length
    const plannedTreatments = filteredData.filter(t => t.status === 'planned').length
    const inProgressTreatments = filteredData.filter(t => t.status === 'in-progress').length
    const cancelledTreatments = filteredData.filter(t => t.status === 'cancelled').length

    // Calculate financial stats
    const totalRevenue = filteredData.reduce((sum, t) => sum + (t.cost || 0), 0)
    const averageTreatmentCost = totalTreatments > 0 ? totalRevenue / totalTreatments : 0
    const completionRate = totalTreatments > 0 ? Math.round((completedTreatments / totalTreatments) * 100) : 0

    // Group by status
    const statusGroups = filteredData.reduce((acc, treatment) => {
      const status = getStatusLabelInArabic(treatment.status || 'غير محدد')
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const treatmentsByStatus = Object.entries(statusGroups).map(([status, count]) => ({
      status,
      count,
      percentage: totalTreatments > 0 ? Math.round((count / totalTreatments) * 100) : 0
    }))

    // Group by category
    const categoryGroups = filteredData.reduce((acc, treatment) => {
      const category = getCategoryNameInArabic(treatment.treatment_category || 'غير محدد')
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const treatmentsByCategory = Object.entries(categoryGroups).map(([category, count]) => ({
      category,
      count,
      percentage: totalTreatments > 0 ? Math.round((count / totalTreatments) * 100) : 0
    }))

    // Group by type
    const typeGroups = filteredData.reduce((acc, treatment) => {
      const type = getTreatmentNameInArabic(treatment.treatment_type || 'غير محدد')
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const treatmentsByType = Object.entries(typeGroups).map(([type, count]) => ({
      type,
      count,
      percentage: totalTreatments > 0 ? Math.round((count / totalTreatments) * 100) : 0
    }))

    // Revenue by category
    const revenueByCategory = Object.entries(
      filteredData.reduce((acc, treatment) => {
        const category = getCategoryNameInArabic(treatment.treatment_category || 'غير محدد')
        if (!acc[category]) {
          acc[category] = { revenue: 0, count: 0 }
        }
        acc[category].revenue += treatment.cost || 0
        acc[category].count += 1
        return acc
      }, {} as Record<string, { revenue: number; count: number }>)
    ).map(([category, data]) => ({
      category,
      revenue: data.revenue,
      count: data.count
    }))

    // Pending and overdue treatments
    const pendingTreatments = filteredData.filter(t =>
      t.status === 'planned' || t.status === 'in-progress'
    ).map(treatment => ({
      ...treatment,
      patient_name: patients.find(p => p.id === treatment.patient_id)?.full_name ||
                   `${patients.find(p => p.id === treatment.patient_id)?.first_name || ''} ${patients.find(p => p.id === treatment.patient_id)?.last_name || ''}`.trim() ||
                   `مريض ${treatment.patient_id}`
    }))

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const overdueTreatments = pendingTreatments.filter(t =>
      new Date(t.created_at) < thirtyDaysAgo
    )

    return {
      totalTreatments,
      completedTreatments,
      plannedTreatments,
      inProgressTreatments,
      cancelledTreatments,
      totalRevenue,
      averageTreatmentCost,
      completionRate,
      treatmentsByStatus,
      treatmentsByCategory,
      treatmentsByType,
      revenueByCategory,
      pendingTreatments,
      overdueTreatments
    }
  }, [treatmentStats.filteredData, patients])

  const handleRefresh = useCallback(async () => {
    try {
      clearCache()
      await generateReport('treatments')
      await loadToothTreatments()
      await loadPatients()
      notify.success('تم تحديث تقارير العلاجات بنجاح')
    } catch (error) {
      console.error('Error refreshing treatment reports:', error)
      notify.error('فشل في تحديث تقارير العلاجات')
    }
  }, [clearCache, generateReport, loadToothTreatments, loadPatients])

  // Memoized export functions
  const handleExportExcel = useCallback(async () => {
    try {
      const dataToExport = treatmentStats.filteredData.length > 0 ? treatmentStats.filteredData : toothTreatments

      if (dataToExport.length === 0) {
        notify.noDataToExport('لا توجد بيانات علاجات للتصدير')
        return
      }

      const patientMap: Record<string, string> = {}
      patients.forEach(patient => {
        patientMap[patient.id] = patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim()
      })

      const dataWithPatientNames = dataToExport.map(treatment => ({
        ...treatment,
        patient_name: patientMap[treatment.patient_id] || `مريض ${treatment.patient_id}`
      }))

      await ExportService.exportTreatmentsToCSV(dataWithPatientNames)
      notify.exportSuccess(`تم تصدير تقرير العلاجات بنجاح! (${dataToExport.length} علاج)`)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      notify.exportError('فشل في تصدير تقرير العلاجات')
    }
  }, [treatmentStats.filteredData, toothTreatments, patients])

  const handleExportPDF = useCallback(async () => {
    try {
      const dataToExport = treatmentStats.filteredData.length > 0 ? treatmentStats.filteredData : toothTreatments

      if (dataToExport.length === 0) {
        notify.noDataToExport('لا توجد بيانات علاجات للتصدير')
        return
      }

      const patientMap: Record<string, string> = {}
      patients.forEach(patient => {
        patientMap[patient.id] = patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim()
      })

      const dataWithPatientNames = dataToExport.map(treatment => ({
        ...treatment,
        patient_name: patientMap[treatment.patient_id] || `مريض ${treatment.patient_id}`
      }))

      const treatmentReportData = {
        ...filteredTreatmentStats,
        filterInfo: treatmentStats.timeFilter.startDate && treatmentStats.timeFilter.endDate
          ? `البيانات من ${treatmentStats.timeFilter.startDate} إلى ${treatmentStats.timeFilter.endDate}`
          : 'جميع البيانات',
        dataCount: dataToExport.length
      }

      await PdfService.exportTreatmentReport(treatmentReportData, settings)
      notify.exportSuccess(`تم تصدير تقرير العلاجات كملف PDF بنجاح (${dataToExport.length} علاج)`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      notify.exportError('فشل في تصدير تقرير العلاجات كملف PDF')
    }
  }, [treatmentStats, toothTreatments, patients, filteredTreatmentStats, settings])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" dir="rtl">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>جاري تحميل تقارير العلاجات...</p>
        </div>
      </div>
    )
  }

  if (!treatmentReports) {
    return (
      <div className="text-center py-8" dir="rtl">
        <Stethoscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">لا توجد بيانات علاجات متاحة</p>
        <Button onClick={handleRefresh} className="mt-4">
          <RefreshCw className="h-4 w-4 ml-2" />
          تحديث
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-foreground">تقارير العلاجات</h2>
            {/* <RealTimeIndicator isActive={true} /> */}
          </div>
          <p className="text-muted-foreground">
            تحليل شامل لجميع العلاجات والإجراءات الطبية
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2 space-x-reverse"
          >
            <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير اكسل
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير PDF
          </Button>
        </div>
      </div>

      {/* Time Filter */}
      <TimeFilter
        value={treatmentStats.timeFilter}
        onChange={treatmentStats.handleFilterChange}
        onClear={treatmentStats.resetFilter}
        title="فلترة العلاجات حسب التاريخ"
        defaultOpen={false}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي العلاجات"
          value={safeNumber(filteredTreatmentStats.totalTreatments).toFixed(0)}
          icon={Activity}
          color="blue"
          description="العدد الكلي للعلاجات"
          trend={treatmentStats.trend}
        />
        <StatCard
          title="العلاجات المكتملة"
          value={safeNumber(filteredTreatmentStats.completedTreatments).toFixed(0)}
          icon={CheckCircle}
          color="green"
          description={`معدل الإنجاز: ${safeNumber(filteredTreatmentStats.completionRate).toFixed(1)}%`}
        />
        <StatCard
          title="إجمالي الإيرادات"
          value={<CurrencyDisplay amount={filteredTreatmentStats.totalRevenue} currency={currency} />}
          icon={DollarSign}
          color="green"
          description={`متوسط التكلفة: ${formatCurrency(filteredTreatmentStats.averageTreatmentCost, currency)}`}
        />
        <StatCard
          title="العلاجات الآجلة"
          value={safeNumber(filteredTreatmentStats.pendingTreatments.length).toFixed(0)}
          icon={Clock}
          color="yellow"
          description={`متأخرة: ${safeNumber(filteredTreatmentStats.overdueTreatments.length).toFixed(0)}`}
        />
      </div>

      {/* Charts and Analysis */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="analysis">التحليل</TabsTrigger>
          <TabsTrigger value="performance">الأداء</TabsTrigger>
          <TabsTrigger value="details">التفاصيل</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Treatment Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  توزيع حالات العلاج
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredTreatmentStats.treatmentsByStatus.length === 0 ? (
                  <div className="flex items-center justify-center h-80 text-muted-foreground">
                    <div className="text-center">
                      <PieChartIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد بيانات علاجات متاحة</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={filteredTreatmentStats.treatmentsByStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ status, percentage }) => `${safeString(status)}: ${safeNumber(percentage).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        isAnimationActive={false}
                        animationDuration={0}
                      >
                        {filteredTreatmentStats.treatmentsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${safeNumber(value).toFixed(0)}`, `${safeString(name)}`]}
                        labelFormatter={(label) => `الحالة: ${safeString(label)}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Treatment Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  العلاجات حسب الفئة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredTreatmentStats.treatmentsByCategory.length === 0 ? (
                  <div className="flex items-center justify-center h-80 text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد بيانات فئات علاجات متاحة</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filteredTreatmentStats.treatmentsByCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="category"
                        tickFormatter={(value) => safeString(value)}
                        tick={{ fontSize: 12 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [safeNumber(value).toFixed(0), 'عدد العلاجات']}
                        labelFormatter={(label) => `الفئة: ${safeString(label)}`}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} animationDuration={0} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {/* More detailed analysis charts will be added here */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>الإيرادات حسب الفئة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(!filteredTreatmentStats.revenueByCategory || filteredTreatmentStats.revenueByCategory.length === 0) ? (
                    <div className="flex items-center justify-center h-40 text-muted-foreground">
                      <div className="text-center">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">لا توجد بيانات إيرادات متاحة</p>
                      </div>
                    </div>
                  ) : (
                    filteredTreatmentStats.revenueByCategory.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <span className="font-medium text-right">{item.category}</span>
                        <div className="text-left">
                          <div className="font-bold">
                            <CurrencyDisplay amount={item.revenue} currency={currency} />
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.count} علاج
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>أشهر العلاجات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(treatmentReports.mostPopularTreatments) ?
                    treatmentReports.mostPopularTreatments.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="font-medium">{safeString(item.name)}</span>
                        <div className="text-left">
                          <div className="font-bold">{safeNumber(item.count)} مرة</div>
                          <div className="text-sm text-muted-foreground">
                            <CurrencyDisplay amount={safeNumber(item.revenue)} currency={currency} />
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-muted-foreground py-4">
                        لا توجد بيانات أشهر العلاجات متاحة
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>اتجاه العلاجات الشهري</CardTitle>
              </CardHeader>
              <CardContent>
                {(!treatmentReports.treatmentTrend || !Array.isArray(treatmentReports.treatmentTrend) || treatmentReports.treatmentTrend.length === 0) ? (
                  <div className="flex items-center justify-center h-80 text-muted-foreground">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد بيانات اتجاه العلاجات متاحة</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={treatmentReports.treatmentTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="period"
                        tickFormatter={(value) => safeString(value)}
                      />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [`${safeNumber(value).toFixed(0)}`, `${safeString(name)}`]}
                        labelFormatter={(label) => `الفترة: ${safeString(label)}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="completed"
                        stroke="#10b981"
                        name="مكتمل"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        isAnimationActive={false}
                        animationDuration={0}
                      />
                      <Line
                        type="monotone"
                        dataKey="planned"
                        stroke="#3b82f6"
                        name="مخطط"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        isAnimationActive={false}
                        animationDuration={0}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>مؤشرات الأداء</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>معدل الإنجاز</span>
                    <Badge variant="secondary">
                      {safeNumber(treatmentReports.completionRate).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>متوسط وقت الإنجاز</span>
                    <Badge variant="secondary">
                      {Math.round(safeNumber(treatmentReports.averageCompletionTime))} يوم
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>المرضى بعلاجات متعددة</span>
                    <Badge variant="secondary">
                      {safeNumber(treatmentReports.patientsWithMultipleTreatments)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>متوسط العلاجات لكل مريض</span>
                    <Badge variant="secondary">
                      {safeNumber(treatmentReports.averageTreatmentsPerPatient).toFixed(1)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Treatments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  العلاجات الآجلة ({filteredTreatmentStats.pendingTreatments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  {filteredTreatmentStats.pendingTreatments.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-muted-foreground">
                      <div className="text-center">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">لا توجد علاجات آجلة</p>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">نوع العلاج</TableHead>
                          <TableHead className="text-right">اسم المريض</TableHead>
                          <TableHead className="text-right">الحالة</TableHead>
                          <TableHead className="text-right">التاريخ</TableHead>
                          <TableHead className="text-right">التكلفة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTreatmentStats.pendingTreatments.slice(0, 10).map((treatment) => (
                        <TableRow key={treatment.id}>
                          <TableCell className="text-right">{getTreatmentNameInArabic(treatment.treatment_type)}</TableCell>
                          <TableCell className="text-right">{safeString(treatment.patient_name)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={treatment.treatment_status === 'planned' ? 'secondary' : 'default'}>
                              {getStatusLabelInArabic(treatment.treatment_status || 'غير محدد')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {treatment.created_at ? formatDate(treatment.created_at) : 'غير محدد'}
                          </TableCell>
                          <TableCell className="text-right">
                            <CurrencyDisplay amount={treatment.cost || 0} currency={currency} />
                          </TableCell>
                        </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Overdue Treatments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  العلاجات المتأخرة ({filteredTreatmentStats.overdueTreatments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  {filteredTreatmentStats.overdueTreatments.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-muted-foreground">
                      <div className="text-center">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50 text-green-500" />
                        <p className="text-sm">لا توجد علاجات متأخرة</p>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">نوع العلاج</TableHead>
                          <TableHead className="text-right">اسم المريض</TableHead>
                          <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                          <TableHead className="text-right">الأيام المتأخرة</TableHead>
                          <TableHead className="text-right">التكلفة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTreatmentStats.overdueTreatments.slice(0, 10).map((treatment) => {
                        const daysOverdue = treatment.created_at
                          ? Math.ceil((new Date().getTime() - new Date(treatment.created_at).getTime()) / (1000 * 60 * 60 * 24))
                          : 0
                        return (
                          <TableRow key={treatment.id}>
                            <TableCell className="text-right">{getTreatmentNameInArabic(treatment.treatment_type)}</TableCell>
                            <TableCell className="text-right">{safeString(treatment.patient_name)}</TableCell>
                            <TableCell className="text-right">
                              {treatment.created_at ? formatDate(treatment.created_at) : 'غير محدد'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="destructive">{daysOverdue} يوم</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <CurrencyDisplay amount={treatment.cost || 0} currency={currency} />
                            </TableCell>
                          </TableRow>
                        )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default TreatmentReportsComponent
