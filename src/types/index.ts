export interface Patient {
  id: string
  serial_number: string
  full_name: string
  gender: 'male' | 'female'
  age: number
  patient_condition?: string
  allergies?: string
  medical_conditions?: string
  email?: string
  address?: string
  notes?: string
  phone?: string
  date_added: string // تاريخ إضافة المريض
  created_at: string
  updated_at: string
}

export interface Treatment {
  id: string
  name: string
  description?: string
  default_cost?: number
  duration_minutes?: number
  category?: string
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  patient_id: string
  treatment_id?: string
  title: string
  description?: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  cost?: number
  notes?: string
  created_at: string
  updated_at: string
  // Populated fields
  patient?: Patient
  treatment?: Treatment
}

export interface Payment {
  id: string
  patient_id: string
  tooth_treatment_id?: string // ربط مباشر بعلاج السن
  appointment_id?: string // ربط اختياري بالموعد (للتوافق مع النظام القديم)
  amount: number // المبلغ المدفوع في هذه الدفعة
  payment_method: 'cash' | 'bank_transfer'
  payment_date: string
  description?: string
  receipt_number?: string
  status: 'completed' | 'partial' | 'pending'
  notes?: string
  discount_amount?: number
  tax_amount?: number
  total_amount?: number // المبلغ الإجمالي لهذه الدفعة (amount + tax - discount)

  // حقول تتبع الرصيد لكل علاج
  treatment_total_cost?: number // التكلفة الإجمالية للعلاج
  treatment_total_paid?: number // إجمالي المدفوع لهذا العلاج حتى الآن
  treatment_remaining_balance?: number // المتبقي لهذا العلاج

  // حقول عامة للمدفوعات غير المرتبطة بموعد
  total_amount_due?: number // المبلغ الإجمالي المطلوب (للمدفوعات العامة)
  amount_paid?: number // إجمالي المبلغ المدفوع (للمدفوعات العامة)
  remaining_balance?: number // المبلغ المتبقي (للمدفوعات العامة)

  created_at: string
  updated_at: string
  // Populated fields
  patient?: Patient
  appointment?: Appointment
  tooth_treatment?: {
    id: string
    treatment_type: string
    tooth_number: number
    tooth_name?: string
    cost?: number
  }
}

export interface PaymentSummary {
  totalRevenue: number
  pendingAmount: number
  overdueAmount: number
  monthlyRevenue: { [key: string]: number }
  paymentMethodStats: { [key: string]: number }
  recentPayments: Payment[]
}

export interface InstallmentPayment {
  id: string
  payment_id: string
  installment_number: number
  amount: number
  due_date: string
  paid_date?: string
  status: 'pending' | 'paid' | 'overdue'
  created_at: string
  updated_at: string
}

export interface PatientImage {
  id: string
  patient_id: string
  appointment_id?: string
  image_path: string
  image_type: 'before' | 'after' | 'xray' | 'document'
  description?: string
  taken_date: string
  created_at: string
}

export interface InventoryItem {
  id: string
  name: string
  description?: string
  category?: string
  quantity: number
  unit?: string
  cost_per_unit?: number
  unit_price?: number // Alias for cost_per_unit for compatibility
  supplier?: string
  expiry_date?: string
  minimum_stock: number
  created_at: string
  updated_at: string
}

export interface InventoryUsage {
  id: string
  inventory_id: string
  appointment_id?: string
  quantity_used: number
  usage_date: string
  notes?: string
  inventory?: InventoryItem
}

export interface Lab {
  id: string
  name: string
  contact_info?: string
  address?: string
  created_at: string
  updated_at?: string
}

