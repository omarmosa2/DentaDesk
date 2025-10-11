import React, { useState, useEffect, memo, lazy, Suspense } from 'react'
import { Patient, Appointment, Payment, ToothTreatment, Prescription, LabOrder } from '@/types'
import { calculatePatientPaymentSummary } from '@/utils/paymentCalculations'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Heart,
  AlertTriangle,
  Edit,
  X,
  Plus,
  Activity,
  Printer
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useAppointmentStore } from '@/store/appointmentStore'
import { usePaymentStore } from '@/store/paymentStore'
import { useDentalTreatmentStore } from '@/store/dentalTreatmentStore'
import { useToast } from '@/hooks/use-toast'
const AddAppointmentDialog = lazy(() => import('@/components/AddAppointmentDialog'))
const AddPaymentDialog = lazy(() => import('@/components/payments/AddPaymentDialog'))
const AddPrescriptionDialog = lazy(() => import('@/components/medications/AddPrescriptionDialog'))
const ComprehensivePendingInvoiceDialog = lazy(() => import('@/components/payments/ComprehensivePendingInvoiceDialog'))
import { TREATMENT_STATUS_OPTIONS, getTreatmentNameInArabic } from '@/data/teethData'
import { useTreatmentNames } from '@/hooks/useTreatmentNames'
import { PatientIntegrationService } from '@/services/patientIntegrationService'
import { PdfService } from '@/services/pdfService'
import { useSettingsStore } from '@/store/settingsStore'

interface PatientDetailsModalProps {
  patient: Patient | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (patient: Patient) => void
  onNavigateToTreatments?: (tab: string) => void
  onNavigateToPayments?: (tab: string) => void
}

