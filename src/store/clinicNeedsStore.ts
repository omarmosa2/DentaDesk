import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ClinicNeed } from '../types'

interface ClinicNeedsFilters {
  category?: string
  priority?: string
  status?: string
}

interface ClinicNeedsState {
  needs: ClinicNeed[]
  filteredNeeds: ClinicNeed[]
  selectedNeed: ClinicNeed | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  filters: ClinicNeedsFilters
  categories: string[]
  suppliers: string[]

  // Analytics
  totalNeeds: number
  totalValue: number
  pendingCount: number
  orderedCount: number
  receivedCount: number
  urgentCount: number
}

interface ClinicNeedsActions {
  // Data operations
  loadNeeds: () => Promise<void>
  createNeed: (need: Omit<ClinicNeed, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateNeed: (id: string, need: Partial<ClinicNeed>) => Promise<void>
  deleteNeed: (id: string) => Promise<void>

  // UI state operations
  setSelectedNeed: (need: ClinicNeed | null) => void
  setSearchQuery: (query: string) => void
  setFilters: (filters: ClinicNeedsFilters) => void
  filterNeeds: () => void
  clearError: () => void

  // Analytics
  calculateAnalytics: () => void
  getNeedsByStatus: (status: string) => ClinicNeed[]
  getNeedsByPriority: (priority: string) => ClinicNeed[]

  // Categories and suppliers
  updateCategories: () => void
  updateSuppliers: () => void

  // Serial number generation
  getNextSerialNumber: () => string
}

type ClinicNeedsStore = ClinicNeedsState & ClinicNeedsActions

export const useClinicNeedsStore = create<ClinicNeedsStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      needs: [],
      filteredNeeds: [],
      selectedNeed: null,
      isLoading: false,
      error: null,
      searchQuery: '',
      filters: {},
      categories: [],
      suppliers: [],

      // Analytics
      totalNeeds: 0,
      totalValue: 0,
      pendingCount: 0,
      orderedCount: 0,
      receivedCount: 0,
      urgentCount: 0,

