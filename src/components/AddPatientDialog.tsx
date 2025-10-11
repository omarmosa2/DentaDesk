import React, { useState } from 'react'
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

interface AddPatientDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => void
}

export default function AddPatientDialog({ isOpen, onClose, onSave }: AddPatientDialogProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    phone: '',
    email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_history: '',
    allergies: '',
    insurance_info: '',
    notes: '',
    date_added: new Date().toISOString().slice(0, 16) // Set current local date and time
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    setFormData({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      phone: '',
      email: '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      medical_history: '',
      allergies: '',
      insurance_info: '',
      notes: '',
      date_added: new Date().toISOString().slice(0, 16) // Reset to current time
    })
    onClose()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة مريض جديد</DialogTitle>
          <DialogDescription>
            أدخل معلومات المريض أدناه. الحقول المميزة بـ * مطلوبة.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">المعلومات الأساسية</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center space-x-1 space-x-reverse">
                  <User className="w-4 h-4" />
                  <span>الاسم الأول *</span>
                </Label>
                <Input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  placeholder="أدخل الاسم الأول"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center space-x-1 space-x-reverse">
                  <User className="w-4 h-4" />
                  <span>الاسم الأخير *</span>
                </Label>
                <Input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  placeholder="أدخل الاسم الأخير"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center space-x-1 space-x-reverse">
                  <Calendar className="w-4 h-4" />
                  <span>تاريخ الميلاد</span>
                </Label>
                <Input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center space-x-1 space-x-reverse">
                  <Phone className="w-4 h-4" />
                  <span>رقم الهاتف</span>
                </Label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="05xxxxxxxx"
                />
              </div>
            </div>

            {/* Date Added */}
            <div className="space-y-2">
              <Label className="flex items-center space-x-1 space-x-reverse">
                <Calendar className="w-4 h-4" />
                <span>تاريخ الإضافة *</span>
              </Label>
              <Input
                type="datetime-local"
                name="date_added"
                value={formData.date_added}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center space-x-1 space-x-reverse">
                  <Mail className="w-4 h-4" />
                  <span>البريد الإلكتروني</span>
                </Label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center space-x-1 space-x-reverse">
                  <MapPin className="w-4 h-4" />
                  <span>العنوان</span>
                </Label>
                <Input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="أدخل العنوان"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">جهة الاتصال في حالات الطوارئ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم جهة الاتصال</Label>
                <Input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  placeholder="اسم جهة الاتصال"
                />
              </div>

              <div className="space-y-2">
                <Label>رقم هاتف الطوارئ</Label>
                <Input
                  type="tel"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                  placeholder="05xxxxxxxx"
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">المعلومات الطبية</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center space-x-1 space-x-reverse">
                  <FileText className="w-4 h-4" />
                  <span>التاريخ الطبي</span>
                </Label>
                <Textarea
                  name="medical_history"
                  value={formData.medical_history}
                  onChange={handleChange}
                  rows={3}
                  placeholder="أدخل التاريخ الطبي للمريض"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center space-x-1 space-x-reverse">
                  <AlertTriangle className="w-4 h-4" />
                  <span>الحساسية</span>
                </Label>
                <Textarea
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  rows={2}
                  placeholder="أدخل معلومات الحساسية"
                />
              </div>

              <div className="space-y-2">
                <Label>معلومات التأمين</Label>
                <Input
                  type="text"
                  name="insurance_info"
                  value={formData.insurance_info}
                  onChange={handleChange}
                  placeholder="معلومات التأمين الصحي"
                />
              </div>

              <div className="space-y-2">
                <Label>ملاحظات إضافية</Label>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="أي ملاحظات إضافية"
                />
              </div>
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
              حفظ المريض
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
