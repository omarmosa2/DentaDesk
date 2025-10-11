import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  ReportData,
  ReportFilter,
  PatientReportData,
  AppointmentReportData,
  FinancialReportData,
  InventoryReportData,
  AnalyticsReportData,
  TreatmentReportData,
  ClinicNeedsReportData,
  ReportExportOptions
} from '../types'

interface ReportsState {
  // Data
  reportData: ReportData | null
  patientReports: PatientReportData | null
  appointmentReports: AppointmentReportData | null
  financialReports: FinancialReportData | null
  inventoryReports: InventoryReportData | null
  analyticsReports: AnalyticsReportData | null
  treatmentReports: TreatmentReportData | null
  clinicNeedsReports: ClinicNeedsReportData | null

  // UI State
  isLoading: boolean
  isExporting: boolean
  error: string | null
  activeReportType: 'overview' | 'patients' | 'appointments' | 'financial' | 'inventory' | 'analytics' | 'treatments' | 'clinicNeeds'

  // Filters
  currentFilter: ReportFilter
  savedFilters: { name: string; filter: ReportFilter }[]

  // Cache
  cachedReports: Map<string, { data: any; timestamp: number }>
  cacheExpiry: number // in milliseconds

  // Auto-refresh management
  autoRefreshInterval: NodeJS.Timeout | null
}

interface ReportsActions {
  // Data operations
  generateReport: (type: ReportsState['activeReportType'], filter?: Partial<ReportFilter>) => Promise<void>
  generateAllReports: (filter?: Partial<ReportFilter>) => Promise<void>
  refreshReports: () => Promise<void>

  // Filter operations
  setFilter: (filter: Partial<ReportFilter>) => void
  resetFilter: () => void
  saveFilter: (name: string) => void
  loadFilter: (name: string) => void
  deleteFilter: (name: string) => void

  // UI operations
  setActiveReportType: (type: ReportsState['activeReportType']) => void
  clearError: () => void

  // Export operations
  exportReport: (type: ReportsState['activeReportType'], options: ReportExportOptions) => Promise<void>

  // Cache operations
  clearCache: () => void
  getCachedReport: (key: string) => any | null
  setCachedReport: (key: string, data: any) => void

  // Auto-refresh operations
  startAutoRefresh: (intervalMinutes?: number) => void
  stopAutoRefresh: () => void
  syncReportsData: () => Promise<void>
}

type ReportsStore = ReportsState & ReportsActions

const getDefaultFilter = (): ReportFilter => {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  return {
    dateRange: {
      start: startOfMonth.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
      preset: 'month'
    }
  }
}

const generateCacheKey = (type: string, filter: ReportFilter): string => {
  return `${type}_${JSON.stringify(filter)}`
}

