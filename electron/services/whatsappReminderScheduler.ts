import * as cron from 'node-cron';
import * as dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);
const APP_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
import { DatabaseService } from '../../src/services/databaseService';
import { sendMessage, initializeClient } from './whatsapp';

export interface UpcomingAppointment {
  id: string;
  patient_id: string;
  start_time: string;
  title: string;
  patient_name: string;
  phone: string;
}

export interface Settings {
  whatsapp_reminder_enabled: number;
  whatsapp_reminder_hours_before: number;
  whatsapp_reminder_message: string;
  whatsapp_reminder_minutes_before?: number;
  whatsapp_reminder_custom_enabled: number;
}

let cronJob: cron.ScheduledTask | null = null;
let dbService: DatabaseService;

export async function startScheduler(): Promise<void> {
  try {
    // Initialize database service
    dbService = new DatabaseService();

    // Ensure WhatsApp client is initialized
    await initializeClient();

    // Start the cron job that runs every minute
    cronJob = cron.schedule('* * * * *', async () => {
      try {
        await checkAndSendReminders();
      } catch (error) {
        console.error('Error in reminder scheduler:', error);
        // Don't throw error to prevent cron from stopping
      }
    });

    console.log('WhatsApp reminder scheduler started successfully');
  } catch (error) {
    console.error('Failed to start WhatsApp reminder scheduler:', error);
    throw error;
  }
}

export function stopScheduler(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('WhatsApp reminder scheduler stopped');
  }
}

export async function runSchedulerOnce(): Promise<void> {
  await checkAndSendReminders();
}

// Run a single diagnostic scan without sending messages
export async function runReminderDiagnostic(): Promise<{
  now: string;
  timezone: string;
  minutesBefore: number;
  settingsEnabled: boolean;
  candidates: Array<{
    id: string;
    patient_id: string;
    start_time: string;
    appointmentTime: string;
    reminderTime: string;
    eligible: boolean;
  }>;
}> {
  const settings = await getSettings()
  const enabled = !!settings && settings.whatsapp_reminder_enabled === 1
  const minutes = settings?.whatsapp_reminder_minutes_before ?? (settings?.whatsapp_reminder_hours_before || 0) * 60
  const now = dayjs().tz(APP_TZ)

  const appts = await dbService.getAllAppointments()
  const out: any[] = []
  for (const a of appts) {
    if (!a.start_time) continue
    const appointmentTime = dayjs(a.start_time).tz(APP_TZ)
    const reminderTime = appointmentTime.subtract(minutes, 'minute')
    const eligible = !reminderTime.isAfter(now) && appointmentTime.isAfter(now)
    out.push({
      id: a.id,
      patient_id: a.patient_id,
      start_time: a.start_time,
      appointmentTime: appointmentTime.toISOString(),
      reminderTime: reminderTime.toISOString(),
      eligible
    })
  }

  return {
    now: now.toISOString(),
    timezone: APP_TZ,
    minutesBefore: minutes,
    settingsEnabled: enabled,
    candidates: out
  }
}

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/[^0-9]/g, '');
  if (!digits) return null;
  // If starts with 00, drop it
  if (digits.startsWith('00')) digits = digits.slice(2);
  // If starts with single leading 0 followed by 9 (e.g., Syria local 09...), convert to 9639...
  if (digits.length === 10 && digits.startsWith('09')) {
    digits = '963' + digits.slice(1);
  }
  // Common case: if starts with 0 and country code is missing but number length is 9 (e.g., 9XXXXXXXX), prepend 963
  if (digits.length === 9 && digits.startsWith('9')) {
    digits = '963' + digits;
  }
  // Remove any leading plus that may remain (shouldn't due to regex), and return
  return digits;
}

async function checkAndSendReminders(): Promise<void> {
  try {
    // Get settings to check if reminders are enabled
    const settings = await getSettings();
    if (!settings || settings.whatsapp_reminder_enabled !== 1) {
      return; // Reminders disabled
    }

    console.log('Checking for upcoming appointments to send reminders...');

    // Get upcoming appointments (use minutes granularity when available)
    const minutes = settings.whatsapp_reminder_minutes_before ?? (settings.whatsapp_reminder_hours_before * 60)
    const upcomingAppointments = await getUpcomingAppointments(minutes);
    console.log('Eligible appointments count:', upcomingAppointments.length, 'minutesBefore:', minutes);

    for (const appointment of upcomingAppointments) {
      try {
        // Check if reminder was already sent
        const alreadySent = await isReminderAlreadySent(appointment.id);
        if (alreadySent) {
          continue; // Skip if already sent
        }

        // Get patient phone number
        const patientPhone = await getPatientPhone(appointment.patient_id);
        const normalizedPhone = normalizePhone(patientPhone || '');
        if (!normalizedPhone) {
          console.warn(`No valid international phone for patient ${appointment.patient_name} (${appointment.patient_id}). Raw: ${patientPhone}`);
          continue;
        }

        // Prepare message with variables replaced
        const message = replaceMessageVariables(settings.whatsapp_reminder_message, appointment);

        // Send the message
        console.log('Sending WhatsApp reminder to:', normalizedPhone, 'appointmentId:', appointment.id);
        await sendMessage(normalizedPhone, message);

        // Record the reminder as sent
        await recordReminderSent(appointment.id, appointment.patient_id);

        console.log(`Reminder sent to ${appointment.patient_name} for appointment ${appointment.id}`);
      } catch (appointmentError) {
        console.error(`Error processing reminder for appointment ${appointment.id}:`, appointmentError);
        // Continue with other appointments
      }
    }
  } catch (error) {
    console.error('Error in checkAndSendReminders:', error);
    throw error;
  }
}

