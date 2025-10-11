import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Prescription } from '../types'

interface PrescriptionState {
  prescriptions: Prescription[]
  filteredPrescriptions: Prescription[]
  selectedPrescription: Prescription | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  patientFilter: string
  dateRangeFilter: { start: string; end: string }

  // Statistics
  totalPrescriptions: number
  recentPrescriptions: number
}

interface PrescriptionActions {
  // Data operations
  loadPrescriptions: () => Promise<void>
  createPrescription: (prescription: Omit<Prescription, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updatePrescription: (id: string, prescription: Partial<Prescription>) => Promise<void>
  deletePrescription: (id: string) => Promise<void>

  // Filtering and search
  setSearchQuery: (query: string) => void
  setPatientFilter: (patientId: string) => void
  setDateRangeFilter: (range: { start: string; end: string }) => void
  clearFilters: () => void
  filterPrescriptions: () => void

  // UI state operations
  setSelectedPrescription: (prescription: Prescription | null) => void
  clearError: () => void

  // Analytics
  calculateStatistics: () => void
  getPrescriptionsByPatient: (patientId: string) => Prescription[]
  getPrescriptionsByDateRange: (startDate: Date, endDate: Date) => Prescription[]
}

type PrescriptionStore = PrescriptionState & PrescriptionActions

export const usePrescriptionStore = create<PrescriptionStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      prescriptions: [],
      filteredPrescriptions: [],
      selectedPrescription: null,
      isLoading: false,
      error: null,
      searchQuery: '',
      patientFilter: 'all',
      dateRangeFilter: { start: '', end: '' },

      // Statistics
      totalPrescriptions: 0,
      recentPrescriptions: 0,

      // Data operations
      loadPrescriptions: async () => {
        set({ isLoading: true, error: null })
        try {
          const prescriptions = await window.electronAPI?.prescriptions?.getAll() || []

          set({
            prescriptions,
            filteredPrescriptions: prescriptions,
            isLoading: false
          })
          get().calculateStatistics()
          get().filterPrescriptions()
        } catch (error) {
          console.error('Error loading prescriptions:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to load prescriptions',
            isLoading: false
          })
        }
      },

      createPrescription: async (prescriptionData) => {
        set({ isLoading: true, error: null })
        try {
          const newPrescription = await window.electronAPI?.prescriptions?.create(prescriptionData)
          if (newPrescription) {
            // Reload all prescriptions to ensure proper data population
            await get().loadPrescriptions()

            // Emit events for real-time sync
            if (typeof window !== 'undefined' && window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('prescription-added', {
                detail: {
                  type: 'created',
                  prescriptionId: newPrescription.id,
                  prescription: newPrescription
                }
              }))
              window.dispatchEvent(new CustomEvent('prescription-changed', {
                detail: {
                  type: 'created',
                  prescriptionId: newPrescription.id,
                  prescription: newPrescription
                }
              }))
            }
          }
        } catch (error) {
          console.error('Error creating prescription:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to create prescription',
            isLoading: false
          })
          throw error
        }
      },

      updatePrescription: async (id, prescriptionData) => {
        set({ isLoading: true, error: null })
        try {
          const updatedPrescription = await window.electronAPI?.prescriptions?.update(id, prescriptionData)
          if (updatedPrescription) {
            // Reload all prescriptions to ensure proper data population
            await get().loadPrescriptions()

            // Emit events for real-time sync
            if (typeof window !== 'undefined' && window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('prescription-updated', {
                detail: {
                  type: 'updated',
                  prescriptionId: id,
                  prescription: updatedPrescription
                }
              }))
              window.dispatchEvent(new CustomEvent('prescription-changed', {
                detail: {
                  type: 'updated',
                  prescriptionId: id,
                  prescription: updatedPrescription
                }
              }))
            }
          }
        } catch (error) {
          console.error('Error updating prescription:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to update prescription',
            isLoading: false
          })
          throw error
        }
      },

      deletePrescription: async (id) => {
        set({ isLoading: true, error: null })
        try {
          const success = await window.electronAPI?.prescriptions?.delete(id)
          if (success) {
            const prescriptions = get().prescriptions.filter(prescription => prescription.id !== id)
            set({
              prescriptions,
              filteredPrescriptions: prescriptions,
              selectedPrescription: get().selectedPrescription?.id === id ? null : get().selectedPrescription,
              isLoading: false
            })
            get().calculateStatistics()
            get().filterPrescriptions()

            // Emit events for real-time sync
            if (typeof window !== 'undefined' && window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('prescription-deleted', {
                detail: {
                  type: 'deleted',
                  prescriptionId: id
                }
              }))
              window.dispatchEvent(new CustomEvent('prescription-changed', {
                detail: {
                  type: 'deleted',
                  prescriptionId: id
                }
              }))
            }
          }
        } catch (error) {
          console.error('Error deleting prescription:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to delete prescription',
            isLoading: false
          })
          throw error
        }
      },

      // Filtering and search
      setSearchQuery: (query) => {
        set({ searchQuery: query })
        get().filterPrescriptions()
      },

      setPatientFilter: (patientId) => {
        set({ patientFilter: patientId })
        get().filterPrescriptions()
      },

      setDateRangeFilter: (range) => {
        set({ dateRangeFilter: range })
        get().filterPrescriptions()
      },

      clearFilters: () => {
        set({
          searchQuery: '',
          patientFilter: 'all',
          dateRangeFilter: { start: '', end: '' }
        })
        get().filterPrescriptions()
      },

      filterPrescriptions: () => {
        const { prescriptions, searchQuery, patientFilter, dateRangeFilter } = get()

        let filtered = [...prescriptions]

        // Apply search filter
        if (searchQuery.trim()) {
          filtered = filtered.filter(prescription =>
            prescription.patient?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            prescription.appointment?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            prescription.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            prescription.medications?.some(med =>
              med.medication_name?.toLowerCase().includes(searchQuery.toLowerCase())
            )
          )
        }

        // Apply patient filter
        if (patientFilter !== 'all') {
          filtered = filtered.filter(prescription => prescription.patient_id === patientFilter)
        }

        // Apply date range filter
        if (dateRangeFilter.start && dateRangeFilter.end) {
          const startDate = new Date(dateRangeFilter.start)
          const endDate = new Date(dateRangeFilter.end)
          filtered = filtered.filter(prescription => {
            const prescriptionDate = new Date(prescription.prescription_date)
            return prescriptionDate >= startDate && prescriptionDate <= endDate
          })
        }

        set({ filteredPrescriptions: filtered })
      },

      // UI state operations
      setSelectedPrescription: (prescription) => {
        set({ selectedPrescription: prescription })
      },

      clearError: () => {
        set({ error: null })
      },

      // Analytics
      calculateStatistics: () => {
        const { prescriptions } = get()

        const totalPrescriptions = prescriptions.length

        // Calculate recent prescriptions (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const recentPrescriptions = prescriptions.filter(prescription => {
          const prescriptionDate = new Date(prescription.prescription_date)
          return prescriptionDate >= thirtyDaysAgo
        }).length

        set({
          totalPrescriptions,
          recentPrescriptions
        })
      },

      getPrescriptionsByPatient: (patientId) => {
        return get().prescriptions.filter(prescription => prescription.patient_id === patientId)
      },

      getPrescriptionsByDateRange: (startDate, endDate) => {
        return get().prescriptions.filter(prescription => {
          const prescriptionDate = new Date(prescription.prescription_date)
          return prescriptionDate >= startDate && prescriptionDate <= endDate
        })
      }
    }),
    {
      name: 'prescription-store'
    }
  )
)
