import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Lab } from '../types'

interface LabState {
  labs: Lab[]
  selectedLab: Lab | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  filteredLabs: Lab[]
}

interface LabActions {
  // Data operations
  loadLabs: () => Promise<void>
  createLab: (lab: Omit<Lab, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateLab: (id: string, lab: Partial<Lab>) => Promise<void>
  deleteLab: (id: string) => Promise<void>

  // UI state operations
  setSelectedLab: (lab: Lab | null) => void
  setSearchQuery: (query: string) => void
  filterLabs: () => void
  clearError: () => void
}

type LabStore = LabState & LabActions

export const useLabStore = create<LabStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      labs: [],
      selectedLab: null,
      isLoading: false,
      error: null,
      searchQuery: '',
      filteredLabs: [],

      // Data operations
      loadLabs: async () => {
        set({ isLoading: true, error: null })
        try {
          const labs = await window.electronAPI?.labs?.getAll() || []

          set({
            labs,
            filteredLabs: labs,
            isLoading: false
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load labs',
            isLoading: false
          })
        }
      },

      createLab: async (labData) => {
        set({ isLoading: true, error: null })
        try {
          const newLab = await window.electronAPI?.labs?.create(labData)

          if (newLab) {
            const { labs } = get()
            const updatedLabs = [...labs, newLab]

            set({
              labs: updatedLabs,
              isLoading: false
            })
            get().filterLabs()
          } else {
            console.warn('⚠️ [DEBUG] No lab returned from electronAPI')
          }
        } catch (error) {
          console.error('❌ [DEBUG] Error in labStore.createLab:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to create lab',
            isLoading: false
          })
          throw error
        }
      },

      updateLab: async (id, labData) => {
        set({ isLoading: true, error: null })
        try {
          const updatedLab = await window.electronAPI?.labs?.update(id, labData)
          if (updatedLab) {
            const { labs } = get()
            const updatedLabs = labs.map(lab =>
              lab.id === id ? updatedLab : lab
            )
            set({
              labs: updatedLabs,
              selectedLab: get().selectedLab?.id === id ? updatedLab : get().selectedLab,
              isLoading: false
            })
            get().filterLabs()
          }
        } catch (error) {
          console.error('Error updating lab:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to update lab',
            isLoading: false
          })
          throw error
        }
      },

      deleteLab: async (id) => {
        set({ isLoading: true, error: null })
        try {
          const success = await window.electronAPI?.labs?.delete(id)
          if (success) {
            const { labs } = get()
            const updatedLabs = labs.filter(lab => lab.id !== id)
            set({
              labs: updatedLabs,
              selectedLab: get().selectedLab?.id === id ? null : get().selectedLab,
              isLoading: false
            })
            get().filterLabs()
          }
        } catch (error) {
          console.error('Error deleting lab:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to delete lab',
            isLoading: false
          })
          throw error
        }
      },

      // UI state operations
      setSelectedLab: (lab) => set({ selectedLab: lab }),

      setSearchQuery: (query) => {
        set({ searchQuery: query })
        get().filterLabs()
      },

      filterLabs: () => {
        const { labs, searchQuery } = get()

        if (!searchQuery.trim()) {
          set({ filteredLabs: labs })
          return
        }

        const filtered = labs.filter(lab =>
          lab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (lab.contact_info && lab.contact_info.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (lab.address && lab.address.toLowerCase().includes(searchQuery.toLowerCase()))
        )

        set({ filteredLabs: filtered })
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'lab-store'
    }
  )
)