export interface LabOrder {
  id: string
  lab_id: string
  patient_id?: string
  appointment_id?: string // ربط طلب المختبر بموعد محدد
  tooth_treatment_id?: string // ربط طلب المختبر بعلاج سن محدد
  tooth_number?: number // رقم السن المرتبط بالطلب
  service_name: string
  cost: number
  order_date: string
  expected_delivery_date?: string // تاريخ التسليم المتوقع
  actual_delivery_date?: string // تاريخ التسليم الفعلي
  status: 'معلق' | 'مكتمل' | 'ملغي'
  notes?: string
  paid_amount?: number
  remaining_balance?: number
  priority?: number // أولوية الطلب
  lab_instructions?: string // تعليمات خاصة للمختبر
  material_type?: string // نوع المادة المطلوبة
  color_shade?: string // درجة اللون المطلوبة
  created_at: string
  updated_at?: string
  // Populated fields
  lab?: Lab
  patient?: Patient
  appointment?: Appointment
  tooth_treatment?: {
    id: string
    tooth_number: number
    treatment_type: string
    tooth_name?: string
  }
}

export interface ClinicSettings {
  id: string
  clinic_name: string
  doctor_name?: string
  clinic_address?: string
  clinic_phone?: string
  clinic_email?: string
  clinic_logo?: string
  currency: string
  language: string
  timezone: string
  backup_frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'disabled'
  auto_save_interval: number
  appointment_duration: number
  working_hours_start: string
  working_hours_end: string
  working_days: string
  app_password?: string | null
  password_enabled?: number
  use_arabic_numerals?: boolean
  isLoaded?: boolean // Add isLoaded property
  // WhatsApp reminder settings
  whatsapp_reminder_enabled?: number
  whatsapp_reminder_hours_before?: number
  whatsapp_reminder_minutes_before?: number
  whatsapp_reminder_message?: string
  whatsapp_reminder_custom_enabled?: number
  // External estimate settings
  estimate_default_validity_days?: number
  estimate_default_tax_rate?: number
  estimate_default_notes?: string
  estimate_show_clinic_stamp?: boolean
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  total_patients: number
  total_appointments: number
  total_revenue: number
  pending_payments: number
  today_appointments: number
  this_month_revenue: number
  low_stock_items: number
}

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource?: Appointment
}



// Medication and Prescription Types
export interface Medication {
  id: string
  name: string
  instructions?: string
  created_at: string
  updated_at: string
}

export interface Prescription {
  id: string
  patient_id: string
  appointment_id?: string
  tooth_treatment_id?: string // ربط الوصفة بعلاج سن محدد
  prescription_date: string
  notes?: string
  created_at: string
  updated_at: string
  // Populated fields
  patient?: {
    id: string
    full_name: string
  }
  appointment?: {
    id: string
    title: string
  }
  tooth_treatment?: {
    id: string
    tooth_number: number
    treatment_type: string
  }
  medications?: PrescriptionMedication[]
}

export interface PrescriptionMedication {
  id: string
  prescription_id: string
  medication_id: string
  dose?: string
  created_at: string
  // Populated fields
  medication_name?: string
  medication_instructions?: string
}

// Multiple treatments per tooth interface
export interface ToothTreatment {
  id: string
  patient_id: string
  tooth_number: number
  tooth_name: string
  treatment_type: string
  treatment_category: string
  treatment_status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  treatment_color: string
  start_date?: string
  completion_date?: string
  cost?: number
  priority: number // For ordering treatments
  notes?: string
  appointment_id?: string
  created_at: string
  updated_at: string
  // Populated fields
  patient?: Patient
  appointment?: Appointment
  images?: DentalTreatmentImage[]
  prescriptions?: Prescription[]
  sessions?: TreatmentSession[] // جلسات العلاج
}

// Treatment sessions interface for managing multiple sessions per treatment
export interface TreatmentSession {
  id: string
  tooth_treatment_id: string
  session_number: number
  session_type: string // نوع الجلسة من قائمة محددة
  session_title: string // عنوان الجلسة
  session_description?: string // وصف ما تم عمله في الجلسة
  session_date: string
  session_status: 'planned' | 'completed' | 'cancelled'
  duration_minutes?: number
  cost?: number
  notes?: string
  created_at: string
  updated_at: string
  // Populated fields
  tooth_treatment?: ToothTreatment
}

