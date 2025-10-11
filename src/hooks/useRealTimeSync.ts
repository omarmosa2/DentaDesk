import { useEffect, useRef } from 'react'
import { usePatientStore } from '../store/patientStore'
import { useAppointmentStore } from '../store/appointmentStore'
import { usePaymentStore } from '../store/paymentStore'
import { useDashboardStore } from '../store/dashboardStore'
import { useInventoryStore } from '../store/inventoryStore'

/**
 * Custom hook for real-time data synchronization across all stores
 * Ensures that when data changes in one store, all related stores are updated
 */
export const useRealTimeSync = () => {
  const loadPatients = usePatientStore(state => state.loadPatients)
  const loadAppointments = useAppointmentStore(state => state.loadAppointments)
  const loadPayments = usePaymentStore(state => state.loadPayments)
  const refreshDashboardStats = useDashboardStore(state => state.refreshStats)
  const loadInventoryItems = useInventoryStore(state => state.loadItems)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const rafIdRef = useRef<number | null>(null)

  useEffect(() => {
    // Listen for patient deletion events
    const handlePatientDeleted = async (event: Event) => {
      const customEvent = event as CustomEvent
      const { patientId, patientName } = customEvent.detail

      console.log(`🔄 Real-time sync: Patient ${patientName} (${patientId}) deleted, updating all stores...`)

      // The individual stores will handle their own updates via their event listeners
      // This is just for additional coordination and logging

      // Optional: Force refresh dashboard stats after a short delay
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null
        timeoutRef.current = setTimeout(async () => {
          try {
            await refreshDashboardStats()
            console.log('📊 Dashboard stats refreshed via real-time sync')
          } catch (error) {
            console.error('Error refreshing dashboard stats:', error)
          }
          timeoutRef.current = null
        }, 200)
      })
    }

    // Listen for appointment changes that might affect other stores
    const handleAppointmentChanged = async (event: Event) => {
      const customEvent = event as CustomEvent
      const { type, appointmentId } = customEvent.detail

      console.log(`🔄 Real-time sync: Appointment ${type} (${appointmentId})`)

      // Refresh dashboard stats when appointments change
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null
        timeoutRef.current = setTimeout(async () => {
          try {
            await refreshDashboardStats()
          } catch (error) {
            console.error('Error refreshing dashboard stats after appointment change:', error)
          }
          timeoutRef.current = null
        }, 150)
      })
    }

    // Listen for payment changes that might affect other stores
    const handlePaymentChanged = async (event: Event) => {
      const customEvent = event as CustomEvent
      const { type, paymentId } = customEvent.detail

      console.log(`🔄 Real-time sync: Payment ${type} (${paymentId})`)

      // Refresh dashboard stats when payments change
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null
        timeoutRef.current = setTimeout(async () => {
          try {
            await refreshDashboardStats()
          } catch (error) {
            console.error('Error refreshing dashboard stats after payment change:', error)
          }
          timeoutRef.current = null
        }, 150)
      })
    }

    // Listen for inventory changes that might affect other stores
    const handleInventoryChanged = async (event: Event) => {
      const customEvent = event as CustomEvent
      const { type, itemId } = customEvent.detail

      console.log(`🔄 Real-time sync: Inventory ${type} (${itemId})`)

      // Refresh dashboard stats when inventory changes
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null
        timeoutRef.current = setTimeout(async () => {
          try {
            await refreshDashboardStats()
          } catch (error) {
            console.error('Error refreshing dashboard stats after inventory change:', error)
          }
          timeoutRef.current = null
        }, 150)
      })
    }

    // Add event listeners
    window.addEventListener('patient-deleted', handlePatientDeleted)
    window.addEventListener('appointment-changed', handleAppointmentChanged)
    window.addEventListener('payment-changed', handlePaymentChanged)
    window.addEventListener('inventory-changed', handleInventoryChanged)

    // Cleanup event listeners
    return () => {
      // Clear any pending operations
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }

      window.removeEventListener('patient-deleted', handlePatientDeleted)
      window.removeEventListener('appointment-changed', handleAppointmentChanged)
      window.removeEventListener('payment-changed', handlePaymentChanged)
      window.removeEventListener('inventory-changed', handleInventoryChanged)
    }
  }, [refreshDashboardStats])

  // Return functions for manual synchronization if needed
  return {
    syncAll: async () => {
      console.log('🔄 Manual sync: Refreshing all stores...')
      try {
        await Promise.all([
          loadPatients(),
          loadAppointments(),
          loadPayments(),
          loadInventoryItems(),
          refreshDashboardStats()
        ])
        console.log('✅ Manual sync completed successfully')
      } catch (error) {
        console.error('❌ Manual sync failed:', error)
      }
    },

    syncAfterPatientDeletion: async (patientId: string, patientName: string) => {
      console.log(`🔄 Sync after patient deletion: ${patientName} (${patientId})`)

      // Emit custom event to trigger all store updates
      window.dispatchEvent(new CustomEvent('patient-deleted', {
        detail: { patientId, patientName }
      }))

      // Additional manual refresh as backup with optimized timing
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null
        timeoutRef.current = setTimeout(async () => {
          try {
            await refreshDashboardStats()
          } catch (error) {
            console.error('Error in backup sync after patient deletion:', error)
          }
          timeoutRef.current = null
        }, 300)
      })
    }
  }
}

/**
 * Hook for components that need to trigger data refresh
 */
export const useDataRefresh = () => {
  const loadPatients = usePatientStore(state => state.loadPatients)
  const loadAppointments = useAppointmentStore(state => state.loadAppointments)
  const loadPayments = usePaymentStore(state => state.loadPayments)
  const loadDashboardStats = useDashboardStore(state => state.loadStats)
  const loadInventoryItems = useInventoryStore(state => state.loadItems)

  return {
    refreshPatients: loadPatients,
    refreshAppointments: loadAppointments,
    refreshPayments: loadPayments,
    refreshInventory: loadInventoryItems,
    refreshDashboard: loadDashboardStats,
    refreshAll: async () => {
      await Promise.all([
        loadPatients(),
        loadAppointments(),
        loadPayments(),
        loadInventoryItems(),
        loadDashboardStats()
      ])
    }
  }
}
