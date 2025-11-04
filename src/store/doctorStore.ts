import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Doctor } from '../types'

interface DoctorState {
  doctors: Doctor[]
  selectedDoctor: Doctor | null
  isLoading: boolean
  error: string | null
}

interface DoctorActions {
  // Data operations
  loadDoctors: () => Promise<void>
  createDoctor: (doctor: Omit<Doctor, 'id' | 'created_at' | 'updated_at'>) => Promise<Doctor>
  updateDoctor: (id: string, doctor: Partial<Doctor>) => Promise<void>
  deleteDoctor: (id: string) => Promise<void>

  // UI state
  setSelectedDoctor: (doctor: Doctor | null) => void
  clearError: () => void

  // Search functionality
  searchDoctors: (query: string) => Promise<any[]>
}

type DoctorStore = DoctorState & DoctorActions

export const useDoctorStore = create<DoctorStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      doctors: [],
      selectedDoctor: null,
      isLoading: false,
      error: null,

      // Data operations
      loadDoctors: async () => {
        set({ isLoading: true, error: null })
        try {
          console.log('🔄 Loading doctors from API...')
          const doctors = await window.electronAPI?.doctors?.getAll() || []
          console.log('✅ Loaded', doctors.length, 'doctors:', doctors)
          set({
            doctors,
            isLoading: false
          })
        } catch (error) {
          console.error('❌ Error loading doctors:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to load doctors',
            isLoading: false
          })
        }
      },

      createDoctor: async (doctor) => {
        set({ isLoading: true, error: null })
        try {
          console.log('🔄 Creating doctor in store:', doctor)
          
          const newDoctor = await window.electronAPI.doctors.create(doctor)
          const { doctors } = get()
          const updatedDoctors = [...doctors, newDoctor]

          set({
            doctors: updatedDoctors,
            isLoading: false
          })

          // Notify other stores about doctor addition for real-time sync
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('doctor-added', {
              detail: {
                doctorId: newDoctor.id,
                doctorName: newDoctor.name || 'New Doctor'
              }
            }))
            window.dispatchEvent(new CustomEvent('doctor-changed', {
              detail: {
                type: 'created',
                doctorId: newDoctor.id,
                doctorName: newDoctor.name || 'New Doctor'
              }
            }))
          }
          
          // Return the created doctor
          return newDoctor
        } catch (error) {
          console.error('Error creating doctor:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to create doctor',
            isLoading: false
          })
          throw error
        }
      },

      updateDoctor: async (id, updates) => {
        try {
          const updatedDoctor = await window.electronAPI?.doctors?.update(id, updates)
          if (updatedDoctor) {
            set((state) => ({
              doctors: state.doctors.map(d => d.id === id ? updatedDoctor : d),
              selectedDoctor: state.selectedDoctor?.id === id ? updatedDoctor : state.selectedDoctor,
              error: null
            }))
            // إرسال حدث للتحديث الفوري
            window.dispatchEvent(new CustomEvent('doctor-updated', { detail: { doctorId: id } }))
          }
        } catch (error) {
          console.error('Error updating doctor:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to update doctor'
          })
          throw error
        }
      },

      deleteDoctor: async (id) => {
        try {
          await window.electronAPI?.doctors?.delete(id)
          set((state) => ({
            doctors: state.doctors.filter(d => d.id !== id),
            selectedDoctor: state.selectedDoctor?.id === id ? null : state.selectedDoctor,
            error: null
          }))
          // إرسال حدث للتحديث الفوري
          window.dispatchEvent(new CustomEvent('doctor-deleted', { detail: { doctorId: id } }))
        } catch (error) {
          console.error('Error deleting doctor:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to delete doctor'
          })
          throw error
        }
      },

      // Search functionality
      searchDoctors: async (query) => {
        try {
          const searchResults = await window.electronAPI?.doctors?.search?.(query) || []
          console.log('🔍 Search results for doctors:', query, searchResults.length, 'results')
          return searchResults
        } catch (error) {
          console.error('Error searching doctors:', error)
          return []
        }
      },

      // UI state
      setSelectedDoctor: (doctor) => {
        set({ selectedDoctor: doctor })
      },

      clearError: () => {
        set({ error: null })
      }
    }),
    { name: 'DoctorStore' }
  )
)
