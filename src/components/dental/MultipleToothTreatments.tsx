import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectSeparator, SelectGroup } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Calendar,
  DollarSign,
  Clock,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ToothTreatment, TreatmentSession } from '@/types'
import {
  TREATMENT_TYPES,
  TREATMENT_CATEGORIES,
  TREATMENT_STATUS_OPTIONS,
  getTreatmentsByCategory,
  getTreatmentByValue,
  getCategoryInfo
} from '@/data/teethData'
import { formatDate } from '@/lib/utils'
import { notify } from '@/services/notificationService'
import TreatmentSessions from './TreatmentSessions'
import { usePaymentStore } from '@/store/paymentStore'
import { usePatientStore } from '@/store/patientStore'
import { useLabStore } from '@/store/labStore'
import { useLabOrderStore } from '@/store/labOrderStore'

interface MultipleToothTreatmentsProps {
  patientId: string
  toothNumber: number
  toothName: string
  treatments: ToothTreatment[]
  onAddTreatment: (treatment: Omit<ToothTreatment, 'id' | 'created_at' | 'updated_at'>) => Promise<ToothTreatment | null>
  onUpdateTreatment: (id: string, updates: Partial<ToothTreatment>) => Promise<void>
  onDeleteTreatment: (id: string) => Promise<void>
  onReorderTreatments: (treatmentIds: string[]) => Promise<void>
  onSessionStatsUpdate?: () => void
  onTreatmentUpdate?: () => void
}

