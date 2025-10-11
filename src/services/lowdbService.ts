import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { join } from 'path'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import {
  Patient,
  Appointment,
  Payment,
  Treatment,
  InventoryItem,
  ClinicSettings,
  DashboardStats,
  DatabaseSchema
} from '../types'

export class LowDBService {
  private db: Low<DatabaseSchema>

  constructor() {
    const dbPath = join(app.getPath('userData'), 'dental_clinic.json')
    const adapter = new JSONFile<DatabaseSchema>(dbPath)
    this.db = new Low(adapter, this.getDefaultData())
    this.initializeDatabase()
  }

  private getDefaultData(): DatabaseSchema {
    return {
      patients: [],
      appointments: [],
      payments: [],
      treatments: this.getDefaultTreatments(),
      inventory: [],
      settings: [this.getDefaultSettings()],
      installmentPayments: [],
      patientImages: [],
      inventoryUsage: []
    }
  }

  private getDefaultTreatments(): Treatment[] {
    const now = new Date().toISOString()
    return [
      {
        id: uuidv4(),
        name: 'فحص عام',
        description: 'فحص شامل للأسنان واللثة',
        default_cost: 100,
        duration_minutes: 30,
        category: 'العلاجات الوقائية',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'تنظيف الأسنان',
        description: 'تنظيف وتلميع الأسنان',
        default_cost: 150,
        duration_minutes: 45,
        category: 'العلاجات الوقائية',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'حشو الأسنان',
        description: 'حشو الأسنان المتضررة',
        default_cost: 200,
        duration_minutes: 60,
        category: 'الترميمية (المحافظة)',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'قلع الأسنان',
        description: 'إجراء إزالة الأسنان',
        default_cost: 200,
        duration_minutes: 45,
        category: 'العلاجات الجراحية',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'تاج الأسنان',
        description: 'إجراء تركيب تاج الأسنان',
        default_cost: 800,
        duration_minutes: 120,
        category: 'التعويضات',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'علاج العصب',
        description: 'علاج عصب الأسنان',
        default_cost: 600,
        duration_minutes: 90,
        category: 'علاج العصب',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'تبييض الأسنان',
        description: 'تبييض الأسنان المهني',
        default_cost: 300,
        duration_minutes: 60,
        category: 'العلاجات التجميلية',
        created_at: now,
        updated_at: now
      }
    ]
  }

  private getDefaultSettings(): ClinicSettings {
    const now = new Date().toISOString()
    return {
      id: uuidv4(),
      clinic_name: 'عيادة الأسنان',
      doctor_name: 'د. محمد أحمد',
      clinic_address: '',
      clinic_phone: '',
      clinic_email: '',
      clinic_logo: '',
      currency: 'USD',
      language: 'ar',
      timezone: 'Asia/Riyadh',
      backup_frequency: 'daily',
      auto_save_interval: 300,
      appointment_duration: 30,
      working_hours_start: '08:00',
      working_hours_end: '18:00',
      working_days: 'السبت,الأحد,الاثنين,الثلاثاء,الأربعاء',
      app_password: null,
      password_enabled: 0,
      // WhatsApp reminder settings
      whatsapp_reminder_enabled: 0,
      whatsapp_reminder_hours_before: 3,
      whatsapp_reminder_minutes_before: 180,
      whatsapp_reminder_message: 'مرحبًا {{patient_name}}، تذكير بموعدك في عيادة الأسنان بتاريخ {{appointment_date}} الساعة {{appointment_time}}. نشكرك على التزامك.',
      whatsapp_reminder_custom_enabled: 0,
      created_at: now,
      updated_at: now
    }
  }

  private async initializeDatabase() {
    await this.db.read()
    if (!this.db.data) {
      this.db.data = this.getDefaultData()
      await this.db.write()
    }
  }

  // Patient operations
  async getAllPatients(): Promise<Patient[]> {
    await this.db.read()
    return this.db.data?.patients || []
  }

