import React from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle } from 'lucide-react'
import type { ClinicNeed } from '../../types'
import { formatCurrency } from '../../lib/utils'

interface DeleteClinicNeedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  need: ClinicNeed | null
}

const DeleteClinicNeedDialog: React.FC<DeleteClinicNeedDialogProps> = ({
  open,
  onOpenChange,
  need
}) => {
  const { deleteNeed, isLoading } = useClinicNeedsStore()
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!need) return

    try {
      await deleteNeed(need.id)
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف الاحتياج بنجاح",
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الاحتياج",
        variant: "destructive",
      })
    }
  }

  if (!need) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            تأكيد الحذف
          </DialogTitle>
          <DialogDescription>
            هل أنت متأكد من حذف هذا الاحتياج؟ لا يمكن التراجع عن هذا الإجراء.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">#:</span>
              <span>{need.serial_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">اسم الاحتياج:</span>
              <span>{need.need_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">الكمية:</span>
              <span>{need.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">السعر:</span>
              <span>{formatCurrency(need.price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">الإجمالي:</span>
              <span className="font-bold">{formatCurrency(need.price * need.quantity)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? 'جاري الحذف...' : 'حذف'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteClinicNeedDialog
