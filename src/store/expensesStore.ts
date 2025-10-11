import { create } from 'zustand'
import type { ClinicExpense } from '../types'

interface ExpensesFilters {
  status: string
  expenseType: string
  category: string
  vendor: string
  isRecurring: boolean | null
  dateRange: {
    start: string
    end: string
  }
}

interface ExpensesAnalytics {
  totalExpenses: number
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  overdueAmount: number
  recurringExpenses: number
  expensesByType: Record<string, number>
  expensesByStatus: Record<string, number>
  monthlyExpenses: Record<string, number>
}

interface ExpensesState {
  // Data
  expenses: ClinicExpense[]
  filteredExpenses: ClinicExpense[]
  selectedExpense: ClinicExpense | null

  // UI State
  isLoading: boolean
  error: string | null
  searchQuery: string
  filters: ExpensesFilters

  // Analytics
  analytics: ExpensesAnalytics
  categories: string[]
  vendors: string[]
  expenseTypes: string[]
}

interface ExpensesActions {
  // Data operations
  loadExpenses: () => Promise<void>
  createExpense: (expense: Omit<ClinicExpense, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateExpense: (id: string, expense: Partial<ClinicExpense>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>

  // UI state operations
  setSelectedExpense: (expense: ClinicExpense | null) => void
  setSearchQuery: (query: string) => void
  setFilters: (filters: ExpensesFilters) => void
  filterExpenses: () => void
  clearError: () => void

  // Analytics
  calculateAnalytics: () => void
  getExpensesByType: (expenseType: string) => ClinicExpense[]
  getExpensesByStatus: (status: string) => ClinicExpense[]
  getRecurringExpenses: () => ClinicExpense[]

  // Categories and vendors
  updateCategories: () => void
  updateVendors: () => void
  updateExpenseTypes: () => void
}

const initialFilters: ExpensesFilters = {
  status: '',
  expenseType: '',
  category: '',
  vendor: '',
  isRecurring: null,
  dateRange: {
    start: '',
    end: ''
  }
}

const initialAnalytics: ExpensesAnalytics = {
  totalExpenses: 0,
  totalAmount: 0,
  paidAmount: 0,
  pendingAmount: 0,
  overdueAmount: 0,
  recurringExpenses: 0,
  expensesByType: {},
  expensesByStatus: {},
  monthlyExpenses: {}
}

export const useExpensesStore = create<ExpensesState & ExpensesActions>((set, get) => ({
  // Initial state
  expenses: [],
  filteredExpenses: [],
  selectedExpense: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  filters: initialFilters,
  analytics: initialAnalytics,
  categories: [],
  vendors: [],
  expenseTypes: ['salary', 'utilities', 'rent', 'maintenance', 'supplies', 'insurance', 'other'],

  // Data operations
  loadExpenses: async () => {
    set({ isLoading: true, error: null })
    try {
      const expenses = await window.electronAPI?.clinicExpenses?.getAll() || []
      set({
        expenses,
        filteredExpenses: expenses,
        isLoading: false
      })

      // Update analytics and categories/vendors
      get().calculateAnalytics()
      get().updateCategories()
      get().updateVendors()
      get().filterExpenses()
    } catch (error) {
      console.error('Error loading clinic expenses:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to load clinic expenses',
        isLoading: false
      })
    }
  },

  createExpense: async (expenseData) => {
    set({ isLoading: true, error: null })
    try {
      const newExpense = await window.electronAPI.clinicExpenses.create(expenseData)
      const { expenses } = get()
      const updatedExpenses = [...expenses, newExpense]

      set({
        expenses: updatedExpenses,
        isLoading: false
      })

      // Update analytics and categories/vendors
      get().calculateAnalytics()
      get().updateCategories()
      get().updateVendors()
      get().filterExpenses()

      // Emit events for real-time sync
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('clinic-expenses-changed', {
          detail: {
            type: 'created',
            expenseId: newExpense.id,
            expense: newExpense
          }
        }))
      }
    } catch (error) {
      console.error('Error creating clinic expense:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to create clinic expense',
        isLoading: false
      })
      throw error
    }
  },

  updateExpense: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const updatedExpense = await window.electronAPI.clinicExpenses.update(id, updates)
      const { expenses } = get()
      const updatedExpenses = expenses.map(expense =>
        expense.id === id ? updatedExpense : expense
      )

      set({
        expenses: updatedExpenses,
        isLoading: false
      })

      // Update analytics and categories/vendors
      get().calculateAnalytics()
      get().updateCategories()
      get().updateVendors()
      get().filterExpenses()

