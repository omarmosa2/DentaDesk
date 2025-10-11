import { contextBridge, ipcRenderer } from 'electron'

// Define the API interface
export interface ElectronAPI {
  // Patient operations
  patients: {
    getAll: () => Promise<any[]>
    getById: (id: string) => Promise<any>
    create: (patient: any) => Promise<any>
    update: (id: string, patient: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<any[]>
  }

  // Appointment operations
  appointments: {
    getAll: () => Promise<any[]>
    getByPatient: (patientId: string) => Promise<any[]>
    create: (appointment: any) => Promise<any>
    update: (id: string, appointment: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    checkConflict: (startTime: string, endTime: string, excludeId?: string) => Promise<boolean>
    search: (query: string) => Promise<any[]>
  }

  // Payment operations
  payments: {
    getAll: () => Promise<any[]>
    getByPatient: (patientId: string) => Promise<any[]>
    getByToothTreatment: (toothTreatmentId: string) => Promise<any[]>
    getToothTreatmentSummary: (toothTreatmentId: string) => Promise<any>
    create: (payment: any) => Promise<any>
    update: (id: string, payment: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<any[]>
  }

  // Inventory operations
  inventory: {
    getAll: () => Promise<any[]>
    create: (item: any) => Promise<any>
    update: (id: string, item: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<any[]>
  }

  // Inventory usage operations
  inventoryUsage: {
    getAll: () => Promise<any[]>
    create: (usage: any) => Promise<any>
    getByItem: (itemId: string) => Promise<any[]>
    getByAppointment: (appointmentId: string) => Promise<any[]>
  }

  // Treatment operations
  treatments: {
    getAll: () => Promise<any[]>
    create: (treatment: any) => Promise<any>
    search: (query: string) => Promise<any[]>
  }

  // Backup operations
  backup: {
    create: () => Promise<string>
    restore: (backupPath: string) => Promise<boolean>
    list: () => Promise<string[]>
  }

  // Dialog operations
  dialog: {
    showOpenDialog: (options: any) => Promise<any>
    showSaveDialog: (options: any) => Promise<any>
  }

  // Settings operations
  settings: {
    get: () => Promise<any>
    update: (settings: any) => Promise<any>
  }

  // WhatsApp reminder operations
  whatsappReminders: {
    getSettings: () => Promise<{
      whatsapp_reminder_enabled: boolean
      hours_before: number
      message: string
      custom_enabled: boolean
      minutes_before?: number // Add minutes_before here
    }>
    setSettings: (settings: {
      whatsapp_reminder_enabled?: boolean
      hours_before?: number
      message?: string
      custom_enabled?: boolean
      minutes_before?: number // Add minutes_before here
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

  // Lab operations
  labs: {
    getAll: () => Promise<any[]>
    create: (lab: any) => Promise<any>
    update: (id: string, lab: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<any[]>
  }

  // Lab order operations
  labOrders: {
    getAll: () => Promise<any[]>
    getByPatient: (patientId: string) => Promise<any[]>
    create: (labOrder: any) => Promise<any>
    update: (id: string, labOrder: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<any[]>
  }

  // Medication operations
  medications: {
    getAll: () => Promise<any[]>
    create: (medication: any) => Promise<any>
    update: (id: string, medication: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<any[]>
  }

  // Prescription operations
  prescriptions: {
    getAll: () => Promise<any[]>
    getByPatient: (patientId: string) => Promise<any[]>
    create: (prescription: any) => Promise<any>
    update: (id: string, prescription: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<any[]>
  }

  // Dental Treatment operations (LEGACY - for backward compatibility)
  dentalTreatments: {
    getAll: () => Promise<any[]>
    getByPatient: (patientId: string) => Promise<any[]>
    create: (treatment: any) => Promise<any>
    update: (id: string, treatment: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
  }

  // NEW: Multiple treatments per tooth operations
  toothTreatments: {
    getAll: () => Promise<any[]>
    getByPatient: (patientId: string) => Promise<any[]>
    getByTooth: (patientId: string, toothNumber: number) => Promise<any[]>
    create: (treatment: any) => Promise<any>
    update: (id: string, treatment: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    reorder: (patientId: string, toothNumber: number, treatmentIds: string[]) => Promise<void>
  }

  // Dental Treatment Images operations
  dentalTreatmentImages: {
    getAll: () => Promise<any[]>
    getByTreatment: (treatmentId: string) => Promise<any[]>
    create: (image: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
  }

  // File operations
  files: {
    uploadDentalImage: (fileBuffer: ArrayBuffer, fileName: string, patientId: string, toothNumber: number) => Promise<string>
    getDentalImage: (imagePath: string) => Promise<string>
    checkImageExists: (imagePath: string) => Promise<boolean>
    openImagePreview: (imagePath: string) => Promise<void>
  }

  // License operations
  license: {
    checkStatus: () => Promise<{
      isValid: boolean
      error?: string
      isFirstRun: boolean
      licenseData?: any
    }>
    activate: (licenseKey: string) => Promise<{
      success: boolean
      error?: string
      licenseData?: any
    }>
    getMachineInfo: () => Promise<{
      hwid: string
      platform: string
      arch: string
      error?: string
    }>
    getLicenseInfo: () => Promise<{
      license?: string
      hwid: string
      activated: boolean
      timestamp?: number
      error?: string
    } | null>
    clearData: () => Promise<{
      success: boolean
      error?: string
    }>
    getStorageInfo: () => Promise<{
      usingElectronStore: boolean
      storageType: string
      storePath: string
      error?: string
    }>
  }

  // Authentication operations
  auth: {
    clearSession: () => Promise<{ success: boolean; error?: string }>
  }

  // System operations
  system: {
    getVersion: () => Promise<string>
    getPath: (name: string) => Promise<string>
    openExternal: (url: string) => Promise<void>
  }

  // Export operations
  export: {
    pdf: (data: any, type: string) => Promise<any>
    excel: (data: any, type: string) => Promise<any>
  }

  // Reports operations
  reports: {
    generatePatientReport: (filter: any) => Promise<any>
    generateAppointmentReport: (filter: any) => Promise<any>
    generateFinancialReport: (filter: any) => Promise<any>
    generateInventoryReport: (filter: any) => Promise<any>
    generateTreatmentReport: (filter: any) => Promise<any>
    generateAnalyticsReport: (filter: any) => Promise<any>
    generateOverviewReport: (filter: any) => Promise<any>
    exportReport: (type: string, filter: any, options: any) => Promise<any>
  }

  // QR utilities
  qr: {
    saveImage: (payload: { dataUrl?: string; svg?: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>
    openTerminal: (qrText: string) => Promise<{ success: boolean; error?: string }>
  }

  // Debug utilities (for troubleshooting)
  debug: {
    testIPC: () => Promise<{ success: boolean; timestamp: string }>
  }
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  patients: {
    getAll: () => ipcRenderer.invoke('db:patients:getAll'),
    getById: (id) => ipcRenderer.invoke('db:patients:getById', id),
    create: (patient) => ipcRenderer.invoke('db:patients:create', patient),
    update: (id, patient) => ipcRenderer.invoke('db:patients:update', id, patient),
    delete: (id) => ipcRenderer.invoke('db:patients:delete', id),
    search: (query) => ipcRenderer.invoke('db:patients:search', query),
  },

  appointments: {
    getAll: () => ipcRenderer.invoke('db:appointments:getAll'),
    getByPatient: (patientId) => ipcRenderer.invoke('db:appointments:getByPatient', patientId),
    create: (appointment) => ipcRenderer.invoke('db:appointments:create', appointment),
    update: (id, appointment) => ipcRenderer.invoke('db:appointments:update', id, appointment),
    delete: (id) => ipcRenderer.invoke('db:appointments:delete', id),
    checkConflict: (startTime, endTime, excludeId) => ipcRenderer.invoke('db:appointments:checkConflict', startTime, endTime, excludeId),
    search: (query) => ipcRenderer.invoke('db:appointments:search', query),
  },

  payments: {
    getAll: () => ipcRenderer.invoke('db:payments:getAll'),
    getByPatient: (patientId) => ipcRenderer.invoke('db:payments:getByPatient', patientId),
    getByToothTreatment: (toothTreatmentId) => ipcRenderer.invoke('db:payments:getByToothTreatment', toothTreatmentId),
    getToothTreatmentSummary: (toothTreatmentId) => ipcRenderer.invoke('db:payments:getToothTreatmentSummary', toothTreatmentId),
    create: (payment) => ipcRenderer.invoke('db:payments:create', payment),
    update: (id, payment) => ipcRenderer.invoke('db:payments:update', id, payment),
    delete: (id) => ipcRenderer.invoke('db:payments:delete', id),
    search: (query) => ipcRenderer.invoke('db:payments:search', query),
  },

  treatments: {
    getAll: () => ipcRenderer.invoke('db:treatments:getAll'),
    create: (treatment) => ipcRenderer.invoke('db:treatments:create', treatment),
    search: (query) => ipcRenderer.invoke('db:treatments:search', query),
  },

  inventory: {
    getAll: () => ipcRenderer.invoke('db:inventory:getAll'),
    create: (item) => ipcRenderer.invoke('db:inventory:create', item),
    update: (id, item) => ipcRenderer.invoke('db:inventory:update', id, item),
    delete: (id) => ipcRenderer.invoke('db:inventory:delete', id),
    search: (query) => ipcRenderer.invoke('db:inventory:search', query),
  },

  inventoryUsage: {
    getAll: () => ipcRenderer.invoke('db:inventoryUsage:getAll'),
    create: (usage) => ipcRenderer.invoke('db:inventoryUsage:create', usage),
    getByItem: (itemId) => ipcRenderer.invoke('db:inventoryUsage:getByItem', itemId),
    getByAppointment: (appointmentId) => ipcRenderer.invoke('db:inventoryUsage:getByAppointment', appointmentId),
  },

  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: (backupPath) => ipcRenderer.invoke('backup:restore', backupPath),
    list: () => ipcRenderer.invoke('backup:list'),
  },

  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options),
  },

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings) => ipcRenderer.invoke('settings:update', settings),
  },

  whatsappReminders: {
    getSettings: () => ipcRenderer.invoke('whatsapp-reminders:get-settings'),
    setSettings: (settings) => ipcRenderer.invoke('whatsapp-reminders:set-settings', settings),
    testSendReminder: (phoneNumber, message) => ipcRenderer.invoke('whatsapp-reminders:test-send', phoneNumber, message),
    resetSession: () => ipcRenderer.invoke('whatsapp-reminders:reset-session'),
    getStatus: () => ipcRenderer.invoke('whatsapp-reminders:get-status'),
    logoutOtherDevices: () => ipcRenderer.invoke('whatsapp-reminders:logout-other-devices'),
  },

  labs: {
    getAll: () => ipcRenderer.invoke('db:labs:getAll'),
    create: (lab) => ipcRenderer.invoke('db:labs:create', lab),
    update: (id, lab) => ipcRenderer.invoke('db:labs:update', id, lab),
    delete: (id) => ipcRenderer.invoke('db:labs:delete', id),
    search: (query) => ipcRenderer.invoke('db:labs:search', query),
  },

  labOrders: {
    getAll: () => ipcRenderer.invoke('db:labOrders:getAll'),
    getByPatient: (patientId) => ipcRenderer.invoke('db:labOrders:getByPatient', patientId),
    create: (labOrder) => ipcRenderer.invoke('db:labOrders:create', labOrder),
    update: (id, labOrder) => ipcRenderer.invoke('db:labOrders:update', id, labOrder),
    delete: (id) => ipcRenderer.invoke('db:labOrders:delete', id),
    search: (query) => ipcRenderer.invoke('db:labOrders:search', query),
  },


  medications: {
    getAll: () => ipcRenderer.invoke('db:medications:getAll'),
    create: (medication) => ipcRenderer.invoke('db:medications:create', medication),
    update: (id, medication) => ipcRenderer.invoke('db:medications:update', id, medication),
    delete: (id) => ipcRenderer.invoke('db:medications:delete', id),
    search: (query) => ipcRenderer.invoke('db:medications:search', query),
  },

  prescriptions: {
    getAll: () => ipcRenderer.invoke('db:prescriptions:getAll'),
    create: (prescription) => ipcRenderer.invoke('db:prescriptions:create', prescription),
    update: (id, prescription) => ipcRenderer.invoke('db:prescriptions:update', id, prescription),
    delete: (id) => ipcRenderer.invoke('db:prescriptions:delete', id),
    getByPatient: (patientId) => ipcRenderer.invoke('db:prescriptions:getByPatient', patientId),
    search: (query) => ipcRenderer.invoke('db:prescriptions:search', query),
  },

  dentalTreatments: {
    getAll: () => ipcRenderer.invoke('db:dentalTreatments:getAll'),
    getByPatient: (patientId) => ipcRenderer.invoke('db:dentalTreatments:getByPatient', patientId),
    create: (treatment) => ipcRenderer.invoke('db:dentalTreatments:create', treatment),
    update: (id, treatment) => ipcRenderer.invoke('db:dentalTreatments:update', id, treatment),
    delete: (id) => ipcRenderer.invoke('db:dentalTreatments:delete', id),
  },

  // NEW: Multiple treatments per tooth operations
  toothTreatments: {
    getAll: () => ipcRenderer.invoke('db:toothTreatments:getAll'),
    getByPatient: (patientId) => ipcRenderer.invoke('db:toothTreatments:getByPatient', patientId),
    getByTooth: (patientId, toothNumber) => ipcRenderer.invoke('db:toothTreatments:getByTooth', patientId, toothNumber),
    create: (treatment) => ipcRenderer.invoke('db:toothTreatments:create', treatment),
    update: (id, treatment) => ipcRenderer.invoke('db:toothTreatments:update', id, treatment),
    delete: (id) => ipcRenderer.invoke('db:toothTreatments:delete', id),
    reorder: (patientId, toothNumber, treatmentIds) => ipcRenderer.invoke('db:toothTreatments:reorder', patientId, toothNumber, treatmentIds),
  },

  // NEW: Tooth Treatment Images operations
  toothTreatmentImages: {
    getAll: () => ipcRenderer.invoke('db:toothTreatmentImages:getAll'),
    getByTreatment: (treatmentId) => ipcRenderer.invoke('db:toothTreatmentImages:getByTreatment', treatmentId),
    getByTooth: (patientId, toothNumber) => ipcRenderer.invoke('db:toothTreatmentImages:getByTooth', patientId, toothNumber),
    create: (image) => ipcRenderer.invoke('db:toothTreatmentImages:create', image),
    delete: (id) => ipcRenderer.invoke('db:toothTreatmentImages:delete', id),
  },

  dentalTreatmentImages: {
    getAll: () => ipcRenderer.invoke('db:dentalTreatmentImages:getAll'),
    getByTreatment: (treatmentId) => ipcRenderer.invoke('db:dentalTreatmentImages:getByTreatment', treatmentId),
    create: (image) => ipcRenderer.invoke('db:dentalTreatmentImages:create', image),
    delete: (id) => ipcRenderer.invoke('db:dentalTreatmentImages:delete', id),
  },

  files: {
    uploadDentalImage: (fileBuffer, fileName, patientId, toothNumber, imageType, patientName, toothName) =>
      ipcRenderer.invoke('files:uploadDentalImage', fileBuffer, fileName, patientId, toothNumber, imageType, patientName, toothName),
    saveDentalImage: (base64Data, fileName, patientId, toothNumber, imageType, patientName, toothName) =>
      ipcRenderer.invoke('files:saveDentalImage', base64Data, fileName, patientId, toothNumber, imageType, patientName, toothName),
    getDentalImage: (imagePath) => ipcRenderer.invoke('files:getDentalImage', imagePath),
    checkImageExists: (imagePath) => ipcRenderer.invoke('files:checkImageExists', imagePath),
    openImagePreview: (imagePath) => ipcRenderer.invoke('files:openImagePreview', imagePath)
  },

  license: {
    checkStatus: () => ipcRenderer.invoke('license:checkStatus'),
    activate: (licenseKey) => ipcRenderer.invoke('license:activate', licenseKey),
    getMachineInfo: () => ipcRenderer.invoke('license:getMachineInfo'),
    getLicenseInfo: () => ipcRenderer.invoke('license:getLicenseInfo'),
    clearData: () => ipcRenderer.invoke('license:clearData'),
    getStorageInfo: () => ipcRenderer.invoke('license:getStorageInfo')
  },

  auth: {
    clearSession: () => ipcRenderer.invoke('auth:clearSession')
  },

  system: {
    getVersion: () => ipcRenderer.invoke('system:getVersion'),
    getPath: (name) => ipcRenderer.invoke('system:getPath', name),
    openExternal: (url) => ipcRenderer.invoke('system:openExternal', url)
  },

  export: {
    pdf: (data, type) => ipcRenderer.invoke('export:pdf', data, type),
    excel: (data, type) => ipcRenderer.invoke('export:excel', data, type)
  },

  reports: {
    generatePatientReport: (filter) => ipcRenderer.invoke('reports:generatePatientReport', filter),
    generateAppointmentReport: (filter) => ipcRenderer.invoke('reports:generateAppointmentReport', filter),
    generateFinancialReport: (filter) => ipcRenderer.invoke('reports:generateFinancialReport', filter),
    generateInventoryReport: (filter) => ipcRenderer.invoke('reports:generateInventoryReport', filter),
    generateTreatmentReport: (filter) => ipcRenderer.invoke('reports:generateTreatmentReport', filter),
    generateAnalyticsReport: (filter) => ipcRenderer.invoke('reports:generateAnalyticsReport', filter),
    generateOverviewReport: (filter) => ipcRenderer.invoke('reports:generateOverviewReport', filter),
    exportReport: (type, filter, options) => ipcRenderer.invoke('reports:exportReport', type, filter, options)
  },

  qr: {
    saveImage: (payload) => ipcRenderer.invoke('qr:save-image', payload),
    openTerminal: (qrText) => ipcRenderer.invoke('qr:open-terminal', qrText)
  },

  // Debug utilities
  debug: {
    testIPC: () => ipcRenderer.invoke('test-ipc'),
    testWhatsAppHandler: () => ipcRenderer.invoke('debug:test-whatsapp-handler')
  },

  // Debug utilities
  debug: {
    testIPC: () => ipcRenderer.invoke('test-ipc')
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
// Expose WhatsApp settings APIs
contextBridge.exposeInMainWorld('electron', {
  getWhatsAppSettings: () => ipcRenderer.invoke('get-whatsapp-settings'),
  setWhatsAppSettings: (settings: any) => ipcRenderer.invoke('set-whatsapp-settings', settings)
})

// Expose QR event subscription
// @ts-ignore
contextBridge.exposeInMainWorld('onWhatsAppQR', (callback: (qr: string) => void) => {
  const listener = (_event: any, qr: string) => callback(qr)
  ipcRenderer.on('whatsapp:qr', listener)
  return () => ipcRenderer.removeListener('whatsapp:qr', listener)
})

// Notify renderer when WhatsApp becomes ready
// @ts-ignore
contextBridge.exposeInMainWorld('onWhatsAppReady', (callback: () => void) => {
  const listener = () => callback()
  ipcRenderer.on('whatsapp:ready', listener)
  return () => ipcRenderer.removeListener('whatsapp:ready', listener)
})


// Type declaration for global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI
    electron: {
      getWhatsAppSettings(): Promise<{
        enableReminder: boolean
        hoursBefore: number
        messageText: string
        allowCustomMessage: boolean
        minutes_before?: number // Add minutes_before here
        custom_enabled?: boolean // Add custom_enabled here
      }>
      setWhatsAppSettings(settings: {
        enableReminder: boolean
        hoursBefore: number
        messageText: string
        allowCustomMessage: boolean
        minutes_before?: number // Add minutes_before here
        custom_enabled?: boolean // Add custom_enabled here
      }): Promise<void>
    }
  }
}
