-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    serial_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    age INTEGER NOT NULL CHECK (age > 0),
    patient_condition TEXT,
    allergies TEXT,
    medical_conditions TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    phone TEXT,
    date_added DATETIME DEFAULT CURRENT_TIMESTAMP, -- تاريخ إضافة المريض
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Treatments table
CREATE TABLE IF NOT EXISTS treatments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    default_cost DECIMAL(10,2),
    duration_minutes INTEGER,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    treatment_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
    cost DECIMAL(10,2),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (treatment_id) REFERENCES treatments(id) ON DELETE SET NULL
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    tooth_treatment_id TEXT, -- ربط مباشر بعلاج السن
    appointment_id TEXT, -- ربط اختياري بالموعد (للتوافق مع النظام القديم)
    amount DECIMAL(10,2) NOT NULL, -- المبلغ المدفوع في هذه الدفعة
    payment_method TEXT NOT NULL, -- cash, bank_transfer
    payment_date DATETIME NOT NULL,
    description TEXT,
    receipt_number TEXT,
    status TEXT DEFAULT 'completed', -- completed, partial, pending
    notes TEXT,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2), -- المبلغ الإجمالي لهذه الدفعة (amount + tax - discount)
    -- حقول تتبع الرصيد لكل علاج
    treatment_total_cost DECIMAL(10,2), -- التكلفة الإجمالية للعلاج (من جدول tooth_treatments)
    treatment_total_paid DECIMAL(10,2), -- إجمالي المدفوع لهذا العلاج حتى الآن
    treatment_remaining_balance DECIMAL(10,2), -- المتبقي لهذا العلاج
    -- حقول عامة للمدفوعات غير المرتبطة بعلاج
    total_amount_due DECIMAL(10,2), -- المبلغ الإجمالي المطلوب (للمدفوعات العامة)
    amount_paid DECIMAL(10,2), -- إجمالي المبلغ المدفوع (للمدفوعات العامة)
    remaining_balance DECIMAL(10,2), -- المبلغ المتبقي (للمدفوعات العامة)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (tooth_treatment_id) REFERENCES tooth_treatments(id) ON DELETE SET NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

