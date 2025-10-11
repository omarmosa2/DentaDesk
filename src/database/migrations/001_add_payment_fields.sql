-- Migration to add missing fields to payments table
-- This migration adds notes, discount_amount, tax_amount, and total_amount fields

-- Add notes column if it doesn't exist
ALTER TABLE payments ADD COLUMN notes TEXT;

-- Add discount_amount column if it doesn't exist
ALTER TABLE payments ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;

-- Add tax_amount column if it doesn't exist
ALTER TABLE payments ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0;

-- Add total_amount column if it doesn't exist
ALTER TABLE payments ADD COLUMN total_amount DECIMAL(10,2);

-- Update existing records to set total_amount = amount where total_amount is NULL
UPDATE payments SET total_amount = amount WHERE total_amount IS NULL;
