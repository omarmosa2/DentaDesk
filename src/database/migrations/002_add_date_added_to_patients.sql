-- Migration 002: Add date_added field to patients table
-- This migration safely adds the date_added field to existing patients table

-- Step 1: Check if the column already exists
-- If it exists, this migration will be skipped

-- Step 2: Add the date_added column to the patients table
ALTER TABLE patients ADD COLUMN date_added DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Step 3: Update existing patients to have date_added = created_at
-- This ensures existing patients have a proper date_added value
UPDATE patients 
SET date_added = created_at 
WHERE date_added IS NULL;

-- Step 4: Create index for better performance on date filtering
CREATE INDEX IF NOT EXISTS idx_patients_date_added ON patients(date_added);

-- Migration completed successfully
