import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePatientStore } from '@/store/patientStore'
import { useToast } from '@/hooks/use-toast'
import type { Patient } from '@/types'

interface AddPatientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PatientFormData {
  full_name: string
  gender: 'male' | 'female'
  age: number
  patient_condition?: string
  allergies?: string
  medical_conditions?: string
  email?: string
  address?: string
  notes?: string
  phone?: string
  date_added?: string
}

export default function AddPatientDialog({ open, onOpenChange }: AddPatientDialogProps) {
  const { createPatient, isLoading } = usePatientStore()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<PatientFormData>({
    defaultValues: {
      full_name: '',
      gender: undefined,
      age: undefined,
      patient_condition: '',
      allergies: '',
      medical_conditions: '',
      email: '',
      address: '',
      notes: '',
      phone: '',
      date_added: new Date().toISOString().slice(0, 16) // Set current local date and time
    }
  })

  const onSubmit = async (data: PatientFormData) => {
    // Validate required fields
    if (!data.gender) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار الجنس",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Generate serial number (timestamp + random)
      const serialNumber = Date.now().toString().slice(-8) + Math.floor(Math.random() * 100).toString().padStart(2, '0')

      const patientData = {
        ...data,
        serial_number: serialNumber,
        age: Number(data.age), // Ensure age is a number
        date_added: data.date_added || new Date().toISOString(), // Ensure date_added is included
      }

      await createPatient(patientData)
      toast({
        title: "تم بنجاح",
        description: "تم إضافة المريض بنجاح",
      })
      reset()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إضافة المريض",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة مريض جديد</DialogTitle>
          <DialogDescription>
            أدخل معلومات المريض أدناه. الحقول المميزة بـ * مطلوبة.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Required Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">الحقول المطلوبة</h3>

            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                الاسم الكامل *
              </label>
              <Input
                {...register('full_name', { required: 'الاسم الكامل مطلوب' })}
                placeholder="أدخل الاسم الكامل"
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Gender */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  الجنس *
                </label>
                <Select onValueChange={(value: 'male' | 'female') => setValue('gender', value)}>
                  <SelectTrigger className="bg-background border-input text-foreground">
                    <SelectValue placeholder="اختر الجنس" className="text-muted-foreground" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">ذكر</SelectItem>
                    <SelectItem value="female">أنثى</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && (
                  <p className="text-sm text-destructive">الجنس مطلوب</p>
                )}
              </div>

              {/* Age */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  العمر *
                </label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  {...register('age', {
                    required: 'العمر مطلوب',
                    min: { value: 1, message: 'العمر يجب أن يكون أكبر من 0' },
                    max: { value: 120, message: 'العمر يجب أن يكون أقل من 120' }
                  })}
                  placeholder="أدخل العمر"
                />
                {errors.age && (
                  <p className="text-sm text-destructive">{errors.age.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Date Added */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  تاريخ الإضافة *
                </label>
                <Input
                  type="datetime-local"
                  {...register('date_added', { required: 'تاريخ الإضافة مطلوب' })}
                />
                {errors.date_added && (
                  <p className="text-sm text-destructive">{errors.date_added.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  رقم الهاتف
                </label>
                <Input
                  type="tel"
                  {...register('phone', {
                    pattern: {
                      value: /^[0-9]{12}$/,
                      message: 'رقم الهاتف يجب أن يكون 12 رقم (مثل: 963987654321)'
                    }
                  })}
                  placeholder="963987654321"
                />
                <p className="text-xs text-muted-foreground">
                  يرجى إدخال رقم الهاتف مع رمز الدولة بدون + أو 00 (مثل: 963987654321)
                </p>
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>
            </div>

          </div>

          {/* Optional Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">الحقول الاختيارية</h3>

            {/* Patient Condition */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                حالة المريض / التشخيص
              </label>
              <Textarea
                {...register('patient_condition')}
                placeholder="أدخل وصف الحالة الطبية أو التشخيص"
                rows={3}
              />
            </div>

            {/* Allergies */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                الحساسية
              </label>
              <Input
                {...register('allergies')}
                placeholder="أدخل معلومات الحساسية المعروفة"
              />
            </div>

            {/* Medical Conditions */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                الحالات الطبية / الأمراض
              </label>
              <Textarea
                {...register('medical_conditions')}
                placeholder="أدخل الحالات الطبية أو الأمراض المزمنة"
                rows={2}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                البريد الإلكتروني
              </label>
              <Input
                type="email"
                {...register('email', {
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'البريد الإلكتروني غير صحيح'
                  }
                })}
                placeholder="أدخل البريد الإلكتروني"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                العنوان
              </label>
              <Input
                {...register('address')}
                placeholder="أدخل العنوان الكامل"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                ملاحظات / تعليقات
              </label>
              <Textarea
                {...register('notes')}
                placeholder="أدخل أي ملاحظات أو تعليقات إضافية"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end space-x-4 space-x-reverse">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? 'جاري الإضافة...' : 'حفظ المريض'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}