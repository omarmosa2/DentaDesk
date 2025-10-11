import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Appointment, CalendarEvent } from '../types'
import { SmartAlertsService } from '@/services/smartAlertsService'

interface AppointmentState {
  appointments: Appointment[]
  selectedAppointment: Appointment | null
  isLoading: boolean
  error: string | null
  calendarView: 'month' | 'week' | 'day' | 'agenda'
  selectedDate: Date
  calendarEvents: CalendarEvent[]
}

interface AppointmentActions {
  // Data operations
  loadAppointments: () => Promise<void>
  createAppointment: (appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateAppointment: (id: string, appointment: Partial<Appointment>) => Promise<void>
  deleteAppointment: (id: string) => Promise<void>

  // UI state
  setSelectedAppointment: (appointment: Appointment | null) => void
  setCalendarView: (view: 'month' | 'week' | 'day' | 'agenda') => void
  setSelectedDate: (date: Date) => void
  clearError: () => void

  // Calendar operations
  convertToCalendarEvents: () => void
  getAppointmentsForDate: (date: Date) => Appointment[]
  getAppointmentsForDateRange: (startDate: Date, endDate: Date) => Appointment[]

  // Status operations
  markAsCompleted: (id: string) => Promise<void>
  markAsCancelled: (id: string) => Promise<void>
  markAsNoShow: (id: string) => Promise<void>
}

type AppointmentStore = AppointmentState & AppointmentActions

export const useAppointmentStore = create<AppointmentStore>()(
  devtools(
    (set, get) => {

      return {
        // Initial state
        appointments: [],
        selectedAppointment: null,
        isLoading: false,
        error: null,
        calendarView: 'month',
        selectedDate: new Date(),
        calendarEvents: [],

      // Data operations
      loadAppointments: async () => {
        const startTime = performance.now()
        set({ isLoading: true, error: null })
        try {
          const apiStartTime = performance.now()
          const appointments = await window.electronAPI.appointments.getAll()
          const apiEndTime = performance.now()

          if (appointments.length > 0) {

          }

          const updateStartTime = performance.now()
          set({
            appointments,
            isLoading: false
          })
          const updateEndTime = performance.now()
          // Convert to calendar events
          get().convertToCalendarEvents()
        } catch (error) {
          const endTime = performance.now()
          console.error('🏪 Store: Failed to load appointments:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to load appointments',
            isLoading: false
          })
        }
      },

      createAppointment: async (appointmentData) => {
        set({ isLoading: true, error: null })
        try {
          const newAppointment = await window.electronAPI.appointments.create(appointmentData)
          const { appointments } = get()
          const updatedAppointments = [...appointments, newAppointment]

          set({
            appointments: updatedAppointments,
            isLoading: false
          })

          // Update calendar events
          get().convertToCalendarEvents()

          // Emit events for real-time sync
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('appointment-added', {
              detail: {
                type: 'created',
                appointmentId: newAppointment.id,
                appointment: newAppointment
              }
            }))
            window.dispatchEvent(new CustomEvent('appointment-changed', {
              detail: {
                type: 'created',
                appointmentId: newAppointment.id,
                appointment: newAppointment
              }
            }))
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create appointment',
            isLoading: false
          })
        }
      },