function PatientDetailsModalComponent({
  patient,
  open,
  onOpenChange,
  onEdit,
  onNavigateToTreatments,
  onNavigateToPayments
}: PatientDetailsModalProps) {
  const [activeTab, setActiveTab] = useState('info')
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([])
  const [patientPayments, setPatientPayments] = useState<Payment[]>([])
  const [patientTreatments, setPatientTreatments] = useState<ToothTreatment[]>([])
  const [patientPrescriptions, setPatientPrescriptions] = useState<Prescription[]>([])
  const [patientLabOrders, setPatientLabOrders] = useState<LabOrder[]>([])
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false)
  const [isLoadingPayments, setIsLoadingPayments] = useState(false)
  const [isLoadingTreatments, setIsLoadingTreatments] = useState(false)
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(false)

  // Dialog states
  const [showAddAppointmentDialog, setShowAddAppointmentDialog] = useState(false)
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false)
  const [showAddPrescriptionDialog, setShowAddPrescriptionDialog] = useState(false)
  const [showPendingInvoiceDialog, setShowPendingInvoiceDialog] = useState(false)

  const { appointments } = useAppointmentStore()
  const { payments } = usePaymentStore()
  const { toothTreatments, loadToothTreatmentsByPatient } = useDentalTreatmentStore()
  const { toast } = useToast()
  const { settings } = useSettingsStore()

  // Load custom treatment names for proper display
  const { refreshTreatmentNames } = useTreatmentNames()

  // دالة طباعة سجل المريض الشامل
  const handlePrintPatientRecord = async () => {
    if (!patient) return

    try {
      toast({
        title: "جاري إعداد التقرير...",
        description: "يتم تجميع بيانات المريض وإعداد التقرير للطباعة",
      })

      // جلب البيانات المتكاملة للمريض
      const integratedData = await PatientIntegrationService.getPatientIntegratedData(patient.id)

      if (!integratedData) {
        throw new Error('لا يمكن جلب بيانات المريض')
      }

      // تصدير سجل المريض كـ PDF
      await PdfService.exportIndividualPatientRecord(integratedData, settings)

      toast({
        title: "تم إنشاء التقرير بنجاح",
        description: `تم إنشاء سجل المريض ${patient.full_name} وحفظه كملف PDF`,
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

  const handlePrintPatientPayments = async () => {
    if (!patient) return

    try {
      toast({
        title: "جاري إعداد تقرير المدفوعات...",
        description: "يتم تجميع بيانات مدفوعات المريض وإعداد التقرير للطباعة",
      })

      // جلب البيانات المتكاملة للمريض
      const integratedData = await PatientIntegrationService.getPatientIntegratedData(patient.id)

      if (!integratedData) {
        throw new Error('لا يمكن جلب بيانات المريض')
      }

      // تصدير مدفوعات المريض كـ PDF
      await PdfService.exportPatientPayments(integratedData, settings)

      toast({
        title: "تم إنشاء تقرير المدفوعات بنجاح",
        description: `تم إنشاء تقرير مدفوعات المريض ${patient.full_name} وحفظه كملف PDF`,
      })
    } catch (error) {
      console.error('Error printing patient payments:', error)
      toast({
        title: "خطأ في إنشاء تقرير المدفوعات",
        description: "فشل في إنشاء تقرير مدفوعات المريض. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    }
  }

  const handlePrintPatientTreatments = async () => {
    if (!patient) return

    try {
      toast({
        title: "جاري إعداد تقرير العلاجات...",
        description: "يتم تجميع بيانات علاجات المريض وإعداد التقرير للطباعة",
      })

      // جلب البيانات المتكاملة للمريض
      const integratedData = await PatientIntegrationService.getPatientIntegratedData(patient.id)

      if (!integratedData) {
        throw new Error('لا يمكن جلب بيانات المريض')
      }

      // تصدير علاجات المريض كـ PDF
      await PdfService.exportPatientTreatments(integratedData, settings)

      toast({
        title: "تم إنشاء تقرير العلاجات بنجاح",
        description: `تم إنشاء تقرير علاجات المريض ${patient.full_name} وحفظه كملف PDF`,
      })
    } catch (error) {
      console.error('Error printing patient treatments:', error)
      toast({
        title: "خطأ في إنشاء تقرير العلاجات",
        description: "فشل في إنشاء تقرير علاجات المريض. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    }
  }

  const handlePrintPatientAppointments = async () => {
    if (!patient) return

    try {
      toast({
        title: "جاري إعداد تقرير المواعيد...",
        description: "يتم تجميع بيانات مواعيد المريض وإعداد التقرير للطباعة",
      })

      // جلب البيانات المتكاملة للمريض
      const integratedData = await PatientIntegrationService.getPatientIntegratedData(patient.id)

      if (!integratedData) {
        throw new Error('لا يمكن جلب بيانات المريض')
      }

      // تصدير مواعيد المريض كـ PDF
      await PdfService.exportPatientAppointments(integratedData, settings)

      toast({
        title: "تم إنشاء تقرير المواعيد بنجاح",
        description: `تم إنشاء تقرير مواعيد المريض ${patient.full_name} وحفظه كملف PDF`,
      })
    } catch (error) {
      console.error('Error printing patient appointments:', error)
      toast({
        title: "خطأ في إنشاء تقرير المواعيد",
        description: "فشل في إنشاء تقرير مواعيد المريض. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    }
  }

  const handlePrintPatientPrescriptions = async () => {
    if (!patient) return

    try {
      toast({
        title: "جاري إعداد تقرير الوصفات...",
        description: "يتم تجميع بيانات وصفات المريض وإعداد التقرير للطباعة",
      })

      // جلب البيانات المتكاملة للمريض
      const integratedData = await PatientIntegrationService.getPatientIntegratedData(patient.id)

      if (!integratedData) {
        throw new Error('لا يمكن جلب بيانات المريض')
      }

      // تصدير وصفات المريض كـ PDF
      await PdfService.exportPatientPrescriptions(integratedData, settings)

      toast({
        title: "تم إنشاء تقرير الوصفات بنجاح",
        description: `تم إنشاء تقرير وصفات المريض ${patient.full_name} وحفظه كملف PDF`,
      })
    } catch (error) {
      console.error('Error printing patient prescriptions:', error)
      toast({
        title: "خطأ في إنشاء تقرير الوصفات",
        description: "فشل في إنشاء تقرير وصفات المريض. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (patient && open) {
      // Filter appointments for this patient
      setIsLoadingAppointments(true)
      const filteredAppointments = appointments.filter(apt => apt.patient_id === patient.id)
      setPatientAppointments(filteredAppointments)
      setIsLoadingAppointments(false)

      // Filter payments for this patient
      setIsLoadingPayments(true)
      const filteredPayments = payments.filter(payment => payment.patient_id === patient.id)
      setPatientPayments(filteredPayments)
      setIsLoadingPayments(false)

      // Load treatments for this patient
      setIsLoadingTreatments(true)
      loadToothTreatmentsByPatient(patient.id).then(() => {
        // Get fresh treatments from the store after loading
        const { toothTreatments: freshTreatments } = useDentalTreatmentStore.getState()
        const filteredTreatments = freshTreatments.filter(treatment => treatment.patient_id === patient.id)
        setPatientTreatments(filteredTreatments)
        setIsLoadingTreatments(false)
        // تحديث أسماء العلاجات المخصصة
        refreshTreatmentNames()
      }).catch(() => {
        setIsLoadingTreatments(false)
      })

      // Load prescriptions for this patient
      setIsLoadingPrescriptions(true)
      window.electronAPI?.prescriptions?.getByPatient?.(patient.id).then((prescriptions) => {
        setPatientPrescriptions(prescriptions || [])
        setIsLoadingPrescriptions(false)
      }).catch((error) => {
        if (process.env.NODE_ENV !== 'production') console.error('Error loading prescriptions:', error)
        setIsLoadingPrescriptions(false)
      })

      // Load lab orders for this patient
      window.electronAPI?.labOrders?.getByPatient?.(patient.id).then((labOrders) => {
        setPatientLabOrders(labOrders || [])
      }).catch(() => {
        if (process.env.NODE_ENV !== 'production') console.error('خطأ في تحميل طلبات المختبر')
      })
    }
  }, [patient, open, appointments, payments, loadToothTreatmentsByPatient])

  if (!patient) return null

  const getStatusBadge = (status: string) => {
    const statusMap = {
      scheduled: { label: 'مجدول', variant: 'default' as const },
      completed: { label: 'مكتمل', variant: 'default' as const },
      cancelled: { label: 'ملغي', variant: 'destructive' as const },
      no_show: { label: 'لم يحضر', variant: 'secondary' as const },
    }
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const }
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusMap = {
      completed: { label: 'مكتمل', variant: 'default' as const },
      partial: { label: 'جزئي', variant: 'outline' as const },
      pending: { label: 'آجل', variant: 'secondary' as const }
    }
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const }
  }

  const getTreatmentStatusBadge = (status: string) => {
    const statusOption = TREATMENT_STATUS_OPTIONS.find(option => option.value === status)
    if (statusOption) {
      const variantMap = {
        planned: 'outline' as const,
        in_progress: 'secondary' as const,
        completed: 'default' as const,
        cancelled: 'destructive' as const
      }
      return {
        label: statusOption.label,
        variant: variantMap[status as keyof typeof variantMap] || 'outline' as const
      }
    }
    return { label: status, variant: 'outline' as const }
  }

  // Event handlers for dialogs
  const handleAddAppointment = () => {
    setShowAddAppointmentDialog(true)
  }

  const handleAddPayment = () => {
    // Navigate to payments page and open add payment dialog
    if (patient && onNavigateToPayments) {
      // Close the current dialog first
      onOpenChange(false)
      // Navigate to payments page
      onNavigateToPayments('payments')
      // Store patient info in localStorage for the payments page to pick up
      localStorage.setItem('selectedPatientForPayment', JSON.stringify({
        selectedPatientId: patient.id,
        patientName: patient.full_name,
        openAddDialog: true
      }))
    } else {
      // Fallback to opening dialog within current modal
      setShowAddPaymentDialog(true)
    }
  }

  const handleAddTreatment = () => {
    // Navigate to dental treatments page
    if (patient && onNavigateToTreatments) {
      // Close the current dialog first
      onOpenChange(false)
      // Navigate to dental treatments page
      onNavigateToTreatments('dental-treatments')
      // Store patient info in localStorage for the treatments page to pick up
      localStorage.setItem('selectedPatientForTreatment', JSON.stringify({
        selectedPatientId: patient.id,
        patientName: patient.full_name,
        showAddTreatmentGuidance: true
      }))
    }
  }

  const handleAddPrescription = () => {
    setShowAddPrescriptionDialog(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" dir="rtl">
        <DialogHeader className="text-right">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <DialogTitle className="text-xl arabic-enhanced text-right">
                تفاصيل المريض - {patient.full_name}
              </DialogTitle>
              <DialogDescription className="arabic-enhanced text-right">
                معلومات شاملة عن المريض وسجلاته الطبية
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintPatientRecord}
                className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <Printer className="w-4 h-4" />
                طباعة السجل
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPendingInvoiceDialog(true)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <FileText className="w-4 h-4" />
                فاتورة الآجلات
              </Button>
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(patient)}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  تعديل
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden" dir="rtl">
          <TabsList className="grid w-full grid-cols-4 rtl-tabs" dir="rtl">
            <TabsTrigger value="info" className="arabic-enhanced flex items-center justify-center gap-2 flex-row-reverse">
              <User className="w-4 h-4" />
              معلومات المريض
            </TabsTrigger>
            <TabsTrigger value="treatments" className="arabic-enhanced flex items-center justify-center gap-2 flex-row-reverse">
              <Activity className="w-4 h-4" />
              العلاجات ({patientTreatments.length})
            </TabsTrigger>
            <TabsTrigger value="appointments" className="arabic-enhanced flex items-center justify-center gap-2 flex-row-reverse">
              <Calendar className="w-4 h-4" />
              المواعيد ({patientAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="arabic-enhanced flex items-center justify-center gap-2 flex-row-reverse">
              <DollarSign className="w-4 h-4" />
              المدفوعات ({patientPayments.length})
            </TabsTrigger>
            {/* <TabsTrigger value="prescriptions" className="arabic-enhanced flex items-center justify-center gap-2 flex-row-reverse">
              <FileText className="w-4 h-4" />
              الوصفات ({patientPrescriptions.length})
            </TabsTrigger> */}
          </TabsList>

          <div className="mt-4 overflow-y-auto max-h-[calc(90vh-200px)] dialog-rtl" dir="rtl">
            <TabsContent value="info" className="space-y-4 dialog-rtl" dir="rtl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
                {/* Basic Information */}
                <Card className="card-rtl">
                  <CardHeader className="card-header">
                    <CardTitle className="flex items-center gap-2 text-right">
                      <User className="w-5 h-5" />
                      المعلومات الأساسية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 card-content" dir="rtl">
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">#{patient.serial_number}</Badge>
                      <span className="text-muted-foreground">#:</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{patient.full_name}</span>
                      <span className="text-muted-foreground">الاسم الكامل:</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge variant={patient.gender === 'male' ? 'default' : 'secondary'}>
                        {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </Badge>
                      <span className="text-muted-foreground">الجنس:</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>{patient.age} سنة</span>
                      <span className="text-muted-foreground">العمر:</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{formatDate(patient.date_added || patient.created_at)}</span>
                      <span className="text-muted-foreground">تاريخ الإضافة:</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card className="card-rtl">
                  <CardHeader className="card-header">
                    <CardTitle className="flex items-center gap-2 text-right">
                      <Phone className="w-5 h-5" />
                      معلومات الاتصال
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 card-content" dir="rtl">
                    <div className="flex items-center justify-between">
                      {patient.phone ? (
                        <div className="flex items-center gap-2">
                          <span>{patient.phone}</span>
                          <Phone className="w-4 h-4 text-muted-foreground" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">غير محدد</span>
                      )}
                      <span className="text-muted-foreground">رقم الهاتف:</span>
                    </div>
                    <div className="flex items-center justify-between">
                      {patient.email ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{patient.email}</span>
                          <Mail className="w-4 h-4 text-muted-foreground" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">غير محدد</span>
                      )}
                      <span className="text-muted-foreground">البريد الإلكتروني:</span>
                    </div>
                    <div className="flex items-start justify-between">
                      {patient.address ? (
                        <div className="flex items-start gap-2 max-w-[200px]">
                          <span className="text-sm text-right">{patient.address}</span>
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">غير محدد</span>
                      )}
                      <span className="text-muted-foreground">العنوان:</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Medical Information */}
                <Card className="md:col-span-2 card-rtl">
                  <CardHeader className="card-header">
                    <CardTitle className="flex items-center gap-2 text-right">
                      <Heart className="w-5 h-5" />
                      المعلومات الطبية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 card-content" dir="rtl">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-right">
                        <FileText className="w-4 h-4" />
                        حالة المريض
                      </h4>
                      <p className="text-sm bg-muted p-3 rounded-md text-right">{patient.patient_condition}</p>
                    </div>

                    {patient.allergies && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-orange-600 dark:text-orange-400 text-right">
                          <AlertTriangle className="w-4 h-4" />
                          الحساسية
                        </h4>
                        <div className="text-sm bg-orange-50 dark:bg-yellow-900 border border-orange-200 dark:border-yellow-600 p-3 rounded-md text-orange-900 dark:text-yellow-100 text-right">
                          {patient.allergies}
                        </div>
                      </div>
                    )}

                    {patient.medical_conditions && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-right">
                          <Heart className="w-4 h-4" />
                          الحالات الطبية
                        </h4>
                        <p className="text-sm bg-muted p-3 rounded-md text-right">{patient.medical_conditions}</p>
                      </div>
                    )}

                    {patient.notes && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-right">
                          <FileText className="w-4 h-4" />
                          ملاحظات إضافية
                        </h4>
                        <p className="text-sm bg-muted p-3 rounded-md text-right">{patient.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="treatments" className="space-y-4 dialog-rtl" dir="rtl">
              <div className="flex justify-between items-center mb-4" dir="rtl">
                <h3 className="text-lg font-medium">العلاجات السنية</h3>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePrintPatientTreatments}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة العلاجات
                  </Button>
                  <Button
                    onClick={handleAddTreatment}
                    className="flex items-center gap-2"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة علاج
                  </Button>
                </div>
              </div>

              {isLoadingTreatments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="loading-spinner"></div>
                </div>
              ) : patientTreatments.length === 0 ? (
                <Card className="card-rtl">
                  <CardContent className="pt-6 card-content" dir="rtl">
                    <div className="text-center py-8" dir="rtl">
                      <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2">لا توجد علاجات</h3>
                      <p className="text-muted-foreground mb-4">لم يتم تسجيل أي علاجات سنية لهذا المريض بعد</p>
                      <Button
                        onClick={handleAddTreatment}
                        className="flex items-center gap-2"
                        size="sm"
                      >
                        <Plus className="w-4 h-4" />
                        إضافة أول علاج
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="card-rtl">
                  <CardHeader className="card-header">
                    <CardTitle className="flex items-center gap-2 text-foreground text-right">
                      <Activity className="w-5 h-5" />
                      جدول العلاجات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="card-content" dir="rtl">
                    <div className="overflow-hidden rounded-lg border border-border" dir="rtl">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              #
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              رقم السن
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              اسم السن
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              العلاج الحالي
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              التكلفة
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              الحالة
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-background divide-y divide-border">
                          {patientTreatments.map((treatment, index) => {
                            const status = getTreatmentStatusBadge(treatment.treatment_status)
                            return (
                              <tr key={treatment.id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-foreground">
                                  {index + 1}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-foreground">
                                  {treatment.tooth_number}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-foreground">
                                  {treatment.tooth_name}
                                </td>
                                <td className="px-4 py-3 text-sm text-foreground">
                                  {getTreatmentNameInArabic(treatment.treatment_type) || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium">
                                  {treatment.cost ? (
                                    <span className="text-blue-600 dark:text-blue-400">
                                      {formatCurrency(treatment.cost)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <Badge variant={status.variant}>{status.label}</Badge>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* تفاصيل إضافية للعلاجات */}
                    {patientTreatments.some(t => t.notes) && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium text-foreground">تفاصيل إضافية:</h4>
                        {patientTreatments.map((treatment) => (
                          treatment.notes && (
                            <div key={`details-${treatment.id}`} className="p-3 bg-muted/30 rounded border border-border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-foreground">
                                  السن رقم {treatment.tooth_number} - {treatment.tooth_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(treatment.created_at)}
                                </span>
                              </div>
                              {treatment.notes && (
                                <div>
                                  <span className="text-xs text-muted-foreground">ملاحظات: </span>
                                  <span className="text-xs text-foreground">{treatment.notes}</span>
                                </div>
                              )}
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="appointments" className="space-y-4 dialog-rtl" dir="rtl">
              <div className="flex justify-between items-center mb-4" dir="rtl">
                <h3 className="text-lg font-medium">المواعيد</h3>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePrintPatientAppointments}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة المواعيد
                  </Button>
                  <Button
                    onClick={handleAddAppointment}
                    className="flex items-center gap-2"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة موعد
                  </Button>
                </div>
              </div>
              {isLoadingAppointments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="loading-spinner"></div>
                </div>
              ) : patientAppointments.length === 0 ? (
                <Card className="card-rtl">
                  <CardContent className="pt-6 card-content" dir="rtl">
                    <div className="text-center py-8" dir="rtl">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2">لا توجد مواعيد</h3>
                      <p className="text-muted-foreground">لم يتم تحديد أي مواعيد لهذا المريض بعد</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="card-rtl">
                  <CardHeader className="card-header">
                    <CardTitle className="flex items-center gap-2 text-foreground text-right">
                      <Calendar className="w-5 h-5" />
                      جدول المواعيد
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="card-content" dir="rtl">
                    <div className="overflow-hidden rounded-lg border border-border" dir="rtl">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              #
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              العنوان
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              التاريخ
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              الوقت
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              التكلفة
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              الحالة
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-background divide-y divide-border">
                          {patientAppointments.map((appointment, index) => {
                            const status = getStatusBadge(appointment.status)
                            return (
                              <tr key={appointment.id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-foreground">
                                  {index + 1}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-foreground">
                                  {appointment.title}
                                </td>
                                <td className="px-4 py-3 text-sm text-foreground">
                                  {formatDate(appointment.start_time)}
                                </td>
                                <td className="px-4 py-3 text-sm text-muted-foreground">
                                  {new Date(appointment.start_time).toLocaleTimeString('ar-SA', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium">
                                  {appointment.cost ? (
                                    <span className="text-blue-600 dark:text-blue-400">
                                      {formatCurrency(appointment.cost)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <Badge variant={status.variant}>{status.label}</Badge>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* تفاصيل إضافية للمواعيد */}
                    {patientAppointments.some(a => a.description) && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium text-foreground">تفاصيل إضافية:</h4>
                        {patientAppointments.map((appointment) => (
                          appointment.description && (
                            <div key={`desc-${appointment.id}`} className="p-3 bg-muted/30 rounded border border-border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-foreground">
                                  {appointment.title}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(appointment.start_time)} - {new Date(appointment.start_time).toLocaleTimeString('ar-SA', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">الوصف: </span>
                                <span className="text-xs text-foreground">{appointment.description}</span>
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="payments" className="space-y-4 dialog-rtl" dir="rtl">
              <div className="flex justify-between items-center mb-4" dir="rtl">
                <h3 className="text-lg font-medium">المدفوعات</h3>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePrintPatientPayments}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة المدفوعات
                  </Button>
                  <Button
                    onClick={handleAddPayment}
                    className="flex items-center gap-2"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة دفعة
                  </Button>
                </div>
              </div>
              {isLoadingPayments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="loading-spinner"></div>
                </div>
              ) : patientPayments.length === 0 ? (
                <Card className="card-rtl">
                  <CardContent className="pt-6 card-content" dir="rtl">
                    <div className="text-center py-8" dir="rtl">
                      <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2">لا توجد مدفوعات</h3>
                      <p className="text-muted-foreground">لم يتم تسجيل أي مدفوعات لهذا المريض بعد</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4" dir="rtl">
                  {/* Payment Summary */}
                  {(() => {
                    // حساب الملخص المالي باستخدام الدالة الجديدة مع دعم العلاجات
                    const summary = calculatePatientPaymentSummary(patient.id, payments, appointments)

                    // حساب إضافي للمدفوعات المرتبطة بالعلاجات
                    const treatmentPayments = patientPayments.filter(p => p.tooth_treatment_id)
                    const appointmentPayments = patientPayments.filter(p => p.appointment_id && !p.tooth_treatment_id)
                    const generalPayments = patientPayments.filter(p => !p.appointment_id && !p.tooth_treatment_id)

                    // حساب المبالغ للعلاجات
                    const treatmentTotalDue = treatmentPayments.reduce((sum, p) => sum + (p.treatment_total_cost || 0), 0)
                    const treatmentTotalPaid = treatmentPayments.reduce((sum, p) => sum + p.amount, 0)
                    const treatmentRemaining = treatmentPayments.reduce((sum, p) => sum + (p.treatment_remaining_balance || 0), 0)

                    // حساب المبالغ للمواعيد
                    const appointmentTotalDue = appointmentPayments.reduce((sum, p) => sum + (p.appointment_total_cost || 0), 0)
                    const appointmentTotalPaid = appointmentPayments.reduce((sum, p) => sum + p.amount, 0)
                    const appointmentRemaining = appointmentPayments.reduce((sum, p) => sum + (p.appointment_remaining_balance || 0), 0)

                    // حساب المبالغ العامة
                    const generalTotalDue = generalPayments.reduce((sum, p) => sum + (p.total_amount_due || 0), 0)
                    const generalTotalPaid = generalPayments.reduce((sum, p) => sum + p.amount, 0)
                    const generalRemaining = generalPayments.reduce((sum, p) => sum + (p.remaining_balance || 0), 0)

                    // الإجماليات النهائية
                    const totalAmountDue = treatmentTotalDue + appointmentTotalDue + generalTotalDue
                    const totalAmountPaid = treatmentTotalPaid + appointmentTotalPaid + generalTotalPaid
                    const totalRemainingBalance = treatmentRemaining + appointmentRemaining + generalRemaining

                    // إحصائيات إضافية
                    const pendingPayments = patientPayments.filter(p => p.status === 'pending')
                    const partialPayments = patientPayments.filter(p => p.status === 'partial')
                    const completedPayments = patientPayments.filter(p => p.status === 'completed')

                    return (
                      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-border card-rtl">
                        <CardHeader className="card-header">
                          <CardTitle className="flex items-center gap-2 text-primary text-right">
                            <DollarSign className="w-5 h-5" />
                            ملخص المدفوعات الشامل
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="card-content" dir="rtl">
                          {/* جدول ملخص المدفوعات */}
                          <div className="overflow-hidden rounded-lg border border-border" dir="rtl">
                            <table className="w-full">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                    البيان
                                  </th>
                                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                    المبلغ
                                  </th>
                                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                    التفاصيل
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-background divide-y divide-border">
                                <tr>
                                  <td className="px-4 py-3 text-sm text-muted-foreground">
                                    الإجمالي المطلوب
                                  </td>
                                  <td className="px-4 py-3 text-sm font-bold text-blue-600 dark:text-blue-400">
                                    {formatCurrency(totalAmountDue)}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground">
                                    علاجات: {formatCurrency(treatmentTotalDue)} | مواعيد: {formatCurrency(appointmentTotalDue)} | عام: {formatCurrency(generalTotalDue)}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-3 text-sm text-muted-foreground">
                                    المبلغ المدفوع
                                  </td>
                                  <td className="px-4 py-3 text-sm font-bold text-green-600 dark:text-green-400">
                                    {formatCurrency(totalAmountPaid)}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground">
                                    علاجات: {formatCurrency(treatmentTotalPaid)} | مواعيد: {formatCurrency(appointmentTotalPaid)} | عام: {formatCurrency(generalTotalPaid)}
                                  </td>
                                </tr>
                                <tr className="bg-muted/50">
                                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                                    المبلغ المتبقي
                                  </td>
                                  <td className="px-4 py-3 text-sm font-bold">
                                    <span className={totalRemainingBalance > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}>
                                      {formatCurrency(totalRemainingBalance)}
                                    </span>
                                    {totalRemainingBalance === 0 && (
                                      <span className="mr-2 text-xs text-green-600 dark:text-green-400">✓ مكتمل</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground">
                                    علاجات: {formatCurrency(treatmentRemaining)} | مواعيد: {formatCurrency(appointmentRemaining)} | عام: {formatCurrency(generalRemaining)}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-3 text-sm text-muted-foreground">
                                    حالات الدفع
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <div className="flex gap-2 flex-wrap">
                                      <Badge variant="secondary" className="text-xs">
                                        مكتمل: {completedPayments.length}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        جزئي: {partialPayments.length}
                                      </Badge>
                                      <Badge variant="destructive" className="text-xs">
                                        آجل: {pendingPayments.length}
                                      </Badge>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground">
                                    إجمالي المدفوعات: {patientPayments.length}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })()}

                  {/* Payment List as Table */}
                  <Card className="card-rtl">
                    <CardHeader className="card-header">
                      <CardTitle className="flex items-center gap-2 text-foreground text-right">
                        <DollarSign className="w-5 h-5" />
                        تفاصيل المدفوعات الشاملة
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="card-content" dir="rtl">
                      <div className="overflow-hidden rounded-lg border border-border" dir="rtl">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                                #
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                                النوع
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                                التفاصيل
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                                تاريخ الدفع
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                                المبلغ المدفوع
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                                الإجمالي المطلوب
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                                المتبقي
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                                طريقة الدفع
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                                الحالة
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-background divide-y divide-border">
                            {patientPayments.map((payment, index) => {
                              const status = getPaymentStatusBadge(payment.status)

                              // تحديد نوع الدفعة والتفاصيل
                              let paymentType = 'عام'
                              let paymentDetails = payment.description || 'دفعة عامة'
                              let totalDue = payment.total_amount_due || 0
                              let remaining = payment.remaining_balance || 0

                              // تنظيف الوصف من معرفات العلاج
                              if (payment.description) {
                                paymentDetails = payment.description.replace(/\[علاج:[^\]]+\]/g, '').trim()
                                paymentDetails = paymentDetails.replace(/^\s*-\s*/, '').trim()
                              }

                              // تنظيف الملاحظات من معرفات العلاج أيضاً
                              let cleanNotes = payment.notes
                              if (cleanNotes) {
                                cleanNotes = cleanNotes.replace(/\[علاج:[^\]]+\]/g, '').trim()
                                cleanNotes = cleanNotes.replace(/^\s*-\s*/, '').trim()
                              }

                              if (payment.tooth_treatment_id) {
                                paymentType = 'علاج'
                                const treatmentName = payment.tooth_treatment?.treatment_type
                                  ? getTreatmentNameInArabic(payment.tooth_treatment.treatment_type)
                                  : 'علاج سن'

                                // استخدام اسم العلاج إذا كان الوصف فارغاً أو يحتوي فقط على معرف العلاج
                                if (!paymentDetails || paymentDetails === 'دفعة عامة') {
                                  paymentDetails = treatmentName
                                }

                                if (payment.tooth_treatment?.tooth_name) {
                                  paymentDetails += ` - ${payment.tooth_treatment.tooth_name}`
                                }
                                totalDue = payment.treatment_total_cost || 0
                                remaining = payment.treatment_remaining_balance || 0
                              } else if (payment.appointment_id) {
                                paymentType = 'موعد'
                                paymentDetails = payment.appointment?.title || paymentDetails || 'موعد طبي'
                                totalDue = payment.appointment_total_cost || payment.total_amount_due || 0
                                remaining = payment.appointment_remaining_balance || payment.remaining_balance || 0
                              }

                              return (
                                <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                                  <td className="px-3 py-2 text-xs text-foreground">
                                    {index + 1}
                                  </td>
                                  <td className="px-3 py-2 text-xs">
                                    <Badge
                                      variant={
                                        paymentType === 'علاج' ? 'default' :
                                        paymentType === 'موعد' ? 'secondary' : 'outline'
                                      }
                                      className="text-xs"
                                    >
                                      {paymentType}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 text-xs text-foreground max-w-32">
                                    <div className="truncate" title={paymentDetails}>
                                      {paymentDetails}
                                    </div>
                                    {payment.tooth_treatment?.tooth_number && (
                                      <div className="text-xs text-muted-foreground">
                                        سن #{payment.tooth_treatment.tooth_number}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-foreground">
                                    {formatDate(payment.payment_date)}
                                  </td>
                                  <td className="px-3 py-2 text-xs font-bold text-green-600 dark:text-green-400">
                                    {formatCurrency(payment.amount)}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-foreground">
                                    {totalDue > 0 ? formatCurrency(totalDue) : '-'}
                                  </td>
                                  <td className="px-3 py-2 text-xs font-medium">
                                    {remaining !== undefined ? (
                                      <span className={remaining > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}>
                                        {formatCurrency(remaining)}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground">
                                    {payment.payment_method === 'cash' ? 'نقداً' :
                                     payment.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                                     payment.payment_method}
                                  </td>
                                  <td className="px-3 py-2 text-xs">
                                    <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* تفاصيل إضافية للمدفوعات */}
                      {patientPayments.some(p => p.description || p.receipt_number) && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-sm font-medium text-foreground">تفاصيل إضافية:</h4>
                          {patientPayments.map((payment) => (
                            (payment.description || payment.receipt_number) && (
                              <div key={`details-${payment.id}`} className="p-3 bg-muted/30 rounded border border-border">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(payment.payment_date)} - {formatCurrency(payment.amount)}
                                  </span>
                                </div>
                                {payment.description && (
                                  <div className="mb-1">
                                    <span className="text-xs text-muted-foreground">الوصف: </span>
                                    <span className="text-xs text-foreground">
                                      {payment.description.replace(/\[علاج:[^\]]+\]/g, '').trim().replace(/^\s*-\s*/, '').trim()}
                                    </span>
                                  </div>
                                )}
                                {payment.receipt_number && (
                                  <div>
                                    <span className="text-xs text-muted-foreground">رقم الإيصال: </span>
                                    <span className="text-xs text-foreground">{payment.receipt_number}</span>
                                  </div>
                                )}
                              </div>
                            )
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* تبويب الوصفات الطبية */}
            <TabsContent value="prescriptions" className="space-y-4 dialog-rtl" dir="rtl">
              <div className="flex justify-between items-center mb-4" dir="rtl">
                <h3 className="text-lg font-medium">الوصفات الطبية</h3>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePrintPatientPrescriptions}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة الوصفات
                  </Button>
                  <Button
                    onClick={handleAddPrescription}
                    className="flex items-center gap-2"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة وصفة
                  </Button>
                </div>
              </div>
              {isLoadingPrescriptions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="loading-spinner"></div>
                </div>
              ) : patientPrescriptions.length === 0 ? (
                <Card className="card-rtl">
                  <CardContent className="pt-6 card-content" dir="rtl">
                    <div className="text-center py-8" dir="rtl">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2">لا توجد وصفات طبية</h3>
                      <p className="text-muted-foreground mb-4">لم يتم إنشاء أي وصفات طبية لهذا المريض بعد</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4" dir="rtl">
                  {patientPrescriptions.map((prescription) => (
                    <Card key={prescription.id} className="card-rtl">
                      <CardContent className="pt-4 card-content" dir="rtl">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">وصفة طبية</span>
                          </div>
                          <Badge variant="outline">
                            {formatDate(prescription.prescription_date)}
                          </Badge>
                        </div>

                        {prescription.tooth_treatment && (
                          <div className="mb-2">
                            <span className="text-sm text-muted-foreground">مرتبطة بعلاج: </span>
                            <span className="text-sm font-medium">
                              السن رقم {prescription.tooth_treatment.tooth_number} - {prescription.tooth_treatment.treatment_type}
                            </span>
                          </div>
                        )}

                        {prescription.notes && (
                          <p className="text-sm text-muted-foreground mb-3">{prescription.notes}</p>
                        )}

                        {prescription.medications && prescription.medications.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">الأدوية:</h4>
                            {prescription.medications.map((med, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                <span className="text-sm">{med.medication_name}</span>
                                {med.dose && <span className="text-sm text-muted-foreground">{med.dose}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>


          </div>
        </Tabs>
      </DialogContent>

      {/* Add Appointment Dialog */}
      <Suspense fallback={null}>
        <AddAppointmentDialog
          isOpen={showAddAppointmentDialog}
          onClose={() => setShowAddAppointmentDialog(false)}
          onSave={async (appointmentData) => {
            try {
              const { createAppointment } = useAppointmentStore.getState()
              await createAppointment(appointmentData)
              setShowAddAppointmentDialog(false)
              const updatedAppointments = appointments.filter(apt => apt.patient_id === patient.id)
              setPatientAppointments(updatedAppointments)
              toast({
                title: "تم بنجاح",
                description: "تم إضافة الموعد بنجاح",
              })
            } catch (error) {
              if (process.env.NODE_ENV !== 'production') console.error('Error saving appointment:', error)
              toast({
                title: "خطأ",
                description: "فشل في إضافة الموعد",
                variant: "destructive",
              })
            }
          }}
          patients={[patient]}
          treatments={[]}
          initialData={undefined}
          preSelectedPatientId={patient.id}
        />
      </Suspense>

      {/* Add Payment Dialog */}
      <Suspense fallback={null}>
        <AddPaymentDialog
          open={showAddPaymentDialog}
          onOpenChange={setShowAddPaymentDialog}
          preSelectedPatientId={patient.id}
        />
      </Suspense>

      {/* Add Prescription Dialog */}
      <Suspense fallback={null}>
        <AddPrescriptionDialog
          open={showAddPrescriptionDialog}
          onOpenChange={(open) => {
            setShowAddPrescriptionDialog(open)
            if (!open) {
              setIsLoadingPrescriptions(true)
              window.electronAPI?.prescriptions?.getByPatient?.(patient.id).then((prescriptions) => {
                setPatientPrescriptions(prescriptions || [])
                setIsLoadingPrescriptions(false)
              }).catch((error) => {
                if (process.env.NODE_ENV !== 'production') console.error('Error reloading prescriptions:', error)
                setIsLoadingPrescriptions(false)
              })
            }
          }}
          preSelectedPatientId={patient.id}
        />
      </Suspense>

      {/* Comprehensive Pending Invoice Dialog */}
      <Suspense fallback={null}>
        <ComprehensivePendingInvoiceDialog
          patient={patient}
          open={showPendingInvoiceDialog}
          onOpenChange={setShowPendingInvoiceDialog}
        />
      </Suspense>
    </Dialog>
  )
}

export default memo(PatientDetailsModalComponent)
