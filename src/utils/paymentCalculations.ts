import { Payment, Appointment } from '@/types'

/**
 * حساب إجمالي المدفوعات لموعد محدد (فقط من الدفعات الجزئية والمكتملة)
 */
export function calculateAppointmentTotalPaid(appointmentId: string, payments: Payment[]): number {
  if (!appointmentId) return 0

  return payments
    .filter(payment =>
      payment.appointment_id === appointmentId &&
      (payment.status === 'partial' || payment.status === 'completed')
    )
    .reduce((total, payment) => total + payment.amount, 0)
}

/**
 * حساب الرصيد المتبقي لموعد محدد
 */
export function calculateAppointmentRemainingBalance(
  appointmentId: string,
  appointmentCost: number,
  payments: Payment[]
): number {
  const totalPaid = calculateAppointmentTotalPaid(appointmentId, payments)
  return Math.max(0, appointmentCost - totalPaid)
}

/**
 * حساب إجمالي المدفوعات لعلاج محدد (فقط من الدفعات الجزئية والمكتملة)
 */
export function calculateTreatmentTotalPaid(treatmentId: string, payments: Payment[]): number {
  if (!treatmentId) return 0

  return payments
    .filter(payment =>
      payment.tooth_treatment_id === treatmentId &&
      (payment.status === 'partial' || payment.status === 'completed')
    )
    .reduce((total, payment) => total + payment.amount, 0)
}

/**
 * حساب الرصيد المتبقي لعلاج محدد
 */
export function calculateTreatmentRemainingBalance(
  treatmentId: string,
  treatmentCost: number,
  payments: Payment[]
): number {
  const totalPaid = calculateTreatmentTotalPaid(treatmentId, payments)
  return Math.max(0, treatmentCost - totalPaid)
}

/**
 * حساب حالة الدفع للموعد
 */
export function calculateAppointmentPaymentStatus(
  appointmentId: string,
  appointmentCost: number,
  payments: Payment[]
): 'completed' | 'partial' | 'pending' {
  const totalPaid = calculateAppointmentTotalPaid(appointmentId, payments)

  if (totalPaid >= appointmentCost) {
    return 'completed'
  } else if (totalPaid > 0) {
    return 'partial'
  } else {
    return 'pending'
  }
}

/**
 * حساب تفاصيل المدفوعات لموعد محدد
 */
export function calculateAppointmentPaymentDetails(
  appointmentId: string,
  appointmentCost: number,
  payments: Payment[]
) {
  const appointmentPayments = payments.filter(payment => payment.appointment_id === appointmentId)
  const totalPaid = appointmentPayments.reduce((total, payment) => total + payment.amount, 0)
  const remainingBalance = Math.max(0, appointmentCost - totalPaid)
  const status = calculateAppointmentPaymentStatus(appointmentId, appointmentCost, payments)

  return {
    appointmentPayments,
    totalPaid,
    remainingBalance,
    status,
    appointmentCost,
    paymentCount: appointmentPayments.length
  }
}

/**
 * التحقق من صحة مبلغ الدفعة الجديدة
 */
export function validateNewPaymentAmount(
  appointmentId: string,
  appointmentCost: number,
  newPaymentAmount: number,
  existingPayments: Payment[]
): { isValid: boolean; error?: string; maxAllowed?: number } {
  if (!appointmentId || appointmentCost <= 0) {
    return { isValid: true } // للمدفوعات غير المرتبطة بموعد
  }

  const totalPaid = calculateAppointmentTotalPaid(appointmentId, existingPayments)
  const remainingBalance = appointmentCost - totalPaid

  if (newPaymentAmount <= 0) {
    return {
      isValid: false,
      error: 'يجب أن يكون مبلغ الدفعة أكبر من صفر'
    }
  }

  if (newPaymentAmount > remainingBalance) {
    return {
      isValid: false,
      error: `مبلغ الدفعة يتجاوز المبلغ المتبقي (${remainingBalance.toFixed(2)} $)`,
      maxAllowed: remainingBalance
    }
  }

  return { isValid: true }
}

/**
 * حساب البيانات المطلوبة لإنشاء دفعة جديدة
 */
export function calculatePaymentData(
  appointmentId: string | undefined,
  appointment: Appointment | undefined,
  amount: number,
  existingPayments: Payment[],
  discountAmount: number = 0,
  taxAmount: number = 0
) {
  const totalAmount = amount + taxAmount - discountAmount

  if (appointmentId && appointment?.cost) {
    // دفعة مرتبطة بموعد
    const appointmentCost = appointment.cost
    const previousPayments = calculateAppointmentTotalPaid(appointmentId, existingPayments)
    const newTotalPaid = previousPayments + amount
    const remainingBalance = Math.max(0, appointmentCost - newTotalPaid)

    // تحديد الحالة
    let status: 'completed' | 'partial' | 'pending'
    if (remainingBalance <= 0) {
      status = 'completed'
    } else if (newTotalPaid > 0) {
      status = 'partial'
    } else {
      status = 'pending'
    }

    return {
      total_amount: totalAmount,
      appointment_total_cost: appointmentCost,
      appointment_total_paid: newTotalPaid,
      appointment_remaining_balance: remainingBalance,
      status,
      // حقول عامة فارغة للمدفوعات المرتبطة بموعد
      total_amount_due: undefined,
      amount_paid: undefined,
      remaining_balance: undefined
    }
  } else {
    // دفعة عامة غير مرتبطة بموعد
    return {
      total_amount: totalAmount,
      total_amount_due: totalAmount,
      amount_paid: amount,
      remaining_balance: 0,
      status: 'completed' as const,
      // حقول الموعد فارغة للمدفوعات العامة
      appointment_total_cost: undefined,
      appointment_total_paid: undefined,
      appointment_remaining_balance: undefined
    }
  }
}

