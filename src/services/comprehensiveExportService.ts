import { Payment, Appointment, Patient, InventoryItem, ToothTreatment, Prescription, ClinicNeed, LabOrder } from '@/types'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { validateBeforeExport } from '@/utils/exportValidation'
import { getTreatmentNameInArabic, getCategoryNameInArabic, getStatusLabelInArabic, getPaymentStatusInArabic } from '@/utils/arabicTranslations'
import { ExportService } from './exportService'
import ExcelJS from 'exceljs'

// أنواع الفترات الزمنية المتاحة
export const TIME_PERIODS = {
  'all': 'جميع البيانات',
  'today': 'اليوم',
  'yesterday': 'أمس',
  'this_week': 'هذا الأسبوع',
  'last_week': 'الأسبوع الماضي',
  'this_month': 'هذا الشهر',
  'last_month': 'الشهر الماضي',
  'this_quarter': 'هذا الربع',
  'last_quarter': 'الربع الماضي',
  'this_year': 'هذا العام',
  'last_year': 'العام الماضي',
  'last_30_days': 'آخر 30 يوم',
  'last_90_days': 'آخر 90 يوم',
  'custom': 'فترة مخصصة'
} as const

export type TimePeriod = keyof typeof TIME_PERIODS

// دالة حساب التواريخ للفترات المختلفة
export function getDateRangeForPeriod(period: TimePeriod, customStart?: string, customEnd?: string): { startDate: Date; endDate: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (period) {
    case 'today':
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
      return { startDate: today, endDate: todayEnd }

    case 'yesterday':
      const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
      const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)
      return { startDate: yesterday, endDate: yesterdayEnd }

    case 'this_week':
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      return { startDate: startOfWeek, endDate: now }

    case 'last_week':
      const lastWeekStart = new Date(today)
      lastWeekStart.setDate(today.getDate() - today.getDay() - 7)
      const lastWeekEnd = new Date(lastWeekStart)
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6)
      lastWeekEnd.setHours(23, 59, 59, 999)
      return { startDate: lastWeekStart, endDate: lastWeekEnd }

    case 'this_month':
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      return { startDate: startOfMonth, endDate: now }

    case 'last_month':
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      lastMonthEnd.setHours(23, 59, 59, 999)
      return { startDate: lastMonthStart, endDate: lastMonthEnd }

    case 'this_quarter':
      const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)
      return { startDate: quarterStart, endDate: now }

    case 'last_quarter':
      const lastQuarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 - 3, 1)
      const lastQuarterEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 0)
      lastQuarterEnd.setHours(23, 59, 59, 999)
      return { startDate: lastQuarterStart, endDate: lastQuarterEnd }

    case 'this_year':
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      return { startDate: startOfYear, endDate: now }

    case 'last_year':
      const lastYearStart = new Date(today.getFullYear() - 1, 0, 1)
      const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31)
      lastYearEnd.setHours(23, 59, 59, 999)
      return { startDate: lastYearStart, endDate: lastYearEnd }

    case 'last_30_days':
      const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)
      const todayEnd30 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
      return { startDate: thirtyDaysAgo, endDate: todayEnd30 }

    case 'last_90_days':
      const ninetyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90)
      const todayEnd90 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
      return { startDate: ninetyDaysAgo, endDate: todayEnd90 }

    case 'custom':
      if (customStart && customEnd) {
        const startDate = new Date(customStart + 'T00:00:00')
        const endDate = new Date(customEnd + 'T23:59:59.999')
        return { startDate, endDate }
      }
      return { startDate: new Date(0), endDate: now }

    case 'all':
    default:
      return { startDate: new Date(0), endDate: now }
  }
}

/**
 * خدمة التصدير الشامل المحسنة
 * تضمن دقة 100% في البيانات المصدرة مع احترام الفلاتر الزمنية
 */
export class ComprehensiveExportService {

