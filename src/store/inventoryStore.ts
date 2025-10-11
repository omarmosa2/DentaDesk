import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { InventoryItem, InventoryUsage } from '../types'

interface InventoryFilters {
  category?: string
  supplier?: string
  status?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'expired' | 'expiring_soon'
}

interface InventoryState {
  items: InventoryItem[]
  filteredItems: InventoryItem[]
  usage: InventoryUsage[]
  selectedItem: InventoryItem | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  filters: InventoryFilters
  categories: string[]
  suppliers: string[]

  // Analytics
  totalItems: number
  totalValue: number
  lowStockCount: number
  expiredCount: number
  expiringSoonCount: number
}

interface InventoryActions {
  // Data operations
  loadItems: () => Promise<void>
  createItem: (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>
  deleteItem: (id: string) => Promise<void>

  // Usage tracking
  loadUsage: () => Promise<void>
  recordUsage: (usage: Omit<InventoryUsage, 'id'>) => Promise<void>
  getUsageHistory: (itemId: string) => InventoryUsage[]

  // UI state
  setSelectedItem: (item: InventoryItem | null) => void
  setSearchQuery: (query: string) => void
  setFilters: (filters: InventoryFilters) => void
  clearError: () => void

  // Search and filter
  searchItems: (query: string) => void
  filterItems: () => void

  // Analytics
  calculateAnalytics: () => void
  getLowStockItems: () => InventoryItem[]
  getExpiredItems: () => InventoryItem[]
  getExpiringSoonItems: (days?: number) => InventoryItem[]

  // Categories and suppliers
  updateCategories: () => void
  updateSuppliers: () => void
}

type InventoryStore = InventoryState & InventoryActions

export const useInventoryStore = create<InventoryStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      items: [],
      filteredItems: [],
      usage: [],
      selectedItem: null,
      isLoading: false,
      error: null,
      searchQuery: '',
      filters: {},
      categories: [],
      suppliers: [],

      // Analytics
      totalItems: 0,
      totalValue: 0,
      lowStockCount: 0,
      expiredCount: 0,
      expiringSoonCount: 0,