export interface DentalTreatmentImage {
  id: string
  dental_treatment_id: string
  patient_id: string
  tooth_number: number
  image_path: string
  image_type: 'before' | 'after' | 'xray' | 'clinical'
  description?: string
  taken_date: string
  created_at: string
  updated_at: string
}



// Tooth information for dental chart
export interface ToothInfo {
  number: number
  name: string
  arabicName: string
  position: 'upper' | 'lower'
  side: 'right' | 'left'
  type: 'incisor' | 'canine' | 'premolar' | 'molar'
}

// Treatment status colors
export const TREATMENT_COLORS = {
  healthy: '#22c55e',      // Green - سليم
  filling: '#f97316',      // Orange - حشو
  root_canal: '#ef4444',   // Red - عصب
  crown: '#8b5cf6',        // Purple - تاج
  extraction: '#6b7280',   // Gray - خلع
  cleaning: '#06b6d4',     // Cyan - تنظيف
  planned: '#3b82f6',      // Blue - مخطط
  in_progress: '#eab308',  // Yellow - قيد التنفيذ
  completed: '#22c55e',    // Green - مكتمل
  cancelled: '#6b7280'     // Gray - ملغي
} as const

export type TreatmentColorKey = keyof typeof TREATMENT_COLORS

// Clinic Need interface
export interface ClinicNeed {
  id: string
  serial_number: string
  need_name: string
  quantity: number
  price: number
  description?: string
  category?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'ordered' | 'received' | 'cancelled'
  supplier?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Clinic Expense interface for operational expenses
export interface ClinicExpense {
  id: string
  expense_name: string
  amount: number
  expense_type: 'salary' | 'utilities' | 'rent' | 'maintenance' | 'supplies' | 'insurance' | 'other'
  category?: string
  description?: string
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'credit_card'
  payment_date: string
  due_date?: string
  is_recurring: boolean
  recurring_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  recurring_end_date?: string
  status: 'paid' | 'pending' | 'overdue' | 'cancelled'
  receipt_number?: string
  vendor?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Pending Payments Comprehensive Invoice Types
export interface PendingPaymentItem {
  id: string
  patient_id: string
  appointment_id?: string
  tooth_treatment_id?: string // ربط مباشر بعلاج السن
  appointment_date?: string
  appointment_title?: string
  treatment_type?: string
  tooth_number?: number
  tooth_name?: string
  amount: number
  description?: string
  payment_date: string
  notes?: string
  discount_amount?: number
  tax_amount?: number
  total_amount?: number
  // حقول إضافية للعلاجات
  treatment_total_cost?: number
  treatment_remaining_balance?: number
  // حقول إضافية للمواعيد
  appointment_total_cost?: number
  appointment_remaining_balance?: number
  // حقول إضافية للطبيب
  doctor_name?: string
}

export interface PendingPaymentsSummary {
  patient_id: string
  patient_name: string
  total_pending_amount: number
  total_items: number
  items: PendingPaymentItem[]
  subtotal: number
  total_discount: number
  total_tax: number
  final_total: number
  date_range: {
    from: string
    to: string
  }
}

export interface PendingPaymentsFilter {
  date_range: 'last_month' | 'last_3_months' | 'last_6_months' | 'last_year' | 'custom'
  custom_start_date?: string
  custom_end_date?: string
}

export interface ComprehensiveInvoiceSettings {
  apply_discount: boolean
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discount_reason?: string
  include_tax: boolean
  tax_rate: number
  include_clinic_logo: boolean
  include_patient_details: boolean
  include_payment_terms: boolean
  payment_terms_text?: string
  footer_notes?: string
}

export interface ComprehensiveInvoiceData {
  invoice_number: string
  invoice_date: string
  patient: Patient
  summary: PendingPaymentsSummary
  settings: ComprehensiveInvoiceSettings
  clinic_info: ClinicSettings
  generated_at: string
}

// Database schema for lowdb
// Treatment Reports Data Interface
export interface TreatmentReportData {
  // Basic Statistics
  totalTreatments: number
  completedTreatments: number
  plannedTreatments: number
  inProgressTreatments: number
  cancelledTreatments: number