-- Installment payments table
CREATE TABLE IF NOT EXISTS installment_payments (
    id TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL,
    installment_number INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    status TEXT DEFAULT 'pending', -- pending, paid, overdue
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

-- Patient images table
CREATE TABLE IF NOT EXISTS patient_images (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    appointment_id TEXT,
    image_path TEXT NOT NULL,
    image_type TEXT, -- x-ray, photo, scan, etc.
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);



-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    quantity INTEGER DEFAULT 0,
    unit TEXT,
    cost_per_unit DECIMAL(10,2),
    supplier TEXT,
    expiry_date DATE,
    minimum_stock INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inventory usage table
CREATE TABLE IF NOT EXISTS inventory_usage (
    id TEXT PRIMARY KEY,
    inventory_id TEXT NOT NULL,
    appointment_id TEXT,
    quantity_used INTEGER NOT NULL,
    usage_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'clinic_settings',
    clinic_name TEXT DEFAULT 'Dental Clinic',
    doctor_name TEXT DEFAULT 'د. محمد أحمد',
    clinic_address TEXT,
    clinic_phone TEXT,
    clinic_email TEXT,
    clinic_logo TEXT,
    currency TEXT DEFAULT 'USD',
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    backup_frequency TEXT DEFAULT 'daily', -- hourly, daily, weekly
    auto_save_interval INTEGER DEFAULT 300, -- seconds
    appointment_duration INTEGER DEFAULT 60, -- minutes
    working_hours_start TEXT DEFAULT '09:00',
    working_hours_end TEXT DEFAULT '17:00',
    working_days TEXT DEFAULT 'monday,tuesday,wednesday,thursday,friday',
    app_password TEXT, -- Password for app protection (hashed)
    password_enabled INTEGER DEFAULT 0, -- 0 = disabled, 1 = enabled
    security_question TEXT, -- Security question for password recovery
    security_answer TEXT, -- Security answer (hashed)
    -- WhatsApp reminder settings
    whatsapp_reminder_enabled INTEGER DEFAULT 0,
    whatsapp_reminder_hours_before INTEGER DEFAULT 3,
    whatsapp_reminder_minutes_before INTEGER DEFAULT 180,
    whatsapp_reminder_message TEXT DEFAULT 'مرحبًا {{patient_name}}، تذكير بموعدك في عيادة الأسنان بتاريخ {{appointment_date}} الساعة {{appointment_time}}. نشكرك على التزامك.',
    whatsapp_reminder_custom_enabled INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Smart alerts table for managing intelligent notifications
CREATE TABLE IF NOT EXISTS smart_alerts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('appointment', 'payment', 'treatment', 'follow_up', 'prescription', 'lab_order', 'inventory')),
    priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    patient_id TEXT,
    patient_name TEXT,
    related_data TEXT, -- JSON string containing related IDs
    action_required BOOLEAN DEFAULT FALSE,
    due_date DATETIME,
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    snooze_until DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- WhatsApp reminders table
CREATE TABLE IF NOT EXISTS whatsapp_reminders (
    id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    sent_at DATETIME,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Create indexes for whatsapp_reminders table
CREATE INDEX IF NOT EXISTS idx_whatsapp_reminders_appointment ON whatsapp_reminders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_reminders_patient ON whatsapp_reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_reminders_status ON whatsapp_reminders(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_reminders_sent_at ON whatsapp_reminders(sent_at);

-- Insert default settings
INSERT OR IGNORE INTO settings (id) VALUES ('clinic_settings');

-- Insert default treatments
INSERT OR IGNORE INTO treatments (id, name, description, default_cost, duration_minutes, category) VALUES
('cleaning', 'تنظيف الأسنان', 'تنظيف وتلميع الأسنان بشكل منتظم', 100.00, 60, 'العلاجات الوقائية'),
('filling', 'حشو الأسنان', 'إجراء حشو الأسنان المتضررة', 150.00, 90, 'الترميمية (المحافظة)'),
('extraction', 'قلع الأسنان', 'إجراء إزالة الأسنان', 200.00, 45, 'العلاجات الجراحية'),
('crown', 'تاج الأسنان', 'إجراء تركيب تاج الأسنان', 800.00, 120, 'التعويضات'),
('root_canal', 'علاج العصب', 'علاج عصب الأسنان', 600.00, 90, 'علاج العصب'),
('whitening', 'تبييض الأسنان', 'تبييض الأسنان المهني', 300.00, 60, 'العلاجات التجميلية'),
('checkup', 'فحص عام', 'فحص روتيني شامل للأسنان', 75.00, 30, 'العلاجات الوقائية'),

-- علاجات التعويضات الجديدة
-- أجهزة متحركة
('complete_denture_acrylic', 'جهاز متحرك كامل أكريل', 'جهاز أسنان متحرك كامل مصنوع من الأكريل', 1200.00, 180, 'التعويضات'),
('partial_denture_acrylic', 'جهاز متحرك جزئي أكريل', 'جهاز أسنان متحرك جزئي مصنوع من الأكريل', 800.00, 150, 'التعويضات'),
('complete_denture_vitalium', 'جهاز متحرك كامل فيتاليوم', 'جهاز أسنان متحرك كامل مصنوع من الفيتاليوم', 1800.00, 200, 'التعويضات'),
('partial_denture_vitalium', 'جهاز متحرك جزئي فيتاليوم', 'جهاز أسنان متحرك جزئي مصنوع من الفيتاليوم', 1400.00, 180, 'التعويضات'),
('complete_denture_flexible', 'جهاز متحرك كامل مرن', 'جهاز أسنان متحرك كامل مصنوع من مواد مرنة', 1500.00, 160, 'التعويضات'),
('partial_denture_flexible', 'جهاز متحرك جزئي مرن', 'جهاز أسنان متحرك جزئي مصنوع من مواد مرنة', 1000.00, 140, 'التعويضات'),

-- تعويضات فوق الزرعات
('implant_crown_zirconia', 'تعويض زركونيا فوق زرعة', 'تاج زركونيا مثبت فوق زرعة سنية', 1500.00, 120, 'التعويضات'),
('implant_crown_ceramic', 'تعويض خزف فوق زرعة', 'تاج خزفي مثبت فوق زرعة سنية', 1200.00, 120, 'التعويضات'),

-- قلوب وأوتاد
('cast_post_core', 'قلب ووتد مصبوب معدني', 'قلب ووتد معدني مصبوب لتقوية السن', 400.00, 90, 'التعويضات'),
('zirconia_post_core', 'قلب ووتد زركونيا', 'قلب ووتد مصنوع من الزركونيا', 600.00, 90, 'التعويضات'),

-- فينير
('veneer', 'فينير', 'قشور خزفية رقيقة للأسنان الأمامية', 800.00, 120, 'التعويضات');

-- Insert default labs

-- Performance Indexes
-- Patient indexes for search optimization
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_patients_serial ON patients(serial_number);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_name_phone ON patients(full_name, phone);

-- Appointment indexes for calendar and search optimization
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_treatment ON appointments(treatment_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(start_time, status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON appointments(patient_id, start_time);

-- Payment indexes for financial reports and search
CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_appointment ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_receipt ON payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payments_date_status ON payments(payment_date, status);
CREATE INDEX IF NOT EXISTS idx_payments_patient_date ON payments(patient_id, payment_date);

-- Treatment indexes for quick lookup
CREATE INDEX IF NOT EXISTS idx_treatments_name ON treatments(name);
CREATE INDEX IF NOT EXISTS idx_treatments_category ON treatments(category);

-- Inventory indexes for stock management
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory(supplier);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(quantity, minimum_stock);

-- Inventory usage indexes for tracking
CREATE INDEX IF NOT EXISTS idx_inventory_usage_item ON inventory_usage(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_usage_appointment ON inventory_usage(appointment_id);
CREATE INDEX IF NOT EXISTS idx_inventory_usage_date ON inventory_usage(usage_date);

-- Patient images indexes for quick access
CREATE INDEX IF NOT EXISTS idx_patient_images_patient ON patient_images(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_images_appointment ON patient_images(appointment_id);
CREATE INDEX IF NOT EXISTS idx_patient_images_type ON patient_images(image_type);

-- Installment payments indexes for payment tracking
CREATE INDEX IF NOT EXISTS idx_installment_payments_payment ON installment_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_due_date ON installment_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_installment_payments_status ON installment_payments(status);
CREATE INDEX IF NOT EXISTS idx_installment_payments_due_status ON installment_payments(due_date, status);

-- Laboratory tables
-- Labs table for managing laboratory information
CREATE TABLE IF NOT EXISTS labs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_info TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Laboratory orders table for managing orders sent to laboratories
CREATE TABLE IF NOT EXISTS lab_orders (
    id TEXT PRIMARY KEY,
    lab_id TEXT NOT NULL,
    patient_id TEXT,
    appointment_id TEXT, -- ربط طلب المختبر بموعد محدد
    tooth_treatment_id TEXT, -- ربط طلب المختبر بعلاج سن محدد
    tooth_number INTEGER, -- رقم السن المرتبط بالطلب
    service_name TEXT NOT NULL,
    cost REAL NOT NULL,
    order_date TEXT NOT NULL,
    expected_delivery_date TEXT, -- تاريخ التسليم المتوقع
    actual_delivery_date TEXT, -- تاريخ التسليم الفعلي
    status TEXT NOT NULL CHECK (status IN ('آجل', 'مكتمل', 'ملغي')),
    notes TEXT,
    paid_amount REAL DEFAULT 0,
    remaining_balance REAL,
    priority INTEGER DEFAULT 1, -- أولوية الطلب
    lab_instructions TEXT, -- تعليمات خاصة للمختبر
    material_type TEXT, -- نوع المادة المطلوبة
    color_shade TEXT, -- درجة اللون المطلوبة
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    FOREIGN KEY (tooth_treatment_id) REFERENCES tooth_treatments(id) ON DELETE CASCADE
);

-- Laboratory indexes for search and performance optimization
CREATE INDEX IF NOT EXISTS idx_labs_name ON labs(name);
CREATE INDEX IF NOT EXISTS idx_lab_orders_lab ON lab_orders(lab_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_date ON lab_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status);
CREATE INDEX IF NOT EXISTS idx_lab_orders_service ON lab_orders(service_name);
CREATE INDEX IF NOT EXISTS idx_lab_orders_lab_date ON lab_orders(lab_id, order_date);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_date ON lab_orders(patient_id, order_date);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status_date ON lab_orders(status, order_date);
CREATE INDEX IF NOT EXISTS idx_lab_orders_treatment ON lab_orders(tooth_treatment_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_appointment ON lab_orders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_tooth ON lab_orders(tooth_number);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_tooth ON lab_orders(patient_id, tooth_number);
CREATE INDEX IF NOT EXISTS idx_lab_orders_priority ON lab_orders(priority);

-- Medications tables
-- Medications table for managing medication information
CREATE TABLE IF NOT EXISTS medications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    instructions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Prescriptions table for managing prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    appointment_id TEXT,
    tooth_treatment_id TEXT, -- ربط الوصفة بعلاج سن محدد
    prescription_date TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

-- Prescription medications junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS prescription_medications (
    id TEXT PRIMARY KEY,
    prescription_id TEXT NOT NULL,
    medication_id TEXT NOT NULL,
    dose TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
);

-- Multiple treatments per tooth table
CREATE TABLE IF NOT EXISTS tooth_treatments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    tooth_number INTEGER NOT NULL CHECK (
        (tooth_number >= 11 AND tooth_number <= 18) OR
        (tooth_number >= 21 AND tooth_number <= 28) OR
        (tooth_number >= 31 AND tooth_number <= 38) OR
        (tooth_number >= 41 AND tooth_number <= 48) OR
        (tooth_number >= 51 AND tooth_number <= 55) OR
        (tooth_number >= 61 AND tooth_number <= 65) OR
        (tooth_number >= 71 AND tooth_number <= 75) OR
        (tooth_number >= 81 AND tooth_number <= 85)
    ),
    tooth_name TEXT NOT NULL,
    treatment_type TEXT NOT NULL, -- From TREATMENT_TYPES
    treatment_category TEXT NOT NULL, -- preventive, restorative, endodontic, etc.
    treatment_status TEXT DEFAULT 'planned', -- planned, in_progress, completed, cancelled
    treatment_color TEXT NOT NULL,
    start_date DATE,
    completion_date DATE,
    cost DECIMAL(10,2) DEFAULT 0,
    priority INTEGER DEFAULT 1, -- For ordering treatments (1 = highest priority)
    notes TEXT,
    appointment_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    -- Ensure unique priority per tooth per patient
    UNIQUE(patient_id, tooth_number, priority)
);

-- Legacy dental treatment images table (kept for backward compatibility)
CREATE TABLE IF NOT EXISTS dental_treatment_images (
    id TEXT PRIMARY KEY,
    dental_treatment_id TEXT,
    patient_id TEXT NOT NULL,
    tooth_number INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    image_type TEXT NOT NULL, -- before, after, xray, clinical
    description TEXT,
    taken_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- New tooth treatment images table for multiple treatments system
CREATE TABLE IF NOT EXISTS tooth_treatment_images (
    id TEXT PRIMARY KEY,
    tooth_treatment_id TEXT,
    patient_id TEXT NOT NULL,
    tooth_number INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    image_type TEXT NOT NULL, -- before, after, xray, clinical, other
    description TEXT,
    taken_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tooth_treatment_id) REFERENCES tooth_treatments(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Clinic needs table for managing clinic requirements and needs
CREATE TABLE IF NOT EXISTS clinic_needs (
    id TEXT PRIMARY KEY,
    serial_number TEXT UNIQUE NOT NULL,
    need_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    category TEXT,
    priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
    status TEXT DEFAULT 'pending', -- pending, ordered, received, cancelled
    supplier TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Clinic expenses table for operational expenses (salaries, utilities, etc.)
CREATE TABLE IF NOT EXISTS clinic_expenses (
    id TEXT PRIMARY KEY,
    expense_name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_type TEXT NOT NULL, -- salary, utilities, rent, maintenance, supplies, insurance, other
    category TEXT,
    description TEXT,
    payment_method TEXT NOT NULL, -- cash, bank_transfer, check, credit_card
    payment_date DATETIME NOT NULL,
    due_date DATETIME,
    is_recurring BOOLEAN DEFAULT 0,
    recurring_frequency TEXT, -- daily, weekly, monthly, quarterly, yearly
    recurring_end_date DATETIME,
    status TEXT DEFAULT 'pending', -- paid, pending, overdue, cancelled
    receipt_number TEXT,
    vendor TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



-- Medications indexes for search and performance optimization
CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name);

-- Prescriptions indexes for search and performance optimization
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment ON prescriptions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_tooth_treatment ON prescriptions(tooth_treatment_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON prescriptions(prescription_date);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_date ON prescriptions(patient_id, prescription_date);

-- Treatment sessions table for managing multiple sessions per treatment
CREATE TABLE IF NOT EXISTS treatment_sessions (
    id TEXT PRIMARY KEY,
    tooth_treatment_id TEXT NOT NULL,
    session_number INTEGER NOT NULL,
    session_type TEXT NOT NULL, -- نوع الجلسة من قائمة محددة
    session_title TEXT NOT NULL, -- عنوان الجلسة
    session_description TEXT, -- وصف ما تم عمله في الجلسة
    session_date DATE NOT NULL,
    session_status TEXT DEFAULT 'planned', -- planned, completed, cancelled
    duration_minutes INTEGER DEFAULT 30,
    cost DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tooth_treatment_id) REFERENCES tooth_treatments(id) ON DELETE CASCADE,
    -- Ensure unique session number per treatment
    UNIQUE(tooth_treatment_id, session_number)
);

-- Patient treatment timeline table for comprehensive treatment tracking
CREATE TABLE IF NOT EXISTS patient_treatment_timeline (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    appointment_id TEXT,
    tooth_treatment_id TEXT,
    prescription_id TEXT,
    lab_order_id TEXT,
    timeline_type TEXT NOT NULL CHECK (timeline_type IN ('appointment', 'treatment', 'prescription', 'lab_order', 'payment', 'note')),
    title TEXT NOT NULL,
    description TEXT,
    event_date DATETIME NOT NULL,
    status TEXT DEFAULT 'active', -- active, completed, cancelled
    priority INTEGER DEFAULT 1, -- 1 = high, 2 = medium, 3 = low
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE SET NULL,
    FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE SET NULL
);

-- Treatment plan table for comprehensive treatment planning
CREATE TABLE IF NOT EXISTS treatment_plans (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    description TEXT,
    total_estimated_cost DECIMAL(10,2) DEFAULT 0,
    estimated_duration_weeks INTEGER,
    status TEXT DEFAULT 'draft', -- draft, active, completed, cancelled
    start_date DATE,
    target_completion_date DATE,
    actual_completion_date DATE,
    created_by TEXT, -- Doctor/user who created the plan
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Treatment plan items table for detailed treatment steps
CREATE TABLE IF NOT EXISTS treatment_plan_items (
    id TEXT PRIMARY KEY,
    treatment_plan_id TEXT NOT NULL,
    tooth_treatment_id TEXT,
    sequence_order INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    estimated_cost DECIMAL(10,2) DEFAULT 0,
    estimated_duration_minutes INTEGER,
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed, skipped
    dependencies TEXT, -- JSON array of treatment_plan_item IDs that must be completed first
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id) ON DELETE CASCADE
);

-- Indexes for new tables
-- Treatment sessions indexes
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_treatment ON treatment_sessions(tooth_treatment_id);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_date ON treatment_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_status ON treatment_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_number ON treatment_sessions(tooth_treatment_id, session_number);

CREATE INDEX IF NOT EXISTS idx_patient_timeline_patient ON patient_treatment_timeline(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_timeline_date ON patient_treatment_timeline(event_date);
CREATE INDEX IF NOT EXISTS idx_patient_timeline_type ON patient_treatment_timeline(timeline_type);
CREATE INDEX IF NOT EXISTS idx_patient_timeline_status ON patient_treatment_timeline(status);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_status ON treatment_plans(status);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_dates ON treatment_plans(start_date, target_completion_date);

CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_plan ON treatment_plan_items(treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_sequence ON treatment_plan_items(treatment_plan_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_status ON treatment_plan_items(status);

-- Additional composite indexes for performance optimization
-- Patient data access patterns (common in reports and patient details)
CREATE INDEX IF NOT EXISTS idx_patients_date_added_name ON patients(date_added, full_name);
CREATE INDEX IF NOT EXISTS idx_patients_gender_age ON patients(gender, age);
CREATE INDEX IF NOT EXISTS idx_patients_age_gender ON patients(age, gender);

-- Appointments optimization for patient history and scheduling
CREATE INDEX IF NOT EXISTS idx_appointments_patient_status_date ON appointments(patient_id, status, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status_date_patient ON appointments(status, start_time, patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_treatment_patient ON appointments(treatment_id, patient_id);

-- Payments optimization for financial reports and patient balances
CREATE INDEX IF NOT EXISTS idx_payments_patient_date_status ON payments(patient_id, payment_date, status);
CREATE INDEX IF NOT EXISTS idx_payments_appointment_patient ON payments(appointment_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient_appointment ON payments(patient_id, appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status_date_amount ON payments(status, payment_date, amount);

-- Tooth treatments optimization for patient treatment history
CREATE INDEX IF NOT EXISTS idx_tooth_treatments_patient_status ON tooth_treatments(patient_id, treatment_status);
CREATE INDEX IF NOT EXISTS idx_tooth_treatments_patient_category ON tooth_treatments(patient_id, treatment_category);
CREATE INDEX IF NOT EXISTS idx_tooth_treatments_status_category ON tooth_treatments(treatment_status, treatment_category);

-- Lab orders optimization for patient lab history
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_date_status ON lab_orders(patient_id, order_date, status);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_treatment ON lab_orders(patient_id, tooth_treatment_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status_date_patient ON lab_orders(status, order_date, patient_id);

-- Prescriptions optimization for patient medication history
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_date ON prescriptions(patient_id, prescription_date);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_treatment ON prescriptions(patient_id, tooth_treatment_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_treatment_patient ON prescriptions(tooth_treatment_id, patient_id);

-- Treatment sessions optimization for session tracking
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_treatment_date ON treatment_sessions(tooth_treatment_id, session_date);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_status_date ON treatment_sessions(session_status, session_date);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_treatment_status ON treatment_sessions(tooth_treatment_id, session_status);

-- Triggers for automatic tooth_number population in lab_orders
CREATE TRIGGER IF NOT EXISTS update_lab_order_tooth_number
AFTER UPDATE OF tooth_treatment_id ON lab_orders
WHEN NEW.tooth_treatment_id IS NOT NULL AND NEW.tooth_number IS NULL
BEGIN
    UPDATE lab_orders
    SET tooth_number = (
        SELECT tooth_number
        FROM tooth_treatments
        WHERE id = NEW.tooth_treatment_id
    )
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS insert_lab_order_tooth_number
AFTER INSERT ON lab_orders
WHEN NEW.tooth_treatment_id IS NOT NULL AND NEW.tooth_number IS NULL
BEGIN
    UPDATE lab_orders
    SET tooth_number = (
        SELECT tooth_number
        FROM tooth_treatments
        WHERE id = NEW.tooth_treatment_id
    )
    WHERE id = NEW.id;
END;

-- Prescription medications indexes for relationship queries
CREATE INDEX IF NOT EXISTS idx_prescription_medications_prescription ON prescription_medications(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_medications_medication ON prescription_medications(medication_id);

-- ============================================
-- ENHANCED PERFORMANCE INDEXES
-- ============================================

-- Critical Performance Indexes for Common Queries
-- Dashboard and Reports Optimization
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Multi-column indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_patients_full_name_gender ON patients(full_name, gender);
CREATE INDEX IF NOT EXISTS idx_patients_age_gender ON patients(age, gender);
CREATE INDEX IF NOT EXISTS idx_patients_date_added_age ON patients(date_added, age);

-- Appointment performance indexes
CREATE INDEX IF NOT EXISTS idx_appointments_start_time_end_time ON appointments(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_start_time ON appointments(patient_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status_start_time ON appointments(status, start_time);

-- Payment performance indexes for financial reports
CREATE INDEX IF NOT EXISTS idx_payments_payment_method_date ON payments(payment_method, payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_amount_date ON payments(amount, payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_patient_amount ON payments(patient_id, amount);

-- Treatment performance indexes
CREATE INDEX IF NOT EXISTS idx_tooth_treatments_patient_date ON tooth_treatments(patient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tooth_treatments_status_date ON tooth_treatments(treatment_status, created_at);
CREATE INDEX IF NOT EXISTS idx_tooth_treatments_category_status ON tooth_treatments(treatment_category, treatment_status);

-- Lab orders performance indexes
CREATE INDEX IF NOT EXISTS idx_lab_orders_expected_delivery ON lab_orders(expected_delivery_date);
CREATE INDEX IF NOT EXISTS idx_lab_orders_actual_delivery ON lab_orders(actual_delivery_date);
CREATE INDEX IF NOT EXISTS idx_lab_orders_cost_date ON lab_orders(cost, order_date);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_status_date ON lab_orders(patient_id, status, order_date);

-- Inventory performance indexes for low stock alerts
CREATE INDEX IF NOT EXISTS idx_inventory_quantity_minimum ON inventory(quantity, minimum_stock);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry_quantity ON inventory(expiry_date, quantity);
CREATE INDEX IF NOT EXISTS idx_inventory_category_quantity ON inventory(category, quantity);

-- Smart alerts performance indexes
CREATE INDEX IF NOT EXISTS idx_smart_alerts_type_priority ON smart_alerts(type, priority);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_patient_type ON smart_alerts(patient_id, type);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_due_date_priority ON smart_alerts(due_date, priority);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_is_read_due_date ON smart_alerts(is_read, due_date);

-- Treatment sessions performance indexes
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_date_status ON treatment_sessions(session_date, session_status);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_treatment_date ON treatment_sessions(tooth_treatment_id, session_date);

-- Patient timeline performance indexes
CREATE INDEX IF NOT EXISTS idx_patient_timeline_patient_type_date ON patient_treatment_timeline(patient_id, timeline_type, event_date);
CREATE INDEX IF NOT EXISTS idx_patient_timeline_status_priority ON patient_treatment_timeline(status, priority);
CREATE INDEX IF NOT EXISTS idx_patient_timeline_due_date ON patient_treatment_timeline(due_date);

-- Treatment plans performance indexes
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient_status ON treatment_plans(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_start_completion ON treatment_plans(start_date, target_completion_date);

-- Full-text search indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_patients_search ON patients(full_name, phone, email, address, notes);
CREATE INDEX IF NOT EXISTS idx_appointments_search ON appointments(title, description, notes);
CREATE INDEX IF NOT EXISTS idx_payments_search ON payments(description, notes, receipt_number);
CREATE INDEX IF NOT EXISTS idx_lab_orders_search ON lab_orders(service_name, notes, lab_instructions);
CREATE INDEX IF NOT EXISTS idx_inventory_search ON inventory(name, description, category, supplier);

-- Date range performance indexes
CREATE INDEX IF NOT EXISTS idx_appointments_date_range ON appointments(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_payments_date_range ON payments(payment_date, created_at);
CREATE INDEX IF NOT EXISTS idx_patient_timeline_date_range ON patient_treatment_timeline(event_date, created_at);

-- Status-based performance indexes for filtering
CREATE INDEX IF NOT EXISTS idx_appointments_status_patient ON appointments(status, patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_status_patient ON payments(status, patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status_patient ON lab_orders(status, patient_id);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_status_type ON smart_alerts(is_read, is_dismissed, type);

-- Priority-based indexes for urgent items
CREATE INDEX IF NOT EXISTS idx_smart_alerts_priority_due ON smart_alerts(priority, due_date);
CREATE INDEX IF NOT EXISTS idx_lab_orders_priority_date ON lab_orders(priority, order_date);
CREATE INDEX IF NOT EXISTS idx_clinic_needs_priority_status ON clinic_needs(priority, status);

-- Patient-centric composite indexes for patient details pages
CREATE INDEX IF NOT EXISTS idx_patient_appointments ON appointments(patient_id, start_time, status);
CREATE INDEX IF NOT EXISTS idx_patient_payments ON payments(patient_id, payment_date, status);
CREATE INDEX IF NOT EXISTS idx_patient_tooth_treatments ON tooth_treatments(patient_id, tooth_number, treatment_status);
CREATE INDEX IF NOT EXISTS idx_patient_lab_orders ON lab_orders(patient_id, order_date, status);
CREATE INDEX IF NOT EXISTS idx_patient_prescriptions ON prescriptions(patient_id, prescription_date);
CREATE INDEX IF NOT EXISTS idx_patient_timeline ON patient_treatment_timeline(patient_id, event_date, timeline_type);

-- Financial reporting indexes
CREATE INDEX IF NOT EXISTS idx_payments_month_year ON payments(strftime('%Y-%m', payment_date));
CREATE INDEX IF NOT EXISTS idx_appointments_month_year ON appointments(strftime('%Y-%m', start_time));
CREATE INDEX IF NOT EXISTS idx_clinic_expenses_month_year ON clinic_expenses(strftime('%Y-%m', payment_date));

-- WhatsApp reminders optimization
CREATE INDEX IF NOT EXISTS idx_whatsapp_reminders_status_date ON whatsapp_reminders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_reminders_patient_status ON whatsapp_reminders(patient_id, status);

-- Optimized indexes for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_dashboard_recent_appointments ON appointments(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_recent_payments ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_upcoming_appointments ON appointments(start_time ASC);
CREATE INDEX IF NOT EXISTS idx_dashboard_pending_payments ON payments(status, payment_date);
CREATE INDEX IF NOT EXISTS idx_dashboard_low_stock ON inventory(quantity, minimum_stock);

-- Performance monitoring indexes
CREATE INDEX IF NOT EXISTS idx_performance_check ON (
  SELECT 1 FROM patients p
  LEFT JOIN appointments a ON p.id = a.patient_id
  LEFT JOIN payments pay ON p.id = pay.patient_id
  WHERE p.created_at > datetime('now', '-30 days')
  LIMIT 1
);

-- Partial indexes for better performance on active records
CREATE INDEX IF NOT EXISTS idx_appointments_active ON appointments(start_time, patient_id) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_payments_completed ON payments(payment_date, patient_id) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_lab_orders_active ON lab_orders(order_date, patient_id) WHERE status != 'ملغي';
CREATE INDEX IF NOT EXISTS idx_smart_alerts_unread ON smart_alerts(due_date, priority) WHERE is_read = 0 AND is_dismissed = 0;

-- Covering indexes for frequently accessed data
CREATE INDEX IF NOT EXISTS idx_patients_covering ON patients(id, full_name, phone, age, gender);
CREATE INDEX IF NOT EXISTS idx_appointments_covering ON appointments(id, patient_id, start_time, end_time, status, title);
CREATE INDEX IF NOT EXISTS idx_payments_covering ON payments(id, patient_id, amount, payment_date, status, payment_method);

-- Final optimization: ANALYZE all tables for query planner
ANALYZE;

-- Performance analysis query for monitoring
-- This query can be used to monitor index usage and query performance
/*
SELECT
  name as table_name,
  COUNT(*) as row_count
FROM sqlite_master
CROSS JOIN pragma_table_info(name)
GROUP BY name
ORDER BY row_count DESC;
*/
