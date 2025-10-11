import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useReportsStore } from '@/store/reportsStore'
import { useRealTimeReportsByType } from '@/hooks/useRealTimeReports'
import { useSettingsStore } from '@/store/settingsStore'
import { useToast } from '@/hooks/use-toast'
import { formatDate, getChartColors, getChartConfig, getChartColorsWithFallback, formatChartValue } from '@/lib/utils'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { useTheme } from '@/contexts/ThemeContext'
import { ensureGenderDistribution, ensureAgeDistribution, formatChartData } from '@/lib/chartDataHelpers'
import { PdfService } from '@/services/pdfService'
import { ExportService } from '@/services/exportService'
// Time filtering removed as requested
import { usePatientStore } from '@/store/patientStore'
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  TrendingUp,
  TrendingDown,
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  BarChart3,
  PieChart,
  RefreshCw
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

export default function PatientReports() {
  const { patientReports, isLoading, isExporting, generateReport, exportReport, currentFilter, setFilter, clearCache } = useReportsStore()
  const { currency, settings } = useSettingsStore()
  const { toast } = useToast()
  const { isDarkMode } = useTheme()
  const { patients, loadPatients } = usePatientStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [ageFilter, setAgeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // No time filtering for patients as requested

  useEffect(() => {
    generateReport('patients')
    loadPatients()
  }, [generateReport, loadPatients])

  // Use real-time reports hook for automatic updates
  useRealTimeReportsByType('patients')





  const StatCard = ({
    title,
    value,
    icon: Icon,
    color = 'blue',
    trend,
    description
  }: {
    title: string
    value: string | number
    icon: any
    color?: string
    trend?: { value: number; isPositive: boolean }
    description?: string
  }) => (
    <Card className={getCardStyles(color)} dir="rtl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground text-right">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${getIconStyles(color)}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground text-right">{value}</div>
        {trend && (
          <div className={`text-xs flex items-center justify-end mt-1 ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <span className="ml-1">{Math.abs(trend.value)}%</span>
            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )

  const filteredPatients = patientReports?.patientsList?.filter(patient => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase()
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                         patient.phone?.includes(searchTerm) ||
                         patient.email?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAge = ageFilter === 'all' || (() => {
      if (!patient.date_of_birth) return ageFilter === 'unknown'
      const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
      switch (ageFilter) {
        case 'child': return age < 18
        case 'adult': return age >= 18 && age < 60
        case 'senior': return age >= 60
        default: return true
      }
    })()

    // For status filter, we'd need appointment data to determine active/inactive
    const matchesStatus = statusFilter === 'all'

    return matchesSearch && matchesAge && matchesStatus
  }) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Users className="h-12 w-12 animate-pulse text-sky-600 mx-auto mb-4" />
          <p className="text-muted-foreground">جاري تحميل تقارير المرضى...</p>
        </div>
      </div>
    )
  }

  if (!patientReports) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">لا توجد بيانات</h3>
        <p className="text-muted-foreground">لم يتم العثور على بيانات المرضى</p>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">تقارير المرضى</h2>
          <p className="text-muted-foreground mt-1">
            إحصائيات وتحليلات شاملة للمرضى
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
                await generateReport('patients')

                toast({
                  title: "تم التحديث بنجاح",
                  description: "تم تحديث تقارير المرضى بأحدث البيانات",
                })
              } catch (error) {
                console.error('Error refreshing patient reports:', error)
                toast({
                  title: "خطأ في التحديث",
                  description: "فشل في تحديث التقارير. يرجى المحاولة مرة أخرى.",
                  variant: "destructive",
                })
              }
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'جاري التحديث...' : 'تحديث'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              // Use actual patients data for export to ensure accuracy
              if (!patients || patients.length === 0) {
                toast({
                  title: "لا توجد بيانات",
                  description: "لا توجد بيانات مرضى للتصدير",
                  variant: "destructive",
                })
                return
              }

              try {
                // تصدير إلى Excel مع التنسيق الجميل والمقروء
                await ExportService.exportPatientsToExcel(patients)

                toast({
                  title: "تم التصدير بنجاح",
                  description: `تم تصدير تقرير المرضى كملف Excel مع التنسيق الجميل (${patients.length} مريض)`,
                })
              } catch (error) {
                console.error('Error exporting Excel:', error)
                toast({
                  title: "خطأ في التصدير",
                  description: "فشل في تصدير التقرير. يرجى المحاولة مرة أخرى.",
                  variant: "destructive",
                })
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
                // Use actual patients data for PDF export to ensure accuracy
                if (!patients || patients.length === 0) {
                  toast({
                    title: "لا توجد بيانات",
                    description: "لا توجد بيانات مرضى للتصدير",
                    variant: "destructive",
                  })
                  return
                }

                // Calculate statistics from actual patients data for PDF
                const totalPatients = patients.length
                const today = new Date()
                const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)

                const newPatientsThisMonth = patients.filter(p =>
                  new Date(p.created_at) >= thisMonth
                ).length

                // Calculate age distribution from actual data
                const ageGroups = { children: 0, teens: 0, adults: 0, seniors: 0 }
                const genderGroups = { male: 0, female: 0 }
                let totalAge = 0
                let patientsWithAge = 0

                patients.forEach(patient => {
                  // Age calculation - use the age field directly from database
                  if (patient.age && typeof patient.age === 'number' && patient.age > 0) {
                    const age = patient.age
                    totalAge += age
                    patientsWithAge++

                    if (age < 13) ageGroups.children++
                    else if (age < 20) ageGroups.teens++
                    else if (age < 60) ageGroups.adults++
                    else ageGroups.seniors++
                  }

                  // Gender calculation
                  if (patient.gender === 'male') genderGroups.male++
                  else if (patient.gender === 'female') genderGroups.female++
                })

                const averageAge = patientsWithAge > 0 ? Math.round(totalAge / patientsWithAge) : 0

                // Create patient report data structure using actual data
                const actualPatientReportData = {
                  totalPatients: totalPatients,
                  newPatientsThisMonth: newPatientsThisMonth,
                  activePatients: totalPatients, // All patients are considered active for this report
                  averageAge: averageAge,
                  patients: patients,
                  ageDistribution: [
                    { ageGroup: 'أطفال (0-12)', count: ageGroups.children },
                    { ageGroup: 'مراهقون (13-19)', count: ageGroups.teens },
                    { ageGroup: 'بالغون (20-59)', count: ageGroups.adults },
                    { ageGroup: 'كبار السن (60+)', count: ageGroups.seniors }
                  ],
                  genderDistribution: [
                    { gender: 'ذكور', count: genderGroups.male },
                    { gender: 'إناث', count: genderGroups.female }
                  ],
                  registrationTrend: [],
                  filterInfo: 'جميع المرضى المسجلين',
                  dataCount: totalPatients
                }

                await PdfService.exportPatientReport(actualPatientReportData, settings)

                toast({
                  title: "تم التصدير بنجاح",
                  description: `تم تصدير تقرير المرضى كملف PDF (${totalPatients} مريض)`,
                })
              } catch (error) {
                console.error('Error exporting PDF:', error)
                toast({
                  title: "خطأ في التصدير",
                  description: "فشل في تصدير التقرير كملف PDF. يرجى المحاولة مرة أخرى.",
                  variant: "destructive",
                })
              }
            }}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 ml-2" />
            {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
          </Button>
        </div>
      </div>

      {/* No time filter for patients as requested */}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" dir="rtl">
        <StatCard
          title="إجمالي المرضى"
          value={patientReports?.totalPatients || 0}
          icon={Users}
          color="blue"
          description="العدد الكلي للمرضى المسجلين"
        />
        <StatCard
          title="المرضى الجدد"
          value={patientReports?.newPatients || 0}
          icon={UserPlus}
          color="green"
          description="المرضى المسجلين حديثاً"
        />
        <StatCard
          title="المرضى النشطين"
          value={patientReports?.activePatients || 0}
          icon={UserCheck}
          color="emerald"
          description="المرضى الذين لديهم مواعيد حديثة"
        />
        <StatCard
          title="المرضى غير النشطين"
          value={patientReports?.inactivePatients || 0}
          icon={UserX}
          color="red"
          description="المرضى بدون مواعيد حديثة"
        />
      </div>

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
        {/* Enhanced Age Distribution Chart */}
        <Card dir="rtl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <PieChart className="w-5 h-5" />
              <span>التوزيع العمري</span>
            </CardTitle>
            <CardDescription>
              توزيع المرضى حسب الفئات العمرية ({patientReports.totalPatients} مريض إجمالي)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const ageData = ensureAgeDistribution(patientReports.ageDistribution)
              const categoricalColors = getChartColors('categorical', isDarkMode)
              const primaryColors = getChartColors('primary', isDarkMode)
              const demographicsColors = getChartColorsWithFallback('demographics', isDarkMode, ageData.length)
              const chartConfiguration = getChartConfig(isDarkMode)

              return ageData.length === 0 ? (
                <div className="flex items-center justify-center h-80 text-muted-foreground">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد بيانات توزيع عمري متاحة</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={chartConfiguration.responsive.desktop.height}>
                  <RechartsPieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <Pie
                      data={ageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ ageGroup, count, percent }) =>
                        count > 0 ? `${ageGroup}: ${count} (${(percent * 100).toFixed(0)}%)` : ''
                      }
                      outerRadius={120}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="count"
                      stroke={isDarkMode ? '#1f2937' : '#ffffff'}
                      strokeWidth={2}
                      paddingAngle={2}
                    >
                      {ageData.map((entry, index) => (
                        <Cell
                          key={`age-${index}`}
                          fill={demographicsColors[index % demographicsColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} مريض`, 'العدد']}
                      labelFormatter={(label) => `الفئة العمرية: ${label}`}
                      contentStyle={chartConfiguration.tooltip}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )
            })()}

            {/* Age Distribution Legend */}
            {(() => {
              const ageData = ensureAgeDistribution(patientReports.ageDistribution)
              const demographicsColors = getChartColorsWithFallback('demographics', isDarkMode, ageData.length)

              return ageData.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  {ageData.map((age, index) => (
                    <div key={`age-legend-${index}`} className="flex items-center space-x-2 space-x-reverse">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: demographicsColors[index % demographicsColors.length] }}
                      />
                      <span className="text-muted-foreground">
                        {age.ageGroup}: {age.count} ({Math.round((age.count / patientReports.totalPatients) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </CardContent>
        </Card>

        {/* Enhanced Gender Distribution Chart */}
        <Card dir="rtl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <BarChart3 className="w-5 h-5" />
              <span>التوزيع حسب الجنس</span>
            </CardTitle>
            <CardDescription>
              توزيع المرضى حسب الجنس ({patientReports.totalPatients} مريض إجمالي)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const genderData = ensureGenderDistribution(patientReports.genderDistribution)
              const demographicsColors = getChartColorsWithFallback('demographics', isDarkMode, 2)
              const primaryColors = getChartColors('primary', isDarkMode)
              const chartConfiguration = getChartConfig(isDarkMode)

              return genderData.length === 0 ? (
                <div className="flex items-center justify-center h-80 text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد بيانات توزيع جنس متاحة</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={chartConfiguration.responsive.desktop.height}>
                  <BarChart
                    data={genderData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    barCategoryGap={chartConfiguration.bar.barCategoryGap}
                  >
                    <CartesianGrid
                      strokeDasharray={chartConfiguration.grid.strokeDasharray}
                      stroke={chartConfiguration.grid.stroke}
                      strokeOpacity={chartConfiguration.grid.strokeOpacity}
                    />
                    <XAxis
                      dataKey="gender"
                      tick={{ fontSize: 14, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                      axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                      tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    />
                    <YAxis
                      tick={{ fontSize: 14, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                      axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                      tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                      domain={[0, 'dataMax + 1']}
                      allowDecimals={false}
                      tickFormatter={(value) => `${Math.round(value)} مريض`}
                    />
                    <Tooltip
                      formatter={(value, name) => [`${value} مريض`, 'العدد']}
                      labelFormatter={(label) => `الجنس: ${label}`}
                      contentStyle={chartConfiguration.tooltip}
                    />
                    <Bar
                      dataKey="count"
                      fill={primaryColors[1]}
                      radius={[4, 4, 0, 0]}
                      minPointSize={5}
                      maxBarSize={100}
                    >
                      {genderData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={demographicsColors[index % demographicsColors.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            })()}

            {/* Gender Distribution Summary */}
            {(() => {
              const genderData = ensureGenderDistribution(patientReports.genderDistribution)

              return genderData.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  {genderData.map((gender, index) => (
                    <div key={`gender-summary-${index}`} className="text-center p-3 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        {gender.gender}
                      </div>
                      <div className="font-semibold">
                        {gender.count} مريض ({Math.round((gender.count / patientReports.totalPatients) * 100)}%)
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Registration Trend Chart */}
      <Card dir="rtl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <TrendingUp className="w-5 h-5" />
            <span>اتجاه التسجيل</span>
          </CardTitle>
          <CardDescription>
            عدد المرضى المسجلين شهرياً ({patientReports.registrationTrend?.length || 0} فترة)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const registrationData = patientReports.registrationTrend || []
            const primaryColors = getChartColors('primary', isDarkMode)
            const medicalColors = getChartColorsWithFallback('medical', isDarkMode, 1)
            const chartConfiguration = getChartConfig(isDarkMode)

            return registrationData.length === 0 ? (
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد بيانات اتجاه تسجيل متاحة</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={chartConfiguration.responsive.large.height}>
                <AreaChart
                  data={registrationData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray={chartConfiguration.grid.strokeDasharray}
                    stroke={chartConfiguration.grid.stroke}
                    strokeOpacity={chartConfiguration.grid.strokeOpacity}
                  />
                  <XAxis
                    dataKey="period"
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
                    domain={[0, 'dataMax + 1']}
                    tickFormatter={(value) => `${value} مريض`}
                  />
                  <Tooltip
                    formatter={(value, name) => [`${value} مريض`, 'عدد المسجلين']}
                    labelFormatter={(label) => `الفترة: ${label}`}
                    contentStyle={chartConfiguration.tooltip}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={primaryColors[0]}
                    fill={primaryColors[0]}
                    fillOpacity={0.3}
                    strokeWidth={3}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )
          })()}

          {/* Registration Trend Summary */}
          {(() => {
            const registrationData = patientReports.registrationTrend || []

            return registrationData.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-xs text-muted-foreground">أعلى فترة</div>
                  <div className="font-semibold">
                    {Math.max(...registrationData.map(d => d.count))} مريض
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-xs text-muted-foreground">متوسط شهري</div>
                  <div className="font-semibold">
                    {Math.round(registrationData.reduce((sum, d) => sum + d.count, 0) / registrationData.length)} مريض
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-xs text-muted-foreground">إجمالي المسجلين</div>
                  <div className="font-semibold">
                    {registrationData.reduce((sum, d) => sum + d.count, 0)} مريض
                  </div>
                </div>
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Patients List */}
      <Card dir="rtl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span>قائمة المرضى</span>
          </CardTitle>
          <CardDescription>قائمة تفصيلية بجميع المرضى</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6" dir="rtl">
            <div className="flex-1">
              <Label htmlFor="search">البحث</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="البحث بالاسم، الهاتف، أو البريد الإلكتروني..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  dir="rtl"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="age-filter">الفئة العمرية</Label>
              <Select value={ageFilter} onValueChange={setAgeFilter}>
                <SelectTrigger className="w-40" dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأعمار</SelectItem>
                  <SelectItem value="child">أطفال (أقل من 18)</SelectItem>
                  <SelectItem value="adult">بالغين (18-59)</SelectItem>
                  <SelectItem value="senior">كبار السن (60+)</SelectItem>
                  <SelectItem value="unknown">غير محدد</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status-filter">الحالة</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32" dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Patients Table */}
          <div className="border rounded-lg overflow-hidden" dir="rtl">
            <div className="overflow-x-auto">
              <table className="w-full table-center-all" dir="rtl">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-center p-3 font-medium arabic-enhanced">#</th>
                    <th className="text-center p-3 font-medium arabic-enhanced">الاسم</th>
                    <th className="text-center p-3 font-medium arabic-enhanced">الهاتف</th>
                    <th className="text-center p-3 font-medium arabic-enhanced">البريد الإلكتروني</th>
                    <th className="text-center p-3 font-medium arabic-enhanced">تاريخ التسجيل</th>
                    <th className="text-center p-3 font-medium arabic-enhanced">العمر</th>
                    <th className="text-center p-3 font-medium arabic-enhanced">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient, index) => (
                    <tr key={patient.id} className={`hover:bg-muted/50 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                      <td className="p-3 font-medium text-center">
                        {index + 1}
                      </td>
                      <td className="p-3 font-medium text-center table-cell-wrap-truncate-md">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                            {patient.full_name ? patient.full_name.charAt(0) : (patient.first_name || '').charAt(0)}
                          </div>
                          <span className="arabic-enhanced">
                            {patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim()}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground text-center arabic-enhanced table-cell-wrap-truncate-sm">{patient.phone || '-'}</td>
                      <td className="p-3 text-muted-foreground text-center arabic-enhanced table-cell-wrap-truncate-lg">{patient.email || '-'}</td>
                      <td className="p-3 text-muted-foreground text-center arabic-enhanced">
                        {formatDate(patient.created_at)}
                      </td>
                      <td className="p-3 text-muted-foreground text-center arabic-enhanced">
                        {patient.age || (patient.date_of_birth
                          ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
                          : '-'
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="secondary" className="arabic-enhanced">نشط</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPatients.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">لا توجد نتائج مطابقة للبحث</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
