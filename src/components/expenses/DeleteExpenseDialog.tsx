import React from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { Loader2, AlertTriangle, Receipt } from 'lucide-react'
import type { ClinicExpense } from '../../types'

interface DeleteExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: ClinicExpense | null
}

const DeleteExpenseDialog: React.FC<DeleteExpenseDialogProps> = ({
  open,
  onOpenChange,
  expense
}) => {
  const { deleteExpense, isLoading } = useExpensesStore()
  const { formatAmount } = useCurrency()
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!expense) return

    try {
      await deleteExpense(expense.id)
      toast({
        title: 'تم الحذف بنجاح',
        description: 'تم حذف المصروف بنجاح',
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'خطأ في الحذف',
        description: 'فشل في حذف المصروف. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      })
    }
  }

  if (!expense) return null

  // Get expense type label in Arabic
  const getExpenseTypeLabel = (type: string) => {
    const types = {
      salary: 'راتب',
      utilities: 'مرافق',
      rent: 'إيجار',
      maintenance: 'صيانة',
      supplies: 'مستلزمات',
      insurance: 'تأمين',
      other: 'أخرى'
    }
    return types[type as keyof typeof types] || type
  }

  // Get status label in Arabic
  const getStatusLabel = (status: string) => {
    const statuses = {
      pending: 'آجل',
      paid: 'مدفوع',
      overdue: 'متأخر',
      cancelled: 'ملغي'
    }
    return statuses[status as keyof typeof statuses] || status
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            تأكيد حذف المصروف
          </DialogTitle>
          <DialogDescription>
            هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Expense Details */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">{expense.expense_name}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">المبلغ:</span>
                <span className="font-medium text-foreground mr-2">
                  <CurrencyDisplay amount={expense.amount} />
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">النوع:</span>
                <span className="font-medium text-foreground mr-2">
                  {getExpenseTypeLabel(expense.expense_type)}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">الحالة:</span>
                <span className="font-medium text-foreground mr-2">
                  {getStatusLabel(expense.status)}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">التاريخ:</span>
                <span className="font-medium text-foreground mr-2">
                  {new Date(expense.payment_date).toLocaleDateString('ar-SA')}
                </span>
              </div>
            </div>

            {expense.description && (
              <div>
                <span className="text-muted-foreground text-sm">الوصف:</span>
                <p className="text-sm text-foreground mt-1">{expense.description}</p>
              </div>
            )}

            {expense.vendor && (
              <div>
                <span className="text-muted-foreground text-sm">المورد:</span>
                <span className="text-sm text-foreground mr-2">{expense.vendor}</span>
              </div>
            )}

            {expense.receipt_number && (
              <div>
                <span className="text-muted-foreground text-sm">رقم الإيصال:</span>
                <span className="text-sm text-foreground mr-2">{expense.receipt_number}</span>
              </div>
            )}

            {expense.is_recurring && (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                  مصروف متكرر
                </span>
                {expense.recurring_frequency && (
                  <span className="text-xs text-muted-foreground">
                    ({expense.recurring_frequency})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Warning Message */}
          <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-destructive mb-1">تحذير:</p>
                <p className="text-destructive/80">
                  سيتم حذف هذا المصروف نهائياً من النظام. إذا كان هذا مصروف متكرر،
                  فسيتم حذف جميع التكرارات المستقبلية أيضاً.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            حذف المصروف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteExpenseDialog
