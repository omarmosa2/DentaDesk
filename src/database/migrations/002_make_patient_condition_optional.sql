-- Migration: Make patient_condition field optional
-- This migration removes the NOT NULL constraint from patient_condition field

-- Step 1: Create a backup of the current patients table
CREATE TABLE patients_backup AS SELECT * FROM patients;

-- Step 2: Drop the current patients table
DROP TABLE patients;

-- Step 3: Create the new patients table with patient_condition as optional
CREATE TABLE patients (
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
    date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Migrate existing data to the new schema
INSERT INTO patients (
    id,
    serial_number,
    full_name,
    gender,
    age,
    patient_condition,
    allergies,
    medical_conditions,
    email,
    address,
    notes,
    phone,
    date_added,
    created_at,
    updated_at
)
SELECT 
    id,
    serial_number,
    full_name,
    gender,
    age,
    patient_condition,
    allergies,
    medical_conditions,
    email,
    address,
    notes,
    phone,
    date_added,
    created_at,
    updated_at
FROM patients_backup;

-- Step 5: Drop the backup table
DROP TABLE patients_backup;

-- Step 6: Recreate indexes if any existed
CREATE INDEX IF NOT EXISTS idx_patients_serial_number ON patients(serial_number);
CREATE INDEX IF NOT EXISTS idx_patients_full_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
