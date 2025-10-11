import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { DashboardStats } from '../types'

// Conversion function to transform snake_case API response to camelCase for store
const convertStatsToCamelCase = (apiStats: any): DashboardStats => ({
  total_patients: apiStats.total_patients || apiStats.totalPatients || 0,
  total_appointments: apiStats.total_appointments || apiStats.totalAppointments || 0,
  total_revenue: apiStats.total_revenue || apiStats.totalRevenue || 0,
  pending_payments: apiStats.pending_payments || apiStats.pendingPayments || 0,
  today_appointments: apiStats.today_appointments || apiStats.todayAppointments || 0,
  this_month_revenue: apiStats.this_month_revenue || apiStats.thisMonthRevenue || 0,
  low_stock_items: apiStats.low_stock_items || apiStats.lowStockItems || 0
})

// Conversion function to transform camelCase store data back to snake_case for API compatibility if needed
const convertStatsToSnakeCase = (stats: DashboardStats): any => ({
  total_patients: stats.total_patients,
  total_appointments: stats.total_appointments,
  total_revenue: stats.total_revenue,
  pending_payments: stats.pending_payments,
  today_appointments: stats.today_appointments,
  this_month_revenue: stats.this_month_revenue,
  low_stock_items: stats.low_stock_items
})

interface StoreStats {
  totalPatients: number
  totalAppointments: number
  totalRevenue: number
  pendingPayments: number
  todayAppointments: number
  thisMonthRevenue: number
  lowStockItems: number
}

interface DashboardState {
  stats: StoreStats
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

interface DashboardActions {
  loadStats: () => Promise<void>
  updateStats: (stats: Partial<DashboardStats>) => void
  clearError: () => void
  refreshStats: () => Promise<void>
}

type DashboardStore = DashboardState & DashboardActions

// Cache configuration
const CACHE_KEY = 'dashboard-stats'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const statsCache = new Map<string, { data: DashboardStats; timestamp: number }>()

// Cache utility functions
const getCachedStats = (): StoreStats | null => {
  const cached = statsCache.get(CACHE_KEY)
  if (!cached) return null
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    statsCache.delete(CACHE_KEY)
    return null
  }
  const data = cached.data as DashboardStats
  return {
    totalPatients: data.total_patients,
    totalAppointments: data.total_appointments,
    totalRevenue: data.total_revenue,
    pendingPayments: data.pending_payments,
    todayAppointments: data.today_appointments,
    thisMonthRevenue: data.this_month_revenue,
    lowStockItems: data.low_stock_items
  }
}

const setCachedStats = (stats: StoreStats) => {
  const apiStats: DashboardStats = {
    total_patients: stats.totalPatients,
    total_appointments: stats.totalAppointments,
    total_revenue: stats.totalRevenue,
    pending_payments: stats.pendingPayments,
    today_appointments: stats.todayAppointments,
    this_month_revenue: stats.thisMonthRevenue,
    low_stock_items: stats.lowStockItems
  }
  statsCache.set(CACHE_KEY, { data: apiStats, timestamp: Date.now() })
}

const clearStatsCache = () => {
  statsCache.delete(CACHE_KEY)
}

