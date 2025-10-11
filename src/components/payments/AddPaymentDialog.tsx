import React, { useState, useEffect, memo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePaymentStore } from '@/store/paymentStore'
import { usePatientStore } from '@/store/patientStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { useDentalTreatmentStore } from '@/store/dentalTreatmentStore'
import { useToast } from '@/hooks/use-toast'
import { getTreatmentNameInArabic } from '@/utils/arabicTranslations'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreditCard, DollarSign, Receipt, Calculator, Sparkles, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useCurrency } from '@/contexts/CurrencyContext'
import type { Payment } from '@/types'

interface AddPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preSelectedPatientId?: string
}

function AddPaymentDialogComponent({ open, onOpenChange, preSelectedPatientId }: AddPaymentDialogProps) {

  const { toast } = useToast()
  const { createPayment, updatePayment, isLoading, getPaymentsByPatient, getPaymentsByAppointment, getPaymentsByToothTreatment } = usePaymentStore()
  const patients = usePatientStore(state => state.patients)
  const appointments = useAppointmentStore(state => state.appointments)
  const toothTreatments = useDentalTreatmentStore(state => state.toothTreatments)
  const loadToothTreatmentsByPatient = useDentalTreatmentStore(state => state.loadToothTreatmentsByPatient)
  const { formatAmount } = useCurrency()

  const [formData, setFormData] = useState({
    patient_id: '',
    tooth_treatment_id: 'none',
    appointment_id: 'none',
    amount: '',
    payment_method: 'cash' as 'cash' | 'bank_transfer',
    payment_date: new Date().toISOString().split('T')[0],
    description: '',
    receipt_number: '',
    status: 'completed' as 'completed' | 'partial' | 'pending',
    notes: '',
    discount_amount: '',
    tax_amount: '',
    total_amount_due: '',
    amount_paid: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [autoCalculations, setAutoCalculations] = useState({
    previousPayments: 0,
    suggestedReceiptNumber: '',
    isCalculating: false
  })

  // Helper functions for number formatting with thousands separators
  const formatNumberWithCommas = (value: string): string => {
    if (!value) return ''
    // Remove any existing commas
    const cleanValue = value.replace(/,/g, '')
    // Check if it's a valid number
    if (isNaN(Number(cleanValue))) return value
    // Split into integer and decimal parts
    const parts = cleanValue.split('.')
    // Format integer part with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return parts.join('.')
  }

  const removeCommas = (value: string): string => {
    return value.replace(/,/g, '')
  }

  // توليد رقم إيصال تلقائي احترافي
  const generateReceiptNumber = () => {
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const time = now.getTime().toString().slice(-4)
    return `RCP-${year}${month}${day}-${time}`
  }

  // حساب إجمالي المدفوعات السابقة للموعد المحدد
  const calculatePreviousPayments = (appointmentId: string) => {
    if (!appointmentId || appointmentId === 'none') return 0
    const appointmentPayments = getPaymentsByAppointment(appointmentId)
    return appointmentPayments.reduce((total, payment) => total + payment.amount, 0)
  }

  // حساب إجمالي المدفوعات السابقة للعلاج المحدد
  const calculatePreviousPaymentsForTreatment = (toothTreatmentId: string) => {
    if (!toothTreatmentId || toothTreatmentId === 'none') return 0
    const treatmentPayments = getPaymentsByToothTreatment(toothTreatmentId)
    return treatmentPayments.reduce((total, payment) => total + payment.amount, 0)
  }

  // الحصول على المبلغ الإجمالي المطلوب (من الإدخال اليدوي)
  const getTotalAmountDue = () => {
    return parseFloat(formData.total_amount_due) || 0
  }

  // حساب إجمالي المبلغ المدفوع تلقائياً (المدفوعات السابقة + الدفعة الحالية)
  const calculateTotalAmountPaid = () => {
    const currentAmount = parseFloat(formData.amount) || 0
    return autoCalculations.previousPayments + currentAmount
  }

  // حساب المبلغ المتبقي تلقائياً
  const calculateRemainingBalance = () => {
    const totalAmountDue = parseFloat(formData.total_amount_due) || 0
    const totalPaid = calculateTotalAmountPaid()
    return Math.max(0, totalAmountDue - totalPaid)
  }

  // اقتراح الحالة تلقائياً بناءً على المبلغ
  const getSuggestedStatus = (): 'completed' | 'partial' | 'pending' => {
    const amount = formData.amount ? parseFloat(formData.amount) : 0
    const totalAmountDue = formData.total_amount_due ? parseFloat(formData.total_amount_due) : 0

    if (totalAmountDue > 0) {
      if (formData.tooth_treatment_id && formData.tooth_treatment_id !== 'none') {
        // للمدفوعات المرتبطة بعلاج
        const previousPayments = autoCalculations.previousPayments
        const newTotalPaid = previousPayments + amount

        if (newTotalPaid >= totalAmountDue) {
          return 'completed'
        } else if (newTotalPaid > 0) {
          return 'partial'
        } else {
          return 'pending'
        }
      } else if (formData.appointment_id && formData.appointment_id !== 'none') {
        // للمدفوعات المرتبطة بموعد - استخدام المبلغ الإجمالي المدخل يدوياً
        const previousPayments = autoCalculations.previousPayments
        const newTotalPaid = previousPayments + amount

        if (newTotalPaid >= totalAmountDue) {
          return 'completed'
        } else if (newTotalPaid > 0) {
          return 'partial'
        } else {
          return 'pending'
        }
      } else {
        // للمدفوعات العامة
        const amountPaid = calculateTotalAmountPaid()

        if (amountPaid >= totalAmountDue) {
          return 'completed'
        } else if (amountPaid > 0) {
          return 'partial'
        } else {
          return 'pending'
        }
      }
    }

    // إذا لم يكن هناك مبلغ إجمالي مطلوب ولكن هناك مبلغ مدفوع
    if (amount > 0) {
      return 'completed'
    }

    return 'pending' // افتراضي للحالات الأخرى
  }

  // حساب المبلغ الإجمالي للدفعة
  const calculateTotalAmount = () => {
    const amount = parseFloat(formData.amount) || 0
    const taxAmount = parseFloat(formData.tax_amount) || 0
    const discountAmount = parseFloat(formData.discount_amount) || 0
    return amount + taxAmount - discountAmount
  }

  // تحديث الحسابات التلقائية عند تغيير العلاج
  useEffect(() => {
    if (formData.tooth_treatment_id && formData.tooth_treatment_id !== 'none') {
      setAutoCalculations(prev => ({ ...prev, isCalculating: true }))

      const selectedTreatment = toothTreatments.find(t => t.id === formData.tooth_treatment_id)
      const treatmentCost = selectedTreatment?.cost || 0
      const previousPayments = calculatePreviousPaymentsForTreatment(formData.tooth_treatment_id)
      const suggestedReceiptNumber = generateReceiptNumber()

      setAutoCalculations({
        previousPayments,
        suggestedReceiptNumber,
        isCalculating: false
      })

      // تحديث المبلغ الإجمالي المطلوب والمبلغ المقترح
      setFormData(prev => ({
        ...prev,
        total_amount_due: treatmentCost.toString(),
        amount: Math.max(0, treatmentCost - previousPayments).toString(),
        receipt_number: prev.receipt_number || suggestedReceiptNumber
      }))
    }
  }, [formData.tooth_treatment_id, toothTreatments, getPaymentsByToothTreatment])

  // تحديث الحسابات التلقائية عند تغيير الموعد (للتوافق مع النظام القديم)
  useEffect(() => {
    if (formData.appointment_id && formData.appointment_id !== 'none') {
      setAutoCalculations(prev => ({ ...prev, isCalculating: true }))

      const previousPayments = calculatePreviousPayments(formData.appointment_id)
      const suggestedReceiptNumber = generateReceiptNumber()

      // جلب المبلغ الإجمالي من الدفعات السابقة للموعد
      const appointmentPayments = getPaymentsByAppointment(formData.appointment_id)
      const existingTotalAmountDue = appointmentPayments.find(p => p.total_amount_due)?.total_amount_due

      setAutoCalculations({
        previousPayments,
        suggestedReceiptNumber,
        isCalculating: false
      })

      // تحديث رقم الإيصال إذا كان فارغاً
      if (!formData.receipt_number) {
        setFormData(prev => ({ ...prev, receipt_number: suggestedReceiptNumber }))
      }

      // تحديث المبلغ الإجمالي المطلوب إذا كان فارغاً ووُجد في الدفعات السابقة
      if (!formData.total_amount_due && existingTotalAmountDue) {
        setFormData(prev => ({
          ...prev,
          total_amount_due: existingTotalAmountDue.toString()
        }))
      }
    } else {
      // إذا لم يتم اختيار موعد، اجعل المدفوعات السابقة = 0
      setAutoCalculations(prev => ({
        ...prev,
        previousPayments: 0,
        suggestedReceiptNumber: generateReceiptNumber()
      }))
    }
  }, [formData.appointment_id])

  // ملاحظة: المبلغ الإجمالي المطلوب يتم إدخاله يدوياً بالكامل
  // لا نحتاج لتحديثه تلقائياً من تكلفة الموعد

  // تحديث إجمالي المبلغ المدفوع تلقائياً
  useEffect(() => {
    if (formData.amount && autoCalculations.previousPayments >= 0) {
      const totalPaid = calculateTotalAmountPaid()
      setFormData(prev => ({
        ...prev,
        amount_paid: totalPaid.toString()
      }))
    }
  }, [formData.amount, autoCalculations.previousPayments])

  useEffect(() => {
    if (!open) {
      setFormData({
        patient_id: '',
        tooth_treatment_id: 'none',
        appointment_id: 'none',
        amount: '',
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        description: '',
        receipt_number: '',
        status: 'completed',
        notes: '',
        discount_amount: '',
        tax_amount: '',
        total_amount_due: '',
        amount_paid: '',
      })
      setErrors({})
      setAutoCalculations({
        previousPayments: 0,
        suggestedReceiptNumber: '',
        isCalculating: false
      })
    }
  }, [open])

  // Separate useEffect for pre-selected patient (only when dialog opens)
  useEffect(() => {
    if (open && preSelectedPatientId) {
      setFormData(prev => ({
        ...prev,
        patient_id: preSelectedPatientId
      }))
    }
  }, [open, preSelectedPatientId])

  // تحميل العلاجات عند اختيار المريض
  useEffect(() => {
    if (formData.patient_id && formData.patient_id !== '') {
      loadToothTreatmentsByPatient(formData.patient_id)
    }
  }, [formData.patient_id, loadToothTreatmentsByPatient])

  // تحديث الحالة تلقائياً عند تغيير المبلغ أو المبلغ الإجمالي
  useEffect(() => {
    // تحديث الحالة إذا كان هناك مبلغ إجمالي مطلوب أو مبلغ مدفوع
    const amount = formData.amount ? parseFloat(formData.amount) : 0
    const totalAmountDue = formData.total_amount_due ? parseFloat(formData.total_amount_due) : 0

    if (totalAmountDue > 0 || amount > 0) {
      const suggestedStatus = getSuggestedStatus()
      setFormData(prev => ({
        ...prev,
        status: suggestedStatus
      }))
    }
  }, [formData.amount, formData.total_amount_due, formData.tooth_treatment_id, formData.appointment_id, autoCalculations.previousPayments])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.patient_id) {
      newErrors.patient_id = 'يرجى اختيار المريض'
    }

    // التحقق من المبلغ - يمكن أن يكون 0 إذا كان هناك مبلغ إجمالي مطلوب (دفعة آجلة)
    const amount = formData.amount ? parseFloat(formData.amount) : 0
    const totalAmountDue = formData.total_amount_due ? parseFloat(formData.total_amount_due) : 0

    if (amount < 0) {
      newErrors.amount = 'المبلغ لا يمكن أن يكون سالباً'
    } else if (amount === 0 && totalAmountDue === 0) {
      newErrors.amount = 'يرجى إدخال مبلغ صحيح أو مبلغ إجمالي مطلوب'
    }

    if (!formData.payment_date) {
      newErrors.payment_date = 'يرجى اختيار تاريخ الدفع'
    }

    // التحقق من المبلغ الإجمالي المطلوب (اختياري)
    // إذا تم إدخاله، يجب أن يكون أكبر من صفر
    if (formData.total_amount_due && parseFloat(formData.total_amount_due) <= 0) {
      newErrors.total_amount_due = 'المبلغ الإجمالي المطلوب يجب أن يكون أكبر من صفر'
    }

    if (process.env.NODE_ENV !== 'production') console.log('🔍 Validation check:', {
      total_amount_due: formData.total_amount_due,
      amount: formData.amount,
      patient_id: formData.patient_id,
      payment_method: formData.payment_method,
      errors: newErrors
    })

    // التحقق من صحة المبلغ مع المبلغ الإجمالي
    if (formData.tooth_treatment_id && formData.tooth_treatment_id !== 'none') {
      // للمدفوعات المرتبطة بعلاج
      const remainingBeforeThisPayment = totalAmountDue - autoCalculations.previousPayments

      if (totalAmountDue > 0 && amount > remainingBeforeThisPayment) {
        newErrors.amount = `مبلغ هذه الدفعة لا يمكن أن يكون أكبر من المبلغ المتبقي (${formatAmount(remainingBeforeThisPayment)})`
      }

      if (amount <= 0 && totalAmountDue > 0) {
        newErrors.amount = 'يجب أن يكون مبلغ الدفعة أكبر من صفر'
      }
    } else if (formData.appointment_id && formData.appointment_id !== 'none') {
      // للمدفوعات المرتبطة بموعد - استخدام المبلغ الإجمالي المدخل
      const remainingBeforeThisPayment = totalAmountDue - autoCalculations.previousPayments

      if (totalAmountDue > 0 && amount > remainingBeforeThisPayment) {
        newErrors.amount = `مبلغ هذه الدفعة لا يمكن أن يكون أكبر من المبلغ المتبقي (${remainingBeforeThisPayment.toFixed(2)} $)`
      }
    } else {
      // للمدفوعات العامة غير المرتبطة بموعد
      const totalPaid = calculateTotalAmountPaid()

      if (totalAmountDue > 0 && totalPaid > totalAmountDue) {
        newErrors.amount = 'إجمالي المدفوعات لا يمكن أن يتجاوز المبلغ الإجمالي المطلوب'
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
      // التأكد من أن amount رقم صحيح، استخدام 0 كقيمة افتراضية
      const amount = formData.amount ? parseFloat(formData.amount) : 0
      const discountAmount = formData.discount_amount ? parseFloat(formData.discount_amount) : 0
      const taxAmount = formData.tax_amount ? parseFloat(formData.tax_amount) : 0
      const totalAmount = amount + taxAmount - discountAmount

      // استخدام الحالة المحددة في النموذج (التي تم تحديدها تلقائياً أو يدوياً)
      const finalStatus = formData.status

      const paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'> = {
        patient_id: formData.patient_id,
        appointment_id: formData.appointment_id && formData.appointment_id !== 'none' ? formData.appointment_id : undefined,
        amount: amount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        description: formData.description || undefined,
        receipt_number: formData.receipt_number || autoCalculations.suggestedReceiptNumber,
        status: finalStatus, // استخدام الحالة المحددة في النموذج
        notes: formData.notes || undefined,
        discount_amount: discountAmount > 0 ? discountAmount : undefined,
        tax_amount: taxAmount > 0 ? taxAmount : undefined,
        total_amount: totalAmount,
      }

      // إضافة المبلغ الإجمالي المطلوب لجميع المدفوعات
      const totalAmountDue = formData.total_amount_due ? parseFloat(formData.total_amount_due) : totalAmount
      paymentData.total_amount_due = totalAmountDue

      // إضافة البيانات الخاصة بالعلاجات أو المواعيد أو المدفوعات العامة
      if (formData.tooth_treatment_id && formData.tooth_treatment_id !== 'none') {
        // دفعة مرتبطة بعلاج
        paymentData.tooth_treatment_id = formData.tooth_treatment_id
        paymentData.treatment_total_cost = totalAmountDue

        // حساب المبلغ المدفوع والمتبقي للعلاج
        const amountPaid = calculateTotalAmountPaid()
        const remainingBalance = totalAmountDue - amountPaid
        paymentData.treatment_total_paid = amountPaid
        paymentData.treatment_remaining_balance = remainingBalance
      } else if (formData.appointment_id && formData.appointment_id !== 'none') {
        // دفعة مرتبطة بموعد - استخدام المبلغ الإجمالي المدخل يدوياً
        paymentData.appointment_total_cost = totalAmountDue

        // حساب المبلغ المدفوع والمتبقي للموعد
        const amountPaid = calculateTotalAmountPaid()
        const remainingBalance = totalAmountDue - amountPaid
        paymentData.amount_paid = amountPaid
        paymentData.remaining_balance = remainingBalance
      } else {
        // دفعة عامة غير مرتبطة بعلاج أو موعد
        const amountPaid = calculateTotalAmountPaid()
        const remainingBalance = totalAmountDue - amountPaid

        paymentData.amount_paid = amountPaid
        paymentData.remaining_balance = remainingBalance
      }


      let result

      // التحقق من وجود دفعة موجودة للعلاج وتحديثها بدلاً من إنشاء دفعة جديدة
      if (formData.tooth_treatment_id && formData.tooth_treatment_id !== 'none') {
        const existingPayments = getPaymentsByToothTreatment(formData.tooth_treatment_id)

        if (existingPayments.length > 0) {
          // البحث عن دفعة آجلة أولاً، وإلا استخدم أول دفعة موجودة
          const pendingPayment = existingPayments.find(p => p.status === 'pending')
          const targetPayment = pendingPayment || existingPayments[0]

          // حساب المبلغ الجديد
          const updatedAmount = targetPayment.amount + amount

          // تحديد الحالة الجديدة
          let newStatus: 'completed' | 'partial' | 'pending'
          if (updatedAmount >= totalAmountDue) {
            newStatus = 'completed'
          } else if (updatedAmount > 0) {
            newStatus = 'partial'
          } else {
            newStatus = 'pending'
          }

          const updateData = {
            amount: updatedAmount,
            payment_method: formData.payment_method,
            payment_date: formData.payment_date,
            description: formData.description || targetPayment.description,
            receipt_number: formData.receipt_number || autoCalculations.suggestedReceiptNumber || targetPayment.receipt_number,
            status: newStatus,
            notes: formData.notes || targetPayment.notes,
            discount_amount: discountAmount > 0 ? discountAmount : targetPayment.discount_amount,
            tax_amount: taxAmount > 0 ? taxAmount : targetPayment.tax_amount,
            total_amount: updatedAmount + (taxAmount || 0) - (discountAmount || 0),
            total_amount_due: totalAmountDue,
            treatment_total_cost: totalAmountDue,
            treatment_total_paid: updatedAmount,
            treatment_remaining_balance: Math.max(0, totalAmountDue - updatedAmount)
          }

          result = await updatePayment(targetPayment.id, updateData)
        } else {
          // إنشاء دفعة جديدة إذا لم توجد دفعة للعلاج
          result = await createPayment(paymentData)
        }
      } else {
        // للمدفوعات غير المرتبطة بعلاج، إنشاء دفعة جديدة
        result = await createPayment(paymentData)
      }

      // رسالة نجاح مخصصة حسب نوع العملية
      const isUpdate = formData.tooth_treatment_id && formData.tooth_treatment_id !== 'none' &&
                      getPaymentsByToothTreatment(formData.tooth_treatment_id).length > 0

      toast({
        title: 'تم بنجاح',
        description: isUpdate ? 'تم تحديث الدفعة الموجودة بنجاح' : 'تم تسجيل الدفعة بنجاح',
      })

      // إعادة تعيين النموذج
      setFormData({
        patient_id: preSelectedPatientId || '',
        tooth_treatment_id: 'none',
        appointment_id: 'none',
        amount: '',
        payment_method: 'cash' as 'cash' | 'bank_transfer',
        payment_date: new Date().toISOString().split('T')[0],
        description: '',
        receipt_number: '',
        status: 'completed' as 'completed' | 'partial' | 'pending',
        notes: '',
        discount_amount: '',
        tax_amount: '',
        total_amount_due: '',
        amount_paid: '',
      })

      onOpenChange(false)
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Failed to submit payment:', error)
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في تسجيل الدفعة',
        variant: 'destructive',
      })
    }
  }

  const filteredAppointments = appointments.filter(
    appointment => appointment.patient_id === formData.patient_id
  )

  const filteredToothTreatments = toothTreatments.filter(
    treatment => {
      if (treatment.patient_id !== formData.patient_id) return false

      // التحقق من حالة الدفع للعلاج
      const treatmentPayments = getPaymentsByToothTreatment(treatment.id)
      const treatmentCost = treatment.cost || 0

      // إذا لم توجد مدفوعات، اعرض العلاج
      if (treatmentPayments.length === 0) return true

      // حساب إجمالي المدفوع (فقط المدفوعات المكتملة والجزئية)
      const totalPaid = treatmentPayments
        .filter(payment => payment.status === 'completed' || payment.status === 'partial')
        .reduce((sum, payment) => sum + payment.amount, 0)

      // إخفاء العلاجات المدفوعة بالكامل فقط
      return totalPaid < treatmentCost
    }
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border shadow-2xl" dir="rtl">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="flex items-center text-xl font-semibold text-foreground">
            <CreditCard className="w-5 h-5 ml-2 text-primary" />
            تسجيل دفعة جديدة
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            أدخل تفاصيل الدفعة الجديدة وتتبع المدفوعات
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-lg text-card-foreground">
                <Receipt className="w-4 h-4 ml-2 text-primary" />
                معلومات المريض
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Patient Selection */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">المريض *</Label>
                  <Select
                    value={formData.patient_id}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      patient_id: value,
                      appointment_id: 'none'
                    }))}
                  >
                    <SelectTrigger className={errors.patient_id ? 'border-destructive bg-background text-foreground' : 'bg-background border-input text-foreground'}>
                      <SelectValue placeholder="اختر المريض" className="text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.patient_id && (
                    <p className="text-sm text-destructive">{errors.patient_id}</p>
                  )}
                </div>

                {/* Treatment Selection */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">العلاج *</Label>
                  <Select
                    value={formData.tooth_treatment_id}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      tooth_treatment_id: value,
                      appointment_id: 'none' // إعادة تعيين الموعد عند اختيار علاج
                    }))}
                    disabled={!formData.patient_id}
                  >
                    <SelectTrigger className="bg-background border-input text-foreground">
                      <SelectValue placeholder="اختر العلاج" className="text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون علاج محدد</SelectItem>
                      {filteredToothTreatments.map((treatment) => {
                        // حساب المبلغ المتبقي للعلاج
                        const treatmentPayments = getPaymentsByToothTreatment(treatment.id)
                        const treatmentCost = treatment.cost || 0
                        const totalPaid = treatmentPayments
                          .filter(payment => payment.status === 'completed' || payment.status === 'partial')
                          .reduce((sum, payment) => sum + payment.amount, 0)
                        const remainingAmount = treatmentCost - totalPaid

                        return (
                          <SelectItem key={treatment.id} value={treatment.id}>
                            <div className="flex flex-col">
                              <span>{`السن ${treatment.tooth_number} - ${getTreatmentNameInArabic(treatment.treatment_type)}`}</span>
                              <div className="text-xs text-muted-foreground">
                                <span>التكلفة: {formatAmount(treatmentCost)}</span>
                                {remainingAmount > 0 && remainingAmount < treatmentCost && (
                                  <span className="text-orange-600 font-medium"> • متبقي: {formatAmount(remainingAmount)}</span>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Appointment Selection (للتوافق مع النظام القديم) - مخفي */}
                <div className="space-y-2 hidden">
                  <Label className="text-foreground font-medium">الموعد (اختياري)</Label>
                  <Select
                    value={formData.appointment_id}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      appointment_id: value,
                      tooth_treatment_id: value !== 'none' ? 'none' : prev.tooth_treatment_id // إعادة تعيين العلاج عند اختيار موعد
                    }))}
                    disabled={!formData.patient_id}
                  >
                    <SelectTrigger className="bg-background border-input text-foreground">
                      <SelectValue placeholder="اختر الموعد" className="text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون موعد محدد</SelectItem>
                      {filteredAppointments.map((appointment) => (
                        <SelectItem key={appointment.id} value={appointment.id}>
                          {appointment.title} - {formatDate(appointment.start_time)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amount Fields */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-lg text-card-foreground">
                <DollarSign className="w-4 h-4 ml-2 text-primary" />
                تفاصيل المبالغ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Amount */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">المبلغ *</Label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={formatNumberWithCommas(formData.amount)}
                    onChange={(e) => {
                      const rawValue = removeCommas(e.target.value)
                      // Allow only numbers and one decimal point
                      if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                        setFormData(prev => ({ ...prev, amount: rawValue }))
                      }
                    }}
                    onBlur={(e) => {
                      const rawValue = removeCommas(e.target.value)
                      const value = parseFloat(rawValue) || 0
                      setFormData(prev => ({ ...prev, amount: value.toString() }))
                    }}
                    onKeyDown={(e) => {
                      // منع انتشار الحدث لضمان عدم تفعيل الاختصارات
                      e.stopPropagation()
                    }}
                    data-prevent-shortcuts="true"
                    className={errors.amount ? 'border-destructive bg-background text-foreground' : 'bg-background border-input text-foreground'}
                  />
                  {errors.amount && (
                    <p className="text-sm text-destructive">{errors.amount}</p>
                  )}
                </div>

                {/* Discount Amount */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">مبلغ الخصم</Label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={formatNumberWithCommas(formData.discount_amount)}
                    onChange={(e) => {
                      const rawValue = removeCommas(e.target.value)
                      // Allow only numbers and one decimal point
                      if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                        setFormData(prev => ({ ...prev, discount_amount: rawValue }))
                      }
                    }}
                    onBlur={(e) => {
                      const rawValue = removeCommas(e.target.value)
                      const value = parseFloat(rawValue) || 0
                      setFormData(prev => ({ ...prev, discount_amount: value.toString() }))
                    }}
                    className="bg-background border-input text-foreground"
                  />
                </div>

                {/* Tax Amount */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">مبلغ الضريبة</Label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={formatNumberWithCommas(formData.tax_amount)}
                    onChange={(e) => {
                      const rawValue = removeCommas(e.target.value)
                      // Allow only numbers and one decimal point
                      if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                        setFormData(prev => ({ ...prev, tax_amount: rawValue }))
                      }
                    }}
                    onBlur={(e) => {
                      const rawValue = removeCommas(e.target.value)
                      const value = parseFloat(rawValue) || 0
                      setFormData(prev => ({ ...prev, tax_amount: value.toString() }))
                    }}
                    className="bg-background border-input text-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-lg text-card-foreground">
                <CreditCard className="w-4 h-4 ml-2 text-primary" />
                تفاصيل الدفع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">طريقة الدفع</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value: 'cash' | 'bank_transfer') =>
                      setFormData(prev => ({ ...prev, payment_method: value }))
                    }
                  >
                    <SelectTrigger className="bg-background border-input text-foreground">
                      <SelectValue placeholder="اختر طريقة الدفع" className="text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقداً</SelectItem>
                      <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Date */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">تاريخ الدفع *</Label>
                  <Input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                    className={errors.payment_date ? 'border-destructive bg-background text-foreground' : 'bg-background border-input text-foreground'}
                  />
                  {errors.payment_date && (
                    <p className="text-sm text-destructive">{errors.payment_date}</p>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">
                    الحالة
                    {formData.amount && parseFloat(formData.amount) > 0 && (
                      <span className="text-xs text-muted-foreground mr-2">
                        (مقترح: {getSuggestedStatus() === 'completed' ? 'مكتمل' :
                                getSuggestedStatus() === 'partial' ? 'جزئي' : 'آجل'})
                      </span>
                    )}
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'completed' | 'partial' | 'pending') =>
                      setFormData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger className="bg-background border-input text-foreground">
                      <SelectValue placeholder="اختر الحالة" className="text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">
                        <div className="flex items-center gap-2">
                          <span>مكتمل</span>
                          {getSuggestedStatus() === 'completed' && (
                            <span className="text-xs text-green-600">✓ مقترح</span>
                          )}
                        </div>
                      </SelectItem>
                      <SelectItem value="partial">
                        <div className="flex items-center gap-2">
                          <span>جزئي</span>
                          {getSuggestedStatus() === 'partial' && (
                            <span className="text-xs text-orange-600">✓ مقترح</span>
                          )}
                        </div>
                      </SelectItem>
                      <SelectItem value="pending">
                        <div className="flex items-center gap-2">
                          <span>آجل</span>
                          {getSuggestedStatus() === 'pending' && (
                            <span className="text-xs text-blue-600">✓ مقترح</span>
                          )}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Tracking Section */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-lg text-card-foreground">
                <Sparkles className="w-4 h-4 ml-2 text-primary" />
                تتبع المدفوعات للموعد
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                تتبع دقيق للمدفوعات والرصيد المتبقي لكل موعد على حدة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Appointment Payment Summary */}
              {formData.appointment_id && formData.appointment_id !== 'none' && (
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800 shadow-sm transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-primary">ملخص مدفوعات الموعد</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المبلغ الإجمالي المطلوب:</span>
                        <span className="font-medium text-foreground">{getTotalAmountDue().toFixed(2)} $</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المدفوع سابقاً:</span>
                        <span className="font-medium text-foreground">{autoCalculations.previousPayments.toFixed(2)} $</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المتبقي قبل هذه الدفعة:</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {(getTotalAmountDue() - autoCalculations.previousPayments).toFixed(2)} $
                        </span>
                      </div>
                    </div>
                    {formData.amount && (
                      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">المتبقي بعد هذه الدفعة:</span>
                          <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                            {calculateRemainingBalance().toFixed(2)} $
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {formData.appointment_id === 'none' && (
                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/30 border-yellow-200 dark:border-yellow-800 shadow-sm transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">دفعة عامة غير مرتبطة بموعد</span>
                    </div>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      هذه دفعة عامة غير مرتبطة بموعد محدد، يمكنك تحديد المبلغ المطلوب يدوياً
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total Amount Due */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-foreground font-medium">
                    المبلغ الإجمالي المطلوب
                    <Badge variant="secondary" className="text-xs">
                      اختياري
                    </Badge>
                  </Label>
                  <Input
                    type="text"
                    placeholder="أدخل المبلغ الإجمالي المطلوب (اختياري)"
                    value={formatNumberWithCommas(formData.total_amount_due)}
                    onChange={(e) => {
                      const rawValue = removeCommas(e.target.value)
                      // Allow only numbers and one decimal point
                      if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                        setFormData(prev => ({ ...prev, total_amount_due: rawValue }))
                      }
                    }}
                    onBlur={(e) => {
                      const rawValue = removeCommas(e.target.value)
                      const value = parseFloat(rawValue) || 0
                      setFormData(prev => ({ ...prev, total_amount_due: value.toString() }))
                    }}
                    className={`bg-background border-input text-foreground ${errors.total_amount_due ? 'border-destructive' : ''}`}
                  />
                  {errors.total_amount_due && (
                    <p className="text-sm text-destructive">{errors.total_amount_due}</p>
                  )}
                  {!errors.total_amount_due && (
                    <p className="text-xs text-muted-foreground">
                      💡 إدخال المبلغ الإجمالي يساعد في تتبع المدفوعات الجزئية
                    </p>
                  )}
                </div>

                {/* Amount Paid */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-foreground font-medium">
                    إجمالي المبلغ المدفوع
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="w-3 h-3 ml-1" />
                      محسوب تلقائياً
                    </Badge>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0.00"
                    value={formData.amount_paid}
                    readOnly
                    className="bg-muted cursor-not-allowed border-input text-foreground font-medium"
                  />
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ محسوب تلقائياً: المدفوعات السابقة ({formatAmount(autoCalculations.previousPayments)}) + هذه الدفعة ({formatAmount(parseFloat(formData.amount) || 0)})
                  </p>
                </div>
              </div>

              {/* Remaining Balance Display */}
              {formData.total_amount_due && (
                <Card className={`shadow-sm transition-all duration-200 ${
                  calculateRemainingBalance() > 0
                    ? "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30 border-orange-200 dark:border-orange-800"
                    : "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800"
                }`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">المبلغ المتبقي:</span>
                      <Badge variant={calculateRemainingBalance() > 0 ? "destructive" : "default"} className="text-lg px-3 py-1">
                        ${calculateRemainingBalance().toFixed(2)}
                      </Badge>
                    </div>
                    {calculateRemainingBalance() === 0 && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2">✓ تم سداد المبلغ بالكامل</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Payment Summary */}
              <Card className="bg-gradient-to-r from-muted/30 to-muted/50 border-border">
                <CardHeader>
                  <CardTitle className="text-sm text-card-foreground">ملخص هذه الدفعة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المبلغ الأساسي:</span>
                    <span className="font-medium text-foreground">{formatAmount(parseFloat(formData.amount) || 0)}</span>
                  </div>
                  {formData.tax_amount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الضريبة:</span>
                      <span className="text-orange-600 dark:text-orange-400 font-medium">+{formatAmount(parseFloat(formData.tax_amount) || 0)}</span>
                    </div>
                  )}
                  {formData.discount_amount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الخصم:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">-{formatAmount(parseFloat(formData.discount_amount) || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium border-t border-border pt-2">
                    <span className="text-foreground">إجمالي هذه الدفعة:</span>
                    <Badge variant="outline" className="text-base">
                      {formatAmount(calculateTotalAmount())}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground">معلومات إضافية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Receipt Number */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground">
                  رقم الإيصال
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="w-3 h-3 ml-1" />
                    مولد تلقائياً
                  </Badge>
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="رقم الإيصال"
                    value={formData.receipt_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, receipt_number: e.target.value }))}
                    className="flex-1 bg-background border-input text-foreground"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, receipt_number: generateReceiptNumber() }))}
                    className="px-3"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ تم توليد رقم إيصال فريد تلقائياً
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-foreground">الوصف</Label>
                <Textarea
                  placeholder="وصف الدفعة (اختياري)"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-foreground">ملاحظات</Label>
                <Textarea
                  placeholder="ملاحظات إضافية (اختياري)"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="flex justify-end space-x-2 space-x-reverse border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? 'جاري الحفظ...' : 'حفظ الدفعة'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default memo(AddPaymentDialogComponent)
