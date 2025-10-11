import React, { useState } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { Loader2, AlertTriangle } from 'lucide-react'
import type { InventoryItem } from '../types'

interface ConfirmDeleteInventoryDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (id: string) => Promise<void>
  item: InventoryItem | null
  isLoading?: boolean
}

export default function ConfirmDeleteInventoryDialog({
  isOpen,
  onClose,
  onConfirm,
  item,
  isLoading = false
}: ConfirmDeleteInventoryDialogProps) {
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    if (!item) return

    setIsDeleting(true)
    try {
      await onConfirm(item.id)
      onClose()
      toast({
        title: 'نجح',
        description: 'تم حذف العنصر بنجاح',
      })
    } catch (error) {
      console.error('Error deleting inventory item:', error)
      toast({
        title: 'خطأ',
        description: 'فشل في حذف العنصر. يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (!item) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-[425px]" dir="rtl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg font-semibold text-foreground">
                تأكيد حذف العنصر
              </AlertDialogTitle>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogDescription className="text-right text-muted-foreground">
          هل أنت متأكد من حذف العنصر التالي من المخزون؟
        </AlertDialogDescription>

        <div className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-medium text-foreground">{item.name}</span>
              <span className="text-sm text-muted-foreground">الاسم:</span>
            </div>

            {item.category && (
              <div className="flex justify-between">
                <span className="text-sm">{item.category}</span>
                <span className="text-sm text-muted-foreground">الفئة:</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-sm">
                {item.quantity} {item.unit || 'قطعة'}
              </span>
              <span className="text-sm text-muted-foreground">الكمية:</span>
            </div>

            {item.supplier && (
              <div className="flex justify-between">
                <span className="text-sm">{item.supplier}</span>
                <span className="text-sm text-muted-foreground">المورد:</span>
              </div>
            )}
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive font-medium">
              ⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه
            </p>
            <p className="text-xs text-destructive/80 mt-1">
              سيتم حذف العنصر وجميع سجلات الاستخدام المرتبطة به نهائياً
            </p>
          </div>
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel
            onClick={onClose}
            disabled={isDeleting || isLoading}
            className="flex-1"
          >
            إلغاء
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting || isLoading}
            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {(isDeleting || isLoading) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            حذف العنصر
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
