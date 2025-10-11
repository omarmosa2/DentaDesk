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
import { AlertTriangle, Calendar, User, Clock } from 'lucide-react'
import { Appointment, Patient } from '@/types'
import { formatDateTime } from '@/lib/utils'

interface DeleteAppointmentDialogProps {
  isOpen: boolean
  appointment: Appointment | null
  patient: Patient | null
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
}

export default function DeleteAppointmentDialog({
  isOpen,
  appointment,
  patient,
  onClose,
  onConfirm,
  isLoading = false
}: DeleteAppointmentDialogProps) {
  if (!appointment) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive arabic-enhanced">
            <AlertTriangle className="w-5 h-5" />
            تأكيد حذف الموعد
          </DialogTitle>
          <DialogDescription className="text-right arabic-enhanced">
            هل أنت متأكد من أنك تريد حذف هذا الموعد؟ لا يمكن التراجع عن هذا الإجراء.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium arabic-enhanced">تفاصيل الموعد:</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="arabic-enhanced">المريض: {patient?.full_name || 'غير معروف'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>التاريخ والوقت: {formatDateTime(appointment.start_time)}</span>
              </div>
              
              {appointment.title && (
                <div className="arabic-enhanced">
                  <span className="font-medium">العنوان: </span>
                  <span>{appointment.title}</span>
                </div>
              )}
              
              {appointment.description && (
                <div className="arabic-enhanced">
                  <span className="font-medium">الوصف: </span>
                  <span>{appointment.description}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="arabic-enhanced"
          >
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="arabic-enhanced"
          >
            {isLoading ? 'جاري الحذف...' : 'حذف الموعد'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