  // Financial Statistics
  totalRevenue: number
  averageTreatmentCost: number
  revenueByCategory: { category: string; revenue: number; count: number }[]

  // Treatment Analysis
  treatmentsByType: { type: string; count: number; percentage: number }[]
  treatmentsByCategory: { category: string; count: number; percentage: number }[]
  treatmentsByStatus: { status: string; count: number; percentage: number }[]

  // Performance Metrics
  completionRate: number
  averageCompletionTime: number // in days
  treatmentTrend: { period: string; completed: number; planned: number }[]

  // Popular Treatments
  mostPopularTreatments: { name: string; count: number; revenue: number }[]

  // Patient Analysis
  patientsWithMultipleTreatments: number
  averageTreatmentsPerPatient: number

  // Time Analysis
  treatmentsByMonth: { month: string; count: number }[]
  peakTreatmentDays: { day: string; count: number }[]

  // Detailed Lists
  treatmentsList: ToothTreatment[]
  pendingTreatments: ToothTreatment[]
  overdueTreatments: ToothTreatment[]
}

export interface DatabaseSchema {
  patients: Patient[]
  appointments: Appointment[]
  payments: Payment[]
  treatments: Treatment[]
  inventory: InventoryItem[]
  settings: ClinicSettings[]
  installmentPayments: InstallmentPayment[]
  patientImages: PatientImage[]
  inventoryUsage: InventoryUsage[]
  labs: Lab[]
  labOrders: LabOrder[]
  medications: Medication[]
  prescriptions: Prescription[]
  prescriptionMedications: PrescriptionMedication[]
  dentalTreatmentImages: DentalTreatmentImage[]
  toothTreatments: ToothTreatment[] // Multiple treatments per tooth
  treatmentSessions: TreatmentSession[] // Treatment sessions
  clinicNeeds: ClinicNeed[]
  clinicExpenses: ClinicExpense[] // Operational expenses
  // New integrated tables
  patientTreatmentTimeline: PatientTreatmentTimeline[]
  treatmentPlans: TreatmentPlan[]
  treatmentPlanItems: TreatmentPlanItem[]
}

// Reports and Analytics Types
export interface ReportFilter {
  dateRange: {
    start: string
    end: string
    preset?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  }
  patientIds?: string[]
  treatmentIds?: string[]
  paymentMethods?: string[]
  appointmentStatuses?: string[]
  paymentStatuses?: string[]
}

export interface PatientReportData {
  totalPatients: number
  newPatients: number
  activePatients: number
  inactivePatients: number
  ageDistribution: { ageGroup: string; count: number }[]
  genderDistribution: { gender: string; count: number }[]
  registrationTrend: { period: string; count: number }[]
  patientsList: Patient[]
}

export interface AppointmentReportData {
  totalAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  noShowAppointments: number
  scheduledAppointments: number
  attendanceRate: number
  cancellationRate: number
  appointmentsByStatus: { status: string; count: number; percentage: number }[]
  appointmentsByTreatment: { treatment: string; count: number }[]
  appointmentsByDay: { day: string; count: number }[]
  appointmentsByHour: { hour: string; count: number }[]
  peakHours: { hour: string; count: number }[]
  appointmentTrend: { period: string; count: number }[]
  appointmentsList?: Appointment[]
}

export interface FinancialReportData {
  // Revenue data
  totalRevenue: number
  totalPaid: number
  totalPending: number
  totalOverdue: number

  // Expenses data - Enhanced
  totalExpenses: number
  netProfit: number
  profitMargin: number