  async createPatient(patientData: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<Patient> {
    await this.db.read()
    const now = new Date().toISOString()
    const patient: Patient = {
      ...patientData,
      id: uuidv4(),
      created_at: now,
      updated_at: now
    }

    this.db.data!.patients.push(patient)
    await this.db.write()
    return patient
  }

  async updatePatient(id: string, patientData: Partial<Patient>): Promise<Patient | null> {
    await this.db.read()
    const patientIndex = this.db.data!.patients.findIndex(p => p.id === id)

    if (patientIndex === -1) return null

    const updatedPatient = {
      ...this.db.data!.patients[patientIndex],
      ...patientData,
      updated_at: new Date().toISOString()
    }

    this.db.data!.patients[patientIndex] = updatedPatient
    await this.db.write()
    return updatedPatient
  }

  async deletePatient(id: string): Promise<boolean> {
    await this.db.read()
    const initialLength = this.db.data!.patients.length

    // Delete the patient
    this.db.data!.patients = this.db.data!.patients.filter(p => p.id !== id)

    if (this.db.data!.patients.length < initialLength) {
      // Delete all related appointments
      const appointmentsDeleted = this.db.data!.appointments.filter(a => a.patient_id === id).length
      this.db.data!.appointments = this.db.data!.appointments.filter(a => a.patient_id !== id)

      // Delete all related payments
      const paymentsDeleted = this.db.data!.payments.filter(p => p.patient_id === id).length
      this.db.data!.payments = this.db.data!.payments.filter(p => p.patient_id !== id)

      // Delete all related patient images (if exists)
      if (this.db.data!.patientImages) {
        const imagesDeleted = this.db.data!.patientImages.filter(img => img.patient_id === id).length
        this.db.data!.patientImages = this.db.data!.patientImages.filter(img => img.patient_id !== id)
        console.log(`Deleted ${imagesDeleted} patient images for patient ${id}`)
      }

      // Delete all related installment payments (if exists)
      if (this.db.data!.installmentPayments) {
        const installmentsDeleted = this.db.data!.installmentPayments.filter(inst => inst.patient_id === id).length
        this.db.data!.installmentPayments = this.db.data!.installmentPayments.filter(inst => inst.patient_id !== id)
        console.log(`Deleted ${installmentsDeleted} installment payments for patient ${id}`)
      }

      await this.db.write()

      console.log(`Patient ${id} deleted successfully with:`)
      console.log(`- ${appointmentsDeleted} appointments`)
      console.log(`- ${paymentsDeleted} payments`)

      return true
    }
    return false
  }

  async searchPatients(query: string): Promise<Patient[]> {
    await this.db.read()
    const patients = this.db.data?.patients || []
    const searchTerm = query.toLowerCase()

    return patients.filter(patient =>
      patient.first_name.toLowerCase().includes(searchTerm) ||
      patient.last_name.toLowerCase().includes(searchTerm) ||
      patient.phone?.toLowerCase().includes(searchTerm) ||
      patient.email?.toLowerCase().includes(searchTerm)
    )
  }

  async clearAllPatients(): Promise<void> {
    await this.db.read()
    this.db.data!.patients = []
    await this.db.write()
  }

  // Appointment operations
  async getAllAppointments(): Promise<Appointment[]> {
    await this.db.read()
    const appointments = this.db.data?.appointments || []
    const patients = this.db.data?.patients || []
    const treatments = this.db.data?.treatments || []

    // Populate patient and treatment data
    return appointments.map(appointment => ({
      ...appointment,
      patient: patients.find(p => p.id === appointment.patient_id),
      treatment: treatments.find(t => t.id === appointment.treatment_id)
    }))
  }

  async createAppointment(appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment> {
    await this.db.read()
    const now = new Date().toISOString()
    const appointment: Appointment = {
      ...appointmentData,
      id: uuidv4(),
      created_at: now,
      updated_at: now
    }

    this.db.data!.appointments.push(appointment)
    await this.db.write()
    return appointment
  }

  async updateAppointment(id: string, appointmentData: Partial<Appointment>): Promise<Appointment | null> {
    await this.db.read()
    const appointmentIndex = this.db.data!.appointments.findIndex(a => a.id === id)

    if (appointmentIndex === -1) return null

    const updatedAppointment = {
      ...this.db.data!.appointments[appointmentIndex],
      ...appointmentData,
      updated_at: new Date().toISOString()
    }

    this.db.data!.appointments[appointmentIndex] = updatedAppointment
    await this.db.write()
    return updatedAppointment
  }

  async deleteAppointment(id: string): Promise<boolean> {
    await this.db.read()
    const initialLength = this.db.data!.appointments.length
    this.db.data!.appointments = this.db.data!.appointments.filter(a => a.id !== id)

    if (this.db.data!.appointments.length < initialLength) {
      await this.db.write()
      return true
    }
    return false
  }

  async clearAllAppointments(): Promise<void> {
    await this.db.read()
    this.db.data!.appointments = []
    await this.db.write()
  }

  // Payment operations
  async getAllPayments(): Promise<Payment[]> {
    await this.db.read()
    const payments = this.db.data?.payments || []
    const patients = this.db.data?.patients || []
    const appointments = this.db.data?.appointments || []

    // Populate patient and appointment data
    return payments.map(payment => ({
      ...payment,
      patient: patients.find(p => p.id === payment.patient_id),
      appointment: appointments.find(a => a.id === payment.appointment_id)
    }))
  }

  async createPayment(paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> {
    await this.db.read()
    const now = new Date().toISOString()
    const payment: Payment = {
      ...paymentData,
      id: uuidv4(),
      created_at: now,
      updated_at: now
    }

    this.db.data!.payments.push(payment)
    await this.db.write()
    return payment
  }

  async updatePayment(id: string, paymentData: Partial<Omit<Payment, 'id' | 'created_at' | 'updated_at'>>): Promise<Payment> {
    await this.db.read()
    const paymentIndex = this.db.data!.payments.findIndex(p => p.id === id)

    if (paymentIndex === -1) {
      throw new Error('Payment not found')
    }

    const now = new Date().toISOString()
    const updatedPayment = {
      ...this.db.data!.payments[paymentIndex],
      ...paymentData,
      updated_at: now
    }

    this.db.data!.payments[paymentIndex] = updatedPayment
    await this.db.write()
    return updatedPayment
  }

  async deletePayment(id: string): Promise<boolean> {
    await this.db.read()
    const paymentIndex = this.db.data!.payments.findIndex(p => p.id === id)

    if (paymentIndex === -1) {
      throw new Error('Payment not found')
    }

    this.db.data!.payments.splice(paymentIndex, 1)
    await this.db.write()
    return true
  }

  async clearAllPayments(): Promise<void> {
    await this.db.read()
    this.db.data!.payments = []
    await this.db.write()
  }

  async searchPayments(query: string): Promise<Payment[]> {
    await this.db.read()
    const payments = this.db.data?.payments || []
    const patients = this.db.data?.patients || []

    const filteredPayments = payments.filter(payment => {
      const patient = patients.find(p => p.id === payment.patient_id)
      const patientName = patient ? `${patient.first_name} ${patient.last_name}` : ''

      return (
        payment.receipt_number?.toLowerCase().includes(query.toLowerCase()) ||
        payment.description?.toLowerCase().includes(query.toLowerCase()) ||
        patientName.toLowerCase().includes(query.toLowerCase()) ||
        payment.amount.toString().includes(query) ||
        payment.payment_method.toLowerCase().includes(query.toLowerCase()) ||
        payment.status.toLowerCase().includes(query.toLowerCase())
      )
    })

    // Populate patient and appointment data
    return filteredPayments.map(payment => ({
      ...payment,
      patient: patients.find(p => p.id === payment.patient_id),
      appointment: this.db.data?.appointments?.find(a => a.id === payment.appointment_id)
    }))
  }



  // Treatment operations
  async getAllTreatments(): Promise<Treatment[]> {
    await this.db.read()
    return this.db.data?.treatments || []
  }

  async createTreatment(treatmentData: Omit<Treatment, 'id' | 'created_at' | 'updated_at'>): Promise<Treatment> {
    await this.db.read()
    const now = new Date().toISOString()
    const treatment: Treatment = {
      ...treatmentData,
      id: uuidv4(),
      created_at: now,
      updated_at: now
    }

    this.db.data!.treatments.push(treatment)
    await this.db.write()
    return treatment
  }

  async clearAllTreatments(): Promise<void> {
    await this.db.read()
    this.db.data!.treatments = this.getDefaultTreatments()
    await this.db.write()
  }

  // Settings operations
  async getSettings(): Promise<ClinicSettings | null> {
    await this.db.read()
    const settings = this.db.data?.settings || []
    return settings.length > 0 ? settings[0] : null
  }

  async updateSettings(settingsData: Partial<ClinicSettings>): Promise<ClinicSettings> {
    await this.db.read()
    const settings = this.db.data!.settings

    if (settings.length === 0) {
      const newSettings = {
        ...this.getDefaultSettings(),
        ...settingsData
      }
      settings.push(newSettings)
    } else {
      settings[0] = {
        ...settings[0],
        ...settingsData,
        updated_at: new Date().toISOString()
      }
    }

    await this.db.write()
    return settings[0]
  }

  // Inventory operations
  async getAllInventoryItems(): Promise<InventoryItem[]> {
    await this.db.read()
    return this.db.data?.inventory || []
  }

  async createInventoryItem(itemData: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<InventoryItem> {
    await this.db.read()
    const now = new Date().toISOString()
    const item: InventoryItem = {
      ...itemData,
      id: uuidv4(),
      created_at: now,
      updated_at: now
    }

    this.db.data!.inventory.push(item)
    await this.db.write()
    return item
  }

  async updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | null> {
    await this.db.read()
    const itemIndex = this.db.data!.inventory.findIndex(item => item.id === id)

    if (itemIndex === -1) {
      return null
    }

    const updatedItem = {
      ...this.db.data!.inventory[itemIndex],
      ...updates,
      updated_at: new Date().toISOString()
    }

    this.db.data!.inventory[itemIndex] = updatedItem
    await this.db.write()
    return updatedItem
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    await this.db.read()
    const initialLength = this.db.data!.inventory.length
    this.db.data!.inventory = this.db.data!.inventory.filter(item => item.id !== id)

    if (this.db.data!.inventory.length < initialLength) {
      await this.db.write()
      return true
    }
    return false
  }

  async searchInventoryItems(query: string): Promise<InventoryItem[]> {
    await this.db.read()
    const items = this.db.data?.inventory || []
    const searchTerm = query.toLowerCase()

    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm) ||
      item.description?.toLowerCase().includes(searchTerm) ||
      item.category?.toLowerCase().includes(searchTerm) ||
      item.supplier?.toLowerCase().includes(searchTerm)
    )
  }

  // Inventory usage operations
  async getAllInventoryUsage(): Promise<any[]> {
    await this.db.read()
    return this.db.data?.inventoryUsage || []
  }

  async createInventoryUsage(usageData: any): Promise<any> {
    await this.db.read()
    const now = new Date().toISOString()
    const usage = {
      ...usageData,
      id: uuidv4(),
      usage_date: usageData.usage_date || now
    }

    this.db.data!.inventoryUsage.push(usage)
    await this.db.write()
    return usage
  }

  async getInventoryUsageByItem(itemId: string): Promise<any[]> {
    await this.db.read()
    const usage = this.db.data?.inventoryUsage || []
    return usage.filter(u => u.inventory_id === itemId)
  }

  async getInventoryUsageByAppointment(appointmentId: string): Promise<any[]> {
    await this.db.read()
    const usage = this.db.data?.inventoryUsage || []
    return usage.filter(u => u.appointment_id === appointmentId)
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<DashboardStats> {
    await this.db.read()
    const patients = this.db.data?.patients || []
    const appointments = this.db.data?.appointments || []
    const payments = this.db.data?.payments || []
    const inventory = this.db.data?.inventory || []

    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().slice(0, 7)

    const todayAppointments = appointments.filter(a =>
      a.start_time.startsWith(today)
    ).length

    const completedPayments = payments.filter(p => p.status === 'completed')
    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0)

    const thisMonthPayments = completedPayments.filter(p =>
      p.payment_date.startsWith(thisMonth)
    )
    const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0)

    const pendingPayments = payments.filter(p => p.status === 'pending').length
    const lowStockItems = inventory.filter(i => i.quantity <= i.minimum_stock).length

    return {
      total_patients: patients.length,
      total_appointments: appointments.length,
      total_revenue: totalRevenue,
      pending_payments: pendingPayments,
      today_appointments: todayAppointments,
      this_month_revenue: thisMonthRevenue,
      low_stock_items: lowStockItems
    }
  }
}
