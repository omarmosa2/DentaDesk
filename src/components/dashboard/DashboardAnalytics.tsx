import React, { memo, useState, useEffect } from 'react'
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
 import { Button } from '@/components/ui/button'
 import { Badge } from '@/components/ui/badge'
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
 import {
   BarChart3,
   TrendingUp,
   TrendingDown,
   Users,
   Calendar,
   DollarSign,
   Activity,
   PieChart,
   LineChart,
   ArrowUpRight,
   ArrowDownRight,
   Eye,
   RefreshCw
 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { usePatientStore } from '@/store/patientStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { usePaymentStore } from '@/store/paymentStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { shallow } from 'zustand/shallow'
import { useSettingsStore } from '@/store/settingsStore'
import { useTheme } from '@/contexts/ThemeContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { ar } from 'date-fns/locale'

// Performance: only log verbose analytics in development
const __DEV__ = process.env.NODE_ENV !== 'production'

interface DashboardAnalyticsProps {
  onNavigateToPatients?: () => void
  onNavigateToAppointments?: () => void
  onNavigateToPayments?: () => void
  onNavigateToTreatments?: () => void
}

interface AnalyticsData {
  overview: {
    totalPatients: number
    totalAppointments: number
    totalRevenue: number
    growthRate: number
  }
  trends: {
    patientGrowth: Array<{ date: string; count: number }>
    revenueGrowth: Array<{ date: string; amount: number }>
    appointmentTrend: Array<{ date: string; count: number }>
  }
  distributions: {
    appointmentStatus: Array<{ name: string; value: number; color: string }>
    gender: Array<{ name: string; value: number; color: string }>
    ageGroups: Array<{ name: string; value: number; color: string }>
  }
  kpis: {
    patientRetention: number
    appointmentUtilization: number
    averageRevenue: number
    noShowRate: number
  }
}

function DashboardAnalyticsComponent({
  onNavigateToPatients,
  onNavigateToAppointments,
  onNavigateToPayments,
  onNavigateToTreatments
}: DashboardAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [timeRange, setTimeRange] = useState('30d')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Use selectors to limit re-renders to only the used slices
  const patients = usePatientStore(state => state.patients)
  const appointments = useAppointmentStore(state => state.appointments)
  const payments = usePaymentStore(state => state.payments)
  const totalRevenue = usePaymentStore(state => state.totalRevenue)
  const inventoryItems = useInventoryStore(state => state.items)
  // Removed: const { currency } = useSettingsStore() - now using centralized currency formatting
  const { isDarkMode } = useTheme()
  const { formatAmount, useArabicNumerals } = useCurrency()

  // Validate data integrity
  const validateDataIntegrity = () => {
    const issues = []

    if (!patients || patients.length === 0) {
      issues.push('لا توجد بيانات مرضى')
    }

    if (!appointments || appointments.length === 0) {
      issues.push('لا توجد بيانات مواعيد')
    }

    if (!payments || payments.length === 0) {
      issues.push('لا توجد بيانات مدفوعات')
    }

    // Check for invalid data
    const invalidPatients = patients.filter(p => !p.id || !p.full_name)
    if (invalidPatients.length > 0) {
      issues.push(`${invalidPatients.length} مريض بدون بيانات صحيحة`)
    }

    const invalidAppointments = appointments.filter(a => !a.id || !a.start_time)
    if (invalidAppointments.length > 0) {
      issues.push(`${invalidAppointments.length} موعد بدون بيانات صحيحة`)
    }

    const invalidPayments = payments.filter(p => !p.id || typeof p.amount !== 'number')
    if (invalidPayments.length > 0) {
      issues.push(`${invalidPayments.length} دفعة بدون بيانات صحيحة`)
    }

    if (issues.length > 0) {
      console.warn('⚠️ Data Integrity Issues:', issues)
    }

    return issues.length === 0
  }

  // Calculate analytics data
  useEffect(() => {
    calculateAnalytics()
  }, [patients, appointments, payments, timeRange, formatAmount])

  // Force data refresh when component mounts
  useEffect(() => {
    const refreshData = () => {
      calculateAnalytics()
    }
    refreshData()
    setLastUpdate(new Date())
  }, [])

  const calculateAnalytics = () => {
    setIsLoading(true)

    try {
      // Validate data integrity first
      const isDataValid = validateDataIntegrity()
      if (!isDataValid) {
        console.warn('⚠️ Data integrity issues detected. Analytics may not be accurate.')
      }


      // Calculate date range
      const endDate = new Date()
      const startDate = subDays(endDate, timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90)

      // Filter data by time range
      const filteredAppointments = appointments.filter(apt =>
        isWithinInterval(new Date(apt.start_time), { start: startDate, end: endDate })
      )
      const filteredPayments = payments.filter(payment =>
        isWithinInterval(new Date(payment.payment_date), { start: startDate, end: endDate })
      )


      // Calculate overview metrics
      const totalRevenue = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      const overview = {
        totalPatients: patients.length,
        totalAppointments: filteredAppointments.length,
        totalRevenue: totalRevenue,
        growthRate: calculateGrowthRate()
      }

      __DEV__ && console.log('📊 Overview Metrics:', {
        totalPatients: overview.totalPatients,
        totalAppointments: overview.totalAppointments,
        totalRevenue: totalRevenue,
        growthRate: overview.growthRate
      })

      // Calculate trends
      const trends = {
        patientGrowth: calculatePatientGrowth(startDate, endDate),
        revenueGrowth: calculateRevenueGrowth(startDate, endDate),
        appointmentTrend: calculateAppointmentTrend(startDate, endDate)
      }

      // Calculate distributions
      const distributions = {
        appointmentStatus: calculateAppointmentStatusDistribution(filteredAppointments),
        gender: calculateGenderDistribution(),
        ageGroups: calculateAgeGroupDistribution()
      }


      // Calculate KPIs
      const averageRevenue = overview.totalPatients > 0 ? overview.totalRevenue / overview.totalPatients : 0
      const kpis = {
        patientRetention: calculatePatientRetention(),
        appointmentUtilization: calculateAppointmentUtilization(filteredAppointments),
        averageRevenue: averageRevenue,
        noShowRate: calculateNoShowRate(filteredAppointments)
      }


      const finalData = {
        overview,
        trends,
        distributions,
        kpis
      }


      setAnalyticsData(finalData)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error calculating analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateGrowthRate = (): number => {
    const currentMonth = new Date()
    const lastMonth = subDays(currentMonth, 30)

    const currentMonthPatients = patients.filter(p =>
      new Date(p.date_added) >= lastMonth
    ).length

    const previousMonthPatients = patients.length - currentMonthPatients

    if (previousMonthPatients === 0) return 100
    return ((currentMonthPatients - previousMonthPatients) / previousMonthPatients) * 100
  }

  const calculatePatientGrowth = (startDate: Date, endDate: Date) => {
    const days = []
    const current = new Date(startDate)

    while (current <= endDate) {
      const dayPatients = patients.filter(p => {
        const patientDate = new Date(p.date_added)
        return patientDate.toDateString() === current.toDateString()
      }).length

      days.push({
        date: format(current, 'MM/dd', { locale: ar }),
        count: dayPatients
      })

      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const calculateRevenueGrowth = (startDate: Date, endDate: Date) => {
    const days = []
    const current = new Date(startDate)

    while (current <= endDate) {
      const dayRevenue = payments.filter(p => {
        const paymentDate = new Date(p.payment_date)
        return paymentDate.toDateString() === current.toDateString()
      }).reduce((sum, p) => sum + (p.amount || 0), 0)

      days.push({
        date: format(current, 'MM/dd', { locale: ar }),
        amount: dayRevenue
      })

      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const calculateAppointmentTrend = (startDate: Date, endDate: Date) => {
    const days = []
    const current = new Date(startDate)

    while (current <= endDate) {
      const dayAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.start_time)
        return aptDate.toDateString() === current.toDateString()
      }).length

      days.push({
        date: format(current, 'MM/dd', { locale: ar }),
        count: dayAppointments
      })

      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const calculateAppointmentStatusDistribution = (filteredAppointments: any[]) => {
    const statusCounts = filteredAppointments.reduce((acc: Record<string, number>, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const colors = {
      'scheduled': 'hsl(var(--primary))',
      'completed': 'hsl(var(--medical-500))',
      'cancelled': 'hsl(var(--destructive))',
      'no-show': 'hsl(var(--accent))'
    }

    const statusNames = {
      'scheduled': 'مجدول',
      'completed': 'مكتمل',
      'cancelled': 'ملغي',
      'no-show': 'لم يحضر'
    }

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: statusNames[status as keyof typeof statusNames] || status,
      value: count,
      color: colors[status as keyof typeof colors] || 'hsl(var(--muted-foreground))'
    }))
  }

  const calculateGenderDistribution = () => {

    const genderCounts = patients.reduce((acc, patient) => {
      // Validate gender data
      if (!patient.gender || typeof patient.gender !== 'string') {
        __DEV__ && console.warn('Invalid gender data for patient:', patient.id, patient.gender)
        return acc
      }

      const gender = patient.gender.toLowerCase() === 'male' ? 'ذكر' :
                    patient.gender.toLowerCase() === 'female' ? 'أنثى' :
                    'غير محدد'

      acc[gender] = (acc[gender] || 0) + 1
      return acc
    }, {} as Record<string, number>)


    const colors = [
      'hsl(var(--primary))',
      'hsl(var(--medical-500))',
      'hsl(var(--accent))'
    ]

    return Object.entries(genderCounts).map(([gender, count], index) => ({
      name: gender,
      value: count,
      color: colors[index % colors.length]
    }))
  }

  const calculateAgeGroupDistribution = () => {

    const ageGroups = {
      '0-18': 0,
      '19-35': 0,
      '36-50': 0,
      '51-65': 0,
      '65+': 0
    }

    patients.forEach(patient => {
      const age = patient.age || 0
      if (age <= 18) ageGroups['0-18']++
      else if (age <= 35) ageGroups['19-35']++
      else if (age <= 50) ageGroups['36-50']++
      else if (age <= 65) ageGroups['51-65']++
      else ageGroups['65+']++
    })


    const colors = [
      'hsl(var(--primary))',
      'hsl(var(--medical-500))',
      'hsl(var(--dental-500))',
      'hsl(var(--destructive))',
      'hsl(var(--accent))'
    ]

    return Object.entries(ageGroups).map(([group, count], index) => ({
      name: group,
      value: count,
      color: colors[index]
    }))
  }

  const calculatePatientRetention = (): number => {
    const threeMonthsAgo = subDays(new Date(), 90)
    const oldPatients = patients.filter(p =>
      new Date(p.date_added) < threeMonthsAgo
    )

    const recentAppointments = appointments.filter(apt =>
      new Date(apt.start_time) >= threeMonthsAgo
    )

    const activeOldPatients = oldPatients.filter(patient =>
      recentAppointments.some(apt => apt.patient_id === patient.id)
    )

    return oldPatients.length > 0 ? (activeOldPatients.length / oldPatients.length) * 100 : 0
  }

  const calculateAppointmentUtilization = (filteredAppointments: any[]): number => {
    const completedAppointments = filteredAppointments.filter(apt => apt.status === 'completed')
    return filteredAppointments.length > 0 ? (completedAppointments.length / filteredAppointments.length) * 100 : 0
  }

  const calculateNoShowRate = (filteredAppointments: any[]): number => {
    const noShowAppointments = filteredAppointments.filter(apt => apt.status === 'no-show')
    return filteredAppointments.length > 0 ? (noShowAppointments.length / filteredAppointments.length) * 100 : 0
  }

  if (isLoading || !analyticsData) {
    return (
      <div className="space-y-8 p-6 md:p-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground dark:text-slate-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto p-6 md:p-8" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground dark:text-slate-200 mb-2">التحليلات والإحصائيات</h2>
          <p className="text-muted-foreground dark:text-slate-400 text-lg">تحليل شامل لأداء العيادة والاتجاهات</p>
          {lastUpdate && (
            <p className="text-sm text-muted-foreground dark:text-slate-500 mt-1">
              آخر تحديث: {format(lastUpdate, 'HH:mm:ss dd/MM/yyyy', { locale: ar })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant={timeRange === '7d' ? 'default' : 'outline'}
              size="default"
              onClick={() => setTimeRange('7d')}
              aria-label="عرض التحليلات لآخر 7 أيام"
              aria-pressed={timeRange === '7d'}
              className="transition-all duration-200 interactive-card px-4 py-2"
            >
              7 أيام
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'outline'}
              size="default"
              onClick={() => setTimeRange('30d')}
              aria-label="عرض التحليلات لآخر 30 يوم"
              aria-pressed={timeRange === '30d'}
              className="transition-all duration-200 interactive-card px-4 py-2"
            >
              30 يوم
            </Button>
            <Button
              variant={timeRange === '90d' ? 'default' : 'outline'}
              size="default"
              onClick={() => setTimeRange('90d')}
              aria-label="عرض التحليلات لآخر 90 يوم"
              aria-pressed={timeRange === '90d'}
              className="transition-all duration-200 interactive-card px-4 py-2"
            >
              90 يوم
            </Button>
          </div>
          <Button
            variant="outline"
            size="default"
            onClick={() => {
              console.log('🔄 Manual refresh triggered')
              calculateAnalytics()
            }}
            aria-label="تحديث التحليلات"
            className="transition-all duration-200 interactive-card px-4 py-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            تحديث البيانات
          </Button>
        </div>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 p-2">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="trends">الاتجاهات</TabsTrigger>
          <TabsTrigger value="distributions">التوزيعات</TabsTrigger>
          <TabsTrigger value="kpis">المؤشرات الرئيسية</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="cursor-pointer hover:shadow-md dark:hover:shadow-lg transition-all duration-200 bg-card border-border interactive-card" onClick={onNavigateToPatients} role="button" tabIndex={0} aria-label="عرض إدارة المرضى">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">إجمالي المرضى</p>
                    <p className="text-2xl font-bold text-foreground">{analyticsData.overview.totalPatients}</p>
                  </div>
                  <Users className="w-8 h-8 text-muted-foreground transition-colors" />
                </div>
                <div className="flex items-center mt-2">
                  {analyticsData.overview.growthRate >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-sm ${analyticsData.overview.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(analyticsData.overview.growthRate).toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground mr-1">من الشهر الماضي</span>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md dark:hover:shadow-lg transition-all duration-200 bg-card border-border interactive-card" onClick={onNavigateToAppointments} role="button" tabIndex={0} aria-label="عرض إدارة المواعيد">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">المواعيد</p>
                    <p className="text-2xl font-bold text-foreground">{analyticsData.overview.totalAppointments}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-muted-foreground transition-colors" />
                </div>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {timeRange === '7d' ? 'آخر 7 أيام' : timeRange === '30d' ? 'آخر 30 يوم' : 'آخر 90 يوم'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md dark:hover:shadow-lg transition-all duration-200 bg-card border-border interactive-card" onClick={onNavigateToPayments} role="button" tabIndex={0} aria-label="عرض إدارة المدفوعات">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">الإيرادات</p>
                    <p className="text-2xl font-bold text-foreground">{formatAmount(analyticsData.overview.totalRevenue)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-muted-foreground transition-colors" />
                </div>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-muted-foreground">
                    متوسط: {formatAmount(analyticsData.kpis.averageRevenue)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border transition-all duration-200 hover:shadow-md dark:hover:shadow-lg interactive-card">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">معدل الاستفادة</p>
                    <p className="text-2xl font-bold text-foreground">{analyticsData.kpis.appointmentUtilization.toFixed(1)}%</p>
                  </div>
                  <Activity className="w-8 h-8 text-muted-foreground transition-colors" />
                </div>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-muted-foreground">
                    من المواعيد المجدولة
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Patient Growth Trend */}
            <Card className="bg-white dark:bg-card border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  نمو المرضى
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.trends.patientGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} isAnimationActive={false} animationDuration={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Growth Trend */}
            <Card className="bg-white dark:bg-card border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  نمو الإيرادات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={analyticsData.trends.revenueGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatAmount(Number(value)), 'الإيرادات']} />
                    <Line type="monotone" dataKey="amount" stroke="hsl(var(--medical-500))" strokeWidth={2} isAnimationActive={false} animationDuration={0} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Appointment Trend */}
            <Card className="lg:col-span-2 bg-white dark:bg-card border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  اتجاه المواعيد
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.trends.appointmentTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--accent))" isAnimationActive={false} animationDuration={0} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Distributions Tab */}
        <TabsContent value="distributions" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Appointment Status Distribution */}
            <Card className="bg-white dark:bg-card border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  حالة المواعيد
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={analyticsData.distributions.appointmentStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      isAnimationActive={false}
                      animationDuration={0}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analyticsData.distributions.appointmentStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gender Distribution */}
            <Card className="bg-white dark:bg-card border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  توزيع الجنس
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={analyticsData.distributions.gender}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      isAnimationActive={false}
                      animationDuration={0}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analyticsData.distributions.gender.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Age Groups Distribution */}
            <Card className="bg-white dark:bg-card border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  الفئات العمرية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={analyticsData.distributions.ageGroups}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      isAnimationActive={false}
                      animationDuration={0}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analyticsData.distributions.ageGroups.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-white dark:bg-card border-slate-200 dark:border-slate-700">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground dark:text-slate-400">معدل الاحتفاظ بالمرضى</p>
                    <p className="text-3xl font-bold text-medical dark:text-slate-200">{analyticsData.kpis.patientRetention.toFixed(1)}%</p>
                  </div>
                  <Users className="w-8 h-8 text-medical dark:text-slate-200" />
                </div>
                <p className="text-xs text-muted-foreground dark:text-slate-400 mt-2">
                  المرضى النشطين من إجمالي المرضى القدامى
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-card border-slate-200 dark:border-slate-700">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground dark:text-slate-400">معدل استغلال المواعيد</p>
                    <p className="text-3xl font-bold text-primary dark:text-slate-200">{analyticsData.kpis.appointmentUtilization.toFixed(1)}%</p>
                  </div>
                  <Calendar className="w-8 h-8 text-primary dark:text-slate-200" />
                </div>
                <p className="text-xs text-muted-foreground dark:text-slate-400 mt-2">
                  المواعيد المكتملة من إجمالي المواعيد
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-card border-slate-200 dark:border-slate-700">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground dark:text-slate-400">متوسط الإيرادات لكل مريض</p>
                    <p className="text-3xl font-bold text-accent dark:text-slate-200">{formatAmount(analyticsData.kpis.averageRevenue)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-accent dark:text-slate-200" />
                </div>
                <p className="text-xs text-muted-foreground dark:text-slate-400 mt-2">
                  إجمالي الإيرادات ÷ عدد المرضى
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-card border-slate-200 dark:border-slate-700">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground dark:text-slate-400">معدل عدم الحضور</p>
                    <p className="text-3xl font-bold text-destructive dark:text-slate-200">{analyticsData.kpis.noShowRate.toFixed(1)}%</p>
                  </div>
                  <Activity className="w-8 h-8 text-destructive dark:text-slate-200" />
                </div>
                <p className="text-xs text-muted-foreground dark:text-slate-400 mt-2">
                  المواعيد التي لم يحضر إليها المرضى
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions moved to Today tab (QuickAccessDashboard) */}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default memo(DashboardAnalyticsComponent, (prevProps, nextProps) => {
  // Props are navigation callbacks only; treat them as stable to prevent needless re-renders
  return true
})
