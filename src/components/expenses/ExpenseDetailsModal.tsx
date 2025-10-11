import React from 'react'
import { ClinicExpense } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Receipt,
  Calendar,
  DollarSign,
  CreditCard,
  Building,
  FileText,
  Clock
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import CurrencyDisplay from '@/components/ui/currency-display'

interface ExpenseDetailsModalProps {
  expense: ClinicExpense | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ExpenseDetailsModal({
  expense,
  open,
  onOpenChange
}: ExpenseDetailsModalProps) {
  if (!expense) return null

  // دالة الحصول على اسم نوع المصروف بالعربية
  const getExpenseTypeName = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'salary': 'الرواتب',
      'utilities': 'المرافق',
      'rent': 'الإيجار',
      'maintenance': 'الصيانة',
      'supplies': 'المستلزمات',
      'insurance': 'التأمين',
      'other': 'أخرى'
    }
    return typeMap[type] || type
  }

  // دالة الحصول على اسم طريقة الدفع بالعربية
  const getPaymentMethodName = (method: string) => {
    const methodMap: { [key: string]: string } = {
      'cash': 'نقدي',
      'bank_transfer': 'تحويل بنكي',
      'check': 'شيك',
      'credit_card': 'بطاقة ائتمانية'
    }
    return methodMap[method] || method
  }

  // دالة الحصول على اسم الحالة بالعربية
  const getStatusName = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'paid': 'مدفوع',
      'pending': 'آجل',
      'overdue': 'متأخر',
      'cancelled': 'ملغي'
    }
    return statusMap[status] || status
  }

  // دالة الحصول على لون الحالة
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default'
      case 'pending': return 'secondary'
      case 'overdue': return 'destructive'
      case 'cancelled': return 'outline'
      default: return 'outline'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] arabic-enhanced" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 arabic-enhanced">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="arabic-enhanced">تفاصيل المصروف</span>
          </DialogTitle>
          <DialogDescription className="arabic-enhanced">
            عرض جميع تفاصيل المصروف المحدد
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* معلومات أساسية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
            <div className="space-y-2" dir="rtl">
              <label className="text-sm font-medium text-muted-foreground arabic-enhanced">
                اسم المصروف
              </label>
              <div className="flex items-center gap-2 p-3 border rounded-lg" dir="rtl">
                <Receipt className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium arabic-enhanced">{expense.expense_name}</span>
              </div>
            </div>

            <div className="space-y-2" dir="rtl">
              <label className="text-sm font-medium text-muted-foreground arabic-enhanced">
                المبلغ
              </label>
              <div className="flex items-center gap-2 p-3 border rounded-lg" dir="rtl">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <CurrencyDisplay amount={expense.amount} className="font-bold text-lg" />
              </div>
            </div>

            <div className="space-y-2" dir="rtl">
              <label className="text-sm font-medium text-muted-foreground arabic-enhanced">
                النوع
              </label>
              <div className="flex items-center gap-2 p-3 border rounded-lg" dir="rtl">
                <Building className="w-4 h-4 text-muted-foreground" />
                <Badge variant="outline" className="arabic-enhanced">
                  {getExpenseTypeName(expense.expense_type)}
                </Badge>
              </div>
            </div>

            <div className="space-y-2" dir="rtl">
              <label className="text-sm font-medium text-muted-foreground arabic-enhanced">
                الحالة
              </label>
              <div className="flex items-center gap-2 p-3 border rounded-lg" dir="rtl">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Badge variant={getStatusBadgeVariant(expense.status)} className="arabic-enhanced">
                  {getStatusName(expense.status)}
                </Badge>
              </div>
            </div>

            <div className="space-y-2" dir="rtl">
              <label className="text-sm font-medium text-muted-foreground arabic-enhanced">
                تاريخ الدفع
              </label>
              <div className="flex items-center gap-2 p-3 border rounded-lg" dir="rtl">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="arabic-enhanced">{formatDate(expense.payment_date)}</span>
              </div>
            </div>

            <div className="space-y-2" dir="rtl">
              <label className="text-sm font-medium text-muted-foreground arabic-enhanced">
                طريقة الدفع
              </label>
              <div className="flex items-center gap-2 p-3 border rounded-lg" dir="rtl">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="arabic-enhanced">{getPaymentMethodName(expense.payment_method)}</span>
              </div>
            </div>

            {expense.vendor && (
              <div className="space-y-2" dir="rtl">
                <label className="text-sm font-medium text-muted-foreground arabic-enhanced">
                  المورد
                </label>
                <div className="flex items-center gap-2 p-3 border rounded-lg" dir="rtl">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span className="arabic-enhanced">{expense.vendor}</span>
                </div>
              </div>
            )}

            {expense.receipt_number && (
              <div className="space-y-2" dir="rtl">
                <label className="text-sm font-medium text-muted-foreground arabic-enhanced">
                  رقم الإيصال
                </label>
                <div className="flex items-center gap-2 p-3 border rounded-lg" dir="rtl">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="arabic-enhanced">{expense.receipt_number}</span>
                </div>
              </div>
            )}
          </div>

          {/* الوصف */}
          {expense.description && (
            <>
              <Separator />
              <div className="space-y-2" dir="rtl">
                <label className="text-sm font-medium text-muted-foreground arabic-enhanced">
                  الوصف
                </label>
                <div className="p-3 border rounded-lg bg-muted/50" dir="rtl">
                  <p className="text-sm arabic-enhanced whitespace-pre-wrap">{expense.description}</p>
                </div>
              </div>
            </>
          )}

          {/* المعلومات الإضافية */}
          {(expense.due_date || expense.is_recurring || expense.notes) && (
            <>
              <Separator />
              <div className="space-y-4" dir="rtl">
                <h4 className="text-sm font-medium arabic-enhanced">معلومات إضافية</h4>

                {expense.due_date && (
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded" dir="rtl">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm arabic-enhanced">
                      تاريخ الاستحقاق: {formatDate(expense.due_date)}
                    </span>
                  </div>
                )}

                {expense.is_recurring && (
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded" dir="rtl">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm arabic-enhanced">
                      متكرر: {expense.recurring_frequency ? `كل ${expense.recurring_frequency}` : 'نعم'}
                    </span>
                  </div>
                )}

                {expense.notes && (
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded" dir="rtl">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm arabic-enhanced">
                      ملاحظات: {expense.notes}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* معلومات النظام */}
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground" dir="rtl">
            <div className="arabic-enhanced">
              تاريخ الإنشاء: {formatDate(expense.created_at)}
            </div>
            <div className="arabic-enhanced">
              آخر تحديث: {formatDate(expense.updated_at)}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}