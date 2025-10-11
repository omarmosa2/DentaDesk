const { Low } = require('lowdb')
const { JSONFile } = require('lowdb/node')
const { join } = require('path')
const { app } = require('electron')
const { v4: uuidv4 } = require('uuid')

class LowDBService {
  constructor() {
    const dbPath = join(app.getPath('userData'), 'dental_clinic.json')
    const adapter = new JSONFile(dbPath)
    this.db = new Low(adapter, this.getDefaultData())
    this.initializeDatabase()
  }

  getDefaultData() {
    return {
      patients: [],
      appointments: [],
      payments: [],
      treatments: this.getDefaultTreatments(),
      inventory: this.getDefaultInventory(),
      settings: [this.getDefaultSettings()],
      installmentPayments: [],
      patientImages: [],
      inventoryUsage: []
    }
  }

  getDefaultInventory() {
    const today = new Date()
    const expiredDate = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
    const expiringSoonDate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000) // 15 days from now
    const now = new Date().toISOString()

    return [
      {
        id: uuidv4(),
        name: 'قفازات طبية',
        description: 'قفازات طبية مطاطية',
        category: 'مواد استهلاكية',
        quantity: 100,
        unit: 'قطعة',
        cost_per_unit: 0.5,
        supplier: 'شركة المعدات الطبية',
        minimum_stock: 20,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'أقنعة طبية',
        description: 'أقنعة طبية للوقاية',
        category: 'مواد استهلاكية',
        quantity: 15, // Low stock (below minimum_stock of 30)
        unit: 'قطعة',
        cost_per_unit: 0.3,
        supplier: 'شركة المعدات الطبية',
        minimum_stock: 30,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'مخدر موضعي',
        description: 'مخدر موضعي للأسنان',
        category: 'أدوية',
        quantity: 5,
        unit: 'أنبوب',
        cost_per_unit: 25.0,
        supplier: 'شركة الأدوية المتقدمة',
        minimum_stock: 10, // Low stock
        expiry_date: expiredDate.toISOString().split('T')[0], // Expired
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'مطهر فموي',
        description: 'مطهر للفم والأسنان',
        category: 'مواد تطهير',
        quantity: 8,
        unit: 'زجاجة',
        cost_per_unit: 15.0,
        supplier: 'شركة المنتجات الطبية',
        minimum_stock: 5,
        expiry_date: expiringSoonDate.toISOString().split('T')[0], // Expiring soon
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'خيوط جراحية',
        description: 'خيوط جراحية للأسنان',
        category: 'أدوات جراحية',
        quantity: 0, // Out of stock
        unit: 'علبة',
        cost_per_unit: 45.0,
        supplier: 'شركة الأدوات الجراحية',
        minimum_stock: 3,
        created_at: now,
        updated_at: now
      }
    ]
  }

  getDefaultTreatments() {
    const now = new Date().toISOString()
    return [
      {
        id: uuidv4(),
        name: 'فحص عام',
        description: 'فحص شامل للأسنان واللثة',
        default_cost: 100,
        duration_minutes: 30,
        category: 'فحص',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'تنظيف الأسنان',
        description: 'تنظيف وتلميع الأسنان',
        default_cost: 150,
        duration_minutes: 45,
        category: 'تنظيف',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'حشو الأسنان',
        description: 'حشو الأسنان المتضررة',
        default_cost: 200,
        duration_minutes: 60,
        category: 'علاج',
        created_at: now,
        updated_at: now
      }
    ]
  }

  getDefaultSettings() {
    const now = new Date().toISOString()
    return {
      id: uuidv4(),
      clinic_name: 'عيادة الأسنان',
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
      created_at: now,
      updated_at: now
    }
  }

  async initializeDatabase() {
    await this.db.read()
    if (!this.db.data) {
      this.db.data = this.getDefaultData()
      await this.db.write()
    }
  }

  // Patient operations
  async getAllPatients() {
    await this.db.read()
    return this.db.data?.patients || []
  }

  async createPatient(patientData) {
    await this.db.read()
    const now = new Date().toISOString()
    const patient = {
      ...patientData,
      id: uuidv4(),
      created_at: now,
      updated_at: now
    }

    this.db.data.patients.push(patient)
    await this.db.write()
    return patient
  }

  async updatePatient(id, patientData) {
    await this.db.read()
    const patientIndex = this.db.data.patients.findIndex(p => p.id === id)

    if (patientIndex === -1) return null

    const updatedPatient = {
      ...this.db.data.patients[patientIndex],
      ...patientData,
      updated_at: new Date().toISOString()
    }

    this.db.data.patients[patientIndex] = updatedPatient
    await this.db.write()
    return updatedPatient
  }

  async deletePatient(id) {
    await this.db.read()
    const initialLength = this.db.data.patients.length

    // Delete the patient
    this.db.data.patients = this.db.data.patients.filter(p => p.id !== id)

    if (this.db.data.patients.length < initialLength) {
      // Delete all related appointments
      const appointmentsDeleted = this.db.data.appointments.filter(a => a.patient_id === id).length
      this.db.data.appointments = this.db.data.appointments.filter(a => a.patient_id !== id)

      // Delete all related payments
      const paymentsDeleted = this.db.data.payments.filter(p => p.patient_id === id).length
      this.db.data.payments = this.db.data.payments.filter(p => p.patient_id !== id)

      // Delete all related patient images (if exists)
      if (this.db.data.patientImages) {
        const imagesDeleted = this.db.data.patientImages.filter(img => img.patient_id === id).length
        this.db.data.patientImages = this.db.data.patientImages.filter(img => img.patient_id !== id)
        console.log(`Deleted ${imagesDeleted} patient images for patient ${id}`)
      }

      // Delete all related installment payments (if exists)
      if (this.db.data.installmentPayments) {
        const installmentsDeleted = this.db.data.installmentPayments.filter(inst => inst.patient_id === id).length
        this.db.data.installmentPayments = this.db.data.installmentPayments.filter(inst => inst.patient_id !== id)
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

  async searchPatients(query) {
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

  async clearAllPatients() {
    await this.db.read()
    this.db.data.patients = []
    await this.db.write()
  }

  // Appointment operations
  async getAllAppointments() {
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

  async createAppointment(appointmentData) {
    await this.db.read()
    const now = new Date().toISOString()
    const appointment = {
      ...appointmentData,
      id: uuidv4(),
      created_at: now,
      updated_at: now
    }

    this.db.data.appointments.push(appointment)
    await this.db.write()
    return appointment
  }

  async updateAppointment(id, appointmentData) {
    await this.db.read()
    const appointmentIndex = this.db.data.appointments.findIndex(a => a.id === id)

    if (appointmentIndex === -1) return null

    const updatedAppointment = {
      ...this.db.data.appointments[appointmentIndex],
      ...appointmentData,
      updated_at: new Date().toISOString()
    }

    this.db.data.appointments[appointmentIndex] = updatedAppointment
    await this.db.write()
    return updatedAppointment
  }

  async deleteAppointment(id) {
    await this.db.read()
    const initialLength = this.db.data.appointments.length
    this.db.data.appointments = this.db.data.appointments.filter(a => a.id !== id)

    if (this.db.data.appointments.length < initialLength) {
      await this.db.write()
      return true
    }
    return false
  }

  async clearAllAppointments() {
    await this.db.read()
    this.db.data.appointments = []
    await this.db.write()
  }

  // Payment operations
  async getAllPayments() {
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

  async createPayment(paymentData) {
    await this.db.read()
    const now = new Date().toISOString()
    const payment = {
      ...paymentData,
      id: uuidv4(),
      created_at: now,
      updated_at: now
    }

    this.db.data.payments.push(payment)
    await this.db.write()
    return payment
  }

  async updatePayment(id, paymentData) {
    await this.db.read()
    const paymentIndex = this.db.data.payments.findIndex(p => p.id === id)

    if (paymentIndex === -1) return null

    const updatedPayment = {
      ...this.db.data.payments[paymentIndex],
      ...paymentData,
      updated_at: new Date().toISOString()
    }

    this.db.data.payments[paymentIndex] = updatedPayment
    await this.db.write()
    return updatedPayment
  }

  async deletePayment(id) {
    await this.db.read()
    const initialLength = this.db.data.payments.length
    this.db.data.payments = this.db.data.payments.filter(p => p.id !== id)

    if (this.db.data.payments.length < initialLength) {
      await this.db.write()
      return true
    }
    return false
  }

  async clearAllPayments() {
    await this.db.read()
    this.db.data.payments = []
    await this.db.write()
  }

  // Treatment operations
  async getAllTreatments() {
    await this.db.read()
    return this.db.data?.treatments || []
  }

  async createTreatment(treatmentData) {
    await this.db.read()
    const now = new Date().toISOString()
    const treatment = {
      ...treatmentData,
      id: uuidv4(),
      created_at: now,
      updated_at: now
    }

    this.db.data.treatments.push(treatment)
    await this.db.write()
    return treatment
  }

  // Inventory operations
  async getAllInventoryItems() {
    await this.db.read()
    return this.db.data?.inventory || []
  }

  async createInventoryItem(itemData) {
    await this.db.read()
    const now = new Date().toISOString()
    const item = {
      ...itemData,
      id: uuidv4(),
      created_at: now,
      updated_at: now
    }

    this.db.data.inventory.push(item)
    await this.db.write()
    return item
  }

  async updateInventoryItem(id, updates) {
    await this.db.read()
    const itemIndex = this.db.data.inventory.findIndex(item => item.id === id)

    if (itemIndex === -1) {
      return null
    }

    const updatedItem = {
      ...this.db.data.inventory[itemIndex],
      ...updates,
      updated_at: new Date().toISOString()
    }

    this.db.data.inventory[itemIndex] = updatedItem
    await this.db.write()
    return updatedItem
  }

  async deleteInventoryItem(id) {
    await this.db.read()
    const initialLength = this.db.data.inventory.length
    this.db.data.inventory = this.db.data.inventory.filter(item => item.id !== id)

    if (this.db.data.inventory.length < initialLength) {
      await this.db.write()
      return true
    }
    return false
  }

  async searchInventoryItems(query) {
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
  async getAllInventoryUsage() {
    await this.db.read()
    return this.db.data?.inventoryUsage || []
  }

  async createInventoryUsage(usageData) {
    await this.db.read()
    const now = new Date().toISOString()
    const usage = {
      ...usageData,
      id: uuidv4(),
      usage_date: usageData.usage_date || now
    }

    this.db.data.inventoryUsage.push(usage)
    await this.db.write()
    return usage
  }

  async getInventoryUsageByItem(itemId) {
    await this.db.read()
    const usage = this.db.data?.inventoryUsage || []
    return usage.filter(u => u.inventory_id === itemId)
  }

  async getInventoryUsageByAppointment(appointmentId) {
    await this.db.read()
    const usage = this.db.data?.inventoryUsage || []
    return usage.filter(u => u.appointment_id === appointmentId)
  }

  async clearAllTreatments() {
    await this.db.read()
    this.db.data.treatments = this.getDefaultTreatments()
    await this.db.write()
  }

  // Patient Images operations
  async getAllPatientImages() {
    await this.db.read()
    return this.db.data?.patientImages || []
  }

  async createPatientImage(imageData) {
    await this.db.read()
    const now = new Date().toISOString()
    const image = {
      ...imageData,
      id: uuidv4(),
      created_at: now
    }

    this.db.data.patientImages.push(image)
    await this.db.write()
    return image
  }

  async getPatientImagesByPatient(patientId) {
    await this.db.read()
    const images = this.db.data?.patientImages || []
    return images.filter(img => img.patient_id === patientId)
  }

  // Installment Payments operations
  async getAllInstallmentPayments() {
    await this.db.read()
    return this.db.data?.installmentPayments || []
  }

  async createInstallmentPayment(installmentData) {
    await this.db.read()
    const now = new Date().toISOString()
    const installment = {
      ...installmentData,
      id: uuidv4(),
      created_at: now,
      updated_at: now
    }

    this.db.data.installmentPayments.push(installment)
    await this.db.write()
    return installment
  }

  async getInstallmentPaymentsByPayment(paymentId) {
    await this.db.read()
    const installments = this.db.data?.installmentPayments || []
    return installments.filter(inst => inst.payment_id === paymentId)
  }

  // Settings operations
  async getSettings() {
    await this.db.read()
    const settings = this.db.data?.settings || []
    return settings.length > 0 ? settings[0] : null
  }

  async updateSettings(settingsData) {
    await this.db.read()
    const settings = this.db.data.settings

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
}

module.exports = { LowDBService }
