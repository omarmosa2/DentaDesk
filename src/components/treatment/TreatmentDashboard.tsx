import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity,
  Calendar,
  Clock,
  FileText,
  TestTube,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  User,
  Plus
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useCurrency } from '@/contexts/CurrencyContext'
import { PatientIntegrationService } from '@/services/patientIntegrationService'
import { TreatmentWorkflowService } from '@/services/treatmentWorkflowService'
import type { PatientIntegratedData } from '@/types'

interface TreatmentDashboardProps {
  patientId: string
  onNavigateToAppointments?: () => void
  onNavigateToTreatments?: () => void
  onNavigateToPrescriptions?: () => void
  onNavigateToLabOrders?: () => void
}

export default function TreatmentDashboard({
  patientId,
  onNavigateToAppointments,
  onNavigateToTreatments,
  onNavigateToPrescriptions,
  onNavigateToLabOrders
}: TreatmentDashboardProps) {
  const [integratedData, setIntegratedData] = useState<PatientIntegratedData | null>(null)
  const [treatmentProgress, setTreatmentProgress] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { formatAmount } = useCurrency()

  useEffect(() => {
    loadPatientData()
  }, [patientId])

  const loadPatientData = async () => {
    setIsLoading(true)
    try {
      const [data, progress] = await Promise.all([
        PatientIntegrationService.getPatientIntegratedData(patientId),
        TreatmentWorkflowService.getTreatmentProgress(patientId)
      ])

      setIntegratedData(data)
      setTreatmentProgress(progress)
    } catch (error) {
      console.error('خطأ في تحميل بيانات المريض:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!integratedData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">خطأ في تحميل البيانات</h3>
            <p className="text-muted-foreground mb-4">لا يمكن تحميل بيانات المريض</p>
            <Button onClick={loadPatientData}>إعادة المحاولة</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { patient, stats } = integratedData

  return (
    <div className="space-y-6" dir="rtl">
      {/* معلومات المريض الأساسية */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {patient.full_name}
              </CardTitle>
              <CardDescription>
                #: #{patient.serial_number} | العمر: {patient.age} سنة
              </CardDescription>
            </div>
            <Badge variant="outline">
              {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي المواعيد</p>
                <p className="text-2xl font-bold">{stats.totalAppointments}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">العلاجات المكتملة</p>
                <p className="text-2xl font-bold">{stats.completedTreatments}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي المدفوع</p>
                <p className="text-2xl font-bold">{formatAmount(stats.totalPaid)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">المتبقي</p>
                <p className="text-2xl font-bold">{formatAmount(stats.remainingBalance)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* تقدم العلاج */}
      {treatmentProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              تقدم العلاج
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">نسبة إكمال العلاجات</span>
                  <span className="text-sm text-muted-foreground">
                    {treatmentProgress.treatments.completed} من {treatmentProgress.treatments.total}
                  </span>
                </div>
                <Progress value={treatmentProgress.treatments.completionPercentage} className="h-2" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{treatmentProgress.treatments.completed}</p>
                  <p className="text-sm text-muted-foreground">مكتمل</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{treatmentProgress.treatments.inProgress}</p>
                  <p className="text-sm text-muted-foreground">قيد التنفيذ</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{treatmentProgress.treatments.planned}</p>
                  <p className="text-sm text-muted-foreground">مخطط</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{treatmentProgress.upcomingAppointments}</p>
                  <p className="text-sm text-muted-foreground">مواعيد قادمة</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* الإجراءات السريعة */}
      <Card>
        <CardHeader>
          <CardTitle>الإجراءات السريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center gap-2"
              onClick={onNavigateToAppointments}
            >
              <Calendar className="w-6 h-6" />
              <span className="text-sm">إضافة موعد</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center gap-2"
              onClick={onNavigateToTreatments}
            >
              <Activity className="w-6 h-6" />
              <span className="text-sm">إضافة علاج</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center gap-2"
              onClick={onNavigateToPrescriptions}
            >
              <FileText className="w-6 h-6" />
              <span className="text-sm">إضافة وصفة</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center gap-2"
              onClick={onNavigateToLabOrders}
            >
              <TestTube className="w-6 h-6" />
              <span className="text-sm">طلب مختبر</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* آخر الأنشطة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            آخر الأنشطة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.lastVisit && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">آخر زيارة</span>
                </div>
                <span className="text-sm text-muted-foreground">{formatDate(stats.lastVisit)}</span>
              </div>
            )}

            {stats.nextAppointment && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-green-500" />
                  <span className="text-sm">الموعد القادم</span>
                </div>
                <span className="text-sm text-muted-foreground">{formatDate(stats.nextAppointment)}</span>
              </div>
            )}

            {treatmentProgress?.activePrescriptions > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-purple-500" />
                  <span className="text-sm">وصفات نشطة</span>
                </div>
                <Badge variant="secondary">{treatmentProgress.activePrescriptions}</Badge>
              </div>
            )}

            {treatmentProgress?.pendingLabOrders > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
                <div className="flex items-center gap-3">
                  <TestTube className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">طلبات مختبر آجلة</span>
                </div>
                <Badge variant="secondary">{treatmentProgress.pendingLabOrders}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
