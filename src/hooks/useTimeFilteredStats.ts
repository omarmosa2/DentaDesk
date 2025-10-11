import { useState, useEffect, useMemo } from 'react'
import { TimeFilterOptions } from '@/components/ui/time-filter'
import { getWeekStart } from '@/lib/utils'

export interface FilterableData {
  created_at?: string
  date?: string
  order_date?: string
  prescription_date?: string
  appointment_date?: string
  payment_date?: string
  [key: string]: any
}

interface UseTimeFilteredStatsOptions<T extends FilterableData> {
  data: T[]
  dateField?: keyof T
  initialFilter?: TimeFilterOptions
}

export function useTimeFilteredStats<T extends FilterableData>({
  data,
  dateField = 'created_at',
  initialFilter
}: UseTimeFilteredStatsOptions<T>) {
  // Initialize default filter
  const getDefaultFilter = (): TimeFilterOptions => {
    return {
      preset: 'all',
      startDate: '',
      endDate: ''
    }
  }

  const [timeFilter, setTimeFilter] = useState<TimeFilterOptions>(
    initialFilter || getDefaultFilter()
  )

  // Filter data based on time filter
  const filteredData = useMemo(() => {
    // Return empty array if data is not available yet
    if (!data || !Array.isArray(data)) {
      return []
    }

    // If no filter dates are set, return all data (show total)
    if (!timeFilter.startDate || !timeFilter.endDate ||
        timeFilter.startDate === '' || timeFilter.endDate === '') {
      return data
    }

    // إنشاء تواريخ البداية والنهاية مع ضبط المنطقة الزمنية المحلية
    const start = new Date(timeFilter.startDate)
    const startLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0)

    const end = new Date(timeFilter.endDate)
    const endLocal = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)

    return data.filter(item => {
      const itemDateValue = item[dateField]
      if (!itemDateValue) return false

      const itemDateStr = itemDateValue as string
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
  }, [data, timeFilter, dateField])

  // Calculate basic statistics
  const stats = useMemo(() => {
    const total = filteredData.length

    // Return basic stats if data is not available
    if (!data || !Array.isArray(data)) {
      return {
        total: 0,
        filtered: 0,
        today: 0,
        week: 0,
        month: 0,
        year: 0
      }
    }

    // Calculate period-based statistics
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const weekStart = getWeekStart(today)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const yearStart = new Date(today.getFullYear(), 0, 1)

    const todayCount = data.filter(item => {
      const itemDateValue = item[dateField]
      if (!itemDateValue) return false
      const itemDate = new Date(itemDateValue as string)
      return itemDate >= todayStart
    }).length

    const weekCount = data.filter(item => {
      const itemDateValue = item[dateField]
      if (!itemDateValue) return false
      const itemDate = new Date(itemDateValue as string)
      return itemDate >= weekStart && itemDate <= today
    }).length

    const monthCount = data.filter(item => {
      const itemDateValue = item[dateField]
      if (!itemDateValue) return false
      const itemDate = new Date(itemDateValue as string)
      return itemDate >= monthStart
    }).length

    const yearCount = data.filter(item => {
      const itemDateValue = item[dateField]
      if (!itemDateValue) return false
      const itemDate = new Date(itemDateValue as string)
      return itemDate >= yearStart
    }).length

    return {
      total,
      filtered: filteredData.length,
      today: todayCount,
      week: weekCount,
      month: monthCount,
      year: yearCount
    }
  }, [data, filteredData, dateField])

  // Calculate financial statistics if data has amount fields
  const financialStats = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return {
        totalRevenue: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        completedAmount: 0
      }
    }

    const hasAmount = filteredData.some(item =>
      'amount' in item || 'total_amount' in item || 'cost' in item || 'price' in item
    )

    if (!hasAmount) {
      return {
        totalRevenue: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        completedAmount: 0
      }
    }

    const totalRevenue = filteredData
      .filter((item: any) => item.status === 'completed' || item.status === 'partial')
      .reduce((sum, item) => {
        // استخدام amount (مبلغ الدفعة الحالية) وليس amount_paid (إجمالي المدفوع للموعد)
        const amount = (item as any).amount ||
                     (item as any).total_amount ||
                     (item as any).cost ||
                     (item as any).price || 0
        return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0)
      }, 0)

    const pendingAmount = filteredData
      .filter((item: any) => item.status === 'pending')
      .reduce((sum, item) => {
        const amount = (item as any).amount ||
                     (item as any).total_amount ||
                     (item as any).cost ||
                     (item as any).price || 0
        const totalAmountDue = (item as any).total_amount_due || 0

        // للمدفوعات الآجلة، استخدم المبلغ الإجمالي المطلوب أو المتبقي إذا كان متوفراً
        let pendingAmount = amount

        if (item.tooth_treatment_id) {
          // للمدفوعات المرتبطة بعلاجات، استخدم التكلفة الإجمالية للعلاج
          const treatmentCost = (item as any).treatment_total_cost || totalAmountDue || 0
          pendingAmount = treatmentCost
        } else if (totalAmountDue > 0) {
          pendingAmount = totalAmountDue
        } else {
          const remainingBalance = (item as any).remaining_balance || 0
          if (remainingBalance > 0) {
            pendingAmount = remainingBalance
          }
        }

        return sum + (typeof pendingAmount === 'number' ? pendingAmount : parseFloat(pendingAmount) || 0)
      }, 0)

    const overdueAmount = filteredData
      .filter((item: any) => {
        // المدفوعات المتأخرة هي المدفوعات الآجلة التي تجاوز تاريخ دفعها 30 يوماً
        if (item.status !== 'pending') return false

        const paymentDate = new Date(item.payment_date || item.date || item.created_at)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        return paymentDate < thirtyDaysAgo
      })
      .reduce((sum, item) => {
        const amount = (item as any).amount ||
                     (item as any).total_amount ||
                     (item as any).cost ||
                     (item as any).price || 0
        const totalAmountDue = (item as any).total_amount_due || 0

        // للمدفوعات المتأخرة، استخدم المبلغ الإجمالي المطلوب أو المتبقي إذا كان متوفراً
        const remainingBalance = (item as any).remaining_balance || 0
        let overdueAmount = amount
        if (totalAmountDue > 0) {
          overdueAmount = totalAmountDue
        } else if (remainingBalance > 0) {
          overdueAmount = remainingBalance
        }

        return sum + (typeof overdueAmount === 'number' ? overdueAmount : parseFloat(overdueAmount) || 0)
      }, 0)

    // حساب المبالغ المتبقية من الدفعات الجزئية فقط
    // تجميع المدفوعات حسب الموعد والعلاج
    const appointmentGroups = new Map<string, { totalDue: number, totalPaid: number }>()
    const treatmentGroups = new Map<string, { totalDue: number, totalPaid: number }>()
    let generalRemainingBalance = 0

    filteredData.forEach((payment: any) => {
      if (payment.status === 'partial') {
        if (payment.tooth_treatment_id) {
          // مدفوعات مرتبطة بعلاجات
          const treatmentId = payment.tooth_treatment_id
          const totalDue = payment.treatment_total_cost || payment.total_amount_due || 0
          const paidAmount = payment.amount || 0

          if (!treatmentGroups.has(treatmentId)) {
            treatmentGroups.set(treatmentId, {
              totalDue: typeof totalDue === 'number' ? totalDue : parseFloat(totalDue) || 0,
              totalPaid: 0
            })
          }

          const group = treatmentGroups.get(treatmentId)!
          group.totalPaid += typeof paidAmount === 'number' ? paidAmount : parseFloat(paidAmount) || 0
        } else if (payment.appointment_id) {
          // مدفوعات مرتبطة بمواعيد
          const appointmentId = payment.appointment_id
          const totalDue = payment.total_amount_due || payment.appointment_total_cost || 0
          const paidAmount = payment.amount || 0

          if (!appointmentGroups.has(appointmentId)) {
            appointmentGroups.set(appointmentId, {
              totalDue: typeof totalDue === 'number' ? totalDue : parseFloat(totalDue) || 0,
              totalPaid: 0
            })
          }

          const group = appointmentGroups.get(appointmentId)!
          group.totalPaid += typeof paidAmount === 'number' ? paidAmount : parseFloat(paidAmount) || 0
        } else {
          // مدفوعات عامة غير مرتبطة بمواعيد أو علاجات
          const totalDue = payment.total_amount_due || payment.amount || 0
          const paid = payment.amount_paid || payment.amount || 0
          const totalDueNum = typeof totalDue === 'number' ? totalDue : parseFloat(totalDue) || 0
          const paidNum = typeof paid === 'number' ? paid : parseFloat(paid) || 0
          generalRemainingBalance += Math.max(0, totalDueNum - paidNum)
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
    const totalRemainingBalance = appointmentRemainingBalance + treatmentRemainingBalance + generalRemainingBalance

    return {
      totalRevenue,
      pendingAmount,
      overdueAmount,
      completedAmount: totalRevenue,
      totalRemainingBalance
    }
  }, [filteredData])

  // Group data by time periods for charts
  const groupedData = useMemo(() => {
    const groups: { [key: string]: T[] } = {}

    filteredData.forEach(item => {
      const itemDate = new Date(item[dateField] as string)
      let groupKey = ''

      switch (timeFilter.preset) {
        case 'today':
          groupKey = itemDate.toLocaleTimeString('ar-SA', { hour: '2-digit' })
          break
        case 'week':
          groupKey = itemDate.toLocaleDateString('ar-SA', { weekday: 'short' })
          break
        case 'month':
          groupKey = itemDate.getDate().toString()
          break
        case 'year':
          groupKey = itemDate.toLocaleDateString('ar-SA', { month: 'short' })
          break
        default:
          groupKey = itemDate.toLocaleDateString('ar-SA')
      }

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(item)
    })

    return groups
  }, [filteredData, timeFilter.preset, dateField])

  // Calculate trend (comparison with previous period)
  const trend = useMemo(() => {
    if (!data || !Array.isArray(data) || !timeFilter.startDate || !timeFilter.endDate) return null

    const currentStart = new Date(timeFilter.startDate)
    const currentEnd = new Date(timeFilter.endDate)
    const periodLength = currentEnd.getTime() - currentStart.getTime()

    const previousStart = new Date(currentStart.getTime() - periodLength)
    const previousEnd = new Date(currentStart.getTime() - 1)

    const previousData = data.filter(item => {
      const itemDate = new Date(item[dateField] as string)
      return itemDate >= previousStart && itemDate <= previousEnd
    })

    const currentCount = filteredData.length
    const previousCount = previousData.length

    if (previousCount === 0) return null

    const changePercent = ((currentCount - previousCount) / previousCount) * 100

    return {
      current: currentCount,
      previous: previousCount,
      change: currentCount - previousCount,
      changePercent: Math.round(changePercent * 100) / 100,
      isPositive: changePercent >= 0
    }
  }, [data, filteredData, timeFilter, dateField])

  const handleFilterChange = (newFilter: TimeFilterOptions) => {
    setTimeFilter(newFilter)
  }

  const resetFilter = () => {
    setTimeFilter(getDefaultFilter())
  }

  return {
    timeFilter,
    filteredData,
    stats,
    financialStats,
    groupedData,
    trend,
    handleFilterChange,
    resetFilter
  }
}

export default useTimeFilteredStats
