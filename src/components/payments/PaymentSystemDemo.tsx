import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import { 
  Calendar, 
  DollarSign, 
  User, 
  CreditCard, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Receipt
} from 'lucide-react'
import AppointmentPaymentSummary from './AppointmentPaymentSummary'
import { Payment, Appointment, Patient } from '@/types'

// بيانات تجريبية للاختبار
const demoPatient: Patient = {
  id: 'patient-1',
  serial_number: 'P001',
  full_name: 'أحمد محمد علي',
  gender: 'male',
  age: 35,
  patient_condition: 'جيد',
  phone: '0501234567',
  email: 'ahmed@example.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

const demoAppointment: Appointment = {
  id: 'appointment-1',
  patient_id: 'patient-1',
  title: 'تنظيف الأسنان وفحص شامل',
  description: 'تنظيف الأسنان وإزالة الجير مع فحص شامل',
  start_time: new Date().toISOString(),
  end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  status: 'scheduled',
  cost: 300, // تكلفة الموعد 300 $
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  patient: demoPatient
}

export default function PaymentSystemDemo() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>('')

  // حساب إحصائيات المدفوعات
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const remainingBalance = Math.max(0, demoAppointment.cost! - totalPaid)
  const paymentProgress = demoAppointment.cost! > 0 ? (totalPaid / demoAppointment.cost!) * 100 : 0

  // تحديد حالة الدفع
  let paymentStatus: 'completed' | 'partial' | 'pending' = 'pending'
  if (remainingBalance <= 0 && demoAppointment.cost! > 0) {
    paymentStatus = 'completed'
  } else if (totalPaid > 0) {
    paymentStatus = 'partial'
  }

  // إضافة دفعة جديدة
  const addPayment = () => {
    const amount = parseFloat(newPaymentAmount)
    if (amount <= 0 || amount > remainingBalance) {
      alert(`يجب أن يكون المبلغ بين 1 و ${remainingBalance} $`)
      return
    }

    const newTotalPaid = totalPaid + amount
    const newRemainingBalance = Math.max(0, demoAppointment.cost! - newTotalPaid)

    const newPayment: Payment = {
      id: `payment-${Date.now()}`,
      patient_id: demoPatient.id,
      appointment_id: demoAppointment.id,
      amount: amount,
      payment_method: 'cash',
      payment_date: new Date().toISOString(),
      status: newRemainingBalance <= 0 ? 'completed' : 'partial',
      appointment_total_cost: demoAppointment.cost,
      appointment_total_paid: newTotalPaid,
      appointment_remaining_balance: newRemainingBalance,
      receipt_number: `REC-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      patient: demoPatient,
      appointment: demoAppointment
    }

    setPayments([...payments, newPayment])
    setNewPaymentAmount('')
  }

  // إعادة تعيين النظام
  const resetDemo = () => {
    setPayments([])
    setNewPaymentAmount('')
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold arabic-enhanced">
          🧪 اختبار نظام المدفوعات المرتبط بالمواعيد
        </h1>
        <p className="text-muted-foreground arabic-enhanced">
          نظام تتبع دقيق للمدفوعات والرصيد المتبقي لكل موعد على حدة
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* معلومات الموعد */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              معلومات الموعد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium arabic-enhanced">{demoPatient.full_name}</span>
              </div>
              <div className="text-sm text-muted-foreground arabic-enhanced">
                {demoAppointment.title}
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="font-bold text-lg">
                  تكلفة الموعد: {formatCurrency(demoAppointment.cost!)}
                </span>
              </div>
            </div>

            <Separator />

            {/* حالة الدفع */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium arabic-enhanced">حالة الدفع:</span>
                <Badge 
                  variant={paymentStatus === 'completed' ? 'default' : 'secondary'}
                  className="arabic-enhanced"
                >
                  {paymentStatus === 'completed' ? 'مكتمل' : 
                   paymentStatus === 'partial' ? 'جزئي' : 'آجل'}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(totalPaid)}
                  </div>
                  <div className="text-xs text-muted-foreground arabic-enhanced">
                    مدفوع
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold text-orange-600">
                    {formatCurrency(remainingBalance)}
                  </div>
                  <div className="text-xs text-muted-foreground arabic-enhanced">
                    متبقي
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    {paymentProgress.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground arabic-enhanced">
                    نسبة الدفع
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* إضافة دفعة جديدة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              إضافة دفعة جديدة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {remainingBalance > 0 ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium arabic-enhanced">
                    مبلغ الدفعة (الحد الأقصى: {formatCurrency(remainingBalance)})
                  </label>
                  <input
                    type="number"
                    value={newPaymentAmount}
                    onChange={(e) => setNewPaymentAmount(e.target.value)}
                    placeholder="أدخل المبلغ"
                    className="w-full p-2 border rounded-md"
                    max={remainingBalance}
                    min="1"
                  />
                </div>

                <Button 
                  onClick={addPayment}
                  disabled={!newPaymentAmount || parseFloat(newPaymentAmount) <= 0}
                  className="w-full"
                >
                  <Receipt className="w-4 h-4 ml-2" />
                  تسجيل الدفعة
                </Button>
              </>
            ) : (
              <div className="text-center space-y-2">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                <p className="text-green-600 font-medium arabic-enhanced">
                  تم دفع المبلغ كاملاً!
                </p>
              </div>
            )}

            <Button 
              onClick={resetDemo}
              variant="outline"
              className="w-full"
            >
              إعادة تعيين النظام
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ملخص المدفوعات */}
      <AppointmentPaymentSummary 
        appointment={demoAppointment}
        payments={payments}
      />

      {/* سجل المدفوعات */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              سجل المدفوعات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payments.map((payment, index) => (
                <div 
                  key={payment.id}
                  className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <div className="font-medium arabic-enhanced">
                      دفعة #{index + 1}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(payment.payment_date).toLocaleString('ar-SA')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      {formatCurrency(payment.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      متبقي: {formatCurrency(payment.appointment_remaining_balance || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
