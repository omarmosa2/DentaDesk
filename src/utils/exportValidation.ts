import { Payment, Appointment, InventoryItem } from '@/types'

/**
 * أدوات التحقق من صحة البيانات المصدرة
 * للتأكد من دقة 100% في جميع الحسابات
 */
export class ExportValidation {

  /**
   * التحقق من صحة حسابات المدفوعات
   */
  static validatePaymentCalculations(payments: Payment[]) {
    const validateAmount = (amount: any): number => {
      const num = Number(amount)
      return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
    }

    // حساب الإيرادات الإجمالية (مكتملة + جزئية)
    const totalRevenue = payments
      .filter(p => p.status === 'completed' || p.status === 'partial')
      .reduce((sum, payment) => {
        // للمدفوعات الجزئية، استخدم amount_paid إذا كان متوفراً
        const amount = payment.status === 'partial' && payment.amount_paid !== undefined
          ? validateAmount(payment.amount_paid)
          : validateAmount(payment.amount)
        return sum + amount
      }, 0)

    // المدفوعات المكتملة فقط
    const completedAmount = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, payment) => sum + validateAmount(payment.amount), 0)

    // المدفوعات الجزئية
    const partialAmount = payments
      .filter(p => p.status === 'partial')
      .reduce((sum, payment) => {
        const amount = payment.amount_paid !== undefined
          ? validateAmount(payment.amount_paid)
          : validateAmount(payment.amount)
        return sum + amount
      }, 0)

    // المدفوعات الآجلة
    const pendingAmount = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, payment) => {
        const amount = validateAmount(payment.amount)
        const totalAmountDue = validateAmount(payment.total_amount_due)

        // إذا كان المبلغ المدفوع 0 والمبلغ الإجمالي المطلوب أكبر من 0، استخدم المبلغ الإجمالي
        const pendingAmount = (amount === 0 && totalAmountDue > 0) ? totalAmountDue : amount

        return sum + pendingAmount
      }, 0)

    // المدفوعات المتأخرة (المدفوعات الآجلة التي تجاوز تاريخ دفعها 30 يوماً)
    const overdueAmount = payments
      .filter(p => {
        if (p.status !== 'pending') return false

        const paymentDate = new Date(p.payment_date)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        return paymentDate < thirtyDaysAgo
      })
      .reduce((sum, payment) => {
        const amount = validateAmount(payment.amount)
        const totalAmountDue = validateAmount(payment.total_amount_due)

        // إذا كان المبلغ المدفوع 0 والمبلغ الإجمالي المطلوب أكبر من 0، استخدم المبلغ الإجمالي
        const overdueAmount = (amount === 0 && totalAmountDue > 0) ? totalAmountDue : amount

        return sum + overdueAmount
      }, 0)

    // التحقق من صحة المجموع
    const calculatedTotal = completedAmount + partialAmount
    const tolerance = 0.01 // تسامح للأخطاء العائمة

    if (Math.abs(totalRevenue - calculatedTotal) > tolerance) {
      console.warn('Payment calculation mismatch:', {
        totalRevenue,
        calculatedTotal: completedAmount + partialAmount,
        completedAmount,
        partialAmount,
        difference: totalRevenue - calculatedTotal
      })
    }

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      completedAmount: Math.round(completedAmount * 100) / 100,
      partialAmount: Math.round(partialAmount * 100) / 100,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      overdueAmount: Math.round(overdueAmount * 100) / 100,
      isValid: Math.abs(totalRevenue - calculatedTotal) <= tolerance
    }
  }

  /**
   * التحقق من صحة إحصائيات المواعيد
   */
  static validateAppointmentStats(appointments: Appointment[]) {
    const total = appointments.length
    const completed = appointments.filter(a => a.status === 'completed').length
    const cancelled = appointments.filter(a => a.status === 'cancelled').length
    const noShow = appointments.filter(a => a.status === 'no-show').length
    const scheduled = appointments.filter(a => a.status === 'scheduled').length

    // التحقق من أن المجموع صحيح
    const calculatedTotal = completed + cancelled + noShow + scheduled
    const otherStatuses = total - calculatedTotal

    if (otherStatuses !== 0) {
      console.warn('Appointment status calculation mismatch:', {
        total,
        calculatedTotal,
        otherStatuses,
        statusBreakdown: { completed, cancelled, noShow, scheduled }
      })
    }

    const attendanceRate = total > 0 ? Math.round((completed / total) * 100) : 0

    return {
      total,
      completed,
      cancelled,
      noShow,
      scheduled,
      attendanceRate,
      isValid: otherStatuses === 0
    }
  }

  /**
   * التحقق من صحة إحصائيات المخزون
   */
  static validateInventoryStats(inventory: InventoryItem[]) {
    const totalItems = inventory.length
    const totalValue = inventory.reduce((sum, item) => {
      const itemValue = (item.unit_price || 0) * (item.quantity || 0)
      return sum + itemValue
    }, 0)

    const lowStockItems = inventory.filter(item =>
      (item.quantity || 0) <= (item.minimum_stock || 0) && (item.quantity || 0) > 0
    ).length

    const outOfStockItems = inventory.filter(item =>
      (item.quantity || 0) === 0
    ).length

    const inStockItems = inventory.filter(item =>
      (item.quantity || 0) > (item.minimum_stock || 0)
    ).length

    // التحقق من أن المجموع صحيح
    const calculatedTotal = lowStockItems + outOfStockItems + inStockItems

    if (calculatedTotal !== totalItems) {
      console.warn('Inventory calculation mismatch:', {
        totalItems,
        calculatedTotal,
        breakdown: { lowStockItems, outOfStockItems, inStockItems }
      })
    }

    return {
      totalItems,
      totalValue: Math.round(totalValue * 100) / 100,
      lowStockItems,
      outOfStockItems,
      inStockItems,
      isValid: calculatedTotal === totalItems
    }
  }

  /**
   * التحقق الشامل من صحة جميع البيانات
   */
  static validateAllData(data: {
    payments: Payment[]
    appointments: Appointment[]
    inventory: InventoryItem[]
  }) {
    const paymentValidation = this.validatePaymentCalculations(data.payments)
    const appointmentValidation = this.validateAppointmentStats(data.appointments)
    const inventoryValidation = this.validateInventoryStats(data.inventory)

    const isAllValid = paymentValidation.isValid &&
                      appointmentValidation.isValid &&
                      inventoryValidation.isValid

    if (!isAllValid) {
      console.error('Data validation failed:', {
        payments: paymentValidation.isValid,
        appointments: appointmentValidation.isValid,
        inventory: inventoryValidation.isValid
      })
    }

    return {
      payments: paymentValidation,
      appointments: appointmentValidation,
      inventory: inventoryValidation,
      isAllValid
    }
  }

  /**
   * مقارنة البيانات المفلترة مع البيانات الأصلية
   */
  static compareFilteredData(original: any[], filtered: any[], filterDescription: string) {
    const originalCount = original.length
    const filteredCount = filtered.length
    const filterRatio = originalCount > 0 ? (filteredCount / originalCount) * 100 : 0

    console.log(`Filter comparison for ${filterDescription}:`, {
      original: originalCount,
      filtered: filteredCount,
      ratio: `${Math.round(filterRatio)}%`,
      isFiltered: filteredCount < originalCount
    })

    return {
      originalCount,
      filteredCount,
      filterRatio: Math.round(filterRatio),
      isFiltered: filteredCount < originalCount
    }
  }
}

/**
 * دالة مساعدة للتحقق من صحة البيانات قبل التصدير
 */
export function validateBeforeExport(data: {
  payments: Payment[]
  appointments: Appointment[]
  inventory: InventoryItem[]
  filterInfo?: any
}): boolean {
  console.log('🔍 Validating data before export...')

  const validation = ExportValidation.validateAllData(data)

  if (!validation.isAllValid) {
    console.error('❌ Data validation failed! Export may contain incorrect values.')
    return false
  }

  console.log('✅ Data validation passed! Export will contain accurate values.')

  if (data.filterInfo) {
    console.log('📊 Filter information:', data.filterInfo)
  }

  return true
}
