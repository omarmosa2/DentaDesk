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
import { Badge } from '@/components/ui/badge'
import { usePrescriptionStore } from '@/store/prescriptionStore'
import { notify } from '@/services/notificationService'
import { formatDate } from '@/lib/utils'
import { Trash2, AlertTriangle, FileText, User, Calendar, Pill } from 'lucide-react'
import type { Prescription } from '@/types'

interface DeletePrescriptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prescription: Prescription | null
}

export default function DeletePrescriptionDialog({
  open,
  onOpenChange,
  prescription
}: DeletePrescriptionDialogProps) {
  const { deletePrescription, isLoading } = usePrescriptionStore()

  const handleDelete = async () => {
    if (!prescription) return

    try {
      await deletePrescription(prescription.id)
      notify.success('تم حذف الوصفة الطبية بنجاح')
      onOpenChange(false)
    } catch (error) {
      console.error('Error deleting prescription:', error)
      notify.error('فشل في حذف الوصفة الطبية')
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false)
    }
  }

  if (!prescription) return null

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent dir="rtl" className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-right">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            تأكيد حذف الوصفة الطبية
          </AlertDialogTitle>
          <AlertDialogDescription className="text-right space-y-4">
            <div>
              هل أنت متأكد من أنك تريد حذف الوصفة الطبية التالية؟
            </div>
            
            <div className="bg-muted p-4 rounded-md space-y-3">
              {/* Prescription Header */}
              <div className="flex items-center gap-2 pb-2 border-b">
                <FileText className="w-4 h-4 text-red-600" />
                <span className="font-medium">تفاصيل الوصفة الطبية</span>
              </div>

              {/* Patient Info */}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-sm">
                  <span className="font-medium">المريض: </span>
                  {prescription.patient?.full_name || 'غير محدد'}
                </span>
              </div>

              {/* Appointment Info */}
              {prescription.appointment && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <span className="text-sm">
                    <span className="font-medium">الموعد: </span>
                    {prescription.appointment.title}
                  </span>
                </div>
              )}

              {/* Prescription Date */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="text-sm">
                  <span className="font-medium">تاريخ الوصفة: </span>
                  {formatDate(prescription.prescription_date)}
                </span>
              </div>

              {/* Medications */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium">
                    الأدوية ({prescription.medications?.length || 0}):
                  </span>
                </div>
                
                {prescription.medications && prescription.medications.length > 0 ? (
                  <div className="space-y-1 mr-6">
                    {prescription.medications.map((med, index) => (
                      <div key={index} className="text-sm bg-white p-2 rounded border">
                        <div className="font-medium">{med.medication_name}</div>
                        {med.dose && (
                          <div className="text-muted-foreground text-xs">
                            الجرعة: {med.dose}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground mr-6">
                    لا توجد أدوية مرفقة
                  </div>
                )}
              </div>

              {/* Notes */}
              {prescription.notes && (
                <div className="space-y-1">
                  <span className="text-sm font-medium">الملاحظات:</span>
                  <div className="text-sm text-muted-foreground bg-white p-2 rounded border">
                    {prescription.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="text-red-600 font-medium">
              ⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه
            </div>
            
            <div className="text-sm text-muted-foreground">
              سيتم حذف الوصفة الطبية نهائياً من النظام مع جميع الأدوية المرفقة بها. 
              هذا قد يؤثر على السجل الطبي للمريض.
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
