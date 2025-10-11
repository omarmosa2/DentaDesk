-- Migration: Update Patient Schema
-- This migration updates the patients table to match the new requirements
-- while preserving existing data

-- Step 1: Create a backup table with existing data
CREATE TABLE IF NOT EXISTS patients_backup AS SELECT * FROM patients;

-- Step 2: Drop the existing patients table
DROP TABLE IF EXISTS patients;

-- Step 3: Create the new patients table with updated schema
CREATE TABLE patients (
    id TEXT PRIMARY KEY,
    serial_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    age INTEGER NOT NULL CHECK (age > 0),
    patient_condition TEXT NOT NULL,
    allergies TEXT,
    medical_conditions TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    phone TEXT,
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
    created_at,
    updated_at
)
SELECT 
    id,
    -- Generate serial number from existing ID (first 8 characters)
    SUBSTR(id, 1, 8) as serial_number,
    -- Combine first_name and last_name into full_name
    COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') as full_name,
    -- Default gender to 'male' if not specified (can be updated later)
    'male' as gender,
    -- Calculate age from date_of_birth or default to 25 if not available
    CASE 
        WHEN date_of_birth IS NOT NULL AND date_of_birth != '' 
        THEN CAST((julianday('now') - julianday(date_of_birth)) / 365.25 AS INTEGER)
        ELSE 25
    END as age,
    -- Use medical_history as patient_condition or default message
    COALESCE(NULLIF(medical_history, ''), 'يحتاج إلى تقييم طبي') as patient_condition,
    -- Keep existing allergies
    allergies,
    -- Use insurance_info as medical_conditions (can be updated later)
    insurance_info as medical_conditions,
    -- Keep existing email
    email,
    -- Keep existing address
    address,
    -- Keep existing notes
    notes,
    -- Keep existing phone
    phone,
    -- Keep existing timestamps
    created_at,
    updated_at
FROM patients_backup;

-- Step 5: Clean up backup table (optional - comment out if you want to keep backup)
-- DROP TABLE patients_backup;
