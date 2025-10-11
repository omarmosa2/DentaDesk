import React from 'react'
import { Payment, Patient } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Eye,
  User,
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  Receipt,
  Clock,
  CheckCircle,
  AlertCircle,
  Stethoscope,
  Activity
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getTreatmentNameInArabic } from '@/utils/arabicTranslations'
import { useCurrency } from '@/contexts/CurrencyContext'

interface PaymentDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: Payment | null
  patients: Patient[]
}

export default function PaymentDetailsDialog({
  open,
  onOpenChange,
  payment,
  patients
}: PaymentDetailsDialogProps) {
  const { formatAmount } = useCurrency()

  if (!payment) return null

  const patient = patients.find(p => p.id === payment.patient_id)

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'نقدي'
      case 'bank_transfer':
        return 'تحويل بنكي'
      default:
        return method
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 ml-1" />
            مكتملة
          </Badge>
        )
      case 'partial':
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <AlertCircle className="w-3 h-3 ml-1" />
            جزئية
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="default" className="bg-orange-100 text-orange-800 border-orange-200">
            <Clock className="w-3 h-3 ml-1" />
            آجلة
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'partial':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      case 'pending':
        return <Clock className="w-5 h-5 text-orange-600" />
      default:
        return <FileText className="w-5 h-5 text-gray-600" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border shadow-2xl" dir="rtl">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="flex items-center text-xl font-semibold text-foreground">
            <Eye className="w-5 h-5 ml-2 text-primary" />
            تفاصيل الدفعة
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            عرض تفاصيل شاملة للدفعة رقم {payment.receipt_number || payment.id.slice(-6)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* معلومات أساسية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* معلومات المريض */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg text-card-foreground">
                  <User className="w-4 h-4 ml-2 text-primary" />
                  معلومات المريض
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">الاسم:</span>
                  <span className="text-sm font-medium text-foreground">
                    {patient?.full_name || 'غير محدد'}
                  </span>
                </div>
                {patient?.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">الهاتف:</span>
                    <span className="text-sm text-foreground">{patient.phone}</span>
                  </div>
                )}
                {patient?.date_of_birth && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">تاريخ الميلاد:</span>
                    <span className="text-sm text-foreground">{formatDate(patient.date_of_birth)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* معلومات الدفعة */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg text-card-foreground">
                  <CreditCard className="w-4 h-4 ml-2 text-primary" />
                  معلومات الدفعة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">رقم الإيصال:</span>
                  <span className="text-sm font-medium text-foreground">
                    {payment.receipt_number || payment.id.slice(-6)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">تاريخ الدفع:</span>
                  <span className="text-sm text-foreground">{formatDate(payment.payment_date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">طريقة الدفع:</span>
                  <Badge variant="outline" className="text-xs">
                    {getPaymentMethodLabel(payment.payment_method)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">الحالة:</span>
                  {getStatusBadge(payment.status)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* المبالغ المالية */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg text-card-foreground">
                <DollarSign className="w-4 h-4 ml-2 text-primary" />
                التفاصيل المالية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatAmount(payment.amount)}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">المبلغ المدفوع</div>
                </div>

                {payment.discount_amount && payment.discount_amount > 0 && (
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatAmount(payment.discount_amount)}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400 mt-1">الخصم</div>
                  </div>
                )}

                {payment.tax_amount && payment.tax_amount > 0 && (
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {formatAmount(payment.tax_amount)}
                    </div>
                    <div className="text-sm text-orange-600 dark:text-orange-400 mt-1">الضريبة</div>
                  </div>
                )}

                <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatAmount(
                      payment.total_amount ||
                      (payment.amount + (payment.tax_amount || 0) - (payment.discount_amount || 0))
                    )}
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">المبلغ الإجمالي</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* معلومات العلاج */}
          {payment.tooth_treatment && (
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg text-card-foreground">
                  <Activity className="w-4 h-4 ml-2 text-primary" />
                  معلومات العلاج
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">نوع العلاج:</span>
                  <span className="text-sm font-medium text-foreground">
                    {getTreatmentNameInArabic(payment.tooth_treatment.treatment_type)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">رقم السن:</span>
                  <span className="text-sm text-foreground">{payment.tooth_treatment.tooth_number}</span>
                </div>
                {payment.tooth_treatment.tooth_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">اسم السن:</span>
                    <span className="text-sm text-foreground">{payment.tooth_treatment.tooth_name}</span>
                  </div>
                )}
                {payment.tooth_treatment.cost && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">تكلفة العلاج:</span>
                    <span className="text-sm font-medium text-foreground">
                      {formatAmount(payment.tooth_treatment.cost)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* معلومات الموعد */}
          {payment.appointment && (
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg text-card-foreground">
                  <Calendar className="w-4 h-4 ml-2 text-primary" />
                  معلومات الموعد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">تاريخ الموعد:</span>
                  <span className="text-sm text-foreground">{formatDate(payment.appointment.appointment_date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">الوقت:</span>
                  <span className="text-sm text-foreground">{payment.appointment.appointment_time}</span>
                </div>
                {payment.appointment.notes && (
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-muted-foreground">ملاحظات:</span>
                    <span className="text-sm text-foreground text-right max-w-xs">
                      {payment.appointment.notes}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ملاحظات ووصف */}
          {(payment.description || payment.notes) && (
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg text-card-foreground">
                  <FileText className="w-4 h-4 ml-2 text-primary" />
                  ملاحظات إضافية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {payment.description && (
                  <div>
                    <span className="text-sm text-muted-foreground block mb-1">الوصف:</span>
                    <p className="text-sm text-foreground bg-muted/30 p-3 rounded border">
                      {payment.description}
                    </p>
                  </div>
                )}
                {payment.notes && (
                  <div>
                    <span className="text-sm text-muted-foreground block mb-1">ملاحظات:</span>
                    <p className="text-sm text-foreground bg-muted/30 p-3 rounded border">
                      {payment.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* معلومات النظام */}
          <Card className="border-border bg-muted/30 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg text-card-foreground">
                <Clock className="w-4 h-4 ml-2 text-primary" />
                معلومات النظام
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">تاريخ الإنشاء:</span>
                <span className="text-sm text-foreground">{formatDate(payment.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">آخر تحديث:</span>
                <span className="text-sm text-foreground">{formatDate(payment.updated_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">معرف الدفعة:</span>
                <span className="text-xs font-mono text-foreground bg-background px-2 py-1 rounded border">
                  {payment.id}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
