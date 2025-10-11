declare global {
  interface Window {
    electronAPI: {
      patients: {
        getAll: () => Promise<any[]>
        getById: (id: string) => Promise<any>
        create: (patient: any) => Promise<any>
        update: (id: string, patient: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
      }
      appointments: {
        getAll: () => Promise<any[]>
        getByPatient: (patientId: string) => Promise<any[]>
        create: (appointment: any) => Promise<any>
        update: (id: string, appointment: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
      }
      payments: {
        getAll: () => Promise<any[]>
        create: (payment: any) => Promise<any>
        update: (id: string, payment: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
        getByToothTreatment: (toothTreatmentId: string) => Promise<any[]>
        getToothTreatmentSummary: (toothTreatmentId: string) => Promise<any>
      }
      treatments: {
        getAll: () => Promise<any[]>
        create: (treatment: any) => Promise<any>
      }
      toothTreatments: {
        getAll: () => Promise<any[]>
        getByPatient: (patientId: string) => Promise<any[]>
        create: (treatment: any) => Promise<any>
        update: (id: string, treatment: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
      }
      prescriptions: {
        getAll: () => Promise<any[]>
        getByPatient: (patientId: string) => Promise<any[]>
        create: (prescription: any) => Promise<any>
        update: (id: string, prescription: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
      }
      medications: {
        getAll: () => Promise<any[]>
        create: (medication: any) => Promise<any>
        update: (id: string, medication: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
      }
      labOrders: {
        getAll: () => Promise<any[]>
        getByPatient: (patientId: string) => Promise<any[]>
        create: (labOrder: any) => Promise<any>
        update: (id: string, labOrder: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
      }
      globalSearch: {
        search: (criteria: any) => Promise<any>
      }
      smartAlerts: {
        getAll: () => Promise<any[]>
        create: (alert: any) => Promise<any>
        update: (id: string, alert: any) => Promise<any>
        markAsRead: (id: string) => Promise<void>
        dismiss: (id: string) => Promise<void>
        snooze: (id: string, snoozeUntil: string) => Promise<void>
      }
      quickAccess: {
        getData: () => Promise<any>
      }
      activities: {
        getRecent: () => Promise<any[]>
        create: (activity: any) => Promise<any>
      }
      patientTimeline: {
        getByPatient: (patientId: string) => Promise<any[]>
        create: (event: any) => Promise<any>
      }
      treatmentPlans: {
        getByPatient: (patientId: string) => Promise<any[]>
        create: (plan: any) => Promise<any>
        update: (id: string, plan: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
      }
      inventory: {
        getAll: () => Promise<any[]>
        create: (item: any) => Promise<any>
        update: (id: string, item: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
      }
      inventoryUsage: {
        getAll: () => Promise<any[]>
        create: (usage: any) => Promise<any>
        getByItem: (itemId: string) => Promise<any[]>
        getByAppointment: (appointmentId: string) => Promise<any[]>
      }
      backup: {
        create: () => Promise<string>
        restore: (backupPath: string) => Promise<boolean>
        list: () => Promise<string[]>
      }
      dialog: {
        showOpenDialog: (options: any) => Promise<any>
        showSaveDialog: (options: any) => Promise<any>
      }
      settings: {
        get: () => Promise<any>
        update: (settings: any) => Promise<any>
      }
      labs: {
        getAll: () => Promise<any[]>
        create: (lab: any) => Promise<any>
        update: (id: string, lab: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
      }
      labOrders: {
        getAll: () => Promise<any[]>
        create: (labOrder: any) => Promise<any>
        update: (id: string, labOrder: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
      }
      medications: {
        getAll: () => Promise<any[]>
        create: (medication: any) => Promise<any>
        update: (id: string, medication: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
      }
      prescriptions: {
        getAll: () => Promise<any[]>
        create: (prescription: any) => Promise<any>
        update: (id: string, prescription: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
      }

      dentalTreatmentImages: {
        getAll: () => Promise<any[]>
        getByTreatment: (treatmentId: string) => Promise<any[]>
        create: (image: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
      }
      files: {
        uploadDentalImage: (fileBuffer: ArrayBuffer, fileName: string, patientId: string, toothNumber: number) => Promise<string>
        saveDentalImage: (base64Data: string, fileName: string, patientId: string, toothNumber: number) => Promise<string>
      }
      clinicNeeds: {
        getAll: () => Promise<any[]>
        create: (need: any) => Promise<any>
        update: (id: string, need: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
        getByStatus: (status: string) => Promise<any[]>
        getByPriority: (priority: string) => Promise<any[]>
        getStatistics: () => Promise<any>
      }
      clinicExpenses: {
        getAll: () => Promise<any[]>
        create: (expense: any) => Promise<any>
        update: (id: string, expense: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
        getByType: (expenseType: string) => Promise<any[]>
        getByStatus: (status: string) => Promise<any[]>
        getRecurring: () => Promise<any[]>
        getStatistics: () => Promise<any>
      }
      whatsappReminders: {
        getSettings: () => Promise<{
          whatsapp_reminder_enabled: boolean
          hours_before: number
          message: string
          custom_enabled: boolean
        }>
        setSettings: (settings: {
          whatsapp_reminder_enabled?: boolean
          hours_before?: number
          message?: string
          custom_enabled?: boolean
        }) => Promise<void>
        testSendReminder: (phoneNumber: string, message: string) => Promise<{
          success: boolean
          error?: string
        }>
        resetSession: () => Promise<void>
        getStatus: () => Promise<{
          isReady: boolean
          hasQr: boolean
          qr?: string
        }>
      }
      system: {
        getVersion: () => Promise<string>
        getPath: (name: string) => Promise<string>
        openExternal: (url: string) => Promise<void>
      }
    }
    electron: {
      getWhatsAppSettings(): Promise<{
        enableReminder: boolean
        hoursBefore: number
        messageText: string
        allowCustomMessage: boolean
      }>
      setWhatsAppSettings(settings: {
        enableReminder: boolean
        hoursBefore: number
        messageText: string
        allowCustomMessage: boolean
      }): Promise<void>
    }
  }
}

export {}

// Type shim for qrcode-terminal
declare module 'qrcode-terminal'