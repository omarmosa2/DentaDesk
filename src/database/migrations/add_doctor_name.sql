-- Migration to add doctor_name field to settings table
-- This migration adds the doctor_name column if it doesn't exist

-- Check if doctor_name column exists, if not add it
ALTER TABLE settings ADD COLUMN doctor_name TEXT DEFAULT 'د. محمد أحمد';

-- Update existing settings with default doctor name if null
UPDATE settings SET doctor_name = 'د. محمد أحمد' WHERE doctor_name IS NULL;
