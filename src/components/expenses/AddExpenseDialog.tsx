import React, { useState, useEffect } from 'react'
import { useExpensesStore } from '../../store/expensesStore'
import { useCurrency } from '@/contexts/CurrencyContext'
import CurrencyDisplay from '@/components/ui/currency-display'
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
import { Checkbox } from '../ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Loader2, DollarSign, Calendar, Receipt } from 'lucide-react'
import type { ClinicExpense } from '../../types'

interface AddExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingExpense?: ClinicExpense | null
}

const AddExpenseDialog: React.FC<AddExpenseDialogProps> = ({
  open,
  onOpenChange,
  editingExpense
}) => {
  const { createExpense, updateExpense, isLoading, categories, vendors } = useExpensesStore()
  const { currentCurrency, formatAmount, getCurrencySymbol } = useCurrency()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    expense_name: '',
    amount: '',
    expense_type: '',
    category: '',
    description: '',
    payment_method: '',
    payment_date: '',
    due_date: '',
    is_recurring: false,
    recurring_frequency: '',
    recurring_end_date: '',
    status: 'pending',
    receipt_number: '',
    vendor: '',
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

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

  // Expense types with Arabic labels
  const expenseTypes = [
    { value: 'salary', label: 'راتب' },
    { value: 'utilities', label: 'مرافق (كهرباء، مياه، غاز)' },
    { value: 'rent', label: 'إيجار' },
    { value: 'maintenance', label: 'صيانة' },
    { value: 'supplies', label: 'مستلزمات' },
    { value: 'insurance', label: 'تأمين' },
    { value: 'other', label: 'أخرى' }
  ]

  const paymentMethods = [
    { value: 'cash', label: 'نقدي' },
    { value: 'bank_transfer', label: 'تحويل بنكي' },
    { value: 'check', label: 'شيك' },
    { value: 'credit_card', label: 'بطاقة ائتمان' }
  ]

  const statusOptions = [
    { value: 'pending', label: 'آجل' },
    { value: 'paid', label: 'مدفوع' },
    { value: 'overdue', label: 'متأخر' },
    { value: 'cancelled', label: 'ملغي' }
  ]

  const recurringFrequencies = [
    { value: 'daily', label: 'يومي' },
    { value: 'weekly', label: 'أسبوعي' },
    { value: 'monthly', label: 'شهري' },
    { value: 'quarterly', label: 'ربع سنوي' },
    { value: 'yearly', label: 'سنوي' }
  ]

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        expense_name: editingExpense.expense_name || '',
        amount: editingExpense.amount?.toString() || '',
        expense_type: editingExpense.expense_type || '',
        category: editingExpense.category || '',
        description: editingExpense.description || '',
        payment_method: editingExpense.payment_method || '',
        payment_date: editingExpense.payment_date?.split('T')[0] || '',
        due_date: editingExpense.due_date?.split('T')[0] || '',
        is_recurring: editingExpense.is_recurring || false,
        recurring_frequency: editingExpense.recurring_frequency || '',
        recurring_end_date: editingExpense.recurring_end_date?.split('T')[0] || '',
        status: editingExpense.status || 'pending',
        receipt_number: editingExpense.receipt_number || '',
        vendor: editingExpense.vendor || '',
        notes: editingExpense.notes || ''
      })
    } else {
      // Reset form for new expense
      setFormData({
        expense_name: '',
        amount: '',
        expense_type: '',
        category: '',
        description: '',
        payment_method: '',
        payment_date: new Date().toISOString().split('T')[0],
        due_date: '',
        is_recurring: false,
        recurring_frequency: '',
        recurring_end_date: '',
        status: 'pending',
        receipt_number: '',
        vendor: '',
        notes: ''
      })
    }
    setErrors({})
  }, [editingExpense, open])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.expense_name.trim()) {
      newErrors.expense_name = 'اسم المصروف مطلوب'
    }

    if (!formData.amount || parseFloat(removeCommas(formData.amount)) <= 0) {
      newErrors.amount = 'المبلغ مطلوب ويجب أن يكون أكبر من صفر'
    }

    if (!formData.expense_type) {
      newErrors.expense_type = 'نوع المصروف مطلوب'
    }

    if (!formData.payment_method) {
      newErrors.payment_method = 'طريقة الدفع مطلوبة'
    }

    if (!formData.payment_date) {
      newErrors.payment_date = 'تاريخ الدفع مطلوب'
    }

    if (formData.is_recurring && !formData.recurring_frequency) {
      newErrors.recurring_frequency = 'تكرار المصروف مطلوب للمصروفات المتكررة'
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
      const expenseData = {
        ...formData,
        amount: parseFloat(removeCommas(formData.amount)),
        payment_date: new Date(formData.payment_date).toISOString(),
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
        recurring_end_date: formData.recurring_end_date ? new Date(formData.recurring_end_date).toISOString() : undefined,
      }

      if (editingExpense) {
        await updateExpense(editingExpense.id, expenseData)
        toast({
          title: 'تم التحديث بنجاح',
          description: 'تم تحديث المصروف بنجاح',
        })
      } else {
        await createExpense(expenseData)
        toast({
          title: 'تم الإضافة بنجاح',
          description: 'تم إضافة المصروف بنجاح',
        })
      }

      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: editingExpense ? 'فشل في تحديث المصروف' : 'فشل في إضافة المصروف',
        variant: 'destructive',
      })
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleAmountChange = (value: string) => {
    // Format the amount with commas for display
    const formattedValue = formatNumberWithCommas(value)
    handleInputChange('amount', formattedValue)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            {editingExpense ? 'تعديل المصروف' : 'إضافة مصروف جديد'}
          </DialogTitle>
          <DialogDescription>
            {editingExpense ? 'تعديل بيانات المصروف' : 'إضافة مصروف جديد للعيادة'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense_name">اسم المصروف *</Label>
              <Input
                id="expense_name"
                value={formData.expense_name}
                onChange={(e) => handleInputChange('expense_name', e.target.value)}
                placeholder="مثال: راتب السكرتيرة"
                className={errors.expense_name ? 'border-destructive' : ''}
              />
              {errors.expense_name && (
                <p className="text-sm text-destructive">{errors.expense_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">المبلغ ({getCurrencySymbol()}) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="text"
                  value={formData.amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onBlur={(e) => {
                    const value = parseFloat(removeCommas(e.target.value)) || 0
                    handleInputChange('amount', value.toString())
                  }}
                  placeholder="0.00"
                  className={`pl-10 ${errors.amount ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense_type">نوع المصروف *</Label>
              <Select
                value={formData.expense_type}
                onValueChange={(value) => handleInputChange('expense_type', value)}
              >
                <SelectTrigger className={errors.expense_type ? 'border-destructive' : ''}>
                  <SelectValue placeholder="اختر نوع المصروف" />
                </SelectTrigger>
                <SelectContent>
                  {expenseTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.expense_type && (
                <p className="text-sm text-destructive">{errors.expense_type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">الفئة</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="مثال: مصروفات إدارية"
                list="categories"
              />
              <datalist id="categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="وصف تفصيلي للمصروف"
              rows={3}
            />
          </div>

          {/* Payment Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_method">طريقة الدفع *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => handleInputChange('payment_method', value)}
              >
                <SelectTrigger className={errors.payment_method ? 'border-destructive' : ''}>
                  <SelectValue placeholder="اختر طريقة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.payment_method && (
                <p className="text-sm text-destructive">{errors.payment_method}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">الحالة</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_date">تاريخ الدفع *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => handleInputChange('payment_date', e.target.value)}
                  className={`pl-10 ${errors.payment_date ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.payment_date && (
                <p className="text-sm text-destructive">{errors.payment_date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Recurring Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => handleInputChange('is_recurring', checked)}
              />
              <Label htmlFor="is_recurring">مصروف متكرر</Label>
            </div>

            {formData.is_recurring && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recurring_frequency">تكرار المصروف *</Label>
                  <Select
                    value={formData.recurring_frequency}
                    onValueChange={(value) => handleInputChange('recurring_frequency', value)}
                  >
                    <SelectTrigger className={errors.recurring_frequency ? 'border-destructive' : ''}>
                      <SelectValue placeholder="اختر التكرار" />
                    </SelectTrigger>
                    <SelectContent>
                      {recurringFrequencies.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.recurring_frequency && (
                    <p className="text-sm text-destructive">{errors.recurring_frequency}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurring_end_date">تاريخ انتهاء التكرار</Label>
                  <Input
                    id="recurring_end_date"
                    type="date"
                    value={formData.recurring_end_date}
                    onChange={(e) => handleInputChange('recurring_end_date', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="receipt_number">رقم الإيصال</Label>
              <Input
                id="receipt_number"
                value={formData.receipt_number}
                onChange={(e) => handleInputChange('receipt_number', e.target.value)}
                placeholder="رقم الإيصال أو الفاتورة"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">المورد/الجهة</Label>
              <Input
                id="vendor"
                value={formData.vendor}
                onChange={(e) => handleInputChange('vendor', e.target.value)}
                placeholder="اسم المورد أو الجهة"
                list="vendors"
              />
              <datalist id="vendors">
                {vendors.map((vendor) => (
                  <option key={vendor} value={vendor} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="ملاحظات إضافية"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingExpense ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddExpenseDialog
