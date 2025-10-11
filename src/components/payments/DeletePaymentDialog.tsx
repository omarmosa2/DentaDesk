import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePaymentStore } from '@/store/paymentStore'
import { usePatientStore } from '@/store/patientStore'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle, CreditCard, User, Calendar } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Payment } from '@/types'

interface DeletePaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: Payment
}

export default function DeletePaymentDialog({ open, onOpenChange, payment }: DeletePaymentDialogProps) {
  const { toast } = useToast()
  const { deletePayment, isLoading } = usePaymentStore()
  const { patients } = usePatientStore()

  const getPatientName = (payment: Payment) => {
    // First try to get patient from payment object
    if (payment.patient) {
      return `${payment.patient.first_name} ${payment.patient.last_name}`
    }

    // If not found, try to find patient from patients store
    const patient = patients.find(p => p.id === payment.patient_id)
    if (patient) {
      return `${patient.first_name} ${patient.last_name}`
    }

    return 'غير محدد'
  }

  const handleDelete = async () => {
    try {
      await deletePayment(payment.id)

      toast({
        title: 'تم بنجاح',
        description: 'تم حذف الدفعة بنجاح',
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الدفعة',
        variant: 'destructive',
      })
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      cash: 'نقداً',
      bank_transfer: 'تحويل بنكي'
    }
    return methods[method as keyof typeof methods] || method
  }

  const getStatusLabel = (status: string) => {
    const statuses = {
      completed: 'مكتمل',
      partial: 'جزئي',
      pending: 'آجل'
    }
    return statuses[status as keyof typeof statuses] || status
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg" dir="rtl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg font-semibold text-destructive">
                تأكيد حذف الدفعة
              </AlertDialogTitle>
              <AlertDialogDescription>
                هذا الإجراء لا يمكن التراجع عنه
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4">
          <AlertDialogDescription>
            هل أنت متأكد من رغبتك في حذف هذه الدفعة؟ لا يمكن التراجع عن هذا الإجراء.
          </AlertDialogDescription>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">تفاصيل الدفعة</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground">رقم الإيصال:</span>
                  <div className="font-medium">
                    {payment.receipt_number || `#${payment.id.slice(-6)}`}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground">المبلغ:</span>
                  <Badge variant="outline" className="font-medium">
                    {formatCurrency(payment.amount)}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" />
                    المريض:
                  </span>
                  <div className="font-medium">{getPatientName(payment)}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground">طريقة الدفع:</span>
                  <Badge variant="secondary">
                    {getPaymentMethodLabel(payment.payment_method)}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground">الحالة:</span>
                  <Badge variant="outline">
                    {getStatusLabel(payment.status)}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    تاريخ الدفع:
                  </span>
                  <div className="font-medium">{formatDate(payment.payment_date)}</div>
                </div>
              </div>

              {payment.description && (
                <div className="border-t pt-3 mt-3 space-y-2">
                  <div>
                    <span className="text-muted-foreground text-xs">الوصف:</span>
                    <p className="text-sm">{payment.description}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <AlertDialogFooter className="flex justify-end space-x-2 space-x-reverse">
          <AlertDialogCancel disabled={isLoading}>
            إلغاء
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'جاري الحذف...' : 'حذف الدفعة'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
