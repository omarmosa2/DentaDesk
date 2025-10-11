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
import { useMedicationStore } from '@/store/medicationStore'
import { notify } from '@/services/notificationService'
import { Pill, Save, X } from 'lucide-react'
import type { Medication } from '@/types'

interface AddMedicationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingMedication?: Medication | null
}

export default function AddMedicationDialog({
  open,
  onOpenChange,
  editingMedication
}: AddMedicationDialogProps) {
  const { createMedication, updateMedication, isLoading } = useMedicationStore()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    instructions: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when dialog opens/closes or editing medication changes
  useEffect(() => {
    if (open) {
      if (editingMedication) {
        setFormData({
          name: editingMedication.name || '',
          instructions: editingMedication.instructions || ''
        })
      } else {
        setFormData({
          name: '',
          instructions: ''
        })
      }
      setErrors({})
    }
  }, [open, editingMedication])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'اسم الدواء مطلوب'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'اسم الدواء يجب أن يكون على الأقل حرفين'
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
      const medicationData = {
        name: formData.name.trim(),
        instructions: formData.instructions.trim() || undefined
      }

      if (editingMedication && editingMedication.id) {
        await updateMedication(editingMedication.id, medicationData)
        notify.success('تم تحديث الدواء بنجاح')
      } else {
        await createMedication(medicationData)
        notify.success('تم إضافة الدواء بنجاح')
      }

      onOpenChange(false)
    } catch (error) {
      console.error('Error saving medication:', error)
      notify.error(editingMedication ? 'فشل في تحديث الدواء' : 'فشل في إضافة الدواء')
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Pill className="w-5 h-5 text-blue-600" />
            {editingMedication ? 'تعديل الدواء' : 'إضافة دواء جديد'}
          </DialogTitle>
          <DialogDescription className="text-right">
            {editingMedication
              ? 'قم بتعديل معلومات الدواء أدناه'
              : 'أدخل معلومات الدواء الجديد أدناه'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {/* Medication Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-right block">
                اسم الدواء <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="أدخل اسم الدواء"
                className={`text-right ${errors.name ? 'border-red-500' : ''}`}
                dir="rtl"
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-500 text-right">{errors.name}</p>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label htmlFor="instructions" className="text-right block">
                تعليمات الاستخدام
              </Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => handleInputChange('instructions', e.target.value)}
                placeholder="أدخل تعليمات استخدام الدواء (اختياري)"
                className="text-right min-h-[100px]"
                dir="rtl"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground text-right">
                مثال: قرص واحد كل 8 ساعات بعد الأكل
              </p>
            </div>
          </div>

          <DialogFooter className="flex justify-end space-x-2 space-x-reverse">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              <X className="w-4 h-4 ml-2" />
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  جاري الحفظ...
                </div>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  {editingMedication ? 'تحديث' : 'إضافة'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