  // Breakdown data
  revenueByPaymentMethod: { method: string; amount: number; percentage: number }[]
  revenueByTreatment: { treatment: string; amount: number; count: number; avgAmount: number }[]
  expensesByType: { type: string; amount: number; count: number; percentage: number }[]

  // Trend data
  revenueTrend: { period: string; amount: number }[]
  expenseTrend: { period: string; amount: number }[]
  cashFlow: { period: string; income: number; expenses: number; net: number }[]

  // Transaction data
  outstandingPayments: Payment[]
  recentTransactions: Payment[]
  recentExpenses: ClinicExpense[]

  // Financial health indicators
  expenseRatio?: number // نسبة المصروفات إلى الإيرادات
  profitTrend?: 'increasing' | 'decreasing' | 'stable'
  cashFlowStatus?: 'positive' | 'negative' | 'neutral'
}

// تقرير شامل متكامل للأرباح والخسائر
export interface ComprehensiveProfitLossReport {
  // الإيرادات
  revenue: {
    completedPayments: number // المدفوعات المكتملة
    totalRevenue: number // إجمالي الإيرادات
    partialPayments: number // المدفوعات الجزئية
    remainingBalances: number // المبالغ المتبقية من المدفوعات الجزئية
    pendingAmount: number // المبالغ الآجلة (غير المدفوعة)
  }

  // المصروفات
  expenses: {
    labOrdersTotal: number // إجمالي المدفوعات للمخابر
    labOrdersRemaining: number // إجمالي المتبقي للمخابر
    clinicNeedsTotal: number // إجمالي المدفوعات للاحتياجات والمخزون
    clinicNeedsRemaining: number // إجمالي المتبقي للاحتياجات
    inventoryExpenses: number // مصروفات المخزون
    clinicExpensesTotal: number // مصروفات العيادة المباشرة
  }

  // الحسابات النهائية
  calculations: {
    totalIncome: number // إجمالي الدخل
    totalExpenses: number // إجمالي المصروفات
    netProfit: number // صافي الربح
    profitMargin: number // نسبة الربح (%)
    lossAmount: number // مبلغ الخسارة (إذا كان سالب)
    isProfit: boolean // هل هناك ربح أم خسارة
  }

  // تفاصيل إضافية
  details: {
    totalPatients: number
    totalAppointments: number
    totalLabOrders: number
    totalClinicNeeds: number
    averageRevenuePerPatient: number
    averageRevenuePerAppointment: number
  }

