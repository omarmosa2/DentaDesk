import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { notify } from '@/services/notificationService'
import { cn } from '@/lib/utils'
import {
  TREATMENT_TYPES,
  TREATMENT_CATEGORIES,
  getTreatmentsByCategory,
  getTreatmentByValue
} from '@/data/teethData'
import { ToothTreatment } from '@/types'
import { useLabStore } from '@/store/labStore'
import { usePaymentStore } from '@/store/paymentStore'
import { useLabOrderStore } from '@/store/labOrderStore'
import { usePatientStore } from '@/store/patientStore'
import { Activity, Plus, X } from 'lucide-react'

interface MultipleToothTreatmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  selectedTeeth: number[]
  onAddTreatments: (treatments: Omit<ToothTreatment, 'id' | 'created_at' | 'updated_at'>[]) => Promise<ToothTreatment[]>
}

export default function MultipleToothTreatmentDialog({
  open,
  onOpenChange,
  patientId,
  selectedTeeth,
  onAddTreatments
}: MultipleToothTreatmentDialogProps) {
  const { isDarkMode } = useTheme()
  const { labs, loadLabs } = useLabStore()
  const { createPayment } = usePaymentStore()
  const { createLabOrder } = useLabOrderStore()
  const { patients } = usePatientStore()

  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedLab, setSelectedLab] = useState<string>('')
  const [labCost, setLabCost] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [treatmentData, setTreatmentData] = useState<Partial<ToothTreatment>>({
    patient_id: patientId,
    treatment_status: 'planned',
    cost: 0,
    start_date: new Date().toISOString().split('T')[0]
  })

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

  useEffect(() => {
    if (open) {
      loadLabs()
    }
  }, [open, loadLabs])

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setTreatmentData(prev => ({
      ...prev,
      treatment_category: category,
      treatment_type: '' // Reset treatment type when category changes
    }))
  }

  const handleTreatmentTypeChange = (treatmentType: string) => {
    const treatment = getTreatmentByValue(treatmentType)
    setTreatmentData(prev => ({
      ...prev,
      treatment_type: treatmentType,
      treatment_color: treatment?.color || '#22c55e'
    }))
  }

  // دالة إنشاء دفعة آجلة للعلاج
  const createPendingPaymentForTreatment = async (treatmentId: string, toothNumbers: number[]) => {
    console.log('💰 [DEBUG] createPendingPaymentForTreatment called:', {
      treatmentId,
      cost: treatmentData.cost,
      patientId,
      toothNumbers
    })

    // التحقق من المتطلبات الأساسية
    if (!treatmentId) {
      console.error('❌ [DEBUG] Cannot create payment - missing treatment ID')
      throw new Error('معرف العلاج مطلوب لإنشاء الدفعة')
    }

    if (!treatmentData.cost || treatmentData.cost <= 0) {
      console.log('⚠️ [DEBUG] Skipping payment creation - no cost specified')
      return
    }

    try {
      // الحصول على بيانات المريض
      const patient = patients.find(p => p.id === patientId)
      if (!patient) {
        throw new Error('لم يتم العثور على بيانات المريض')
      }

      const treatmentTypeInfo = getTreatmentByValue(treatmentData.treatment_type!)
      const teethDescription = toothNumbers.length > 1
        ? `الأسنان ${toothNumbers.join(', ')}`
        : `السن ${toothNumbers[0]}`
      const description = `${treatmentTypeInfo?.label || treatmentData.treatment_type} - ${teethDescription}`

      // بيانات الدفعة الآجلة
      const paymentData = {
        patient_id: patientId,
        tooth_treatment_id: treatmentId, // ربط مباشر بالعلاج
        amount: 0, // مبلغ مدفوع = 0 لجعل الحالة آجلة
        payment_method: 'cash' as const,
        payment_date: new Date().toISOString().split('T')[0],
        description: description, // وصف نظيف بدون معرف العلاج
        status: 'pending' as const,
        notes: `دفعة آجلة للمريض: ${patient.full_name} - ${teethDescription} - العلاج: ${treatmentTypeInfo?.label || treatmentData.treatment_type}`,
        total_amount_due: treatmentData.cost,
        amount_paid: 0,
        remaining_balance: treatmentData.cost,
        treatment_total_cost: treatmentData.cost,
        treatment_total_paid: 0,
        treatment_remaining_balance: treatmentData.cost
      }

      console.log('💰 [DEBUG] Creating payment with data:', paymentData)

      await createPayment(paymentData)

      console.log('✅ [DEBUG] Payment created successfully for treatment:', treatmentId)

    } catch (error) {
      console.error('❌ [DEBUG] Payment creation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
      notify.error(`فشل في إنشاء الدفعة الآجلة للأسنان المحددة: ${errorMessage}`)
      throw error
    }
  }

  // دالة إنشاء طلب مختبر للعلاج
  const createLabOrderForTreatment = async (treatmentId: string, toothNumbers: number[]) => {
    console.log('🧪 [DEBUG] createLabOrderForTreatment called:', {
      treatmentId,
      labCost,
      selectedLab,
      patientId,
      toothNumbers
    })

    try {
      const patient = patients.find(p => p.id === patientId)
      const treatmentType = getTreatmentByValue(treatmentData.treatment_type!)

      // التحقق من وجود بيانات المريض
      if (!patient) {
        throw new Error('لم يتم العثور على بيانات المريض')
      }

      const teethDescription = toothNumbers.length > 1
        ? `الأسنان ${toothNumbers.join(', ')}`
        : `السن ${toothNumbers[0]}`

      const labOrderData = {
        lab_id: selectedLab,
        patient_id: patientId,
        tooth_treatment_id: treatmentId,
        tooth_number: toothNumbers[0],
        service_name: `${treatmentType?.label || 'علاج تعويضات'} - ${teethDescription}`,
        cost: labCost,
        order_date: new Date().toISOString().split('T')[0],
        status: 'آجل' as const,
        notes: `طلب مخبر للمريض: ${patient.full_name} - ${teethDescription} - العلاج: ${treatmentType?.label || treatmentData.treatment_type}`,
        paid_amount: 0,
        remaining_balance: labCost
      }

      // إنشاء طلب المختبر
      await createLabOrder(labOrderData)

      console.log('✅ [DEBUG] Lab order created successfully for treatment:', treatmentId)

    } catch (error) {
      console.error('❌ [DEBUG] Lab order creation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
      notify.error(`فشل في إنشاء طلب المختبر للأسنان المحددة: ${errorMessage}`)
      throw error
    }
  }

  const handleSubmit = async () => {
    if (!treatmentData.treatment_type || !treatmentData.treatment_category) {
      notify.error('يرجى اختيار نوع العلاج والتصنيف')
      return
    }

    // التحقق من بيانات المختبر للتعويضات
    if (treatmentData.treatment_category === 'التعويضات' && labCost > 0 && !selectedLab) {
      notify.error('يرجى اختيار المختبر عند إدخال تكلفة المختبر للتعويضات')
      return
    }

    setIsSubmitting(true)

    try {
      const sortedSelectedTeeth = [...selectedTeeth].sort((a, b) => a - b)
      const teethDescription = sortedSelectedTeeth.length > 1
        ? `الأسنان ${sortedSelectedTeeth.join(', ')}`
        : `السن ${sortedSelectedTeeth[0]}`

      const treatmentToCreate: Omit<ToothTreatment, 'id' | 'created_at' | 'updated_at'> = {
        ...treatmentData,
        patient_id: patientId,
        tooth_number: sortedSelectedTeeth[0],
        tooth_numbers: sortedSelectedTeeth,
        tooth_name: teethDescription,
        treatment_type: treatmentData.treatment_type!,
        treatment_category: treatmentData.treatment_category!,
        treatment_color: treatmentData.treatment_color || '#22c55e',
        treatment_status: treatmentData.treatment_status || 'planned',
        cost: treatmentData.cost || 0,
        start_date: treatmentData.start_date,
        notes: treatmentData.notes,
        priority: 1 // سيتم تعيينه تلقائياً في قاعدة البيانات
      }

      const createdTreatments = await onAddTreatments([treatmentToCreate])

      if (!createdTreatments || createdTreatments.length === 0) {
        throw new Error('فشل في إنشاء العلاج للأسنان المحددة')
      }

      const createdTreatment = createdTreatments[0]
      let successMessage = `تم إضافة علاج واحد مشترك لـ ${sortedSelectedTeeth.length} سن`

      if (treatmentData.cost && treatmentData.cost > 0) {
        try {
          await createPendingPaymentForTreatment(createdTreatment.id, sortedSelectedTeeth)
          successMessage += ' مع دفعة آجلة واحدة'
        } catch (paymentError) {
          console.error('❌ [DEBUG] Payment creation failed for multi-tooth treatment:', paymentError)
          notify.warning('تم إنشاء العلاج المشترك ولكن فشل في إنشاء الدفعة')
        }
      }

      if (treatmentData.treatment_category === 'التعويضات' && selectedLab && labCost > 0) {
        try {
          await createLabOrderForTreatment(createdTreatment.id, sortedSelectedTeeth)
          successMessage += ' وطلب مختبر واحد'
        } catch (labError) {
          console.error('❌ [DEBUG] Lab order creation failed for multi-tooth treatment:', labError)
          notify.warning('تم إنشاء العلاج والدفعة ولكن فشل في إنشاء طلب المختبر')
        }
      }

      notify.success(successMessage)
      resetForm()
      onOpenChange(false)

    } catch (error) {
      console.error('Error adding multiple treatments:', error)
      notify.error('فشل في إضافة العلاجات')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setTreatmentData({
      patient_id: patientId,
      treatment_status: 'planned',
      cost: 0,
      start_date: new Date().toISOString().split('T')[0]
    })
    setSelectedCategory('')
    setSelectedLab('')
    setLabCost(0)
  }

  const availableTreatments = selectedCategory 
    ? getTreatmentsByCategory(selectedCategory as any)
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            إضافة علاج للأسنان المحددة
          </DialogTitle>
          <DialogDescription>
            إضافة علاج واحد مشترك للأسنان المحددة ({selectedTeeth.length} سن) بتكلفة واحدة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Teeth Display */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-700 dark:text-blue-300">
                الأسنان المحددة
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {[...selectedTeeth].sort((a, b) => a - b).map(toothNumber => (
                  <Badge 
                    key={toothNumber}
                    variant="secondary"
                    className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    السن {toothNumber}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Treatment Category */}
          <div className="space-y-2">
            <Label>تصنيف العلاج</Label>
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="اختر تصنيف العلاج" />
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

          {/* Treatment Type */}
          {selectedCategory && (
            <div className="space-y-2">
              <Label>نوع العلاج</Label>
              <Select 
                value={treatmentData.treatment_type || ''} 
                onValueChange={handleTreatmentTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع العلاج" />
                </SelectTrigger>
                <SelectContent>
                  {availableTreatments.map((treatment) => (
                    <SelectItem key={treatment.value} value={treatment.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: treatment.color }}
                        />
                        <span>{treatment.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Treatment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>التكلفة</Label>
              <Input
                type="text"
                value={formatNumberWithCommas((treatmentData.cost || 0).toString())}
                onChange={(e) => {
                  const rawValue = removeCommas(e.target.value)
                  // Allow only numbers and one decimal point
                  if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                    setTreatmentData(prev => ({
                      ...prev,
                      cost: rawValue === '' ? 0 : parseFloat(rawValue) || 0
                    }))
                  }
                }}
                onBlur={(e) => {
                  const rawValue = removeCommas(e.target.value)
                  const value = parseFloat(rawValue) || 0
                  setTreatmentData(prev => ({ ...prev, cost: value }))
                }}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>تاريخ البدء</Label>
              <Input
                type="date"
                value={treatmentData.start_date || ''}
                onChange={(e) => setTreatmentData(prev => ({
                  ...prev,
                  start_date: e.target.value
                }))}
              />
            </div>
          </div>

          {/* Lab Information for Prosthetics */}
          {treatmentData.treatment_category === 'التعويضات' && (
            <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-purple-700 dark:text-purple-300">
                  معلومات المختبر
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المختبر</Label>
                    <Select value={selectedLab} onValueChange={setSelectedLab}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المختبر" />
                      </SelectTrigger>
                      <SelectContent>
                        {labs.map((lab) => (
                          <SelectItem key={lab.id} value={lab.id}>
                            {lab.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>تكلفة المختبر</Label>
                    <Input
                      type="text"
                      value={formatNumberWithCommas(labCost.toString())}
                      onChange={(e) => {
                        const rawValue = removeCommas(e.target.value)
                        // Allow only numbers and one decimal point
                        if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                          setLabCost(rawValue === '' ? 0 : parseFloat(rawValue) || 0)
                        }
                      }}
                      onBlur={(e) => {
                        const rawValue = removeCommas(e.target.value)
                        const value = parseFloat(rawValue) || 0
                        setLabCost(value)
                      }}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>ملاحظات</Label>
            <Textarea
              value={treatmentData.notes || ''}
              onChange={(e) => setTreatmentData(prev => ({
                ...prev,
                notes: e.target.value
              }))}
              placeholder="ملاحظات إضافية..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !treatmentData.treatment_type}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'جاري الإضافة...' : `إضافة علاج واحد لـ ${selectedTeeth.length} سن`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
