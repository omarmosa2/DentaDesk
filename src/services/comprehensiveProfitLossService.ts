import type {
  Payment,
  LabOrder,
  ClinicNeed,
  InventoryItem,
  Patient,
  Appointment,
  ComprehensiveProfitLossReport,
  ReportFilter
} from '@/types'

/**
 * خدمة حساب التقرير الشامل للأرباح والخسائر
 * تربط جميع الجوانب المالية في التطبيق
 */
export class ComprehensiveProfitLossService {

  /**
   * دالة التحقق من صحة المبلغ
   */
  private static validateAmount(amount: any): number {
    const num = Number(amount)
    return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
  }

  /**
   * فلترة البيانات حسب التاريخ
   */
  private static filterByDateRange<T extends { created_at?: string; payment_date?: string; order_date?: string }>(
    data: T[],
    dateRange: { start?: string; end?: string; startDate?: string; endDate?: string },
    dateField: keyof T
  ): T[] {
    // دعم كلا من التنسيقين: start/end و startDate/endDate
    const startDate = dateRange.start || dateRange.startDate
    const endDate = dateRange.end || dateRange.endDate

    if (!startDate && !endDate) {
      return data
    }

    const filtered = data.filter(item => {
      const itemDate = item[dateField] as string
      if (!itemDate) {
        return false // استبعاد العناصر التي لا تحتوي على تاريخ عند الفلترة
      }

      // تحسين معالجة التواريخ لتجنب مشاكل المنطقة الزمنية
      const itemDateObj = new Date(itemDate)

      // إنشاء تواريخ البداية والنهاية مع ضبط المنطقة الزمنية المحلية
      let start: Date | null = null
      let end: Date | null = null

      if (startDate) {
        start = new Date(startDate)
        // التأكد من أن التاريخ في المنطقة الزمنية المحلية
        start = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0)
      }

      if (endDate) {
        end = new Date(endDate)
        // التأكد من أن التاريخ في المنطقة الزمنية المحلية
        end = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)
      }

      // للتواريخ التي تحتوي على وقت، نحتاج لمقارنة التاريخ فقط
      let itemDateForComparison: Date
      if (itemDate.includes('T') || itemDate.includes(' ')) {
        // التاريخ يحتوي على وقت، استخدمه كما هو
        itemDateForComparison = itemDateObj
      } else {
        // التاريخ بدون وقت، اعتبره في بداية اليوم
        itemDateForComparison = new Date(itemDateObj.getFullYear(), itemDateObj.getMonth(), itemDateObj.getDate(), 0, 0, 0, 0)
      }

      const isInRange = (!start || itemDateForComparison >= start) && (!end || itemDateForComparison <= end)

      return isInRange
    })

    return filtered
  }

  /**
   * حساب إحصائيات الإيرادات
   */
  private static calculateRevenueStats(payments: Payment[]) {
    const completedPayments = this.validateAmount(
      payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + this.validateAmount(p.amount), 0)
    )

    const partialPayments = this.validateAmount(
      payments
        .filter(p => p.status === 'partial')
        .reduce((sum, p) => sum + this.validateAmount(p.amount), 0)
    )

    const totalRevenue = completedPayments + partialPayments

    // حساب المبالغ المتبقية من المدفوعات الجزئية
    const remainingBalances = this.validateAmount(
      payments
        .filter(p => p.status === 'partial')
        .reduce((sum, p) => {
          // حساب المبلغ المتبقي بناءً على المبلغ الإجمالي وإجمالي المدفوع
          const totalAmountDue = this.validateAmount(p.total_amount_due || p.treatment_total_cost || p.appointment_total_cost || 0)
          const totalPaid = this.validateAmount(p.amount_paid || p.treatment_total_paid || p.appointment_total_paid || p.amount || 0)
          const remaining = Math.max(0, totalAmountDue - totalPaid)

          // إذا لم يكن هناك مبلغ إجمالي، استخدم الرصيد المتبقي المحفوظ
          if (totalAmountDue === 0) {
            return sum + this.validateAmount(p.remaining_balance || p.treatment_remaining_balance || p.appointment_remaining_balance || 0)
          }

          return sum + remaining
        }, 0)
    )

    // حساب المبالغ الآجلة (غير المدفوعة)
    const pendingAmount = this.validateAmount(
      payments
        .filter(p => p.status === 'pending')
        .reduce((sum, payment) => {
          const amount = this.validateAmount(payment.amount)
          const totalAmountDue = this.validateAmount(payment.total_amount_due)

          let pendingAmount = amount

          if (payment.tooth_treatment_id) {
            // للمدفوعات المرتبطة بعلاجات، استخدم التكلفة الإجمالية للعلاج
            const treatmentCost = this.validateAmount(payment.treatment_total_cost) || totalAmountDue
            pendingAmount = treatmentCost
          } else if (amount === 0 && totalAmountDue > 0) {
            // إذا كان المبلغ المدفوع 0 والمبلغ الإجمالي المطلوب أكبر من 0، استخدم المبلغ الإجمالي
            pendingAmount = totalAmountDue
          } else if (payment.remaining_balance && payment.remaining_balance > 0) {
            // استخدم الرصيد المتبقي إذا كان متوفراً
            pendingAmount = this.validateAmount(payment.remaining_balance)
          }

          return sum + pendingAmount
        }, 0)
    )

    return {
      completedPayments,
      totalRevenue,
      partialPayments,
      remainingBalances,
      pendingAmount
    }
  }

  /**
   * حساب إحصائيات المصروفات
   */
  private static calculateExpenseStats(
    labOrders: LabOrder[],
    clinicNeeds: ClinicNeed[],
    inventoryItems: InventoryItem[],
    expenses?: any[] // مصروفات العيادة المباشرة
  ) {
    // حسابات المخابر
    const labOrdersTotal = this.validateAmount(
      labOrders.reduce((sum, order) => sum + this.validateAmount(order.paid_amount || 0), 0)
    )

    const labOrdersRemaining = this.validateAmount(
      labOrders.reduce((sum, order) => sum + this.validateAmount(order.remaining_balance || 0), 0)
    )

    // حسابات احتياجات العيادة
    const clinicNeedsTotal = this.validateAmount(
      clinicNeeds
        .filter(need => need.status === 'received' || need.status === 'ordered')
        .reduce((sum, need) => sum + (this.validateAmount(need.quantity) * this.validateAmount(need.price)), 0)
    )

    const clinicNeedsRemaining = this.validateAmount(
      clinicNeeds
        .filter(need => need.status === 'pending' || need.status === 'ordered')
        .reduce((sum, need) => sum + (this.validateAmount(need.quantity) * this.validateAmount(need.price)), 0)
    )

    // حسابات المخزون (التكلفة الإجمالية للمخزون)
    const inventoryExpenses = this.validateAmount(
      inventoryItems.reduce((sum, item) => {
        const cost = this.validateAmount(item.cost_per_unit || 0)
        const quantity = this.validateAmount(item.quantity || 0)
        return sum + (cost * quantity)
      }, 0)
    )

    // حسابات مصروفات العيادة المباشرة
    const clinicExpensesTotal = expenses ? this.validateAmount(
      expenses
        .filter(e => e.status === 'paid')
        .reduce((sum, e) => sum + this.validateAmount(e.amount), 0)
    ) : 0

    return {
      labOrdersTotal,
      labOrdersRemaining,
      clinicNeedsTotal,
      clinicNeedsRemaining,
      inventoryExpenses,
      clinicExpensesTotal
    }
  }

  /**
   * حساب الأرباح والخسائر النهائية
   */
  private static calculateProfitLoss(
    totalIncome: number,
    totalExpenses: number
  ) {
    const netProfit = totalIncome - totalExpenses
    const isProfit = netProfit >= 0
    const lossAmount = isProfit ? 0 : Math.abs(netProfit)
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0

    return {
      totalIncome,
      totalExpenses,
      netProfit: isProfit ? netProfit : 0,
      profitMargin: this.validateAmount(profitMargin),
      lossAmount,
      isProfit
    }
  }

  /**
   * إنشاء التقرير الشامل للأرباح والخسائر
   */
  static generateComprehensiveProfitLossReport(
    payments: Payment[],
    labOrders: LabOrder[],
    clinicNeeds: ClinicNeed[],
    inventoryItems: InventoryItem[],
    patients: Patient[],
    appointments: Appointment[],
    filter?: ReportFilter,
    expenses?: any[] // مصروفات العيادة المباشرة
  ): ComprehensiveProfitLossReport {



    // فلترة البيانات حسب التاريخ إذا كان الفلتر موجود
    const filteredPayments = filter?.dateRange
      ? this.filterByDateRange(payments, filter.dateRange, 'payment_date')
      : payments

    const filteredLabOrders = filter?.dateRange
      ? this.filterByDateRange(labOrders, filter.dateRange, 'order_date')
      : labOrders

    const filteredClinicNeeds = filter?.dateRange
      ? this.filterByDateRange(clinicNeeds, filter.dateRange, 'created_at')
      : clinicNeeds

    const filteredAppointments = filter?.dateRange
      ? this.filterByDateRange(appointments, filter.dateRange, 'created_at')
      : appointments

    // فلترة المخزون حسب تاريخ الإنشاء
    const filteredInventoryItems = filter?.dateRange
      ? this.filterByDateRange(inventoryItems, filter.dateRange, 'created_at')
      : inventoryItems

    // فلترة مصروفات العيادة المباشرة حسب تاريخ الدفع
    const filteredExpenses = filter?.dateRange && expenses
      ? this.filterByDateRange(expenses, filter.dateRange, 'payment_date')
      : expenses

    // حساب الإيرادات
    const revenue = this.calculateRevenueStats(filteredPayments)

    // حساب المصروفات
    const expenseStats = this.calculateExpenseStats(
      filteredLabOrders,
      filteredClinicNeeds,
      filteredInventoryItems, // استخدام المخزون المفلتر
      filteredExpenses // استخدام المصروفات المفلترة
    )

    // حساب إجمالي الدخل والمصروفات
    const totalIncome = revenue.totalRevenue
    const totalExpenses = expenseStats.labOrdersTotal + expenseStats.clinicNeedsTotal + expenseStats.inventoryExpenses + expenseStats.clinicExpensesTotal

    // حساب الأرباح والخسائر
    const calculations = this.calculateProfitLoss(totalIncome, totalExpenses)

    // حساب التفاصيل الإضافية
    const details = {
      totalPatients: patients.length,
      totalAppointments: filteredAppointments.length,
      totalLabOrders: filteredLabOrders.length,
      totalClinicNeeds: filteredClinicNeeds.length,
      totalInventoryItems: filteredInventoryItems.length,
      totalExpenses: filteredExpenses ? filteredExpenses.length : 0,
      averageRevenuePerPatient: patients.length > 0 ? totalIncome / patients.length : 0,
      averageRevenuePerAppointment: filteredAppointments.length > 0 ? totalIncome / filteredAppointments.length : 0
    }

    // معلومات الفلترة
    const filterInfo = {
      dateRange: filter?.dateRange
        ? `${filter.dateRange.start || filter.dateRange.startDate || 'البداية'} - ${filter.dateRange.end || filter.dateRange.endDate || 'النهاية'}`
        : 'جميع البيانات',
      totalRecords: payments.length + labOrders.length + clinicNeeds.length + appointments.length + inventoryItems.length + (expenses ? expenses.length : 0),
      filteredRecords: filteredPayments.length + filteredLabOrders.length + filteredClinicNeeds.length + filteredAppointments.length + filteredInventoryItems.length + (filteredExpenses ? filteredExpenses.length : 0)
    }

    return {
      revenue,
      expenses: expenseStats,
      calculations,
      details,
      filterInfo
    }
  }
}