async function getSettings(): Promise<Settings | null> {
  try {
    const dbSettings = await dbService.getSettings() as any;
    const hours = dbSettings.whatsapp_reminder_hours_before || 3;
    const minutesRaw = dbSettings.whatsapp_reminder_minutes_before;
    const minutesResolved = (typeof minutesRaw === 'number' && minutesRaw > 0) ? minutesRaw : (hours * 60);
    return {
      whatsapp_reminder_enabled: dbSettings.whatsapp_reminder_enabled || 0,
      whatsapp_reminder_hours_before: hours,
      whatsapp_reminder_minutes_before: minutesResolved,
      whatsapp_reminder_message: dbSettings.whatsapp_reminder_message || 'مرحبًا {{patient_name}}، تذكير بموعدك في عيادة الأسنان بتاريخ {{appointment_date}} الساعة {{appointment_time}}. نشكرك على التزامك.',
      whatsapp_reminder_custom_enabled: dbSettings.whatsapp_reminder_custom_enabled || 0,
    };
  } catch (error) {
    console.error('Error getting settings:', error);
    return null;
  }
}

async function getUpcomingAppointments(minutesBefore: number): Promise<UpcomingAppointment[]> {
  const now = dayjs().tz(APP_TZ);
  const futureTime = now.add(minutesBefore, 'minute').toISOString();

  try {
    // Get appointments from database
    const appointments = await dbService.getAllAppointments();
    console.log(`Loaded ${appointments?.length || 0} appointments for reminder check at`, now.toISOString(), 'TZ:', APP_TZ);

    // Filter for appointments that need reminders
    const upcomingAppointments: UpcomingAppointment[] = [];

    for (const appointment of appointments) {
      if (!appointment.start_time) continue;

      // Normalize appointment times assuming stored as ISO in UTC or local; parse and convert to app TZ
      const appointmentTime = dayjs(appointment.start_time).tz(APP_TZ);
      const reminderTime = appointmentTime.subtract(minutesBefore, 'minute');
      // Debug each candidate times
      // Note: keep logs concise
      // console.log('Appt', appointment.id, 'apptTime', appointmentTime.toISOString(), 'remTime', reminderTime.toISOString());

      // Include when reminder time is reached or passed (>=) and appointment is still in future
      if (!reminderTime.isAfter(now) && appointmentTime.isAfter(now)) {
        upcomingAppointments.push({
          id: appointment.id,
          patient_id: appointment.patient_id,
          start_time: appointment.start_time,
          title: (appointment as any).title || 'موعد',
          patient_name: (appointment as any).patient_name || 'المريض',
          phone: (appointment as any).phone || ''
        });
      }
    }

    return upcomingAppointments;
  } catch (error) {
    console.error('Error getting upcoming appointments:', error);
    return [];
  }
}

async function isReminderAlreadySent(appointmentId: string): Promise<boolean> {
  try {
    // Query whatsapp_reminders table directly
    const stmt = (dbService as any).db.prepare(`
      SELECT id FROM whatsapp_reminders
      WHERE appointment_id = ? AND status = 'sent'
    `);
    const existing = stmt.get(appointmentId);
    return !!existing;
  } catch (error) {
    console.error('Error checking if reminder already sent:', error);
    return false; // If error, assume not sent to avoid duplicate sends
  }
}

async function getPatientPhone(patientId: string): Promise<string | null> {
  try {
    const stmt = (dbService as any).db.prepare(`
      SELECT phone FROM patients WHERE id = ?
    `);
    const patient = stmt.get(patientId);
    return patient?.phone || null;
  } catch (error) {
    console.error('Error getting patient phone:', error);
    return null;
  }
}

function replaceMessageVariables(message: string, appointment: UpcomingAppointment): string {
  try {
    const appointmentDate = dayjs(appointment.start_time).format('YYYY-MM-DD');
    const appointmentTime = dayjs(appointment.start_time).format('HH:mm');

    return message
      .replace(/\{\{patient_name\}\}/g, appointment.patient_name)
      .replace(/\{\{appointment_date\}\}/g, appointmentDate)
      .replace(/\{\{appointment_time\}\}/g, appointmentTime);
  } catch (error) {
    console.error('Error replacing message variables:', error);
    return message; // Return original message if error
  }
}

async function recordReminderSent(appointmentId: string, patientId: string): Promise<void> {
  try {
    const stmt = (dbService as any).db.prepare(`
      INSERT INTO whatsapp_reminders (
        id, appointment_id, patient_id, sent_at, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const id = Date.now().toString();
    const now = new Date().toISOString();

    stmt.run(id, appointmentId, patientId, now, 'sent', now, now);
  } catch (error) {
    console.error('Error recording reminder sent:', error);
    throw error;
  }
}