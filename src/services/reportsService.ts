import type {
  Patient,
  Appointment,
  Payment,
  InventoryItem,
  Treatment,
  ToothTreatment,
  ReportFilter,
  PatientReportData,
  AppointmentReportData,
  FinancialReportData,
  InventoryReportData,
  AnalyticsReportData,
  TreatmentReportData,
  ReportData
} from '../types'
import { getTreatmentNameInArabic as getArabicTreatmentName, getCategoryNameInArabic as getArabicCategoryName, getStatusLabelInArabic as getArabicStatusLabel, getPaymentStatusInArabic as getArabicPaymentStatus } from '@/utils/arabicTranslations'

export class ReportsService {

  // Helper function to get Arabic treatment name
  private getTreatmentNameInArabic(treatmentType: string): string {
    return getArabicTreatmentName(treatmentType)
  }

  // Legacy method - keeping for backward compatibility
  private getTreatmentNameInArabicLegacy(treatmentType: string): string {
    const treatmentMap: { [key: string]: string } = {
      // Preventive treatments
      'healthy': 'سليم',
      'cleaning': 'تنظيف',
      'fluoride': 'فلورايد',
      'sealant': 'حشو وقائي',
      'scaling': 'تقليح',

      // Restorative treatments
      'filling_metal': 'حشو معدني',
      'filling_cosmetic': 'حشو تجميلي',
      'filling_glass_ionomer': 'حشو زجاجي',
      'inlay': 'حشو داخلي',
      'onlay': 'حشو خارجي',

      // Endodontic treatments
      'pulp_therapy': 'مداولة لبية',
      'direct_pulp_cap': 'تغطية مباشرة',
      'indirect_pulp_cap': 'تغطية غير مباشرة',
      'retreatment': 'إعادة معالجة',
      'deep_pulp_treatment': 'معالجة لبية عفنة',

      // Surgical treatments
      'extraction_simple': 'قلع بسيط',
      'extraction_surgical': 'قلع جراحي',
      'implant': 'زراعة',
      'bone_graft': 'ترقيع عظم',
      'sinus_lift': 'رفع الجيب الفكي',
      'gum_surgery': 'جراحة لثة',
      'apical_resection': 'قطع ذروة',

      // Cosmetic treatments
      'veneer_porcelain': 'قشرة خزفية',
      'veneer_composite': 'قشرة مركبة',
      'whitening': 'تبييض',
      'bonding': 'ربط تجميلي',
      'contouring': 'تشكيل تجميلي',
      'polish': 'بوليش',

      // Orthodontic treatments
      'orthodontic_metal': 'تقويم معدني',
      'orthodontic_ceramic': 'تقويم خزفي',
      'orthodontic_clear': 'تقويم شفاف',
      'retainer': 'مثبت',
      'space_maintainer': 'حافظ مسافة',

      // Periodontal treatments
      'scaling_periodontal': 'تقليح',
      'subgingival_scaling': 'تقليح تحت لثوي',
      'deep_cleaning': 'تنظيف عميق',
      'root_planing': 'تسوية الجذور',
      'gum_graft': 'ترقيع لثة',
      'pocket_reduction': 'تقليل الجيوب',

      // Pediatric treatments
      'pediatric_filling': 'حشوة',
      'pulp_amputation': 'بتر لب',
      'pediatric_pulp_treatment': 'معالجة لبية',
      'pulp_therapy_pediatric': 'علاج عصب لبني',
      'stainless_crown': 'تاج ستانلس',
      'space_maintainer_fixed': 'حافظ مسافة ثابت',
      'space_maintainer_removable': 'حافظ مسافة متحرك',

      // Prosthetic treatments
      'crown_metal': 'تاج معدني',
      'crown_ceramic': 'تاج خزفي',
      'crown_zirconia': 'تاج زيركونيا',
      'bridge': 'جسر',

      // Legacy treatments
      'preventive': 'علاج وقائي',
      'pulp_cap': 'تغطية لب',
      'orthodontic_metal': 'تقويم معدني',
      'extraction_simple': 'قلع بسيط'
    }

    return treatmentMap[treatmentType] || treatmentType
  }

  // Helper function to get Arabic category name
  private getCategoryNameInArabic(category: string): string {
    return getArabicCategoryName(category)
  }

  // Helper function to filter data by date range
  private filterByDateRange<T extends { created_at: string }>(
    data: T[],
    dateRange: ReportFilter['dateRange'],
    dateField: keyof T = 'created_at' as keyof T
  ): T[] {
    // إنشاء تواريخ البداية والنهاية مع ضبط المنطقة الزمنية المحلية
    const start = new Date(dateRange.start)
    const startLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0)

