import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Calendar, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import { Payment, Appointment } from '@/types'

interface AppointmentPaymentSummaryProps {
  appointment: Appointment
  payments: Payment[]
  className?: string
}

export default function AppointmentPaymentSummary({
  appointment,
  payments,
  className = ''
}: AppointmentPaymentSummaryProps) {
  // حساب إحصائيات المدفوعات للموعد
  const appointmentCost = appointment.cost || 0
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const remainingBalance = Math.max(0, appointmentCost - totalPaid)
  const paymentProgress = appointmentCost > 0 ? (totalPaid / appointmentCost) * 100 : 0

  // تحديد حالة الدفع
  let paymentStatus: 'completed' | 'partial' | 'pending' = 'pending'
  if (remainingBalance <= 0 && appointmentCost > 0) {
    paymentStatus = 'completed'
  } else if (totalPaid > 0) {
    paymentStatus = 'partial'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
      case 'pending':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-card/20 dark:text-gray-400 dark:border-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'مكتمل'
      case 'partial':
        return 'جزئي'
      case 'pending':
        return 'آجل'
      default:
        return 'غير محدد'
    }
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="arabic-enhanced">ملخص مدفوعات الموعد</span>
          </div>
          <Badge
            variant="outline"
            className={`${getStatusColor(paymentStatus)} arabic-enhanced`}
          >
            {getStatusText(paymentStatus)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* معلومات الموعد */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-sm font-medium arabic-enhanced mb-1">
            {appointment.title}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(appointment.start_time)}
          </div>
        </div>

        {/* إحصائيات المدفوعات */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(appointmentCost)}
            </div>
            <div className="text-xs text-muted-foreground arabic-enhanced">
              التكلفة الإجمالية
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalPaid)}
            </div>
            <div className="text-xs text-muted-foreground arabic-enhanced">
              المبلغ المدفوع
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(remainingBalance)}
            </div>
            <div className="text-xs text-muted-foreground arabic-enhanced">
              المبلغ المتبقي
            </div>
          </div>
        </div>

        {/* شريط التقدم */}
        {appointmentCost > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground arabic-enhanced">نسبة الدفع</span>
              <span className="font-medium">{paymentProgress.toFixed(1)}%</span>
            </div>
            <Progress value={paymentProgress} className="h-2" />
          </div>
        )}

        {/* تفاصيل المدفوعات */}
        {payments.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium arabic-enhanced flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              المدفوعات ({payments.length})
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {payments.map((payment, index) => (
                <div
                  key={payment.id}
                  className="flex justify-between items-center text-xs bg-muted/30 rounded p-2"
                >
                  <div>
                    <span className="font-medium">دفعة #{index + 1}</span>
                    <span className="text-muted-foreground mr-2">
                      {formatDate(payment.payment_date)}
                    </span>
                  </div>
                  <div className="font-medium">
                    {formatCurrency(payment.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* تحذيرات */}
        {remainingBalance > 0 && (
          <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span className="text-sm text-orange-700 dark:text-orange-300 arabic-enhanced">
              يوجد مبلغ متبقي للدفع
            </span>
          </div>
        )}

        {totalPaid > appointmentCost && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-700 dark:text-blue-300 arabic-enhanced">
              تم دفع مبلغ إضافي: {formatCurrency(totalPaid - appointmentCost)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