  /**
   * حساب الإحصائيات المالية الشاملة مع الأرباح والخسائر والمصروفات
   * مع ضمان دقة 100% في جميع الحسابات
   */
  static calculateFinancialStats(payments: Payment[], labOrders?: any[], clinicNeeds?: any[], inventoryItems?: any[], expenses?: any[]) {
    const validateAmount = (amount: any): number => {
      const num = Number(amount)
      return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
    }

    // التحقق من صحة البيانات المدخلة
    const validPayments = Array.isArray(payments) ? payments.filter(p => p && typeof p === 'object') : []
    const validLabOrders = Array.isArray(labOrders) ? labOrders.filter(l => l && typeof l === 'object') : []
    const validClinicNeeds = Array.isArray(clinicNeeds) ? clinicNeeds.filter(c => c && typeof c === 'object') : []
    const validInventoryItems = Array.isArray(inventoryItems) ? inventoryItems.filter(i => i && typeof i === 'object') : []
    const validExpenses = Array.isArray(expenses) ? expenses.filter(e => e && typeof e === 'object') : []

    console.log('🔍 calculateFinancialStats called with validated data:', {
      paymentsCount: validPayments.length,
      labOrdersCount: validLabOrders.length,
      clinicNeedsCount: validClinicNeeds.length,
      inventoryItemsCount: validInventoryItems.length,
      expensesCount: validExpenses.length
    })

    // === الإيرادات ===
    // المدفوعات المكتملة
    const completedPayments = validateAmount(
      payments
        .filter(p => p.status === 'completed')
        .reduce((sum, payment) => sum + validateAmount(payment.amount), 0)
    )

    // المدفوعات الجزئية
    const partialPayments = validateAmount(
      payments
        .filter(p => p.status === 'partial')
        .reduce((sum, payment) => sum + validateAmount(payment.amount), 0)
    )

    // إجمالي الإيرادات
    const totalRevenue = completedPayments + partialPayments

    // المبالغ المتبقية من المدفوعات الجزئية والآجلة
    const remainingBalances = validateAmount(
      payments
        .filter(p => (p.status === 'partial' || p.status === 'pending') &&
                    (p.treatment_remaining_balance || p.remaining_balance))
        .reduce((sum, payment) => {
          const treatmentRemaining = validateAmount(payment.treatment_remaining_balance)
          const generalRemaining = validateAmount(payment.remaining_balance)
          return sum + (treatmentRemaining || generalRemaining)
        }, 0)
    )

    // المدفوعات الآجلة
    const pendingAmount = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, payment) => {
        const amount = validateAmount(payment.amount)
        const totalAmountDue = validateAmount(payment.total_amount_due)

        let pendingAmount = amount

        if (payment.tooth_treatment_id) {
          // للمدفوعات المرتبطة بعلاجات، استخدم التكلفة الإجمالية للعلاج
          const treatmentCost = validateAmount(payment.treatment_total_cost) || totalAmountDue
          pendingAmount = treatmentCost
        } else if (amount === 0 && totalAmountDue > 0) {
          // إذا كان المبلغ المدفوع 0 والمبلغ الإجمالي المطلوب أكبر من 0، استخدم المبلغ الإجمالي
          pendingAmount = totalAmountDue
        }

        return sum + pendingAmount
      }, 0)

    // === المصروفات ===
    let labOrdersTotal = 0
    let labOrdersRemaining = 0
    let clinicNeedsTotal = 0
    let clinicNeedsRemaining = 0
    let inventoryExpenses = 0

    // حسابات المخابر
    if (labOrders && Array.isArray(labOrders)) {
      labOrdersTotal = validateAmount(
        labOrders.reduce((sum, order) => sum + validateAmount(order.paid_amount || 0), 0)
      )
      labOrdersRemaining = validateAmount(
        labOrders.reduce((sum, order) => sum + validateAmount(order.remaining_balance || 0), 0)
      )
    }

    // حسابات احتياجات العيادة
    if (clinicNeeds && Array.isArray(clinicNeeds)) {
      clinicNeedsTotal = validateAmount(
        clinicNeeds
          .filter(need => need.status === 'received' || need.status === 'ordered')
          .reduce((sum, need) => sum + (validateAmount(need.quantity) * validateAmount(need.price)), 0)
      )
      clinicNeedsRemaining = validateAmount(
        clinicNeeds
          .filter(need => need.status === 'pending' || need.status === 'ordered')
          .reduce((sum, need) => sum + (validateAmount(need.quantity) * validateAmount(need.price)), 0)
      )
    }

    // حسابات المخزون
    if (inventoryItems && Array.isArray(inventoryItems)) {
      inventoryExpenses = validateAmount(
        inventoryItems.reduce((sum, item) => {
          const cost = validateAmount(item.cost_per_unit || 0)
          const quantity = validateAmount(item.quantity || 0)
          return sum + (cost * quantity)
        }, 0)
      )
    }

    // === مصروفات العيادة المباشرة ===
    let clinicExpensesTotal = 0
    let expensesByType: Array<{type: string, amount: number, percentage: number}> = []

    if (validExpenses && validExpenses.length > 0) {
      clinicExpensesTotal = validateAmount(
        validExpenses
          .filter(e => e.status === 'paid')
          .reduce((sum, e) => sum + validateAmount(e.amount), 0)
      )

      // تجميع المصروفات حسب النوع
      const expenseTypeMapping: Record<string, string> = {
        'salary': 'رواتب',
        'utilities': 'مرافق',
        'rent': 'إيجار',
        'maintenance': 'صيانة',
        'supplies': 'مستلزمات',
        'insurance': 'تأمين',
        'other': 'أخرى'
      }

      const typeStats: Record<string, number> = {}
      validExpenses
        .filter(e => e.status === 'paid')
        .forEach(expense => {
          const type = expense.expense_type || 'other'
          const amount = validateAmount(expense.amount)
          typeStats[type] = (typeStats[type] || 0) + amount
        })

      expensesByType = Object.entries(typeStats).map(([type, amount]) => ({
        type: expenseTypeMapping[type as keyof typeof expenseTypeMapping] || type,
        amount: validateAmount(amount as number),
        percentage: clinicExpensesTotal > 0 ? (validateAmount(amount as number) / clinicExpensesTotal) * 100 : 0
      }))
    }

    // === حسابات الأرباح والخسائر مع ضمان الدقة ===
    const totalExpenses = validateAmount(labOrdersTotal + clinicNeedsTotal + inventoryExpenses + clinicExpensesTotal)
    const netProfit = validateAmount(totalRevenue - totalExpenses)
    const isProfit = netProfit >= 0
    const profitMargin = totalRevenue > 0 ? validateAmount((netProfit / totalRevenue) * 100) : 0

    // التحقق من صحة الحسابات
    console.log('💰 Financial calculations verification:', {
      totalRevenue: validateAmount(totalRevenue),
      totalExpenses: validateAmount(totalExpenses),
      netProfit: validateAmount(netProfit),
      profitMargin: validateAmount(profitMargin),
      breakdown: {
        labOrdersTotal: validateAmount(labOrdersTotal),
        clinicNeedsTotal: validateAmount(clinicNeedsTotal),
        inventoryExpenses: validateAmount(inventoryExpenses),
        clinicExpensesTotal: validateAmount(clinicExpensesTotal)
      }
    })

    // المدفوعات المتأخرة (المدفوعات الآجلة التي تجاوز تاريخ دفعها 30 يوماً)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    return {
      // الإيرادات
      completedPayments,
      partialPayments,
      totalRevenue,
      remainingBalances,
      pendingAmount,

      // المصروفات
      labOrdersTotal,
      labOrdersRemaining,
      clinicNeedsTotal,
      clinicNeedsRemaining,
      inventoryExpenses,
      clinicExpensesTotal,
      expensesByType,
      totalExpenses,

      // الأرباح والخسائر
      netProfit: isProfit ? netProfit : 0,
      lossAmount: isProfit ? 0 : Math.abs(netProfit),
      profitMargin: validateAmount(profitMargin),
      isProfit,

      // إحصائيات إضافية
      totalTransactions: payments.length,
      completedTransactions: payments.filter(p => p.status === 'completed').length,
      partialTransactions: payments.filter(p => p.status === 'partial').length,
      pendingTransactions: payments.filter(p => p.status === 'pending').length
    }
  }

  /**
   * فلترة جميع البيانات حسب الفترة الزمنية
   */
  private static filterAllDataByDateRange(data: {
    patients: Patient[]
    appointments: Appointment[]
    payments: Payment[]
    inventory: InventoryItem[]
    treatments?: ToothTreatment[]
    prescriptions?: Prescription[]
    labOrders?: LabOrder[]
    clinicNeeds?: ClinicNeed[]
  }, dateRange: { startDate: Date; endDate: Date }) {

    const isInDateRange = (dateStr: string) => {
      if (!dateStr) return false
      const itemDate = new Date(dateStr)

      // للتواريخ التي تحتوي على وقت، نحتاج لمقارنة التاريخ فقط
      let itemDateForComparison: Date
      if (dateStr.includes('T') || dateStr.includes(' ')) {
        // التاريخ يحتوي على وقت، استخدمه كما هو
        itemDateForComparison = itemDate
      } else {
        // التاريخ بدون وقت، اعتبره في بداية اليوم
        itemDateForComparison = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate(), 0, 0, 0, 0)
      }

      return itemDateForComparison >= dateRange.startDate && itemDateForComparison <= dateRange.endDate
    }

    return {
      patients: data.patients, // المرضى لا يتم فلترتهم حسب التاريخ
      appointments: data.appointments.filter(apt =>
        isInDateRange(apt.start_time) || isInDateRange(apt.created_at)
      ),
      payments: data.payments.filter(payment =>
        isInDateRange(payment.payment_date) || isInDateRange(payment.created_at)
      ),
      inventory: data.inventory.filter(item =>
        isInDateRange(item.created_at) || isInDateRange(item.updated_at)
      ), // فلترة المخزون حسب تاريخ الإنشاء أو التحديث
      treatments: data.treatments?.filter(treatment =>
        isInDateRange(treatment.start_date || '') || isInDateRange(treatment.created_at || '')
      ) || [],
      prescriptions: data.prescriptions?.filter(prescription =>
        isInDateRange(prescription.created_at)
      ) || [],
      labOrders: data.labOrders?.filter(order =>
        isInDateRange(order.order_date) || isInDateRange(order.created_at)
      ) || [],
      clinicNeeds: data.clinicNeeds?.filter(need =>
        isInDateRange(need.created_at)
      ) || []
    }
  }

  /**
   * حساب الإحصائيات الشاملة لجميع جوانب التطبيق
   */
  private static calculateAllAspectsStats(filteredData: {
    patients: Patient[]
    appointments: Appointment[]
    payments: Payment[]
    inventory: InventoryItem[]
    treatments: ToothTreatment[]
    prescriptions: Prescription[]
    labOrders: LabOrder[]
    clinicNeeds: ClinicNeed[]
  }, dateRange: { startDate: Date; endDate: Date }) {

    // الإحصائيات المالية
    const financialStats = this.calculateFinancialStats(
      filteredData.payments,
      filteredData.labOrders,
      filteredData.clinicNeeds,
      filteredData.inventory,
      (filteredData as any).expenses // إضافة المصروفات إذا كانت متوفرة
    )

    // إحصائيات المواعيد
    const appointmentStats = this.calculateDetailedAppointmentStats(filteredData.appointments)

    // إحصائيات العلاجات
    const treatmentStats = this.calculateTreatmentStats(filteredData.treatments)

    // إحصائيات الوصفات
    const prescriptionStats = this.calculatePrescriptionStats(filteredData.prescriptions)

    // إحصائيات المخابر
    const labStats = this.calculateLabOrderStats(filteredData.labOrders)

    // إحصائيات احتياجات العيادة
    const clinicNeedsStats = this.calculateClinicNeedsStats(filteredData.clinicNeeds)

    // إحصائيات المخزون
    const inventoryStats = this.calculateInventoryStats(filteredData.inventory)

    return {
      // معلومات الفترة
      dateRange: {
        start: formatDate(dateRange.startDate.toISOString()),
        end: formatDate(dateRange.endDate.toISOString()),
        period: `${formatDate(dateRange.startDate.toISOString())} - ${formatDate(dateRange.endDate.toISOString())}`
      },

      // الإحصائيات العامة
      totalPatients: filteredData.patients.length,
      totalAppointments: filteredData.appointments.length,
      totalPayments: filteredData.payments.length,
      totalTreatments: filteredData.treatments.length,
      totalPrescriptions: filteredData.prescriptions.length,
      totalLabOrders: filteredData.labOrders.length,
      totalClinicNeeds: filteredData.clinicNeeds.length,
      totalInventoryItems: filteredData.inventory.length,

      // الإحصائيات التفصيلية
      ...financialStats,
      ...appointmentStats,
      ...treatmentStats,
      ...prescriptionStats,
      ...labStats,
      ...clinicNeedsStats,
      ...inventoryStats
    }
  }

  /**
   * حساب إحصائيات المواعيد
   */
  static calculateAppointmentStats(appointments: Appointment[]) {
    const total = appointments.length
    const completed = appointments.filter(a => a.status === 'completed').length
    const cancelled = appointments.filter(a => a.status === 'cancelled').length
    const noShow = appointments.filter(a => a.status === 'no-show').length
    const scheduled = appointments.filter(a => a.status === 'scheduled').length

    const attendanceRate = total > 0 ? Math.round((completed / total) * 100) : 0

    return {
      total,
      completed,
      cancelled,
      noShow,
      scheduled,
      attendanceRate
    }
  }

  /**
   * حساب إحصائيات المواعيد التفصيلية
   */
  private static calculateDetailedAppointmentStats(appointments: Appointment[]) {
    const basicStats = this.calculateAppointmentStats(appointments)

    // تحليل أوقات المواعيد
    const timeAnalysis = appointments.reduce((acc, apt) => {
      if (apt.start_time) {
        const hour = new Date(apt.start_time).getHours()
        acc[hour] = (acc[hour] || 0) + 1
      }
      return acc
    }, {} as Record<number, number>)

    const peakHour = Object.entries(timeAnalysis).reduce((max, [hour, count]) =>
      count > max.count ? { hour: parseInt(hour), count } : max,
      { hour: 0, count: 0 }
    )

    // تحليل أيام الأسبوع
    const dayAnalysis = appointments.reduce((acc, apt) => {
      if (apt.start_time) {
        const day = new Date(apt.start_time).getDay()
        const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
        const dayName = dayNames[day]
        acc[dayName] = (acc[dayName] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    return {
      ...basicStats,
      peakHour: peakHour.hour ? `${peakHour.hour}:00 (${peakHour.count} مواعيد)` : 'غير محدد',
      dayDistribution: dayAnalysis,
      averagePerDay: appointments.length > 0 ? Math.round(appointments.length / 7) : 0
    }
  }

  /**
   * حساب إحصائيات العلاجات
   */
  private static calculateTreatmentStats(treatments: ToothTreatment[]) {
    const total = treatments.length
    const completed = treatments.filter(t => t.treatment_status === 'completed').length
    const planned = treatments.filter(t => t.treatment_status === 'planned').length
    const inProgress = treatments.filter(t => t.treatment_status === 'in_progress').length
    const cancelled = treatments.filter(t => t.treatment_status === 'cancelled').length

    // تحليل أنواع العلاجات
    const treatmentTypes = treatments.reduce((acc, treatment) => {
      const type = treatment.treatment_type || 'غير محدد'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // تحليل الأسنان المعالجة
    const teethTreated = treatments.reduce((acc, treatment) => {
      const tooth = treatment.tooth_number?.toString() || 'غير محدد'
      acc[tooth] = (acc[tooth] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    return {
      totalTreatments: total,
      completedTreatments: completed,
      plannedTreatments: planned,
      inProgressTreatments: inProgress,
      cancelledTreatments: cancelled,
      completionRate,
      treatmentTypes,
      teethTreated,
      mostTreatedTooth: Object.entries(teethTreated).reduce((max, [tooth, count]) =>
        count > max.count ? { tooth, count } : max,
        { tooth: 'غير محدد', count: 0 }
      )
    }
  }

  /**
   * حساب إحصائيات الوصفات
   */
  private static calculatePrescriptionStats(prescriptions: Prescription[]) {
    const total = prescriptions.length

    // تحليل الأدوية الأكثر وصفاً
    const medicationFrequency = prescriptions.reduce((acc, prescription) => {
      // هنا يمكن إضافة تحليل الأدوية إذا كانت متوفرة في البيانات
      return acc
    }, {} as Record<string, number>)

    // تحليل المرضى الذين لديهم وصفات
    const patientsWithPrescriptions = new Set(prescriptions.map(p => p.patient_id)).size

    return {
      totalPrescriptions: total,
      patientsWithPrescriptions,
      averagePrescriptionsPerPatient: patientsWithPrescriptions > 0 ?
        Math.round((total / patientsWithPrescriptions) * 100) / 100 : 0
    }
  }

  /**
   * حساب إحصائيات طلبات المخابر
   */
  private static calculateLabOrderStats(labOrders: LabOrder[]) {
    const total = labOrders.length
    const pending = labOrders.filter(order => order.status === 'آجل').length
    const completed = labOrders.filter(order => order.status === 'مكتمل').length
    const cancelled = labOrders.filter(order => order.status === 'ملغي').length

    const totalCost = labOrders.reduce((sum, order) => sum + (order.cost || 0), 0)
    const totalPaid = labOrders.reduce((sum, order) => sum + (order.paid_amount || 0), 0)
    const totalRemaining = labOrders.reduce((sum, order) => sum + (order.remaining_balance || 0), 0)

    // تحليل المخابر الأكثر استخداماً
    const labFrequency = labOrders.reduce((acc, order) => {
      const labName = order.lab?.name || 'غير محدد'
      acc[labName] = (acc[labName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    return {
      totalLabOrders: total,
      pendingLabOrders: pending,
      completedLabOrders: completed,
      cancelledLabOrders: cancelled,
      labOrdersCompletionRate: completionRate,
      totalLabCost: totalCost,
      totalLabPaid: totalPaid,
      totalLabRemaining: totalRemaining,
      labFrequency,
      mostUsedLab: Object.entries(labFrequency).reduce((max, [lab, count]) =>
        count > max.count ? { lab, count } : max,
        { lab: 'غير محدد', count: 0 }
      )
    }
  }

  /**
   * حساب إحصائيات احتياجات العيادة
   */
  private static calculateClinicNeedsStats(clinicNeeds: ClinicNeed[]) {
    const total = clinicNeeds.length
    const pending = clinicNeeds.filter(need => need.status === 'pending').length
    const ordered = clinicNeeds.filter(need => need.status === 'ordered').length
    const received = clinicNeeds.filter(need => need.status === 'received').length
    const cancelled = clinicNeeds.filter(need => need.status === 'cancelled').length

    const totalValue = clinicNeeds.reduce((sum, need) =>
      sum + ((need.quantity || 0) * (need.price || 0)), 0)

    // تحليل الأولويات
    const priorityAnalysis = clinicNeeds.reduce((acc, need) => {
      const priority = need.priority || 'medium'
      acc[priority] = (acc[priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // تحليل الفئات
    const categoryAnalysis = clinicNeeds.reduce((acc, need) => {
      const category = need.category || 'غير محدد'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const completionRate = total > 0 ? Math.round((received / total) * 100) : 0

    return {
      totalClinicNeeds: total,
      pendingNeeds: pending,
      orderedNeeds: ordered,
      receivedNeeds: received,
      cancelledNeeds: cancelled,
      needsCompletionRate: completionRate,
      totalNeedsValue: totalValue,
      priorityAnalysis,
      categoryAnalysis,
      urgentNeeds: priorityAnalysis.urgent || 0,
      highPriorityNeeds: priorityAnalysis.high || 0
    }
  }

  /**
   * دالة التحقق من صحة المبلغ (مساعدة)
   */
  private static validateAmount(amount: any): number {
    const num = Number(amount)
    return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
  }

  /**
   * حساب إحصائيات المخزون التفصيلية
   */
  private static calculateInventoryStats(inventoryItems: InventoryItem[]) {
    const total = inventoryItems.length

    // تحليل الفئات
    const categoryAnalysis = inventoryItems.reduce((acc, item) => {
      const category = item.category || 'غير محدد'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // حساب القيمة الإجمالية
    const totalValue = inventoryItems.reduce((sum, item) => {
      const cost = this.validateAmount(item.cost_per_unit || 0)
      const quantity = this.validateAmount(item.quantity || 0)
      return sum + (cost * quantity)
    }, 0)

    // العناصر منخفضة المخزون
    const lowStockItems = inventoryItems.filter(item =>
      (item.quantity || 0) <= (item.minimum_quantity || 0)
    ).length

    return {
      totalInventoryItems: total,
      totalInventoryValue: totalValue,
      lowStockItems,
      inventoryByCategory: categoryAnalysis
    }
  }

  /**
   * تجميع البيانات حسب الحالة
   */
  private static groupByStatus<T extends { status?: string }>(data: T[], statusField: keyof T) {
    return data.reduce((acc, item) => {
      const status = (item[statusField] as string) || 'غير محدد'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * تجميع المدفوعات حسب طريقة الدفع
   */
  private static groupByMethod(payments: Payment[]) {
    return payments.reduce((acc, payment) => {
      const method = payment.payment_method || 'غير محدد'
      acc[method] = (acc[method] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * تجميع المخزون حسب الفئة
   */
  private static groupByCategory(inventoryItems: InventoryItem[]) {
    return inventoryItems.reduce((acc, item) => {
      const category = item.category || 'غير محدد'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }



  /**
   * إنشاء تقرير شامل بصيغة CSV
   */
  static generateComprehensiveCSV(data: {
    patients: Patient[]
    appointments: Appointment[]
    payments: Payment[]
    inventory: InventoryItem[]
    filterInfo: {
      appointmentFilter: string
      paymentFilter: string
      inventoryFilter: string
    }
  }): string {
    const financialStats = this.calculateFinancialStats(data.payments)
    const appointmentStats = this.calculateAppointmentStats(data.appointments)
    const inventoryStats = this.calculateInventoryStats(data.inventory)

    // إنشاء محتوى CSV مع BOM للدعم العربي
    let csv = '\uFEFF'

    // معلومات التقرير
    csv += 'التقرير الشامل - عيادة الأسنان الحديثة\n'
    csv += `تاريخ التقرير,${this.formatGregorianDate(new Date())}\n`
    csv += `وقت الإنشاء,${new Date().toLocaleTimeString('ar-SA')}\n\n`

    // معلومات الفلترة
    csv += 'معلومات الفلترة المطبقة\n'
    csv += `فلتر المواعيد,${data.filterInfo.appointmentFilter}\n`
    csv += `فلتر المدفوعات,${data.filterInfo.paymentFilter}\n`
    csv += `فلتر المخزون,${data.filterInfo.inventoryFilter}\n\n`

    // إحصائيات المرضى
    csv += 'إحصائيات المرضى\n'
    csv += `إجمالي المرضى,${data.patients.length}\n`
    csv += `المرضى الجدد هذا الشهر,${this.getNewPatientsThisMonth(data.patients)}\n`
    csv += `المرضى النشطون,${this.getActivePatients(data.patients, data.appointments)}\n`
    csv += `متوسط عمر المرضى,${this.calculateAverageAge(data.patients)}\n`
    csv += `توزيع الجنس,${this.getGenderDistribution(data.patients)}\n\n`

    // إحصائيات المواعيد المفلترة
    csv += 'إحصائيات المواعيد (مفلترة)\n'
    csv += `إجمالي المواعيد,${appointmentStats.total}\n`
    csv += `المواعيد المكتملة,${appointmentStats.completed}\n`
    csv += `المواعيد الملغية,${appointmentStats.cancelled}\n`
    csv += `المواعيد المجدولة,${appointmentStats.scheduled}\n`
    csv += `معدل الحضور,${appointmentStats.attendanceRate}%\n\n`

    // الإحصائيات المالية المفلترة
    csv += 'الإحصائيات المالية (مفلترة)\n'
    csv += `إجمالي الإيرادات,${formatCurrency(financialStats.totalRevenue)}\n`
    csv += `المدفوعات المكتملة,${formatCurrency(financialStats.completedAmount)}\n`
    csv += `المدفوعات الجزئية,${formatCurrency(financialStats.partialAmount)}\n`
    csv += `المدفوعات الآجلة,${formatCurrency(financialStats.pendingAmount)}\n`
    csv += `المدفوعات المتأخرة,${formatCurrency(financialStats.overdueAmount)}\n`

    // إضافة المبالغ المتبقية من الدفعات الجزئية
    if (financialStats.totalRemainingFromPartialPayments > 0) {
      csv += `المبالغ المتبقية من الدفعات الجزئية,${formatCurrency(financialStats.totalRemainingFromPartialPayments)}\n`
    }

    csv += `الرصيد المستحق الإجمالي,${formatCurrency(financialStats.outstandingBalance)}\n`
    csv += `إجمالي المعاملات,${financialStats.totalTransactions}\n`
    csv += `إجمالي المصروفات,${formatCurrency(financialStats.totalExpenses || 0)}\n`
    csv += `صافي الربح,${formatCurrency(financialStats.netProfit || 0)}\n`
    csv += `هامش الربح,${(financialStats.profitMargin || 0).toFixed(2)}%\n`
    csv += `حالة الربحية,${(financialStats.netProfit || 0) >= 0 ? 'ربح' : 'خسارة'}\n\n`

    // إضافة تفاصيل المصروفات إذا كانت متوفرة
    if (financialStats.expensesByType && financialStats.expensesByType.length > 0) {
      csv += 'توزيع المصروفات حسب النوع\n'
      csv += 'نوع المصروف,المبلغ,النسبة المئوية\n'
      financialStats.expensesByType.forEach(expense => {
        csv += `"${expense.type}","${formatCurrency(expense.amount)}","${expense.percentage.toFixed(2)}%"\n`
      })
      csv += '\n'
    }

    // توزيع طرق الدفع
    csv += 'توزيع طرق الدفع\n'
    csv += 'طريقة الدفع,المبلغ,عدد المعاملات\n'
    Object.entries(financialStats.paymentMethodStats).forEach(([method, stats]) => {
      csv += `"${method}","${formatCurrency(stats.amount)}","${stats.count}"\n`
    })
    csv += '\n'

    // إحصائيات المخزون المفلترة
    csv += 'إحصائيات المخزون (مفلترة)\n'
    csv += `إجمالي العناصر,${inventoryStats.totalItems}\n`
    csv += `القيمة الإجمالية,${formatCurrency(inventoryStats.totalValue)}\n`
    csv += `عناصر منخفضة المخزون,${inventoryStats.lowStockItems}\n`
    csv += `عناصر نفدت من المخزون,${inventoryStats.outOfStockItems}\n`
    csv += `عناصر منتهية الصلاحية,${inventoryStats.expiredItems}\n`
    csv += `عناصر قريبة الانتهاء (30 يوم),${inventoryStats.nearExpiryItems}\n\n`

    // تفاصيل المواعيد المفلترة
    if (data.appointments.length > 0) {
      csv += 'تفاصيل المواعيد المفلترة\n'
      csv += 'التاريخ,الوقت,اسم المريض,عنوان الموعد,نوع العلاج,التكلفة,الحالة,ملاحظات\n'
      data.appointments.forEach(appointment => {
        const appointmentDate = formatDate(appointment.start_time)
        const appointmentTime = new Date(appointment.start_time).toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit'
        })
        const patientName = appointment.patient?.full_name || appointment.patient?.name || 'غير محدد'
        const title = appointment.title || 'غير محدد'
        const treatmentType = appointment.treatment_type || 'غير محدد'
        const cost = appointment.cost ? formatCurrency(appointment.cost) : '0'
        const status = this.getStatusInArabic(appointment.status)
        const notes = appointment.notes || ''

        csv += `"${appointmentDate}","${appointmentTime}","${patientName}","${title}","${treatmentType}","${cost}","${status}","${notes}"\n`
      })
      csv += '\n'
    }

    // تفاصيل المدفوعات المفلترة
    if (data.payments.length > 0) {
      csv += 'تفاصيل المدفوعات المفلترة\n'
      csv += 'تاريخ الدفع,اسم المريض,الوصف,المبلغ,المبلغ المدفوع,الرصيد المتبقي,طريقة الدفع,الحالة,رقم الإيصال,ملاحظات\n'
      data.payments.forEach(payment => {
        const paymentDate = formatDate(payment.payment_date)
        const patientName = payment.patient?.full_name || payment.patient?.name || 'غير محدد'
        const description = payment.description || 'غير محدد'

        // حساب المبالغ بناءً على نوع الدفعة مثل تقرير الربح والخسائر
        let totalAmount, amountPaid, remainingBalance

        if (payment.status === 'partial') {
          // للدفعات الجزئية: المبلغ الإجمالي هو total_amount_due، المدفوع هو amount، المتبقي هو الفرق
          const totalDue = Number(payment.total_amount_due || payment.amount) || 0
          const paid = Number(payment.amount_paid || payment.amount) || 0
          totalAmount = formatCurrency(totalDue)
          amountPaid = formatCurrency(paid)
          remainingBalance = formatCurrency(Math.max(0, totalDue - paid))
        } else if (payment.appointment_id && payment.treatment_total_cost) {
          // للمدفوعات المرتبطة بعلاجات: استخدم بيانات العلاج
          totalAmount = formatCurrency(Number(payment.treatment_total_cost) || 0)
          amountPaid = formatCurrency(Number(payment.treatment_total_paid || payment.amount) || 0)
          remainingBalance = formatCurrency(Number(payment.treatment_remaining_balance || 0))
        } else {
          // للمدفوعات العادية المكتملة
          totalAmount = formatCurrency(Number(payment.amount) || 0)
          amountPaid = formatCurrency(Number(payment.amount) || 0)
          remainingBalance = formatCurrency(0)
        }

        const method = this.getPaymentMethodInArabic(payment.payment_method)
        const status = getPaymentStatusInArabic(payment.status)
        const receiptNumber = payment.receipt_number || ''
        const notes = payment.notes || ''

        csv += `"${paymentDate}","${patientName}","${description}","${totalAmount}","${amountPaid}","${remainingBalance}","${method}","${status}","${receiptNumber}","${notes}"\n`
      })
      csv += '\n'
    }

    // تفاصيل المخزون المفلتر
    if (data.inventory.length > 0) {
      csv += 'تفاصيل المخزون المفلتر\n'
      csv += 'اسم الصنف,الوصف,الفئة,الكمية,الوحدة,الحد الأدنى,تكلفة الوحدة,القيمة الإجمالية,المورد,تاريخ الانتهاء,الحالة,تاريخ الإنشاء\n'
      data.inventory.forEach(item => {
        const itemName = item.name || 'غير محدد'
        const description = item.description || 'غير محدد'
        const category = item.category || 'غير محدد'
        const quantity = item.quantity || 0
        const unit = item.unit || 'قطعة'
        const minStock = item.minimum_stock || 0
        const costPerUnit = formatCurrency(item.cost_per_unit || 0)
        const totalValue = formatCurrency((item.cost_per_unit || 0) * (item.quantity || 0))
        const supplier = item.supplier || 'غير محدد'
        const expiryDate = item.expiry_date ? formatDate(item.expiry_date) : 'غير محدد'
        const status = this.getInventoryStatusInArabic(item.quantity || 0, item.minimum_stock || 0)
        const createdDate = formatDate(item.created_at)

        csv += `"${itemName}","${description}","${category}","${quantity}","${unit}","${minStock}","${costPerUnit}","${totalValue}","${supplier}","${expiryDate}","${status}","${createdDate}"\n`
      })
      csv += '\n'
    }

    // تفاصيل المرضى (عينة من أحدث المرضى)
    if (data.patients.length > 0) {
      csv += 'تفاصيل المرضى (أحدث 50 مريض)\n'
      csv += '#,الاسم الكامل,رقم الهاتف,العمر,الجنس,الحالة الطبية,الحساسية,البريد الإلكتروني,العنوان,تاريخ التسجيل,آخر موعد,إجمالي المواعيد,إجمالي المدفوعات,الرصيد المتبقي,ملاحظات\n'

      // ترتيب المرضى حسب تاريخ الإنشاء (الأحدث أولاً) وأخذ أول 50
      const recentPatients = [...data.patients]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50)

      recentPatients.forEach(patient => {
        const serialNumber = patient.serial_number || 'غير محدد'
        const fullName = patient.full_name || patient.name || 'غير محدد'
        const phone = patient.phone || 'غير محدد'
        const age = patient.age || 'غير محدد'
        const gender = patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : 'غير محدد'
        const patientCondition = patient.patient_condition || 'غير محدد'
        const allergies = patient.allergies || 'لا يوجد'
        const email = patient.email || 'غير محدد'
        const address = patient.address || 'غير محدد'
        const registrationDate = formatDate(patient.created_at)
        const notes = patient.notes || 'لا يوجد'

        // حساب إحصائيات المريض من البيانات المفلترة
        const patientAppointments = data.appointments.filter(apt => apt.patient_id === patient.id)
        const patientPayments = data.payments.filter(pay => pay.patient_id === patient.id)

        const lastAppointment = patientAppointments.length > 0
          ? formatDate(patientAppointments.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0].start_time)
          : 'لا يوجد'

        const totalAppointments = patientAppointments.length

        // حساب إجمالي المدفوعات والمبالغ المتبقية للمريض
        let totalPayments = 0
        let totalRemaining = 0

        // حساب المبالغ بالطريقة الصحيحة
        let patientTotalDue = 0
        let patientTotalPaid = 0

        // حساب المدفوعات المرتبطة بالمواعيد
        patientAppointments.forEach(appointment => {
          if (appointment.cost) {
            const appointmentPayments = patientPayments.filter(p => p.appointment_id === appointment.id)
            const appointmentTotalPaid = appointmentPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
            patientTotalDue += appointment.cost
            patientTotalPaid += appointmentTotalPaid
          }
        })

        // إضافة المدفوعات العامة غير المرتبطة بمواعيد
        const generalPayments = patientPayments.filter(payment => !payment.appointment_id)
        generalPayments.forEach(payment => {
          patientTotalPaid += payment.amount || 0
          if (payment.total_amount_due) {
            patientTotalDue += payment.total_amount_due
          }
        })

        totalPayments += patientTotalPaid
        totalRemaining += Math.max(0, patientTotalDue - patientTotalPaid)

        csv += `"${serialNumber}","${fullName}","${phone}","${age}","${gender}","${patientCondition}","${allergies}","${email}","${address}","${registrationDate}","${lastAppointment}","${totalAppointments}","${formatCurrency(totalPayments)}","${formatCurrency(totalRemaining)}","${notes}"\n`
      })
      csv += '\n'
    }

    // ملخص إضافي للطبيب
    csv += 'ملخص إضافي للطبيب\n'
    csv += `متوسط قيمة الموعد,${appointmentStats.total > 0 ? formatCurrency(financialStats.totalRevenue / appointmentStats.total) : '0'}\n`
    csv += `متوسط المدفوعات اليومية,${this.calculateDailyAverage(data.payments, financialStats.totalRevenue)}\n`
    csv += `نسبة المدفوعات المكتملة,${financialStats.totalTransactions > 0 ? Math.round((financialStats.completedTransactions / financialStats.totalTransactions) * 100) : 0}%\n`
    csv += `نسبة المدفوعات الجزئية,${financialStats.totalTransactions > 0 ? Math.round((financialStats.partialTransactions / financialStats.totalTransactions) * 100) : 0}%\n`
    csv += `نسبة الإلغاء,${appointmentStats.total > 0 ? Math.round((appointmentStats.cancelled / appointmentStats.total) * 100) : 0}%\n`
    csv += `متوسط عدد المواعيد لكل مريض,${data.patients.length > 0 ? Math.round((appointmentStats.total / data.patients.length) * 100) / 100 : 0}\n`
    csv += `متوسط الإيرادات لكل مريض,${data.patients.length > 0 ? formatCurrency(financialStats.totalRevenue / data.patients.length) : '0'}\n\n`

    // تحليلات متقدمة للطبيب
    csv += 'تحليلات متقدمة\n'

    // تحليل الأداء المالي
    const totalExpectedRevenue = data.appointments.reduce((sum, apt) => sum + (apt.cost || 0), 0)
    const collectionRate = totalExpectedRevenue > 0 ? Math.round((financialStats.totalRevenue / totalExpectedRevenue) * 100) : 0
    csv += `معدل التحصيل,${collectionRate}%\n`

    // تحليل أنواع العلاج
    const treatmentTypes = this.analyzeTreatmentTypes(data.appointments)
    csv += `أكثر أنواع العلاج طلباً,${treatmentTypes.mostCommon}\n`
    csv += `أعلى أنواع العلاج قيمة,${treatmentTypes.highestValue}\n`

    // تحليل الأوقات
    const timeAnalysis = this.analyzeAppointmentTimes(data.appointments)
    csv += `أكثر الأوقات ازدحاماً,${timeAnalysis.peakHour}\n`
    csv += `أكثر الأيام ازدحاماً,${timeAnalysis.peakDay}\n`

    // تحليل المرضى
    const patientAnalysis = this.analyzePatients(data.patients, data.appointments, data.payments)
    csv += `أكثر المرضى زيارة,${patientAnalysis.mostFrequent}\n`
    csv += `أعلى المرضى إنفاقاً,${patientAnalysis.highestSpender}\n`

    // توصيات للطبيب
    csv += '\nتوصيات للطبيب\n'
    if (appointmentStats.attendanceRate < 80) {
      csv += `توصية,تحسين معدل الحضور - النسبة الحالية ${appointmentStats.attendanceRate}% منخفضة\n`
    }
    if (collectionRate < 90) {
      csv += `توصية,تحسين معدل التحصيل - النسبة الحالية ${collectionRate}% منخفضة\n`
    }
    if (financialStats.partialTransactions > financialStats.completedTransactions) {
      csv += `توصية,متابعة المدفوعات الجزئية - ${financialStats.partialTransactions} معاملة جزئية مقابل ${financialStats.completedTransactions} مكتملة\n`
    }
    if (inventoryStats.lowStockItems > 0) {
      csv += `توصية,تجديد المخزون - ${inventoryStats.lowStockItems} صنف منخفض المخزون\n`
    }
    if (inventoryStats.expiredItems > 0) {
      csv += `توصية,إزالة المواد المنتهية الصلاحية - ${inventoryStats.expiredItems} صنف منتهي الصلاحية\n`
    }
    if (inventoryStats.nearExpiryItems > 0) {
      csv += `توصية,استخدام المواد قريبة الانتهاء - ${inventoryStats.nearExpiryItems} صنف ينتهي خلال 30 يوم\n`
    }
    if (appointmentStats.cancelled > appointmentStats.completed * 0.2) {
      csv += `توصية,تقليل معدل الإلغاء - ${appointmentStats.cancelled} موعد ملغي من أصل ${appointmentStats.total}\n`
    }
    if (financialStats.overdueAmount > financialStats.totalRevenue * 0.1) {
      csv += `توصية,متابعة المدفوعات المتأخرة - ${formatCurrency(financialStats.overdueAmount)} مبلغ متأخر\n`
    }

    return csv
  }

  /**
   * ترجمة حالة الموعد إلى العربية
   */
  private static getStatusInArabic(status: string): string {
    const statusMap: { [key: string]: string } = {
      'scheduled': 'مجدول',
      'completed': 'مكتمل',
      'cancelled': 'ملغي',
      'no-show': 'لم يحضر',
      'confirmed': 'مؤكد',
      'pending': 'آجل'
    }
    return statusMap[status] || status
  }

  /**
   * ترجمة طريقة الدفع إلى العربية
   */
  private static getPaymentMethodInArabic(method: string): string {
    const methodMap: { [key: string]: string } = {
      'cash': 'نقدي',
      'bank_transfer': 'تحويل بنكي',
      'credit_card': 'بطاقة ائتمان',
      'debit_card': 'بطاقة خصم'
    }
    return methodMap[method] || method
  }



  /**
   * تحديد حالة المخزون بالعربية
   */
  private static getInventoryStatusInArabic(quantity: number, minStock: number): string {
    if (quantity === 0) return 'نفد من المخزون'
    if (quantity <= minStock) return 'منخفض المخزون'
    return 'متوفر'
  }

  /**
   * حساب متوسط المدفوعات اليومية
   */
  private static calculateDailyAverage(payments: Payment[], totalRevenue: number): string {
    if (payments.length === 0) return '0'

    // حساب عدد الأيام الفريدة
    const uniqueDays = new Set(
      payments.map(p => p.payment_date.split('T')[0])
    ).size

    if (uniqueDays === 0) return '0'

    const dailyAverage = totalRevenue / uniqueDays
    return formatCurrency(dailyAverage)
  }

  /**
   * حساب العمر من تاريخ الميلاد
   */
  private static calculateAge(dateOfBirth: string): string {
    try {
      const birthDate = new Date(dateOfBirth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }

      return age.toString()
    } catch (error) {
      return 'غير محدد'
    }
  }

  /**
   * حساب متوسط عمر المرضى
   */
  private static calculateAverageAge(patients: Patient[]): string {
    if (patients.length === 0) return '0'

    const totalAge = patients.reduce((sum, patient) => {
      const age = typeof patient.age === 'number' ? patient.age : 0
      return sum + age
    }, 0)

    const averageAge = totalAge / patients.length
    return Math.round(averageAge).toString()
  }

  /**
   * حساب توزيع الجنس
   */
  private static getGenderDistribution(patients: Patient[]): string {
    if (patients.length === 0) return 'لا يوجد بيانات'

    const maleCount = patients.filter(p => p.gender === 'male').length
    const femaleCount = patients.filter(p => p.gender === 'female').length
    const malePercentage = Math.round((maleCount / patients.length) * 100)
    const femalePercentage = Math.round((femaleCount / patients.length) * 100)

    return `ذكور: ${maleCount} (${malePercentage}%) - إناث: ${femaleCount} (${femalePercentage}%)`
  }

  /**
   * حساب المرضى الجدد هذا الشهر
   */
  private static getNewPatientsThisMonth(patients: Patient[]): number {
    const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    return patients.filter(p =>
      p.created_at.startsWith(thisMonth)
    ).length
  }

  /**
   * حساب المرضى النشطون (لديهم مواعيد في آخر 3 أشهر)
   */
  private static getActivePatients(patients: Patient[], appointments: Appointment[]): number {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const activePatientIds = new Set(
      appointments
        .filter(a => new Date(a.start_time) >= threeMonthsAgo)
        .map(a => a.patient_id)
    )

    return activePatientIds.size
  }

  /**
   * تحليل أنواع العلاج
   */
  private static analyzeTreatmentTypes(appointments: Appointment[]) {
    const treatmentStats: { [key: string]: { count: number, totalValue: number } } = {}

    appointments.forEach(apt => {
      // استخدام title أو treatment_type مع الترجمة للعربية
      const treatmentType = apt.title || apt.treatment_type || 'غير محدد'
      const treatment = this.getTreatmentNameInArabic(treatmentType)
      if (!treatmentStats[treatment]) {
        treatmentStats[treatment] = { count: 0, totalValue: 0 }
      }
      treatmentStats[treatment].count++
      treatmentStats[treatment].totalValue += apt.cost || 0
    })

    const sortedByCount = Object.entries(treatmentStats)
      .sort((a, b) => b[1].count - a[1].count)

    const sortedByValue = Object.entries(treatmentStats)
      .sort((a, b) => b[1].totalValue - a[1].totalValue)

    return {
      mostCommon: sortedByCount.length > 0 ? `${sortedByCount[0][0]} (${sortedByCount[0][1].count} مرة)` : 'لا يوجد',
      highestValue: sortedByValue.length > 0 ? `${sortedByValue[0][0]} (${formatCurrency(sortedByValue[0][1].totalValue)})` : 'لا يوجد'
    }
  }

  /**
   * تحليل أوقات المواعيد
   */
  private static analyzeAppointmentTimes(appointments: Appointment[]) {
    const hourStats: { [key: string]: number } = {}
    const dayStats: { [key: string]: number } = {}

    appointments.forEach(apt => {
      const date = new Date(apt.start_time)
      const hour = date.getHours()
      const day = date.toLocaleDateString('ar-SA', { weekday: 'long' })

      hourStats[hour] = (hourStats[hour] || 0) + 1
      dayStats[day] = (dayStats[day] || 0) + 1
    })

    const peakHour = Object.entries(hourStats)
      .sort((a, b) => b[1] - a[1])[0]

    const peakDay = Object.entries(dayStats)
      .sort((a, b) => b[1] - a[1])[0]

    return {
      peakHour: peakHour ? `${peakHour[0]}:00 (${peakHour[1]} موعد)` : 'لا يوجد',
      peakDay: peakDay ? `${peakDay[0]} (${peakDay[1]} موعد)` : 'لا يوجد'
    }
  }

  /**
   * تحليل المرضى
   */
  private static analyzePatients(patients: Patient[], appointments: Appointment[], payments: Payment[]) {
    const patientStats: { [key: string]: { name: string, appointmentCount: number, totalPayments: number } } = {}

    // حساب إحصائيات كل مريض
    patients.forEach(patient => {
      const patientAppointments = appointments.filter(apt => apt.patient_id === patient.id)
      const patientPayments = payments.filter(pay => pay.patient_id === patient.id)

      const totalPayments = patientPayments.reduce((sum, payment) => {
        const amount = payment.status === 'partial' && payment.amount_paid !== undefined
          ? Number(payment.amount_paid)
          : Number(payment.amount)
        return sum + amount
      }, 0)

      patientStats[patient.id] = {
        name: patient.full_name || patient.name || 'غير محدد',
        appointmentCount: patientAppointments.length,
        totalPayments
      }
    })

    const sortedByAppointments = Object.values(patientStats)
      .sort((a, b) => b.appointmentCount - a.appointmentCount)

    const sortedByPayments = Object.values(patientStats)
      .sort((a, b) => b.totalPayments - a.totalPayments)

    return {
      mostFrequent: sortedByAppointments.length > 0
        ? `${sortedByAppointments[0].name} (${sortedByAppointments[0].appointmentCount} موعد)`
        : 'لا يوجد',
      highestSpender: sortedByPayments.length > 0
        ? `${sortedByPayments[0].name} (${formatCurrency(sortedByPayments[0].totalPayments)})`
        : 'لا يوجد'
    }
  }

  /**
   * تصدير التقرير الشامل المحسن لجميع جوانب التطبيق
   */
  static async exportComprehensiveReport(data: {
    patients: Patient[]
    appointments: Appointment[]
    payments: Payment[]
    inventory: InventoryItem[]
    treatments?: ToothTreatment[]
    prescriptions?: Prescription[]
    labOrders?: LabOrder[]
    clinicNeeds?: ClinicNeed[]
    expenses?: any[] // مصروفات العيادة المباشرة
    timePeriod: TimePeriod
    customStartDate?: string
    customEndDate?: string
  }): Promise<void> {
    try {
      // حساب نطاق التواريخ للفترة المحددة
      const dateRange = getDateRangeForPeriod(data.timePeriod, data.customStartDate, data.customEndDate)

      // فلترة جميع البيانات حسب الفترة الزمنية
      const filteredData = this.filterAllDataByDateRange(data, dateRange)

      // إضافة المصروفات إلى البيانات المفلترة
      if (data.expenses) {
        (filteredData as any).expenses = data.expenses.filter(expense => {
          if (!expense.payment_date) return false
          const expenseDate = new Date(expense.payment_date)
          return expenseDate >= dateRange.startDate && expenseDate <= dateRange.endDate
        })
      }

      // التحقق من صحة البيانات قبل التصدير
      const isValid = validateBeforeExport({
        payments: filteredData.payments,
        appointments: filteredData.appointments,
        inventory: filteredData.inventory,
        filterInfo: {
          appointmentFilter: TIME_PERIODS[data.timePeriod],
          paymentFilter: TIME_PERIODS[data.timePeriod],
          inventoryFilter: TIME_PERIODS[data.timePeriod]
        }
      })

      if (!isValid) {
        throw new Error('فشل في التحقق من صحة البيانات')
      }

      // حساب الإحصائيات الشاملة لجميع جوانب التطبيق
      const comprehensiveStats = this.calculateAllAspectsStats(filteredData, dateRange)

      const csvContent = this.generateEnhancedComprehensiveCSV({
        patients: data.patients,
        appointments: filteredData.appointments,
        payments: filteredData.payments,
        inventory: filteredData.inventory,
        treatments: filteredData.treatments,
        prescriptions: filteredData.prescriptions,
        labOrders: filteredData.labOrders,
        clinicNeeds: filteredData.clinicNeeds,
        timePeriod: data.timePeriod,
        stats: comprehensiveStats
      })

      // تصدير إلى Excel مع صفحات متعددة مثل تقرير الربح والخسارة
      await this.exportComprehensiveReportToExcel({
        patients: data.patients,
        appointments: filteredData.appointments,
        payments: filteredData.payments,
        inventory: filteredData.inventory,
        treatments: filteredData.treatments,
        prescriptions: filteredData.prescriptions,
        labOrders: filteredData.labOrders,
        clinicNeeds: filteredData.clinicNeeds,
        expenses: (filteredData as any).expenses || [],
        timePeriod: data.timePeriod,
        stats: comprehensiveStats,
        dateRange: dateRange
      })

    } catch (error) {
      console.error('Error exporting comprehensive report:', error)
      throw new Error('فشل في تصدير التقرير الشامل')
    }
  }

  /**
   * حساب الإحصائيات الشاملة مع الأرباح والخسائر
   */
  private static calculateComprehensiveStats(data: {
    patients: Patient[]
    filteredAppointments: Appointment[]
    filteredPayments: Payment[]
    filteredInventory: InventoryItem[]
    labOrders?: any[]
    clinicNeeds?: any[]
  }) {
    const financialStats = this.calculateFinancialStats(
      data.filteredPayments,
      data.labOrders,
      data.clinicNeeds,
      data.filteredInventory,
      (data as any).expenses // إضافة المصروفات إذا كانت متوفرة
    )

    return {
      totalPatients: data.patients.length,
      totalAppointments: data.filteredAppointments.length,
      totalPayments: data.filteredPayments.length,
      totalInventoryItems: data.filteredInventory.length,
      totalLabOrders: data.labOrders?.length || 0,
      totalClinicNeeds: data.clinicNeeds?.length || 0,
      ...financialStats,
      appointmentsByStatus: this.groupByStatus(data.filteredAppointments, 'status'),
      paymentsByMethod: this.groupByMethod(data.filteredPayments),
      inventoryByCategory: this.groupByCategory(data.filteredInventory)
    }
  }



  /**
   * توليد CSV شامل محسن لجميع جوانب التطبيق
   */
  private static generateEnhancedComprehensiveCSV(data: {
    patients: Patient[]
    appointments: Appointment[]
    payments: Payment[]
    inventory: InventoryItem[]
    treatments: ToothTreatment[]
    prescriptions: Prescription[]
    labOrders: LabOrder[]
    clinicNeeds: ClinicNeed[]
    timePeriod: TimePeriod
    stats: any
  }): string {
    let csv = '\uFEFF' // BOM for Arabic support

    // عنوان التقرير
    csv += 'التقرير الشامل المفصل للعيادة - جميع الجوانب\n'
    csv += `تاريخ التقرير,${this.formatGregorianDate(new Date())}\n`
    csv += `وقت التقرير,${new Date().toLocaleTimeString('ar-SA')}\n`
    csv += `الفترة الزمنية,${TIME_PERIODS[data.timePeriod]}\n`
    if (data.stats.dateRange) {
      csv += `نطاق التواريخ,${data.stats.dateRange.period}\n`
    }
    csv += '\n'

    // ملخص عام شامل
    csv += '=== ملخص عام شامل ===\n'
    csv += `إجمالي المرضى,${data.stats.totalPatients}\n`
    csv += `إجمالي المواعيد (مفلترة),${data.stats.totalAppointments}\n`
    csv += `إجمالي المدفوعات (مفلترة),${data.stats.totalPayments}\n`
    csv += `إجمالي العلاجات (مفلترة),${data.stats.totalTreatments}\n`
    csv += `إجمالي الوصفات (مفلترة),${data.stats.totalPrescriptions}\n`
    csv += `إجمالي طلبات المخابر (مفلترة),${data.stats.totalLabOrders}\n`
    csv += `إجمالي احتياجات العيادة (مفلترة),${data.stats.totalClinicNeeds}\n`
    csv += `إجمالي عناصر المخزون,${data.stats.totalInventoryItems}\n\n`

    // === تحليل الأرباح والخسائر الشامل ===
    csv += 'تحليل الأرباح والخسائر الشامل\n'
    csv += '=================================\n\n'

    // الإيرادات
    csv += 'الإيرادات\n'
    csv += `المدفوعات المكتملة,${formatCurrency(data.stats.completedPayments || 0)}\n`
    csv += `المدفوعات الجزئية,${formatCurrency(data.stats.partialPayments || 0)}\n`
    csv += `إجمالي الإيرادات,${formatCurrency(data.stats.totalRevenue || 0)}\n`
    csv += `المبالغ المتبقية من المدفوعات الجزئية,${formatCurrency(data.stats.remainingBalances || 0)}\n`
    csv += `المدفوعات الآجلة,${formatCurrency(data.stats.pendingAmount || 0)}\n\n`

    // المصروفات
    csv += 'المصروفات\n'
    csv += `إجمالي المدفوعات للمخابر,${formatCurrency(data.stats.labOrdersTotal || 0)}\n`
    csv += `إجمالي المتبقي للمخابر,${formatCurrency(data.stats.labOrdersRemaining || 0)}\n`
    csv += `إجمالي المدفوعات للاحتياجات والمخزون,${formatCurrency(data.stats.clinicNeedsTotal || 0)}\n`
    csv += `إجمالي المتبقي للاحتياجات,${formatCurrency(data.stats.clinicNeedsRemaining || 0)}\n`
    csv += `قيمة المخزون الحالي,${formatCurrency(data.stats.inventoryExpenses || 0)}\n`
    csv += `مصروفات العيادة المباشرة,${formatCurrency(data.stats.clinicExpensesTotal || 0)}\n`
    csv += `إجمالي المصروفات,${formatCurrency(data.stats.totalExpenses || 0)}\n\n`

    // النتيجة النهائية
    csv += 'النتيجة النهائية\n'
    if (data.stats.isProfit) {
      csv += `صافي الربح,${formatCurrency(data.stats.netProfit || 0)}\n`
      csv += `نسبة الربح,${(data.stats.profitMargin || 0).toFixed(2)}%\n`
      csv += `الحالة,ربح\n`
    } else {
      csv += `إجمالي الخسارة,${formatCurrency(data.stats.lossAmount || 0)}\n`
      csv += `نسبة الخسارة,${Math.abs(data.stats.profitMargin || 0).toFixed(2)}%\n`
      csv += `الحالة,خسارة\n`
    }
    csv += '\n'

    // === تحليل المواعيد التفصيلي ===
    csv += 'تحليل المواعيد التفصيلي\n'
    csv += '========================\n'
    csv += `إجمالي المواعيد,${data.stats.total || 0}\n`
    csv += `المواعيد المكتملة,${data.stats.completed || 0}\n`
    csv += `المواعيد الملغية,${data.stats.cancelled || 0}\n`
    csv += `المواعيد المجدولة,${data.stats.scheduled || 0}\n`
    csv += `المواعيد الغائبة,${data.stats.noShow || 0}\n`
    csv += `معدل الحضور,${data.stats.attendanceRate || 0}%\n`
    if (data.stats.peakHour) {
      csv += `أكثر الأوقات ازدحاماً,${data.stats.peakHour}\n`
    }
    csv += `متوسط المواعيد يومياً,${data.stats.averagePerDay || 0}\n\n`

    // === تحليل العلاجات التفصيلي ===
    csv += 'تحليل العلاجات التفصيلي\n'
    csv += '========================\n'
    csv += `إجمالي العلاجات,${data.stats.totalTreatments || 0}\n`
    csv += `العلاجات المكتملة,${data.stats.completedTreatments || 0}\n`
    csv += `العلاجات المخططة,${data.stats.plannedTreatments || 0}\n`
    csv += `العلاجات قيد التنفيذ,${data.stats.inProgressTreatments || 0}\n`
    csv += `العلاجات الملغية,${data.stats.cancelledTreatments || 0}\n`
    csv += `معدل إنجاز العلاجات,${data.stats.completionRate || 0}%\n`
    if (data.stats.mostTreatedTooth) {
      csv += `أكثر الأسنان علاجاً,السن رقم ${data.stats.mostTreatedTooth.tooth} (${data.stats.mostTreatedTooth.count} علاج)\n`
    }
    csv += '\n'

    // توزيع أنواع العلاجات
    csv += 'توزيع أنواع العلاجات\n'
    if (data.stats.treatmentTypes && typeof data.stats.treatmentTypes === 'object') {
      Object.entries(data.stats.treatmentTypes).forEach(([type, count]) => {
        const typeArabic = this.getTreatmentNameInArabic(type)
        csv += `${typeArabic},${count}\n`
      })
    } else {
      csv += 'لا توجد بيانات متاحة\n'
    }
    csv += '\n'

    // توزيع الأسنان المعالجة
    csv += 'توزيع الأسنان المعالجة\n'
    if (data.stats.teethTreated && typeof data.stats.teethTreated === 'object') {
      Object.entries(data.stats.teethTreated).forEach(([tooth, count]) => {
        csv += `السن رقم ${tooth},${count} علاج\n`
      })
    } else {
      csv += 'لا توجد بيانات متاحة\n'
    }
    csv += '\n'

    // تفاصيل العلاجات الفردية (إذا كان العدد معقول)
    if (data.treatments && data.treatments.length > 0 && data.treatments.length <= 100) {
      csv += 'تفاصيل العلاجات الفردية\n'
      csv += 'المريض,رقم السن,نوع العلاج,الفئة,الحالة,تاريخ البداية,تاريخ الإكمال,التكلفة,ملاحظات\n'
      data.treatments.forEach(treatment => {
        // البحث عن اسم المريض من قائمة المرضى
        const patient = data.patients.find(p => p.id === treatment.patient_id)
        const patientName = patient ? (patient.full_name || patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim()) : 'غير محدد'

        const startDate = treatment.start_date ? formatDate(treatment.start_date) : 'غير محدد'
        const completionDate = treatment.completion_date ? formatDate(treatment.completion_date) : 'غير محدد'
        const cost = treatment.cost ? formatCurrency(treatment.cost) : 'غير محدد'
        const notes = (treatment.notes || '').replace(/,/g, '؛') // استبدال الفواصل لتجنب مشاكل CSV

        // استخدام دوال الترجمة للعربية
        const treatmentTypeArabic = this.getTreatmentNameInArabic(treatment.treatment_type || 'غير محدد')
        const categoryArabic = this.getCategoryNameInArabic(treatment.treatment_category || 'غير محدد')
        const statusArabic = this.getStatusLabelInArabic(treatment.treatment_status || 'غير محدد')

        csv += `"${patientName}",${treatment.tooth_number || 'غير محدد'},"${treatmentTypeArabic}","${categoryArabic}","${statusArabic}",${startDate},${completionDate},${cost},"${notes}"\n`
      })
      csv += '\n'
    }

    // === تحليل الوصفات ===
    csv += 'تحليل الوصفات\n'
    csv += '===============\n'
    csv += `إجمالي الوصفات,${data.stats.totalPrescriptions || 0}\n`
    csv += `المرضى الذين لديهم وصفات,${data.stats.patientsWithPrescriptions || 0}\n`
    csv += `متوسط الوصفات لكل مريض,${data.stats.averagePrescriptionsPerPatient || 0}\n\n`

    // تفاصيل الوصفات الفردية (إذا كان العدد معقول)
    if (data.prescriptions && data.prescriptions.length > 0 && data.prescriptions.length <= 50) {
      csv += 'تفاصيل الوصفات الفردية\n'
      csv += 'تاريخ الوصفة,المريض,الموعد,ملاحظات\n'
      data.prescriptions.forEach(prescription => {
        const prescriptionDate = prescription.prescription_date ? formatDate(prescription.prescription_date) : 'غير محدد'

        // استخدام البيانات المجلبة من قاعدة البيانات أولاً، ثم البحث في القوائم كبديل
        let patientName = (prescription as any).patient_name || 'غير محدد'
        let appointmentInfo = (prescription as any).appointment_title || 'غير محدد'

        // إذا لم تكن البيانات متوفرة، ابحث في القوائم
        if (patientName === 'غير محدد') {
          const patient = data.patients.find(p => p.id === prescription.patient_id)
          patientName = patient ? (patient.full_name || patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim()) : 'غير محدد'
        }

        if (appointmentInfo === 'غير محدد') {
          const appointment = data.appointments.find(a => a.id === prescription.appointment_id)
          appointmentInfo = appointment ? (appointment.title || appointment.description || 'موعد طبي') : 'غير محدد'
        }

        const notes = (prescription.notes || '').replace(/,/g, '؛')

        csv += `${prescriptionDate},"${patientName}","${appointmentInfo}","${notes}"\n`
      })
      csv += '\n'
    }

    // === تحليل طلبات المخابر ===
    csv += 'تحليل طلبات المخابر\n'
    csv += '==================\n'
    csv += `إجمالي طلبات المخابر,${data.stats.totalLabOrders || 0}\n`
    csv += `الطلبات الآجلة,${data.stats.pendingLabOrders || 0}\n`
    csv += `الطلبات المكتملة,${data.stats.completedLabOrders || 0}\n`
    csv += `الطلبات الملغية,${data.stats.cancelledLabOrders || 0}\n`
    csv += `معدل إنجاز طلبات المخابر,${data.stats.labOrdersCompletionRate || 0}%\n`
    csv += `إجمالي تكلفة المخابر,${formatCurrency(data.stats.totalLabCost || 0)}\n`
    csv += `إجمالي المدفوع للمخابر,${formatCurrency(data.stats.totalLabPaid || 0)}\n`
    csv += `إجمالي المتبقي للمخابر,${formatCurrency(data.stats.totalLabRemaining || 0)}\n`
    if (data.stats.mostUsedLab) {
      csv += `أكثر المخابر استخداماً,${data.stats.mostUsedLab.lab} (${data.stats.mostUsedLab.count} طلب)\n`
    }
    csv += '\n'

    // توزيع المخابر المستخدمة
    csv += 'توزيع المخابر المستخدمة\n'
    if (data.stats.labFrequency && typeof data.stats.labFrequency === 'object') {
      Object.entries(data.stats.labFrequency).forEach(([lab, count]) => {
        csv += `${lab},${count} طلب\n`
      })
    } else {
      csv += 'لا توجد بيانات متاحة\n'
    }
    csv += '\n'

    // تفاصيل طلبات المخابر الفردية (إذا كان العدد معقول)
    if (data.labOrders && data.labOrders.length > 0 && data.labOrders.length <= 50) {
      csv += 'تفاصيل طلبات المخابر الفردية\n'
      csv += 'تاريخ الطلب,المختبر,المريض,الحالة,التكلفة,المدفوع,المتبقي,ملاحظات\n'
      data.labOrders.forEach(order => {
        const orderDate = order.order_date ? formatDate(order.order_date) : 'غير محدد'
        const labName = order.lab_name || order.laboratory || 'غير محدد'

        // البحث عن اسم المريض من قائمة المرضى
        const patient = data.patients.find(p => p.id === order.patient_id)
        const patientName = patient ? (patient.full_name || patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim()) : 'غير محدد'

        const status = order.status || 'غير محدد'
        const cost = order.cost ? formatCurrency(order.cost) : 'غير محدد'
        const paid = order.paid_amount ? formatCurrency(order.paid_amount) : 'غير محدد'
        const remaining = order.remaining_balance ? formatCurrency(order.remaining_balance) : 'غير محدد'
        const notes = (order.notes || '').replace(/,/g, '؛')

        csv += `${orderDate},"${labName}","${patientName}",${status},${cost},${paid},${remaining},"${notes}"\n`
      })
      csv += '\n'
    }

    // === تحليل احتياجات العيادة ===
    csv += 'تحليل احتياجات العيادة\n'
    csv += '=====================\n'
    csv += `إجمالي الاحتياجات,${data.stats.totalClinicNeeds || 0}\n`
    csv += `الاحتياجات الآجلة,${data.stats.pendingNeeds || 0}\n`
    csv += `الاحتياجات المطلوبة,${data.stats.orderedNeeds || 0}\n`
    csv += `الاحتياجات المستلمة,${data.stats.receivedNeeds || 0}\n`
    csv += `الاحتياجات الملغية,${data.stats.cancelledNeeds || 0}\n`
    csv += `معدل إنجاز الاحتياجات,${data.stats.needsCompletionRate || 0}%\n`
    csv += `إجمالي قيمة الاحتياجات,${formatCurrency(data.stats.totalNeedsValue || 0)}\n`
    csv += `الاحتياجات العاجلة,${data.stats.urgentNeeds || 0}\n`
    csv += `الاحتياجات عالية الأولوية,${data.stats.highPriorityNeeds || 0}\n\n`

    // توزيع الأولويات
    csv += 'توزيع الأولويات\n'
    if (data.stats.priorityAnalysis && typeof data.stats.priorityAnalysis === 'object') {
      Object.entries(data.stats.priorityAnalysis).forEach(([priority, count]) => {
        const priorityText = priority === 'urgent' ? 'عاجل' :
                           priority === 'high' ? 'عالي' :
                           priority === 'medium' ? 'متوسط' :
                           priority === 'low' ? 'منخفض' : priority
        csv += `${priorityText},${count}\n`
      })
    } else {
      csv += 'لا توجد بيانات متاحة\n'
    }
    csv += '\n'

    // توزيع الفئات
    csv += 'توزيع فئات الاحتياجات\n'
    if (data.stats.categoryAnalysis && typeof data.stats.categoryAnalysis === 'object') {
      Object.entries(data.stats.categoryAnalysis).forEach(([category, count]) => {
        csv += `${category},${count}\n`
      })
    } else {
      csv += 'لا توجد بيانات متاحة\n'
    }
    csv += '\n'

    // تفاصيل احتياجات العيادة الفردية (إذا كان العدد معقول)
    if (data.clinicNeeds && data.clinicNeeds.length > 0 && data.clinicNeeds.length <= 50) {
      csv += 'تفاصيل احتياجات العيادة الفردية\n'
      csv += 'تاريخ الطلب,اسم الصنف,الفئة,الكمية,السعر,القيمة الإجمالية,الأولوية,الحالة,ملاحظات\n'
      data.clinicNeeds.forEach(need => {
        const createdDate = need.created_at ? formatDate(need.created_at) : 'غير محدد'
        const itemName = need.item_name || 'غير محدد'
        const category = need.category || 'غير محدد'
        const quantity = need.quantity || 0
        const price = need.price ? formatCurrency(need.price) : 'غير محدد'
        const totalValue = (need.quantity || 0) * (need.price || 0)
        const totalValueFormatted = formatCurrency(totalValue)
        const priority = need.priority === 'urgent' ? 'عاجل' :
                        need.priority === 'high' ? 'عالي' :
                        need.priority === 'medium' ? 'متوسط' :
                        need.priority === 'low' ? 'منخفض' : (need.priority || 'غير محدد')
        const status = need.status === 'pending' ? 'آجل' :
                      need.status === 'ordered' ? 'مطلوب' :
                      need.status === 'received' ? 'مستلم' :
                      need.status === 'cancelled' ? 'ملغي' : (need.status || 'غير محدد')
        const notes = (need.notes || '').replace(/,/g, '؛')

        csv += `${createdDate},"${itemName}","${category}",${quantity},${price},${totalValueFormatted},"${priority}","${status}","${notes}"\n`
      })
      csv += '\n'
    }

    // توزيع المواعيد حسب الحالة
    csv += 'توزيع المواعيد حسب الحالة\n'
    if (data.stats.appointmentsByStatus && typeof data.stats.appointmentsByStatus === 'object') {
      Object.entries(data.stats.appointmentsByStatus).forEach(([status, count]) => {
        csv += `${status},${count}\n`
      })
    } else {
      csv += 'لا توجد بيانات متاحة\n'
    }
    csv += '\n'

    // توزيع المدفوعات حسب طريقة الدفع
    csv += 'توزيع المدفوعات حسب طريقة الدفع\n'
    if (data.stats.paymentsByMethod && typeof data.stats.paymentsByMethod === 'object') {
      Object.entries(data.stats.paymentsByMethod).forEach(([method, count]) => {
        csv += `${method},${count}\n`
      })
    } else {
      csv += 'لا توجد بيانات متاحة\n'
    }
    csv += '\n'

    // توزيع المخزون حسب الفئة
    csv += 'توزيع المخزون حسب الفئة\n'
    if (data.stats.inventoryByCategory && typeof data.stats.inventoryByCategory === 'object') {
      Object.entries(data.stats.inventoryByCategory).forEach(([category, count]) => {
        csv += `${category},${count}\n`
      })
    } else {
      csv += 'لا توجد بيانات متاحة\n'
    }
    csv += '\n'

    // تفاصيل المدفوعات
    if (data.payments.length > 0) {
      csv += 'تفاصيل المدفوعات المفلترة\n'
      csv += 'رقم الإيصال,المريض,المبلغ,طريقة الدفع,الحالة,تاريخ الدفع,الوصف\n'
      data.payments.forEach(payment => {
        const patientName = data.patients.find(p => p.id === payment.patient_id)?.full_name || 'غير محدد'
        csv += `"${payment.receipt_number || `#${payment.id.slice(-6)}`}","${patientName}","${formatCurrency(payment.amount)}","${payment.payment_method}","${payment.status}","${formatDate(payment.payment_date)}","${payment.description || '-'}"\n`
      })
      csv += '\n'
    }

    // تفاصيل المواعيد
    if (data.appointments.length > 0) {
      csv += 'تفاصيل المواعيد المفلترة\n'
      csv += 'المريض,العنوان,التاريخ,الوقت,الحالة,التكلفة\n'
      data.appointments.forEach(appointment => {
        const patientName = data.patients.find(p => p.id === appointment.patient_id)?.full_name || 'غير محدد'
        csv += `"${patientName}","${appointment.title || '-'}","${formatDate(appointment.start_time)}","${formatTime(appointment.start_time)}","${appointment.status}","${formatCurrency(appointment.cost || 0)}"\n`
      })
      csv += '\n'
    }

    // تفاصيل المخزون
    if (data.inventory.length > 0) {
      csv += 'تفاصيل المخزون المفلتر\n'
      csv += 'اسم المنتج,الفئة,الكمية,السعر,تاريخ الانتهاء,الحالة\n'
      data.inventory.forEach(item => {
        csv += `"${item.name}","${item.category || '-'}","${item.quantity}","${formatCurrency(item.price || 0)}","${item.expiry_date ? formatDate(item.expiry_date) : '-'}","${item.status || '-'}"\n`
      })
    }

    return csv
  }

  /**
   * دوال الترجمة للعربية
   */
  private static getTreatmentNameInArabic(treatmentType: string): string {
    return getTreatmentNameInArabic(treatmentType)
  }

  private static getCategoryNameInArabic(category: string): string {
    return getCategoryNameInArabic(category)
  }

  private static getStatusLabelInArabic(status: string): string {
    return getStatusLabelInArabic(status)
  }



  /**
   * تنسيق التاريخ بالتقويم الميلادي
   */
  private static formatGregorianDate(date: Date): string {
    if (!date || isNaN(date.getTime())) {
      return 'غير محدد'
    }

    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  }

  /**
   * تصدير التقرير الشامل إلى Excel مع صفحات متعددة
   */
  static async exportComprehensiveReportToExcel(data: {
    patients: Patient[]
    appointments: Appointment[]
    payments: Payment[]
    inventory: InventoryItem[]
    treatments: ToothTreatment[]
    prescriptions: Prescription[]
    labOrders: LabOrder[]
    clinicNeeds: ClinicNeed[]
    expenses: any[]
    timePeriod: TimePeriod
    stats: any
    dateRange: any
  }): Promise<void> {
    const workbook = new ExcelJS.Workbook()

    // إعداد خصائص الملف
    workbook.creator = 'نظام إدارة العيادة'
    workbook.created = new Date()
    workbook.modified = new Date()
    workbook.title = 'التقرير الشامل المفصل'
    workbook.description = 'تقرير شامل لجميع جوانب العيادة'

    // إنشاء الصفحات
    await this.createSummarySheet(workbook, data)
    await this.createPatientsSheet(workbook, data)
    await this.createAppointmentsSheet(workbook, data)
    await this.createPaymentsSheet(workbook, data)
    await this.createInventorySheet(workbook, data)
    await this.createLabOrdersSheet(workbook, data)
    await this.createClinicNeedsSheet(workbook, data)
    await this.createExpensesSheet(workbook, data)
    await this.createProfitLossSheet(workbook, data)

    // حفظ الملف
    const fileName = `التقرير_الشامل_المفصل_${TIME_PERIODS[data.timePeriod]}_${new Date().toISOString().split('T')[0]}`

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${fileName}.xlsx`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    console.log('✅ تم تصدير التقرير الشامل المفصل بنجاح')
  }

  /**
   * إنشاء صفحة الملخص العام
   */
  private static async createSummarySheet(workbook: any, data: any): Promise<void> {
    try {
      console.log('Creating summary sheet with data:', data)

      const worksheet = workbook.addWorksheet('الملخص العام')

      // تنسيق العنوان الرئيسي
      worksheet.mergeCells('A1:H1')
      const headerCell = worksheet.getCell('A1')
      headerCell.value = 'التقرير الشامل المفصل - عيادة الأسنان'
      headerCell.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } }
      headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E8B57' } }
      headerCell.alignment = { horizontal: 'center', vertical: 'middle' }
      headerCell.border = {
        top: { style: 'thick' }, left: { style: 'thick' },
        bottom: { style: 'thick' }, right: { style: 'thick' }
      }

      // معلومات التقرير
      worksheet.getCell('A3').value = `تاريخ التقرير: ${formatDate(new Date())}`
      worksheet.getCell('A3').font = { size: 12, italic: true }

      const timePeriodText = data.timePeriod && TIME_PERIODS[data.timePeriod as keyof typeof TIME_PERIODS]
        ? TIME_PERIODS[data.timePeriod as keyof typeof TIME_PERIODS]
        : data.timePeriod || 'غير محدد'
      worksheet.getCell('A4').value = `الفترة الزمنية: ${timePeriodText}`
      worksheet.getCell('A4').font = { size: 12, italic: true }

      let currentRow = 6

      // التحقق من وجود البيانات وإضافة قيم افتراضية
      const patients = Array.isArray(data.patients) ? data.patients : []
      const appointments = Array.isArray(data.appointments) ? data.appointments : []
      const payments = Array.isArray(data.payments) ? data.payments : []
      const inventory = Array.isArray(data.inventory) ? data.inventory : []
      const labOrders = Array.isArray(data.labOrders) ? data.labOrders : []
      const clinicNeeds = Array.isArray(data.clinicNeeds) ? data.clinicNeeds : []
      const expenses = Array.isArray(data.expenses) ? data.expenses : []

      console.log('Data arrays lengths:', {
        patients: patients.length,
        appointments: appointments.length,
        payments: payments.length,
        inventory: inventory.length,
        labOrders: labOrders.length,
        clinicNeeds: clinicNeeds.length,
        expenses: expenses.length
      })

      // الإحصائيات الأساسية
      const summaryData = [
        ['إجمالي المرضى', patients.length],
        ['إجمالي المواعيد', appointments.length],
        ['إجمالي المدفوعات', payments.length],
        ['إجمالي عناصر المخزون', inventory.length],
        ['إجمالي طلبات المختبرات', labOrders.length],
        ['إجمالي احتياجات العيادة', clinicNeeds.length],
        ['إجمالي مصروفات العيادة', expenses.length]
      ]

      // إضافة عنوان القسم
      worksheet.getCell(`A${currentRow}`).value = 'الإحصائيات الأساسية'
      worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true, color: { argb: 'FF2E8B57' } }
      currentRow += 2

      // إضافة البيانات
      if (Array.isArray(summaryData)) {
        summaryData.forEach(([label, value]) => {
          worksheet.getCell(`A${currentRow}`).value = label
          worksheet.getCell(`B${currentRow}`).value = value
          worksheet.getCell(`A${currentRow}`).font = { bold: true }

          // تنسيق الخلايا
          const columns = ['A', 'B']
          columns.forEach((col: string) => {
            const cell = worksheet.getCell(`${col}${currentRow}`)
            cell.border = {
              top: { style: 'thin' }, left: { style: 'thin' },
              bottom: { style: 'thin' }, right: { style: 'thin' }
            }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } }
            cell.alignment = { horizontal: 'right', vertical: 'middle' }
          })
          currentRow++
        })
      }

      // الإحصائيات المالية
      currentRow += 2
      worksheet.getCell(`A${currentRow}`).value = 'الإحصائيات المالية'
      worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true, color: { argb: 'FF2E8B57' } }
      currentRow += 2

      const financialStats = data.stats || {}
      const financialData = [
        ['إجمالي الإيرادات', formatCurrency(financialStats.totalRevenue || 0)],
        ['المدفوعات المكتملة', formatCurrency(financialStats.completedPayments || 0)],
        ['المدفوعات الجزئية', formatCurrency(financialStats.partialPayments || 0)],
        ['المبالغ الآجلة', formatCurrency(financialStats.pendingAmount || 0)],
        ['إجمالي المصروفات', formatCurrency(financialStats.totalExpenses || 0)],
        ['صافي الربح/الخسارة', formatCurrency(financialStats.netProfit || 0)]
      ]

      if (Array.isArray(financialData)) {
        financialData.forEach(([label, value]) => {
          worksheet.getCell(`A${currentRow}`).value = label
          worksheet.getCell(`B${currentRow}`).value = value
          worksheet.getCell(`A${currentRow}`).font = { bold: true }

          // تنسيق الخلايا
          const columns = ['A', 'B']
          columns.forEach((col: string) => {
            const cell = worksheet.getCell(`${col}${currentRow}`)
            cell.border = {
              top: { style: 'thin' }, left: { style: 'thin' },
              bottom: { style: 'thin' }, right: { style: 'thin' }
            }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }
            cell.alignment = { horizontal: 'right', vertical: 'middle' }
          })
          currentRow++
        })
      }

      // تنسيق عرض الأعمدة
      worksheet.getColumn('A').width = 30
      worksheet.getColumn('B').width = 20

      console.log('Summary sheet created successfully')
    } catch (error) {
      console.error('Error creating summary sheet:', error)
      throw error
    }
  }

  /**
   * إنشاء صفحة المرضى
   */
  private static async createPatientsSheet(workbook: any, data: any): Promise<void> {
    const worksheet = workbook.addWorksheet('المرضى')

    // العنوان
    worksheet.mergeCells('A1:G1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = 'تقرير المرضى'
    headerCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' }

    let currentRow = 3

    // التحقق من وجود البيانات
    const patients = data.patients || []

    // إحصائيات المرضى
    const patientStats = [
      ['إجمالي المرضى', patients.length],
      ['المرضى الذكور', patients.filter((p: any) => p.gender === 'male').length],
      ['المرضى الإناث', patients.filter((p: any) => p.gender === 'female').length],
      ['متوسط العمر', patients.length > 0 ? Math.round(patients.reduce((sum: number, p: any) => sum + (p.age || 0), 0) / patients.length) : 0]
    ]

    worksheet.getCell(`A${currentRow}`).value = 'إحصائيات المرضى'
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true }
    currentRow += 2

    patientStats.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label
      worksheet.getCell(`B${currentRow}`).value = value
      currentRow++
    })

    currentRow += 2

    // جدول تفاصيل المرضى
    worksheet.getCell(`A${currentRow}`).value = 'تفاصيل المرضى'
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true }
    currentRow += 2

    // رؤوس الجدول
    const headers = ['الرقم التسلسلي', 'الاسم الكامل', 'الجنس', 'العمر', 'الهاتف', 'البريد الإلكتروني', 'تاريخ التسجيل']
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'medium' }, left: { style: 'medium' },
        bottom: { style: 'medium' }, right: { style: 'medium' }
      }
    })
    currentRow++

    // بيانات المرضى
    patients.forEach((patient: any, index: number) => {
      const rowData = [
        patient.serial_number || '',
        patient.full_name || '',
        patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : 'غير محدد',
        patient.age || '',
        patient.phone || '',
        patient.email || '',
        patient.created_at ? formatDate(patient.created_at) : ''
      ]

      rowData.forEach((value, colIndex) => {
        const cell = worksheet.getCell(currentRow, colIndex + 1)
        cell.value = value
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        }
        cell.alignment = { horizontal: 'right', vertical: 'middle' }

        if (index % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } }
        }
      })
      currentRow++
    })

    // تنسيق عرض الأعمدة
    worksheet.columns.forEach((column: any) => {
      column.width = 15
    })
  }

  /**
   * إنشاء صفحة المواعيد
   */
  private static async createAppointmentsSheet(workbook: any, data: any): Promise<void> {
    const worksheet = workbook.addWorksheet('المواعيد')

    // العنوان
    worksheet.mergeCells('A1:H1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = 'تقرير المواعيد'
    headerCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } }
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' }

    let currentRow = 3

    // التحقق من وجود البيانات
    const appointments = Array.isArray(data.appointments) ? data.appointments : []

    // إحصائيات المواعيد
    const appointmentStats = [
      ['إجمالي المواعيد', appointments.length],
      ['المواعيد المكتملة', appointments.filter((a: any) => a.status === 'completed').length],
      ['المواعيد الملغية', appointments.filter((a: any) => a.status === 'cancelled').length],
      ['المواعيد المجدولة', appointments.filter((a: any) => a.status === 'scheduled').length]
    ]

    worksheet.getCell(`A${currentRow}`).value = 'إحصائيات المواعيد'
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true }
    currentRow += 2

    appointmentStats.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label
      worksheet.getCell(`B${currentRow}`).value = value
      currentRow++
    })

    currentRow += 2

    // جدول تفاصيل المواعيد
    worksheet.getCell(`A${currentRow}`).value = 'تفاصيل المواعيد'
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true }
    currentRow += 2

    // رؤوس الجدول
    const headers = ['التاريخ', 'الوقت', 'اسم المريض', 'نوع العلاج', 'التكلفة', 'الحالة', 'الطبيب', 'ملاحظات']
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'medium' }, left: { style: 'medium' },
        bottom: { style: 'medium' }, right: { style: 'medium' }
      }
    })
    currentRow++

    // بيانات المواعيد
    if (Array.isArray(appointments)) {
      appointments.forEach((appointment: any, index: number) => {
        const rowData = [
          appointment.start_time ? formatDate(appointment.start_time) : '',
          appointment.start_time ? new Date(appointment.start_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '',
          appointment.patient?.full_name || 'غير محدد',
          appointment.title || 'غير محدد',
          appointment.cost ? formatCurrency(appointment.cost) : '0',
          this.getStatusInArabic(appointment.status),
          appointment.doctor_name || 'غير محدد',
          appointment.notes || ''
        ]

        rowData.forEach((value, colIndex) => {
          const cell = worksheet.getCell(currentRow, colIndex + 1)
          cell.value = value
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          }
          cell.alignment = { horizontal: 'right', vertical: 'middle' }

          if (index % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } }
          }
        })
        currentRow++
      })
    }

    // تنسيق عرض الأعمدة
    worksheet.columns.forEach((column: any) => {
      column.width = 15
    })
  }

  /**
   * إنشاء صفحة المدفوعات
   */
  private static async createPaymentsSheet(workbook: any, data: any): Promise<void> {
    const worksheet = workbook.addWorksheet('المدفوعات')

    // العنوان
    worksheet.mergeCells('A1:I1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = 'تقرير المدفوعات'
    headerCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' }

    let currentRow = 3

    // التحقق من وجود البيانات
    const payments = Array.isArray(data.payments) ? data.payments : []

    // إحصائيات المدفوعات
    const totalRevenue = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
    const completedPayments = payments.filter((p: any) => p.status === 'completed')
    const partialPayments = payments.filter((p: any) => p.status === 'partial')
    const pendingPayments = payments.filter((p: any) => p.status === 'pending')

    const paymentStats = [
      ['إجمالي المدفوعات', payments.length],
      ['إجمالي الإيرادات', formatCurrency(totalRevenue)],
      ['المدفوعات المكتملة', completedPayments.length],
      ['المدفوعات الجزئية', partialPayments.length],
      ['المدفوعات الآجلة', pendingPayments.length]
    ]

    worksheet.getCell(`A${currentRow}`).value = 'إحصائيات المدفوعات'
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true }
    currentRow += 2

    paymentStats.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label
      worksheet.getCell(`B${currentRow}`).value = value
      currentRow++
    })

    currentRow += 2

    // جدول تفاصيل المدفوعات
    worksheet.getCell(`A${currentRow}`).value = 'تفاصيل المدفوعات'
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true }
    currentRow += 2

    // رؤوس الجدول
    const headers = ['تاريخ الدفع', 'اسم المريض', 'الوصف', 'المبلغ', 'المبلغ المدفوع', 'الرصيد المتبقي', 'طريقة الدفع', 'الحالة', 'رقم الإيصال']
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'medium' }, left: { style: 'medium' },
        bottom: { style: 'medium' }, right: { style: 'medium' }
      }
    })
    currentRow++

    // بيانات المدفوعات
    if (Array.isArray(payments)) {
      payments.forEach((payment: any, index: number) => {
        // حساب المبالغ بناءً على نوع الدفعة مثل تقرير الربح والخسائر
        let totalAmount, amountPaid, remainingBalance

        if (payment.status === 'partial') {
          // للدفعات الجزئية: المبلغ الإجمالي هو total_amount_due، المدفوع هو amount، المتبقي هو الفرق
          totalAmount = Number(payment.total_amount_due || payment.amount) || 0
          amountPaid = Number(payment.amount_paid || payment.amount) || 0
          remainingBalance = Math.max(0, totalAmount - amountPaid)
        } else if (payment.appointment_id && payment.appointment_total_cost) {
          // للمدفوعات المرتبطة بمواعيد
          totalAmount = Number(payment.appointment_total_cost) || 0
          amountPaid = Number(payment.appointment_total_paid || payment.amount) || 0
          remainingBalance = Number(payment.appointment_remaining_balance || 0)
        } else {
          // للمدفوعات العادية المكتملة
          totalAmount = Number(payment.amount) || 0
          amountPaid = Number(payment.amount) || 0
          remainingBalance = 0
        }

        const rowData = [
          payment.payment_date ? formatDate(payment.payment_date) : '',
          payment.patient?.full_name || 'غير محدد',
          payment.description || 'غير محدد',
          formatCurrency(totalAmount),
          formatCurrency(amountPaid),
          formatCurrency(remainingBalance),
          payment.payment_method || 'غير محدد',
          this.getPaymentStatusInArabic(payment.status),
          payment.receipt_number || ''
        ]

        rowData.forEach((value, colIndex) => {
          const cell = worksheet.getCell(currentRow, colIndex + 1)
          cell.value = value
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          }
          cell.alignment = { horizontal: 'right', vertical: 'middle' }

          if (index % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } }
          }

          // تمييز الأعمدة المالية
          if (colIndex >= 3 && colIndex <= 5) {
            cell.font = { bold: true }
            if (!cell.fill) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }
            }
          }
        })
        currentRow++
      })
    }

    // تنسيق عرض الأعمدة
    worksheet.columns.forEach((column: any) => {
      column.width = 15
    })
  }

  /**
   * إنشاء صفحة المخزون
   */
  private static async createInventorySheet(workbook: any, data: any): Promise<void> {
    const worksheet = workbook.addWorksheet('المخزون')

    // العنوان
    worksheet.mergeCells('A1:F1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = 'تقرير المخزون'
    headerCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } }
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' }

    let currentRow = 3

    // التحقق من وجود البيانات
    const inventory = Array.isArray(data.inventory) ? data.inventory : []

    // إحصائيات المخزون
    const totalValue = inventory.reduce((sum: number, item: any) => sum + ((item.cost || 0) * (item.quantity || 0)), 0)
    const lowStockItems = inventory.filter((item: any) => (item.quantity || 0) <= 5).length

    const inventoryStats = [
      ['إجمالي العناصر', inventory.length],
      ['القيمة الإجمالية', formatCurrency(totalValue)],
      ['عناصر منخفضة المخزون', lowStockItems],
      ['عناصر نفدت من المخزون', inventory.filter((item: any) => (item.quantity || 0) === 0).length]
    ]

    worksheet.getCell(`A${currentRow}`).value = 'إحصائيات المخزون'
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true }
    currentRow += 2

    inventoryStats.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label
      worksheet.getCell(`B${currentRow}`).value = value
      currentRow++
    })

    currentRow += 2

    // جدول تفاصيل المخزون
    worksheet.getCell(`A${currentRow}`).value = 'تفاصيل المخزون'
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true }
    currentRow += 2

    // رؤوس الجدول
    const headers = ['اسم المنتج', 'الفئة', 'الكمية', 'التكلفة', 'القيمة الإجمالية', 'تاريخ الانتهاء']
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'medium' }, left: { style: 'medium' },
        bottom: { style: 'medium' }, right: { style: 'medium' }
      }
    })
    currentRow++

    // بيانات المخزون
    if (Array.isArray(inventory)) {
      inventory.forEach((item: any, index: number) => {
        const rowData = [
          item.name || '',
          item.category || '',
          item.quantity || 0,
          formatCurrency(item.cost || 0),
          formatCurrency((item.cost || 0) * (item.quantity || 0)),
          item.expiry_date ? formatDate(item.expiry_date) : ''
        ]

        rowData.forEach((value, colIndex) => {
          const cell = worksheet.getCell(currentRow, colIndex + 1)
          cell.value = value
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          }
          cell.alignment = { horizontal: 'right', vertical: 'middle' }

          if (index % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } }
          }

          // تمييز العناصر منخفضة المخزون
          if (colIndex === 2 && (item.quantity || 0) <= 5) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } }
            cell.font = { bold: true, color: { argb: 'FFDC2626' } }
          }
        })
        currentRow++
      })
    }

    // تنسيق عرض الأعمدة
    worksheet.columns.forEach((column: any) => {
      column.width = 15
    })
  }

  /**
   * إنشاء صفحة طلبات المختبرات
   */
  private static async createLabOrdersSheet(workbook: any, data: any): Promise<void> {
    const worksheet = workbook.addWorksheet('طلبات المختبرات')

    // العنوان
    worksheet.mergeCells('A1:H1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = 'تقرير طلبات المختبرات'
    headerCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14B8A6' } }
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' }

    let currentRow = 3

    // التحقق من وجود البيانات
    const labOrders = Array.isArray(data.labOrders) ? data.labOrders : []

    // إحصائيات طلبات المختبرات
    const totalCost = labOrders.reduce((sum: number, order: any) => sum + (order.cost || 0), 0)
    const totalPaid = labOrders.reduce((sum: number, order: any) => sum + (order.paid_amount || 0), 0)
    const totalRemaining = totalCost - totalPaid

    const labStats = [
      ['إجمالي الطلبات', labOrders.length],
      ['إجمالي التكلفة', formatCurrency(totalCost)],
      ['إجمالي المدفوع', formatCurrency(totalPaid)],
      ['إجمالي المتبقي', formatCurrency(totalRemaining)]
    ]

    worksheet.getCell(`A${currentRow}`).value = 'إحصائيات طلبات المختبرات'
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true }
    currentRow += 2

    labStats.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label
      worksheet.getCell(`B${currentRow}`).value = value
      currentRow++
    })

    currentRow += 2

    // جدول تفاصيل طلبات المختبرات
    worksheet.getCell(`A${currentRow}`).value = 'تفاصيل طلبات المختبرات'
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true }
    currentRow += 2

    // رؤوس الجدول
    const headers = ['تاريخ الطلب', 'المختبر', 'اسم المريض', 'الخدمة', 'التكلفة', 'المدفوع', 'المتبقي', 'الحالة']
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14B8A6' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'medium' }, left: { style: 'medium' },
        bottom: { style: 'medium' }, right: { style: 'medium' }
      }
    })
    currentRow++

    // بيانات طلبات المختبرات
    if (Array.isArray(labOrders)) {
      labOrders.forEach((order: any, index: number) => {
        const patients = Array.isArray(data.patients) ? data.patients : []
        const patient = patients.find((p: any) => p.id === order.patient_id)
        const rowData = [
          order.order_date ? formatDate(order.order_date) : '',
          order.lab?.name || 'غير محدد',
          patient?.full_name || 'غير محدد',
          order.service_name || 'غير محدد',
          formatCurrency(order.cost || 0),
          formatCurrency(order.paid_amount || 0),
          formatCurrency((order.cost || 0) - (order.paid_amount || 0)),
          order.status || 'غير محدد'
        ]

        rowData.forEach((value, colIndex) => {
          const cell = worksheet.getCell(currentRow, colIndex + 1)
          cell.value = value
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          }
          cell.alignment = { horizontal: 'right', vertical: 'middle' }

          if (index % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } }
          }

          // تمييز الأعمدة المالية
          if (colIndex >= 4 && colIndex <= 6) {
            cell.font = { bold: true }
            if (!cell.fill) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }
            }
          }
        })
        currentRow++
      })
    }

    // تنسيق عرض الأعمدة
    worksheet.columns.forEach((column: any) => {
      column.width = 15
    })
  }

  /**
   * إنشاء صفحة احتياجات العيادة
   */
  private static async createClinicNeedsSheet(workbook: any, data: any): Promise<void> {
    const worksheet = workbook.addWorksheet('احتياجات العيادة')

    // العنوان
    worksheet.mergeCells('A1:H1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = 'تقرير احتياجات العيادة'
    headerCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEC4899' } }
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' }

    let currentRow = 3

    // إحصائيات احتياجات العيادة
    const totalCost = data.clinicNeeds.reduce((sum: number, need: any) => sum + ((need.price || 0) * (need.quantity || 0)), 0)
    const urgentNeeds = data.clinicNeeds.filter((need: any) => need.priority === 'urgent').length
    const pendingNeeds = data.clinicNeeds.filter((need: any) => need.status === 'pending').length

    const needsStats = [
      ['إجمالي الاحتياجات', data.clinicNeeds.length],
      ['إجمالي التكلفة المتوقعة', formatCurrency(totalCost)],
      ['الاحتياجات العاجلة', urgentNeeds],
      ['الاحتياجات الآجلة', pendingNeeds]
    ]

    worksheet.getCell(`A${currentRow}`).value = 'إحصائيات احتياجات العيادة'
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true }
    currentRow += 2

    needsStats.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label
      worksheet.getCell(`B${currentRow}`).value = value
      currentRow++
    })

    currentRow += 2

    // جدول تفاصيل احتياجات العيادة
    worksheet.getCell(`A${currentRow}`).value = 'تفاصيل احتياجات العيادة'
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true }
    currentRow += 2

    // رؤوس الجدول
    const headers = ['تاريخ الطلب', 'اسم الصنف', 'الفئة', 'الكمية', 'السعر المتوقع', 'القيمة الإجمالية', 'الأولوية', 'الحالة']
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEC4899' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'medium' }, left: { style: 'medium' },
        bottom: { style: 'medium' }, right: { style: 'medium' }
      }
    })
    currentRow++

    // بيانات احتياجات العيادة
    data.clinicNeeds.forEach((need: any, index: number) => {
      const priorityLabels = {
        urgent: 'عاجل',
        high: 'عالي',
        medium: 'متوسط',
        low: 'منخفض'
      }

      const statusLabels = {
        pending: 'آجل',
        ordered: 'تم الطلب',
        received: 'تم الاستلام'
      }

      const rowData = [
        need.created_at ? formatDate(need.created_at) : '',
        need.name || 'غير محدد',
        need.category || 'غير محدد',
        need.quantity || 0,
        formatCurrency(need.price || 0),
        formatCurrency((need.price || 0) * (need.quantity || 0)),
        priorityLabels[need.priority as keyof typeof priorityLabels] || need.priority || 'غير محدد',
        statusLabels[need.status as keyof typeof statusLabels] || need.status || 'غير محدد'
      ]

      rowData.forEach((value, colIndex) => {
        const cell = worksheet.getCell(currentRow, colIndex + 1)
        cell.value = value
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        }
        cell.alignment = { horizontal: 'right', vertical: 'middle' }

        if (index % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } }
        }

        // تمييز الاحتياجات العاجلة
        if (need.priority === 'urgent') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } }
          cell.font = { bold: true, color: { argb: 'FFDC2626' } }
        }
      })
      currentRow++
    })

    // تنسيق عرض الأعمدة
    worksheet.columns.forEach((column: any) => {
      column.width = 15
    })
  }

  /**
   * إنشاء صفحة مصروفات العيادة
   */
  private static async createExpensesSheet(workbook: any, data: any): Promise<void> {
    const worksheet = workbook.addWorksheet('مصروفات العيادة')

    // العنوان
    worksheet.mergeCells('A1:G1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = 'تقرير مصروفات العيادة'
    headerCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } }
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' }

    let currentRow = 3

    // إحصائيات مصروفات العيادة
    const totalExpenses = data.expenses.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0)
    const paidExpenses = data.expenses.filter((expense: any) => expense.status === 'paid')
    const pendingExpenses = data.expenses.filter((expense: any) => expense.status === 'pending')

    const expenseStats = [
      ['إجمالي المصروفات', data.expenses.length],
      ['إجمالي المبلغ', formatCurrency(totalExpenses)],
      ['المصروفات المدفوعة', paidExpenses.length],
      ['المصروفات الآجلة', pendingExpenses.length]
    ]

    worksheet.getCell(`A${currentRow}`).value = 'إحصائيات مصروفات العيادة'
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true }
    currentRow += 2

    expenseStats.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label
      worksheet.getCell(`B${currentRow}`).value = value
      currentRow++
    })

    currentRow += 2

    // جدول تفاصيل مصروفات العيادة
    worksheet.getCell(`A${currentRow}`).value = 'تفاصيل مصروفات العيادة'
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true }
    currentRow += 2

    // رؤوس الجدول
    const headers = ['تاريخ الدفع', 'اسم المصروف', 'النوع', 'المبلغ', 'طريقة الدفع', 'المورد', 'الحالة']
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'medium' }, left: { style: 'medium' },
        bottom: { style: 'medium' }, right: { style: 'medium' }
      }
    })
    currentRow++

    // بيانات مصروفات العيادة
    data.expenses.forEach((expense: any, index: number) => {
      const typeMapping = {
        'salary': 'رواتب',
        'utilities': 'مرافق',
        'rent': 'إيجار',
        'maintenance': 'صيانة',
        'supplies': 'مستلزمات',
        'insurance': 'تأمين',
        'other': 'أخرى'
      }

      const methodMapping = {
        'cash': 'نقداً',
        'bank_transfer': 'تحويل بنكي',
        'check': 'شيك',
        'credit_card': 'بطاقة ائتمان'
      }

      const rowData = [
        expense.payment_date ? formatDate(expense.payment_date) : '',
        expense.expense_name || 'غير محدد',
        typeMapping[expense.expense_type as keyof typeof typeMapping] || expense.expense_type || 'غير محدد',
        formatCurrency(expense.amount || 0),
        methodMapping[expense.payment_method as keyof typeof methodMapping] || expense.payment_method || 'غير محدد',
        expense.vendor || 'غير محدد',
        expense.status === 'paid' ? 'مدفوع' : 'آجل'
      ]

      rowData.forEach((value, colIndex) => {
        const cell = worksheet.getCell(currentRow, colIndex + 1)
        cell.value = value
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        }
        cell.alignment = { horizontal: 'right', vertical: 'middle' }

        if (index % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } }
        }

        // تمييز عمود المبلغ
        if (colIndex === 3) {
          cell.font = { bold: true }
          if (!cell.fill) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }
          }
        }
      })
      currentRow++
    })

    // تنسيق عرض الأعمدة
    worksheet.columns.forEach((column: any) => {
      column.width = 15
    })
  }

  /**
   * إنشاء صفحة الأرباح والخسائر
   */
  private static async createProfitLossSheet(workbook: any, data: any): Promise<void> {
    const worksheet = workbook.addWorksheet('الأرباح والخسائر')

    // العنوان
    worksheet.mergeCells('A1:H1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = 'تقرير الأرباح والخسائر'
    headerCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' }

    let currentRow = 3

    // حساب الإحصائيات المالية
    const totalRevenue = data.payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
    const totalLabCosts = data.labOrders.reduce((sum: number, order: any) => sum + (order.cost || 0), 0)
    const totalClinicNeeds = data.clinicNeeds.reduce((sum: number, need: any) => sum + ((need.price || 0) * (need.quantity || 0)), 0)
    const totalInventoryCosts = data.inventory.reduce((sum: number, item: any) => sum + ((item.cost || 0) * (item.quantity || 0)), 0)
    const totalDirectExpenses = data.expenses.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0)

    const totalExpenses = totalLabCosts + totalClinicNeeds + totalInventoryCosts + totalDirectExpenses
    const netProfit = totalRevenue - totalExpenses
    const isProfit = netProfit >= 0
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    // ملخص الأرباح والخسائر
    worksheet.getCell(`A${currentRow}`).value = 'ملخص الأرباح والخسائر'
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true, color: { argb: 'FF7C3AED' } }
    currentRow += 2

    const summaryData = [
      ['إجمالي الإيرادات', formatCurrency(totalRevenue)],
      ['إجمالي المصروفات', formatCurrency(totalExpenses)],
      ['صافي الربح/الخسارة', formatCurrency(Math.abs(netProfit))],
      ['نسبة الربح', `${profitMargin.toFixed(2)}%`],
      ['الحالة المالية', isProfit ? 'ربح' : 'خسارة']
    ]

    summaryData.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label
      worksheet.getCell(`B${currentRow}`).value = value
      worksheet.getCell(`A${currentRow}`).font = { bold: true }

      // تنسيق خاص للحالة المالية
      if (label === 'الحالة المالية') {
        worksheet.getCell(`B${currentRow}`).font = {
          bold: true,
          color: { argb: isProfit ? 'FF10B981' : 'FFEF4444' }
        }
      }

      currentRow++
    })

    currentRow += 2

    // تفصيل الإيرادات
    worksheet.getCell(`A${currentRow}`).value = 'تفصيل الإيرادات'
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true, color: { argb: 'FF10B981' } }
    currentRow += 2

    const completedPayments = data.payments.filter((p: any) => p.status === 'completed')
    const partialPayments = data.payments.filter((p: any) => p.status === 'partial')
    const pendingPayments = data.payments.filter((p: any) => p.status === 'pending')

    const revenueData = [
      ['المدفوعات المكتملة', `${completedPayments.length} (${formatCurrency(completedPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0))})`],
      ['المدفوعات الجزئية', `${partialPayments.length} (${formatCurrency(partialPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0))})`],
      ['المدفوعات الآجلة', `${pendingPayments.length} (${formatCurrency(pendingPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0))})`]
    ]

    revenueData.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label
      worksheet.getCell(`B${currentRow}`).value = value
      currentRow++
    })

    currentRow += 2

    // تفصيل المصروفات
    worksheet.getCell(`A${currentRow}`).value = 'تفصيل المصروفات'
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true, color: { argb: 'FFEF4444' } }
    currentRow += 2

    const expenseData = [
      ['تكاليف المختبرات', formatCurrency(totalLabCosts)],
      ['احتياجات العيادة', formatCurrency(totalClinicNeeds)],
      ['تكاليف المخزون', formatCurrency(totalInventoryCosts)],
      ['مصروفات مباشرة', formatCurrency(totalDirectExpenses)]
    ]

    expenseData.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label
      worksheet.getCell(`B${currentRow}`).value = value
      currentRow++
    })

    // تنسيق عرض الأعمدة
    worksheet.getColumn('A').width = 30
    worksheet.getColumn('B').width = 20
  }



  /**
   * دالة مساعدة للحصول على حالة الدفع بالعربية
   */
  private static getPaymentStatusInArabic(status: string): string {
    const statusMap: { [key: string]: string } = {
      'completed': 'مكتمل',
      'partial': 'جزئي',
      'pending': 'آجل',
      'overdue': 'متأخر',
      'cancelled': 'ملغي'
    }
    return statusMap[status] || status
  }

  /**
   * دالة مساعدة لفلترة البيانات حسب التاريخ
   */
  private static filterByDateRange(data: any[], dateRange: any, dateField: string): any[] {
    if (!dateRange || !dateRange.start || !dateRange.end) {
      return data
    }

    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)
    endDate.setHours(23, 59, 59, 999) // نهاية اليوم

    return data.filter(item => {
      const itemDate = new Date(item[dateField])
      return itemDate >= startDate && itemDate <= endDate
    })
  }
}
