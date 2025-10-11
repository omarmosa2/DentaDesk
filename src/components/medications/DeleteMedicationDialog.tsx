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
import { useMedicationStore } from '@/store/medicationStore'
import { notify } from '@/services/notificationService'
import { Trash2, AlertTriangle } from 'lucide-react'
import type { Medication } from '@/types'

interface DeleteMedicationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  medication: Medication | null
}

export default function DeleteMedicationDialog({
  open,
  onOpenChange,
  medication
}: DeleteMedicationDialogProps) {
  const { deleteMedication, isLoading } = useMedicationStore()

  const handleDelete = async () => {
    if (!medication) return

    try {
      await deleteMedication(medication.id)
      notify.success('تم حذف الدواء بنجاح')
      onOpenChange(false)
    } catch (error) {
      console.error('Error deleting medication:', error)
      notify.error('فشل في حذف الدواء')
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false)
    }
  }

  if (!medication) return null

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent dir="rtl" className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-right">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            تأكيد حذف الدواء
          </AlertDialogTitle>
          <AlertDialogDescription className="text-right space-y-2">
            <div>
              هل أنت متأكد من أنك تريد حذف الدواء التالي؟
            </div>
            <div className="bg-muted p-3 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span className="font-medium">{medication.name}</span>
              </div>
              {medication.instructions && (
                <div className="text-sm text-muted-foreground">
                  التعليمات: {medication.instructions}
                </div>
              )}
            </div>
            <div className="text-red-600 font-medium">
              ⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه
            </div>
            <div className="text-sm text-muted-foreground">
              سيتم حذف الدواء نهائياً من النظام. إذا كان هذا الدواء مرتبط بوصفات طبية موجودة، 
              فقد يؤثر ذلك على سجلات المرضى.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex justify-end space-x-2 space-x-reverse">
          <AlertDialogCancel disabled={isLoading}>
            إلغاء
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                جاري الحذف...
              </div>
            ) : (
              <>
                <Trash2 className="w-4 h-4 ml-2" />
                حذف نهائي
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