export const useReportsStore = create<ReportsStore>()(
  devtools(
    (set, get) => {
      // Listen for patient-related events to auto-refresh reports
      if (typeof window !== 'undefined') {
        // Auto-refresh when patient is deleted
        window.addEventListener('patient-deleted', async (event: any) => {
          const { clearCache, generateReport } = get()
          clearCache()
          try {
            await generateReport('patients')
          } catch (error) {
            console.error('Error refreshing reports after patient deletion:', error)
          }
        })

        // Auto-refresh when patient is added
        window.addEventListener('patient-added', async (event: any) => {
          const { clearCache, generateReport } = get()
          clearCache()
          try {
            await generateReport('patients')
          } catch (error) {
            console.error('Error refreshing reports after patient addition:', error)
          }
        })

        // Auto-refresh when patient is updated
        window.addEventListener('patient-updated', async (event: any) => {
          const { clearCache, generateReport } = get()
          clearCache()
          try {
            await generateReport('patients')
          } catch (error) {
            console.error('Error refreshing reports after patient update:', error)
          }
        })

        // Auto-refresh when appointment is added/updated/deleted
        window.addEventListener('appointment-changed', async (event: any) => {
          const { clearCache, generateReport } = get()
          clearCache()
          try {
            await generateReport('appointments')
          } catch (error) {
            console.error('Error refreshing appointment reports:', error)
          }
        })

        // Auto-refresh when payment is added/updated/deleted
        window.addEventListener('payment-changed', async (event: any) => {
          const { clearCache, generateReport } = get()
          clearCache()
          try {
            await generateReport('financial')
          } catch (error) {
            console.error('Error refreshing financial reports:', error)
          }
        })

        // Auto-refresh when inventory is added/updated/deleted
        window.addEventListener('inventory-changed', async (event: any) => {
          const { clearCache, generateReport } = get()
          clearCache()
          try {
            await generateReport('inventory')
          } catch (error) {
            console.error('Error refreshing inventory reports:', error)
          }
        })

        // Auto-refresh when clinic needs are added/updated/deleted
        window.addEventListener('clinic-needs-changed', async (event: any) => {
          const { clearCache, generateReport } = get()
          clearCache()
          try {
            await generateReport('clinicNeeds')
          } catch (error) {
            console.error('Error refreshing clinic needs reports:', error)
          }
        })
      }

      return {
        // Initial state
        reportData: null,
        patientReports: null,
        appointmentReports: null,
        financialReports: null,
        inventoryReports: null,
        analyticsReports: null,
        treatmentReports: null,
        clinicNeedsReports: null,
        isLoading: false,
        isExporting: false,
        error: null,
        activeReportType: 'overview',
        currentFilter: getDefaultFilter(),
        savedFilters: [],
        cachedReports: new Map(),
        cacheExpiry: 5 * 60 * 1000, // 5 minutes
        autoRefreshInterval: null,

      // Data operations
      generateReport: async (type, filterOverride) => {
        const { currentFilter, getCachedReport, setCachedReport, cacheExpiry } = get()
        const filter = { ...currentFilter, ...filterOverride }
        const cacheKey = generateCacheKey(type, filter)

        // Check cache first
        const cached = getCachedReport(cacheKey)
        if (cached) {
          set({ [`${type}Reports`]: cached, isLoading: false })
          return
        }

        set({ isLoading: true, error: null })

        try {
          let reportData: any = null

          switch (type) {
            case 'patients':
              reportData = await window.electronAPI?.reports?.generatePatientReport(filter)
              set({ patientReports: reportData })
              break
            case 'appointments':
              reportData = await window.electronAPI?.reports?.generateAppointmentReport(filter)
              set({ appointmentReports: reportData })
              break
            case 'financial':
              reportData = await window.electronAPI?.reports?.generateFinancialReport(filter)
              set({ financialReports: reportData })
              break
            case 'inventory':
              reportData = await window.electronAPI?.reports?.generateInventoryReport(filter)
              set({ inventoryReports: reportData })
              break
            case 'analytics':
              reportData = await window.electronAPI?.reports?.generateAnalyticsReport(filter)
              set({ analyticsReports: reportData })
              break
            case 'treatments':
              reportData = await window.electronAPI?.reports?.generateTreatmentReport(filter)
              set({ treatmentReports: reportData })
              break
            case 'clinicNeeds':
              reportData = await get().generateClinicNeedsReport(filter)
              set({ clinicNeedsReports: reportData })
              break
            case 'overview':
              reportData = await window.electronAPI?.reports?.generateOverviewReport(filter)
              set({ reportData })
              break
          }

          // Cache the result
          if (reportData) {
            setCachedReport(cacheKey, reportData)
          }

          set({ isLoading: false })
        } catch (error) {
          console.error(`❌ Error generating ${type} report:`, error)
          set({
            error: error instanceof Error ? error.message : `Failed to generate ${type} report`,
            isLoading: false
          })
        }
      },

      generateAllReports: async (filterOverride) => {
        const { generateReport } = get()
        const reportTypes: ReportsState['activeReportType'][] = [
          'patients', 'appointments', 'financial', 'inventory', 'analytics', 'treatments', 'clinicNeeds'
        ]

        set({ isLoading: true, error: null })

        try {
          // Generate reports sequentially to avoid overwhelming the system
          for (const type of reportTypes) {
            await generateReport(type, filterOverride)
          }

          set({ isLoading: false })
        } catch (error) {
          console.error('❌ Error generating all reports:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to generate reports',
            isLoading: false
          })
        }
      },

      refreshReports: async () => {
        const { activeReportType, currentFilter, clearCache } = get()
        clearCache()
        await get().generateReport(activeReportType, currentFilter)
      },

      // Filter operations
      setFilter: (filter) => {
        set({ currentFilter: { ...get().currentFilter, ...filter } })
      },

      resetFilter: () => {
        set({ currentFilter: getDefaultFilter() })
      },

      saveFilter: (name) => {
        const { currentFilter, savedFilters } = get()
        const newFilter = { name, filter: currentFilter }
        const existingIndex = savedFilters.findIndex(f => f.name === name)

        if (existingIndex >= 0) {
          const updated = [...savedFilters]
          updated[existingIndex] = newFilter
          set({ savedFilters: updated })
        } else {
          set({ savedFilters: [...savedFilters, newFilter] })
        }
      },

      loadFilter: (name) => {
        const { savedFilters } = get()
        const savedFilter = savedFilters.find(f => f.name === name)
        if (savedFilter) {
          set({ currentFilter: savedFilter.filter })
        }
      },

      deleteFilter: (name) => {
        const { savedFilters } = get()
        set({ savedFilters: savedFilters.filter(f => f.name !== name) })
      },

      // UI operations
      setActiveReportType: (type) => {
        set({ activeReportType: type })
      },

      clearError: () => {
        set({ error: null })
      },

      // Export operations
      exportReport: async (type, options) => {
        set({ isExporting: true, error: null })

        try {
          const { currentFilter } = get()
          const result = await window.electronAPI?.reports?.exportReport(type, currentFilter, options)
          set({ isExporting: false })

          if (result?.success) {
            // Show success notification
            const event = new CustomEvent('showToast', {
              detail: {
                title: 'تم التصدير بنجاح',
                description: `تم حفظ التقرير في: ${result.filePath}`,
                type: 'success'
              }
            })
            window.dispatchEvent(event)
          } else {
            throw new Error(result?.message || 'فشل في تصدير التقرير')
          }

          return result
        } catch (error) {
          console.error('Error exporting report:', error)
          const errorMessage = error instanceof Error ? error.message : 'Failed to export report'
          set({
            error: errorMessage,
            isExporting: false
          })

          // Show error notification
          const event = new CustomEvent('showToast', {
            detail: {
              title: 'خطأ في التصدير',
              description: errorMessage,
              type: 'error'
            }
          })
          window.dispatchEvent(event)

          throw error
        }
      },

      // Cache operations
      clearCache: () => {
        set({ cachedReports: new Map() })
      },

      // Auto-refresh operations
      startAutoRefresh: (intervalMinutes = 5) => {
        const { stopAutoRefresh } = get()
        stopAutoRefresh() // Clear any existing interval

        const interval = setInterval(async () => {
          const { activeReportType, generateReport, generateAllReports } = get()
          try {
            if (activeReportType === 'overview') {
              await generateAllReports()
            } else {
              await generateReport(activeReportType)
            }
          } catch (error) {
            console.error('Auto-refresh failed:', error)
          }
        }, intervalMinutes * 60 * 1000)

        set({ autoRefreshInterval: interval })
      },

      stopAutoRefresh: () => {
        const { autoRefreshInterval } = get()
        if (autoRefreshInterval) {
          clearInterval(autoRefreshInterval)
          set({ autoRefreshInterval: null })
        }
      },

      // Real-time data sync
      syncReportsData: async () => {
        const { generateAllReports } = get()
        try {
          await generateAllReports()

          // Show sync notification
          const event = new CustomEvent('showToast', {
            detail: {
              title: 'تم تحديث البيانات',
              description: 'تم مزامنة جميع التقارير بنجاح',
              type: 'success'
            }
          })
          window.dispatchEvent(event)
        } catch (error) {
          console.error('Data sync failed:', error)

          // Show error notification
          const event = new CustomEvent('showToast', {
            detail: {
              title: 'خطأ في المزامنة',
              description: 'فشل في تحديث البيانات',
              type: 'error'
            }
          })
          window.dispatchEvent(event)
        }
      },

      getCachedReport: (key) => {
        const { cachedReports, cacheExpiry } = get()
        const cached = cachedReports.get(key)

        if (cached && Date.now() - cached.timestamp < cacheExpiry) {
          return cached.data
        }

        return null
      },

      setCachedReport: (key, data) => {
        const { cachedReports } = get()
        const newCache = new Map(cachedReports)
        newCache.set(key, { data, timestamp: Date.now() })
        set({ cachedReports: newCache })
      },

      // Generate clinic needs report locally
      generateClinicNeedsReport: async (filter?: ReportFilter): Promise<ClinicNeedsReportData> => {
        try {
          // Get clinic needs data
          const clinicNeeds = await window.electronAPI?.clinicNeeds?.getAll() || []

          // Apply date filtering if specified
          let filteredNeeds = clinicNeeds
          if (filter?.startDate && filter?.endDate) {
            const startDate = new Date(filter.startDate)
            const endDate = new Date(filter.endDate)
            filteredNeeds = clinicNeeds.filter(need => {
              const needDate = new Date(need.created_at)
              return needDate >= startDate && needDate <= endDate
            })
          }

          // Calculate basic statistics
          const totalNeeds = filteredNeeds.length
          const totalValue = filteredNeeds.reduce((sum, need) => sum + (need.price * need.quantity), 0)
          const averageNeedValue = totalNeeds > 0 ? totalValue / totalNeeds : 0

          // Count by status
          const pendingCount = filteredNeeds.filter(need => need.status === 'pending').length
          const orderedCount = filteredNeeds.filter(need => need.status === 'ordered').length
          const receivedCount = filteredNeeds.filter(need => need.status === 'received').length
          const cancelledCount = filteredNeeds.filter(need => need.status === 'cancelled').length

          // Count by priority
          const urgentCount = filteredNeeds.filter(need => need.priority === 'urgent').length
          const highPriorityCount = filteredNeeds.filter(need => need.priority === 'high').length
          const mediumPriorityCount = filteredNeeds.filter(need => need.priority === 'medium').length
          const lowPriorityCount = filteredNeeds.filter(need => need.priority === 'low').length

          // Calculate rates
          const completionRate = totalNeeds > 0 ? (receivedCount / totalNeeds) * 100 : 0
          const urgencyRate = totalNeeds > 0 ? (urgentCount / totalNeeds) * 100 : 0

          // Group by status with percentages and values
          const needsByStatus = [
            { status: 'pending', count: pendingCount, percentage: totalNeeds > 0 ? (pendingCount / totalNeeds) * 100 : 0, value: filteredNeeds.filter(n => n.status === 'pending').reduce((sum, n) => sum + (n.price * n.quantity), 0) },
            { status: 'ordered', count: orderedCount, percentage: totalNeeds > 0 ? (orderedCount / totalNeeds) * 100 : 0, value: filteredNeeds.filter(n => n.status === 'ordered').reduce((sum, n) => sum + (n.price * n.quantity), 0) },
            { status: 'received', count: receivedCount, percentage: totalNeeds > 0 ? (receivedCount / totalNeeds) * 100 : 0, value: filteredNeeds.filter(n => n.status === 'received').reduce((sum, n) => sum + (n.price * n.quantity), 0) },
            { status: 'cancelled', count: cancelledCount, percentage: totalNeeds > 0 ? (cancelledCount / totalNeeds) * 100 : 0, value: filteredNeeds.filter(n => n.status === 'cancelled').reduce((sum, n) => sum + (n.price * n.quantity), 0) }
          ]

          // Group by priority with percentages and values
          const needsByPriority = [
            { priority: 'urgent', count: urgentCount, percentage: totalNeeds > 0 ? (urgentCount / totalNeeds) * 100 : 0, value: filteredNeeds.filter(n => n.priority === 'urgent').reduce((sum, n) => sum + (n.price * n.quantity), 0) },
            { priority: 'high', count: highPriorityCount, percentage: totalNeeds > 0 ? (highPriorityCount / totalNeeds) * 100 : 0, value: filteredNeeds.filter(n => n.priority === 'high').reduce((sum, n) => sum + (n.price * n.quantity), 0) },
            { priority: 'medium', count: mediumPriorityCount, percentage: totalNeeds > 0 ? (mediumPriorityCount / totalNeeds) * 100 : 0, value: filteredNeeds.filter(n => n.priority === 'medium').reduce((sum, n) => sum + (n.price * n.quantity), 0) },
            { priority: 'low', count: lowPriorityCount, percentage: totalNeeds > 0 ? (lowPriorityCount / totalNeeds) * 100 : 0, value: filteredNeeds.filter(n => n.priority === 'low').reduce((sum, n) => sum + (n.price * n.quantity), 0) }
          ]

          // Group by category
          const categoryMap = new Map<string, { count: number; value: number }>()
          filteredNeeds.forEach(need => {
            const category = need.category || 'غير محدد'
            const existing = categoryMap.get(category) || { count: 0, value: 0 }
            categoryMap.set(category, {
              count: existing.count + 1,
              value: existing.value + (need.price * need.quantity)
            })
          })
          const needsByCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
            category,
            count: data.count,
            value: data.value
          }))

          // Group by supplier
          const supplierMap = new Map<string, { count: number; value: number }>()
          filteredNeeds.forEach(need => {
            const supplier = need.supplier || 'غير محدد'
            const existing = supplierMap.get(supplier) || { count: 0, value: 0 }
            supplierMap.set(supplier, {
              count: existing.count + 1,
              value: existing.value + (need.price * need.quantity)
            })
          })
          const needsBySupplier = Array.from(supplierMap.entries()).map(([supplier, data]) => ({
            supplier,
            count: data.count,
            value: data.value
          }))

          // Generate trend data (last 6 months)
          const needsTrend = []
          for (let i = 5; i >= 0; i--) {
            const date = new Date()
            date.setMonth(date.getMonth() - i)
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

            const monthNeeds = clinicNeeds.filter(need => {
              const needDate = new Date(need.created_at)
              return needDate >= monthStart && needDate <= monthEnd
            })

            needsTrend.push({
              period: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
              count: monthNeeds.length,
              value: monthNeeds.reduce((sum, need) => sum + (need.price * need.quantity), 0)
            })
          }

          // Top expensive needs
          const topExpensiveNeeds = filteredNeeds
            .map(need => ({
              need_name: need.need_name,
              value: need.price * need.quantity,
              quantity: need.quantity
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10)

          // Special lists
          const pendingNeeds = filteredNeeds.filter(need => need.status === 'pending').slice(0, 10)
          const urgentNeeds = filteredNeeds.filter(need => need.priority === 'urgent').slice(0, 10)
          const overdueNeeds = filteredNeeds.filter(need => {
            const createdDate = new Date(need.created_at)
            const daysDiff = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
            return need.status === 'pending' && daysDiff > 30
          }).slice(0, 10)
          const recentlyReceived = filteredNeeds
            .filter(need => need.status === 'received')
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 10)

          return {
            totalNeeds,
            totalValue,
            pendingCount,
            orderedCount,
            receivedCount,
            cancelledCount,
            urgentCount,
            highPriorityCount,
            mediumPriorityCount,
            lowPriorityCount,
            averageNeedValue,
            completionRate,
            urgencyRate,
            needsByStatus,
            needsByPriority,
            needsByCategory,
            needsBySupplier,
            needsTrend,
            topExpensiveNeeds,
            pendingNeeds,
            urgentNeeds,
            overdueNeeds,
            recentlyReceived,
            needsList: filteredNeeds,
            filterInfo: filter ? `${filter.startDate} - ${filter.endDate}` : 'جميع البيانات',
            dataCount: filteredNeeds.length
          }
        } catch (error) {
          console.error('Error generating clinic needs report:', error)
          throw error
        }
      }
      }
    }),
    {
      name: 'reports-store'
    }
  )
