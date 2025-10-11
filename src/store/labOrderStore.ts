import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { LabOrder } from '../types'

interface LabOrderState {
  labOrders: LabOrder[]
  filteredLabOrders: LabOrder[]
  selectedLabOrder: LabOrder | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  statusFilter: string
  labFilter: string
  dateRangeFilter: { start: string; end: string }

  // Statistics
  totalOrders: number
  totalCost: number
  totalPaid: number
  totalRemaining: number
  pendingOrders: number
  completedOrders: number
  cancelledOrders: number
}

interface LabOrderActions {
  // Data operations
  loadLabOrders: () => Promise<void>
  createLabOrder: (labOrder: Omit<LabOrder, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateLabOrder: (id: string, labOrder: Partial<LabOrder>) => Promise<void>
  deleteLabOrder: (id: string) => Promise<void>

  // UI state operations
  setSelectedLabOrder: (labOrder: LabOrder | null) => void
  setSearchQuery: (query: string) => void
  setStatusFilter: (status: string) => void
  setLabFilter: (labId: string) => void
  setDateRangeFilter: (range: { start: string; end: string }) => void
  filterLabOrders: () => void
  clearFilters: () => void
  clearError: () => void

  // Analytics
  calculateStatistics: () => void
  getOrdersByLab: (labId: string) => LabOrder[]
  getOrdersByPatient: (patientId: string) => LabOrder[]
  getOrdersByStatus: (status: string) => LabOrder[]
  getOrdersByDateRange: (startDate: Date, endDate: Date) => LabOrder[]
  getLabOrdersByTreatment: (treatmentId: string) => LabOrder[]
}

type LabOrderStore = LabOrderState & LabOrderActions

export const useLabOrderStore = create<LabOrderStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      labOrders: [],
      filteredLabOrders: [],
      selectedLabOrder: null,
      isLoading: false,
      error: null,
      searchQuery: '',
      statusFilter: 'all',
      labFilter: 'all',
      dateRangeFilter: { start: '', end: '' },

      // Statistics
      totalOrders: 0,
      totalCost: 0,
      totalPaid: 0,
      totalRemaining: 0,
      pendingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,

