import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useLabStore } from '@/store/labStore'
import { useLabOrderStore } from '@/store/labOrderStore'
import { usePatientStore } from '@/store/patientStore'
import { formatCurrency } from '@/lib/utils'
import { notify } from '@/services/notificationService'
import {
  Microscope,
  Building2,
  User,
  DollarSign,
  Calendar,
  FileText,
  Loader2,
  CreditCard,
  Calculator
} from 'lucide-react'
import type { LabOrder } from '@/types'

interface AddLabOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingOrder?: LabOrder | null
}

export default function AddLabOrderDialog({ open, onOpenChange, editingOrder }: AddLabOrderDialogProps) {
  const { labs } = useLabStore()
  const { patients } = usePatientStore()
  const { createLabOrder, updateLabOrder, isLoading } = useLabOrderStore()

  const [formData, setFormData] = useState({
    lab_id: '',
    patient_id: '',
    appointment_id: '',
    tooth_treatment_id: '',
    tooth_number: '',
    service_name: '',
    cost: '',
    order_date: '',
    expected_delivery_date: '',
    actual_delivery_date: '',
    status: 'آجل' as const,
    notes: '',
    paid_amount: '',
    priority: '1',
    lab_instructions: '',
    material_type: '',
    color_shade: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when dialog opens/closes or when editing order changes
  useEffect(() => {
    if (open) {
      if (editingOrder) {
        setFormData({
          lab_id: editingOrder.lab_id || '',
          patient_id: editingOrder.patient_id || 'none',
          appointment_id: editingOrder.appointment_id || '',
          tooth_treatment_id: editingOrder.tooth_treatment_id || '',
          tooth_number: editingOrder.tooth_number?.toString() || '',
          service_name: editingOrder.service_name || '',
          cost: editingOrder.cost?.toString() || '',
          order_date: editingOrder.order_date || '',
          expected_delivery_date: editingOrder.expected_delivery_date || '',
          actual_delivery_date: editingOrder.actual_delivery_date || '',
          status: editingOrder.status || 'آجل',
          notes: editingOrder.notes || '',
          paid_amount: editingOrder.paid_amount?.toString() || '0',
          priority: editingOrder.priority?.toString() || '1',
          lab_instructions: editingOrder.lab_instructions || '',
          material_type: editingOrder.material_type || '',
          color_shade: editingOrder.color_shade || ''
        })
      } else {
        // Set default date to today
        const today = new Date().toISOString().split('T')[0]
        setFormData({
          lab_id: '',
          patient_id: 'none',
          appointment_id: '',
          tooth_treatment_id: '',
          tooth_number: '',
          service_name: '',
          cost: '',
          order_date: today,
          expected_delivery_date: '',
          actual_delivery_date: '',
          status: 'آجل',
          notes: '',
          paid_amount: '0',
          priority: '1',
          lab_instructions: '',
          material_type: '',
          color_shade: ''
        })
      }
      setErrors({})
    }
  }, [open, editingOrder])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.lab_id) {
      newErrors.lab_id = 'يجب اختيار المختبر'
    }

    if (!formData.service_name.trim()) {
      newErrors.service_name = 'اسم الخدمة/التحليل مطلوب'
    } else if (formData.service_name.trim().length < 2) {
      newErrors.service_name = 'اسم الخدمة يجب أن يكون على الأقل حرفين'
    }

    if (!formData.cost.trim()) {
      newErrors.cost = 'التكلفة مطلوبة'
    } else {
      const cost = parseFloat(formData.cost)
      if (isNaN(cost) || cost <= 0) {
        newErrors.cost = 'التكلفة يجب أن تكون رقم موجب'
      }
    }

    if (!formData.order_date) {
      newErrors.order_date = 'تاريخ الطلب مطلوب'
    }

    if (formData.paid_amount.trim()) {
      const paidAmount = parseFloat(formData.paid_amount)
      const cost = parseFloat(formData.cost)
      if (isNaN(paidAmount) || paidAmount < 0) {
        newErrors.paid_amount = 'المبلغ المدفوع يجب أن يكون رقم غير سالب'
      } else if (!isNaN(cost) && paidAmount > cost) {
        newErrors.paid_amount = 'المبلغ المدفوع لا يمكن أن يكون أكبر من التكلفة الإجمالية'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      const cost = parseFloat(formData.cost)
      const paidAmount = parseFloat(formData.paid_amount) || 0
      const remainingBalance = cost - paidAmount

      const orderData = {
        lab_id: formData.lab_id,
        patient_id: formData.patient_id === 'none' ? undefined : formData.patient_id || undefined,
        appointment_id: formData.appointment_id || undefined,
        tooth_treatment_id: formData.tooth_treatment_id || undefined,
        tooth_number: formData.tooth_number ? parseInt(formData.tooth_number) : undefined,
        service_name: formData.service_name.trim(),
        cost,
        order_date: formData.order_date,
        expected_delivery_date: formData.expected_delivery_date || undefined,
        actual_delivery_date: formData.actual_delivery_date || undefined,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
        paid_amount: paidAmount,
        remaining_balance: remainingBalance,
        priority: parseInt(formData.priority) || 1,
        lab_instructions: formData.lab_instructions.trim() || undefined,
        material_type: formData.material_type.trim() || undefined,
        color_shade: formData.color_shade.trim() || undefined
      }

      console.log('🔍 [DEBUG] Submitting lab order data:', orderData)
      
      // Additional validation before submission
      if (!orderData.lab_id) {
        throw new Error('Lab ID is required')
      }
      if (!orderData.service_name || orderData.service_name.trim().length === 0) {
        throw new Error('Service name is required')
      }
      if (!orderData.cost || orderData.cost <= 0) {
        throw new Error('Valid cost is required')
      }
      if (!orderData.order_date) {
        throw new Error('Order date is required')
      }

      if (editingOrder) {
        await updateLabOrder(editingOrder.id, orderData)
        notify.success('تم تحديث طلب المختبر بنجاح')
      } else {
        await createLabOrder(orderData)
        notify.success('تم إضافة طلب المختبر بنجاح')
      }

      onOpenChange(false)
    } catch (error) {
      console.error('Error saving lab order:', error)
      
      // More robust error handling
      let errorMessage = 'Unknown error occurred'
      let errorDetails = {}
      
      if (error instanceof Error) {
        errorMessage = error.message || 'Unknown error occurred'
        errorDetails = {
          message: error.message,
          stack: error.stack,
          name: error.name,
          cause: (error as any).cause
        }
      } else if (typeof error === 'string') {
        errorMessage = error
        errorDetails = { message: error, type: 'string' }
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = (error as any).message || JSON.stringify(error) || 'Object error occurred'
        errorDetails = {
          message: (error as any).message,
          stack: (error as any).stack,
          name: (error as any).name,
          type: typeof error,
          keys: Object.keys(error),
          stringified: JSON.stringify(error)
        }
      } else {
        errorMessage = `Unknown error type: ${typeof error}`
        errorDetails = { type: typeof error, value: error }
      }
      
      console.error('Error details:', errorDetails)
      console.error('Full error object:', error)
      console.error('Error constructor:', error?.constructor?.name)
      console.error('Error prototype:', Object.getPrototypeOf(error))
        
      notify.error(`${editingOrder ? 'فشل في تحديث طلب المختبر' : 'فشل في إضافة طلب المختبر'}: ${errorMessage}`)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const calculateRemainingBalance = () => {
    const cost = parseFloat(formData.cost) || 0
    const paidAmount = parseFloat(formData.paid_amount) || 0
    return cost - paidAmount
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right" dir="rtl">
          <DialogTitle className="flex items-center gap-2 justify-end text-right">
            <span>{editingOrder ? 'تعديل طلب المختبر' : 'إضافة طلب مختبر جديد'}</span>
            <Microscope className="h-5 w-5 text-purple-600" />
          </DialogTitle>
          <DialogDescription className="text-right">
            {editingOrder
              ? 'قم بتعديل معلومات طلب المختبر أدناه'
              : 'أدخل معلومات طلب المختبر الجديد أدناه'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lab Selection */}
            <div className="space-y-2">
              <Label htmlFor="lab_id" className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span>المختبر *</span>
              </Label>
              <Select
                value={formData.lab_id}
                onValueChange={(value) => handleInputChange('lab_id', value)}
                disabled={isLoading}
                dir="rtl"
              >
                <SelectTrigger className={`text-right bg-background border-input text-foreground ${errors.lab_id ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder="اختر المختبر" className="text-muted-foreground" />
                </SelectTrigger>
                <SelectContent>
                  {labs.map((lab) => (
                    <SelectItem key={lab.id} value={lab.id}>
                      {lab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.lab_id && (
                <p className="text-sm text-destructive text-right">{errors.lab_id}</p>
              )}
            </div>

            {/* Patient Selection */}
            <div className="space-y-2">
              <Label htmlFor="patient_id" className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
                <User className="h-4 w-4 text-green-600" />
                <span>المريض (اختياري)</span>
              </Label>
              <Select
                value={formData.patient_id}
                onValueChange={(value) => handleInputChange('patient_id', value)}
                disabled={isLoading}
                dir="rtl"
              >
                <SelectTrigger className="text-right bg-background border-input text-foreground">
                  <SelectValue placeholder="اختر المريض (اختياري)" className="text-muted-foreground" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون مريض محدد</SelectItem>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Service Name */}
          <div className="space-y-2">
            <Label htmlFor="service_name" className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
              <Microscope className="h-4 w-4 text-purple-600" />
              <span>اسم الخدمة *</span>
            </Label>
            <Input
              id="service_name"
              value={formData.service_name}
              onChange={(e) => handleInputChange('service_name', e.target.value)}
              placeholder="مثال: تحليل دم شامل، أشعة بانوراما، إلخ"
              className={`text-right ${errors.service_name ? 'border-destructive' : ''}`}
              disabled={isLoading}
              dir="rtl"
            />
            {errors.service_name && (
              <p className="text-sm text-destructive text-right">{errors.service_name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cost */}
            <div className="space-y-2">
              <Label htmlFor="cost" className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span>التكلفة *</span>
              </Label>
              <Input
                id="cost"
                type="number"
                step="0.1"
                min="0"
                value={formData.cost}
                onChange={(e) => handleInputChange('cost', e.target.value)}
                onBlur={(e) => {
                  const value = parseFloat(e.target.value) || 0
                  handleInputChange('cost', value.toString())
                }}
                placeholder="0.00"
                className={`text-right ${errors.cost ? 'border-destructive' : ''}`}
                disabled={isLoading}
                dir="rtl"
              />
              {errors.cost && (
                <p className="text-sm text-destructive text-right">{errors.cost}</p>
              )}
            </div>

            {/* Paid Amount */}
            <div className="space-y-2">
              <Label htmlFor="paid_amount" className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span>المبلغ المدفوع</span>
              </Label>
              <Input
                id="paid_amount"
                type="number"
                step="0.1"
                min="0"
                value={formData.paid_amount}
                onChange={(e) => handleInputChange('paid_amount', e.target.value)}
                onBlur={(e) => {
                  const value = parseFloat(e.target.value) || 0
                  handleInputChange('paid_amount', value.toString())
                }}
                placeholder="0.00"
                className={`text-right ${errors.paid_amount ? 'border-destructive' : ''}`}
                disabled={isLoading}
                dir="rtl"
              />
              {errors.paid_amount && (
                <p className="text-sm text-destructive text-right">{errors.paid_amount}</p>
              )}
            </div>

            {/* Remaining Balance */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
                <Calculator className="h-4 w-4 text-orange-600" />
                <span>المبلغ المتبقي</span>
              </Label>
              <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center justify-end">
                <span className="text-sm font-medium">
                  {formatCurrency(calculateRemainingBalance())}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Order Date */}
            <div className="space-y-2">
              <Label htmlFor="order_date" className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>تاريخ الطلب *</span>
              </Label>
              <Input
                id="order_date"
                type="date"
                value={formData.order_date}
                onChange={(e) => handleInputChange('order_date', e.target.value)}
                className={`text-right ${errors.order_date ? 'border-destructive' : ''}`}
                disabled={isLoading}
                dir="rtl"
              />
              {errors.order_date && (
                <p className="text-sm text-destructive text-right">{errors.order_date}</p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
                <Microscope className="h-4 w-4 text-purple-600" />
                <span>الحالة *</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
                disabled={isLoading}
                dir="rtl"
              >
                <SelectTrigger className="text-right bg-background border-input text-foreground">
                  <SelectValue className="text-muted-foreground" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="آجل">آجل</SelectItem>
                  <SelectItem value="مكتمل">مكتمل</SelectItem>
                  <SelectItem value="ملغي">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Fields Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Expected Delivery Date */}
            <div className="space-y-2">
              <Label htmlFor="expected_delivery_date" className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
                <Calendar className="h-4 w-4 text-orange-600" />
                <span>تاريخ التسليم المتوقع</span>
              </Label>
              <Input
                id="expected_delivery_date"
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => handleInputChange('expected_delivery_date', e.target.value)}
                className="text-right"
                disabled={isLoading}
                dir="rtl"
              />
            </div>

            {/* Actual Delivery Date */}
            <div className="space-y-2">
              <Label htmlFor="actual_delivery_date" className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
                <Calendar className="h-4 w-4 text-green-600" />
                <span>تاريخ التسليم الفعلي</span>
              </Label>
              <Input
                id="actual_delivery_date"
                type="date"
                value={formData.actual_delivery_date}
                onChange={(e) => handleInputChange('actual_delivery_date', e.target.value)}
                className="text-right"
                disabled={isLoading}
                dir="rtl"
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority" className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
                <Calculator className="h-4 w-4 text-red-600" />
                <span>الأولوية</span>
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange('priority', value)}
                disabled={isLoading}
                dir="rtl"
              >
                <SelectTrigger className="text-right bg-background border-input text-foreground">
                  <SelectValue className="text-muted-foreground" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">عالية (1)</SelectItem>
                  <SelectItem value="2">متوسطة (2)</SelectItem>
                  <SelectItem value="3">منخفضة (3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Material and Color Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Material Type */}
            <div className="space-y-2">
              <Label htmlFor="material_type" className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
                <Building2 className="h-4 w-4 text-purple-600" />
                <span>نوع المادة</span>
              </Label>
              <Input
                id="material_type"
                value={formData.material_type}
                onChange={(e) => handleInputChange('material_type', e.target.value)}
                placeholder="مثال: زيركونيا، بورسلين، أكريل"
                className="text-right"
                disabled={isLoading}
                dir="rtl"
              />
            </div>

            {/* Color Shade */}
            <div className="space-y-2">
              <Label htmlFor="color_shade" className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
                <Microscope className="h-4 w-4 text-blue-600" />
                <span>درجة اللون</span>
              </Label>
              <Input
                id="color_shade"
                value={formData.color_shade}
                onChange={(e) => handleInputChange('color_shade', e.target.value)}
                placeholder="مثال: A1، B2، C3"
                className="text-right"
                disabled={isLoading}
                dir="rtl"
              />
            </div>
          </div>

          {/* Lab Instructions */}
          <div className="space-y-2">
            <Label htmlFor="lab_instructions" className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
              <FileText className="h-4 w-4 text-indigo-600" />
              <span>تعليمات للمختبر</span>
            </Label>
            <Textarea
              id="lab_instructions"
              value={formData.lab_instructions}
              onChange={(e) => handleInputChange('lab_instructions', e.target.value)}
              placeholder="تعليمات خاصة للمختبر..."
              className="text-right min-h-[80px] resize-none"
              disabled={isLoading}
              dir="rtl"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
              <FileText className="h-4 w-4 text-gray-600" />
              <span>ملاحظات</span>
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="أي ملاحظات إضافية حول الطلب..."
              disabled={isLoading}
              rows={3}
              className="text-right"
              dir="rtl"
            />
          </div>

          <DialogFooter className="flex flex-row-reverse gap-2 pt-4" dir="rtl">
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  {editingOrder ? 'جاري التحديث...' : 'جاري الإضافة...'}
                </>
              ) : (
                editingOrder ? 'تحديث' : 'إضافة'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
