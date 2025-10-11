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
import { useLabStore } from '@/store/labStore'
import { useLabOrderStore } from '@/store/labOrderStore'
import { notify } from '@/services/notificationService'
import { AlertTriangle, Building2, Microscope, Loader2 } from 'lucide-react'
import type { Lab } from '@/types'

interface DeleteLabDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lab: Lab | null
}

export default function DeleteLabDialog({ open, onOpenChange, lab }: DeleteLabDialogProps) {
  const { deleteLab, isLoading } = useLabStore()
  const { getOrdersByLab } = useLabOrderStore()

  if (!lab) return null

  const labOrders = getOrdersByLab(lab.id)
  const hasOrders = labOrders.length > 0

  const handleDelete = async () => {
    try {
      await deleteLab(lab.id)
      notify.success(`تم حذف المختبر "${lab.name}" بنجاح`)
      onOpenChange(false)
    } catch (error) {
      console.error('Error deleting lab:', error)
      notify.error('فشل في حذف المختبر')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader dir="rtl">
          <DialogTitle className="flex items-center gap-2 text-destructive text-right">
            <AlertTriangle className="h-5 w-5" />
            تأكيد حذف المختبر
          </DialogTitle>
          <DialogDescription className="text-right">
            هذا الإجراء لا يمكن التراجع عنه. سيتم حذف المختبر نهائياً من النظام.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lab Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="font-semibold">اسم المختبر:</span>
              <span>{lab.name}</span>
            </div>

            {lab.contact_info && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">معلومات الاتصال:</span>
                <span className="text-sm">{lab.contact_info}</span>
              </div>
            )}

            {lab.address && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">العنوان:</span>
                <span className="text-sm">{lab.address}</span>
              </div>
            )}
          </div>

          {/* Orders Warning */}
          {hasOrders && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold">تحذير مهم</span>
              </div>
              <p className="text-sm text-destructive mb-3">
                هذا المختبر يحتوي على طلبات مرتبطة به. حذف المختبر سيؤدي إلى حذف جميع الطلبات المرتبطة به أيضاً.
              </p>
              <div className="flex items-center gap-2">
                <Microscope className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">عدد الطلبات المرتبطة:</span>
                <Badge variant="destructive" className="text-xs">
                  {labOrders.length} طلب
                </Badge>
              </div>
            </div>
          )}

          {/* Confirmation Message */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>هل أنت متأكد من رغبتك في حذف هذا المختبر؟</strong>
              {hasOrders && (
                <span className="block mt-1">
                  سيتم حذف جميع الطلبات المرتبطة بهذا المختبر ({labOrders.length} طلب).
                </span>
              )}
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
