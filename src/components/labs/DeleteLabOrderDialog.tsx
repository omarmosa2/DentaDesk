import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLabOrderStore } from '@/store/labOrderStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { notify } from '@/services/notificationService'
import {
  AlertTriangle,
  Microscope,
  Building2,
  User,
  DollarSign,
  Calendar,
  Loader2
} from 'lucide-react'
import type { LabOrder } from '@/types'

interface DeleteLabOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  labOrder: LabOrder | null
}

export default function DeleteLabOrderDialog({ open, onOpenChange, labOrder }: DeleteLabOrderDialogProps) {
  const { deleteLabOrder, isLoading } = useLabOrderStore()

  if (!labOrder) return null

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'آجل':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            آجل
          </Badge>
        )
      case 'مكتمل':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            مكتمل
          </Badge>
        )
      case 'ملغي':
        return (
          <Badge variant="destructive">
            ملغي
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleDelete = async () => {
    try {
      await deleteLabOrder(labOrder.id)
      notify.success('تم حذف طلب المختبر بنجاح')
      onOpenChange(false)
    } catch (error) {
      console.error('Error deleting lab order:', error)
      notify.error('فشل في حذف طلب المختبر')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader dir="rtl">
          <DialogTitle className="flex items-center gap-2 text-destructive text-right">
            <AlertTriangle className="h-5 w-5" />
            تأكيد حذف طلب المختبر
          </DialogTitle>
          <DialogDescription className="text-right">
            هذا الإجراء لا يمكن التراجع عنه. سيتم حذف طلب المختبر نهائياً من النظام.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lab Order Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="font-semibold">المختبر:</span>
              <span>{labOrder.lab?.name || 'غير محدد'}</span>
            </div>

            <div className="flex items-center gap-2">
              <Microscope className="h-4 w-4 text-purple-600" />
              <span className="font-semibold">اسم الخدمة:</span>
              <span>{labOrder.service_name}</span>
            </div>

            {labOrder.patient && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-green-600" />
                <span className="font-semibold">المريض:</span>
                <span>{labOrder.patient.full_name}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-semibold">التكلفة:</span>
              <span className="font-bold">{formatCurrency(labOrder.cost)}</span>
            </div>

            {labOrder.paid_amount && labOrder.paid_amount > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="font-semibold">المبلغ المدفوع:</span>
                <span className="font-bold">{formatCurrency(labOrder.paid_amount)}</span>
              </div>
            )}

            {labOrder.remaining_balance && labOrder.remaining_balance > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-red-600" />
                <span className="font-semibold">المبلغ المتبقي:</span>
                <span className="font-bold text-red-600">{formatCurrency(labOrder.remaining_balance)}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              <span className="font-semibold">تاريخ الطلب:</span>
              <span>{formatDate(labOrder.order_date)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold">الحالة:</span>
              {getStatusBadge(labOrder.status)}
            </div>

            {labOrder.notes && (
              <div className="space-y-1">
                <span className="font-semibold">الملاحظات:</span>
                <p className="text-sm text-muted-foreground bg-background p-2 rounded border">
                  {labOrder.notes}
                </p>
              </div>
            )}
          </div>

          {/* Payment Warning */}
          {labOrder.paid_amount && labOrder.paid_amount > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold">تحذير</span>
              </div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                هذا الطلب يحتوي على مدفوعات بقيمة {formatCurrency(labOrder.paid_amount)}.
                حذف الطلب لن يؤثر على سجلات المدفوعات الأخرى في النظام.
              </p>
            </div>
          )}

          {/* Confirmation Message */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>هل أنت متأكد من رغبتك في حذف طلب المختبر هذا؟</strong>
              <span className="block mt-1">
                سيتم حذف جميع المعلومات المرتبطة بهذا الطلب نهائياً.
              </span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2" dir="rtl">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الحذف...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 ml-2" />
                حذف نهائياً
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
