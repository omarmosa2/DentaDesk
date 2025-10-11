/**
 * Calculation Validator Utility
 * يتحقق من دقة الحسابات والإحصائيات في النظام
 */

import type { Payment, Appointment, Patient, InventoryItem } from '../types'

export class CalculationValidator {
  
  /**
   * التحقق من دقة حسابات المدفوعات
   */
  static validatePaymentCalculations(payments: Payment[]) {
    const results = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      calculations: {} as any
    }

    try {
      // فلترة المدفوعات المكتملة
      const completedPayments = payments.filter(p => p.status === 'completed')
      const pendingPayments = payments.filter(p => p.status === 'pending')
      const overduePayments = payments.filter(p => p.status === 'overdue')

      // حساب إجمالي الإيرادات
      const totalRevenue = completedPayments.reduce((sum, payment) => {
        const amount = typeof payment.amount === 'number' ? payment.amount : 0
        if (typeof payment.amount !== 'number') {
          results.warnings.push(`Invalid amount type for payment ${payment.id}: ${typeof payment.amount}`)
        }
        return sum + amount
      }, 0)

      // حساب المبالغ الآجلة
      const pendingAmount = pendingPayments.reduce((sum, payment) => {
        const amount = typeof payment.amount === 'number' ? payment.amount : 0
        return sum + amount
      }, 0)

      // حساب المبالغ المتأخرة
      const overdueAmount = overduePayments.reduce((sum, payment) => {
        const amount = typeof payment.amount === 'number' ? payment.amount : 0
        return sum + amount
      }, 0)

      // التحقق من صحة الأرقام
      if (totalRevenue < 0) {
        results.errors.push('Total revenue cannot be negative')
        results.isValid = false
      }

      if (pendingAmount < 0) {
        results.errors.push('Pending amount cannot be negative')
        results.isValid = false
      }

      if (overdueAmount < 0) {
        results.errors.push('Overdue amount cannot be negative')
        results.isValid = false
      }

      // حساب إحصائيات طرق الدفع
      const paymentMethodStats: { [key: string]: number } = {}
      completedPayments.forEach(payment => {
        const method = payment.payment_method || 'unknown'
        const amount = typeof payment.amount === 'number' ? payment.amount : 0
        paymentMethodStats[method] = (paymentMethodStats[method] || 0) + amount
      })

      // التحقق من أن مجموع طرق الدفع يساوي إجمالي الإيرادات
      const totalByMethods = Object.values(paymentMethodStats).reduce((sum, amount) => sum + amount, 0)
      const difference = Math.abs(totalRevenue - totalByMethods)
      if (difference > 0.01) { // السماح بفرق صغير للتقريب
        results.errors.push(`Payment methods total (${totalByMethods}) does not match total revenue (${totalRevenue})`)
        results.isValid = false
      }

      results.calculations = {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        pendingAmount: Math.round(pendingAmount * 100) / 100,
        overdueAmount: Math.round(overdueAmount * 100) / 100,
        completedCount: completedPayments.length,
        pendingCount: pendingPayments.length,
        overdueCount: overduePayments.length,
        paymentMethodStats
      }

    } catch (error) {
      results.errors.push(`Error in payment calculations: ${error}`)
      results.isValid = false
    }

