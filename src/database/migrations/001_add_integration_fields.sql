-- Migration: Add integration fields and tables
-- Version: 001
-- Description: Add fields and tables for enhanced patient-treatment integration

-- Add new fields to existing tables

-- Add tooth_treatment_id to prescriptions table
ALTER TABLE prescriptions ADD COLUMN tooth_treatment_id TEXT;
ALTER TABLE prescriptions ADD FOREIGN KEY (tooth_treatment_id) REFERENCES tooth_treatments(id) ON DELETE SET NULL;

-- Add new fields to lab_orders table
ALTER TABLE lab_orders ADD COLUMN appointment_id TEXT;
ALTER TABLE lab_orders ADD COLUMN tooth_treatment_id TEXT;
ALTER TABLE lab_orders ADD COLUMN expected_delivery_date TEXT;
ALTER TABLE lab_orders ADD COLUMN actual_delivery_date TEXT;

-- Add foreign keys for lab_orders
ALTER TABLE lab_orders ADD FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;
ALTER TABLE lab_orders ADD FOREIGN KEY (tooth_treatment_id) REFERENCES tooth_treatments(id) ON DELETE SET NULL;

-- Create new tables for enhanced integration

-- Patient treatment timeline table
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
    FOREIGN KEY (tooth_treatment_id) REFERENCES tooth_treatments(id) ON DELETE SET NULL,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE SET NULL,
    FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE SET NULL
);

-- Treatment plans table
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

-- Treatment plan items table
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
    FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (tooth_treatment_id) REFERENCES tooth_treatments(id) ON DELETE SET NULL
);

-- Create indexes for better performance

-- Indexes for prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_tooth_treatment ON prescriptions(tooth_treatment_id);

-- Indexes for lab_orders
CREATE INDEX IF NOT EXISTS idx_lab_orders_appointment ON lab_orders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_tooth_treatment ON lab_orders(tooth_treatment_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_expected_delivery ON lab_orders(expected_delivery_date);
CREATE INDEX IF NOT EXISTS idx_lab_orders_actual_delivery ON lab_orders(actual_delivery_date);

-- Indexes for patient_treatment_timeline
CREATE INDEX IF NOT EXISTS idx_patient_timeline_patient ON patient_treatment_timeline(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_timeline_date ON patient_treatment_timeline(event_date);
CREATE INDEX IF NOT EXISTS idx_patient_timeline_type ON patient_treatment_timeline(timeline_type);
CREATE INDEX IF NOT EXISTS idx_patient_timeline_status ON patient_treatment_timeline(status);
CREATE INDEX IF NOT EXISTS idx_patient_timeline_priority ON patient_treatment_timeline(priority);

-- Indexes for treatment_plans
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_status ON treatment_plans(status);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_dates ON treatment_plans(start_date, target_completion_date);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_created_by ON treatment_plans(created_by);

-- Indexes for treatment_plan_items
CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_plan ON treatment_plan_items(treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_sequence ON treatment_plan_items(treatment_plan_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_status ON treatment_plan_items(status);
CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_tooth_treatment ON treatment_plan_items(tooth_treatment_id);

-- Create triggers for automatic timeline creation

-- Trigger for appointments
CREATE TRIGGER IF NOT EXISTS create_appointment_timeline
AFTER INSERT ON appointments
BEGIN
    INSERT INTO patient_treatment_timeline (
        id, patient_id, appointment_id, timeline_type, title, description, event_date, status, priority
    ) VALUES (
        hex(randomblob(16)),
        NEW.patient_id,
        NEW.id,
        'appointment',
        'موعد جديد: ' || NEW.title,
        NEW.description,
        NEW.start_time,
        'active',
        1
    );
END;

-- Trigger for treatments
CREATE TRIGGER IF NOT EXISTS create_treatment_timeline
AFTER INSERT ON tooth_treatments
BEGIN
    INSERT INTO patient_treatment_timeline (
        id, patient_id, tooth_treatment_id, timeline_type, title, description, event_date, status, priority
    ) VALUES (
        hex(randomblob(16)),
        NEW.patient_id,
        NEW.id,
        'treatment',
        'علاج جديد: ' || NEW.treatment_type || ' - السن رقم ' || NEW.tooth_number,
        NEW.notes,
        COALESCE(NEW.start_date, datetime('now')),
        'active',
        CASE NEW.treatment_status 
            WHEN 'planned' THEN 2
            WHEN 'in_progress' THEN 1
            ELSE 3
        END
    );
END;

-- Trigger for prescriptions
CREATE TRIGGER IF NOT EXISTS create_prescription_timeline
AFTER INSERT ON prescriptions
BEGIN
    INSERT INTO patient_treatment_timeline (
        id, patient_id, prescription_id, tooth_treatment_id, timeline_type, title, description, event_date, status, priority
    ) VALUES (
        hex(randomblob(16)),
        NEW.patient_id,
        NEW.id,
        NEW.tooth_treatment_id,
        'prescription',
        'وصفة طبية جديدة',
        NEW.notes,
        NEW.prescription_date,
        'active',
        2
    );
END;

-- Trigger for lab orders
CREATE TRIGGER IF NOT EXISTS create_lab_order_timeline
AFTER INSERT ON lab_orders
BEGIN
    INSERT INTO patient_treatment_timeline (
        id, patient_id, lab_order_id, tooth_treatment_id, timeline_type, title, description, event_date, status, priority
    ) VALUES (
        hex(randomblob(16)),
        NEW.patient_id,
        NEW.id,
        NEW.tooth_treatment_id,
        'lab_order',
        'طلب مختبر: ' || NEW.service_name,
        NEW.notes,
        NEW.order_date,
        'active',
        2
    );
END;

-- Trigger for payments
CREATE TRIGGER IF NOT EXISTS create_payment_timeline
AFTER INSERT ON payments
BEGIN
    INSERT INTO patient_treatment_timeline (
        id, patient_id, timeline_type, title, description, event_date, status, priority
    ) VALUES (
        hex(randomblob(16)),
        NEW.patient_id,
        'payment',
        'دفعة جديدة: ' || NEW.amount || ' $',
        NEW.description,
        NEW.payment_date,
        'completed',
        3
    );
END;

-- Update triggers for status changes

-- Update treatment timeline when treatment status changes
CREATE TRIGGER IF NOT EXISTS update_treatment_timeline_status
AFTER UPDATE OF treatment_status ON tooth_treatments
WHEN OLD.treatment_status != NEW.treatment_status
BEGIN
    UPDATE patient_treatment_timeline 
    SET 
        status = CASE NEW.treatment_status 
            WHEN 'completed' THEN 'completed'
            WHEN 'cancelled' THEN 'cancelled'
            ELSE 'active'
        END,
        priority = CASE NEW.treatment_status 
            WHEN 'in_progress' THEN 1
            WHEN 'planned' THEN 2
            ELSE 3
        END,
        updated_at = datetime('now')
    WHERE tooth_treatment_id = NEW.id;
END;

-- Update appointment timeline when appointment status changes
CREATE TRIGGER IF NOT EXISTS update_appointment_timeline_status
AFTER UPDATE OF status ON appointments
WHEN OLD.status != NEW.status
BEGIN
    UPDATE patient_treatment_timeline 
    SET 
        status = CASE NEW.status 
            WHEN 'completed' THEN 'completed'
            WHEN 'cancelled' THEN 'cancelled'
            ELSE 'active'
        END,
        updated_at = datetime('now')
    WHERE appointment_id = NEW.id;
END;
