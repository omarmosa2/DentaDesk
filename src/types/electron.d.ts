import {
  Patient,
  Appointment,
  Payment,
  Treatment,
  ToothTreatment,
  TreatmentSession,
  ClinicSettings,
  DashboardStats,
  ReportFilter,
  PatientReportData,
  AppointmentReportData,
  FinancialReportData,
  InventoryReportData,
  AnalyticsReportData,
  ReportData,
  ReportExportOptions,
  Lab,
  LabOrder
} from './index'

export interface ElectronAPI {
  // Patient operations
  patients: {
    getAll: () => Promise<Patient[]>
    getById: (id: string) => Promise<Patient | null>
    create: (patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => Promise<Patient>
    update: (id: string, patient: Partial<Patient>) => Promise<Patient | null>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<Patient[]>
  }

  // Appointment operations
  appointments: {
    getAll: () => Promise<Appointment[]>
    create: (appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => Promise<Appointment>
    update: (id: string, appointment: Partial<Appointment>) => Promise<Appointment | null>
    delete: (id: string) => Promise<boolean>
  }

  // Payment operations
  payments: {
    getAll: () => Promise<Payment[]>
    create: (payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) => Promise<Payment>
    update: (id: string, payment: Partial<Payment>) => Promise<Payment | null>
    delete: (id: string) => Promise<boolean>
  }

  // Treatment operations
  treatments: {
    getAll: () => Promise<Treatment[]>
    create: (treatment: Omit<Treatment, 'id' | 'created_at' | 'updated_at'>) => Promise<Treatment>
    update: (id: string, treatment: Partial<Treatment>) => Promise<Treatment | null>
    delete: (id: string) => Promise<boolean>
  }

  // Settings operations
  settings: {
    get: () => Promise<ClinicSettings | null>
    update: (settings: Partial<ClinicSettings>) => Promise<ClinicSettings>
  }

  // Dashboard operations
  dashboard: {
    getStats: () => Promise<DashboardStats>
  }

  // Tooth Treatments operations
  toothTreatments: {
    getAll: () => Promise<ToothTreatment[]>
    getByPatient: (patientId: string) => Promise<ToothTreatment[]>
    getByTooth: (patientId: string, toothNumber: number) => Promise<ToothTreatment[]>
    create: (treatment: Omit<ToothTreatment, 'id' | 'created_at' | 'updated_at'>) => Promise<ToothTreatment>
    update: (id: string, treatment: Partial<ToothTreatment>) => Promise<ToothTreatment | null>
    delete: (id: string) => Promise<boolean>
    reorder: (patientId: string, toothNumber: number, treatmentIds: string[]) => Promise<void>
  }

  // Treatment Sessions operations
  treatmentSessions: {
    getAll: () => Promise<TreatmentSession[]>
    getByTreatment: (treatmentId: string) => Promise<TreatmentSession[]>
    create: (session: Omit<TreatmentSession, 'id' | 'created_at' | 'updated_at'>) => Promise<TreatmentSession>
    update: (id: string, session: Partial<TreatmentSession>) => Promise<TreatmentSession | null>
    delete: (id: string) => Promise<boolean>
    getById: (id: string) => Promise<TreatmentSession | null>
  }

  // Backup operations
  backup: {
    create: () => Promise<string>
    restore: (backupPath: string) => Promise<boolean>
    list: () => Promise<string[]>
    delete: (backupName: string) => Promise<boolean>
  }

  // File operations
  files: {
    selectFile: (options?: any) => Promise<string | null>
    selectDirectory: (options?: any) => Promise<string | null>
    saveFile: (options?: any) => Promise<string | null>
  }

  // Export operations
  export: {
    pdf: (data: any, type: string) => Promise<string>
    excel: (data: any, type: string) => Promise<string>
  }

  // System operations
  system: {
    getVersion: () => Promise<string>
    getPath: (name: string) => Promise<string>
    openExternal: (url: string) => Promise<void>
  }

  // Shell operations (for compatibility)
  shell?: {
    openExternal?: (url: string) => Promise<void>
  }

  // Dialog operations
  dialog: {
    showOpenDialog: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>
    showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string }>
  }

  // Lab operations
  labs: {
    getAll: () => Promise<Lab[]>
    create: (lab: Omit<Lab, 'id' | 'created_at' | 'updated_at'>) => Promise<Lab>
    update: (id: string, lab: Partial<Lab>) => Promise<Lab | null>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<Lab[]>
  }

  // Lab order operations
  labOrders: {
    getAll: () => Promise<LabOrder[]>
    create: (labOrder: Omit<LabOrder, 'id' | 'created_at' | 'updated_at'>) => Promise<LabOrder>
    update: (id: string, labOrder: Partial<LabOrder>) => Promise<LabOrder | null>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<LabOrder[]>
  }

  // Medication operations
  medications: {
    getAll: () => Promise<Medication[]>
    create: (medication: Omit<Medication, 'id' | 'created_at' | 'updated_at'>) => Promise<Medication>
    update: (id: string, medication: Partial<Medication>) => Promise<Medication | null>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<Medication[]>
  }

  // Prescription operations
  prescriptions: {
    getAll: () => Promise<Prescription[]>
    create: (prescription: Omit<Prescription, 'id' | 'created_at' | 'updated_at'>) => Promise<Prescription>
    update: (id: string, prescription: Partial<Prescription>) => Promise<Prescription | null>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<Prescription[]>
  }

  // Reports operations
  reports: {
    generatePatientReport: (filter: ReportFilter) => Promise<PatientReportData>
    generateAppointmentReport: (filter: ReportFilter) => Promise<AppointmentReportData>
    generateFinancialReport: (filter: ReportFilter) => Promise<FinancialReportData>
    generateInventoryReport: (filter: ReportFilter) => Promise<InventoryReportData>
    generateAnalyticsReport: (filter: ReportFilter) => Promise<AnalyticsReportData>
    generateOverviewReport: (filter: ReportFilter) => Promise<ReportData>
    exportReport: (type: string, filter: ReportFilter, options: ReportExportOptions) => Promise<string>
  }

  // Authentication operations
  auth: {
    clearSession: () => Promise<{ success: boolean; error?: string }>
  }

  // WhatsApp reminders operations
  whatsappReminders: {
    getSettings: () => Promise<{
      whatsapp_reminder_enabled: number;
      hours_before: number;
      minutes_before: number;
      message: string;
      custom_enabled: number;
    }>
    setSettings: (settings: any) => Promise<{ success: boolean; settings?: any; error?: string }>
    testSendReminder: (phoneNumber: string, message: string) => Promise<{ success: boolean; error?: string }>
    resetSession: () => Promise<{ success: boolean; error?: string }>
    generateNewQR: () => Promise<{ success: boolean; error?: string }>
    getStatus: () => Promise<{
      isReady: boolean;
      hasQr: boolean;
      qr: string | null;
      lastReadyAt: number | null;
      state: string;
    }>
    logoutOtherDevices: () => Promise<{ success: boolean; error?: string }>
  }

  // WhatsApp event listeners
  onWhatsAppQR: (callback: (qr: string) => void) => (() => void)
  on: (event: string, callback: (event: any, data: any) => void) => (() => void)
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