      // Emit events for real-time sync
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('clinic-expenses-changed', {
          detail: {
            type: 'updated',
            expenseId: id,
            expense: updatedExpense
          }
        }))
      }
    } catch (error) {
      console.error('Error updating clinic expense:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to update clinic expense',
        isLoading: false
      })
      throw error
    }
  },

  deleteExpense: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const success = await window.electronAPI.clinicExpenses.delete(id)
      if (success) {
        const { expenses } = get()
        const updatedExpenses = expenses.filter(expense => expense.id !== id)

        set({
          expenses: updatedExpenses,
          selectedExpense: null,
          isLoading: false
        })

        // Update analytics and categories/vendors
        get().calculateAnalytics()
        get().updateCategories()
        get().updateVendors()
        get().filterExpenses()

        // Emit events for real-time sync
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('clinic-expenses-changed', {
            detail: {
              type: 'deleted',
              expenseId: id
            }
          }))
        }
      }
    } catch (error) {
      console.error('Error deleting clinic expense:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to delete clinic expense',
        isLoading: false
      })
      throw error
    }
  },

  // UI state operations
  setSelectedExpense: (expense) => set({ selectedExpense: expense }),
  setSearchQuery: (query) => {
    set({ searchQuery: query })
    get().filterExpenses()
  },
  setFilters: (filters) => {
    set({ filters })
    get().filterExpenses()
  },
  clearError: () => set({ error: null }),

  filterExpenses: () => {
    const { expenses, searchQuery, filters } = get()
    let filtered = [...expenses]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(expense =>
        expense.expense_name.toLowerCase().includes(query) ||
        expense.description?.toLowerCase().includes(query) ||
        expense.vendor?.toLowerCase().includes(query) ||
        expense.notes?.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(expense => expense.status === filters.status)
    }

    // Expense type filter
    if (filters.expenseType) {
      filtered = filtered.filter(expense => expense.expense_type === filters.expenseType)
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(expense => expense.category === filters.category)
    }

    // Vendor filter
    if (filters.vendor) {
      filtered = filtered.filter(expense => expense.vendor === filters.vendor)
    }

    // Recurring filter
    if (filters.isRecurring !== null) {
      filtered = filtered.filter(expense => expense.is_recurring === filters.isRecurring)
    }

    // Date range filter
    if (filters.dateRange.start && filters.dateRange.end) {
      // إنشاء تواريخ البداية والنهاية مع ضبط المنطقة الزمنية المحلية
      const start = new Date(filters.dateRange.start)
      const startLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0)

      const end = new Date(filters.dateRange.end)
      const endLocal = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)

      filtered = filtered.filter(expense => {
        const expenseDateStr = expense.payment_date
        if (!expenseDateStr) return false

        const expenseDate = new Date(expenseDateStr)

        // للتواريخ التي تحتوي على وقت، نحتاج لمقارنة التاريخ فقط
        let expenseDateForComparison: Date
        if (expenseDateStr.includes('T') || expenseDateStr.includes(' ')) {
          // التاريخ يحتوي على وقت، استخدمه كما هو
          expenseDateForComparison = expenseDate
        } else {
          // التاريخ بدون وقت، اعتبره في بداية اليوم
          expenseDateForComparison = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), expenseDate.getDate(), 0, 0, 0, 0)
        }

        return expenseDateForComparison >= startLocal && expenseDateForComparison <= endLocal
      })
    }

    set({ filteredExpenses: filtered })
  },

  // Analytics
  calculateAnalytics: () => {
    const { expenses } = get()

    const totalExpenses = expenses.length
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const paidAmount = expenses
      .filter(expense => expense.status === 'paid')
      .reduce((sum, expense) => sum + expense.amount, 0)
    const pendingAmount = expenses
      .filter(expense => expense.status === 'pending')
      .reduce((sum, expense) => sum + expense.amount, 0)
    const overdueAmount = expenses
      .filter(expense => expense.status === 'overdue')
      .reduce((sum, expense) => sum + expense.amount, 0)
    const recurringExpenses = expenses.filter(expense => expense.is_recurring).length

    // Group by type
    const expensesByType = expenses.reduce((acc, expense) => {
      acc[expense.expense_type] = (acc[expense.expense_type] || 0) + expense.amount
      return acc
    }, {} as Record<string, number>)

    // Group by status
    const expensesByStatus = expenses.reduce((acc, expense) => {
      acc[expense.status] = (acc[expense.status] || 0) + expense.amount
      return acc
    }, {} as Record<string, number>)

    // Group by month
    const monthlyExpenses = expenses.reduce((acc, expense) => {
      const month = new Date(expense.payment_date).toISOString().slice(0, 7) // YYYY-MM
      acc[month] = (acc[month] || 0) + expense.amount
      return acc
    }, {} as Record<string, number>)

    set({
      analytics: {
        totalExpenses,
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount,
        recurringExpenses,
        expensesByType,
        expensesByStatus,
        monthlyExpenses
      }
    })
  },

  getExpensesByType: (expenseType) => {
    const { expenses } = get()
    return expenses.filter(expense => expense.expense_type === expenseType)
  },

  getExpensesByStatus: (status) => {
    const { expenses } = get()
    return expenses.filter(expense => expense.status === status)
  },

  getRecurringExpenses: () => {
    const { expenses } = get()
    return expenses.filter(expense => expense.is_recurring)
  },

  // Categories and vendors
  updateCategories: () => {
    const { expenses } = get()
    const categories = [...new Set(expenses.map(expense => expense.category).filter(Boolean))]
    set({ categories })
  },

  updateVendors: () => {
    const { expenses } = get()
    const vendors = [...new Set(expenses.map(expense => expense.vendor).filter(Boolean))]
    set({ vendors })
  },

  updateExpenseTypes: () => {
    // Expense types are predefined, but we can extend this if needed
    const defaultTypes = ['salary', 'utilities', 'rent', 'maintenance', 'supplies', 'insurance', 'other']
    set({ expenseTypes: defaultTypes })
  }
}))