      updateAppointment: async (id, appointmentData) => {
        set({ isLoading: true, error: null })
        try {
          console.log('🏪 Store: Updating appointment:', { id, appointmentData })

          // حذف التنبيهات القديمة المرتبطة بهذا الموعد قبل التحديث
          try {
            await SmartAlertsService.deleteAppointmentAlerts(id)
          } catch (error) {
            console.warn('Could not delete old appointment alerts:', error)
          }

          const updatedAppointment = await window.electronAPI.appointments.update(id, appointmentData)
          console.log('🏪 Store: Received updated appointment:', updatedAppointment)

          const { appointments, selectedAppointment } = get()

          const updatedAppointments = appointments.map(a =>
            a.id === id ? updatedAppointment : a
          )

          console.log('🏪 Store: Updated appointments array, found:', updatedAppointments.filter(a => a.id === id).length)

          set({
            appointments: updatedAppointments,
            selectedAppointment: selectedAppointment?.id === id ? updatedAppointment : selectedAppointment,
            isLoading: false
          })

          // Update calendar events
          get().convertToCalendarEvents()
          console.log('🏪 Store: Update completed successfully')

          // Reload appointments to ensure we have the latest data with patient info
          await get().loadAppointments()

          // Emit events for real-time sync
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('appointment-updated', {
              detail: {
                type: 'updated',
                appointmentId: id,
                appointment: updatedAppointment
              }
            }))
            window.dispatchEvent(new CustomEvent('appointment-changed', {
              detail: {
                type: 'updated',
                appointmentId: id,
                appointment: updatedAppointment
              }
            }))
          }
        } catch (error) {
          console.error('🏪 Store: Update failed:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to update appointment',
            isLoading: false
          })
          throw error // Re-throw to let the UI handle it
        }
      },

      deleteAppointment: async (id) => {
        set({ isLoading: true, error: null })
        try {
          const success = await window.electronAPI.appointments.delete(id)

          if (success) {
            const { appointments, selectedAppointment } = get()
            const updatedAppointments = appointments.filter(a => a.id !== id)

            set({
              appointments: updatedAppointments,
              selectedAppointment: selectedAppointment?.id === id ? null : selectedAppointment,
              isLoading: false
            })

            // Update calendar events
            get().convertToCalendarEvents()

            // Emit events for real-time sync
            if (typeof window !== 'undefined' && window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('appointment-deleted', {
                detail: {
                  type: 'deleted',
                  appointmentId: id
                }
              }))
              window.dispatchEvent(new CustomEvent('appointment-changed', {
                detail: {
                  type: 'deleted',
                  appointmentId: id
                }
              }))
            }
          } else {
            throw new Error('Failed to delete appointment')
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete appointment',
            isLoading: false
          })
        }
      },

      // UI state management
      setSelectedAppointment: (appointment) => {
        set({ selectedAppointment: appointment })
      },

      setCalendarView: (view) => {
        set({ calendarView: view })
      },

      setSelectedDate: (date) => {
        set({ selectedDate: date })
      },

      clearError: () => {
        set({ error: null })
      },

      // Calendar operations
      convertToCalendarEvents: () => {
        const { appointments } = get()

        const events: CalendarEvent[] = appointments.map(appointment => {
          // Create a more informative title that includes patient name
          // Try multiple sources for patient name
          const patientName = appointment.patient?.full_name ||
                              appointment.patient_name ||
                              (appointment as any).patient_name ||
                              'مريض غير معروف'

          // Only log if patient name is missing for debugging
          if (patientName === 'مريض غير معروف') {
            console.log('🗓️ Calendar: Missing patient data for appointment:', {
              id: appointment.id,
              patient_id: appointment.patient_id,
              patient: appointment.patient,
              patient_name: appointment.patient_name
            })
          }

          const startTime = new Date(appointment.start_time)
          const timeStr = startTime.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })

          // Format: "اسم المريض - الوقت"
          const displayTitle = `${patientName} - ${timeStr}`

          return {
            id: appointment.id,
            title: displayTitle,
            start: new Date(appointment.start_time),
            end: new Date(appointment.end_time),
            resource: appointment
          }
        })

        set({ calendarEvents: events })
      },

      getAppointmentsForDate: (date) => {
        const { appointments } = get()
        const targetDate = date.toISOString().split('T')[0]

        return appointments.filter(appointment => {
          const appointmentDate = new Date(appointment.start_time).toISOString().split('T')[0]
          return appointmentDate === targetDate
        })
      },

      getAppointmentsForDateRange: (startDate, endDate) => {
        const { appointments } = get()

        return appointments.filter(appointment => {
          const appointmentDate = new Date(appointment.start_time)
          return appointmentDate >= startDate && appointmentDate <= endDate
        })
      },

      // Status operations
      markAsCompleted: async (id) => {
        await get().updateAppointment(id, { status: 'completed' })
      },

      markAsCancelled: async (id) => {
        await get().updateAppointment(id, { status: 'cancelled' })
      },

      markAsNoShow: async (id) => {
        await get().updateAppointment(id, { status: 'no_show' })
      }
      }
    },
    {
      name: 'appointment-store',
    }
  )
)

// Setup event listeners outside of store creation to avoid hooks order issues
if (typeof window !== 'undefined') {
  // We'll set up event listeners when the store is first used
  let listenersSetup = false

  const setupEventListeners = () => {
    if (listenersSetup) return
    listenersSetup = true

    window.addEventListener('patient-deleted', (event: any) => {
      const { patientId } = event.detail
      // Get the store instance (this will be called when the store is actually used)
      const store = useAppointmentStore.getState()

      const { appointments, selectedAppointment } = store

      // Remove appointments for deleted patient
      const updatedAppointments = appointments.filter(a => a.patient_id !== patientId)

      useAppointmentStore.setState({
        appointments: updatedAppointments,
        selectedAppointment: selectedAppointment?.patient_id === patientId ? null : selectedAppointment
      })

      // Update calendar events
      store.convertToCalendarEvents()

      console.log(`🗑️ Removed ${appointments.length - updatedAppointments.length} appointments for deleted patient ${patientId}`)
    })
  }

  // Setup listeners when the store is first accessed
  useAppointmentStore.subscribe(() => {
    setupEventListeners()
  })
}
