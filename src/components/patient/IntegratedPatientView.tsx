import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Calendar,
  DollarSign,
  Activity,
  FileText,
  Clock,
  Phone,
  Mail,
  Edit,
  Plus,
  Eye,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Printer
} from 'lucide-react'
import { PatientIntegrationService } from '@/services/patientIntegrationService'
import { PdfService } from '@/services/pdfService'
import { useSettingsStore } from '@/store/settingsStore'
import { useToast } from '@/hooks/use-toast'
import type { PatientIntegratedData, Patient } from '@/types'

interface IntegratedPatientViewProps {
  patientId: string
  onNavigateToAppointments?: () => void
  onNavigateToPayments?: () => void
  onNavigateToTreatments?: () => void
  onNavigateToPrescriptions?: () => void
  onAddAppointment?: () => void
  onAddPayment?: () => void
  onAddTreatment?: () => void
  onEditPatient?: () => void
}

export default function IntegratedPatientView({
  patientId,
  onNavigateToAppointments,
  onNavigateToPayments,
  onNavigateToTreatments,
  onNavigateToPrescriptions,
  onAddAppointment,
  onAddPayment,
  onAddTreatment,
  onEditPatient
}: IntegratedPatientViewProps) {
  const [integratedData, setIntegratedData] = useState<PatientIntegratedData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const { settings } = useSettingsStore()
  const { toast } = useToast()

  useEffect(() => {
    loadPatientData()
  }, [patientId])

  const loadPatientData = async () => {
    setIsLoading(true)
    try {
      const data = await PatientIntegrationService.getPatientIntegratedData(patientId)
      setIntegratedData(data)
    } catch (error) {
      console.error('Error loading patient data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    // Check if the amount is a whole number (no decimal part)
    const isWholeNumber = amount % 1 === 0

    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: isWholeNumber ? 0 : 2,
      maximumFractionDigits: isWholeNumber ? 0 : 2,
    }).format(amount)
  }

  // دالة طباعة سجل المريض الشامل
  const handlePrintPatientRecord = async () => {
    if (!integratedData) return

    try {
      toast({
        title: "جاري إعداد التقرير...",
        description: "يتم تجميع بيانات المريض وإعداد التقرير للطباعة",
      })

      // تصدير سجل المريض كـ PDF
      await PdfService.exportIndividualPatientRecord(integratedData, settings)

      toast({
        title: "تم إنشاء التقرير بنجاح",
        description: `تم إنشاء سجل المريض ${integratedData.patient.full_name} وحفظه كملف PDF`,
      })
    } catch (error) {
      console.error('Error printing patient record:', error)
      toast({
        title: "خطأ في إنشاء التقرير",
        description: "فشل في إنشاء سجل المريض. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG')
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!integratedData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">خطأ في تحميل البيانات</h3>
            <p className="mb-4">لا يمكن تحميل بيانات المريض</p>
            <Button onClick={loadPatientData}>إعادة المحاولة</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { patient, stats } = integratedData

  return (
    <div className="space-y-6" dir="rtl">
      {/* Patient Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{patient.full_name}</h1>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>#{patient.serial_number}</span>
                  <span>{patient.age} سنة</span>
                  <span>{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  {patient.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">{patient.phone}</span>
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{patient.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handlePrintPatientRecord}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <Printer className="w-4 h-4 mr-2" />
                طباعة السجل
              </Button>
              <Button variant="outline" onClick={onEditPatient}>
                <Edit className="w-4 h-4 mr-2" />
                تعديل
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onNavigateToAppointments}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">المواعيد</p>
                <p className="text-2xl font-bold">{stats.totalAppointments}</p>
                {stats.nextAppointment && (
                  <p className="text-xs text-muted-foreground">
                    القادم: {formatDate(stats.nextAppointment)}
                  </p>
                )}
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onNavigateToTreatments}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">العلاجات</p>
                <p className="text-2xl font-bold">{stats.completedTreatments + stats.pendingTreatments}</p>
                <p className="text-xs text-muted-foreground">
                  مكتمل: {stats.completedTreatments} | آجل: {stats.pendingTreatments}
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <Activity className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onNavigateToPayments}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">الدفعات</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalPaid)}</p>
                {stats.remainingBalance > 0 && (
                  <p className="text-xs text-red-600">
                    متبقي: {formatCurrency(stats.remainingBalance)}
                  </p>
                )}
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">آخر زيارة</p>
                <p className="text-lg font-bold">
                  {stats.lastVisit ? formatDate(stats.lastVisit) : 'لا توجد'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.lastVisit ? 'زيارة مكتملة' : 'لم يزر بعد'}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            إجراءات سريعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={onAddAppointment} className="h-12 justify-start">
              <Calendar className="w-4 h-4 mr-2" />
              حجز موعد جديد
            </Button>
            <Button onClick={onAddPayment} variant="outline" className="h-12 justify-start">
              <DollarSign className="w-4 h-4 mr-2" />
              تسجيل دفعة
            </Button>
            <Button onClick={onAddTreatment} variant="outline" className="h-12 justify-start">
              <Activity className="w-4 h-4 mr-2" />
              إضافة علاج
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            المواعيد ({integratedData.appointments.length})
          </TabsTrigger>
          <TabsTrigger value="treatments" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            العلاجات ({integratedData.treatments.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            الدفعات ({integratedData.payments.length})
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            الجدول الزمني
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Appointments */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>المواعيد الأخيرة</CardTitle>
                  <Button variant="ghost" size="sm" onClick={onNavigateToAppointments}>
                    عرض الكل
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {integratedData.appointments.slice(0, 5).map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg mb-2">
                    <div>
                      <p className="font-medium text-sm">{appointment.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(appointment.start_time)}
                      </p>
                    </div>
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status === 'completed' ? 'مكتمل' :
                       appointment.status === 'scheduled' ? 'مجدول' :
                       appointment.status === 'cancelled' ? 'ملغي' : appointment.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>الدفعات الأخيرة</CardTitle>
                  <Button variant="ghost" size="sm" onClick={onNavigateToPayments}>
                    عرض الكل
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {integratedData.payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg mb-2">
                    <div>
                      <p className="font-medium text-sm">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.payment_date)}
                      </p>
                    </div>
                    <Badge className={getStatusColor(payment.status)}>
                      {payment.status === 'completed' ? 'مكتمل' :
                       payment.status === 'pending' ? 'آجل' :
                       payment.status === 'partial' ? 'جزئي' : payment.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle>جميع المواعيد</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {integratedData.appointments.map((appointment) => (
                  <div key={appointment.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{appointment.title}</h4>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status === 'completed' ? 'مكتمل' :
                         appointment.status === 'scheduled' ? 'مجدول' :
                         appointment.status === 'cancelled' ? 'ملغي' : appointment.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>📅 {formatDate(appointment.start_time)}</p>
                      {appointment.description && <p>📝 {appointment.description}</p>}
                      {appointment.cost && <p>💰 {formatCurrency(appointment.cost)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="treatments">
          <Card>
            <CardHeader>
              <CardTitle>جميع العلاجات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {integratedData.treatments.map((treatment) => (
                  <div key={treatment.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">
                        {treatment.treatment_type} - السن {treatment.tooth_number}
                      </h4>
                      <Badge className={getStatusColor(treatment.treatment_status)}>
                        {treatment.treatment_status === 'completed' ? 'مكتمل' :
                         treatment.treatment_status === 'planned' ? 'مخطط' :
                         treatment.treatment_status === 'in_progress' ? 'قيد التنفيذ' :
                         treatment.treatment_status === 'cancelled' ? 'ملغي' : treatment.treatment_status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>🦷 {treatment.tooth_name}</p>
                      {treatment.cost && <p>💰 {formatCurrency(treatment.cost)}</p>}
                      {treatment.notes && <p>📝 {treatment.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>جميع الدفعات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {integratedData.payments.map((payment) => (
                  <div key={payment.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{formatCurrency(payment.amount)}</h4>
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status === 'completed' ? 'مكتمل' :
                         payment.status === 'pending' ? 'آجل' :
                         payment.status === 'partial' ? 'جزئي' : payment.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>📅 {formatDate(payment.payment_date)}</p>
                      <p>💳 {payment.payment_method === 'cash' ? 'نقدي' : 'تحويل بنكي'}</p>
                      {payment.total_amount_due && (() => {
                        // حساب المبلغ المتبقي بشكل صحيح
                        const totalDue = payment.total_amount_due || 0
                        const totalPaid = payment.amount || 0
                        const remainingBalance = Math.max(0, totalDue - totalPaid)
                        return remainingBalance > 0 && (
                          <p className="text-red-600">متبقي: {formatCurrency(remainingBalance)}</p>
                        )
                      })()}
                      {payment.description && <p>📝 {payment.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>الجدول الزمني</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">الجدول الزمني</h3>
                <p className="mb-4">
                  سيتم عرض الجدول الزمني للمريض هنا
                </p>
                <Button variant="outline">
                  قريباً
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
