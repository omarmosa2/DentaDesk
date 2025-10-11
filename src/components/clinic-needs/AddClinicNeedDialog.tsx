import React, { useState, useEffect } from 'react'
import { useClinicNeedsStore } from '../../store/clinicNeedsStore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { useToast } from '@/hooks/use-toast'
import type { ClinicNeed } from '../../types'

interface AddClinicNeedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingNeed?: ClinicNeed | null
}

const AddClinicNeedDialog: React.FC<AddClinicNeedDialogProps> = ({
  open,
  onOpenChange,
  editingNeed
}) => {
  const { createNeed, updateNeed, isLoading, categories, suppliers, getNextSerialNumber } = useClinicNeedsStore()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    need_name: '',
    quantity: 1,
    price: 0,
    description: '',
    category: '',
    priority: 'medium' as const,
    status: 'pending' as const,
    supplier: '',
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editingNeed) {
      setFormData({
        need_name: editingNeed.need_name,
        quantity: editingNeed.quantity,
        price: editingNeed.price,
        description: editingNeed.description || '',
        category: editingNeed.category || '',
        priority: editingNeed.priority,
        status: editingNeed.status,
        supplier: editingNeed.supplier || '',
        notes: editingNeed.notes || ''
      })
    } else {
      // Reset form for new need
      setFormData({
        need_name: '',
        quantity: 1,
        price: 0,
        description: '',
        category: '',
        priority: 'medium',
        status: 'pending',
        supplier: '',
        notes: ''
      })
    }
    setErrors({})
  }, [editingNeed, open])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.need_name.trim()) {
      newErrors.need_name = 'اسم الاحتياج مطلوب'
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = 'الكمية يجب أن تكون أكبر من صفر'
    }

    if (formData.price < 0) {
      newErrors.price = 'السعر لا يمكن أن يكون سالباً'
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
      if (editingNeed) {
        // Keep the original serial number when updating
        const dataToSubmit = {
          ...formData,
          serial_number: editingNeed.serial_number
        }
        await updateNeed(editingNeed.id, dataToSubmit)
        toast({
          title: "تم التحديث بنجاح",
          description: "تم تحديث الاحتياج بنجاح",
        })
      } else {
        // Generate serial number automatically for new needs
        const dataToSubmit = {
          ...formData,
          serial_number: getNextSerialNumber()
        }
        await createNeed(dataToSubmit)
        toast({
          title: "تم الإنشاء بنجاح",
          description: "تم إنشاء الاحتياج الجديد بنجاح",
        })
      }
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الاحتياج",
        variant: "destructive",
      })
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {editingNeed ? 'تعديل الاحتياج' : 'إضافة احتياج جديد'}
          </DialogTitle>
          <DialogDescription>
            {editingNeed
              ? 'قم بتعديل بيانات الاحتياج'
              : 'أدخل بيانات الاحتياج الجديد للعيادة'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="need_name">اسم الاحتياج *</Label>
            <Input
              id="need_name"
              value={formData.need_name}
              onChange={(e) => handleInputChange('need_name', e.target.value)}
              placeholder="أدخل اسم الاحتياج"
              className={errors.need_name ? 'border-red-500' : ''}
            />
            {errors.need_name && (
              <p className="text-sm text-red-500">{errors.need_name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">الكمية</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => {
                  const value = e.target.value
                  handleInputChange('quantity', value === '' ? 1 : parseInt(value) || 1)
                }}
                onBlur={(e) => {
                  const value = parseInt(e.target.value) || 1
                  handleInputChange('quantity', value)
                }}
                className={errors.quantity ? 'border-red-500' : ''}
              />
              {errors.quantity && (
                <p className="text-sm text-red-500">{errors.quantity}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">السعر</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.1"
                value={formData.price}
                onChange={(e) => {
                  const value = e.target.value
                  handleInputChange('price', value === '' ? 0 : parseFloat(value) || 0)
                }}
                onBlur={(e) => {
                  const value = parseFloat(e.target.value) || 0
                  handleInputChange('price', value)
                }}
                className={errors.price ? 'border-red-500' : ''}
              />
              {errors.price && (
                <p className="text-sm text-red-500">{errors.price}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">الفئة</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="أدوات طبية">أدوات طبية</SelectItem>
                  <SelectItem value="مواد استهلاكية">مواد استهلاكية</SelectItem>
                  <SelectItem value="أجهزة">أجهزة</SelectItem>
                  <SelectItem value="أثاث">أثاث</SelectItem>
                  <SelectItem value="مواد تنظيف">مواد تنظيف</SelectItem>
                  <SelectItem value="أخرى">أخرى</SelectItem>
                  {categories
                    .filter(category => !['أدوات طبية', 'مواد استهلاكية', 'أجهزة', 'أثاث', 'مواد تنظيف', 'أخرى'].includes(category))
                    .map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">الأولوية</Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الأولوية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">عاجل</SelectItem>
                  <SelectItem value="high">عالي</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="low">منخفض</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">الحالة</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">آجل</SelectItem>
                  <SelectItem value="ordered">مطلوب</SelectItem>
                  <SelectItem value="received">مستلم</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">المورد</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => handleInputChange('supplier', e.target.value)}
                placeholder="اسم المورد (اختياري)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="وصف تفصيلي للاحتياج (اختياري)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="ملاحظات إضافية (اختياري)"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'جاري الحفظ...' : editingNeed ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddClinicNeedDialog
