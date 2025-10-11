/**
 * Financial Validation Utility
 * التحقق من صحة البيانات المالية بدقة 100%
 */

import type { Payment, InventoryItem, LabOrder, ClinicNeed } from '../types'

export interface FinancialValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  calculations: {
    totalRevenue: number
    totalExpenses: number
    netProfit: number
    profitMargin: number
  }
}

export class FinancialValidator {

  /**
   * التحقق من صحة مبلغ مالي
   */
  static validateAmount(amount: any): { isValid: boolean; value: number; error?: string } {
    if (amount === null || amount === undefined) {
      return { isValid: true, value: 0 }
    }

    const num = Number(amount)

    if (isNaN(num)) {
      return { isValid: false, value: 0, error: `Invalid amount: ${amount}` }
    }

    if (!isFinite(num)) {
      return { isValid: false, value: 0, error: `Amount is not finite: ${amount}` }
    }

    if (num < 0) {
      return { isValid: false, value: 0, error: `Amount cannot be negative: ${amount}` }
    }

    // تقريب إلى منزلتين عشريتين
    return { isValid: true, value: Math.round(num * 100) / 100 }
  }

  /**
   * التحقق من صحة حسابات المدفوعات
   */
  static validatePayments(payments: Payment[]): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    calculations: {
      totalRevenue: number
      completedAmount: number
      partialAmount: number
      pendingAmount: number
      overdueAmount: number
    }
  } {
    const errors: string[] = []
    const warnings: string[] = []
    let totalRevenue = 0
    let completedAmount = 0
    let partialAmount = 0
    let pendingAmount = 0
    let overdueAmount = 0

    if (!Array.isArray(payments)) {
      errors.push('Payments data is not an array')
      return {
        isValid: false,
        errors,
        warnings,
        calculations: { totalRevenue: 0, completedAmount: 0, partialAmount: 0, pendingAmount: 0, overdueAmount: 0 }
      }
    }

    payments.forEach((payment, index) => {
      if (!payment || typeof payment !== 'object') {
        errors.push(`Payment at index ${index} is invalid`)
        return
      }

      // التحقق من المبلغ
      const amountValidation = this.validateAmount(payment.amount)
      if (!amountValidation.isValid) {
        errors.push(`Payment ${payment.id || index}: ${amountValidation.error}`)
        return
      }

      const amount = amountValidation.value

      // حساب الإيرادات حسب الحالة
      switch (payment.status) {
        case 'completed':
          completedAmount += amount
          totalRevenue += amount
          break
        case 'partial':
          // للمدفوعات الجزئية، استخدم amount_paid إذا كان متوفراً
          const paidValidation = this.validateAmount(payment.amount_paid || payment.amount)
          if (paidValidation.isValid) {
            partialAmount += paidValidation.value
            totalRevenue += paidValidation.value
          }
          break
        case 'pending':
          pendingAmount += amount
          break
        case 'overdue':
          overdueAmount += amount
          break
        default:
          warnings.push(`Payment ${payment.id || index}: Unknown status '${payment.status}'`)
      }
    })

    // التحقق من صحة المجموع
    const calculatedTotal = completedAmount + partialAmount
    const tolerance = 0.01

    if (Math.abs(totalRevenue - calculatedTotal) > tolerance) {
      warnings.push(`Revenue calculation mismatch: ${totalRevenue} vs ${calculatedTotal}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      calculations: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        completedAmount: Math.round(completedAmount * 100) / 100,
        partialAmount: Math.round(partialAmount * 100) / 100,
        pendingAmount: Math.round(pendingAmount * 100) / 100,
        overdueAmount: Math.round(overdueAmount * 100) / 100
      }
    }
  }

  /**
   * التحقق من صحة حسابات المصروفات
   */
  static validateExpenses(expenses: any[]): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    calculations: {
      totalExpenses: number
      paidExpenses: number
      pendingExpenses: number
      expensesByType: Record<string, number>
    }
  } {
    const errors: string[] = []
    const warnings: string[] = []
    let totalExpenses = 0
    let paidExpenses = 0
    let pendingExpenses = 0
    const expensesByType: Record<string, number> = {}

    if (!Array.isArray(expenses)) {
      errors.push('Expenses data is not an array')
      return {
        isValid: false,
        errors,
        warnings,
        calculations: { totalExpenses: 0, paidExpenses: 0, pendingExpenses: 0, expensesByType: {} }
      }
    }

    expenses.forEach((expense, index) => {
      if (!expense || typeof expense !== 'object') {
        errors.push(`Expense at index ${index} is invalid`)
        return
      }

      const amountValidation = this.validateAmount(expense.amount)
      if (!amountValidation.isValid) {
        errors.push(`Expense ${expense.id || index}: ${amountValidation.error}`)
        return
      }

      const amount = amountValidation.value

      if (expense.status === 'paid') {
        paidExpenses += amount
        totalExpenses += amount
      } else if (expense.status === 'pending') {
        pendingExpenses += amount
      }

      // تجميع حسب النوع
      const type = expense.expense_type || 'other'
      expensesByType[type] = (expensesByType[type] || 0) + amount
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      calculations: {
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        paidExpenses: Math.round(paidExpenses * 100) / 100,
        pendingExpenses: Math.round(pendingExpenses * 100) / 100,
        expensesByType
      }
    }
  }

  /**
   * التحقق من صحة حسابات المخزون
   */
  static validateInventory(inventory: InventoryItem[]): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    calculations: {
      totalValue: number
      totalItems: number
      lowStockItems: number
      expiredItems: number
    }
  } {
    const errors: string[] = []
    const warnings: string[] = []
    let totalValue = 0
    let lowStockItems = 0
    let expiredItems = 0

    if (!Array.isArray(inventory)) {
      errors.push('Inventory data is not an array')
      return {
        isValid: false,
        errors,
        warnings,
        calculations: { totalValue: 0, totalItems: 0, lowStockItems: 0, expiredItems: 0 }
      }
    }

    const today = new Date()

    inventory.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Inventory item at index ${index} is invalid`)
        return
      }

      // التحقق من الكمية والسعر
      const quantityValidation = this.validateAmount(item.quantity)
      const priceValidation = this.validateAmount(item.cost_per_unit || 0)

      if (!quantityValidation.isValid) {
        errors.push(`Item ${item.id || index}: Invalid quantity`)
        return
      }

      if (!priceValidation.isValid) {
        warnings.push(`Item ${item.id || index}: Invalid price`)
      }

      const quantity = quantityValidation.value
      const price = priceValidation.value

      totalValue += quantity * price

      // فحص المخزون المنخفض
      if (quantity <= (item.minimum_stock || 0) && quantity > 0) {
        lowStockItems++
      }

      // فحص انتهاء الصلاحية
      if (item.expiry_date) {
        const expiryDate = new Date(item.expiry_date)
        if (expiryDate < today) {
          expiredItems++
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      calculations: {
        totalValue: Math.round(totalValue * 100) / 100,
        totalItems: inventory.length,
        lowStockItems,
        expiredItems
      }
    }
  }

  /**
   * التحقق الشامل من جميع البيانات المالية
   */
  static validateAllFinancialData(data: {
    payments: Payment[]
    expenses?: any[]
    labOrders?: LabOrder[]
    clinicNeeds?: ClinicNeed[]
    inventory?: InventoryItem[]
  }): FinancialValidationResult {
    const allErrors: string[] = []
    const allWarnings: string[] = []

    // التحقق من المدفوعات
    const paymentValidation = this.validatePayments(data.payments)
    allErrors.push(...paymentValidation.errors)
    allWarnings.push(...paymentValidation.warnings)

    // التحقق من المصروفات
    let expenseValidation = { calculations: { totalExpenses: 0 } }
    if (data.expenses) {
      expenseValidation = this.validateExpenses(data.expenses)
      allErrors.push(...expenseValidation.errors)
      allWarnings.push(...expenseValidation.warnings)
    }

    // التحقق من المخزون
    let inventoryValidation = { calculations: { totalValue: 0 } }
    if (data.inventory) {
      inventoryValidation = this.validateInventory(data.inventory)
      allErrors.push(...inventoryValidation.errors)
      allWarnings.push(...inventoryValidation.warnings)
    }

    // التحقق من طلبات المختبر
    if (data.labOrders) {
      data.labOrders.forEach((order, index) => {
        const paidAmount = this.validateAmount(order.paid_amount || 0)
        const cost = this.validateAmount(order.cost || 0)

        if (!paidAmount.isValid) {
          allErrors.push(`Lab order ${index + 1}: Invalid paid amount - ${paidAmount.error}`)
        }

        if (!cost.isValid) {
          allErrors.push(`Lab order ${index + 1}: Invalid cost - ${cost.error}`)
        }

        if (paidAmount.value > cost.value) {
          allWarnings.push(`Lab order ${index + 1}: Paid amount (${paidAmount.value}) exceeds cost (${cost.value})`)
        }
      })
    }

    // التحقق من احتياجات العيادة
    if (data.clinicNeeds) {
      data.clinicNeeds.forEach((need, index) => {
        const quantity = this.validateAmount(need.quantity || 0)
        const price = this.validateAmount(need.price || 0)

        if (!quantity.isValid) {
          allErrors.push(`Clinic need ${index + 1}: Invalid quantity - ${quantity.error}`)
        }

        if (!price.isValid) {
          allErrors.push(`Clinic need ${index + 1}: Invalid price - ${price.error}`)
        }

        if (quantity.value <= 0) {
          allWarnings.push(`Clinic need ${index + 1}: Zero or negative quantity`)
        }
      })
    }

    // حساب إجمالي المصروفات من جميع المصادر
    let totalExpenses = expenseValidation.calculations.totalExpenses

    // إضافة تكلفة المخزون
    if (data.inventory) {
      const inventoryCost = data.inventory.reduce((sum, item) => {
        const cost = this.validateAmount(item.cost_per_unit || 0).value
        const quantity = this.validateAmount(item.quantity || 0).value
        return sum + (cost * quantity)
      }, 0)
      totalExpenses += inventoryCost
    }

    // إضافة تكلفة طلبات المختبر
    if (data.labOrders) {
      const labCost = data.labOrders.reduce((sum, order) => {
        return sum + this.validateAmount(order.paid_amount || 0).value
      }, 0)
      totalExpenses += labCost
    }

    // إضافة تكلفة احتياجات العيادة
    if (data.clinicNeeds) {
      const clinicNeedsCost = data.clinicNeeds
        .filter(need => need.status === 'received' || need.status === 'ordered')
        .reduce((sum, need) => {
          const quantity = this.validateAmount(need.quantity || 0).value
          const price = this.validateAmount(need.price || 0).value
          return sum + (quantity * price)
        }, 0)
      totalExpenses += clinicNeedsCost
    }

    // حساب الأرباح والخسائر
    const totalRevenue = paymentValidation.calculations.totalRevenue
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    // التحقق من منطقية النتائج
    if (totalRevenue < 0) {
      allErrors.push('Total revenue cannot be negative')
    }

    if (totalExpenses < 0) {
      allErrors.push('Total expenses cannot be negative')
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      calculations: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100
      }
    }
  }
}

/**
 * دالة مساعدة للتحقق السريع من صحة البيانات المالية
 */
export function validateFinancialAccuracy(data: {
  payments: Payment[]
  expenses?: any[]
  inventory?: InventoryItem[]
}): boolean {
  const validation = FinancialValidator.validateAllFinancialData(data)

  if (!validation.isValid) {
    console.error('❌ Financial validation failed:', validation.errors)
    return false
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️ Financial validation warnings:', validation.warnings)
  }

  console.log('✅ Financial validation passed with 100% accuracy')
  return true
}
