-- Migration: Fix lab orders cascade delete relationship
-- Date: 2025-07-01
-- Description: Update lab_orders table to properly cascade delete when tooth treatments are deleted

-- First, check if the foreign key constraint exists and drop it if needed
-- Note: SQLite doesn't support dropping foreign keys directly, so we need to recreate the table

-- Step 1: Create a backup of the current lab_orders table
CREATE TABLE IF NOT EXISTS lab_orders_backup AS SELECT * FROM lab_orders;

-- Step 2: Drop the current lab_orders table
DROP TABLE IF EXISTS lab_orders;

-- Step 3: Recreate lab_orders table with proper cascade delete
CREATE TABLE lab_orders (
    id TEXT PRIMARY KEY,
    lab_id TEXT NOT NULL,
    patient_id TEXT,
    appointment_id TEXT, -- ربط طلب المختبر بموعد محدد
    tooth_treatment_id TEXT, -- ربط طلب المختبر بعلاج سن محدد
    service_name TEXT NOT NULL,
    cost REAL NOT NULL,
    order_date TEXT NOT NULL,
    expected_delivery_date TEXT, -- تاريخ التسليم المتوقع
    actual_delivery_date TEXT, -- تاريخ التسليم الفعلي
    status TEXT NOT NULL CHECK (status IN ('آجل', 'مكتمل', 'ملغي')),
    notes TEXT,
    paid_amount REAL DEFAULT 0,
    remaining_balance REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    FOREIGN KEY (tooth_treatment_id) REFERENCES tooth_treatments(id) ON DELETE CASCADE
);

-- Step 4: Restore data from backup
INSERT INTO lab_orders SELECT * FROM lab_orders_backup;

-- Step 5: Drop the backup table
DROP TABLE lab_orders_backup;

-- Step 6: Recreate indexes for performance
CREATE INDEX IF NOT EXISTS idx_labs_name ON labs(name);
CREATE INDEX IF NOT EXISTS idx_lab_orders_lab ON lab_orders(lab_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_date ON lab_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status);
CREATE INDEX IF NOT EXISTS idx_lab_orders_service ON lab_orders(service_name);
CREATE INDEX IF NOT EXISTS idx_lab_orders_lab_date ON lab_orders(lab_id, order_date);
CREATE INDEX IF NOT EXISTS idx_lab_orders_treatment ON lab_orders(tooth_treatment_id);

-- Step 7: Clean up orphaned lab orders (orders without valid tooth_treatment_id)
-- This will remove any existing orphaned orders
DELETE FROM lab_orders 
WHERE tooth_treatment_id IS NOT NULL 
AND tooth_treatment_id NOT IN (SELECT id FROM tooth_treatments);

-- Verify the migration
SELECT 'Migration completed successfully. Lab orders table updated with cascade delete.' as result;
