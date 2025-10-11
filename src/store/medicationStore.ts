import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Medication } from '../types'

interface MedicationState {
  medications: Medication[]
  selectedMedication: Medication | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  filteredMedications: Medication[]
}

interface MedicationActions {
  // Data operations
  loadMedications: () => Promise<void>
  createMedication: (medication: Omit<Medication, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateMedication: (id: string, medication: Partial<Medication>) => Promise<void>
  deleteMedication: (id: string) => Promise<void>

  // UI state operations
  setSelectedMedication: (medication: Medication | null) => void
  setSearchQuery: (query: string) => void
  filterMedications: () => void
  clearError: () => void
}

type MedicationStore = MedicationState & MedicationActions

export const useMedicationStore = create<MedicationStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      medications: [],
      selectedMedication: null,
      isLoading: false,
      error: null,
      searchQuery: '',
      filteredMedications: [],

      // Data operations
      loadMedications: async () => {
        set({ isLoading: true, error: null })
        try {
          const medications = await window.electronAPI?.medications?.getAll() || []
          set({
            medications,
            filteredMedications: medications,
            isLoading: false
          })
          get().filterMedications()
        } catch (error) {
          console.error('Error loading medications:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to load medications',
            isLoading: false
          })
        }
      },

      createMedication: async (medicationData) => {
        set({ isLoading: true, error: null })
        try {
          const newMedication = await window.electronAPI?.medications?.create(medicationData)
          if (newMedication) {
            const medications = [...get().medications, newMedication]
            set({
              medications,
              filteredMedications: medications,
              isLoading: false
            })
            get().filterMedications()
          }
        } catch (error) {
          console.error('Error creating medication:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to create medication',
            isLoading: false
          })
          throw error
        }
      },

      updateMedication: async (id, medicationData) => {
        set({ isLoading: true, error: null })
        try {
          const updatedMedication = await window.electronAPI?.medications?.update(id, medicationData)
          if (updatedMedication) {
            const medications = get().medications.map(medication =>
              medication.id === id ? { ...medication, ...updatedMedication } : medication
            )
            set({
              medications,
              filteredMedications: medications,
              isLoading: false
            })
            get().filterMedications()
          }
        } catch (error) {
          console.error('Error updating medication:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to update medication',
            isLoading: false
          })
          throw error
        }
      },

      deleteMedication: async (id) => {
        set({ isLoading: true, error: null })
        try {
          const success = await window.electronAPI?.medications?.delete(id)
          if (success) {
            const medications = get().medications.filter(medication => medication.id !== id)
            set({
              medications,
              filteredMedications: medications,
              selectedMedication: get().selectedMedication?.id === id ? null : get().selectedMedication,
              isLoading: false
            })
            get().filterMedications()
          }
        } catch (error) {
          console.error('Error deleting medication:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to delete medication',
            isLoading: false
          })
          throw error
        }
      },

      // UI state operations
      setSelectedMedication: (medication) => {
        set({ selectedMedication: medication })
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query })
        get().filterMedications()
      },

      filterMedications: () => {
        const { medications, searchQuery } = get()
        
        if (!searchQuery.trim()) {
          set({ filteredMedications: medications })
          return
        }

        const filtered = medications.filter(medication =>
          medication.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (medication.instructions && medication.instructions.toLowerCase().includes(searchQuery.toLowerCase()))
        )

        set({ filteredMedications: filtered })
      },

      clearError: () => {
        set({ error: null })
      }
    }),
    {
      name: 'medication-store'
    }
  )
)