/**
 * حساب ملخص المدفوعات لمريض محدد
 */
export function calculatePatientPaymentSummary(patientId: string, payments: Payment[], appointments: Appointment[]) {
  const patientPayments = payments.filter(payment => payment.patient_id === patientId)
  const patientAppointments = appointments.filter(appointment => appointment.patient_id === patientId)

  let totalPaid = 0
  let totalDue = 0

  // حساب المدفوعات المرتبطة بالمواعيد
  patientAppointments.forEach(appointment => {
    if (appointment.cost) {
      const appointmentDetails = calculateAppointmentPaymentDetails(
        appointment.id,
        appointment.cost,
        patientPayments
      )
      totalDue += appointment.cost
      totalPaid += appointmentDetails.totalPaid
    }
  })

  // إضافة المدفوعات العامة غير المرتبطة بمواعيد (فقط الجزئية والمكتملة)
  const generalPayments = patientPayments.filter(payment =>
    !payment.appointment_id &&
    (payment.status === 'partial' || payment.status === 'completed')
  )
  generalPayments.forEach(payment => {
    totalPaid += payment.amount
    if (payment.total_amount_due) {
      totalDue += payment.total_amount_due
    }
  })

  // حساب المبلغ المتبقي من الدفعات الجزئية فقط
  let totalRemaining = 0

  // المبلغ المتبقي من المواعيد (فقط من الدفعات الجزئية)
  patientAppointments.forEach(appointment => {
    if (appointment.cost) {
      const partialPayments = patientPayments.filter(p =>
        p.appointment_id === appointment.id && p.status === 'partial'
      )
      if (partialPayments.length > 0) {
        const totalPaidForAppointment = partialPayments.reduce((sum, p) => sum + p.amount, 0)
        totalRemaining += Math.max(0, appointment.cost - totalPaidForAppointment)
      }
    }
  })

  // المبلغ المتبقي من المدفوعات العامة (فقط من الدفعات الجزئية)
  const partialGeneralPayments = patientPayments.filter(payment =>
    !payment.appointment_id && payment.status === 'partial'
  )
  partialGeneralPayments.forEach(payment => {
    if (payment.total_amount_due && payment.amount) {
      totalRemaining += Math.max(0, payment.total_amount_due - payment.amount)
    }
  })

  // المبلغ المتبقي من العلاجات (فقط من الدفعات الجزئية)
  const treatmentPayments = patientPayments.filter(payment =>
    payment.tooth_treatment_id && payment.status === 'partial'
  )
  const treatmentGroups: { [treatmentId: string]: Payment[] } = {}
  treatmentPayments.forEach(payment => {
    if (!treatmentGroups[payment.tooth_treatment_id!]) {
      treatmentGroups[payment.tooth_treatment_id!] = []
    }
    treatmentGroups[payment.tooth_treatment_id!].push(payment)
  })

  Object.values(treatmentGroups).forEach(group => {
    const totalPaidForTreatment = group.reduce((sum, p) => sum + p.amount, 0)
    const treatmentCost = group[0].treatment_total_cost || 0
    if (treatmentCost > 0) {
      totalRemaining += Math.max(0, treatmentCost - totalPaidForTreatment)
    }
  })

  return {
    totalPaid,
    totalDue,
    totalRemaining,
    appointmentCount: patientAppointments.length,
    paymentCount: patientPayments.length,
    completedAppointments: patientAppointments.filter(apt => {
      if (!apt.cost) return false
      const details = calculateAppointmentPaymentDetails(apt.id, apt.cost, patientPayments)
      return details.status === 'completed'
    }).length
  }
}

/**
 * حساب إجمالي المبلغ المتبقي لجميع المرضى
 */
export function calculateTotalRemainingBalanceForAllPatients(payments: Payment[], appointments: Appointment[]): number {
  // الحصول على جميع معرفات المرضى الفريدة
  const patientIds = Array.from(new Set([
    ...payments.map(p => p.patient_id),
    ...appointments.map(a => a.patient_id)
  ]))

  let totalRemaining = 0

  // حساب المبلغ المتبقي لكل مريض
  patientIds.forEach(patientId => {
    const summary = calculatePatientPaymentSummary(patientId, payments, appointments)
    totalRemaining += summary.totalRemaining
  })

  return Math.round(totalRemaining * 100) / 100 // Round to 2 decimal places
}

/**
 * تحديث جميع المدفوعات المرتبطة بموعد عند تغيير تكلفة الموعد
 */
export function recalculateAppointmentPayments(
  appointmentId: string,
  newAppointmentCost: number,
  payments: Payment[]
): Partial<Payment>[] {
  const appointmentPayments = payments
    .filter(payment => payment.appointment_id === appointmentId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  let runningTotal = 0

  return appointmentPayments.map(payment => {
    runningTotal += payment.amount
    const remainingBalance = Math.max(0, newAppointmentCost - runningTotal)

    let status: 'completed' | 'partial' | 'pending'
    if (remainingBalance <= 0) {
      status = 'completed'
    } else if (runningTotal > 0) {
      status = 'partial'
    } else {
      status = 'pending'
    }

    return {
      id: payment.id,
      appointment_total_cost: newAppointmentCost,
      appointment_total_paid: runningTotal,
      appointment_remaining_balance: remainingBalance,
      status
    }
  })
}
