-- Migration: Add WhatsApp reminder fields and table
-- Version: 003
-- Description: Add WhatsApp reminder functionality to the settings table and create whatsapp_reminders table

-- Add WhatsApp reminder fields to settings table
ALTER TABLE settings ADD COLUMN whatsapp_reminder_enabled INTEGER DEFAULT 0; -- BOOLEAN stored as INTEGER (0 or 1)
ALTER TABLE settings ADD COLUMN whatsapp_reminder_hours_before INTEGER DEFAULT 3;
ALTER TABLE settings ADD COLUMN whatsapp_reminder_minutes_before INTEGER DEFAULT 180;
ALTER TABLE settings ADD COLUMN whatsapp_reminder_message TEXT DEFAULT 'مرحبًا {{patient_name}}، تذكير بموعدك في عيادة الأسنان بتاريخ {{appointment_date}} الساعة {{appointment_time}}. نشكرك على التزامك.';
ALTER TABLE settings ADD COLUMN whatsapp_reminder_custom_enabled INTEGER DEFAULT 0; -- BOOLEAN stored as INTEGER (0 or 1)

-- Create whatsapp_reminders table
CREATE TABLE IF NOT EXISTS whatsapp_reminders (
    id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    sent_at DATETIME,
    status TEXT DEFAULT 'pending', -- pending, sent, failed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_reminders_appointment ON whatsapp_reminders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_reminders_patient ON whatsapp_reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_reminders_status ON whatsapp_reminders(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_reminders_sent_at ON whatsapp_reminders(sent_at);

-- Migration completed successfully