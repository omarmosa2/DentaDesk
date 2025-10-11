import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KeyboardShortcut, ShortcutTooltip } from '@/components/ui/KeyboardShortcut'
import {
  Users,
  Calendar,
  DollarSign,
  Activity,
  Plus,
  Eye,
  RefreshCw,
  TrendingUp,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { useGlobalStore } from '@/store/globalStore'
import { QuickAccessService } from '@/services/quickAccessService'
import { useCurrency } from '@/contexts/CurrencyContext'
import type { Patient, Appointment, Payment, ToothTreatment } from '@/types'

interface QuickAccessDashboardProps {
  onNavigateToPatients?: () => void
  onNavigateToAppointments?: () => void
  onNavigateToPayments?: () => void
  onNavigateToTreatments?: () => void
  onAddPatient?: () => void
  onAddAppointment?: () => void
  onAddPayment?: () => void
}

export default function QuickAccessDashboard({
  onNavigateToPatients,
  onNavigateToAppointments,
  onNavigateToPayments,
  onNavigateToTreatments,
  onAddPatient,
  onAddAppointment,
  onAddPayment
}: QuickAccessDashboardProps) {

  const {
    quickAccessData,
    isLoadingQuickAccess,
    loadQuickAccessData,
    refreshQuickAccessData
  } = useGlobalStore()

  useEffect(() => {
    loadQuickAccessData()
  }, [loadQuickAccessData])

  // Handle refresh - optimized with useCallback
  const handleRefresh = useCallback(async () => {
    await refreshQuickAccessData()
  }, [refreshQuickAccessData])

  // Memoized navigation handlers for performance
  const handleNavigateToPatients = useCallback(() => {
    console.log('👥 Navigate to Patients clicked!')
    onNavigateToPatients?.()
  }, [onNavigateToPatients])

  const handleNavigateToAppointments = useCallback(() => {
    console.log('📅 Navigate to Appointments clicked!')
    onNavigateToAppointments?.()
  }, [onNavigateToAppointments])

  const handleNavigateToPayments = useCallback(() => {
    console.log('💰 Navigate to Payments clicked!')
    onNavigateToPayments?.()
  }, [onNavigateToPayments])

  const handleNavigateToTreatments = useCallback(() => {
    onNavigateToTreatments?.()
  }, [onNavigateToTreatments])

  // Format currency - now using centralized currency management
  const { formatAmount } = useCurrency()

  // Memoized format functions for performance
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US')
  }, [])

  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  if (isLoadingQuickAccess) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse dark:bg-gray-800">
            <CardContent className="p-4 md:p-5 lg:p-6">
              <div className="h-16 md:h-20 lg:h-24 bg-muted dark:bg-gray-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!quickAccessData) {
    return (
      <Card className="bg-card border-border dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-4 md:p-5 lg:p-6">
          <div className="text-center py-8 md:py-12 text-muted-foreground dark:text-gray-300">
            <AlertTriangle className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-4 opacity-50" />
            <p className="text-sm md:text-base font-tajawal mb-4">فشل في تحميل بيانات الوصول السريع</p>
            <Button variant="outline" size="sm" className="mt-2 hover:bg-destructive/10 hover:text-destructive dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-all duration-200" onClick={handleRefresh} aria-label="إعادة تحميل البيانات">
              <RefreshCw className="w-4 h-4 mr-2" />
              إعادة المحاولة
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8 lg:space-y-10 animate-fade-in mt-4 mr-4 ml-4" dir="rtl">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {/* Total Patients */}
        <Card className="hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 cursor-pointer bg-card border-border" onClick={onNavigateToPatients} role="button" tabIndex={0} aria-label={`عرض مرضى جدد اليوم: ${quickAccessData.quickStats.totalPatients} مريض`}>
          <CardContent className="p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground font-tajawal">مرضى جدد اليوم</p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mt-1">{quickAccessData.quickStats.totalPatients}</p>
              </div>
              <div className="p-2 md:p-3 bg-muted rounded-lg ml-3 md:ml-4 shadow-sm">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today Appointments */}
        <Card className="hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 cursor-pointer bg-card border-border" onClick={onNavigateToAppointments} role="button" tabIndex={0} aria-label={`عرض مواعيد اليوم: ${quickAccessData.quickStats.todayAppointments} موعد`}>
          <CardContent className="p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground font-tajawal">مواعيد اليوم</p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mt-1">{quickAccessData.quickStats.todayAppointments}</p>
              </div>
              <div className="p-2 md:p-3 bg-muted rounded-lg ml-3 md:ml-4 shadow-sm">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card className="hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 cursor-pointer bg-card border-border" onClick={onNavigateToPayments} role="button" tabIndex={0} aria-label={`عرض دفعات اليوم: ${quickAccessData.quickStats.pendingPayments} دفعة`}>
          <CardContent className="p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground font-tajawal">دفعات اليوم</p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mt-1">{quickAccessData.quickStats.pendingPayments}</p>
              </div>
              <div className="p-2 md:p-3 bg-muted rounded-lg ml-3 md:ml-4 shadow-sm">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Urgent Alerts */}
        <Card className="hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 bg-card border-border" role="region" aria-label={`تنبيهات اليوم: ${quickAccessData.quickStats.urgentAlerts} تنبيه`}>
          <CardContent className="p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground font-tajawal">تنبيهات اليوم</p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mt-1">{quickAccessData.quickStats.urgentAlerts}</p>
                {quickAccessData.quickStats.urgentAlerts > 0 && (
                  <div className="absolute inset-0 bg-black-900 rounded-lg pointer-events-none" aria-hidden="true" />
                )}
              </div>
              <div className="p-2 md:p-3 bg-muted rounded-lg ml-3 md:ml-4 shadow-sm">
                <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - moved here from Analytics */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700 hover:shadow-lg dark:hover:shadow-xl transition-all duration-200">
        <CardHeader className="p-4 md:p-5 lg:p-6">
          <CardTitle className="flex items-center gap-2 font-tajawal text-lg md:text-xl lg:text-2xl text-slate-800 dark:text-white">
            <Plus className="w-5 h-5 md:w-6 md:h-6 text-slate-600 dark:text-slate-300" />
            إجراءات سريعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Button onClick={onNavigateToPatients} className="h-12 justify-start transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg" aria-label="الانتقال إلى إدارة المرضى">
              <Users className="w-4 h-4 mr-2" />
              إدارة المرضى
            </Button>
            <Button onClick={onNavigateToAppointments} variant="outline" className="h-12 justify-start transition-all duration-200 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-400 dark:hover:border-emerald-500" aria-label="الانتقال إلى إدارة المواعيد">
              <Calendar className="w-4 h-4 mr-2" />
              إدارة المواعيد
            </Button>
            <Button onClick={onNavigateToPayments} variant="outline" className="h-12 justify-start transition-all duration-200 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-400 dark:hover:border-amber-500" aria-label="الانتقال إلى إدارة المدفوعات">
              <DollarSign className="w-4 h-4 mr-2" />
              إدارة الواردات
            </Button>
            <Button onClick={onNavigateToTreatments} variant="outline" className="h-12 justify-start transition-all duration-200 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-400 dark:hover:border-purple-500" aria-label="الانتقال إلى إدارة العلاجات">
              <Activity className="w-4 h-4 mr-2" />
              إدارة العلاجات
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {/* <Card >
        <CardHeader className='dark:bg-slate-900'> 
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            إجراءات سريعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ShortcutTooltip shortcut="A" description="إضافة مريض جديد">
              <Button
                onClick={() => {
                  console.log('🏥 Add Patient button clicked!')
                  onAddPatient?.()
                }}
                className="h-12 justify-between hover:shadow-lg transition-all duration-200 active:scale-95"
              >
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  إضافة مريض جديد
                </div>
                <KeyboardShortcut shortcut="A" size="sm" />
              </Button>
            </ShortcutTooltip>

            <ShortcutTooltip shortcut="S" description="حجز موعد جديد">
              <Button
                onClick={() => {
                  console.log('📅 Add Appointment button clicked!')
                  onAddAppointment?.()
                }}
                variant="outline"
                className="h-12 justify-between hover:shadow-lg transition-all duration-200 active:scale-95"
              >
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  حجز موعد جديد
                </div>
                <KeyboardShortcut shortcut="S" size="sm" />
              </Button>
            </ShortcutTooltip>

            <ShortcutTooltip shortcut="D" description="تسجيل دفعة جديدة">
              <Button
                onClick={() => {
                  console.log('💰 Add Payment button clicked!')
                  onAddPayment?.()
                }}
                variant="outline"
                className="h-12 justify-between hover:shadow-lg transition-all duration-200 active:scale-95"
              >
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  تسجيل دفعة جديدة
                </div>
                <KeyboardShortcut shortcut="D" size="sm" />
              </Button>
            </ShortcutTooltip>
          </div>
        </CardContent>
      </Card> */}

      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Recent Patients */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700 hover:shadow-lg dark:hover:shadow-xl transition-all duration-200">
          <CardHeader className="p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-tajawal text-lg md:text-xl lg:text-2xl text-slate-800 dark:text-white">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-slate-600 dark:text-slate-300" />
                المرضى الأخيرون
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNavigateToPatients}
                className="hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 text-sm md:text-base text-slate-600 dark:text-slate-300"
                aria-label="عرض جميع المرضى"
              >
                <Eye className="w-4 h-4 mr-1 md:mr-2" />
                عرض الكل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {quickAccessData.recentPatients.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <Users className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-4 opacity-50" />
                <p className="text-sm md:text-base font-tajawal">لا توجد مرضى حديثون</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quickAccessData.recentPatients.map((patient: Patient) => (
                  <div key={patient.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm md:text-base font-tajawal">{patient.full_name}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          #{patient.serial_number} | {patient.age} سنة
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs px-2 py-1 border-primary/20 text-primary">
                        {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 md:h-7 md:w-7 p-0 hover:bg-primary/10" aria-label={`عرض تفاصيل المريض ${patient.full_name}`}>
                        <Eye className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-800/30 border-emerald-200 dark:border-emerald-700 hover:shadow-lg dark:hover:shadow-xl transition-all duration-200">
          <CardHeader className="p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-tajawal text-lg md:text-xl lg:text-2xl text-emerald-800 dark:text-white">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 dark:text-emerald-400" />
                مواعيد اليوم
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNavigateToAppointments}
                className="hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 text-sm md:text-base text-emerald-700 dark:text-emerald-300"
                aria-label="عرض جميع مواعيد اليوم"
              >
                <Eye className="w-4 h-4 mr-1 md:mr-2" />
                عرض الكل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {quickAccessData.todayAppointments.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <Calendar className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-4 opacity-50" />
                <p className="text-sm md:text-base font-tajawal">لا توجد مواعيد اليوم</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quickAccessData.todayAppointments.slice(0, 5).map((appointment: Appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-medical/10 dark:bg-medical/20 rounded-full flex items-center justify-center">
                        <Calendar className="w-4 h-4 md:w-5 md:h-5 text-medical" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm md:text-base font-tajawal">{appointment.title}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {appointment.patient?.full_name || 'مريض غير محدد'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs px-2 py-1 border-medical/20 text-medical">
                        {formatTime(appointment.start_time)}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 md:h-7 md:w-7 p-0 hover:bg-medical/10" aria-label={`عرض تفاصيل الموعد ${appointment.title}`}>
                        <Eye className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