      // Data operations
      loadLabOrders: async () => {
        set({ isLoading: true, error: null })
        try {
          const labOrders = await window.electronAPI?.labOrders?.getAll() || []

          set({
            labOrders,
            filteredLabOrders: labOrders,
            isLoading: false
          })
          get().calculateStatistics()
          get().filterLabOrders()
        } catch (error) {
          console.error('❌ [DEBUG] Error loading lab orders:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to load lab orders',
            isLoading: false
          })
        }
      },

      createLabOrder: async (labOrderData) => {
        set({ isLoading: true, error: null })
        try {

          // Check if electronAPI is available
          if (!window.electronAPI) {
            throw new Error('Electron API is not available')
          }

          if (!window.electronAPI.labOrders) {
            throw new Error('Lab orders API is not available')
          }

          if (!window.electronAPI.labOrders.create) {
            throw new Error('Lab orders create method is not available')
          }

          // Calculate remaining balance
          const remainingBalance = labOrderData.cost - (labOrderData.paid_amount || 0)
          const orderWithBalance = {
            ...labOrderData,
            remaining_balance: remainingBalance
          }

          

          // Add timeout to prevent hanging
          const createPromise = window.electronAPI.labOrders.create(orderWithBalance)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000)
          )
          
          
          try {
            const newLabOrder = await Promise.race([createPromise, timeoutPromise])
            
            if (!newLabOrder) {
              throw new Error('Failed to create lab order - no response from API')
            }


            // Add the new lab order to the local state instead of reloading all data
            const { labOrders } = get()
            const updatedLabOrders = [...labOrders, newLabOrder]

            set({
              labOrders: updatedLabOrders,
              isLoading: false
            })

            get().calculateStatistics()
            get().filterLabOrders()
            return
          } catch (apiError) {
            console.error('❌ [DEBUG] API Error caught:', apiError)
            console.error('❌ [DEBUG] API Error type:', typeof apiError)
            console.error('❌ [DEBUG] API Error constructor:', apiError?.constructor?.name)
            console.error('❌ [DEBUG] API Error message:', apiError?.message)
            console.error('❌ [DEBUG] API Error stack:', apiError?.stack)
            
            // Try to extract meaningful error information
            let errorMessage = 'Failed to create lab order'
            if (apiError && typeof apiError === 'object') {
              if (apiError.message) {
                errorMessage = apiError.message
              } else if (apiError.error && apiError.error.message) {
                errorMessage = apiError.error.message
              } else if (apiError.toString && apiError.toString() !== '[object Object]') {
                errorMessage = apiError.toString()
              }
            } else if (typeof apiError === 'string') {
              errorMessage = apiError
            }
            
            throw new Error(errorMessage)
          }
        } catch (error) {
          console.error('❌ [DEBUG] Error creating lab order:', error)
          
          // More robust error handling
          let errorMessage = 'Failed to create lab order'
          let errorDetails = {}
          
          if (error instanceof Error) {
            errorMessage = error.message || 'Unknown error occurred'
            errorDetails = {
              message: error.message,
              stack: error.stack,
              name: error.name,
              cause: (error as any).cause
            }
          } else if (typeof error === 'string') {
            errorMessage = error
            errorDetails = { message: error, type: 'string' }
          } else if (typeof error === 'object' && error !== null) {
            errorMessage = (error as any).message || JSON.stringify(error) || 'Object error occurred'
            errorDetails = {
              message: (error as any).message,
              stack: (error as any).stack,
              name: (error as any).name,
              type: typeof error,
              keys: Object.keys(error),
              stringified: JSON.stringify(error)
            }
          } else {
            errorMessage = `Unknown error type: ${typeof error}`
            errorDetails = { type: typeof error, value: error }
          }
          
          console.error('❌ [DEBUG] Error details:', errorDetails)
          console.error('❌ [DEBUG] Full error object:', error)
          console.error('❌ [DEBUG] Error constructor:', error?.constructor?.name)
          console.error('❌ [DEBUG] Error prototype:', Object.getPrototypeOf(error))
            
          set({
            error: errorMessage,
            isLoading: false
          })
          throw new Error(errorMessage)
        }
      },

      updateLabOrder: async (id, labOrderData) => {
        set({ isLoading: true, error: null })
        try {

          // Recalculate remaining balance if cost or paid amount changed
          const currentOrder = get().labOrders.find(order => order.id === id)
          if (currentOrder && (labOrderData.cost !== undefined || labOrderData.paid_amount !== undefined)) {
            const newCost = labOrderData.cost ?? currentOrder.cost
            const newPaidAmount = labOrderData.paid_amount ?? (currentOrder.paid_amount || 0)
            labOrderData.remaining_balance = newCost - newPaidAmount
          }

          const updatedLabOrder = await window.electronAPI?.labOrders?.update(id, labOrderData)
          if (updatedLabOrder) {
            await get().loadLabOrders()

            // Verify the update worked
            const verifyOrder = get().labOrders.find(order => order.id === id)
          }
        } catch (error) {
          console.error('❌ [DEBUG] Error updating lab order:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to update lab order',
            isLoading: false
          })
          throw error
        }
      },

      deleteLabOrder: async (id) => {
        set({ isLoading: true, error: null })
        try {
          const success = await window.electronAPI?.labOrders?.delete(id)
          if (success) {
            const { labOrders } = get()
            const updatedLabOrders = labOrders.filter(order => order.id !== id)
            set({
              labOrders: updatedLabOrders,
              selectedLabOrder: get().selectedLabOrder?.id === id ? null : get().selectedLabOrder,
              isLoading: false
            })
            get().calculateStatistics()
            get().filterLabOrders()
          }
        } catch (error) {
          console.error('Error deleting lab order:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to delete lab order',
            isLoading: false
          })
          throw error
        }
      },

      // UI state operations
      setSelectedLabOrder: (labOrder) => set({ selectedLabOrder: labOrder }),

      setSearchQuery: (query) => {
        set({ searchQuery: query })
        get().filterLabOrders()
      },

      setStatusFilter: (status) => {
        set({ statusFilter: status })
        get().filterLabOrders()
      },

      setLabFilter: (labId) => {
        set({ labFilter: labId })
        get().filterLabOrders()
      },

      setDateRangeFilter: (range) => {
        set({ dateRangeFilter: range })
        get().filterLabOrders()
      },

      filterLabOrders: () => {
        const { labOrders, searchQuery, statusFilter, labFilter, dateRangeFilter } = get()

        let filtered = [...labOrders]

        // Text search
        if (searchQuery.trim()) {
          filtered = filtered.filter(order =>
            order.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (order.lab?.name && order.lab.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (order.patient?.full_name && order.patient.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (order.notes && order.notes.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        }

        // Status filter
        if (statusFilter && statusFilter !== 'all') {
          filtered = filtered.filter(order => order.status === statusFilter)
        }

        // Lab filter
        if (labFilter && labFilter !== 'all') {
          filtered = filtered.filter(order => order.lab_id === labFilter)
        }

        // Date range filter
        if (dateRangeFilter.start && dateRangeFilter.end) {
          const startDate = new Date(dateRangeFilter.start)
          const endDate = new Date(dateRangeFilter.end)
          filtered = filtered.filter(order => {
            const orderDate = new Date(order.order_date)
            return orderDate >= startDate && orderDate <= endDate
          })
        }

        set({ filteredLabOrders: filtered })
      },

      clearFilters: () => {
        set({
          searchQuery: '',
          statusFilter: 'all',
          labFilter: 'all',
          dateRangeFilter: { start: '', end: '' }
        })
        get().filterLabOrders()
      },

      clearError: () => set({ error: null }),

      // Analytics
      calculateStatistics: () => {
        const { labOrders } = get()

        const totalOrders = labOrders.length
        const totalCost = labOrders.reduce((sum, order) => sum + order.cost, 0)
        const totalPaid = labOrders.reduce((sum, order) => sum + (order.paid_amount || 0), 0)
        const totalRemaining = labOrders.reduce((sum, order) => sum + (order.remaining_balance || 0), 0)

        const pendingOrders = labOrders.filter(order => order.status === 'معلق').length
        const completedOrders = labOrders.filter(order => order.status === 'مكتمل').length
        const cancelledOrders = labOrders.filter(order => order.status === 'ملغي').length

        set({
          totalOrders,
          totalCost,
          totalPaid,
          totalRemaining,
          pendingOrders,
          completedOrders,
          cancelledOrders
        })
      },

      getOrdersByLab: (labId) => {
        return get().labOrders.filter(order => order.lab_id === labId)
      },

      getOrdersByPatient: (patientId) => {
        return get().labOrders.filter(order => order.patient_id === patientId)
      },

      getOrdersByStatus: (status) => {
        return get().labOrders.filter(order => order.status === status)
      },

      getOrdersByDateRange: (startDate, endDate) => {
        return get().labOrders.filter(order => {
          const orderDate = new Date(order.order_date)
          return orderDate >= startDate && orderDate <= endDate
        })
      },

      getLabOrdersByTreatment: (treatmentId) => {
        const allOrders = get().labOrders
        return allOrders.filter(order => order.tooth_treatment_id === treatmentId)
      }
    }),
    {
      name: 'lab-order-store'
    }
  )
)