export const useDashboardStore = create<DashboardStore>()(
  devtools(
    (set, get) => {
      // Cache invalidation events
      if (typeof window !== 'undefined') {
        const invalidationEvents = [
          'patient-deleted',
          'patient-added',
          'patient-updated',
          'appointment-changed',
          'payment-changed',
          'inventory-changed',
          'clinic-needs-changed',
          'clinic-expenses-changed',
          'treatment-changed',
          'treatment-updated',
          'treatments-loaded'
        ]

        invalidationEvents.forEach(eventName => {
          window.addEventListener(eventName, () => {
            clearStatsCache()
          })
        })

        // Listen for patient deletion events to update dashboard stats
        window.addEventListener('patient-deleted', async (event: any) => {
          // Refresh dashboard stats after patient deletion
          await get().refreshStats()
        })
      }

      return {
        // Initial state
        stats: {
          totalPatients: 0,
          totalAppointments: 0,
          totalRevenue: 0,
          pendingPayments: 0,
          todayAppointments: 0,
          thisMonthRevenue: 0,
          lowStockItems: 0
        },
        isLoading: false,
        error: null,
        lastUpdated: null,

        // Actions
        loadStats: async () => {
          set({ isLoading: true, error: null })
          try {
            // Check cache first
            const cachedStats = getCachedStats()
            if (cachedStats) {
              set({
                stats: cachedStats,
                isLoading: false,
                lastUpdated: new Date()
              })
              return
            }

            // Batch API calls for better performance - get multiple stats in parallel if available
            const [
              dashboardStats,
              patientsData,
              appointmentsData,
              paymentsData
            ] = await Promise.all([
              window.electronAPI?.dashboard?.getStats(),
              window.electronAPI?.patients?.getAll()?.catch(() => []),
              window.electronAPI?.appointments?.getAll()?.catch(() => []),
              window.electronAPI?.payments?.getAll()?.catch(() => [])
            ])

            let stats: StoreStats

            if (dashboardStats) {
              // Use API stats if available (preferred method)
              stats = {
                totalPatients: dashboardStats.total_patients || 0,
                totalAppointments: dashboardStats.total_appointments || 0,
                totalRevenue: dashboardStats.total_revenue || 0,
                pendingPayments: dashboardStats.pending_payments || 0,
                todayAppointments: dashboardStats.today_appointments || 0,
                thisMonthRevenue: dashboardStats.this_month_revenue || 0,
                lowStockItems: dashboardStats.low_stock_items || 0
              }
            } else {
              // Fallback calculation from batched data
              const totalPatients = patientsData?.length || 0
              const totalAppointments = appointmentsData?.length || 0

              // Calculate revenue from payments
              const totalRevenue = paymentsData?.reduce((sum: number, payment: any) =>
                sum + (payment.amount || 0), 0) || 0

              // Calculate pending payments
              const pendingPayments = paymentsData?.filter((p: any) =>
                p.status === 'pending').length || 0

              // Calculate today's appointments
              const today = new Date().toISOString().split('T')[0]
              const todayAppointments = appointmentsData?.filter((apt: any) =>
                apt.start_time?.startsWith(today)).length || 0

              // Calculate this month's revenue
              const thisMonth = new Date().toISOString().slice(0, 7)
              const thisMonthRevenue = paymentsData?.filter((p: any) =>
                p.status === 'completed' && p.payment_date?.startsWith(thisMonth)
              ).reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0) || 0

              // Calculate low stock items (fallback to 0 since we don't have inventory data)
              const lowStockItems = 0

              stats = {
                totalPatients,
                totalAppointments,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                pendingPayments,
                todayAppointments,
                thisMonthRevenue: Math.round(thisMonthRevenue * 100) / 100,
                lowStockItems
              }
            }

            // Cache the stats
            setCachedStats(stats)

            set({
              stats,
              isLoading: false,
              lastUpdated: new Date()
            })
          } catch (error) {
            console.error('Error loading dashboard stats:', error)
            set({
              error: error instanceof Error ? error.message : 'Failed to load dashboard stats',
              isLoading: false
            })
          }
        },

        updateStats: (newStats) => {
          const { stats } = get()
          set({
            stats: { ...stats, ...newStats },
            lastUpdated: new Date()
          })
        },

        clearError: () => {
          set({ error: null })
        },

        refreshStats: async () => {
          // Refresh stats without showing loading state (for background updates)
          try {
            const apiResponse = await window.electronAPI?.dashboard?.getStats()
            if (apiResponse) {
              const stats: StoreStats = {
                totalPatients: apiResponse.total_patients || 0,
                totalAppointments: apiResponse.total_appointments || 0,
                totalRevenue: apiResponse.total_revenue || 0,
                pendingPayments: apiResponse.pending_payments || 0,
                todayAppointments: apiResponse.today_appointments || 0,
                thisMonthRevenue: apiResponse.this_month_revenue || 0,
                lowStockItems: apiResponse.low_stock_items || 0
              }

              set({
                stats,
                lastUpdated: new Date()
              })

              // Update cache with new stats
              setCachedStats(stats)
            }
            
          } catch (error) {
            console.error('Error refreshing dashboard stats:', error)
          }
        }
      }
    },
    {
      name: 'dashboard-store',
    }
  )
)