      // Data operations
      loadNeeds: async () => {
        set({ isLoading: true, error: null })
        try {
          const needs = await window.electronAPI?.clinicNeeds?.getAll() || []
          set({
            needs,
            filteredNeeds: needs,
            isLoading: false
          })

          // Update analytics and categories/suppliers
          get().calculateAnalytics()
          get().updateCategories()
          get().updateSuppliers()
          get().filterNeeds()
        } catch (error) {
          console.error('Error loading clinic needs:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to load clinic needs',
            isLoading: false
          })
        }
      },

      createNeed: async (needData) => {
        set({ isLoading: true, error: null })
        try {
          const newNeed = await window.electronAPI.clinicNeeds.create(needData)
          const { needs } = get()
          const updatedNeeds = [...needs, newNeed]

          set({
            needs: updatedNeeds,
            isLoading: false
          })

          // Update analytics and categories/suppliers
          get().calculateAnalytics()
          get().updateCategories()
          get().updateSuppliers()
          get().filterNeeds()

          // Emit events for real-time sync
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('clinic-needs-changed', {
              detail: {
                type: 'created',
                needId: newNeed.id,
                need: newNeed
              }
            }))
          }
        } catch (error) {
          console.error('Error creating clinic need:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to create clinic need',
            isLoading: false
          })
        }
      },

      updateNeed: async (id, needData) => {
        set({ isLoading: true, error: null })
        try {
          const updatedNeed = await window.electronAPI.clinicNeeds.update(id, needData)
          const { needs } = get()
          const updatedNeeds = needs.map(need =>
            need.id === id ? updatedNeed : need
          )

          set({
            needs: updatedNeeds,
            isLoading: false
          })

          // Update analytics and categories/suppliers
          get().calculateAnalytics()
          get().updateCategories()
          get().updateSuppliers()
          get().filterNeeds()

          // Emit events for real-time sync
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('clinic-needs-changed', {
              detail: {
                type: 'updated',
                needId: id,
                need: updatedNeed
              }
            }))
          }
        } catch (error) {
          console.error('Error updating clinic need:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to update clinic need',
            isLoading: false
          })
        }
      },

      deleteNeed: async (id) => {
        set({ isLoading: true, error: null })
        try {
          await window.electronAPI.clinicNeeds.delete(id)
          const { needs } = get()
          const updatedNeeds = needs.filter(need => need.id !== id)

          set({
            needs: updatedNeeds,
            selectedNeed: null,
            isLoading: false
          })

          // Update analytics and categories/suppliers
          get().calculateAnalytics()
          get().updateCategories()
          get().updateSuppliers()
          get().filterNeeds()

          // Emit events for real-time sync
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('clinic-needs-changed', {
              detail: {
                type: 'deleted',
                needId: id
              }
            }))
          }
        } catch (error) {
          console.error('Error deleting clinic need:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to delete clinic need',
            isLoading: false
          })
        }
      },

      // UI state operations
      setSelectedNeed: (need) => set({ selectedNeed: need }),
      setSearchQuery: (query) => {
        set({ searchQuery: query })
        get().filterNeeds()
      },
      setFilters: (filters) => {
        set({ filters })
        get().filterNeeds()
      },
      clearError: () => set({ error: null }),

      filterNeeds: () => {
        const { needs, searchQuery, filters } = get()

        let filtered = needs

        // Apply search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim()
          filtered = filtered.filter(need =>
            need.need_name.toLowerCase().includes(query) ||
            need.serial_number.toLowerCase().includes(query) ||
            need.description?.toLowerCase().includes(query) ||
            need.category?.toLowerCase().includes(query) ||
            need.supplier?.toLowerCase().includes(query)
          )
        }

        // Apply filters
        if (filters.category) {
          filtered = filtered.filter(need => need.category === filters.category)
        }

        if (filters.priority) {
          filtered = filtered.filter(need => need.priority === filters.priority)
        }

        if (filters.status) {
          filtered = filtered.filter(need => need.status === filters.status)
        }

        set({ filteredNeeds: filtered })
      },

      // Analytics
      calculateAnalytics: () => {
        const { needs } = get()

        const totalNeeds = needs.length
        // Ensure price and quantity are numbers to prevent "Cannot convert object to primitive value" error
        const totalValue = needs.reduce((sum, need) => {
          const price = Number(need.price) || 0
          const quantity = Number(need.quantity) || 0
          return sum + (price * quantity)
        }, 0)
        const pendingCount = needs.filter(need => need.status === 'pending').length
        const orderedCount = needs.filter(need => need.status === 'ordered').length
        const receivedCount = needs.filter(need => need.status === 'received').length
        const urgentCount = needs.filter(need => need.priority === 'urgent').length

        set({
          totalNeeds,
          totalValue,
          pendingCount,
          orderedCount,
          receivedCount,
          urgentCount
        })
      },

      getNeedsByStatus: (status) => {
        return get().needs.filter(need => need.status === status)
      },

      getNeedsByPriority: (priority) => {
        return get().needs.filter(need => need.priority === priority)
      },

      // Categories and suppliers
      updateCategories: () => {
        const { needs } = get()
        const categories = [...new Set(needs.map(need => need.category).filter((cat): cat is string => Boolean(cat)))]
        set({ categories })
      },

      updateSuppliers: () => {
        const { needs } = get()
        const suppliers = [...new Set(needs.map(need => need.supplier).filter((sup): sup is string => Boolean(sup)))]
        set({ suppliers })
      },

      // Serial number generation
      getNextSerialNumber: () => {
        const { needs } = get()
        // Find the highest numeric serial number
        let maxNumber = 0
        needs.forEach(need => {
          const serialNumber = need.serial_number
          // Check if it's a numeric serial number
          const numericMatch = serialNumber.match(/^\d+$/)
          if (numericMatch) {
            const num = parseInt(serialNumber, 10)
            if (num > maxNumber) {
              maxNumber = num
            }
          }
        })
        return (maxNumber + 1).toString()
      }
    }),
    {
      name: 'clinic-needs-store'
    }
  )
)