  // معلومات الفلترة
  filterInfo: {
    dateRange: string
    totalRecords: number
    filteredRecords: number
  }
}

export interface InventoryReportData {
  totalItems: number
  totalValue: number
  lowStockItems: number
  expiredItems: number
  outOfStockItems?: number
  expiringSoonItems: number
  itemsByCategory: { category: string; count: number; value: number }[]
  itemsBySupplier: { supplier: string; count: number; value: number }[]
  usageTrend: { period: string; usage: number }[]
  topUsedItems: { item: string; usage: number }[]
  stockAlerts: InventoryItem[]
  expiryAlerts: InventoryItem[]
  inventoryItems?: InventoryItem[]
  filterInfo?: string
  dataCount?: number
}

export interface LabReportData {
  totalLabs: number
  totalOrders: number
  totalCost: number
  totalPaid: number
  totalRemaining: number
  pendingOrders: number
  completedOrders: number
  cancelledOrders: number
  labsList: Lab[]
  labOrdersList: LabOrder[]
  filterInfo?: string
  dataCount?: number
}

export interface ClinicNeedsReportData {
  totalNeeds: number
  totalValue: number
  pendingCount: number
  orderedCount: number
  receivedCount: number
  cancelledCount: number
  urgentCount: number
  needsByStatus: { status: string; count: number; percentage: number; value: number }[]
  needsByPriority: { priority: string; count: number; percentage: number; value: number }[]
  needsByCategory: { category: string; count: number; value: number }[]
  needsList: ClinicNeed[]
  filterInfo?: string
  dataCount?: number
}

export interface ExpenseReportData {
  totalExpenses: number
  paidExpenses: number
  pendingExpenses: number
  overdueExpenses: number
  cancelledExpenses: number
  expensesByType: { type: string; amount: number; count: number; percentage: number }[]
  expensesByPaymentMethod: { method: string; amount: number; count: number; percentage: number }[]
  expensesList: ClinicExpense[]
  filterInfo?: string
  dataCount?: number
}

export interface AnalyticsReportData {
  kpis: {
    patientGrowthRate: number
    revenueGrowthRate: number
    appointmentUtilization: number
    averageRevenuePerPatient: number
    patientRetentionRate: number
    appointmentNoShowRate: number
  }
  trends: {
    patientTrend: { period: string; value: number; change: number }[]
    revenueTrend: { period: string; value: number; change: number }[]
    appointmentTrend: { period: string; value: number; change: number }[]
  }
  comparisons: {
    currentPeriod: any
    previousPeriod: any
    changePercentage: number
  }
  predictions: {
    nextMonthRevenue: number
    nextMonthAppointments: number
    confidence: number
  }
}

export interface ReportData {
  patients?: PatientReportData
  appointments?: AppointmentReportData
  financial?: FinancialReportData
  inventory?: InventoryReportData
  analytics?: AnalyticsReportData
  clinicNeeds?: ClinicNeedsReportData
  generatedAt: string
  filter: ReportFilter
}

export interface ReportExportOptions {
  format: 'pdf' | 'excel' | 'csv'
  includeCharts: boolean
  includeDetails: boolean
  language: 'ar' | 'en'
  orientation?: 'portrait' | 'landscape'
  pageSize?: 'A4' | 'A3' | 'Letter'
}

// New interfaces for enhanced integration

// Patient treatment timeline for comprehensive tracking
export interface PatientTreatmentTimeline {
  id: string
  patient_id: string
  appointment_id?: string
  tooth_treatment_id?: string
  prescription_id?: string
  lab_order_id?: string
  timeline_type: 'appointment' | 'treatment' | 'prescription' | 'lab_order' | 'payment' | 'note'
  title: string
  description?: string
  event_date: string
  status: 'active' | 'completed' | 'cancelled'
  priority: 1 | 2 | 3 // 1 = high, 2 = medium, 3 = low
  created_at: string
  updated_at: string
  // Populated fields
  patient?: Patient
  appointment?: Appointment
  tooth_treatment?: ToothTreatment
  prescription?: Prescription
  lab_order?: LabOrder
}

// Treatment plan for comprehensive treatment planning
export interface TreatmentPlan {
  id: string
  patient_id: string
  plan_name: string
  description?: string
  total_estimated_cost: number
  estimated_duration_weeks?: number
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  start_date?: string
  target_completion_date?: string
  actual_completion_date?: string
  created_by?: string // Doctor/user who created the plan
  notes?: string
  created_at: string
  updated_at: string
  // Populated fields
  patient?: Patient
  items?: TreatmentPlanItem[]
}

// Treatment plan items for detailed treatment steps
export interface TreatmentPlanItem {
  id: string
  treatment_plan_id: string
  tooth_treatment_id?: string
  sequence_order: number
  title: string
  description?: string
  estimated_cost: number
  estimated_duration_minutes?: number
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  dependencies?: string // JSON array of treatment_plan_item IDs that must be completed first
  notes?: string
  created_at: string
  updated_at: string
  // Populated fields
  treatment_plan?: TreatmentPlan
  tooth_treatment?: ToothTreatment
}

// Enhanced patient data with integrated information
export interface PatientIntegratedData {
  patient: Patient
  appointments: Appointment[]
  treatments: ToothTreatment[]
  payments: Payment[]
  prescriptions: Prescription[]
  labOrders: LabOrder[]
  timeline: PatientTreatmentTimeline[]
  treatmentPlans: TreatmentPlan[]
  // Statistics
  stats: {
    totalAppointments: number
    completedTreatments: number
    pendingTreatments: number
    totalPaid: number
    remainingBalance: number
    lastVisit?: string
    nextAppointment?: string
  }
}

// Global Search Types
export interface SearchResult {
  id: string
  type: 'patient' | 'appointment' | 'payment' | 'treatment' | 'prescription'
  title: string
  subtitle: string
  description?: string
  relevanceScore: number
  data: any
  relatedData?: {
    patientId?: string
    appointmentId?: string
    paymentId?: string
    treatmentId?: string
  }
}

export interface SearchResults {
  patients: SearchResult[]
  appointments: SearchResult[]
  payments: SearchResult[]
  treatments: SearchResult[]
  prescriptions: SearchResult[]
  totalCount: number
  searchTime: number
  query: string
}

export interface SearchCriteria {
  query: string
  types?: ('patient' | 'appointment' | 'payment' | 'treatment' | 'prescription')[]
  dateRange?: {
    start: string
    end: string
  }
  filters?: {
    status?: string
    category?: string
    priority?: string
  }
  sortBy?: 'relevance' | 'date' | 'name'
  sortOrder?: 'asc' | 'desc'
  limit?: number
}

// Smart Alerts Types
export interface SmartAlert {
  id: string
  type: 'appointment' | 'payment' | 'treatment' | 'follow_up' | 'prescription' | 'lab_order' | 'inventory'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  patientId?: string
  patientName?: string
  relatedData: {
    appointmentId?: string
    paymentId?: string
    treatmentId?: string
    prescriptionId?: string
    labOrderId?: string
    inventoryId?: string
  }
  actionRequired: boolean
  dueDate?: string
  createdAt: string
  isRead: boolean
  isDismissed: boolean
  snoozeUntil?: string
}

export interface CrossReferencedAlert extends SmartAlert {
  crossReferences: {
    relatedAppointments?: Appointment[]
    relatedPayments?: Payment[]
    relatedTreatments?: ToothTreatment[]
    relatedPrescriptions?: Prescription[]
  }
}

// Quick Access Types
export interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  action: () => void
  shortcut?: string
  category: 'patient' | 'appointment' | 'payment' | 'treatment' | 'report'
  priority: number
}

export interface QuickAccessData {
  recentPatients: Patient[]
  todayAppointments: Appointment[]
  pendingPayments: Payment[]
  urgentTreatments: ToothTreatment[]
  recentActivities: ActivityLog[]
  quickStats: {
    totalPatients: number
    todayAppointments: number
    pendingPayments: number
    urgentAlerts: number
  }
}

export interface ActivityLog {
  id: string
  type: 'patient_added' | 'appointment_created' | 'payment_received' | 'treatment_completed'
  title: string
  description: string
  patientId?: string
  patientName?: string
  timestamp: string
  icon: string
}

// Quick Links Types
export interface QuickLink {
  id: string
  title: string
  description: string
  icon: string
  url: string
  action?: () => void
  category: string
  priority: number
  contextual: boolean
}

// Cross-Referenced Stats
export interface CrossReferencedStats {
  patientId: string
  overview: {
    totalAppointments: number
    completedAppointments: number
    upcomingAppointments: number
    totalPayments: number
    totalPaid: number
    remainingBalance: number
    activeTreatments: number
    completedTreatments: number
    activePrescriptions: number
  }
  trends: {
    appointmentFrequency: 'increasing' | 'decreasing' | 'stable'
    paymentPattern: 'regular' | 'irregular' | 'delayed'
    treatmentProgress: 'on_track' | 'delayed' | 'ahead'
  }
  alerts: SmartAlert[]
  recommendations: string[]
}