    const end = new Date(dateRange.end)
    const endLocal = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)

    return data.filter(item => {
      const itemDateStr = item[dateField] as string
      if (!itemDateStr) return false

      const itemDate = new Date(itemDateStr)

      // للتواريخ التي تحتوي على وقت، نحتاج لمقارنة التاريخ فقط
      let itemDateForComparison: Date
      if (itemDateStr.includes('T') || itemDateStr.includes(' ')) {
        // التاريخ يحتوي على وقت، استخدمه كما هو
        itemDateForComparison = itemDate
      } else {
        // التاريخ بدون وقت، اعتبره في بداية اليوم
        itemDateForComparison = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate(), 0, 0, 0, 0)
      }

      return itemDateForComparison >= startLocal && itemDateForComparison <= endLocal
    })
  }

  // Helper function to calculate age from date of birth
  private calculateAge(dateOfBirth: string): number {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    return age
  }

  // Helper function to group data by time period
  private groupByPeriod<T extends { created_at: string }>(
    data: T[],
    period: 'day' | 'week' | 'month' | 'year' = 'month',
    dateField: keyof T = 'created_at' as keyof T
  ): { period: string; count: number; data: T[] }[] {
    const groups: { [key: string]: T[] } = {}

    data.forEach(item => {
      const date = new Date(item[dateField] as string)
      let key: string

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0]
          break
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        case 'year':
          key = String(date.getFullYear())
          break
        default:
          key = date.toISOString().split('T')[0]
      }

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(item)
    })

    return Object.entries(groups)
      .map(([period, data]) => ({ period, count: data.length, data }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }

  // Generate Patient Reports
  async generatePatientReport(
    patients: Patient[],
    appointments: Appointment[],
    filter: ReportFilter
  ): Promise<PatientReportData> {
    console.log('🚀 Starting patient report generation...')
    console.log('📊 Total patients received:', patients.length)
    console.log('📅 Filter:', filter)

    const filteredPatients = this.filterByDateRange(patients, filter.dateRange)
    console.log('📊 Filtered patients:', filteredPatients.length)

    // Calculate basic stats
    const totalPatients = patients.length
    const newPatients = filteredPatients.length

    // Calculate active/inactive patients based on recent appointments
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const recentAppointments = appointments.filter(apt =>
      new Date(apt.created_at) >= threeMonthsAgo
    )
    const activePatientIds = new Set(recentAppointments.map(apt => apt.patient_id))

    const activePatients = patients.filter(p => activePatientIds.has(p.id)).length
    const inactivePatients = totalPatients - activePatients

    // Age distribution
    console.log('🔢 Calculating age distribution...')
    const ageDistribution = this.calculateAgeDistribution(patients)

    // Gender distribution - calculate from actual patient data
    console.log('👥 Calculating gender distribution...')
    const genderDistribution = this.calculateGenderDistribution(patients)

    // Registration trend
    const registrationTrend = this.groupByPeriod(filteredPatients, 'month')
      .map(group => ({ period: group.period, count: group.count }))

    const result = {
      totalPatients,
      newPatients,
      activePatients,
      inactivePatients,
      ageDistribution,
      genderDistribution,
      registrationTrend,
      patientsList: filteredPatients
    }

    console.log('✅ Patient report generated:', result)
    return result
  }

  private calculateAgeDistribution(patients: Patient[]): { ageGroup: string; count: number }[] {
    console.log('🔍 Calculating age distribution for patients:', patients.length)

    const ageGroups = {
      'أطفال (0-17)': 0,
      'شباب (18-30)': 0,
      'بالغين (31-45)': 0,
      'متوسطي العمر (46-60)': 0,
      'مسنين (60+)': 0,
      'غير محدد': 0
    }

    patients.forEach(patient => {
      console.log(`👤 Processing patient: ${patient.full_name}, age: ${patient.age}`)

      // استخدام حقل العمر مباشرة من قاعدة البيانات
      if (!patient.age || typeof patient.age !== 'number') {
        ageGroups['غير محدد']++
        console.log(`  ➡️ Age not specified, adding to 'غير محدد'`)
        return
      }

      const age = patient.age
      console.log(`  ➡️ Patient age: ${age}`)

      if (age >= 0 && age <= 17) {
        ageGroups['أطفال (0-17)']++
        console.log(`  ➡️ Added to 'أطفال (0-17)'`)
      } else if (age >= 18 && age <= 30) {
        ageGroups['شباب (18-30)']++
        console.log(`  ➡️ Added to 'شباب (18-30)'`)
      } else if (age >= 31 && age <= 45) {
        ageGroups['بالغين (31-45)']++
        console.log(`  ➡️ Added to 'بالغين (31-45)'`)
      } else if (age >= 46 && age <= 60) {
        ageGroups['متوسطي العمر (46-60)']++
        console.log(`  ➡️ Added to 'متوسطي العمر (46-60)'`)
      } else if (age > 60) {
        ageGroups['مسنين (60+)']++
        console.log(`  ➡️ Added to 'مسنين (60+)'`)
      } else {
        ageGroups['غير محدد']++
        console.log(`  ➡️ Invalid age, adding to 'غير محدد'`)
      }
    })

    console.log('📈 Age groups:', ageGroups)

    // فقط إرجاع الفئات العمرية التي لديها مرضى فعلاً
    const result = Object.entries(ageGroups)
      .filter(([ageGroup, count]) => count > 0)
      .map(([ageGroup, count]) => ({ ageGroup, count }))

    console.log('✅ Final age distribution:', result)
    return result
  }

  private calculateGenderDistribution(patients: Patient[]): { gender: string; count: number }[] {
    console.log('🔍 Calculating gender distribution for patients:', patients.length)
    console.log('📊 Patient data sample:', patients.slice(0, 5).map(p => ({ id: p.id, gender: p.gender, age: p.age, name: p.full_name })))

    const genderCounts = {
      'male': 0,
      'female': 0,
      'غير محدد': 0
    }

    patients.forEach(patient => {
      console.log(`👤 Processing patient: ${patient.full_name}, gender: ${patient.gender}`)

      if (!patient.gender) {
        genderCounts['غير محدد']++
        return
      }

      if (patient.gender === 'male') {
        genderCounts['male']++
      } else if (patient.gender === 'female') {
        genderCounts['female']++
      } else {
        genderCounts['غير محدد']++
      }
    })

    console.log('📈 Gender counts:', genderCounts)

    // فقط إرجاع الأجناس التي لديها مرضى فعلاً
    const result = []
    if (genderCounts['male'] > 0) {
      result.push({ gender: 'ذكر', count: genderCounts['male'] })
    }
    if (genderCounts['female'] > 0) {
      result.push({ gender: 'أنثى', count: genderCounts['female'] })
    }
    if (genderCounts['غير محدد'] > 0) {
      result.push({ gender: 'غير محدد', count: genderCounts['غير محدد'] })
    }

    console.log('✅ Final gender distribution:', result)
    return result
  }

  // Generate Appointment Reports
  async generateAppointmentReport(
    appointments: Appointment[],
    treatments: Treatment[],
    filter: ReportFilter
  ): Promise<AppointmentReportData> {
    const filteredAppointments = this.filterByDateRange(appointments, filter.dateRange, 'start_time')

    // Basic stats
    const totalAppointments = filteredAppointments.length
    const completedAppointments = filteredAppointments.filter(apt => apt.status === 'completed').length
    const cancelledAppointments = filteredAppointments.filter(apt => apt.status === 'cancelled').length
    const noShowAppointments = filteredAppointments.filter(apt => apt.status === 'no_show').length
    const scheduledAppointments = filteredAppointments.filter(apt => apt.status === 'scheduled').length

    // Calculate rates with proper validation and rounding
    const attendanceRate = totalAppointments > 0 ?
      Math.round((completedAppointments / totalAppointments) * 10000) / 100 : 0
    const cancellationRate = totalAppointments > 0 ?
      Math.round((cancelledAppointments / totalAppointments) * 10000) / 100 : 0

    // Appointments by status with validated percentages
    const appointmentsByStatus = [
      {
        status: 'مكتمل',
        count: completedAppointments,
        percentage: totalAppointments > 0 ?
          Math.round((completedAppointments / totalAppointments) * 10000) / 100 : 0
      },
      {
        status: 'مجدول',
        count: scheduledAppointments,
        percentage: totalAppointments > 0 ?
          Math.round((scheduledAppointments / totalAppointments) * 10000) / 100 : 0
      },
      {
        status: 'ملغي',
        count: cancelledAppointments,
        percentage: totalAppointments > 0 ?
          Math.round((cancelledAppointments / totalAppointments) * 10000) / 100 : 0
      },
      {
        status: 'لم يحضر',
        count: noShowAppointments,
        percentage: totalAppointments > 0 ?
          Math.round((noShowAppointments / totalAppointments) * 10000) / 100 : 0
      }
    ]

    // Validate that percentages add up to 100% (within rounding tolerance)
    const totalPercentage = appointmentsByStatus.reduce((sum, item) => sum + item.percentage, 0)
    if (Math.abs(totalPercentage - 100) > 0.1 && totalAppointments > 0) {
      console.warn('Appointment percentages do not add up to 100%:', totalPercentage)
    }

    // Appointments by treatment
    const treatmentCounts: { [key: string]: number } = {}
    filteredAppointments.forEach(apt => {
      const treatment = treatments.find(t => t.id === apt.treatment_id)
      const treatmentName = treatment?.name || 'غير محدد'
      treatmentCounts[treatmentName] = (treatmentCounts[treatmentName] || 0) + 1
    })

    const appointmentsByTreatment = Object.entries(treatmentCounts)
      .map(([treatment, count]) => ({ treatment, count }))
      .sort((a, b) => b.count - a.count)

    // Appointments by day of week
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    const dayCounts: { [key: string]: number } = {}

    filteredAppointments.forEach(apt => {
      const date = new Date(apt.start_time)
      const dayName = dayNames[date.getDay()]
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1
    })

    const appointmentsByDay = dayNames.map(day => ({
      day,
      count: dayCounts[day] || 0
    }))

    // Appointments by hour (peak hours analysis)
    const hourCounts: { [key: string]: number } = {}
    filteredAppointments.forEach(apt => {
      const date = new Date(apt.start_time)
      const hour = `${date.getHours()}:00`
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })

    const appointmentsByHour = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour))

    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Appointment trend
    const appointmentTrend = this.groupByPeriod(filteredAppointments, 'month', 'start_time')
      .map(group => ({ period: group.period, count: group.count }))

    return {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      noShowAppointments,
      scheduledAppointments,
      attendanceRate,
      cancellationRate,
      appointmentsByStatus,
      appointmentsByTreatment,
      appointmentsByDay,
      appointmentsByHour,
      peakHours,
      appointmentTrend,
      appointmentsList: filteredAppointments
    }
  }

  // Generate Financial Reports with Expenses Integration
  async generateFinancialReport(
    payments: Payment[],
    treatments: Treatment[],
    filter: ReportFilter,
    expenses?: any[] // ClinicExpense[] - optional for backward compatibility
  ): Promise<FinancialReportData> {
    const filteredPayments = this.filterByDateRange(payments, filter.dateRange, 'payment_date')
    const filteredExpenses = expenses ? this.filterByDateRange(expenses, filter.dateRange, 'payment_date') : []

    // Basic financial stats with enhanced validation
    const validateAmount = (amount: any): number => {
      const num = Number(amount)
      return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
    }

    // Calculate total expenses from filtered data
    const totalExpenses = filteredExpenses
      .filter(e => e.status === 'paid')
      .reduce((sum, e) => sum + validateAmount(e.amount), 0)

    const totalRevenue = filteredPayments
      .filter(p => p.status === 'completed' || p.status === 'partial')
      .reduce((sum, p) => {
        // استخدام المبلغ الفعلي المدفوع في كل دفعة
        const amount = validateAmount(p.amount)
        return sum + amount
      }, 0)

    const totalPaid = filteredPayments
      .filter(p => p.status === 'completed' || p.status === 'partial')
      .reduce((sum, p) => {
        // استخدام المبلغ الفعلي المدفوع في كل دفعة
        const amount = validateAmount(p.amount)
        return sum + amount
      }, 0)

    const totalPending = filteredPayments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => {
        // للمدفوعات الآجلة، استخدام المبلغ الإجمالي المطلوب إذا كان المبلغ المدفوع 0
        const amount = validateAmount(p.amount)
        const totalAmountDue = validateAmount(p.total_amount_due)

        let pendingAmount = amount

        if (p.tooth_treatment_id) {
          // للمدفوعات المرتبطة بعلاجات، استخدم التكلفة الإجمالية للعلاج
          const treatmentCost = validateAmount(p.treatment_total_cost) || totalAmountDue
          pendingAmount = treatmentCost
        } else if (amount === 0 && totalAmountDue > 0) {
          // إذا كان المبلغ المدفوع 0 والمبلغ الإجمالي المطلوب أكبر من 0، استخدم المبلغ الإجمالي
          pendingAmount = totalAmountDue
        }

        return sum + pendingAmount
      }, 0)

    // حساب إجمالي المبلغ المتبقي من الدفعات الجزئية فقط
    // تجميع المدفوعات حسب الموعد والعلاج
    const appointmentGroups = new Map<string, { totalDue: number, totalPaid: number }>()
    const treatmentGroups = new Map<string, { totalDue: number, totalPaid: number }>()
    let generalRemainingBalance = 0

    filteredPayments.forEach(payment => {
      if (payment.status === 'partial') {
        if (payment.tooth_treatment_id) {
          // مدفوعات مرتبطة بعلاجات
          const treatmentId = payment.tooth_treatment_id
          const totalDue = payment.treatment_total_cost || payment.total_amount_due || 0
          const paidAmount = payment.amount || 0

          if (!treatmentGroups.has(treatmentId)) {
            treatmentGroups.set(treatmentId, { totalDue: validateAmount(totalDue), totalPaid: 0 })
          }

          const group = treatmentGroups.get(treatmentId)!
          group.totalPaid += validateAmount(paidAmount)
        } else if (payment.appointment_id) {
          // مدفوعات مرتبطة بمواعيد
          const appointmentId = payment.appointment_id
          const totalDue = payment.total_amount_due || payment.appointment_total_cost || 0
          const paidAmount = payment.amount || 0

          if (!appointmentGroups.has(appointmentId)) {
            appointmentGroups.set(appointmentId, { totalDue: validateAmount(totalDue), totalPaid: 0 })
          }

          const group = appointmentGroups.get(appointmentId)!
          group.totalPaid += validateAmount(paidAmount)
        } else {
          // مدفوعات عامة غير مرتبطة بمواعيد أو علاجات
          const totalDue = payment.total_amount_due || 0
          // استخدم إجمالي المدفوع للعلاج وليس مبلغ هذه الدفعة فقط
          const totalPaid = payment.amount_paid || payment.treatment_total_paid || payment.amount || 0
          generalRemainingBalance += Math.max(0, validateAmount(totalDue) - validateAmount(totalPaid))
        }
      }
    })

    // حساب إجمالي المبالغ المتبقية من المواعيد
    const appointmentRemainingBalance = Array.from(appointmentGroups.values()).reduce((sum, group) => {
      return sum + Math.max(0, group.totalDue - group.totalPaid)
    }, 0)

    // حساب إجمالي المبالغ المتبقية من العلاجات
    const treatmentRemainingBalance = Array.from(treatmentGroups.values()).reduce((sum, group) => {
      return sum + Math.max(0, group.totalDue - group.totalPaid)
    }, 0)

    // إجمالي المبالغ المتبقية
    const totalRemaining = appointmentRemainingBalance + treatmentRemainingBalance + generalRemainingBalance

    const totalOverdue = 0 // لا يوجد مدفوعات متأخرة في النظام الحالي

    // Revenue by payment method
    const paymentMethodCounts: { [key: string]: number } = {}
    const paymentMethodNames: { [key: string]: string } = {
      'cash': 'نقدي',
      'card': 'بطاقة',
      'bank_transfer': 'تحويل بنكي',
      'check': 'شيك',
      'insurance': 'تأمين'
    }

    filteredPayments
      .filter(p => p.status === 'completed')
      .forEach(payment => {
        const method = paymentMethodNames[payment.payment_method] || payment.payment_method || 'غير محدد'
        const amount = validateAmount(payment.amount)
        const currentTotal = paymentMethodCounts[method] || 0
        const newTotal = currentTotal + amount
        paymentMethodCounts[method] = validateAmount(newTotal)
      })

    const revenueByPaymentMethod = Object.entries(paymentMethodCounts)
      .filter(([method, amount]) => validateAmount(amount) > 0)
      .map(([method, amount]) => ({
        method,
        amount: validateAmount(amount),
        percentage: totalRevenue > 0 ? Math.round((validateAmount(amount) / totalRevenue) * 10000) / 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    // Validate that payment method percentages add up to 100% (within rounding tolerance)
    const totalMethodPercentage = revenueByPaymentMethod.reduce((sum, item) => sum + item.percentage, 0)
    if (Math.abs(totalMethodPercentage - 100) > 0.1 && totalRevenue > 0) {
      console.warn('Payment method percentages do not add up to 100%:', totalMethodPercentage)
    }

    // Revenue by treatment
    const treatmentRevenue: { [key: string]: { amount: number; count: number } } = {}

    filteredPayments
      .filter(p => p.status === 'completed' && p.appointment?.treatment_id)
      .forEach(payment => {
        const treatment = treatments.find(t => t.id === payment.appointment?.treatment_id)
        const treatmentName = treatment?.name || 'غير محدد'

        if (!treatmentRevenue[treatmentName]) {
          treatmentRevenue[treatmentName] = { amount: 0, count: 0 }
        }

        treatmentRevenue[treatmentName].amount += payment.amount
        treatmentRevenue[treatmentName].count += 1
      })

    const revenueByTreatment = Object.entries(treatmentRevenue)
      .map(([treatment, data]) => ({
        treatment,
        amount: data.amount,
        count: data.count,
        avgAmount: data.count > 0 ? data.amount / data.count : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    // Revenue trend
    const revenueTrend = this.groupByPeriod(
      filteredPayments.filter(p => p.status === 'completed'),
      'month',
      'payment_date'
    ).map(group => ({
      period: group.period,
      amount: group.data.reduce((sum, p) => sum + validateAmount(p.amount), 0),
      revenue: group.data.reduce((sum, p) => sum + validateAmount(p.amount), 0) // Add revenue field for compatibility
    }))

    // Calculate expenses data
    const totalExpenses = filteredExpenses
      .filter(e => e.status === 'paid')
      .reduce((sum, e) => sum + validateAmount(e.amount), 0)

    const expensesByType = this.groupBy(filteredExpenses.filter(e => e.status === 'paid'), 'expense_type')
      .map(group => ({
        type: group.key || 'غير محدد',
        amount: group.items.reduce((sum, e) => sum + validateAmount(e.amount), 0),
        count: group.items.length,
        percentage: 0 // Will be calculated below
      }))

    // Calculate percentages for expenses
    expensesByType.forEach(item => {
      item.percentage = totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0
    })

    // Expense trend
    const expenseTrend = this.groupByPeriod(
      filteredExpenses.filter(e => e.status === 'paid'),
      'month',
      'payment_date'
    ).map(group => ({
      period: group.period,
      amount: group.data.reduce((sum, e) => sum + validateAmount(e.amount), 0)
    }))

    // Enhanced cash flow with expenses
    const cashFlow = revenueTrend.map(item => {
      const expenseForPeriod = expenseTrend.find(e => e.period === item.period)?.amount || 0
      return {
        period: item.period,
        income: item.amount,
        expenses: expenseForPeriod,
        net: item.amount - expenseForPeriod
      }
    })

    // Outstanding payments
    const outstandingPayments = payments
      .filter(p => ['pending', 'overdue', 'partial'].includes(p.status))
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .slice(0, 20) // Top 20 outstanding payments

    // Recent transactions
    const recentTransactions = filteredPayments
      .filter(p => p.status === 'completed')
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .slice(0, 10) // Last 10 transactions

    // Recent expenses
    const recentExpenses = filteredExpenses
      .filter(e => e.status === 'paid')
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .slice(0, 10) // Last 10 expenses

    // Profit/Loss calculation
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0

    // Financial health indicators
    const profitTrend = this.calculateProfitTrend(cashFlow)
    const cashFlowStatus = netProfit > 0 ? 'positive' : netProfit < 0 ? 'negative' : 'neutral'

    return {
      totalRevenue,
      totalPaid,
      totalPending,
      totalOverdue,
      totalExpenses,
      netProfit,
      profitMargin,
      expenseRatio,
      profitTrend,
      cashFlowStatus,
      revenueByPaymentMethod,
      revenueByTreatment,
      expensesByType,
      revenueTrend,
      expenseTrend,
      cashFlow,
      outstandingPayments,
      recentTransactions,
      recentExpenses
    }
  }

  // Calculate profit trend based on cash flow data
  private calculateProfitTrend(cashFlow: { period: string; income: number; expenses: number; net: number }[]): 'increasing' | 'decreasing' | 'stable' {
    if (cashFlow.length < 2) return 'stable'

    const recentPeriods = cashFlow.slice(-3) // Last 3 periods
    if (recentPeriods.length < 2) return 'stable'

    let increasingCount = 0
    let decreasingCount = 0

    for (let i = 1; i < recentPeriods.length; i++) {
      const current = recentPeriods[i].net
      const previous = recentPeriods[i - 1].net

      if (current > previous) increasingCount++
      else if (current < previous) decreasingCount++
    }

    if (increasingCount > decreasingCount) return 'increasing'
    if (decreasingCount > increasingCount) return 'decreasing'
    return 'stable'
  }

  // Generate Inventory Reports
  async generateInventoryReport(
    inventory: InventoryItem[],
    inventoryUsage: any[],
    filter: ReportFilter
  ): Promise<InventoryReportData> {
    const today = new Date()

    // Basic inventory stats
    const totalItems = inventory.length
    const totalValue = inventory.reduce((sum, item) =>
      sum + (item.quantity * (item.cost_per_unit || 0)), 0
    )

    // Low stock items
    const lowStockItems = inventory.filter(item =>
      item.quantity <= item.minimum_stock && item.quantity > 0
    ).length

    // Expired items
    const expiredItems = inventory.filter(item =>
      item.expiry_date && new Date(item.expiry_date) < today
    ).length

    // Expiring soon items (within 30 days)
    const expiringSoonItems = inventory.filter(item => {
      if (!item.expiry_date) return false
      const expiryDate = new Date(item.expiry_date)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0
    }).length

    // Items by category
    const categoryCounts: { [key: string]: { count: number; value: number } } = {}
    inventory.forEach(item => {
      const category = item.category || 'غير مصنف'
      if (!categoryCounts[category]) {
        categoryCounts[category] = { count: 0, value: 0 }
      }
      categoryCounts[category].count += 1
      categoryCounts[category].value += item.quantity * (item.cost_per_unit || 0)
    })

    const itemsByCategory = Object.entries(categoryCounts)
      .map(([category, data]) => ({ category, count: data.count, value: data.value }))
      .sort((a, b) => b.value - a.value)

    // Items by supplier
    const supplierCounts: { [key: string]: { count: number; value: number } } = {}
    inventory.forEach(item => {
      const supplier = item.supplier || 'غير محدد'
      if (!supplierCounts[supplier]) {
        supplierCounts[supplier] = { count: 0, value: 0 }
      }
      supplierCounts[supplier].count += 1
      supplierCounts[supplier].value += item.quantity * (item.cost_per_unit || 0)
    })

    const itemsBySupplier = Object.entries(supplierCounts)
      .map(([supplier, data]) => ({ supplier, count: data.count, value: data.value }))
      .sort((a, b) => b.value - a.value)

    // Usage trend (simplified - would need actual usage data)
    const usageTrend = [
      { period: '2024-01', usage: 150 },
      { period: '2024-02', usage: 180 },
      { period: '2024-03', usage: 165 },
      { period: '2024-04', usage: 200 },
      { period: '2024-05', usage: 175 },
      { period: '2024-06', usage: 190 }
    ]

    // Top used items (simplified)
    const topUsedItems = inventory
      .sort((a, b) => (b.quantity * (b.cost_per_unit || 0)) - (a.quantity * (a.cost_per_unit || 0)))
      .slice(0, 10)
      .map(item => ({ item: item.name, usage: item.quantity }))

    // Stock alerts
    const stockAlerts = inventory.filter(item =>
      item.quantity <= item.minimum_stock
    )

    // Expiry alerts
    const expiryAlerts = inventory.filter(item => {
      if (!item.expiry_date) return false
      const expiryDate = new Date(item.expiry_date)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilExpiry <= 30
    })

    return {
      totalItems,
      totalValue,
      lowStockItems,
      expiredItems,
      expiringSoonItems,
      itemsByCategory,
      itemsBySupplier,
      usageTrend,
      topUsedItems,
      stockAlerts,
      expiryAlerts
    }
  }

  // Generate Treatment Reports
  async generateTreatmentReport(
    toothTreatments: ToothTreatment[],
    treatments: Treatment[],
    filter: ReportFilter
  ): Promise<TreatmentReportData> {
    console.log('🚀 Starting treatment report generation...')
    console.log('📊 Total tooth treatments received:', toothTreatments.length)
    console.log('📅 Filter:', filter)

    const filteredTreatments = this.filterByDateRange(toothTreatments, filter.dateRange, 'created_at')
    console.log('📊 Filtered treatments:', filteredTreatments.length)

    // Basic Statistics
    const totalTreatments = filteredTreatments.length
    const completedTreatments = filteredTreatments.filter(t => t.treatment_status === 'completed').length
    const plannedTreatments = filteredTreatments.filter(t => t.treatment_status === 'planned').length
    const inProgressTreatments = filteredTreatments.filter(t => t.treatment_status === 'in_progress').length
    const cancelledTreatments = filteredTreatments.filter(t => t.treatment_status === 'cancelled').length

    // Financial Statistics
    const validateAmount = (amount: any): number => {
      const num = Number(amount)
      return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
    }

    const totalRevenue = filteredTreatments
      .filter(t => t.treatment_status === 'completed')
      .reduce((sum, t) => sum + validateAmount(t.cost), 0)

    const averageTreatmentCost = totalTreatments > 0
      ? totalRevenue / completedTreatments || 0
      : 0

    // Revenue by Category
    const revenueByCategory = this.groupBy(
      filteredTreatments.filter(t => t.treatment_status === 'completed'),
      'treatment_category'
    ).map(group => ({
      category: this.getCategoryNameInArabic(group.key) || 'غير محدد',
      revenue: group.items.reduce((sum, t) => sum + validateAmount(t.cost), 0),
      count: group.items.length
    }))

    // Treatment Analysis
    const treatmentsByType = this.groupBy(filteredTreatments, 'treatment_type')
      .map(group => ({
        type: this.getTreatmentNameInArabic(group.key) || 'غير محدد',
        count: group.items.length,
        percentage: totalTreatments > 0 ? Math.round((group.items.length / totalTreatments) * 100) : 0
      }))

    const treatmentsByCategory = this.groupBy(filteredTreatments, 'treatment_category')
      .map(group => ({
        category: this.getCategoryNameInArabic(group.key) || 'غير محدد',
        count: group.items.length,
        percentage: totalTreatments > 0 ? Math.round((group.items.length / totalTreatments) * 100) : 0
      }))

    const treatmentsByStatus = this.groupBy(filteredTreatments, 'treatment_status')
      .map(group => ({
        status: this.getStatusLabel(group.key || 'planned'),
        count: group.items.length,
        percentage: totalTreatments > 0 ? Math.round((group.items.length / totalTreatments) * 100) : 0
      }))

    // Performance Metrics
    const completionRate = totalTreatments > 0
      ? Math.round((completedTreatments / totalTreatments) * 100)
      : 0

    // Calculate average completion time
    const completedWithDates = filteredTreatments.filter(t =>
      t.treatment_status === 'completed' && t.start_date && t.completion_date
    )

    const averageCompletionTime = completedWithDates.length > 0
      ? completedWithDates.reduce((sum, t) => {
          const start = new Date(t.start_date!)
          const end = new Date(t.completion_date!)
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          return sum + days
        }, 0) / completedWithDates.length
      : 0

    // Treatment Trend
    const treatmentTrend = this.groupByPeriod(filteredTreatments, 'month', 'created_at')
      .map(group => ({
        period: group.period,
        completed: group.items.filter(t => t.treatment_status === 'completed').length,
        planned: group.items.filter(t => t.treatment_status === 'planned').length
      }))

    // Most Popular Treatments
    const mostPopularTreatments = this.groupBy(filteredTreatments, 'treatment_type')
      .map(group => ({
        name: this.getTreatmentNameInArabic(group.key) || 'غير محدد',
        count: group.items.length,
        revenue: group.items
          .filter(t => t.treatment_status === 'completed')
          .reduce((sum, t) => sum + validateAmount(t.cost), 0)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Patient Analysis
    const patientTreatmentCounts = this.groupBy(filteredTreatments, 'patient_id')
    const patientsWithMultipleTreatments = patientTreatmentCounts
      .filter(group => group.items.length > 1).length

    const averageTreatmentsPerPatient = patientTreatmentCounts.length > 0
      ? totalTreatments / patientTreatmentCounts.length
      : 0

    // Time Analysis
    const treatmentsByMonth = this.groupByPeriod(filteredTreatments, 'month', 'created_at')
      .map(group => ({
        month: group.period,
        count: group.items.length
      }))

    // Peak treatment days (simplified - by day of week)
    const peakTreatmentDays = this.groupBy(
      filteredTreatments.filter(t => t.created_at),
      (t) => new Date(t.created_at).toLocaleDateString('en-US', { weekday: 'long' })
    ).map(group => ({
      day: group.key || 'غير محدد',
      count: group.items.length
    })).sort((a, b) => b.count - a.count)

    // Detailed Lists
    const pendingTreatments = filteredTreatments.filter(t =>
      t.treatment_status === 'planned' || t.treatment_status === 'in_progress'
    )

    // Overdue treatments (planned treatments with start_date in the past)
    const today = new Date()
    const overdueTreatments = filteredTreatments.filter(t =>
      t.treatment_status === 'planned' &&
      t.start_date &&
      new Date(t.start_date) < today
    )

    return {
      totalTreatments,
      completedTreatments,
      plannedTreatments,
      inProgressTreatments,
      cancelledTreatments,
      totalRevenue,
      averageTreatmentCost,
      revenueByCategory,
      treatmentsByType,
      treatmentsByCategory,
      treatmentsByStatus,
      completionRate,
      averageCompletionTime,
      treatmentTrend,
      mostPopularTreatments,
      patientsWithMultipleTreatments,
      averageTreatmentsPerPatient,
      treatmentsByMonth,
      peakTreatmentDays,
      treatmentsList: filteredTreatments,
      pendingTreatments,
      overdueTreatments
    }
  }

  // Helper method to get status label in Arabic
  private getStatusLabel(status: string): string {
    return getArabicStatusLabel(status)
  }
}
