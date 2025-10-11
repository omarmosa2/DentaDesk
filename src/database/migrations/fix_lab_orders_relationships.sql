-- Migration: Fix and enhance lab orders relationships
-- Date: 2025-07-02
-- Description: Update lab_orders table to properly handle relationships with teeth, treatments, and appointments

-- First, check if the table exists and has the correct structure
PRAGMA table_info(lab_orders);

-- Step 1: Create a backup of the current lab_orders table
CREATE TABLE IF NOT EXISTS lab_orders_backup AS SELECT * FROM lab_orders;

-- Step 2: Drop the current lab_orders table
DROP TABLE IF EXISTS lab_orders;

-- Step 3: Recreate lab_orders table with complete relationship structure
CREATE TABLE lab_orders (
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

-- Step 4: Restore data from backup with proper column mapping
INSERT INTO lab_orders (
    id, lab_id, patient_id, appointment_id, tooth_treatment_id, 
    service_name, cost, order_date, expected_delivery_date, actual_delivery_date,
    status, notes, paid_amount, remaining_balance, created_at, updated_at
)
SELECT 
    id, lab_id, patient_id, 
    CASE WHEN EXISTS(SELECT 1 FROM pragma_table_info('lab_orders_backup') WHERE name = 'appointment_id') 
         THEN appointment_id ELSE NULL END,
    CASE WHEN EXISTS(SELECT 1 FROM pragma_table_info('lab_orders_backup') WHERE name = 'tooth_treatment_id') 
         THEN tooth_treatment_id ELSE NULL END,
    service_name, cost, order_date,
    CASE WHEN EXISTS(SELECT 1 FROM pragma_table_info('lab_orders_backup') WHERE name = 'expected_delivery_date') 
         THEN expected_delivery_date ELSE NULL END,
    CASE WHEN EXISTS(SELECT 1 FROM pragma_table_info('lab_orders_backup') WHERE name = 'actual_delivery_date') 
         THEN actual_delivery_date ELSE NULL END,
    status, notes, 
    COALESCE(paid_amount, 0), 
    COALESCE(remaining_balance, cost),
    created_at, updated_at
FROM lab_orders_backup;

-- Step 5: Drop the backup table
DROP TABLE lab_orders_backup;

-- Step 6: Create comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_labs_name ON labs(name);
CREATE INDEX IF NOT EXISTS idx_lab_orders_lab ON lab_orders(lab_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_date ON lab_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status);
CREATE INDEX IF NOT EXISTS idx_lab_orders_service ON lab_orders(service_name);
CREATE INDEX IF NOT EXISTS idx_lab_orders_lab_date ON lab_orders(lab_id, order_date);
CREATE INDEX IF NOT EXISTS idx_lab_orders_treatment ON lab_orders(tooth_treatment_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_appointment ON lab_orders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_tooth ON lab_orders(tooth_number);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_tooth ON lab_orders(patient_id, tooth_number);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status_date ON lab_orders(status, order_date);
CREATE INDEX IF NOT EXISTS idx_lab_orders_priority ON lab_orders(priority);

-- Step 7: Update tooth_number from tooth_treatments where possible
UPDATE lab_orders 
SET tooth_number = (
    SELECT tt.tooth_number 
    FROM tooth_treatments tt 
    WHERE tt.id = lab_orders.tooth_treatment_id
)
WHERE tooth_treatment_id IS NOT NULL 
AND tooth_number IS NULL;

-- Step 8: Create trigger to automatically update tooth_number when tooth_treatment_id is set
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

-- Step 9: Create trigger for new lab orders
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