export default function MultipleToothTreatments({
  patientId,
  toothNumber,
  toothName,
  treatments,
  onAddTreatment,
  onUpdateTreatment,
  onDeleteTreatment,
  onReorderTreatments,
  onSessionStatsUpdate,
  onTreatmentUpdate
}: MultipleToothTreatmentsProps) {
  const { isDarkMode } = useTheme()
  const { createPayment, updatePayment, getPaymentsByPatient } = usePaymentStore()
  const { patients } = usePatientStore()
  const { labs, loadLabs } = useLabStore()
  const { createLabOrder, updateLabOrder, deleteLabOrder, getLabOrdersByTreatment } = useLabOrderStore()
  const [isAddingTreatment, setIsAddingTreatment] = useState(false)
  const [editingTreatment, setEditingTreatment] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [treatmentToDelete, setTreatmentToDelete] = useState<string | null>(null)
  // متغيرات منفصلة لنموذج إضافة العلاج
  const [addSelectedLab, setAddSelectedLab] = useState<string>('')
  const [addLabCost, setAddLabCost] = useState<number>(0)
  // متغيرات منفصلة لنموذج تعديل العلاج (ستُستخدم في EditTreatmentFormContent)
  const [selectedLab, setSelectedLab] = useState<string>('')
  const [labCost, setLabCost] = useState<number>(0)
  const [newTreatment, setNewTreatment] = useState<Partial<ToothTreatment>>({
    patient_id: patientId,
    tooth_number: toothNumber,
    tooth_name: toothName,
    treatment_status: 'planned',
    cost: 0,
    start_date: new Date().toISOString().split('T')[0] // تحديد التاريخ المحلي تلقائياً
    // priority will be auto-assigned by the database service
  })

  // Treatment Sessions state
  const [treatmentSessions, setTreatmentSessions] = useState<{ [treatmentId: string]: TreatmentSession[] }>({})
  const [selectedTreatmentForSessions, setSelectedTreatmentForSessions] = useState<string | null>(null)

  // Helper functions for number formatting with thousands separators
  const formatNumberWithCommas = (value: string | number): string => {
    const stringValue = typeof value === 'number' ? value.toString() : value
    if (!stringValue) return ''
    // Remove any existing commas
    const cleanValue = stringValue.replace(/,/g, '')
    // Check if it's a valid number
    if (isNaN(Number(cleanValue))) return stringValue
    // Split into integer and decimal parts
    const parts = cleanValue.split('.')
    // Format integer part with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return parts.join('.')
  }

  const removeCommas = (value: string): string => {
    return value.replace(/,/g, '')
  }

  // Load labs on component mount
  useEffect(() => {
    loadLabs()
  }, [loadLabs])

  // Sort treatments by priority
  const sortedTreatments = [...treatments].sort((a, b) => a.priority - b.priority)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planned': return <Clock className="w-4 h-4 text-blue-500" />
      case 'in_progress': return <PlayCircle className="w-4 h-4 text-yellow-500" />
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'cancelled': return <XCircle className="w-4 h-4 text-gray-500" />
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    const statusOption = TREATMENT_STATUS_OPTIONS.find(s => s.value === status)
    return statusOption?.color || '#6b7280'
  }

  // دالة إنشاء دفعة آجلة للعلاج
  const createPendingPaymentForTreatment = async (treatmentId: string) => {
    console.log('💰 [DEBUG] createPendingPaymentForTreatment called:', {
      treatmentId,
      cost: newTreatment.cost,
      patientId
    })

    // التحقق من المتطلبات الأساسية
    if (!treatmentId) {
      console.error('❌ [DEBUG] Cannot create payment - missing treatment ID')
      throw new Error('معرف العلاج مطلوب لإنشاء الدفعة')
    }

    if (!newTreatment.cost || newTreatment.cost <= 0) {
      console.log('⚠️ [DEBUG] Skipping payment creation - no cost specified')
      return
    }

    try {
      // الحصول على بيانات المريض
      const patient = patients.find(p => p.id === patientId)
      if (!patient) {
        throw new Error('لم يتم العثور على بيانات المريض')
      }

      // إنشاء وصف للدفعة
      const treatmentTypeInfo = getTreatmentByValue(newTreatment.treatment_type!)
      const description = `علاج ${treatmentTypeInfo?.label || newTreatment.treatment_type} - سن ${toothName || toothNumber}`

      // بيانات الدفعة الآجلة
      const paymentData = {
        patient_id: patientId,
        tooth_treatment_id: treatmentId, // ربط مباشر بالعلاج
        amount: 0, // مبلغ مدفوع = 0 لجعل الحالة آجلة
        payment_method: 'cash' as const,
        payment_date: new Date().toISOString().split('T')[0],
        description: description, // وصف نظيف بدون معرف العلاج
        status: 'pending' as const,
        notes: `دفعة آجلة للمريض: ${patient.full_name} - السن: ${toothName} - العلاج: ${treatmentTypeInfo?.label || newTreatment.treatment_type}`,
        total_amount_due: newTreatment.cost,
        amount_paid: 0,
        remaining_balance: newTreatment.cost,
        treatment_total_cost: newTreatment.cost,
        treatment_total_paid: 0,
        treatment_remaining_balance: newTreatment.cost
      }

      console.log('💰 [DEBUG] Creating payment with data:', paymentData)

      await createPayment(paymentData)

      console.log('✅ [DEBUG] Payment created successfully for treatment:', treatmentId)
      notify.success('تم إنشاء دفعة آجلة في جدول المدفوعات')

    } catch (error) {
      console.error('❌ [DEBUG] Payment creation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
      notify.error(`فشل في إنشاء الدفعة الآجلة: ${errorMessage}`)
      throw error // إعادة رمي الخطأ للمعالجة في المستوى الأعلى
    }
  }

  // دالة إنشاء طلب مخبر للعلاج
  const createLabOrderForTreatment = async (treatmentId: string) => {
    // التحقق من المتطلبات الأساسية
    if (!treatmentId) {
      throw new Error('معرف العلاج مطلوب لإنشاء طلب المختبر')
    }

    if (!addSelectedLab || addLabCost <= 0) {
      return // لا نحتاج طلب مخبر إذا لم يتم اختيار مخبر أو تكلفة
    }

    try {
      const patient = patients.find(p => p.id === patientId)
      const treatmentType = getTreatmentByValue(newTreatment.treatment_type!)

      // التحقق من وجود بيانات المريض
      if (!patient) {
        throw new Error('لم يتم العثور على بيانات المريض')
      }

      const labOrderData = {
        lab_id: addSelectedLab,
        patient_id: patientId,
        tooth_treatment_id: treatmentId,
        tooth_number: toothNumber,
        service_name: `${treatmentType?.label || 'علاج تعويضات'} - السن ${toothNumber}`,
        cost: addLabCost,
        order_date: new Date().toISOString().split('T')[0],
        status: 'آجل' as const,
        notes: `طلب مخبر للمريض: ${patient.full_name} - السن: ${toothName} - العلاج: ${treatmentType?.label || newTreatment.treatment_type}`,
        paid_amount: 0,
        remaining_balance: addLabCost
      }

      // إنشاء طلب المختبر
      await createLabOrder(labOrderData)

      // التحقق من نجاح الإنشاء
      const createdOrders = getLabOrdersByTreatment(treatmentId)

      if (createdOrders.length > 0) {
        notify.success('تم إنشاء طلب المختبر وربطه بالعلاج بنجاح')
      } else {
        notify.warning('تم إنشاء طلب المختبر ولكن قد تحتاج لإعادة تحميل الصفحة للتحقق من الربط')
      }

    } catch (error) {
      console.error('❌ [DEBUG] Lab order creation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
      notify.error(`فشل في إنشاء طلب المختبر: ${errorMessage}`)
      throw error // إعادة رمي الخطأ للمعالجة في المستوى الأعلى
    }
  }

  const handleAddTreatment = async () => {
    if (!newTreatment.treatment_type || !newTreatment.treatment_category) {
      notify.error('يرجى اختيار نوع العلاج والتصنيف')
      return
    }

    // التحقق من بيانات المختبر للتعويضات
    if (newTreatment.treatment_category === 'التعويضات' && addLabCost > 0 && !addSelectedLab) {
      notify.error('يرجى اختيار المختبر عند إدخال تكلفة المختبر للتعويضات')
      return
    }

    let createdTreatmentId: string | null = null
    let createdPaymentId: string | null = null

    try {
      console.log('🚀 [DEBUG] Starting treatment creation process:', {
        treatmentType: newTreatment.treatment_type,
        category: newTreatment.treatment_category,
        cost: newTreatment.cost,
        isProsthetic: newTreatment.treatment_category === 'التعويضات',
        hasLabData: !!addSelectedLab && addLabCost > 0
      })

      // الخطوة 1: إنشاء العلاج
      const treatmentData = {
        ...newTreatment,
        treatment_color: getTreatmentByValue(newTreatment.treatment_type!)?.color || '#22c55e'
      } as Omit<ToothTreatment, 'id' | 'created_at' | 'updated_at'>

      const newTreatmentResult = await onAddTreatment(treatmentData)

      if (!newTreatmentResult) {
        throw new Error('فشل في إنشاء العلاج')
      }

      createdTreatmentId = newTreatmentResult.id
      console.log('✅ [DEBUG] Treatment created successfully:', createdTreatmentId)

      // الخطوة 2: إنشاء دفعة آجلة إذا تم تعبئة التكلفة
      if (newTreatment.cost && newTreatment.cost > 0) {
        console.log('💰 [DEBUG] Creating payment for treatment:', createdTreatmentId)
        try {
          await createPendingPaymentForTreatment(createdTreatmentId)
          console.log('✅ [DEBUG] Payment created successfully for treatment:', createdTreatmentId)
        } catch (paymentError) {
          console.error('❌ [DEBUG] Payment creation failed:', paymentError)
          notify.warning('تم إنشاء العلاج ولكن فشل في إنشاء الدفعة')
        }
      }

      // الخطوة 3: إنشاء طلب مختبر للتعويضات (بعد إنشاء العلاج والدفعة)
      if (newTreatment.treatment_category === 'التعويضات' && addSelectedLab && addLabCost > 0) {
        try {
          await createLabOrderForTreatment(createdTreatmentId)
        } catch (labError) {
          notify.warning('تم إنشاء العلاج والدفعة ولكن فشل في إنشاء طلب المختبر')
        }
      }

      // إعادة تعيين النموذج
      setNewTreatment({
        patient_id: patientId,
        tooth_number: toothNumber,
        tooth_name: toothName,
        treatment_status: 'planned',
        cost: 0,
        start_date: new Date().toISOString().split('T')[0]
      })
      setSelectedCategory('')
      setAddSelectedLab('')
      setAddLabCost(0)
      setIsAddingTreatment(false)

      notify.success('تم إضافة العلاج بنجاح مع جميع المكونات المطلوبة')

    } catch (error) {
      // في حالة الفشل، نحاول تنظيف البيانات المنشأة جزئياً
      if (createdTreatmentId) {
        // يمكن إضافة منطق تنظيف هنا إذا لزم الأمر
      }

      notify.error('فشل في إضافة العلاج - يرجى المحاولة مرة أخرى')
    }
  }

  const handleUpdateTreatment = async (id: string, updates: Partial<ToothTreatment>) => {
    try {
      console.log('🦷 MultipleToothTreatments: Updating treatment:', id, updates)

      // محاولة تحديث العلاج
      await onUpdateTreatment(id, updates)
      console.log('🦷 MultipleToothTreatments: onUpdateTreatment completed')

      setEditingTreatment(null)

      // إعادة تحميل البيانات فوراً لتحديث ألوان الأسنان
      onTreatmentUpdate?.()

      console.log('🦷 MultipleToothTreatments: Treatment updated successfully')
      notify.success('تم تحديث العلاج بنجاح')
    } catch (error) {
      console.error('🦷 MultipleToothTreatments: Error updating treatment:', error)

      // التحقق من نوع الخطأ
      if (error && typeof error === 'object' && 'message' in error) {
        console.error('🦷 MultipleToothTreatments: Error message:', error.message)
      }

      notify.error('فشل في تحديث العلاج')
    }
  }

  const handleDeleteTreatment = async (id: string) => {
    setTreatmentToDelete(id)
    setShowDeleteDialog(true)
  }

  const confirmDeleteTreatment = async () => {
    if (!treatmentToDelete) return

    try {
      await onDeleteTreatment(treatmentToDelete)
      notify.success('تم حذف العلاج بنجاح')
      setShowDeleteDialog(false)
      setTreatmentToDelete(null)
    } catch (error) {
      notify.error('فشل في حذف العلاج')
    }
  }

  const moveTreatmentUp = async (index: number) => {
    if (index === 0) return

    const newOrder = [...sortedTreatments]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index - 1]
    newOrder[index - 1] = temp

    const treatmentIds = newOrder.map(t => t.id)
    await onReorderTreatments(treatmentIds)
  }

  const moveTreatmentDown = async (index: number) => {
    if (index === sortedTreatments.length - 1) return

    const newOrder = [...sortedTreatments]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index + 1]
    newOrder[index + 1] = temp

    const treatmentIds = newOrder.map(t => t.id)
    await onReorderTreatments(treatmentIds)
  }

  const filteredTreatmentTypes = selectedCategory
    ? getTreatmentsByCategory(selectedCategory as any)
    : TREATMENT_TYPES

  // تجميع علاجات التعويضات في مجموعات لتحسين العرض
  const groupProstheticTreatments = (treatments: typeof TREATMENT_TYPES) => {
    if (selectedCategory !== 'التعويضات') {
      return treatments
    }

    const groups = {
      crowns: treatments.filter(t =>
        t.value.includes('crown') && !t.value.includes('implant')
      ),
      bridges: treatments.filter(t =>
        t.value.includes('bridge')
      ),
      dentures: treatments.filter(t =>
        t.value.includes('denture')
      ),
      implants: treatments.filter(t =>
        t.value.includes('implant')
      ),
      posts: treatments.filter(t =>
        t.value.includes('post') || t.value.includes('core')
      ),
      veneers: treatments.filter(t =>
        t.value.includes('veneer')
      )
    }

    return { groups, isGrouped: true }
  }

  const groupedTreatments = groupProstheticTreatments(filteredTreatmentTypes)

  // Treatment Sessions functions
  const loadTreatmentSessions = async (treatmentId: string) => {
    try {
      const sessions = await window.electronAPI.treatmentSessions.getByTreatment(treatmentId)
      setTreatmentSessions(prev => ({ ...prev, [treatmentId]: sessions }))
    } catch (error) {
      console.error('Error loading treatment sessions:', error)
      notify.error('فشل في تحميل جلسات العلاج')
    }
  }

  const handleAddSession = async (treatmentId: string, sessionData: Omit<TreatmentSession, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await window.electronAPI.treatmentSessions.create(sessionData)
      await loadTreatmentSessions(treatmentId)
      // تحديث إحصائيات الجلسات في الصفحة الرئيسية
      onSessionStatsUpdate?.()
      notify.success('تم إضافة الجلسة بنجاح')
    } catch (error) {
      console.error('Error adding session:', error)
      notify.error('فشل في إضافة الجلسة')
    }
  }

  const handleUpdateSession = async (treatmentId: string, sessionId: string, updates: Partial<TreatmentSession>) => {
    try {
      await window.electronAPI.treatmentSessions.update(sessionId, updates)
      await loadTreatmentSessions(treatmentId)
      // تحديث إحصائيات الجلسات في الصفحة الرئيسية
      onSessionStatsUpdate?.()
      notify.success('تم تحديث الجلسة بنجاح')
    } catch (error) {
      console.error('Error updating session:', error)
      notify.error('فشل في تحديث الجلسة')
    }
  }

  const handleDeleteSession = async (treatmentId: string, sessionId: string) => {
    try {
      await window.electronAPI.treatmentSessions.delete(sessionId)
      await loadTreatmentSessions(treatmentId)
      // تحديث إحصائيات الجلسات في الصفحة الرئيسية
      onSessionStatsUpdate?.()
      notify.success('تم حذف الجلسة بنجاح')
    } catch (error) {
      console.error('Error deleting session:', error)
      notify.error('فشل في حذف الجلسة')
    }
  }

  // Load sessions when a treatment is selected
  useEffect(() => {
    if (selectedTreatmentForSessions) {
      loadTreatmentSessions(selectedTreatmentForSessions)
    }
  }, [selectedTreatmentForSessions])

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">علاجات السن رقم {toothNumber}</h3>
          <p className="text-sm text-muted-foreground">{toothName}</p>
        </div>
        <Button
          onClick={() => setIsAddingTreatment(true)}
          className="bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة علاج
        </Button>
      </div>

      {/* Existing Treatments */}
      <div className="space-y-3">
        {sortedTreatments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">لا توجد علاجات مسجلة لهذا السن</p>
            </CardContent>
          </Card>
        ) : (
          sortedTreatments.map((treatment, index) => (
            <Card key={treatment.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        #{treatment.priority}
                      </span>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveTreatmentUp(index)}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveTreatmentDown(index)}
                          disabled={index === sortedTreatments.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div
                      className="w-4 h-4 rounded-full border-2 border-white"
                      style={{ backgroundColor: treatment.treatment_color }}
                    />

                    <div>
                      <CardTitle className="text-base">
                        {getTreatmentByValue(treatment.treatment_type)?.label || treatment.treatment_type}
                      </CardTitle>
                      <CardDescription>
                        {getCategoryInfo(treatment.treatment_category as any)?.label}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      style={{
                        backgroundColor: getStatusColor(treatment.treatment_status) + '20',
                        color: getStatusColor(treatment.treatment_status)
                      }}
                    >
                      {getStatusIcon(treatment.treatment_status)}
                      <span className="mr-1">
                        {TREATMENT_STATUS_OPTIONS.find(s => s.value === treatment.treatment_status)?.label}
                      </span>
                    </Badge>

                    <Button
                      variant={selectedTreatmentForSessions === treatment.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTreatmentForSessions(
                        selectedTreatmentForSessions === treatment.id ? null : treatment.id
                      )}
                      className={cn(
                        "action-btn-sessions gap-1.5",
                        selectedTreatmentForSessions === treatment.id
                          ? "sessions-selected bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                          : "sessions-outline border-blue-200 text-blue-700 dark:border-blue-700 dark:text-blue-300"
                      )}
                      title="إدارة جلسات العلاج"
                    >
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-medium">الجلسات</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingTreatment(treatment.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTreatment(treatment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {treatment.cost && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span>${treatment.cost}</span>
                    </div>
                  )}

                  {treatment.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{formatDate(treatment.start_date)}</span>
                    </div>
                  )}

                  {treatment.completion_date && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>{formatDate(treatment.completion_date)}</span>
                    </div>
                  )}
                </div>

                {treatment.notes && (
                  <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                    {treatment.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Treatment Form */}
      {editingTreatment && (
        <Card className={cn(
          "border-2 shadow-lg !border-solid",
          isDarkMode
            ? "!border-orange-800/50 bg-orange-950/20 shadow-orange-900/20"
            : "!border-orange-200 bg-orange-50/50 shadow-orange-100/50"
        )}>
          <CardHeader className={cn(
            "border-b",
            isDarkMode ? "border-orange-800/30" : "border-orange-200/50"
          )}>
            <CardTitle className={cn(
              "text-lg",
              isDarkMode ? "text-orange-200" : "text-orange-900"
            )}>تعديل العلاج</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const treatment = treatments.find(t => t.id === editingTreatment)
              if (!treatment) return null

              return (
                <EditTreatmentFormContent
                  treatment={treatment}
                  onSave={handleUpdateTreatment}
                  onCancel={() => setEditingTreatment(null)}
                />
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Treatment Sessions Management */}
      {selectedTreatmentForSessions && (
        <Card className={cn(
          "border-2 shadow-lg",
          isDarkMode
            ? "border-blue-800/50 bg-blue-950/20 shadow-blue-900/20"
            : "border-blue-200 bg-blue-50/50 shadow-blue-100/50"
        )}>
          <CardHeader className={cn(
            "border-b",
            isDarkMode ? "border-blue-800/30" : "border-blue-200/50"
          )}>
            <div className="flex items-center justify-between">
              <CardTitle className={cn(
                "text-lg",
                isDarkMode ? "text-blue-200" : "text-blue-900"
              )}>
                إدارة جلسات العلاج
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTreatmentForSessions(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <CardDescription>
              {(() => {
                const treatment = treatments.find(t => t.id === selectedTreatmentForSessions)
                return treatment ? `${getTreatmentByValue(treatment.treatment_type)?.label || treatment.treatment_type}` : ''
              })()}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {(() => {
              const treatment = treatments.find(t => t.id === selectedTreatmentForSessions)
              if (!treatment) return null

              return (
                <TreatmentSessions
                  treatment={treatment}
                  sessions={treatmentSessions[selectedTreatmentForSessions] || []}
                  onAddSession={(sessionData) => handleAddSession(selectedTreatmentForSessions, sessionData)}
                  onUpdateSession={(sessionId, updates) => handleUpdateSession(selectedTreatmentForSessions, sessionId, updates)}
                  onDeleteSession={(sessionId) => handleDeleteSession(selectedTreatmentForSessions, sessionId)}
                />
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Add Treatment Form */}
      {isAddingTreatment && (
        <Card className={cn(
          "border-2 shadow-lg",
          isDarkMode
            ? "border-blue-800/50 bg-blue-950/20 shadow-blue-900/20"
            : "border-blue-200 bg-blue-50/50 shadow-blue-100/50"
        )}>
          <CardHeader className={cn(
            "border-b",
            isDarkMode ? "border-blue-800/30" : "border-blue-200/50"
          )}>
            <CardTitle className={cn(
              "text-lg",
              isDarkMode ? "text-blue-200" : "text-blue-900"
            )}>إضافة علاج جديد</CardTitle>
          </CardHeader>
          <CardContent className={cn(
            "space-y-4 p-6",
            isDarkMode ? "bg-blue-950/10" : "bg-blue-50/30"
          )}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={cn(
                  "font-medium",
                  isDarkMode ? "text-blue-200" : "text-blue-800"
                )}>تصنيف العلاج</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => {
                    setSelectedCategory(value)
                    setNewTreatment(prev => ({ ...prev, treatment_category: value }))
                  }}
                >
                  <SelectTrigger className={cn(
                    "border-2 transition-colors",
                    isDarkMode
                      ? "border-blue-800/50 bg-blue-950/30 hover:border-blue-700 focus:border-blue-600"
                      : "border-blue-200 bg-white hover:border-blue-300 focus:border-blue-500"
                  )}>
                    <SelectValue placeholder="اختر التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    {TREATMENT_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        <div className="flex items-center gap-2">
                          <span>{category.icon}</span>
                          <span>{category.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={cn(
                  "font-medium",
                  isDarkMode ? "text-blue-200" : "text-blue-800"
                )}>نوع العلاج</Label>
                <Select
                  value={newTreatment.treatment_type || ''}
                  onValueChange={(value) => setNewTreatment(prev => ({ ...prev, treatment_type: value }))}
                  disabled={!selectedCategory}
                >
                  <SelectTrigger className={cn(
                    "border-2 transition-colors",
                    !selectedCategory && "opacity-50 cursor-not-allowed",
                    isDarkMode
                      ? "border-blue-800/50 bg-blue-950/30 hover:border-blue-700 focus:border-blue-600"
                      : "border-blue-200 bg-white hover:border-blue-300 focus:border-blue-500"
                  )}>
                    <SelectValue placeholder="اختر نوع العلاج" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {selectedCategory === 'التعويضات' && groupedTreatments.isGrouped ? (
                      <>
                        {/* التيجان */}
                        {groupedTreatments.groups.crowns.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                              👑 التيجان
                            </SelectLabel>
                            {groupedTreatments.groups.crowns.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: type.color }}
                                  />
                                  <span>{type.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                            <SelectSeparator />
                          </SelectGroup>
                        )}

                        {/* الجسور */}
                        {groupedTreatments.groups.bridges.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                              🌉 الجسور
                            </SelectLabel>
                            {groupedTreatments.groups.bridges.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: type.color }}
                                  />
                                  <span>{type.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                            <SelectSeparator />
                          </SelectGroup>
                        )}

                        {/* الأجهزة المتحركة */}
                        {groupedTreatments.groups.dentures.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                              🦷 الأجهزة المتحركة
                            </SelectLabel>
                            {groupedTreatments.groups.dentures.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: type.color }}
                                  />
                                  <span>{type.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                            <SelectSeparator />
                          </SelectGroup>
                        )}

                        {/* تعويضات الزرعات */}
                        {groupedTreatments.groups.implants.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="flex items-center gap-2 text-green-600 dark:text-green-400">
                              🔩 تعويضات الزرعات
                            </SelectLabel>
                            {groupedTreatments.groups.implants.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: type.color }}
                                  />
                                  <span>{type.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                            <SelectSeparator />
                          </SelectGroup>
                        )}

                        {/* القلوب والأوتاد */}
                        {groupedTreatments.groups.posts.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              🔧 القلوب والأوتاد
                            </SelectLabel>
                            {groupedTreatments.groups.posts.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: type.color }}
                                  />
                                  <span>{type.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                            <SelectSeparator />
                          </SelectGroup>
                        )}

                        {/* الفينير */}
                        {groupedTreatments.groups.veneers.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
                              ✨ الفينير
                            </SelectLabel>
                            {groupedTreatments.groups.veneers.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: type.color }}
                                  />
                                  <span>{type.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </>
                    ) : (
                      // العرض العادي للتصنيفات الأخرى
                      filteredTreatmentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: type.color }}
                            />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className={cn(
                  "font-medium",
                  isDarkMode ? "text-blue-200" : "text-blue-800"
                )}>حالة العلاج</Label>
                <Select
                  value={newTreatment.treatment_status || 'planned'}
                  onValueChange={(value) => {
                    setNewTreatment(prev => ({ ...prev, treatment_status: value as any }))

                    // إرسال إشعار فوري لتحديث ألوان الأسنان عند تغيير الحالة
                    if (typeof window !== 'undefined' && window.dispatchEvent) {
                      window.dispatchEvent(new CustomEvent('tooth-color-update', {
                        detail: {
                          type: 'status-preview-new',
                          newStatus: value,
                          timestamp: Date.now()
                        }
                      }))
                    }
                  }}
                >
                  <SelectTrigger className={cn(
                    "border-2 transition-colors",
                    isDarkMode
                      ? "border-blue-800/50 bg-blue-950/30 hover:border-blue-700 focus:border-blue-600"
                      : "border-blue-200 bg-white hover:border-blue-300 focus:border-blue-500"
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TREATMENT_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* حقل التكلفة */}
              <div className="space-y-2">
                <Label className={cn(
                  "font-medium",
                  isDarkMode ? "text-blue-200" : "text-blue-800"
                )}>التكلفة ($)</Label>
                <Input
                  type="text"
                  value={formatNumberWithCommas((newTreatment.cost || 0).toString())}
                  onChange={(e) => {
                    const rawValue = removeCommas(e.target.value)
                    // Allow only numbers and one decimal point
                    if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                      setNewTreatment(prev => ({
                        ...prev,
                        cost: rawValue === '' ? 0 : parseFloat(rawValue) || 0
                      }))
                    }
                  }}
                  onBlur={(e) => {
                    const rawValue = removeCommas(e.target.value)
                    const value = parseFloat(rawValue) || 0
                    setNewTreatment(prev => ({ ...prev, cost: value }))
                  }}
                  placeholder="0.00"
                  className={cn(
                    "border-2 transition-colors",
                    isDarkMode
                      ? "border-blue-800/50 bg-blue-950/30 hover:border-blue-700 focus:border-blue-600"
                      : "border-blue-200 bg-white hover:border-blue-300 focus:border-blue-500"
                  )}
                />
                {newTreatment.cost && newTreatment.cost > 0 && (
                  <p className={cn(
                    "text-xs",
                    isDarkMode ? "text-blue-300" : "text-blue-600"
                  )}>
                    💡 سيتم إنشاء دفعة آجلة في جدول المدفوعات
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className={cn(
                  "font-medium",
                  isDarkMode ? "text-blue-200" : "text-blue-800"
                )}>تاريخ العلاج</Label>
                <Input
                  type="date"
                  value={newTreatment.start_date || ''}
                  onChange={(e) => setNewTreatment(prev => ({ ...prev, start_date: e.target.value }))}
                  className={cn(
                    "border-2 transition-colors",
                    isDarkMode
                      ? "border-blue-800/50 bg-blue-950/30 hover:border-blue-700 focus:border-blue-600"
                      : "border-blue-200 bg-white hover:border-blue-300 focus:border-blue-500"
                  )}
                />
              </div>
            </div>

            {/* حقول المخبر - تظهر فقط لعلاجات التعويضات */}
            {selectedCategory === 'التعويضات' && (
              <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-xl border-2 shadow-sm transition-all duration-200",
                isDarkMode
                  ? "bg-gradient-to-br from-purple-950/40 to-purple-900/30 border-purple-700/50 shadow-purple-900/20"
                  : "bg-gradient-to-br from-purple-50 to-purple-100/60 border-purple-300/70 shadow-purple-200/30"
              )}>
                {/* عنوان الكارد */}
                <div className="md:col-span-2 mb-3">
                  <div className={cn(
                    "flex items-center gap-3 text-sm font-semibold",
                    isDarkMode ? "text-purple-200" : "text-purple-800"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-lg",
                      isDarkMode
                        ? "bg-purple-800/50 text-purple-200"
                        : "bg-purple-200/80 text-purple-800"
                    )}>
                      🏭
                    </div>
                    <span>إعدادات المخبر</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className={cn(
                    "font-medium flex items-center gap-2 text-sm",
                    isDarkMode ? "text-purple-100" : "text-purple-900"
                  )}>
                    🏭 اختيار المخبر
                  </Label>
                  <Select
                    value={addSelectedLab}
                    onValueChange={setAddSelectedLab}
                  >
                    <SelectTrigger className={cn(
                      "border-2 transition-all duration-200 h-11",
                      isDarkMode
                        ? "border-purple-700/50 bg-purple-950/40 hover:border-purple-600 focus:border-purple-500 text-purple-100"
                        : "border-purple-300/70 bg-white hover:border-purple-400 focus:border-purple-500 text-purple-900"
                    )}>
                      <SelectValue placeholder="اختر المخبر" />
                    </SelectTrigger>
                    <SelectContent className={cn(
                      isDarkMode
                        ? "bg-purple-950 border-purple-700"
                        : "bg-white border-purple-200"
                    )}>
                      {labs.map((lab) => (
                        <SelectItem key={lab.id} value={lab.id}>
                          <div className="flex items-center gap-2">
                            <span>🏭</span>
                            <span>{lab.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className={cn(
                    "font-medium flex items-center gap-2 text-sm",
                    isDarkMode ? "text-purple-100" : "text-purple-900"
                  )}>
                    💰 تكلفة المخبر ($)
                  </Label>
                  <Input
                    type="text"
                    value={formatNumberWithCommas(addLabCost.toString())}
                    onChange={(e) => {
                      const rawValue = removeCommas(e.target.value)
                      // Allow only numbers and one decimal point
                      if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                        setAddLabCost(rawValue === '' ? 0 : parseFloat(rawValue) || 0)
                      }
                    }}
                    onBlur={(e) => {
                      const rawValue = removeCommas(e.target.value)
                      const value = parseFloat(rawValue) || 0
                      setAddLabCost(value)
                    }}
                    placeholder="0.00"
                    className={cn(
                      "border-2 transition-all duration-200 h-11",
                      isDarkMode
                        ? "border-purple-700/50 bg-purple-950/40 hover:border-purple-600 focus:border-purple-500 text-purple-100 placeholder:text-purple-400"
                        : "border-purple-300/70 bg-white hover:border-purple-400 focus:border-purple-500 text-purple-900 placeholder:text-purple-500"
                    )}
                  />
                  {addLabCost > 0 && (
                    <div className={cn(
                      "flex items-center gap-2 p-2 rounded-lg text-xs",
                      isDarkMode
                        ? "bg-purple-900/30 text-purple-200 border border-purple-700/30"
                        : "bg-purple-100/60 text-purple-700 border border-purple-200/50"
                    )}>
                      <span className="text-sm">🏭</span>
                      <span>سيتم إنشاء طلب مخبر تلقائياً</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className={cn(
                "font-medium",
                isDarkMode ? "text-blue-200" : "text-blue-800"
              )}>ملاحظات</Label>
              <Textarea
                value={newTreatment.notes || ''}
                onChange={(e) => setNewTreatment(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="أدخل أي ملاحظات إضافية..."
                rows={3}
                className={cn(
                  "border-2 transition-colors resize-none",
                  isDarkMode
                    ? "border-blue-800/50 bg-blue-950/30 hover:border-blue-700 focus:border-blue-600"
                    : "border-blue-200 bg-white hover:border-blue-300 focus:border-blue-500"
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-blue-200/50 dark:border-blue-800/30">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingTreatment(false)
                  setSelectedCategory('')
                  setNewTreatment({
                    patient_id: patientId,
                    tooth_number: toothNumber,
                    tooth_name: toothName,
                    treatment_status: 'planned',
                    cost: 0,
                    start_date: new Date().toISOString().split('T')[0] // تحديد التاريخ المحلي تلقائياً
                    // priority will be auto-assigned by the database service
                  })
                }}
                className={cn(
                  "border-2 transition-all duration-200",
                  isDarkMode
                    ? "border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-800"
                    : "border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                )}
              >
                <X className="w-4 h-4 ml-2" />
                إلغاء
              </Button>
              <Button
                onClick={handleAddTreatment}
                className={cn(
                  "transition-all duration-200 shadow-lg",
                  isDarkMode
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/30"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30"
                )}
              >
                <Save className="w-4 h-4 ml-2" />
                حفظ العلاج
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Treatment Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md" dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle>
                  هل أنت متأكد من حذف هذا العلاج؟
                </AlertDialogTitle>
                <AlertDialogDescription>
                  هذا الإجراء لا يمكن التراجع عنه. سيتم حذف العلاج وجميع البيانات المرتبطة به نهائياً.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          {treatmentToDelete && (() => {
            const treatment = treatments.find(t => t.id === treatmentToDelete)
            if (!treatment) return null

            return (
              <div className="my-4">
                <div className="bg-muted/50 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Trash2 className="w-5 h-5 text-destructive" />
                    <div>
                      <h4 className="font-medium text-foreground">
                        {getTreatmentByValue(treatment.treatment_type)?.label || treatment.treatment_type}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        السن: {toothName} (#{toothNumber})
                      </p>
                    </div>
                  </div>

                  {treatment.notes && (
                    <div className="text-sm text-muted-foreground">
                      <strong>الملاحظات:</strong> {treatment.notes}
                    </div>
                  )}
                </div>

                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-4">
                  <div className="flex">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 ml-2" />
                    <div>
                      <h4 className="text-sm font-medium text-destructive">تحذير مهم</h4>
                      <p className="text-sm text-destructive/80 mt-1">
                        سيتم حذف جميع البيانات المرتبطة بهذا العلاج بما في ذلك:
                      </p>
                      <ul className="text-sm text-destructive/80 mt-2 list-disc list-inside">
                        <li>جلسات العلاج المسجلة</li>
                        <li>المدفوعات المرتبطة</li>
                        <li>طلبات المختبر (إن وجدت)</li>
                        <li>الصور والملفات المرفقة</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          <AlertDialogFooter className="flex justify-end space-x-3 space-x-reverse">
            <AlertDialogCancel>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTreatment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Edit Treatment Form Component
interface EditTreatmentFormProps {
  treatment: ToothTreatment
  onSave: (id: string, updates: Partial<ToothTreatment>) => Promise<void>
  onCancel: () => void
}

function EditTreatmentFormContent({ treatment, onSave, onCancel }: EditTreatmentFormProps) {
  const { isDarkMode } = useTheme()
  const { createPayment, updatePayment, getPaymentsByPatient } = usePaymentStore()
  const { patients } = usePatientStore()
  const { labs, loadLabs } = useLabStore()
  const { createLabOrder, getLabOrdersByTreatment, updateLabOrder, deleteLabOrder, loadLabOrders } = useLabOrderStore()
  const [editData, setEditData] = useState<Partial<ToothTreatment>>({
    treatment_type: treatment.treatment_type,
    treatment_category: treatment.treatment_category,
    treatment_status: treatment.treatment_status,
    cost: treatment.cost,
    start_date: treatment.start_date,
    completion_date: treatment.completion_date,
    notes: treatment.notes
  })


  const [selectedCategory, setSelectedCategory] = useState(treatment.treatment_category || '')
  const [originalCost] = useState(treatment.cost || 0) // حفظ التكلفة الأصلية للمقارنة
  const [selectedLab, setSelectedLab] = useState<string>('')
  const [labCost, setLabCost] = useState<number>(0)
  const [isLabDataLoaded, setIsLabDataLoaded] = useState(false)
  const [isDataLoaded, setIsDataLoaded] = useState(false) // متتبع لحالة تحميل البيانات

  // Helper functions for number formatting with thousands separators
  const formatNumberWithCommas = (value: string | number): string => {
    const stringValue = typeof value === 'number' ? value.toString() : value
    if (!stringValue) return ''
    // Remove any existing commas
    const cleanValue = stringValue.replace(/,/g, '')
    // Check if it's a valid number
    if (isNaN(Number(cleanValue))) return stringValue
    // Split into integer and decimal parts
    const parts = cleanValue.split('.')
    // Format integer part with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return parts.join('.')
  }

  const removeCommas = (value: string): string => {
    return value.replace(/,/g, '')
  }

  // دالة بسيطة للحصول على طلب المختبر المرتبط بالعلاج
  const getLabOrderForTreatment = async (treatmentId: string) => {
    await loadLabOrders() // تحميل أحدث البيانات
    const orders = getLabOrdersByTreatment(treatmentId)
    return orders.find(order => order.tooth_treatment_id === treatmentId) || null
  }

  // دالة بسيطة للبحث المباشر في قاعدة البيانات
  const findLabOrderDirectly = async (treatmentId: string) => {
    try {
      const allLabOrders = await window.electronAPI?.labOrders?.getAll() || []

      // البحث عن طلب مرتبط بالعلاج
      const linkedOrder = allLabOrders.find(order => order.tooth_treatment_id === treatmentId)

      if (linkedOrder) {
        return linkedOrder
      }

      // إذا لم نجد طلب مرتبط، ابحث عن طلب غير مرتبط لنفس المريض
      const unlinkedOrder = allLabOrders.find(order =>
        !order.tooth_treatment_id &&
        order.patient_id === treatment.patient_id
      )

      if (unlinkedOrder) {
        // ربط الطلب بالعلاج تلقائياً
        try {
          await updateLabOrder(unlinkedOrder.id, {
            tooth_treatment_id: treatmentId,
            tooth_number: treatment.tooth_number
          })

          return { ...unlinkedOrder, tooth_treatment_id: treatmentId }
        } catch (linkError) {
          return unlinkedOrder // إرجاع الطلب حتى لو فشل الربط
        }
      }

      return null
    } catch (error) {
      return null
    }
  }



  // دالة بسيطة لإعادة تحميل بيانات المختبر
  const reloadLabData = async () => {
    if (treatment.treatment_category === 'التعويضات') {
      const labOrder = await findLabOrderDirectly(treatment.id)

      if (labOrder) {
        setSelectedLab(labOrder.lab_id || '')
        setLabCost(labOrder.cost || 0)
        notify.success('تم إعادة تحميل بيانات المختبر')
      } else {
        setSelectedLab('')
        setLabCost(0)
        notify.info('لا يوجد طلب مختبر لهذا العلاج')
      }
    } else {
      notify.info('هذا العلاج ليس من فئة التعويضات')
    }
  }

  // تحميل بيانات المختبر عند فتح النموذج - حل مباشر وفوري
  useEffect(() => {
    const loadLabData = async () => {
      try {
        setIsLabDataLoaded(false)

        // تحميل المخابر أولاً
        await loadLabs()

        // تعيين الفئة المختارة
        setSelectedCategory(treatment.treatment_category || '')

        // إذا كان العلاج من فئة التعويضات، ابحث عن طلب المختبر المرتبط
        if (treatment.treatment_category === 'التعويضات') {
          // البحث المباشر عن طلب المختبر المرتبط بهذا العلاج
          const labOrder = await findLabOrderDirectly(treatment.id)

          if (labOrder) {
            // تعيين البيانات مباشرة
            setSelectedLab(labOrder.lab_id || '')
            setLabCost(labOrder.cost || 0)
          } else {
            setSelectedLab('')
            setLabCost(0)
          }
        } else {
          // ليس علاج تعويضات
          setSelectedLab('')
          setLabCost(0)
        }

        setIsLabDataLoaded(true)
      } catch (error) {
        setSelectedLab('')
        setLabCost(0)
        setIsLabDataLoaded(true)
      }
    }

    loadLabData()
  }, [treatment.id, treatment.treatment_category, loadLabs])

  // مراقبة تغيير الفئة - حل بسيط
  useEffect(() => {
    if (selectedCategory !== 'التعويضات') {
      // إذا تم تغيير الفئة من التعويضات، امسح بيانات المختبر
      setSelectedLab('')
      setLabCost(0)
    }
  }, [selectedCategory])

  // مراقبة تغيير قيم المختبر للتشخيص
  useEffect(() => {
    console.log('🔍 Lab values changed:', {
      selectedLab,
      labCost,
      isLabDataLoaded,
      treatmentId: treatment.id,
      category: treatment.treatment_category
    })
  }, [selectedLab, labCost, isLabDataLoaded, treatment.id, treatment.treatment_category])

  const filteredTreatmentTypes = selectedCategory
    ? getTreatmentsByCategory(selectedCategory as any)
    : []

  // تجميع علاجات التعويضات في مجموعات لتحسين العرض
  const groupProstheticTreatments = (treatments: typeof TREATMENT_TYPES) => {
    if (selectedCategory !== 'التعويضات') {
      return treatments
    }

    const groups = {
      crowns: treatments.filter(t =>
        t.value.includes('crown') && !t.value.includes('implant')
      ),
      bridges: treatments.filter(t =>
        t.value.includes('bridge')
      ),
      dentures: treatments.filter(t =>
        t.value.includes('denture')
      ),
      implants: treatments.filter(t =>
        t.value.includes('implant')
      ),
      posts: treatments.filter(t =>
        t.value.includes('post') || t.value.includes('core')
      ),
      veneers: treatments.filter(t =>
        t.value.includes('veneer')
      )
    }

    return { groups, isGrouped: true }
  }

  const groupedTreatments = groupProstheticTreatments(filteredTreatmentTypes)

  // دالة تحديث المدفوعات المرتبطة بالعلاج المُعدّل
  const updatePaymentsForEditedTreatment = async () => {
    try {
      // الحصول على بيانات المريض
      const patient = patients.find(p => p.id === treatment.patient_id)
      if (!patient) {
        notify.error('لم يتم العثور على بيانات المريض')
        return
      }

      // البحث عن جميع المدفوعات المرتبطة بهذا العلاج المحدد
      const patientPayments = getPaymentsByPatient(treatment.patient_id)
      const treatmentPayments = patientPayments.filter(payment =>
        payment.tooth_treatment_id === treatment.id
      )

      // إنشاء وصف للدفعة
      const treatmentTypeInfo = getTreatmentByValue(editData.treatment_type!)
      const description = `علاج ${treatmentTypeInfo?.label || editData.treatment_type} - سن ${treatment.tooth_name || treatment.tooth_number}`

      if (treatmentPayments.length > 0) {
        // حساب إجمالي المدفوع لهذا العلاج (من جميع المدفوعات)
        const totalPaidForTreatment = treatmentPayments.reduce((sum, p) => sum + p.amount, 0)
        const newCost = editData.cost || 0
        const remainingBalance = Math.max(0, newCost - totalPaidForTreatment)

        // تحديد الحالة الجديدة
        let newStatus: 'completed' | 'partial' | 'pending'
        if (newCost <= 0) {
          // إذا كانت التكلفة صفر أو أقل، اجعل الحالة مكتملة
          newStatus = 'completed'
        } else if (remainingBalance <= 0 && totalPaidForTreatment > 0) {
          newStatus = 'completed'
        } else if (totalPaidForTreatment > 0) {
          newStatus = 'partial'
        } else {
          newStatus = 'pending'
        }

        // تحديث جميع المدفوعات المرتبطة بالعلاج
        for (const payment of treatmentPayments) {
          const updatedPaymentData = {
            tooth_treatment_id: treatment.id,
            description: description,
            notes: `دفعة لعلاج سن ${treatment.tooth_name || treatment.tooth_number} (تم تعديل التكلفة)`,
            total_amount_due: newCost,
            remaining_balance: remainingBalance,
            treatment_total_cost: newCost,
            treatment_total_paid: totalPaidForTreatment,
            treatment_remaining_balance: remainingBalance,
            status: newStatus
          }

          await updatePayment(payment.id, updatedPaymentData)
        }
        notify.success('تم تحديث المدفوعات المرتبطة بالعلاج')
      } else if ((editData.cost || 0) > 0) {
        // إنشاء دفعة آجلة جديدة إذا لم توجد مدفوعات سابقة وكانت التكلفة أكبر من صفر
        const paymentData = {
          patient_id: treatment.patient_id,
          tooth_treatment_id: treatment.id,
          amount: 0,
          payment_method: 'cash' as const,
          payment_date: new Date().toISOString().split('T')[0],
          description: description,
          status: 'pending' as const,
          notes: `دفعة آجلة لعلاج سن ${treatment.tooth_name || treatment.tooth_number} (تم تعديل التكلفة)`,
          total_amount_due: editData.cost || 0,
          amount_paid: 0,
          remaining_balance: editData.cost || 0,
          treatment_total_cost: editData.cost || 0,
          treatment_total_paid: 0,
          treatment_remaining_balance: editData.cost || 0
        }

        await createPayment(paymentData)
        notify.success('تم إنشاء دفعة آجلة في جدول المدفوعات')
      }
    } catch (error) {
      console.error('خطأ في تحديث المدفوعات:', error)
      notify.error('فشل في تحديث المدفوعات')
    }
  }

  const handleSave = async () => {
    if (!editData.treatment_type) {
      notify.error('يرجى اختيار نوع العلاج')
      return
    }

    // التحقق من حقول المخبر للتعويضات
    if (selectedCategory === 'التعويضات' && labCost > 0 && !selectedLab) {
      notify.error('يرجى اختيار المخبر عند إدخال تكلفة المخبر')
      return
    }

    try {
      const updatedData = {
        ...editData,
        treatment_color: getTreatmentByValue(editData.treatment_type!)?.color || treatment.treatment_color
      }
      await onSave(treatment.id, updatedData)

      // تحديث المدفوعات المرتبطة بالعلاج إذا تم تعديل التكلفة
      const newCost = editData.cost || 0
      const originalCostValue = originalCost || 0
      if (newCost !== originalCostValue) {
        await updatePaymentsForEditedTreatment()
      }

      // إدارة طلب المختبر للتعويضات - حل بسيط ومباشر
      if (selectedCategory === 'التعويضات') {
        if (labCost > 0 && selectedLab) {
          // البحث عن طلب المختبر المرتبط بهذا العلاج
          const existingOrder = await findLabOrderDirectly(treatment.id)

          const treatmentTypeInfo = getTreatmentByValue(editData.treatment_type!)
          const serviceName = `${treatmentTypeInfo?.label || editData.treatment_type || 'علاج تعويضات'} - السن ${treatment.tooth_number}`

          if (existingOrder) {
            // تحديث طلب المختبر الموجود
            try {
              await updateLabOrder(existingOrder.id, {
                lab_id: selectedLab,
                cost: labCost,
                service_name: serviceName,
                remaining_balance: labCost - (existingOrder.paid_amount || 0)
              })

              notify.success('تم تحديث طلب المختبر بنجاح')
            } catch (error) {
              notify.error('فشل في تحديث طلب المختبر')
            }
          } else {
            // إنشاء طلب مختبر جديد
            try {
              await createLabOrder({
                lab_id: selectedLab,
                patient_id: treatment.patient_id,
                tooth_treatment_id: treatment.id,
                tooth_number: treatment.tooth_number,
                service_name: serviceName,
                cost: labCost,
                order_date: new Date().toISOString().split('T')[0],
                status: 'آجل' as const,
                paid_amount: 0,
                remaining_balance: labCost
              })

              notify.success('تم إنشاء طلب المختبر بنجاح')
            } catch (error) {
              notify.error('فشل في إنشاء طلب المختبر')
            }
          }
        } else {
          // إذا لم يتم تحديد مختبر أو تكلفة، احذف طلب المختبر الموجود
          const existingOrder = await findLabOrderDirectly(treatment.id)
          if (existingOrder) {
            try {
              await deleteLabOrder(existingOrder.id)
              notify.info('تم حذف طلب المختبر')
            } catch (error) {
              notify.error('فشل في حذف طلب المختبر')
            }
          }
        }
      } else {
        // إذا تم تغيير التصنيف من التعويضات، احذف طلب المختبر
        const existingOrder = await findLabOrderDirectly(treatment.id)
        if (existingOrder) {
          try {
            await deleteLabOrder(existingOrder.id)
            notify.info('تم حذف طلب المختبر لتغيير تصنيف العلاج')
          } catch (error) {
            notify.error('فشل في حذف طلب المختبر')
          }
        }
      }

      onCancel() // إغلاق نموذج التعديل
    } catch (error) {
      console.error('Error updating treatment:', error)
      notify.error('فشل في حفظ التغييرات')
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>تصنيف العلاج</Label>
          <Select
            value={selectedCategory}
            onValueChange={(value) => {
              setSelectedCategory(value)
              setEditData(prev => ({ ...prev, treatment_category: value }))
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر التصنيف" />
            </SelectTrigger>
            <SelectContent>
              {TREATMENT_CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  <div className="flex items-center gap-2">
                    <span>{category.icon}</span>
                    <span>{category.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>نوع العلاج</Label>
          <Select
            value={editData.treatment_type || ''}
            onValueChange={(value) => setEditData(prev => ({ ...prev, treatment_type: value }))}
            disabled={!selectedCategory}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر نوع العلاج" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {selectedCategory === 'التعويضات' && groupedTreatments.isGrouped ? (
                <>
                  {/* التيجان */}
                  {groupedTreatments.groups.crowns.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        👑 التيجان
                      </SelectLabel>
                      {groupedTreatments.groups.crowns.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: type.color }}
                            />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                    </SelectGroup>
                  )}

                  {/* الجسور */}
                  {groupedTreatments.groups.bridges.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                        🌉 الجسور
                      </SelectLabel>
                      {groupedTreatments.groups.bridges.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: type.color }}
                            />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                    </SelectGroup>
                  )}

                  {/* الأجهزة المتحركة */}
                  {groupedTreatments.groups.dentures.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        🦷 الأجهزة المتحركة
                      </SelectLabel>
                      {groupedTreatments.groups.dentures.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: type.color }}
                            />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                    </SelectGroup>
                  )}

                  {/* تعويضات الزرعات */}
                  {groupedTreatments.groups.implants.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        🔩 تعويضات الزرعات
                      </SelectLabel>
                      {groupedTreatments.groups.implants.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: type.color }}
                            />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                    </SelectGroup>
                  )}

                  {/* القلوب والأوتاد */}
                  {groupedTreatments.groups.posts.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        🔧 القلوب والأوتاد
                      </SelectLabel>
                      {groupedTreatments.groups.posts.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: type.color }}
                            />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                    </SelectGroup>
                  )}

                  {/* الفينير */}
                  {groupedTreatments.groups.veneers.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
                        ✨ الفينير
                      </SelectLabel>
                      {groupedTreatments.groups.veneers.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: type.color }}
                            />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </>
              ) : (
                // العرض العادي للتصنيفات الأخرى
                filteredTreatmentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: type.color }}
                      />
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>حالة العلاج</Label>
          <Select
            value={editData.treatment_status || 'planned'}
            onValueChange={(value) => {
              setEditData(prev => ({
                ...prev,
                treatment_status: value as any,
                // Set completion date to today if status is completed and no date is set
                completion_date: value === 'completed' && !prev.completion_date
                  ? new Date().toISOString().split('T')[0]
                  : prev.completion_date
              }))

              // إرسال إشعار فوري لتحديث ألوان الأسنان عند تغيير الحالة
              if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('tooth-color-update', {
                  detail: {
                    type: 'status-preview',
                    treatmentId: treatment.id,
                    newStatus: value,
                    timestamp: Date.now()
                  }
                }))
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TREATMENT_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* حقل التكلفة */}
        <div className="space-y-2">
          <Label className={cn(
            "font-medium",
            isDarkMode ? "text-orange-200" : "text-orange-800"
          )}>التكلفة ($)</Label>
          <Input
            type="text"
            value={formatNumberWithCommas((editData.cost || 0).toString())}
            onChange={(e) => {
              // منع انتشار حدث التغيير
              e.stopPropagation()
              const rawValue = removeCommas(e.target.value)
              // Allow only numbers and one decimal point
              if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                setEditData(prev => ({
                  ...prev,
                  cost: rawValue === '' ? 0 : parseFloat(rawValue) || 0
                }))
              }
            }}
            onBlur={(e) => {
              // منع انتشار حدث فقدان التركيز
              e.stopPropagation()
              const rawValue = removeCommas(e.target.value)
              const value = parseFloat(rawValue) || 0
              setEditData(prev => ({ ...prev, cost: value }))
            }}
            onInput={(e) => {
              // منع انتشار حدث الإدخال
              e.stopPropagation()
              if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
                e.nativeEvent.stopImmediatePropagation()
              }
            }}
            onKeyDown={(e) => {
              // معالجة خاصة لمفتاح Escape - منع إغلاق الحوار
              if (e.key === 'Escape') {
                e.preventDefault()
                // مسح المحتوى بدلاً من إغلاق الحوار
                setEditData(prev => ({ ...prev, cost: 0 }))
                return
              }

              // السماح بالمفاتيح الأساسية للإدخال الرقمي
              const allowedKeys = [
                'Backspace', 'Delete', 'Tab', 'Enter',
                'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                'Home', 'End', '.'
              ]

              // السماح بالأرقام والمفاتيح المسموحة
              if (allowedKeys.includes(e.key) ||
                  (e.key >= '0' && e.key <= '9') ||
                  (e.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase()))) {
                // السماح بالمفتاح
                return
              }

              // منع أي مفاتيح أخرى
              e.preventDefault()
            }}
            onFocus={(e) => {
              // منع انتشار حدث التركيز
              e.stopPropagation()
            }}
            onClick={(e) => {
              // منع انتشار حدث النقر
              e.stopPropagation()
            }}
            placeholder="0.00"
            data-prevent-shortcuts="true"
            className={cn(
              "border-2 transition-colors",
              isDarkMode
                ? "border-orange-800/50 bg-orange-950/30 hover:border-orange-700 focus:border-orange-600"
                : "border-orange-200 bg-white hover:border-orange-300 focus:border-orange-500"
            )}
          />
          {editData.cost && editData.cost > 0 && editData.cost !== originalCost && (
            <p className={cn(
              "text-xs",
              isDarkMode ? "text-orange-300" : "text-orange-600"
            )}>
              💡 سيتم إنشاء دفعة آجلة عند تعديل التكلفة
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>تاريخ العلاج</Label>
          <Input
            type="date"
            value={editData.start_date || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, start_date: e.target.value }))}
            onKeyDown={(e) => {
              // منع انتشار أحداث لوحة المفاتيح إلى Dialog
              e.stopPropagation()

              // معالجة خاصة لمفتاح Escape - منع إغلاق الحوار
              if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                return
              }
            }}
            onFocus={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            data-prevent-shortcuts="true"
          />
        </div>
      </div>

      {/* حقول المخبر - تظهر فقط لعلاجات التعويضات */}
      {(selectedCategory === 'التعويضات' || treatment.treatment_category === 'التعويضات') && (
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-xl border-2 shadow-sm transition-all duration-200",
          isDarkMode
            ? "bg-gradient-to-br from-purple-950/30 to-purple-900/20 border-purple-700/40 shadow-purple-900/10"
            : "bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-300/60 shadow-purple-200/20"
        )}>
          {/* عنوان الكارد */}
          <div className="md:col-span-2 mb-2">
            <div className={cn(
              "flex items-center gap-3 text-sm font-semibold",
              isDarkMode ? "text-purple-200" : "text-purple-800"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-lg",
                isDarkMode
                  ? "bg-purple-800/40 text-purple-200"
                  : "bg-purple-200/60 text-purple-700"
              )}>
                🏭
              </div>
              <span>معلومات المخبر</span>
              {/* زر إعادة تحميل البيانات */}
              <button
                type="button"
                onClick={reloadLabData}
                className={cn(
                  "text-xs px-2 py-1 rounded hover:scale-105 transition-all",
                  isDarkMode
                    ? "bg-purple-700/50 text-purple-200 hover:bg-purple-600/50"
                    : "bg-purple-200 text-purple-700 hover:bg-purple-300"
                )}
                title="إعادة تحميل بيانات المخبر وربط الطلبات غير المرتبطة"
              >
                🔄
              </button>
              {/* زر ربط طلبات المخبر */}
              <button
                type="button"
                onClick={async () => {
                  const linked = await linkUnlinkedLabOrder(treatment.id)
                  if (linked) {
                    await reloadLabData()
                  } else {
                    notify.info('لا توجد طلبات مخبر غير مرتبطة لهذا المريض')
                  }
                }}
                className={cn(
                  "text-xs px-2 py-1 rounded hover:scale-105 transition-all",
                  isDarkMode
                    ? "bg-blue-700/50 text-blue-200 hover:bg-blue-600/50"
                    : "bg-blue-200 text-blue-700 hover:bg-blue-300"
                )}
                title="ربط طلبات المخبر غير المرتبطة"
              >
                🔗
              </button>
              <div className={cn(
                "h-px flex-1 ml-2",
                isDarkMode ? "bg-purple-700/30" : "bg-purple-300/50"
              )}></div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className={cn(
              "font-medium flex items-center gap-2 text-sm",
              isDarkMode ? "text-purple-100" : "text-purple-900"
            )}>
              🏭 اختيار المخبر
              {!isLabDataLoaded && <span className="text-xs animate-pulse">⏳ جاري التحميل...</span>}
            </Label>
            <Select
              key={`lab-select-${treatment.id}-${selectedLab}`}
              value={selectedLab}
              onValueChange={setSelectedLab}
            >
              <SelectTrigger className={cn(
                "border-2 transition-all duration-200 h-11",
                isDarkMode
                  ? "border-purple-700/50 bg-purple-950/40 hover:border-purple-600 focus:border-purple-500 text-purple-100"
                  : "border-purple-300/70 bg-white hover:border-purple-400 focus:border-purple-500 text-purple-900"
              )}>
                <SelectValue placeholder="اختر المخبر" />
              </SelectTrigger>
              <SelectContent className={cn(
                isDarkMode
                  ? "bg-purple-950 border-purple-700"
                  : "bg-white border-purple-200"
              )}>
                {labs.map((lab) => (
                  <SelectItem key={lab.id} value={lab.id}>
                    <div className="flex items-center gap-2">
                      <span>🏭</span>
                      <span>{lab.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          <div className="space-y-3">
            <Label className={cn(
              "font-medium flex items-center gap-2 text-sm",
              isDarkMode ? "text-purple-100" : "text-purple-900"
            )}>
              💰 تكلفة المخبر ($)
            </Label>
            <Input
              key={`lab-cost-${treatment.id}-${labCost}`}
              type="text"
              value={formatNumberWithCommas(labCost.toString())}
              onChange={(e) => {
                // منع انتشار حدث التغيير
                e.stopPropagation()
                const rawValue = removeCommas(e.target.value)
                // Allow only numbers and one decimal point
                if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                  setLabCost(rawValue === '' ? 0 : parseFloat(rawValue) || 0)
                }
              }}
              onBlur={(e) => {
                // منع انتشار حدث فقدان التركيز
                e.stopPropagation()
                const rawValue = removeCommas(e.target.value)
                const value = parseFloat(rawValue) || 0
                setLabCost(value)
              }}
              onInput={(e) => {
                // منع انتشار حدث الإدخال
                e.stopPropagation()
                if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
                  e.nativeEvent.stopImmediatePropagation()
                }
              }}
              onKeyDown={(e) => {
                // معالجة خاصة لمفتاح Escape - منع إغلاق الحوار
                if (e.key === 'Escape') {
                  e.preventDefault()
                  // مسح المحتوى بدلاً من إغلاق الحوار
                  setLabCost(0)
                  return
                }

                // السماح بالمفاتيح الأساسية للإدخال الرقمي
                const allowedKeys = [
                  'Backspace', 'Delete', 'Tab', 'Enter',
                  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                  'Home', 'End', '.'
                ]

                // السماح بالأرقام والمفاتيح المسموحة
                if (allowedKeys.includes(e.key) ||
                    (e.key >= '0' && e.key <= '9') ||
                    (e.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase()))) {
                  // السماح بالمفتاح
                  return
                }

                // منع أي مفاتيح أخرى
                e.preventDefault()
              }}
              placeholder="0.00"
              className={cn(
                "border-2 transition-all duration-200 h-11",
                isDarkMode
                  ? "border-purple-700/50 bg-purple-950/40 hover:border-purple-600 focus:border-purple-500 text-purple-100 placeholder:text-purple-400"
                  : "border-purple-300/70 bg-white hover:border-purple-400 focus:border-purple-500 text-purple-900 placeholder:text-purple-500"
              )}
            />
            {labCost > 0 && (
              <div className={cn(
                "flex items-center gap-2 text-xs p-2 rounded-lg",
                isDarkMode
                  ? "bg-purple-800/30 text-purple-200 border border-purple-700/30"
                  : "bg-purple-100/70 text-purple-700 border border-purple-200/50"
              )}>
                <span className="text-sm">✨</span>
                <span>سيتم تحديث طلب المخبر تلقائياً</span>
              </div>
            )}
          </div>
        </div>
      )}

      {editData.treatment_status === 'completed' && (
        <div className="space-y-2">
          <Label>تاريخ الإنجاز</Label>
          <Input
            type="date"
            value={editData.completion_date || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, completion_date: e.target.value }))}
            onKeyDown={(e) => {
              // منع انتشار أحداث لوحة المفاتيح إلى Dialog
              e.stopPropagation()

              // معالجة خاصة لمفتاح Escape - منع إغلاق الحوار
              if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                return
              }
            }}
            onFocus={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            data-prevent-shortcuts="true"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>ملاحظات</Label>
        <Textarea
          value={editData.notes || ''}
          onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="أدخل أي ملاحظات إضافية..."
          rows={3}
          onKeyDown={(e) => {
            // منع انتشار أحداث لوحة المفاتيح إلى Dialog
            e.stopPropagation()

            // معالجة خاصة لمفتاح Escape - منع إغلاق الحوار
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              return
            }
          }}
          onFocus={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          data-prevent-shortcuts="true"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 ml-2" />
          إلغاء
        </Button>
        <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700">
          <Save className="w-4 h-4 ml-2" />
          حفظ التغييرات
        </Button>
      </div>
    </div>
  )
}