    return results
  }

  /**
   * التحقق من دقة حسابات المواعيد
   */
  static validateAppointmentCalculations(appointments: Appointment[]) {
    const results = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      calculations: {} as any
    }

    try {
      const total = appointments.length
      const completed = appointments.filter(apt => apt.status === 'completed').length
      const cancelled = appointments.filter(apt => apt.status === 'cancelled').length
      const pending = appointments.filter(apt => apt.status === 'scheduled').length
      const noShow = appointments.filter(apt => apt.status === 'no_show').length

      // التحقق من أن مجموع الحالات يساوي العدد الكلي
      const calculatedTotal = completed + cancelled + pending + noShow
      if (calculatedTotal !== total) {
        results.errors.push(`Appointment counts mismatch: total=${total}, calculated=${calculatedTotal}`)
        results.isValid = false
      }

      // حساب المعدلات
      const attendanceRate = total > 0 ? (completed / total) * 100 : 0
      const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0

      // التحقق من صحة المعدلات
      if (attendanceRate < 0 || attendanceRate > 100) {
        results.errors.push(`Invalid attendance rate: ${attendanceRate}%`)
        results.isValid = false
      }

      if (cancellationRate < 0 || cancellationRate > 100) {
        results.errors.push(`Invalid cancellation rate: ${cancellationRate}%`)
        results.isValid = false
      }

      // التحقق من صحة التواريخ
      appointments.forEach((apt, index) => {
        if (!apt.start_time || isNaN(new Date(apt.start_time).getTime())) {
          results.warnings.push(`Invalid start_time for appointment ${index}: ${apt.start_time}`)
        }
      })

      results.calculations = {
        total,
        completed,
        cancelled,
        pending,
        noShow,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        cancellationRate: Math.round(cancellationRate * 10) / 10
      }

    } catch (error) {
      results.errors.push(`Error in appointment calculations: ${error}`)
      results.isValid = false
    }

    return results
  }

  /**
   * التحقق من دقة حسابات المخزون
   */
  static validateInventoryCalculations(items: InventoryItem[]) {
    const results = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      calculations: {} as any
    }

    try {
      const today = new Date()
      
      // حساب القيمة الإجمالية
      const totalValue = items.reduce((sum, item) => {
        const quantity = typeof item.quantity === 'number' ? item.quantity : 0
        const costPerUnit = typeof item.cost_per_unit === 'number' ? item.cost_per_unit : 0
        
        if (typeof item.quantity !== 'number') {
          results.warnings.push(`Invalid quantity type for item ${item.id}: ${typeof item.quantity}`)
        }
        if (typeof item.cost_per_unit !== 'number') {
          results.warnings.push(`Invalid cost_per_unit type for item ${item.id}: ${typeof item.cost_per_unit}`)
        }
        
        return sum + (quantity * costPerUnit)
      }, 0)

      // حساب العناصر منخفضة المخزون
      const lowStockCount = items.filter(item => {
        const quantity = typeof item.quantity === 'number' ? item.quantity : 0
        const minimumStock = typeof item.minimum_stock === 'number' ? item.minimum_stock : 0
        return quantity <= minimumStock && quantity > 0
      }).length

      // حساب العناصر المنتهية الصلاحية
      const expiredCount = items.filter(item => {
        if (!item.expiry_date) return false
        try {
          const expiryDate = new Date(item.expiry_date)
          return !isNaN(expiryDate.getTime()) && expiryDate < today
        } catch {
          results.warnings.push(`Invalid expiry_date for item ${item.id}: ${item.expiry_date}`)
          return false
        }
      }).length

      // حساب العناصر قريبة الانتهاء
      const expiringSoonCount = items.filter(item => {
        if (!item.expiry_date) return false
        try {
          const expiryDate = new Date(item.expiry_date)
          if (isNaN(expiryDate.getTime())) return false
          
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          return daysUntilExpiry <= 30 && daysUntilExpiry > 0
        } catch {
          return false
        }
      }).length

      // التحقق من صحة الأرقام
      if (totalValue < 0) {
        results.errors.push('Total inventory value cannot be negative')
        results.isValid = false
      }

      results.calculations = {
        totalItems: items.length,
        totalValue: Math.round(totalValue * 100) / 100,
        lowStockCount,
        expiredCount,
        expiringSoonCount
      }

    } catch (error) {
      results.errors.push(`Error in inventory calculations: ${error}`)
      results.isValid = false
    }

    return results
  }

  /**
   * التحقق من دقة جميع الحسابات
   */
  static validateAllCalculations(data: {
    payments: Payment[]
    appointments: Appointment[]
    patients: Patient[]
    inventory: InventoryItem[]
  }) {
    const paymentResults = this.validatePaymentCalculations(data.payments)
    const appointmentResults = this.validateAppointmentCalculations(data.appointments)
    const inventoryResults = this.validateInventoryCalculations(data.inventory)

    return {
      overall: {
        isValid: paymentResults.isValid && appointmentResults.isValid && inventoryResults.isValid,
        totalErrors: paymentResults.errors.length + appointmentResults.errors.length + inventoryResults.errors.length,
        totalWarnings: paymentResults.warnings.length + appointmentResults.warnings.length + inventoryResults.warnings.length
      },
      payments: paymentResults,
      appointments: appointmentResults,
      inventory: inventoryResults
    }
  }
}