      // Data operations
      loadItems: async () => {
        set({ isLoading: true, error: null })
        try {
          const items = await window.electronAPI?.inventory?.getAll() || []
          set({
            items,
            filteredItems: items,
            isLoading: false
          })

          // Update analytics and categories/suppliers
          get().calculateAnalytics()
          get().updateCategories()
          get().updateSuppliers()
          get().filterItems()
        } catch (error) {
          console.error('Error loading inventory items:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to load inventory items',
            isLoading: false
          })
        }
      },

      createItem: async (itemData) => {
        set({ isLoading: true, error: null })
        try {
          const newItem = await window.electronAPI.inventory.create(itemData)
          const { items } = get()
          const updatedItems = [...items, newItem]

          set({
            items: updatedItems,
            isLoading: false
          })

          // Update analytics and categories/suppliers
          get().calculateAnalytics()
          get().updateCategories()
          get().updateSuppliers()
          get().filterItems()

          // Emit events for real-time sync
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('inventory-changed', {
              detail: {
                type: 'created',
                itemId: newItem.id,
                item: newItem
              }
            }))
            window.dispatchEvent(new CustomEvent('inventory-added', {
              detail: {
                type: 'created',
                itemId: newItem.id,
                item: newItem
              }
            }))
          }
        } catch (error) {
          console.error('Error creating inventory item:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to create inventory item',
            isLoading: false
          })
        }
      },

      updateItem: async (id, updates) => {
        set({ isLoading: true, error: null })
        try {
          const updatedItem = await window.electronAPI.inventory.update(id, updates)
          const { items, selectedItem } = get()

          const updatedItems = items.map(item =>
            item.id === id ? updatedItem : item
          )

          set({
            items: updatedItems,
            selectedItem: selectedItem?.id === id ? updatedItem : selectedItem,
            isLoading: false
          })

          // Update analytics and categories/suppliers
          get().calculateAnalytics()
          get().updateCategories()
          get().updateSuppliers()
          get().filterItems()

          // Emit events for real-time sync
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('inventory-changed', {
              detail: {
                type: 'updated',
                itemId: id,
                item: updatedItem
              }
            }))
            window.dispatchEvent(new CustomEvent('inventory-updated', {
              detail: {
                type: 'updated',
                itemId: id,
                item: updatedItem
              }
            }))
          }
        } catch (error) {
          console.error('Error updating inventory item:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to update inventory item',
            isLoading: false
          })
        }
      },

      deleteItem: async (id) => {
        set({ isLoading: true, error: null })
        try {
          const success = await window.electronAPI.inventory.delete(id)

          if (success) {
            const { items, selectedItem } = get()
            const updatedItems = items.filter(item => item.id !== id)

            set({
              items: updatedItems,
              selectedItem: selectedItem?.id === id ? null : selectedItem,
              isLoading: false
            })

            // Update analytics and categories/suppliers
            get().calculateAnalytics()
            get().updateCategories()
            get().updateSuppliers()
            get().filterItems()

            // Emit events for real-time sync
            if (typeof window !== 'undefined' && window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('inventory-changed', {
                detail: {
                  type: 'deleted',
                  itemId: id
                }
              }))
              window.dispatchEvent(new CustomEvent('inventory-deleted', {
                detail: {
                  type: 'deleted',
                  itemId: id
                }
              }))
            }
          } else {
            throw new Error('Failed to delete inventory item')
          }
        } catch (error) {
          console.error('Error deleting inventory item:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to delete inventory item',
            isLoading: false
          })
        }
      },

      // Usage tracking
      loadUsage: async () => {
        try {
          const usage = await window.electronAPI?.inventoryUsage?.getAll() || []
          set({ usage })
        } catch (error) {
          console.error('Error loading inventory usage:', error)
        }
      },

      recordUsage: async (usageData) => {
        set({ isLoading: true, error: null })
        try {
          const newUsage = await window.electronAPI.inventoryUsage.create(usageData)
          const { usage, items } = get()

          // Add new usage record
          const updatedUsage = [...usage, newUsage]

          // Update item quantity
          const updatedItems = items.map(item => {
            if (item.id === usageData.inventory_id) {
              return {
                ...item,
                quantity: Math.max(0, item.quantity - usageData.quantity_used)
              }
            }
            return item
          })

          set({
            usage: updatedUsage,
            items: updatedItems,
            isLoading: false
          })

          // Update analytics and filter
          get().calculateAnalytics()
          get().filterItems()
        } catch (error) {
          console.error('Error recording inventory usage:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to record inventory usage',
            isLoading: false
          })
        }
      },

      getUsageHistory: (itemId) => {
        const { usage } = get()
        return usage.filter(u => u.inventory_id === itemId)
          .sort((a, b) => new Date(b.usage_date).getTime() - new Date(a.usage_date).getTime())
      },

      // UI state management
      setSelectedItem: (item) => {
        set({ selectedItem: item })
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query })
        get().searchItems(query)
      },

      setFilters: (filters) => {
        set({ filters })
        get().filterItems()
      },

      clearError: () => {
        set({ error: null })
      },

      // Search functionality
      searchItems: (query) => {
        set({ searchQuery: query })
        get().filterItems()
      },

      // Filter functionality
      filterItems: () => {
        const { items, searchQuery, filters } = get()
        let filtered = [...items]

        // Apply search query
        if (searchQuery.trim() !== '') {
          const query = searchQuery.toLowerCase()
          filtered = filtered.filter(item =>
            item.name.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query) ||
            item.category?.toLowerCase().includes(query) ||
            item.supplier?.toLowerCase().includes(query)
          )
        }

        // Apply category filter
        if (filters.category && filters.category !== 'all') {
          filtered = filtered.filter(item => item.category === filters.category)
        }

        // Apply supplier filter
        if (filters.supplier && filters.supplier !== 'all') {
          filtered = filtered.filter(item => item.supplier === filters.supplier)
        }

        // Apply status filter
        if (filters.status && filters.status !== 'all') {
          const today = new Date()
          filtered = filtered.filter(item => {
            switch (filters.status) {
              case 'in_stock':
                return item.quantity > item.minimum_stock
              case 'low_stock':
                return item.quantity <= item.minimum_stock && item.quantity > 0
              case 'out_of_stock':
                return item.quantity === 0
              case 'expired':
                return item.expiry_date && new Date(item.expiry_date) < today
              case 'expiring_soon':
                if (!item.expiry_date) return false
                const expiryDate = new Date(item.expiry_date)
                const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                return daysUntilExpiry <= 30 && daysUntilExpiry > 0
              default:
                return true
            }
          })
        }

        set({ filteredItems: filtered })
      },

      // Analytics
      calculateAnalytics: () => {
        const { items } = get()
        const today = new Date()

        const totalItems = items.length

        // Calculate total value with validation
        const totalValue = items.reduce((sum, item) => {
          const quantity = typeof item.quantity === 'number' ? item.quantity : 0
          const costPerUnit = typeof item.cost_per_unit === 'number' ? item.cost_per_unit : 0
          return sum + (quantity * costPerUnit)
        }, 0)

        // Calculate low stock count with validation
        const lowStockCount = items.filter(item => {
          const quantity = typeof item.quantity === 'number' ? item.quantity : 0
          const minimumStock = typeof item.minimum_stock === 'number' ? item.minimum_stock : 0
          return quantity <= minimumStock && quantity > 0
        }).length

        // Calculate expired count with date validation
        const expiredCount = items.filter(item => {
          if (!item.expiry_date) return false
          try {
            const expiryDate = new Date(item.expiry_date)
            return !isNaN(expiryDate.getTime()) && expiryDate < today
          } catch (error) {
            console.warn('Invalid expiry date:', item.expiry_date, error)
            return false
          }
        }).length

        // Calculate expiring soon count with date validation
        const expiringSoonCount = items.filter(item => {
          if (!item.expiry_date) return false
          try {
            const expiryDate = new Date(item.expiry_date)
            if (isNaN(expiryDate.getTime())) return false

            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            return daysUntilExpiry <= 30 && daysUntilExpiry > 0
          } catch (error) {
            console.warn('Invalid expiry date:', item.expiry_date, error)
            return false
          }
        }).length

        set({
          totalItems,
          totalValue,
          lowStockCount,
          expiredCount,
          expiringSoonCount
        })
      },

      getLowStockItems: () => {
        const { items } = get()
        return items.filter(item => item.quantity <= item.minimum_stock && item.quantity > 0)
      },

      getExpiredItems: () => {
        const { items } = get()
        const today = new Date()
        return items.filter(item => item.expiry_date && new Date(item.expiry_date) < today)
      },

      getExpiringSoonItems: (days = 30) => {
        const { items } = get()
        const today = new Date()
        return items.filter(item => {
          if (!item.expiry_date) return false
          const expiryDate = new Date(item.expiry_date)
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          return daysUntilExpiry <= days && daysUntilExpiry > 0
        })
      },

      // Categories and suppliers
      updateCategories: () => {
        const { items } = get()
        const categories = [...new Set(items.map(item => item.category).filter(Boolean))]
        set({ categories })
      },

      updateSuppliers: () => {
        const { items } = get()
        const suppliers = [...new Set(items.map(item => item.supplier).filter(Boolean))]
        set({ suppliers })
      }
    }),
    {
      name: 'inventory-store',
    }
  )
)
