import React, { useState, useEffect } from 'react'
import { User, Phone, Mail, Calendar, MapPin, FileText, AlertTriangle } from 'lucide-react'
import { Patient } from '../types'

// shadcn/ui imports
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

interface EditPatientDialogProps {
  isOpen: boolean
  patient: Patient | null
  onClose: () => void
  onSave: (id: string, patient: Partial<Patient>) => void
}

export default function EditPatientDialog({ isOpen, patient, onClose, onSave }: EditPatientDialogProps) {
  const [formData, setFormData] = useState({
    serial_number: '',
    full_name: '',
    gender: 'male' as 'male' | 'female',
    age: 0,
    patient_condition: '',
    allergies: '',
    medical_conditions: '',
    email: '',
    address: '',
    notes: '',
    phone: '',
    date_added: ''
  })

  useEffect(() => {
    if (patient) {
      // Format date_added for datetime-local input
      const formatDateForInput = (dateString: string) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date.toISOString().slice(0, 16)
      }

      setFormData({
        serial_number: patient.serial_number || '',
        full_name: patient.full_name || '',
        gender: patient.gender || 'male',
        age: patient.age || 0,
        patient_condition: patient.patient_condition || '',
        allergies: patient.allergies || '',
        medical_conditions: patient.medical_conditions || '',
        email: patient.email || '',
        address: patient.address || '',
        notes: patient.notes || '',
        phone: patient.phone || '',
        date_added: formatDateForInput(patient.date_added || patient.created_at || '')
      })
    }
  }, [patient])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (patient) {
      onSave(patient.id, formData)
      onClose()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (!patient) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل بيانات المريض</DialogTitle>
          <DialogDescription>
            قم بتعديل معلومات المريض أدناه. الحقول المميزة بـ * مطلوبة.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Required Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">الحقول المطلوبة</h3>

            {/* Full Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                الاسم الكامل *
              </Label>
              <Input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                placeholder="أدخل الاسم الكامل"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Gender */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  الجنس *
                </Label>
                <Select value={formData.gender} onValueChange={(value: 'male' | 'female') => setFormData({...formData, gender: value})}>
                  <SelectTrigger className="bg-background border-input text-foreground">
                    <SelectValue placeholder="اختر الجنس" className="text-muted-foreground" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">ذكر</SelectItem>
                    <SelectItem value="female">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Age */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  العمر *
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  required
                  placeholder="أدخل العمر"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Date Added */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  تاريخ الإضافة *
                </Label>
                <Input
                  type="datetime-local"
                  name="date_added"
                  value={formData.date_added}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  رقم الهاتف
                </Label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="963987654321"
                />
                <p className="text-xs text-muted-foreground">
                  يرجى إدخال رقم الهاتف مع رمز الدولة بدون + أو 00 (مثل: 963987654321)
                </p>
              </div>
            </div>

          </div>

          {/* Optional Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">الحقول الاختيارية</h3>

            {/* Patient Condition */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                حالة المريض / التشخيص
              </Label>
              <Textarea
                name="patient_condition"
                value={formData.patient_condition}
                onChange={handleChange}
                placeholder="أدخل وصف الحالة الطبية أو التشخيص"
                rows={3}
              />
            </div>

            {/* Allergies */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                الحساسية
              </Label>
              <Input
                type="text"
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                placeholder="أدخل معلومات الحساسية المعروفة"
              />
            </div>

            {/* Medical Conditions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                الحالات الطبية / الأمراض
              </Label>
              <Textarea
                name="medical_conditions"
                value={formData.medical_conditions}
                onChange={handleChange}
                placeholder="أدخل الحالات الطبية أو الأمراض المزمنة"
                rows={2}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                البريد الإلكتروني
              </Label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="أدخل البريد الإلكتروني"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                العنوان
              </Label>
              <Input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="أدخل العنوان الكامل"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                ملاحظات / تعليقات
              </Label>
              <Textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="أدخل أي ملاحظات أو تعليقات إضافية"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end space-x-4 space-x-reverse">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              إلغاء
            </Button>
            <Button type="submit">
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
