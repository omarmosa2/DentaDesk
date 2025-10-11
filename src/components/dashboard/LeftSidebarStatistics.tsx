import React, { memo, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp
} from 'lucide-react'
import { usePatientStore } from '@/store/patientStore'
import { usePaymentStore } from '@/store/paymentStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { useGlobalStore } from '@/store/globalStore'
import { useCurrency } from '@/contexts/CurrencyContext'

const LeftSidebarStatistics = memo(function LeftSidebarStatistics() {
  const { patients } = usePatientStore()
  const { payments, pendingAmount } = usePaymentStore()
  const { appointments } = useAppointmentStore()
  const { unreadAlertsCount } = useGlobalStore()
  const { formatAmount } = useCurrency()

  // Calculate urgent alerts (appointments today + pending payments)
  const { todayString, todayAppointments } = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const todayAppts = appointments.filter(apt =>
      apt.start_time.startsWith(todayStr) && apt.status === 'scheduled'
    ).length
    return { todayString: todayStr, todayAppointments: todayAppts }
  }, [appointments])

  const urgentAlerts = useMemo(() =>
    todayAppointments + (pendingAmount > 0 ? 1 : 0) + unreadAlertsCount,
    [todayAppointments, pendingAmount, unreadAlertsCount]
  )

  const stats = useMemo(() => [
    {
      title: 'إجمالي المرضى',
      value: patients.length,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-500/20 dark:to-blue-600/30',
      trend: '+2 هذا الأسبوع'
    },

    {
      title: 'التنبيهات العاجلة',
      value: urgentAlerts,
      icon: AlertTriangle,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-gradient-to-br from-rose-100 to-red-200 dark:from-rose-500/20 dark:to-red-600/30',
      trend: urgentAlerts > 0 ? 'يتطلب اهتمام' : 'كل شيء على ما يرام'
    }
  ], [patients.length, pendingAmount, urgentAlerts, formatAmount])

  return (
    <div className="h-full p-4 md:p-5 lg:p-6 bg-sidebar performance-optimized sidebar-performance loaded" role="region" aria-label="إحصائيات العيادة" style={{
      contain: 'layout style paint',
      willChange: 'auto',
      contentVisibility: 'visible'
    }}>
      <div className="space-y-5 md:space-y-6 lg:space-y-7">
        <div className="text-center space-y-2 touch-target-sm">
          <h2 className="text-fluid-xl font-bold text-sidebar-foreground mb-1 md:mb-2 font-tajawal">
            إحصائيات سريعة
          </h2>
          <p className="text-fluid-sm text-sidebar-foreground/70">
            نظرة عامة على العيادة
          </p>
        </div>

        <div className="space-y-3 md:space-y-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className="interactive-card relative overflow-hidden bg-card border-border shadow-md dark:shadow-lg rtl backdrop-blur-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-200 ease-out cursor-pointer" role="article" aria-label={`إحصائية ${stat.title}`} data-testid="stat-card" tabIndex={0}>
                <CardContent className="p-4 md:p-5 lg:p-6">
                  <div className="flex items-center justify-between mb-3 md:mb-4 rtl:flex-row-reverse">
                    <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-muted shadow-sm touch-target-sm" aria-hidden="true">
                      <Icon className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-muted-foreground" />
                    </div>
                    <Badge variant="secondary" className="text-fluid-xs px-2 py-1 rtl:flex-row-reverse shadow-sm touch-target-sm hover:scale-105 transition-transform duration-200 ease-out" aria-label={`اتجاه: ${stat.trend}`}>
                      <TrendingUp className="w-3 h-3 ml-1 rtl:mr-1 rtl:ml-0" aria-hidden="true" />
                      {stat.trend}
                    </Badge>
                  </div>

                  <div className="space-y-1 md:space-y-2">
                    <p className="text-fluid-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-fluid-2xl font-bold text-foreground" aria-live="polite">
                      {stat.value}
                    </p>
                  </div>

                  {/* Enhanced background effect for urgent alerts */}
                  {stat.title === 'التنبيهات العاجلة' && urgentAlerts > 0 && (
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-100/50 to-red-100/50 dark:from-rose-500/10 dark:to-red-500/10 rounded-lg pointer-events-none transition-opacity duration-300 ease-in-out" aria-hidden="true" data-testid="urgent-alerts" />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Enhanced additional quick stats */}
        <Card className="interactive-card bg-card-enhanced border-border shadow-md dark:shadow-lg backdrop-blur-sm hover:shadow-lg hover:scale-[1.01] transition-all duration-200 ease-out cursor-pointer touch-target" tabIndex={0} role="article" aria-label="مواعيد اليوم">
          <CardContent className="p-3 md:p-4">
            <div className="text-center space-y-1 md:space-y-2">
              <div className="text-fluid-sm text-foreground font-medium">
                مواعيد اليوم
              </div>
              <div className="text-fluid-xl font-bold text-medical dark:text-medical-foreground">
                {todayAppointments}
              </div>
              <div className="text-fluid-xs text-muted-foreground">
                مواعيد مجدولة
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
})

export default LeftSidebarStatistics