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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import {
  FileText,
  User,
  Calendar,
  Pill,
  Clock,
  Stethoscope,
  X,
  Edit,
  Printer,
  Copy
} from 'lucide-react'
import type { Prescription } from '@/types'

interface ViewPrescriptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prescription: Prescription | null
  onEdit?: (prescription: Prescription) => void
  onPrint?: (prescription: Prescription) => void
}

export default function ViewPrescriptionDialog({
  open,
  onOpenChange,
  prescription,
  onEdit,
  onPrint
}: ViewPrescriptionDialogProps) {

  if (!prescription) return null

  const handleEdit = () => {
    if (onEdit) {
      onEdit(prescription)
      onOpenChange(false)
    }
  }

  const handlePrint = () => {
    if (onPrint) {
      onPrint(prescription)
    }
  }

  const copyPrescriptionId = () => {
    const prescriptionId = `PRX-${prescription.id.slice(-6)}`
    navigator.clipboard.writeText(prescriptionId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <FileText className="w-5 h-5 text-green-600" />
            تفاصيل الوصفة الطبية
          </DialogTitle>
          <DialogDescription className="text-right">
            عرض تفاصيل الوصفة الطبية للمريض {prescription.patient?.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6" dir="rtl">
          {/* Prescription Header Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-right text-lg">
                <FileText className="w-5 h-5 text-green-600" />
                معلومات الوصفة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">رقم الوصفة:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        PRX-{prescription.id.slice(-6)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyPrescriptionId}
                        className="h-6 w-6 p-0"
                        title="نسخ رقم الوصفة"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-muted-foreground">تاريخ الوصفة:</span>
                    <span className="text-sm font-medium">
                      {formatDate(prescription.prescription_date)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-muted-foreground">تاريخ الإنشاء:</span>
                    <span className="text-sm">
                      {formatDate(prescription.created_at)}
                    </span>
                  </div>
                  {prescription.updated_at !== prescription.created_at && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-muted-foreground">آخر تحديث:</span>
                      <span className="text-sm">
                        {formatDate(prescription.updated_at)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patient Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-right text-lg">
                <User className="w-5 h-5 text-blue-600" />
                معلومات المريض
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-muted-foreground">اسم المريض:</span>
                  <span className="font-medium text-lg">
                    {prescription.patient?.full_name || 'غير محدد'}
                  </span>
                </div>

                {prescription.appointment && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-muted-foreground">الموعد المرتبط:</span>
                    <Badge variant="secondary" className="font-medium">
                      {prescription.appointment.title}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Medications List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-right text-lg">
                <Pill className="w-5 h-5 text-orange-600" />
                الأدوية الموصوفة ({prescription.medications?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prescription.medications && prescription.medications.length > 0 ? (
                <div className="space-y-3">
                  {prescription.medications.map((med, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center p-0 font-bold">
                              {index + 1}
                            </Badge>
                            <h4 className="font-bold text-lg text-orange-800 dark:text-orange-200">
                              {med.medication_name}
                            </h4>
                          </div>

                          {med.dose && (
                            <div className="flex items-center gap-2 mr-10">
                              <Pill className="w-4 h-4 text-orange-600" />
                              <span className="text-sm font-medium text-muted-foreground">الجرعة:</span>
                              <span className="font-medium text-orange-700 dark:text-orange-300">
                                {med.dose}
                              </span>
                            </div>
                          )}

                          {med.medication_instructions && (
                            <div className="mr-10 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border-r-4 border-blue-400">
                              <div className="flex items-start gap-2">
                                <Stethoscope className="w-4 h-4 text-blue-600 mt-0.5" />
                                <div>
                                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                    تعليمات الاستخدام:
                                  </span>
                                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                    {med.medication_instructions}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Pill className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>لا توجد أدوية موصوفة في هذه الوصفة</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {prescription.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-right text-lg">
                  <FileText className="w-5 h-5 text-purple-600" />
                  ملاحظات الطبيب
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border-r-4 border-purple-400">
                  <p className="text-purple-800 dark:text-purple-200 leading-relaxed">
                    {prescription.notes}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex justify-end space-x-2 space-x-reverse">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 ml-2" />
            إغلاق
          </Button>

          {onPrint && (
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 ml-2" />
              طباعة
            </Button>
          )}

          {onEdit && (
            <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Edit className="w-4 h-4 ml-2" />
              تعديل الوصفة
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
