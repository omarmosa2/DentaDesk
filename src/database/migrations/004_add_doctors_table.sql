-- Migration: Add doctors table and update appointments table
-- Version: 004
-- Description: Add doctors management system with appointment linking

-- Create doctors table
CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add doctor_id and doctor_specialty columns to appointments table
-- First check if columns exist
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we'll use a migration approach

-- Add indexes for doctors table
CREATE INDEX IF NOT EXISTS idx_doctors_name ON doctors(name);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);

-- Add index for appointments doctor_id
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);

