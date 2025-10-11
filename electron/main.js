const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron')
const { join } = require('path')

// ✅ معالج الأخطاء الشامل
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  console.error('Stack:', error.stack)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
})

// ✅ تسجيل معلومات النظام
console.log('🚀 Starting Dental Clinic Management System')
console.log('📋 System Info:')
console.log('  - Platform:', process.platform)
console.log('  - Architecture:', process.arch)
console.log('  - Node Version:', process.version)
console.log('  - Electron Version:', process.versions.electron)
console.log('  - Chrome Version:', process.versions.chrome)

// Import license manager and predefined licenses
let licenseManager = null
let predefinedLicenses = null
try {
  const { licenseManager: lm } = require('./licenseManager.js')
  licenseManager = lm

  predefinedLicenses = require('./predefinedLicenses.js')
  console.log('✅ License manager loaded successfully')
  console.log('✅ Predefined licenses loaded successfully')
} catch (error) {
  console.error('❌ Failed to load license manager:', error)
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
console.log('🔧 Development Mode:', isDev)

let mainWindow = null
let databaseService = null
let backupService = null
let reportsService = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      // ✅ إعدادات إضافية لحل مشكلة الشاشة البيضاء
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      // ✅ تحسين الأداء
      backgroundThrottling: false,
      // ✅ تعطيل DevTools في الإنتاج
      devTools: isDev,
      // ✅ إعدادات إضافية للتوافق
      spellcheck: false,
      // ✅ تحسين معالجة الصور والموارد
      webgl: true,
      plugins: false,
    },
    titleBarStyle: 'hiddenInset', // شريط عنوان شفاف
    titleBarOverlay: {
      color: 'rgba(255, 255, 255, 0.1)', // شفاف
      symbolColor: '#1e293b',
      height: 40
    },
    show: false,
    title: 'ORalSoft',
    icon: join(__dirname, '../assets/icon.png'),
    // ✅ إعدادات إضافية للنافذة
    backgroundColor: '#ffffff', // لون خلفية أبيض لتجنب الشاشة السوداء
    // ✅ تحسين الأداء
    useContentSize: true,
  })

  // Set CSP headers for security
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://localhost:5173 ws://localhost:5173 https://fonts.googleapis.com https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173; style-src 'self' 'unsafe-inline' http://localhost:5173 https://fonts.googleapis.com; img-src 'self' data: blob: http://localhost:5173 https://api.qrserver.com; font-src 'self' data: http://localhost:5173 https://fonts.gstatic.com;"
            : "default-src 'self' 'unsafe-inline' data: blob: https://fonts.googleapis.com https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://api.qrserver.com; font-src 'self' data: https://fonts.gstatic.com;"
        ]
      }
    })
  })

  // Load the app
  if (isDev) {
    // Wait a bit for Vite server to start
    setTimeout(() => {
      console.log('🔄 Loading development server...')
      mainWindow.loadURL('http://localhost:5173')
      mainWindow.webContents.openDevTools()
    }, 2000)
  } else {
    // ✅ تحسين تحميل الإنتاج مع معالجة شاملة للأخطاء
    const indexPath = join(__dirname, '../dist/index.html')
    console.log('📁 Loading production build from:', indexPath)

    // التحقق من وجود الملف أولاً
    const fs = require('fs')
    if (!fs.existsSync(indexPath)) {
      console.error('❌ index.html not found at:', indexPath)
      console.log('📂 Available files in dist:')
      try {
        const distPath = join(__dirname, '../dist')
        if (fs.existsSync(distPath)) {
          const files = fs.readdirSync(distPath)
          files.forEach(file => console.log('  -', file))
        } else {
          console.error('❌ dist directory not found at:', distPath)
        }
      } catch (err) {
        console.error('❌ Error reading dist directory:', err)
      }
      return
    }

    // تحميل الملف مع معالجة الأخطاء
    mainWindow.loadFile(indexPath)
      .then(() => {
        console.log('✅ Successfully loaded index.html')
      })
      .catch(err => {
        console.error('❌ Failed to load index.html:', err)
        console.log('🔄 Trying alternative loading method...')

        // طريقة بديلة: استخدام file:// URL
        const fileUrl = `file://${indexPath.replace(/\\/g, '/')}`
        console.log('🔄 Trying file URL:', fileUrl)

        mainWindow.loadURL(fileUrl)
          .then(() => {
            console.log('✅ Successfully loaded with file:// URL')
          })
          .catch(urlErr => {
            console.error('❌ Failed to load with file:// URL:', urlErr)
            console.log('🔄 Trying data URL fallback...')

            // طريقة أخيرة: تحميل محتوى HTML مباشرة
            try {
              const htmlContent = fs.readFileSync(indexPath, 'utf8')
              const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
              mainWindow.loadURL(dataUrl)
                .then(() => {
                  console.log('✅ Successfully loaded with data URL')
                })
                .catch(dataErr => {
                  console.error('❌ All loading methods failed:', dataErr)
                })
            } catch (readErr) {
              console.error('❌ Failed to read HTML file:', readErr)
            }
          })
      })
  }

  // ✅ تحسين معالجة عرض النافذة
  mainWindow.once('ready-to-show', () => {
    console.log('✅ Window ready to show')
    mainWindow?.show()

    // Force focus on the window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus()
    }

    // ✅ فتح DevTools في الإنتاج للتشخيص (يمكن إزالته لاحقاً)
  // تم إزالة فتح DevTools في الإنتاج لتحسين الأداء
  })

  // ✅ تعطيل اختصارات DevTools في الإنتاج
  if (!isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // تعطيل F12
      if (input.key === 'F12') {
        event.preventDefault()
      }
      // تعطيل Ctrl+Shift+I
      if (input.control && input.shift && input.key === 'I') {
        event.preventDefault()
      }
      // تعطيل Ctrl+Shift+J
      if (input.control && input.shift && input.key === 'J') {
        event.preventDefault()
      }
      // تعطيل Ctrl+U (عرض المصدر)
      if (input.control && input.key === 'U') {
        event.preventDefault()
      }
    })
  }

  // ✅ تعطيل قائمة السياق (right-click) في الإنتاج
  if (!isDev) {
    mainWindow.webContents.on('context-menu', (event) => {
      event.preventDefault()
    })
  }

  // ✅ معالجة شاملة لفشل التحميل
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ Failed to load page:')
    console.error('  Error Code:', errorCode)
    console.error('  Description:', errorDescription)
    console.error('  URL:', validatedURL)

    if (!isDev) {
      console.log('🔄 Attempting recovery...')
      const indexPath = join(__dirname, '../dist/index.html')

      // محاولة تحميل بديلة
      setTimeout(() => {
        const fileUrl = `file://${indexPath.replace(/\\/g, '/')}`
        console.log('🔄 Recovery attempt with:', fileUrl)
        mainWindow.loadURL(fileUrl)
      }, 1000)
    }
  })

  // ✅ معالجة أخطاء JavaScript
  mainWindow.webContents.on('crashed', (event) => {
    console.error('❌ Renderer process crashed:', event)
  })

  // ✅ معالجة الأخطاء غير المعالجة
  mainWindow.webContents.on('unresponsive', () => {
    console.error('❌ Renderer process became unresponsive')
  })

  // ✅ تسجيل أخطاء وحدة التحكم
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // تسجيل الأخطاء فقط في الإنتاج
    if (isDev || level >= 3) { // تسجيل التحذيرات والأخطاء فقط
      console.log(`🖥️ Console [${level}]:`, message)
      if (line && sourceId) {
        console.log(`   at ${sourceId}:${line}`)
      }
    }
  })

  // ✅ معالجة تحميل DOM
  mainWindow.webContents.on('dom-ready', () => {
    console.log('✅ DOM is ready')

    // التحقق من وجود عنصر root
    mainWindow.webContents.executeJavaScript(`
      const rootElement = document.getElementById('root');
      console.log('Root element found:', !!rootElement);
      if (rootElement) {
        console.log('Root element content:', rootElement.innerHTML.length > 0 ? 'Has content' : 'Empty');
      }

      // التحقق من تحميل React
      console.log('React loaded:', typeof window.React !== 'undefined');
      console.log('ReactDOM loaded:', typeof window.ReactDOM !== 'undefined');

      // التحقق من الأخطاء في وحدة التحكم
      const errors = [];
      const originalError = console.error;
      console.error = function(...args) {
        errors.push(args.join(' '));
        originalError.apply(console, args);
      };

    ({
  hasRoot: !!rootElement,
  hasContent: rootElement ? rootElement.innerHTML.length > 0 : false,
  errors: errors
})
    `).then(result => {
      console.log('🔍 DOM Check Result:', result)
    }).catch(err => {
      console.error('❌ Failed to check DOM:', err)
    })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Clear session only when window is actually closing (not on refresh)
  mainWindow.on('close', (event) => {
    if (mainWindow && mainWindow.webContents && !mainWindow.isDestroyed()) {
      try {
        // Only clear session storage, keep localStorage for theme persistence
        mainWindow.webContents.executeJavaScript(`
          sessionStorage.removeItem('dental_clinic_auth');
        `).catch(() => {
          // Ignore errors if window is already destroyed
        })
      } catch (error) {
        // Ignore errors if window is already destroyed
      }
    }
  })
}

// Enforce single instance to avoid double-open behavior
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, _argv, _workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
  console.log('🚀 Electron app is ready, initializing services...')

  // Create window first for faster UI startup
  createWindow()

  // Initialize WhatsApp client and start reminder scheduler (non-blocking)
  setTimeout(async () => {
    console.log('🔍 DEBUG: Starting WhatsApp initialization timeout...')
  try {
    console.log('🔍 DEBUG: About to require WhatsApp service...')
    const { initializeClient, getWhatsAppStatus, sendMessage, isClientReady } = require('./services/whatsapp')
    const cron = require('node-cron');
    console.log('✅ DEBUG: Node-cron required successfully')

      console.log('📱 Starting WhatsApp initialization in background...')
    console.log('🔍 DEBUG: About to call initializeClient()...')
    await initializeClient()
    console.log('✅ DEBUG: initializeClient() completed successfully')

    // Wait for WhatsApp client to be ready before starting reminder scheduler
    console.log('🔍 DEBUG: Waiting for WhatsApp client to be ready...')
    let attempts = 0
    const maxAttempts = 30 // Wait up to 30 seconds

    while (attempts < maxAttempts) {
      const status = getWhatsAppStatus()
      const isReady = isClientReady()

      if (isReady) {
        break
      }

      if (attempts === 0) {
        console.log('📱 WhatsApp client is initializing... Please scan the QR code when it appears.')
      }

      attempts++
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
    }

    if (attempts >= maxAttempts) {
      console.log('📱 Reminder scheduler will start but WhatsApp may not be ready yet')
    }

    // Inlined logic from whatsappReminderScheduler.ts
    let cronJob = null;
    const APP_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    // Helper functions (inlined)
    const getSettings = async () => {
      try {
        // Check if database service is available
        if (!databaseService || !databaseService.db) {
          console.warn('⚠️ Database service not available for settings')
          return null
        }
        
        const settings = await databaseService.getSettings();
        const hours = settings.whatsapp_reminder_hours_before || 3;
        const minutesRaw = settings.whatsapp_reminder_minutes_before;
        const minutesResolved = (typeof minutesRaw === 'number' && minutesRaw > 0) ? minutesRaw : (hours * 60);
        return {
          whatsapp_reminder_enabled: settings.whatsapp_reminder_enabled || 0,
          whatsapp_reminder_hours_before: hours,
          whatsapp_reminder_minutes_before: minutesResolved,
          whatsapp_reminder_message: settings.whatsapp_reminder_message || '',
          whatsapp_reminder_custom_enabled: settings.whatsapp_reminder_custom_enabled || 0,
        };
      } catch (error) {
        console.error('Error getting settings (inlined from scheduler):', error);
        return null;
      }
    };

    const getUpcomingAppointments = async (minutesBefore) => {
      const now = dayjs().tz(APP_TZ);
      try {
        const appointments = await databaseService.getAllAppointments();
        // console.log(`Loaded ${appointments?.length || 0} appointments for reminder check at`, now.toISOString(), 'TZ:', APP_TZ);

        const upcomingAppointments = [];
        for (const appointment of appointments) {
          if (!appointment.start_time) continue;

          const appointmentTime = dayjs(appointment.start_time).tz(APP_TZ);
          const reminderTime = appointmentTime.subtract(minutesBefore, 'minute');

          if (!reminderTime.isAfter(now) && appointmentTime.isAfter(now)) {
            upcomingAppointments.push({
              id: appointment.id,
              patient_id: appointment.patient_id,
              start_time: appointment.start_time,
              title: (appointment).title || 'موعد',
              patient_name: (appointment).patient_name || 'المريض',
              phone: (appointment).phone || ''
            });
          }
        }
        return upcomingAppointments;
      } catch (error) {
        console.error('Error getting upcoming appointments (inlined from scheduler):', error);
        return [];
      }
    };

    const isReminderAlreadySent = async (appointmentId) => {
      try {
        if (!databaseService || !databaseService.db) {
          console.warn('⚠️ Database service not available for reminder check')
          return false
        }
        
        const stmt = databaseService.db.prepare(`
          SELECT id FROM whatsapp_reminders
          WHERE appointment_id = ? AND status = 'sent'
        `);
        const existing = stmt.get(appointmentId);
        return !!existing;
      } catch (error) {
        console.error('Error checking if reminder already sent (inlined from scheduler):', error);
        return false;
      }
    };

    const getPatientPhone = async (patientId) => {
      try {
        if (!databaseService || !databaseService.db) {
          console.warn('⚠️ Database service not available for patient phone lookup')
          return null
        }
        
        const stmt = databaseService.db.prepare(`
          SELECT phone FROM patients WHERE id = ?
        `);
        const patient = stmt.get(patientId);
        return patient?.phone || null;
      } catch (error) {
        console.error('Error getting patient phone (inlined from scheduler):', error);
        return null;
      }
    };

    const normalizePhone = (raw) => {
      if (!raw) return null;
      let digits = String(raw).replace(/[^0-9]/g, '');
      if (!digits) return null;
      if (digits.startsWith('00')) digits = digits.slice(2);
      if (digits.length === 10 && digits.startsWith('09')) {
        digits = '963' + digits.slice(1);
      }
      if (digits.length === 9 && digits.startsWith('9')) {
        digits = '963' + digits;
      }
      return digits;
    };

    const replaceMessageVariables = (message, appointment) => {
      try {
        const appointmentDate = dayjs(appointment.start_time).format('YYYY-MM-DD');
        const appointmentTime = dayjs(appointment.start_time).format('HH:mm');
        return message
          .replace(/\{\{patient_name\}\}/g, appointment.patient_name)
          .replace(/\{\{appointment_date\}\}/g, appointmentDate)
          .replace(/\{\{appointment_time\}\}/g, appointmentTime);
      } catch (error) {
        console.error('Error replacing message variables (inlined from scheduler):', error);
        return message;
      }
    };

    const recordReminderSent = async (appointmentId, patientId) => {
      try {
        if (!databaseService || !databaseService.db) {
          console.warn('⚠️ Database service not available for recording reminder')
          return
        }
        
        const stmt = databaseService.db.prepare(`
          INSERT INTO whatsapp_reminders (
            id, appointment_id, patient_id, sent_at, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const id = Date.now().toString();
        const now = new Date().toISOString();
        stmt.run(id, appointmentId, patientId, now, 'sent', now, now);
      } catch (error) {
        console.error('Error recording reminder sent (inlined from scheduler):', error);
        throw error;
      }
    };

    const checkAndSendReminders = async () => {
      try {
        // Check if database service is available before proceeding
        if (!databaseService || !databaseService.db) {
          console.warn('⚠️ Database service not available, skipping reminder check')
          return
        }
        
        // These schema checks should only run once on application startup, not every minute.
        // They have been moved to the app.whenReady() block.
        const settings = await getSettings();
        if (!settings || settings.whatsapp_reminder_enabled !== 1) {
          return;
        }

        const upcomingAppointments = await getUpcomingAppointments(settings.whatsapp_reminder_minutes_before);
        console.log('Eligible appointments count (inlined from scheduler):', upcomingAppointments.length, 'minutesBefore:', settings.whatsapp_reminder_minutes_before);

        for (const appointment of upcomingAppointments) {
          try {
            const alreadySent = await isReminderAlreadySent(appointment.id);
            if (alreadySent) {
              console.log(`Reminder for appointment ${appointment.id} already sent. Skipping.`);
              continue;
            }

            const patientPhone = await getPatientPhone(appointment.patient_id);
            console.log(`Raw patient phone for ${appointment.patient_id}: ${patientPhone}`);

            const normalizedPhone = normalizePhone(patientPhone || '');
            console.log(`Normalized patient phone for ${appointment.patient_id}: ${normalizedPhone}`);

            if (!normalizedPhone) {
              console.warn(`No valid international phone for patient ${appointment.patient_name} (${appointment.patient_id}). Raw: ${patientPhone}`);
              continue;
            }

            // Define a default message if custom messages are not allowed
            const defaultMessage = `مرحباً بك يا {{patient_name}}! نود تذكيرك بموعدك في عيادة الأسنان بتاريخ {{appointment_date}} الساعة {{appointment_time}}. نتطلع لرؤيتك!`;

            const message = settings.whatsapp_reminder_custom_enabled === 1
              ? replaceMessageVariables(settings.whatsapp_reminder_message, appointment)
              : replaceMessageVariables(defaultMessage, appointment);

            console.log(`Generated message for ${appointment.id}: ${message.substring(0, 50)}...`);

            console.log('Sending WhatsApp reminder to (inlined from scheduler):', normalizedPhone, 'appointmentId:', appointment.id);
            await sendMessage(normalizedPhone, message);
            await recordReminderSent(appointment.id, appointment.patient_id);
            console.log(`Reminder sent to ${appointment.patient_name} for appointment ${appointment.id} (inlined from scheduler)`);
          } catch (appointmentError) {
            console.error(`Error processing reminder for appointment ${appointment.id} (inlined from scheduler):`, appointmentError);
          }
        }
      } catch (error) {
        console.error('Error in checkAndSendReminders (inlined from scheduler):', error);
        throw error;
      }
    };

    // Start the cron job that runs every minute
    cronJob = cron.schedule('* * * * *', async () => {
      try {
        console.log('⏰ Reminder scheduler running (inlined cron job)');
        await checkAndSendReminders();
        console.log('✅ Reminder scheduler completed successfully');
      } catch (error) {
        console.error('❌ Error in reminder scheduler (inlined cron job):', error);

        // Enhanced error handling for cron job
        if (error.message && error.message.includes('Maximum initialization attempts reached')) {
          console.error('🚨 WhatsApp service critical failure - stopping cron job temporarily');

          // Stop the cron job temporarily and attempt to reinitialize
          if (cronJob) {
            cronJob.stop();
            console.log('⏸️ Cron job stopped due to critical WhatsApp failure');

            // Attempt to reinitialize after a delay
            setTimeout(async () => {
              try {
                console.log('🔄 Attempting to reinitialize WhatsApp and restart scheduler...');
                const { initializeClient } = require('./services/whatsapp');
                await initializeClient();

                // Restart the cron job
                cronJob.start();
                console.log('✅ Scheduler restarted after reinitialization');
              } catch (reinitError) {
                console.error('❌ Failed to reinitialize and restart scheduler:', reinitError);

                // Restart cron job anyway to try again later
                cronJob.start();
                console.log('⚠️ Scheduler restarted but WhatsApp may still have issues');
              }
            }, 10000); // Wait 10 seconds before attempting reinitialization
          }
        } else {
          console.log('🔄 Continuing scheduler despite error');
        }
      }
    });

    console.log('✅ WhatsApp client initialized and reminder scheduler started (inlined)');
  } catch (e) {
    console.error('❌ Failed to initialize WhatsApp services (inlined):', e);
  }
  }, 2000) // تأخير 2 ثانية لضمان تحميل التطبيق أولاً

  // --- Moved schema checks to run once on startup ---
  try {
    // Check if database service is available before schema checks
    if (databaseService && databaseService.db) {
    const cols = databaseService.db.prepare('PRAGMA table_info(settings)').all();
    const hasMinutes = cols && cols.some(c => c.name === 'whatsapp_reminder_minutes_before');
    if (!hasMinutes) {
      databaseService.db.prepare('ALTER TABLE settings ADD COLUMN whatsapp_reminder_minutes_before INTEGER DEFAULT 0').run();
        console.log('✅ Added whatsapp_reminder_minutes_before column');
    }
    const hasCustomEnabled = cols && cols.some(c => c.name === 'whatsapp_reminder_custom_enabled');
    if (!hasCustomEnabled) {
      databaseService.db.prepare('ALTER TABLE settings ADD COLUMN whatsapp_reminder_custom_enabled INTEGER DEFAULT 0').run();
        console.log('✅ Added whatsapp_reminder_custom_enabled column');
    }
    console.log('✅ WhatsApp reminder settings table schema checked and updated if necessary.');
    } else {
      console.warn('⚠️ Database service not available for schema checks');
    }
  } catch (e) {
    console.error('Error ensuring minutes/custom_enabled columns for scheduler on startup:', e);
  }
  // --- End of moved schema checks ---

  // Optional: log WhatsApp status shortly after startup with enhanced diagnostics
  setTimeout(() => {
    try {
      const { getWhatsAppStatus, getWhatsAppDiagnosticInfo } = require('./services/whatsapp');
      const status = getWhatsAppStatus ? getWhatsAppStatus() : { isReady: false };
      const diagnostic = getWhatsAppDiagnosticInfo ? getWhatsAppDiagnosticInfo() : {};

      console.log('ℹ️ WhatsApp status after init (inlined):', status);
      console.log('🔍 WhatsApp diagnostic info:', {
        socketExists: diagnostic.socketExists,
        socketType: diagnostic.socketType,
        hasSendMessage: diagnostic.hasSendMessageMethod,
        initializationAttempts: diagnostic.initializationAttempts,
        sessionPath: diagnostic.sessionPath
      });
    } catch (error) {
      console.warn('⚠️ Could not get WhatsApp diagnostic info:', error.message);
    }
  }, 3000)

  // Hide default menu bar
  Menu.setApplicationMenu(null)

  // Initialize dayjs and its plugins globally within app.whenReady
  const dayjs = require('dayjs');
  const utc = require('dayjs/plugin/utc');
  const timezone = require('dayjs/plugin/timezone');
  dayjs.extend(utc);
  dayjs.extend(timezone);
  const APP_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // Initialize database service with migration support
  try {
    const { DatabaseService } = require('../src/services/databaseService.js')
    const { DataMigrationService } = require('../src/services/dataMigrationService.js')

    // Check if migration is needed
    const migrationService = new DataMigrationService()
    const migrationStatus = await migrationService.getMigrationStatus()

    console.log('Migration status:', migrationStatus)

    if (migrationStatus.migrationNeeded) {
      console.log('🔄 Starting data migration from LowDB to SQLite...')
      const migrationResult = await migrationService.migrateData()

      if (migrationResult.success) {
        console.log('✅ Migration completed successfully:', migrationResult.stats)
      } else {
        console.error('❌ Migration failed:', migrationResult.message)
        throw new Error(`Migration failed: ${migrationResult.message}`)
      }
    } else {
      console.log('✅ No migration needed, using existing SQLite database')
    }

    // Initialize SQLite database service
    const dbPath = require('path').join(app.getPath('userData'), 'dental_clinic.db')
    console.log('🗄️ Database will be created at:', dbPath)

    // Ensure userData directory exists
    const userDataPath = app.getPath('userData')
    if (!require('fs').existsSync(userDataPath)) {
      require('fs').mkdirSync(userDataPath, { recursive: true })
      console.log('✅ Created userData directory:', userDataPath)
    }

    // Clear require cache to ensure we get the latest version
    delete require.cache[require.resolve('../src/services/databaseService.js')]
    const { DatabaseService: FreshDatabaseService } = require('../src/services/databaseService.js')

    databaseService = new FreshDatabaseService(dbPath)

    // Verify database is working
    try {
      const testQuery = databaseService.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
      const result = testQuery.get()
      console.log('✅ Database verification passed - Tables count:', result.count)
    } catch (verifyError) {
      console.error('❌ Database verification failed:', verifyError)
      throw verifyError
    }

    console.log('✅ SQLite database service initialized successfully')

    // Initialize backup service
    try {
      const { BackupService } = require('../src/services/backupService.js')
      backupService = new BackupService(databaseService)
      console.log('✅ Backup service initialized successfully')
    } catch (backupError) {
      console.error('❌ Failed to initialize backup service:', backupError)
      console.error('Backup error details:', backupError.stack)
      backupService = null
    }

    // Initialize reports service
    try {
      const { ReportsService } = require('../src/services/reportsService.js')
      reportsService = new ReportsService()
      console.log('✅ Reports service initialized successfully')
    } catch (reportsError) {
      console.error('❌ Failed to initialize reports service:', reportsError)
      reportsService = null
    }

    // Clean up migration service
    migrationService.close()

  } catch (error) {
    console.error('❌ Failed to initialize services:', error)
    console.error('Error details:', error.stack)

    // Try to initialize just the SQLite database service without migration
    try {
      console.log('🔄 Attempting direct SQLite initialization...')

      // Clear require cache to ensure we get the latest version
      delete require.cache[require.resolve('../src/services/databaseService.js')]
      const { DatabaseService } = require('../src/services/databaseService.js')

      const dbPath = require('path').join(app.getPath('userData'), 'dental_clinic.db')
      databaseService = new DatabaseService(dbPath)
      console.log('✅ SQLite database service initialized successfully (direct)')

      // Dialog handlers will be registered after all services are initialized

      // Try to initialize backup service
      try {
        const { BackupService } = require('../src/services/backupService.js')
        backupService = new BackupService(databaseService)
        console.log('✅ Backup service initialized successfully')
      } catch (backupError) {
        console.error('❌ Failed to initialize backup service:', backupError)
        backupService = null
      }

      // Try to initialize reports service again after database is ready
      try {
        const { ReportsService } = require('../src/services/reportsService.js')
        reportsService = new ReportsService()
        console.log('✅ Reports service initialized successfully (fallback)')
      } catch (reportsError) {
        console.error('❌ Failed to initialize reports service (fallback):', reportsError)
        reportsService = null
      }

    } catch (directError) {
      console.error('❌ Direct SQLite initialization also failed:', directError)
      console.error('Falling back to mock mode')
      // Fallback to mock mode
      databaseService = null
      backupService = null
      reportsService = null
    }
  }

  // تحديث العنوان والأيقونة بعد تحميل التطبيق
  setTimeout(async () => {
    try {
      if (mainWindow && databaseService) {
        const settings = await databaseService.getSettings()
        if (settings) {
          let windowTitle = 'نظام إدارة العيادة السنية'

          if (settings.doctor_name && settings.clinic_name) {
            windowTitle = `د. ${settings.doctor_name} | ${settings.clinic_name}`
          } else if (settings.doctor_name) {
            windowTitle = `د. ${settings.doctor_name} | نظام إدارة العيادة السنية`
          } else if (settings.clinic_name) {
            windowTitle = `${settings.clinic_name} | نظام إدارة العيادة السنية`
          }

          mainWindow.setTitle(windowTitle)

          // تحديث أيقونة النافذة إذا كان هناك شعار مخصص
          if (settings.clinic_logo && settings.clinic_logo.trim() !== '') {
            try {
              const logoData = settings.clinic_logo
              console.log('🔍 محاولة تحديث الأيقونة:', logoData.substring(0, 50) + '...')

              // التحقق من نوع البيانات
              if (logoData.startsWith('data:image/')) {
                // إذا كانت البيانات base64 data URL
                const { nativeImage } = require('electron')
                const image = nativeImage.createFromDataURL(logoData)
                if (!image.isEmpty()) {
                  mainWindow.setIcon(image)
                  mainWindow['__currentLogo__'] = settings.clinic_logo // Store the current logo
                  console.log('✅ تم تحديث أيقونة النافذة بنجاح من base64')
                } else {
                  console.log('❌ فشل في إنشاء الصورة من base64')
                }
              } else {
                // إذا كانت مسار ملف
                const fs = require('fs')
                const path = require('path')
                const absolutePath = path.isAbsolute(logoData) ? logoData : path.resolve(logoData)

                if (fs.existsSync(absolutePath)) {
                  mainWindow.setIcon(absolutePath)
                  mainWindow['__currentLogo__'] = settings.clinic_logo // Store the current logo
                  console.log('✅ تم تحديث أيقونة النافذة بنجاح من ملف:', absolutePath)
                } else {
                  console.log('❌ الملف غير موجود:', absolutePath)
                }
              }
            } catch (error) {
              console.log('⚠️ فشل في تحديث أيقونة النافذة:', error.message)
            }
          } else if (mainWindow['__currentLogo__'] !== '') {
            // Clear the icon if no logo is provided and a logo was previously set
            mainWindow.setIcon(null);
            mainWindow['__currentLogo__'] = '';
            console.log('✅ تم مسح أيقونة النافذة بنجاح');
          }
        }
      }
    } catch (error) {
      console.log('⚠️ فشل في تحديث العنوان والأيقونة عند البدء:', error.message)
    }
  }, 3000) // انتظار 3 ثوان لضمان تحميل قاعدة البيانات

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Clear authentication session when app is about to quit
app.on('before-quit', () => {
  console.log('🔐 Clearing authentication session before app quit')
  if (mainWindow && mainWindow.webContents && !mainWindow.isDestroyed()) {
    try {
      // Only clear session storage, keep localStorage for theme and other preferences
      mainWindow.webContents.executeJavaScript(`
        sessionStorage.removeItem('dental_clinic_auth');
        console.log('🔐 Authentication session cleared');
      `).catch(() => {
        console.log('Could not clear session (window already destroyed)')
      })
    } catch (error) {
      console.log('Could not clear session (window already destroyed)')
    }
  }

  // Dialog handlers will be registered outside app.whenReady()
})

// Dialog handlers - registered after app.whenReady()
console.log('🔧 Registering dialog:selectDirectory handler...')
ipcMain.handle('dialog:selectDirectory', async (_, options) => {
  try {
    console.log('🔍 dialog:selectDirectory called with options:', options)
    if (!mainWindow) {
      throw new Error('Main window not available')
    }
    
    const result = await dialog.showOpenDialog(mainWindow, {
      ...options,
      properties: ['openDirectory', 'createDirectory']
    })
    console.log('🔍 dialog:selectDirectory result:', result)
    return result
  } catch (error) {
    console.error('Error in dialog:selectDirectory:', error)
    return { canceled: true, error: error.message }
  }
})
console.log('✅ dialog:selectDirectory handler registered')

console.log('🔧 Registering dialog:selectFile handler...')
ipcMain.handle('dialog:selectFile', async (_, options) => {
  try {
    console.log('🔍 dialog:selectFile called with options:', options)
    if (!mainWindow) {
      throw new Error('Main window not available')
    }
    
    const result = await dialog.showOpenDialog(mainWindow, {
      ...options,
      properties: ['openFile']
    })
    console.log('🔍 dialog:selectFile result:', result)
    return result
  } catch (error) {
    console.error('Error in dialog:selectFile:', error)
    return { canceled: true, error: error.message }
  }
})
console.log('✅ dialog:selectFile handler registered')

console.log('✅ Dialog handlers registered successfully')

// Test handler to verify IPC is working
ipcMain.handle('test:ping', async () => {
  console.log('🔍 test:ping called')
  return { success: true, message: 'IPC is working' }
})

// List all registered handlers for debugging
console.log('📋 Registered IPC handlers:')
const registeredHandlers = []
ipcMain.eventNames().forEach(eventName => {
  if (typeof eventName === 'string' && eventName.includes('dialog')) {
    registeredHandlers.push(eventName)
  }
})
console.log('Dialog handlers:', registeredHandlers)

// Patient IPC Handlers
ipcMain.handle('db:patients:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllPatients()
    } else {
      // Fallback mock data
      return [
        {
          id: '1',
          first_name: 'أحمد',
          last_name: 'محمد',
          phone: '0501234567',
          email: 'ahmed@example.com',
          date_of_birth: '1990-05-15',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          first_name: 'فاطمة',
          last_name: 'علي',
          phone: '0507654321',
          email: 'fatima@example.com',
          date_of_birth: '1985-08-22',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    }
  } catch (error) {
    console.error('Error getting patients:', error)
    throw error
  }
})

ipcMain.handle('db:patients:getById', async (_, id) => {
  try {
    if (databaseService) {
      return await databaseService.getPatientById(id)
    } else {
      // Fallback mock data
      const mockPatients = [
        {
          id: '1',
          first_name: 'أحمد',
          last_name: 'محمد',
          phone: '0501234567',
          email: 'ahmed@example.com',
          date_of_birth: '1990-05-15',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          first_name: 'فاطمة',
          last_name: 'علي',
          phone: '0507654321',
          email: 'fatima@example.com',
          date_of_birth: '1985-08-22',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
      return mockPatients.find(p => p.id === id) || null
    }
  } catch (error) {
    console.error('Error getting patient by ID:', error)
    throw error
  }
})

ipcMain.handle('db:patients:create', async (_, patient) => {
  try {
    if (databaseService) {
      console.log('📝 Creating patient with SQLite:', patient.serial_number, patient.full_name)
      const newPatient = await databaseService.createPatient(patient)
      console.log('✅ Patient created successfully:', newPatient.id)
      return newPatient
    } else {
      // Fallback mock
      console.log('⚠️ WARNING: Database service not available, using mock mode')
      console.log('📝 Creating patient (mock):', patient.serial_number, patient.full_name)
      const newPatient = {
        ...patient,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      console.log('✅ Patient created (mock):', newPatient.id)
      return newPatient
    }
  } catch (error) {
    console.error('❌ Error creating patient:', error)
    throw error
  }
})

ipcMain.handle('db:patients:update', async (_, id, patient) => {
  try {
    if (databaseService) {
      const updatedPatient = await databaseService.updatePatient(id, patient)
      console.log('Updating patient:', updatedPatient)
      return updatedPatient
    } else {
      // Fallback mock
      const updatedPatient = {
        ...patient,
        id,
        updated_at: new Date().toISOString()
      }
      console.log('Updating patient (mock):', updatedPatient)
      return updatedPatient
    }
  } catch (error) {
    console.error('Error updating patient:', error)
    throw error
  }
})

ipcMain.handle('db:patients:delete', async (_, id) => {
  try {
    if (databaseService) {
      const success = await databaseService.deletePatient(id)
      console.log('Deleting patient:', id, 'Success:', success)
      return success
    } else {
      // Fallback mock
      console.log('Deleting patient (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting patient:', error)
    throw error
  }
})

ipcMain.handle('db:patients:search', async (_, query) => {
  try {
    if (databaseService) {
      const results = await databaseService.searchPatients(query)
      console.log('Searching patients:', query, 'Results:', results.length)
      return results
    } else {
      // Fallback mock
      console.log('Searching patients (mock):', query)
      return []
    }
  } catch (error) {
    console.error('Error searching patients:', error)
    throw error
  }
})

// Appointment IPC Handlers
ipcMain.handle('db:appointments:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllAppointments()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting appointments:', error)
    throw error
  }
})

ipcMain.handle('db:appointments:create', async (_, appointment) => {
  try {
    if (databaseService) {
      const newAppointment = await databaseService.createAppointment(appointment)
      console.log('Creating appointment:', newAppointment)
      return newAppointment
    } else {
      const newAppointment = { ...appointment, id: Date.now().toString() }
      console.log('Creating appointment (mock):', newAppointment)
      return newAppointment
    }
  } catch (error) {
    console.error('Error creating appointment:', error)
    throw error
  }
})

ipcMain.handle('db:appointments:update', async (_, id, appointment) => {
  try {
    if (databaseService) {
      const updatedAppointment = await databaseService.updateAppointment(id, appointment)
      console.log('Updating appointment:', updatedAppointment)
      return updatedAppointment
    } else {
      const updatedAppointment = { ...appointment, id }
      console.log('Updating appointment (mock):', updatedAppointment)
      return updatedAppointment
    }
  } catch (error) {
    console.error('Error updating appointment:', error)
    throw error
  }
})

ipcMain.handle('db:appointments:delete', async (_, id) => {
  try {
    if (databaseService) {
      const success = await databaseService.deleteAppointment(id)
      console.log('Deleting appointment:', id, 'Success:', success)
      return success
    } else {
      console.log('Deleting appointment (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting appointment:', error)
    throw error
  }
})

ipcMain.handle('db:appointments:getByPatient', async (_, patientId) => {
  try {
    if (databaseService) {
      return await databaseService.getAppointmentsByPatient(patientId)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting appointments by patient:', error)
    throw error
  }
})

ipcMain.handle('db:appointments:checkConflict', async (_, startTime, endTime, excludeId) => {
  try {
    if (databaseService) {
      console.log('Checking appointment conflict:', { startTime, endTime, excludeId })
      const result = await databaseService.checkAppointmentConflict(startTime, endTime, excludeId)
      console.log('Conflict check result:', result)
      return result
    } else {
      console.log('Checking appointment conflict (mock):', { startTime, endTime, excludeId })
      return false
    }
  } catch (error) {
    console.error('Error checking appointment conflict:', error)
    throw error
  }
})

// Payment IPC Handlers
ipcMain.handle('db:payments:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllPayments()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting payments:', error)
    throw error
  }
})

// Add migration handler for tooth_treatment_id column
ipcMain.handle('db:migrate:ensureToothTreatmentId', async () => {
  try {
    if (databaseService) {
      return await databaseService.ensureToothTreatmentIdColumn()
    } else {
      return false
    }
  } catch (error) {
    console.error('Error ensuring tooth_treatment_id column:', error)
    throw error
  }
})

ipcMain.handle('db:payments:create', async (_, payment) => {
  try {
    if (databaseService) {
      const newPayment = await databaseService.createPayment(payment)
      console.log('Creating payment:', newPayment)
      return newPayment
    } else {
      const newPayment = { ...payment, id: Date.now().toString() }
      console.log('Creating payment (mock):', newPayment)
      return newPayment
    }
  } catch (error) {
    console.error('Error creating payment:', error)
    throw error
  }
})

ipcMain.handle('db:payments:update', async (_, id, payment) => {
  try {
    if (databaseService) {
      const updatedPayment = await databaseService.updatePayment(id, payment)
      console.log('Updating payment:', updatedPayment)
      return updatedPayment
    } else {
      const updatedPayment = { ...payment, id }
      console.log('Updating payment (mock):', updatedPayment)
      return updatedPayment
    }
  } catch (error) {
    console.error('Error updating payment:', error)
    throw error
  }
})

ipcMain.handle('db:payments:delete', async (_, id) => {
  try {
    if (databaseService) {
      const success = await databaseService.deletePayment(id)
      console.log('Deleting payment:', id, 'Success:', success)
      return success
    } else {
      console.log('Deleting payment (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting payment:', error)
    throw error
  }
})

ipcMain.handle('db:payments:search', async (_, query) => {
  try {
    if (databaseService) {
      const results = await databaseService.searchPayments(query)
      console.log('Searching payments:', query, 'Results:', results.length)
      return results
    } else {
      console.log('Searching payments (mock):', query)
      return []
    }
  } catch (error) {
    console.error('Error searching payments:', error)
    throw error
  }
})

ipcMain.handle('db:payments:getByPatient', async (_, patientId) => {
  try {
    if (databaseService) {
      return await databaseService.getPaymentsByPatient(patientId)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting payments by patient:', error)
    throw error
  }
})

ipcMain.handle('db:payments:getByToothTreatment', async (_, toothTreatmentId) => {
  try {
    if (databaseService) {
      const results = await databaseService.getPaymentsByToothTreatment(toothTreatmentId)
      console.log('Getting payments by tooth treatment:', toothTreatmentId, 'Results:', results.length)
      return results
    } else {
      console.log('Getting payments by tooth treatment (mock):', toothTreatmentId)
      return []
    }
  } catch (error) {
    console.error('Error getting payments by tooth treatment:', error)
    throw error
  }
})

ipcMain.handle('db:payments:getToothTreatmentSummary', async (_, toothTreatmentId) => {
  try {
    if (databaseService) {
      const summary = await databaseService.getToothTreatmentPaymentSummary(toothTreatmentId)
      console.log('Getting tooth treatment payment summary:', toothTreatmentId)
      return summary
    } else {
      console.log('Getting tooth treatment payment summary (mock):', toothTreatmentId)
      return {
        treatmentCost: 0,
        totalPaid: 0,
        remainingBalance: 0,
        paymentCount: 0,
        status: 'pending',
        payments: []
      }
    }
  } catch (error) {
    console.error('Error getting tooth treatment payment summary:', error)
    throw error
  }
})

// Treatment IPC Handlers
ipcMain.handle('db:treatments:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllTreatments()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting treatments:', error)
    throw error
  }
})

ipcMain.handle('db:treatments:create', async (_, treatment) => {
  try {
    if (databaseService) {
      return await databaseService.createTreatment(treatment)
    } else {
      const newTreatment = { ...treatment, id: Date.now().toString() }
      console.log('Creating treatment (mock):', newTreatment)
      return newTreatment
    }
  } catch (error) {
    console.error('Error creating treatment:', error)
    throw error
  }
})

// Inventory IPC Handlers
ipcMain.handle('db:inventory:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllInventoryItems()
    } else {
      // Fallback mock data with test cases for alerts
      const today = new Date()
      const expiredDate = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      const expiringSoonDate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000) // 15 days from now

      return [
        {
          id: '1',
          name: 'قفازات طبية',
          description: 'قفازات طبية مطاطية',
          category: 'مواد استهلاكية',
          quantity: 100,
          unit: 'قطعة',
          cost_per_unit: 0.5,
          supplier: 'شركة المعدات الطبية',
          minimum_stock: 20,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'أقنعة طبية',
          description: 'أقنعة طبية للوقاية',
          category: 'مواد استهلاكية',
          quantity: 15, // Low stock (below minimum_stock of 30)
          unit: 'قطعة',
          cost_per_unit: 0.3,
          supplier: 'شركة المعدات الطبية',
          minimum_stock: 30,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'مخدر موضعي',
          description: 'مخدر موضعي للأسنان',
          category: 'أدوية',
          quantity: 5,
          unit: 'أنبوب',
          cost_per_unit: 25.0,
          supplier: 'شركة الأدوية المتقدمة',
          minimum_stock: 10, // Low stock
          expiry_date: expiredDate.toISOString().split('T')[0], // Expired
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '4',
          name: 'مطهر فموي',
          description: 'مطهر للفم والأسنان',
          category: 'مواد تطهير',
          quantity: 8,
          unit: 'زجاجة',
          cost_per_unit: 15.0,
          supplier: 'شركة المنتجات الطبية',
          minimum_stock: 5,
          expiry_date: expiringSoonDate.toISOString().split('T')[0], // Expiring soon
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '5',
          name: 'خيوط جراحية',
          description: 'خيوط جراحية للأسنان',
          category: 'أدوات جراحية',
          quantity: 0, // Out of stock
          unit: 'علبة',
          cost_per_unit: 45.0,
          supplier: 'شركة الأدوات الجراحية',
          minimum_stock: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    }
  } catch (error) {
    console.error('Error getting inventory items:', error)
    throw error
  }
})

ipcMain.handle('db:inventory:create', async (_, itemData) => {
  try {
    if (databaseService) {
      return await databaseService.createInventoryItem(itemData)
    } else {
      // Fallback mock
      const newItem = {
        ...itemData,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      console.log('Creating inventory item (mock):', newItem)
      return newItem
    }
  } catch (error) {
    console.error('Error creating inventory item:', error)
    throw error
  }
})

ipcMain.handle('db:inventory:update', async (_, id, updates) => {
  try {
    if (databaseService) {
      return await databaseService.updateInventoryItem(id, updates)
    } else {
      // Fallback mock
      const updatedItem = {
        ...updates,
        id,
        updated_at: new Date().toISOString()
      }
      console.log('Updating inventory item (mock):', updatedItem)
      return updatedItem
    }
  } catch (error) {
    console.error('Error updating inventory item:', error)
    throw error
  }
})

ipcMain.handle('db:inventory:delete', async (_, id) => {
  try {
    if (databaseService) {
      return await databaseService.deleteInventoryItem(id)
    } else {
      // Fallback mock
      console.log('Deleting inventory item (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting inventory item:', error)
    throw error
  }
})

ipcMain.handle('db:inventory:search', async (_, query) => {
  try {
    if (databaseService) {
      return await databaseService.searchInventoryItems(query)
    } else {
      // Fallback mock
      console.log('Searching inventory items (mock):', query)
      return []
    }
  } catch (error) {
    console.error('Error searching inventory items:', error)
    throw error
  }
})

// Inventory Usage IPC Handlers
ipcMain.handle('db:inventoryUsage:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllInventoryUsage()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting inventory usage:', error)
    throw error
  }
})

ipcMain.handle('db:inventoryUsage:create', async (_, usageData) => {
  try {
    if (databaseService) {
      return await databaseService.createInventoryUsage(usageData)
    } else {
      // Fallback mock
      const newUsage = {
        ...usageData,
        id: Date.now().toString(),
        usage_date: usageData.usage_date || new Date().toISOString()
      }
      console.log('Creating inventory usage (mock):', newUsage)
      return newUsage
    }
  } catch (error) {
    console.error('Error creating inventory usage:', error)
    throw error
  }
})

ipcMain.handle('db:inventoryUsage:getByItem', async (_, itemId) => {
  try {
    if (databaseService) {
      return await databaseService.getInventoryUsageByItem(itemId)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting inventory usage by item:', error)
    throw error
  }
})

ipcMain.handle('db:inventoryUsage:getByAppointment', async (_, appointmentId) => {
  try {
    if (databaseService) {
      return await databaseService.getInventoryUsageByAppointment(appointmentId)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting inventory usage by appointment:', error)
    throw error
  }
})

// Database maintenance IPC Handlers
ipcMain.handle('db:forceCheckpoint', async () => {
  try {
    if (databaseService) {
      console.log('🔧 Manual WAL checkpoint requested')
      const result = databaseService.forceCheckpoint()
      console.log('✅ Manual checkpoint completed:', result)
      return result
    } else {
      console.log('❌ Database service not available for checkpoint')
      return null
    }
  } catch (error) {
    console.error('❌ Error forcing checkpoint:', error)
    throw error
  }
})

ipcMain.handle('backup:create', async (_, customPath, includeImages) => {
  try {
    if (backupService) {
      let filePath = customPath

      if (!filePath) {
        // Ask user where to save the backup
        const timestamp = new Date().toISOString().split('T')[0]
        const extension = includeImages ? 'zip' : 'db'
        const defaultName = `نسخة-احتياطية-عيادة-الاسنان-${timestamp}.${extension}`

        const filters = includeImages ? [
          { name: 'نسخ احتياطية مع صور', extensions: ['zip'] },
          { name: 'ملفات قاعدة البيانات', extensions: ['db', 'sqlite'] },
          { name: 'جميع الملفات', extensions: ['*'] }
        ] : [
          { name: 'ملفات قاعدة البيانات', extensions: ['db', 'sqlite'] },
          { name: 'نسخ احتياطية مع صور', extensions: ['zip'] },
          { name: 'ملفات النسخ الاحتياطية القديمة', extensions: ['json'] },
          { name: 'جميع الملفات', extensions: ['*'] }
        ]

        const result = await dialog.showSaveDialog(mainWindow, {
          title: includeImages ? 'اختر مكان حفظ النسخة الاحتياطية مع الصور' : 'اختر مكان حفظ النسخة الاحتياطية',
          defaultPath: defaultName,
          filters,
          properties: ['createDirectory']
        })

        if (result.canceled) {
          throw new Error('تم إلغاء العملية')
        }

        filePath = result.filePath
      }

      console.log('📍 User selected file path:', filePath)
      console.log('📸 Include images:', includeImages)
      const backupPath = await backupService.createBackup(filePath, includeImages)
      console.log('✅ Backup created successfully:', backupPath)
      return backupPath
    } else {
      throw new Error('Backup service not initialized')
    }
  } catch (error) {
    console.error('Error creating backup:', error)
    throw error
  }
})

ipcMain.handle('backup:restore', async (_, backupPath) => {
  try {
    if (backupService) {
      const success = await backupService.restoreBackup(backupPath)
      console.log('Backup restored successfully:', success)
      return success
    } else {
      throw new Error('Backup service not initialized')
    }
  } catch (error) {
    console.error('Error restoring backup:', error)
    throw error
  }
})

ipcMain.handle('backup:list', async () => {
  try {
    if (backupService) {
      const backups = await backupService.listBackups()
      console.log('Listed backups:', backups.length)
      return backups
    } else {
      return []
    }
  } catch (error) {
    console.error('Error listing backups:', error)
    return []
  }
})

ipcMain.handle('backup:delete', async (_, backupName) => {
  try {
    if (backupService) {
      await backupService.deleteBackup(backupName)
      console.log('Backup deleted successfully:', backupName)
      return true
    } else {
      throw new Error('Backup service not initialized')
    }
  } catch (error) {
    console.error('Error deleting backup:', error)
    throw error
  }
})

// Production Backup Service IPC Handlers
let productionBackupService = null

// Initialize production backup service
ipcMain.handle('production-backup:init', async () => {
  try {
    const { ProductionBackupService } = require('../src/services/productionBackupService.js')
    productionBackupService = new ProductionBackupService(databaseService)
    console.log('✅ Production backup service initialized')
    return { success: true }
  } catch (error) {
    console.error('❌ Failed to initialize production backup service:', error)
    return { success: false, error: error.message }
  }
})

// Create backup
ipcMain.handle('production-backup:create', async (_, options) => {
  try {
    if (!productionBackupService) {
      // Auto-initialize if not already done
      const initResult = await ipcMain.invoke('production-backup:init')
      if (!initResult.success) {
        throw new Error('Failed to initialize production backup service')
      }
    }

    const result = await productionBackupService.createBackup(options)
    console.log('Production backup created:', result.success)
    return result
  } catch (error) {
    console.error('Error creating production backup:', error)
    return { success: false, error: error.message }
  }
})

// Restore backup
ipcMain.handle('production-backup:restore', async (_, backupId) => {
  try {
    if (!productionBackupService) {
      throw new Error('Production backup service not initialized')
    }

    // Find backup by ID
    const backups = await productionBackupService.listBackups()
    const backup = backups.find(b => b.id === backupId)
    
    if (!backup) {
      throw new Error('Backup not found')
    }

    const result = await productionBackupService.restoreBackup(backup.path)
    console.log('Production backup restored:', result.success)
    return result
  } catch (error) {
    console.error('Error restoring production backup:', error)
    return { success: false, error: error.message }
  }
})

// List backups
ipcMain.handle('production-backup:list', async () => {
  try {
    if (!productionBackupService) {
      // Auto-initialize if not already done
      const initResult = await ipcMain.invoke('production-backup:init')
      if (!initResult.success) {
        return { success: false, error: 'Failed to initialize production backup service' }
      }
    }

    const backups = await productionBackupService.listBackups()
    console.log('Production backups listed:', backups.length)
    return { success: true, data: backups }
  } catch (error) {
    console.error('Error listing production backups:', error)
    return { success: false, error: error.message, data: [] }
  }
})

// Delete backup
ipcMain.handle('production-backup:delete', async (_, backupId) => {
  try {
    if (!productionBackupService) {
      throw new Error('Production backup service not initialized')
    }

    const result = await productionBackupService.deleteBackup(backupId)
    console.log('Production backup deleted:', result.success)
    return result
  } catch (error) {
    console.error('Error deleting production backup:', error)
    return { success: false, error: error.message }
  }
})

// Get backup stats
ipcMain.handle('production-backup:stats', async () => {
  try {
    if (!productionBackupService) {
      // Auto-initialize if not already done
      const initResult = await ipcMain.invoke('production-backup:init')
      if (!initResult.success) {
        return { success: false, error: 'Failed to initialize production backup service' }
      }
    }

    const stats = await productionBackupService.getBackupStats()
    return { success: true, data: stats }
  } catch (error) {
    console.error('Error getting production backup stats:', error)
    return { success: false, error: error.message }
  }
})

// Export backup
ipcMain.handle('production-backup:export', async (_, backupId) => {
  try {
    if (!productionBackupService) {
      throw new Error('Production backup service not initialized')
    }

    // Find backup by ID
    const backups = await productionBackupService.listBackups()
    const backup = backups.find(b => b.id === backupId)
    
    if (!backup) {
      throw new Error('Backup not found')
    }

    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'تصدير النسخة الاحتياطية',
      defaultPath: `${backup.name}${backup.type === 'with_images' ? '.zip' : '.db'}`,
      filters: [
        { name: 'Database Files', extensions: ['db'] },
        { name: 'ZIP Files', extensions: ['zip'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (!result.canceled && result.filePath) {
      // Copy backup file to selected location
      const fs = require('fs')
      fs.copyFileSync(backup.path, result.filePath)
      console.log('Production backup exported to:', result.filePath)
      return { success: true, path: result.filePath }
    } else {
      return { success: false, error: 'Export cancelled' }
    }
  } catch (error) {
    console.error('Error exporting production backup:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('backup:test', async () => {
  try {
    console.log('🧪 Starting backup system test...')

    // Import and run the backup test script
    const { BackupTestScript } = require('../src/utils/backupTestScript.js')
    const testScript = new BackupTestScript()

    const success = await testScript.runFullTest()

    console.log('🧪 Backup test completed:', success ? 'PASSED' : 'FAILED')
    return {
      success,
      results: testScript.testResults || []
    }
  } catch (error) {
    console.error('❌ Backup test failed:', error)
    return {
      success: false,
      error: error.message,
      results: []
    }
  }
})

ipcMain.handle('dialog:showOpenDialog', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options)
  return result
})

ipcMain.handle('dialog:showSaveDialog', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options)
  return result
})

// Dialog handlers moved to app.whenReady() to ensure mainWindow is available

// QR utilities: save image to a temp file and open it
ipcMain.handle('qr:save-image', async (_event, payload) => {
  try {
    const fs = require('fs')
    const path = require('path')
    const tempDir = app.getPath('temp')
    const stamp = Date.now()
    let filePath
    if (payload && payload.svg) {
      filePath = path.join(tempDir, `whatsapp-qr-${stamp}.svg`)
      fs.writeFileSync(filePath, payload.svg, 'utf8')
    } else if (payload && payload.dataUrl) {
      const base64 = String(payload.dataUrl).replace(/^data:image\/png;base64,/, '')
      filePath = path.join(tempDir, `whatsapp-qr-${stamp}.png`)
      fs.writeFileSync(filePath, base64, 'base64')
    } else {
      throw new Error('No image data provided')
    }
    await shell.openPath(filePath)
    return { success: true, filePath }
  } catch (error) {
    console.error('qr:save-image failed:', error)
    return { success: false, error: error.message || 'failed' }
  }
})

// QR utilities: open a small window to display QR (SVG/PNG or ASCII fallback)
ipcMain.handle('qr:open-terminal', async (_event, payload) => {
  try {
    const win = new BrowserWindow({
      width: 720,
      height: 720,
      resizable: false,
      minimizable: false,
      maximizable: false,
      title: 'WhatsApp QR - Terminal View',
      backgroundColor: '#000000',
      webPreferences: { contextIsolation: true }
    })
    let html
    if (payload && payload.svg) {
      // Embed SVG directly with terminal-like light gray background
      const svg = String(payload.svg)
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QR</title><style>html,body{margin:0;height:100%;background:#e5e7eb;display:flex;align-items:center;justify-content:center}</style></head><body>${svg}</body></html>`
    } else if (payload && payload.dataUrl) {
      const src = String(payload.dataUrl)
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QR</title><style>html,body{margin:0;height:100%;background:#e5e7eb;display:flex;align-items:center;justify-content:center}</style></head><body><img src="${src}" width="640" height="640" /></body></html>`
    } else {
      // Fallback to ASCII
      const qrcodeTerminal = require('qrcode-terminal')
      let ascii = ''
      qrcodeTerminal.generate(String(payload || ''), { small: false }, (q) => {
        ascii = q || ''
      })
      ascii = ascii.replace(/\u001b\[[0-9;]*m/g, '')
      const safe = (ascii || 'No QR content').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QR</title><style>html,body{margin:0;height:100%;background:#000;color:#0f0} pre{white-space:pre;line-height:1;font-family:Consolas,'Courier New',monospace;font-size:10px;margin:16px}</style></head><body><pre>${safe}</pre></body></html>`
    }
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    return { success: true }
  } catch (error) {
    console.error('qr:open-terminal failed:', error)
    return { success: false, error: error.message || 'failed' }
  }
})

// System IPC Handlers
ipcMain.handle('system:openExternal', async (_, url) => {
  try {
    await shell.openExternal(url)
    return { success: true }
  } catch (error) {
    console.error('Error opening external URL:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('system:getVersion', async () => {
  return app.getVersion()
})

ipcMain.handle('system:getPath', async (_, name) => {
  return app.getPath(name)
})

// Database status IPC Handler
ipcMain.handle('database:getStatus', async () => {
  try {
    if (!databaseService || !databaseService.db) {
      return {
        connected: false,
        error: 'Database service not initialized'
      }
    }

    // Test database connection
    const testQuery = databaseService.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
    const result = testQuery.get()

    // Get additional database info
    const dbInfo = {
      connected: true,
      tablesCount: result.count,
      dbPath: databaseService.db.name,
      isOpen: databaseService.isOpen()
    }

    // Add file size info
    try {
      const fs = require('fs')
      const stats = fs.statSync(databaseService.db.name)
      dbInfo.fileSize = Math.round(stats.size / 1024) + ' KB'
      dbInfo.lastModified = stats.mtime.toISOString()
    } catch (e) {
      dbInfo.fileSize = 'Unknown'
    }

    // Add some basic table info
    try {
      const tablesQuery = databaseService.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      const tables = tablesQuery.all()
      dbInfo.tableNames = tables.map(t => t.name).slice(0, 10) // First 10 tables
      dbInfo.hasMoreTables = tables.length > 10
    } catch (e) {
      dbInfo.tableNames = []
    }

    return dbInfo
  } catch (error) {
    return {
      connected: false,
      error: error.message
    }
  }
})

// Authentication IPC Handlers
ipcMain.handle('auth:clearSession', async () => {
  try {
    console.log('🔐 Clearing authentication session via IPC')
    if (mainWindow && mainWindow.webContents && !mainWindow.isDestroyed()) {
      try {
        // Only clear session storage, keep localStorage for theme and other preferences
        await mainWindow.webContents.executeJavaScript(`
          sessionStorage.removeItem('dental_clinic_auth');
          console.log('🔐 Authentication session cleared via IPC');
        `)
        return { success: true }
      } catch (jsError) {
        console.log('Could not execute JavaScript (window destroyed):', jsError.message)
        return { success: false, error: 'Window destroyed' }
      }
    }
    return { success: false, error: 'Window not available' }
  } catch (error) {
    console.error('Error clearing session:', error)
    return { success: false, error: error.message }
  }
})

// Shell IPC Handlers (alternative method)
ipcMain.handle('shell:openExternal', async (_, url) => {
  try {
    await shell.openExternal(url)
    return { success: true }
  } catch (error) {
    console.error('Error opening external URL via shell:', error)
    return { success: false, error: error.message }
  }
})

// License IPC Handlers
ipcMain.handle('license:checkStatus', async () => {
  try {
    if (!licenseManager) {
      return {
        isValid: false,
        error: 'License manager not available',
        isFirstRun: true
      }
    }

    console.log('🔐 Checking license status...')
    const validation = await licenseManager.validateStoredLicense()
    const isFirstRun = licenseManager.isFirstRun()

    console.log('🔐 License validation result:', validation.isValid)
    console.log('🔐 Is first run:', isFirstRun)

    return {
      isValid: validation.isValid,
      error: validation.error,
      isFirstRun: isFirstRun,
      licenseData: validation.licenseData
    }
  } catch (error) {
    console.error('❌ Error checking license status:', error)
    return {
      isValid: false,
      error: 'License status check failed',
      isFirstRun: true
    }
  }
})

ipcMain.handle('license:activate', async (_, licenseKey) => {
  try {
    if (!licenseManager) {
      return {
        success: false,
        error: 'License manager not available'
      }
    }

    console.log('🔐 Attempting to activate license...')
    const result = await licenseManager.activateLicense(licenseKey)

    if (result.isValid) {
      console.log('✅ License activated successfully')
      return {
        success: true,
        licenseData: result.licenseData
      }
    } else {
      console.log('❌ License activation failed:', result.error)
      return {
        success: false,
        error: result.error
      }
    }
  } catch (error) {
    console.error('❌ Error activating license:', error)
    return {
      success: false,
      error: 'License activation failed'
    }
  }
})

ipcMain.handle('license:getMachineInfo', async () => {
  try {
    if (!licenseManager) {
      return {
        hwid: 'unavailable',
        error: 'License manager not available'
      }
    }

    const hwid = licenseManager.getCurrentHWID()
    console.log('🔐 Machine HWID requested:', hwid.substring(0, 8) + '...')

    return {
      hwid: hwid,
      platform: process.platform,
      arch: process.arch
    }
  } catch (error) {
    console.error('❌ Error getting machine info:', error)
    return {
      hwid: 'error',
      error: 'Failed to get machine info'
    }
  }
})

ipcMain.handle('license:getLicenseInfo', async () => {
  try {
    if (!licenseManager) {
      return {
        activated: false,
        error: 'License manager not available'
      }
    }

    const info = await licenseManager.getLicenseInfo()
    console.log('🔐 License info requested')

    return info
  } catch (error) {
    console.error('❌ Error getting license info:', error)
    return {
      activated: false,
      error: 'Failed to get license info'
    }
  }
})

ipcMain.handle('license:clearData', async () => {
  try {
    if (!licenseManager) {
      return {
        success: false,
        error: 'License manager not available'
      }
    }

    // Only allow clearing in development mode for security
    if (!isDev) {
      return {
        success: false,
        error: 'License clearing only allowed in development mode'
      }
    }

    await licenseManager.clearLicenseData()
    console.log('🔐 License data cleared (development mode)')

    return { success: true }
  } catch (error) {
    console.error('❌ Error clearing license data:', error)
    return {
      success: false,
      error: 'Failed to clear license data'
    }
  }
})

ipcMain.handle('license:getStorageInfo', async () => {
  try {
    if (!licenseManager) {
      return {
        error: 'License manager not available'
      }
    }

    const info = licenseManager.getStorageInfo()
    console.log('🔐 Storage info requested:', info)

    return info
  } catch (error) {
    console.error('❌ Error getting storage info:', error)
    return {
      error: 'Failed to get storage info'
    }
  }
})

// Predefined Licenses IPC Handlers
ipcMain.handle('license:getPredefinedLicenses', async (_, category = null) => {
  try {
    if (!predefinedLicenses) {
      return {
        error: 'Predefined licenses not available'
      }
    }

    if (category) {
      const licenses = predefinedLicenses.getLicensesByCategory(category)
      console.log(`🔐 Predefined licenses requested for category: ${category}`)
      return { licenses, category }
    } else {
      const stats = predefinedLicenses.getLicenseStatistics()
      console.log('🔐 All predefined license statistics requested')
      return { statistics: stats }
    }
  } catch (error) {
    console.error('❌ Error getting predefined licenses:', error)
    return {
      error: 'Failed to get predefined licenses'
    }
  }
})

ipcMain.handle('license:searchPredefinedLicenses', async (_, searchTerm) => {
  try {
    if (!predefinedLicenses) {
      return {
        error: 'Predefined licenses not available'
      }
    }

    const results = predefinedLicenses.searchLicenses(searchTerm)
    console.log(`🔐 License search performed: "${searchTerm}" - ${results.length} results`)

    return { results, searchTerm }
  } catch (error) {
    console.error('❌ Error searching predefined licenses:', error)
    return {
      error: 'Failed to search predefined licenses'
    }
  }
})

ipcMain.handle('license:getRandomPredefinedLicense', async (_, category = null) => {
  try {
    if (!predefinedLicenses) {
      return {
        error: 'Predefined licenses not available'
      }
    }

    const randomLicense = predefinedLicenses.getRandomPredefinedLicense(category)
    console.log(`🔐 Random license requested for category: ${category || 'all'}`)

    return { license: randomLicense }
  } catch (error) {
    console.error('❌ Error getting random predefined license:', error)
    return {
      error: 'Failed to get random predefined license'
    }
  }
})

ipcMain.handle('license:validatePredefinedLicense', async (_, licenseKey) => {
  try {
    if (!predefinedLicenses) {
      return {
        error: 'Predefined licenses not available'
      }
    }

    const isValid = predefinedLicenses.isPredefinedLicense(licenseKey)
    const info = isValid ? predefinedLicenses.getLicenseInfo(licenseKey) : null

    console.log(`🔐 License validation requested: ${licenseKey} - Valid: ${isValid}`)

    return {
      isValid,
      licenseInfo: info,
      licenseKey: licenseKey
    }
  } catch (error) {
    console.error('❌ Error validating predefined license:', error)
    return {
      error: 'Failed to validate predefined license'
    }
  }
})

// Lab IPC Handlers
ipcMain.handle('db:labs:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllLabs()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting all labs:', error)
    throw error
  }
})

ipcMain.handle('db:labs:create', async (_, lab) => {
  try {
    if (databaseService) {
      console.log('Creating lab:', lab)
      const result = await databaseService.createLab(lab)
      console.log('Lab created successfully:', result.id)
      return result
    } else {
      const newLab = { ...lab, id: Date.now().toString() }
      console.log('Creating lab (mock):', newLab)
      return newLab
    }
  } catch (error) {
    console.error('Error creating lab:', error)
    throw error
  }
})

ipcMain.handle('db:labs:update', async (_, id, lab) => {
  try {
    if (databaseService) {
      console.log('Updating lab:', id, lab)
      const result = await databaseService.updateLab(id, lab)
      console.log('Lab updated successfully:', id)
      return result
    } else {
      const updatedLab = { ...lab, id }
      console.log('Updating lab (mock):', updatedLab)
      return updatedLab
    }
  } catch (error) {
    console.error('Error updating lab:', error)
    throw error
  }
})

ipcMain.handle('db:labs:delete', async (_, id) => {
  try {
    if (databaseService) {
      console.log('Deleting lab:', id)
      const result = await databaseService.deleteLab(id)
      console.log('Lab deleted successfully:', id)
      return result
    } else {
      console.log('Deleting lab (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting lab:', error)
    throw error
  }
})

ipcMain.handle('db:labs:search', async (_, query) => {
  try {
    if (databaseService) {
      return await databaseService.searchLabs(query)
    } else {
      console.log('Searching labs (mock):', query)
      return []
    }
  } catch (error) {
    console.error('Error searching labs:', error)
    throw error
  }
})

// Lab Order IPC Handlers
ipcMain.handle('db:labOrders:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllLabOrders()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting all lab orders:', error)
    throw error
  }
})

ipcMain.handle('db:labOrders:getByPatient', async (_, patientId) => {
  try {
    if (databaseService) {
      return await databaseService.getLabOrdersByPatient(patientId)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting lab orders by patient:', error)
    throw error
  }
})

ipcMain.handle('db:labOrders:create', async (_, labOrder) => {
  try {
    if (databaseService) {
      console.log('Creating lab order:', labOrder)
      const result = await databaseService.createLabOrder(labOrder)
      console.log('Lab order created successfully:', result.id)
      return result
    } else {
      const newLabOrder = { ...labOrder, id: Date.now().toString() }
      console.log('Creating lab order (mock):', newLabOrder)
      return newLabOrder
    }
  } catch (error) {
    console.error('Error creating lab order:', error)
    throw error
  }
})

ipcMain.handle('db:labOrders:update', async (_, id, labOrder) => {
  try {
    if (databaseService) {
      console.log('Updating lab order:', id, labOrder)
      const result = await databaseService.updateLabOrder(id, labOrder)
      console.log('Lab order updated successfully:', id)
      return result
    } else {
      const updatedLabOrder = { ...labOrder, id }
      console.log('Updating lab order (mock):', updatedLabOrder)
      return updatedLabOrder
    }
  } catch (error) {
    console.error('Error updating lab order:', error)
    throw error
  }
})

ipcMain.handle('db:labOrders:delete', async (_, id) => {
  try {
    if (databaseService) {
      console.log('Deleting lab order:', id)
      const result = await databaseService.deleteLabOrder(id)
      console.log('Lab order deleted successfully:', id)
      return result
    } else {
      console.log('Deleting lab order (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting lab order:', error)
    throw error
  }
})

ipcMain.handle('db:labOrders:search', async (_, query) => {
  try {
    if (databaseService) {
      return await databaseService.searchLabOrders(query)
    } else {
      console.log('Searching lab orders (mock):', query)
      return []
    }
  } catch (error) {
    console.error('Error searching lab orders:', error)
    throw error
  }
})

// Medication IPC Handlers
ipcMain.handle('db:medications:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllMedications()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting all medications:', error)
    throw error
  }
})

ipcMain.handle('db:medications:create', async (_, medication) => {
  try {
    if (databaseService) {
      console.log('Creating medication:', medication)
      const result = await databaseService.createMedication(medication)
      console.log('Medication created successfully:', result.id)
      return result
    } else {
      const newMedication = { ...medication, id: Date.now().toString() }
      console.log('Creating medication (mock):', newMedication)
      return newMedication
    }
  } catch (error) {
    console.error('Error creating medication:', error)
    throw error
  }
})

ipcMain.handle('db:medications:update', async (_, id, medication) => {
  try {
    if (databaseService) {
      console.log('Updating medication:', id, medication)
      const result = await databaseService.updateMedication(id, medication)
      console.log('Medication updated successfully:', id)
      return result
    } else {
      const updatedMedication = { ...medication, id }
      console.log('Updating medication (mock):', updatedMedication)
      return updatedMedication
    }
  } catch (error) {
    console.error('Error updating medication:', error)
    throw error
  }
})

ipcMain.handle('db:medications:delete', async (_, id) => {
  try {
    if (databaseService) {
      console.log('Deleting medication:', id)
      const result = await databaseService.deleteMedication(id)
      console.log('Medication deleted successfully:', id)
      return result
    } else {
      console.log('Deleting medication (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting medication:', error)
    throw error
  }
})

ipcMain.handle('db:medications:search', async (_, query) => {
  try {
    if (databaseService) {
      return await databaseService.searchMedications(query)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error searching medications:', error)
    throw error
  }
})

// Prescription IPC Handlers
ipcMain.handle('db:prescriptions:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllPrescriptions()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting all prescriptions:', error)
    throw error
  }
})

ipcMain.handle('db:prescriptions:create', async (_, prescription) => {
  try {
    if (databaseService) {
      console.log('Creating prescription:', prescription)
      const result = await databaseService.createPrescription(prescription)
      console.log('Prescription created successfully:', result.id)
      return result
    } else {
      const newPrescription = { ...prescription, id: Date.now().toString() }
      console.log('Creating prescription (mock):', newPrescription)
      return newPrescription
    }
  } catch (error) {
    console.error('Error creating prescription:', error)
    throw error
  }
})

ipcMain.handle('db:prescriptions:update', async (_, id, prescription) => {
  try {
    if (databaseService) {
      console.log('Updating prescription:', id, prescription)
      const result = await databaseService.updatePrescription(id, prescription)
      console.log('Prescription updated successfully:', id)
      return result
    } else {
      const updatedPrescription = { ...prescription, id }
      console.log('Updating prescription (mock):', updatedPrescription)
      return updatedPrescription
    }
  } catch (error) {
    console.error('Error updating prescription:', error)
    throw error
  }
})

ipcMain.handle('db:prescriptions:delete', async (_, id) => {
  try {
    if (databaseService) {
      console.log('Deleting prescription:', id)
      const result = await databaseService.deletePrescription(id)
      console.log('Prescription deleted successfully:', id)
      return result
    } else {
      console.log('Deleting prescription (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting prescription:', error)
    throw error
  }
})

ipcMain.handle('db:prescriptions:getByPatient', async (_, patientId) => {
  try {
    if (databaseService) {
      return await databaseService.getPrescriptionsByPatient(patientId)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting prescriptions by patient:', error)
    throw error
  }
})

ipcMain.handle('db:prescriptions:search', async (_, query) => {
  try {
    if (databaseService) {
      return await databaseService.searchPrescriptions(query)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error searching prescriptions:', error)
    throw error
  }
})

// Search IPC Handlers for appointments and treatments
ipcMain.handle('db:appointments:search', async (_, query) => {
  try {
    if (databaseService) {
      const results = await databaseService.searchAppointments(query)
      console.log('Searching appointments:', query, 'Results:', results.length)
      return results
    } else {
      console.log('Searching appointments (mock):', query)
      return []
    }
  } catch (error) {
    console.error('Error searching appointments:', error)
    throw error
  }
})

ipcMain.handle('db:treatments:search', async (_, query) => {
  try {
    if (databaseService) {
      const results = await databaseService.searchTreatments(query)
      console.log('Searching treatments:', query, 'Results:', results.length)
      return results
    } else {
      console.log('Searching treatments (mock):', query)
      return []
    }
  } catch (error) {
    console.error('Error searching treatments:', error)
    throw error
  }
})



// NEW: Multiple Tooth Treatments IPC Handlers
ipcMain.handle('db:toothTreatments:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllToothTreatments()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting all tooth treatments:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatments:getByPatient', async (_, patientId) => {
  try {
    if (databaseService) {
      return await databaseService.getToothTreatmentsByPatient(patientId)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting tooth treatments by patient:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatments:getByTooth', async (_, patientId, toothNumber) => {
  try {
    if (databaseService) {
      return await databaseService.getToothTreatmentsByTooth(patientId, toothNumber)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting tooth treatments by tooth:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatments:create', async (_, treatment) => {
  try {
    if (databaseService) {
      console.log('Creating tooth treatment:', treatment)
      const result = await databaseService.createToothTreatment(treatment)
      console.log('Tooth treatment created successfully:', result.id)
      return result
    } else {
      console.log('Creating tooth treatment (mock):', treatment)
      return { ...treatment, id: 'mock-id', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    }
  } catch (error) {
    console.error('Error creating tooth treatment:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatments:update', async (_, id, updates) => {
  try {
    if (databaseService) {
      console.log('Updating tooth treatment:', id, updates)
      await databaseService.updateToothTreatment(id, updates)
      console.log('Tooth treatment updated successfully:', id)
      return true
    } else {
      console.log('Updating tooth treatment (mock):', id, updates)
      return true
    }
  } catch (error) {
    console.error('Error updating tooth treatment:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatments:delete', async (_, id) => {
  try {
    if (databaseService) {
      console.log('Deleting tooth treatment:', id)
      await databaseService.deleteToothTreatment(id)
      console.log('Tooth treatment deleted successfully:', id)
      return true
    } else {
      console.log('Deleting tooth treatment (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting tooth treatment:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatments:reorder', async (_, patientId, toothNumber, treatmentIds) => {
  try {
    if (databaseService) {
      console.log('Reordering tooth treatments:', patientId, toothNumber, treatmentIds)
      await databaseService.reorderToothTreatments(patientId, toothNumber, treatmentIds)
      console.log('Tooth treatments reordered successfully')
      return true
    } else {
      console.log('Reordering tooth treatments (mock):', patientId, toothNumber, treatmentIds)
      return true
    }
  } catch (error) {
    console.error('Error reordering tooth treatments:', error)
    throw error
  }
})

// NEW: Tooth Treatment Images IPC Handlers
ipcMain.handle('db:toothTreatmentImages:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllToothTreatmentImages()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting all tooth treatment images:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatmentImages:getByTreatment', async (_, treatmentId) => {
  try {
    if (databaseService) {
      return await databaseService.getToothTreatmentImagesByTreatment(treatmentId)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting tooth treatment images by treatment:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatmentImages:getByTooth', async (_, patientId, toothNumber) => {
  try {
    if (databaseService) {
      return await databaseService.getToothTreatmentImagesByTooth(patientId, toothNumber)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting tooth treatment images by tooth:', error)
    throw error
  }
})

// NEW: Treatment Sessions IPC Handlers
ipcMain.handle('db:treatmentSessions:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllTreatmentSessions()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting all treatment sessions:', error)
    throw error
  }
})

ipcMain.handle('db:treatmentSessions:getByTreatment', async (_, treatmentId) => {
  try {
    if (databaseService) {
      return await databaseService.getTreatmentSessionsByTreatment(treatmentId)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting treatment sessions by treatment:', error)
    throw error
  }
})

ipcMain.handle('db:treatmentSessions:create', async (_, session) => {
  try {
    if (databaseService) {
      console.log('Creating treatment session:', session)
      const result = await databaseService.createTreatmentSession(session)
      console.log('Treatment session created successfully:', result.id)
      return result
    } else {
      console.log('Creating treatment session (mock):', session)
      return { ...session, id: 'mock-id', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    }
  } catch (error) {
    console.error('Error creating treatment session:', error)
    throw error
  }
})

ipcMain.handle('db:treatmentSessions:update', async (_, id, updates) => {
  try {
    if (databaseService) {
      console.log('Updating treatment session:', id, updates)
      await databaseService.updateTreatmentSession(id, updates)
      console.log('Treatment session updated successfully:', id)
      return true
    } else {
      console.log('Updating treatment session (mock):', id, updates)
      return true
    }
  } catch (error) {
    console.error('Error updating treatment session:', error)
    throw error
  }
})

ipcMain.handle('db:treatmentSessions:delete', async (_, id) => {
  try {
    if (databaseService) {
      console.log('Deleting treatment session:', id)
      const result = await databaseService.deleteTreatmentSession(id)
      console.log('Treatment session deleted successfully:', id)
      return result
    } else {
      console.log('Deleting treatment session (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting treatment session:', error)
    throw error
  }
})

ipcMain.handle('db:treatmentSessions:getById', async (_, id) => {
  try {
    if (databaseService) {
      return await databaseService.getTreatmentSessionById(id)
    } else {
      return null
    }
  } catch (error) {
    console.error('Error getting treatment session by id:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatmentImages:create', async (_, image) => {
  try {
    if (databaseService) {
      console.log('Creating tooth treatment image:', image)
      const result = await databaseService.createToothTreatmentImage(image)
      console.log('Tooth treatment image created successfully:', result.id)
      return result
    } else {
      console.log('Creating tooth treatment image (mock):', image)
      return { ...image, id: 'mock-id', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    }
  } catch (error) {
    console.error('Error creating tooth treatment image:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatmentImages:delete', async (_, id) => {
  try {
    if (databaseService) {
      console.log('Deleting tooth treatment image:', id)

      // First get the image record to find the file path
      const imageRecord = databaseService.db.prepare('SELECT * FROM tooth_treatment_images WHERE id = ?').get(id)
      console.log('Tooth treatment image record to delete:', imageRecord)

      if (imageRecord && imageRecord.image_path) {
        // Try to delete the physical file
        try {
          const fs = require('fs')
          const path = require('path')

          console.log('Attempting to delete tooth treatment image file:', imageRecord.image_path)

          let fileDeleted = false

          // Check if image_path is a directory path (new format: dental_images/patient_id/tooth_number/image_type/)
          if (imageRecord.image_path.endsWith('/')) {
            console.log('Directory path detected, searching for images to delete in:', imageRecord.image_path)

            // Search for images in the directory and delete them
            const isDevelopment = process.env.NODE_ENV === 'development' ||
                                 process.execPath.includes('node') ||
                                 process.execPath.includes('electron') ||
                                 process.cwd().includes('dental-clinic')

            let baseDir
            if (isDevelopment) {
              baseDir = process.cwd()
            } else {
              baseDir = path.dirname(process.execPath)
            }

            const searchPaths = [
              path.join(baseDir, imageRecord.image_path),
              path.join(__dirname, '..', 'public', 'upload', imageRecord.image_path)
            ]

            for (const searchPath of searchPaths) {
              if (fs.existsSync(searchPath)) {
                try {
                  const files = fs.readdirSync(searchPath)
                  const imageFiles = files.filter(file => {
                    const ext = path.extname(file).toLowerCase()
                    return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
                  })

                  console.log(`Found ${imageFiles.length} tooth treatment image(s) to delete in directory:`, searchPath)
                  for (const imageFile of imageFiles) {
                    const fullImagePath = path.join(searchPath, imageFile)
                    fs.unlinkSync(fullImagePath)
                    console.log('✅ Physical tooth treatment image file deleted:', fullImagePath)
                    fileDeleted = true
                  }
                  console.log(`✅ Successfully deleted ${imageFiles.length} tooth treatment image(s) from directory`)
                } catch (dirError) {
                  console.warn('Error deleting tooth treatment images from directory:', searchPath, dirError.message)
                }
              }
            }
          } else {
            // Direct file path (old format)
            const isDevelopment = process.env.NODE_ENV === 'development' ||
                                 process.execPath.includes('node') ||
                                 process.execPath.includes('electron') ||
                                 process.cwd().includes('dental-clinic')

            let baseDir
            if (isDevelopment) {
              baseDir = process.cwd()
            } else {
              baseDir = path.dirname(process.execPath)
            }

            const searchPaths = [
              path.join(baseDir, imageRecord.image_path),
              path.join(__dirname, '..', 'public', 'upload', imageRecord.image_path)
            ]

            for (const searchPath of searchPaths) {
              if (fs.existsSync(searchPath)) {
                fs.unlinkSync(searchPath)
                console.log('✅ Physical tooth treatment image file deleted:', searchPath)
                fileDeleted = true
                break
              }
            }
          }

          if (!fileDeleted) {
            console.warn('⚠️ Physical tooth treatment image file not found or already deleted:', imageRecord.image_path)
          }
        } catch (fileError) {
          console.error('❌ Error deleting physical tooth treatment image file:', fileError.message)
          console.error('File path was:', imageRecord.image_path)
          // Continue with database deletion even if file deletion fails
        }
      } else {
        console.warn('⚠️ No tooth treatment image record found or no image_path for ID:', id)
      }

      // Delete from database
      await databaseService.deleteToothTreatmentImage(id)
      console.log('Tooth treatment image deleted successfully:', id)
      return true
    } else {
      console.log('Deleting tooth treatment image (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting tooth treatment image:', error)
    throw error
  }
})

// Dental Treatment Images IPC Handlers
ipcMain.handle('db:dentalTreatmentImages:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllDentalTreatmentImages()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting all dental treatment images:', error)
    throw error
  }
})

ipcMain.handle('db:dentalTreatmentImages:getByTreatment', async (_, treatmentId) => {
  try {
    if (databaseService) {
      return await databaseService.getDentalTreatmentImagesByTreatment(treatmentId)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting dental treatment images by treatment:', error)
    throw error
  }
})

ipcMain.handle('db:dentalTreatmentImages:create', async (_, image) => {
  try {
    if (databaseService) {
      console.log('Creating dental treatment image:', image)
      const result = await databaseService.createDentalTreatmentImage(image)
      console.log('Dental treatment image created successfully:', result.id)
      return result
    } else {
      const newImage = { ...image, id: Date.now().toString() }
      console.log('Creating dental treatment image (mock):', newImage)
      return newImage
    }
  } catch (error) {
    console.error('Error creating dental treatment image:', error)
    throw error
  }
})

ipcMain.handle('db:dentalTreatmentImages:delete', async (_, id) => {
  try {
    if (databaseService) {
      console.log('Deleting dental treatment image:', id)

      // First get the image record to find the file path
      const imageRecord = databaseService.db.prepare('SELECT * FROM dental_treatment_images WHERE id = ?').get(id)
      console.log('Image record to delete:', imageRecord)

      if (imageRecord && imageRecord.image_path) {
        // Try to delete the physical file
        try {
          const fs = require('fs')
          const path = require('path')

          console.log('Attempting to delete image file:', imageRecord.image_path)

          let fileDeleted = false

          // Check if image_path is a directory path (new format: dental_images/patient_id/tooth_number/image_type/)
          if (imageRecord.image_path.endsWith('/')) {
            console.log('Directory path detected, searching for images to delete in:', imageRecord.image_path)

            // Search for images in the directory and delete them
            const searchPaths = [
              path.join(app.getPath('userData'), imageRecord.image_path),
              path.join(__dirname, '..', 'public', 'upload', imageRecord.image_path)
            ]

            for (const searchPath of searchPaths) {
              if (fs.existsSync(searchPath)) {
                try {
                  const files = fs.readdirSync(searchPath)
                  const imageFiles = files.filter(file => {
                    const ext = path.extname(file).toLowerCase()
                    return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
                  })

                  console.log(`Found ${imageFiles.length} image(s) to delete in directory:`, searchPath)
                  for (const imageFile of imageFiles) {
                    const fullImagePath = path.join(searchPath, imageFile)
                    fs.unlinkSync(fullImagePath)
                    console.log('✅ Physical image file deleted:', fullImagePath)
                    fileDeleted = true
                  }
                  console.log(`✅ Successfully deleted ${imageFiles.length} image(s) from directory`)
                } catch (dirError) {
                  console.warn('Error deleting images from directory:', searchPath, dirError.message)
                }
              }
            }
          } else {
            // Legacy handling for full file paths
            const possiblePaths = [
              path.join(app.getPath('userData'), imageRecord.image_path),
              path.join(__dirname, '..', 'public', 'upload', imageRecord.image_path),
              path.isAbsolute(imageRecord.image_path) ? imageRecord.image_path : null
            ].filter(Boolean)

            for (const fullPath of possiblePaths) {
              if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath)
                console.log('✅ Physical image file deleted:', fullPath)
                fileDeleted = true
                break
              }
            }
          }

          if (!fileDeleted) {
            console.warn('⚠️ Physical image file not found at any location:', imageRecord.image_path)
            console.warn('Searched paths:')
            if (imageRecord.image_path.endsWith('/')) {
              console.warn('1. userData directory:', path.join(app.getPath('userData'), imageRecord.image_path))
              console.warn('2. public directory:', path.join(__dirname, '..', 'public', 'upload', imageRecord.image_path))
            } else {
              console.warn('1. userData:', path.join(app.getPath('userData'), imageRecord.image_path))
              console.warn('2. public:', path.join(__dirname, '..', 'public', 'upload', imageRecord.image_path))
              console.warn('3. absolute:', imageRecord.image_path)
            }
          }
        } catch (fileError) {
          console.error('❌ Error deleting physical image file:', fileError.message)
          console.error('File path was:', imageRecord.image_path)
          // Continue with database deletion even if file deletion fails
        }
      } else {
        console.warn('⚠️ No image record found or no image_path for ID:', id)
      }

      // Delete from database
      await databaseService.deleteDentalTreatmentImage(id)
      console.log('Dental treatment image deleted successfully:', id)
      return true
    } else {
      console.log('Deleting dental treatment image (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting dental treatment image:', error)
    throw error
  }
})





// Settings IPC Handlers
ipcMain.handle('settings:get', async () => {
  try {
    if (!databaseService) {
      console.error('❌ Database service not available for settings:get')
      throw new Error('Database service not initialized')
    }
    
    if (!databaseService.db) {
      console.error('❌ Database connection not available for settings:get')
      throw new Error('Database connection not available')
    }
    
      const settings = await databaseService.getSettings()

      // تحديث عنوان النافذة وأيقونة النافذة بناءً على الإعدادات
      if (mainWindow && settings) {
        let windowTitle = 'نظام إدارة العيادة السنية'

        if (settings.doctor_name && settings.clinic_name) {
          windowTitle = `د. ${settings.doctor_name} | ${settings.clinic_name}`
        } else if (settings.doctor_name) {
          windowTitle = `د. ${settings.doctor_name} | نظام إدارة العيادة السنية`
        } else if (settings.clinic_name) {
          windowTitle = `${settings.clinic_name} | نظام إدارة العيادة السنية`
        }

        mainWindow.setTitle(windowTitle)

      // تحديث أيقونة النافذة إذا كان هناك شعار مخصص وصالح
      if (settings.clinic_logo && settings.clinic_logo.trim() !== '' && settings.clinic_logo !== 'null' && settings.clinic_logo !== 'undefined') {
          try {
            const logoData = settings.clinic_logo
            console.log('🔍 محاولة تحديث الأيقونة:', logoData.substring(0, 50) + '...')

            // التحقق من نوع البيانات
            if (logoData.startsWith('data:image/')) {
              // إذا كانت البيانات base64 data URL
            try {
              const { nativeImage } = require('electron')
              const image = nativeImage.createFromDataURL(logoData)
              if (!image.isEmpty()) {
                mainWindow.setIcon(image)
                mainWindow['__currentLogo__'] = settings.clinic_logo // Store the current logo
                console.log('✅ تم تحديث أيقونة النافذة بنجاح من base64')
              } else {
                console.log('❌ فشل في إنشاء الصورة من base64 - بيانات غير صالحة')
              }
            } catch (imageError) {
              console.log('❌ خطأ في معالجة صورة base64:', imageError.message)
              }
            } else {
              // إذا كانت مسار ملف
            try {
              const fs = require('fs')
              const path = require('path')
              
              // Check if logoData is a valid path before processing
              if (logoData && logoData.trim() !== '') {
                const absolutePath = path.isAbsolute(logoData) ? logoData : path.resolve(logoData)

                if (fs.existsSync(absolutePath)) {
                  mainWindow.setIcon(absolutePath)
                  mainWindow['__currentLogo__'] = settings.clinic_logo // Store the current logo
                  console.log('✅ تم تحديث أيقونة النافذة بنجاح من ملف:', absolutePath)
                } else {
                  console.log('❌ الملف غير موجود:', absolutePath)
                }
              } else {
                console.log('⚠️ تم تجاهل مسار الشعار الفارغ')
              }
            } catch (fileError) {
              console.log('❌ خطأ في معالجة ملف الصورة:', fileError.message)
              }
            }
          } catch (error) {
            console.log('⚠️ فشل في تحديث أيقونة النافذة:', error.message)
          }
        } else {
          // Clear the icon if no logo is provided and a logo was previously set
          if (mainWindow['__currentLogo__'] && mainWindow['__currentLogo__'] !== '') {
            mainWindow.setIcon(null);
            mainWindow['__currentLogo__'] = '';
            console.log('✅ تم مسح أيقونة النافذة بنجاح');
          }
        }
      }

      return settings
  } catch (error) {
    console.error('Error getting settings:', error)
    throw error
  }
})

ipcMain.handle('settings:update', async (_, settings) => {
  try {
    if (databaseService) {
      const updatedSettings = await databaseService.updateSettings(settings)

      // تحديث عنوان النافذة وأيقونة النافذة عند تحديث الإعدادات
      if (mainWindow && updatedSettings) {
        let windowTitle = 'نظام إدارة العيادة السنية'

        if (updatedSettings.doctor_name && updatedSettings.clinic_name) {
          windowTitle = `د. ${updatedSettings.doctor_name} | ${updatedSettings.clinic_name}`
        } else if (updatedSettings.doctor_name) {
          windowTitle = `د. ${updatedSettings.doctor_name} | نظام إدارة العيادة السنية`
        } else if (updatedSettings.clinic_name) {
          windowTitle = `${updatedSettings.clinic_name} | نظام إدارة العيادة السنية`
        }

        mainWindow.setTitle(windowTitle)

        // تحديث أيقونة النافذة إذا كان هناك شعار مخصص
        if (updatedSettings.clinic_logo && updatedSettings.clinic_logo.trim() !== '' && updatedSettings.clinic_logo !== 'null' && updatedSettings.clinic_logo !== 'undefined') {
          try {
            const logoData = updatedSettings.clinic_logo
            console.log('🔍 محاولة تحديث الأيقونة عند التحديث:', logoData.substring(0, 50) + '...')

            // التحقق من نوع البيانات
            if (logoData.startsWith('data:image/')) {
              // إذا كانت البيانات base64 data URL
              const { nativeImage } = require('electron')
              const image = nativeImage.createFromDataURL(logoData)
              if (!image.isEmpty()) {
                mainWindow.setIcon(image)
                mainWindow['__currentLogo__'] = settings.clinic_logo // Store the current logo
                console.log('✅ تم تحديث أيقونة النافذة بنجاح من base64 عند التحديث')
              } else {
                console.log('❌ فشل في إنشاء الصورة من base64 عند التحديث')
              }
            } else {
              // إذا كانت مسار ملف
              const fs = require('fs')
              const path = require('path')
              
              // Check if logoData is a valid path before processing
              if (logoData && logoData.trim() !== '') {
                const absolutePath = path.isAbsolute(logoData) ? logoData : path.resolve(logoData)

                if (fs.existsSync(absolutePath)) {
                  mainWindow.setIcon(absolutePath)
                  mainWindow['__currentLogo__'] = settings.clinic_logo // Store the current logo
                  console.log('✅ تم تحديث أيقونة النافذة بنجاح من ملف عند التحديث:', absolutePath)
                } else {
                  console.log('❌ الملف غير موجود عند التحديث:', absolutePath)
                }
              } else {
                console.log('⚠️ تم تجاهل مسار الشعار الفارغ عند التحديث')
              }
            }
          } catch (error) {
            console.log('⚠️ فشل في تحديث أيقونة النافذة عند التحديث:', error.message)
          }
        } else {
          // Clear the icon if no logo is provided and a logo was previously set
          if (mainWindow['__currentLogo__'] && mainWindow['__currentLogo__'] !== '') {
            mainWindow.setIcon(null);
            mainWindow['__currentLogo__'] = '';
            console.log('✅ تم مسح أيقونة النافذة بنجاح');
          }
        }
      }

      return updatedSettings
    } else {
      console.log('Updating settings (mock):', settings)
      return settings
    }
  } catch (error) {
    console.error('Error updating settings:', error)
    throw error
  }
})

// Dashboard IPC Handlers
ipcMain.handle('db:dashboard:getStats', async () => {
  try {
    if (databaseService) {
      return await databaseService.getDashboardStats()
    } else {
      return {
        total_patients: 0,
        total_appointments: 0,
        total_revenue: 0,
        pending_payments: 0,
        today_appointments: 0,
        this_month_revenue: 0,
        low_stock_items: 0
      }
    }
  } catch (error) {
    console.error('Error getting dashboard stats:', error)
    throw error
  }
})

// Treatment update and delete handlers
ipcMain.handle('db:treatments:update', async (_, id, treatment) => {
  try {
    if (databaseService) {
      return await databaseService.updateTreatment(id, treatment)
    } else {
      const updatedTreatment = { ...treatment, id }
      console.log('Updating treatment (mock):', updatedTreatment)
      return updatedTreatment
    }
  } catch (error) {
    console.error('Error updating treatment:', error)
    throw error
  }
})

ipcMain.handle('db:treatments:delete', async (_, id) => {
  try {
    if (databaseService) {
      return await databaseService.deleteTreatment(id)
    } else {
      console.log('Deleting treatment (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting treatment:', error)
    throw error
  }
})

// Clinic Needs IPC Handlers
ipcMain.handle('db:clinicNeeds:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllClinicNeeds()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting all clinic needs:', error)
    throw error
  }
})

ipcMain.handle('db:clinicNeeds:create', async (_, need) => {
  try {
    if (databaseService) {
      console.log('Creating clinic need:', need)
      const result = await databaseService.createClinicNeed(need)
      console.log('Clinic need created successfully:', result.id)
      return result
    } else {
      const newNeed = { ...need, id: Date.now().toString() }
      console.log('Creating clinic need (mock):', newNeed)
      return newNeed
    }
  } catch (error) {
    console.error('Error creating clinic need:', error)
    throw error
  }
})

ipcMain.handle('db:clinicNeeds:update', async (_, id, need) => {
  try {
    if (databaseService) {
      console.log('Updating clinic need:', id, need)
      const result = await databaseService.updateClinicNeed(id, need)
      console.log('Clinic need updated successfully:', id)
      return result
    } else {
      console.log('Updating clinic need (mock):', id, need)
      return { ...need, id }
    }
  } catch (error) {
    console.error('Error updating clinic need:', error)
    throw error
  }
})

ipcMain.handle('db:clinicNeeds:delete', async (_, id) => {
  try {
    if (databaseService) {
      console.log('Deleting clinic need:', id)
      const result = await databaseService.deleteClinicNeed(id)
      console.log('Clinic need deleted successfully:', id)
      return result
    } else {
      console.log('Deleting clinic need (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting clinic need:', error)
    throw error
  }
})

ipcMain.handle('db:clinicNeeds:search', async (_, query) => {
  try {
    if (databaseService) {
      return await databaseService.searchClinicNeeds(query)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error searching clinic needs:', error)
    throw error
  }
})

ipcMain.handle('db:clinicNeeds:getByStatus', async (_, status) => {
  try {
    if (databaseService) {
      return await databaseService.getClinicNeedsByStatus(status)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting clinic needs by status:', error)
    throw error
  }
})

ipcMain.handle('db:clinicNeeds:getByPriority', async (_, priority) => {
  try {
    if (databaseService) {
      return await databaseService.getClinicNeedsByPriority(priority)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting clinic needs by priority:', error)
    throw error
  }
})

ipcMain.handle('db:clinicNeeds:getStatistics', async () => {
  try {
    if (databaseService) {
      return await databaseService.getClinicNeedsStatistics()
    } else {
      return {
        total_needs: 0,
        total_value: 0,
        pending_count: 0,
        ordered_count: 0,
        received_count: 0,
        urgent_count: 0
      }
    }
  } catch (error) {
    console.error('Error getting clinic needs statistics:', error)
    throw error
  }
})

// Reports IPC Handlers
// WhatsApp reminders aliases for renderer API
try {
  const { ipcMain } = require('electron')
  ipcMain.handle('whatsapp-reminders:get-settings', async () => {
    try {
      const settings = databaseService.getSettings ? await databaseService.getSettings() : null;
      const hours = settings.whatsapp_reminder_hours_before || 3;
      const minutesRaw = settings.whatsapp_reminder_minutes_before;
      const minutesResolved = (typeof minutesRaw === 'number' && minutesRaw > 0) ? minutesRaw : (hours * 60);
      
      const result = {
        whatsapp_reminder_enabled: settings.whatsapp_reminder_enabled || 0,
        hours_before: hours,
        minutes_before: minutesResolved,
        message: settings.whatsapp_reminder_message || '',
        custom_enabled: settings.whatsapp_reminder_custom_enabled || 0,
      };
      
      // console.log('🧪 [DEBUG] Raw settings from database:', {
      //   whatsapp_reminder_enabled: settings.whatsapp_reminder_enabled,
      //   whatsapp_reminder_hours_before: settings.whatsapp_reminder_hours_before,
      //   whatsapp_reminder_minutes_before: settings.whatsapp_reminder_minutes_before,
      //   whatsapp_reminder_message: settings.whatsapp_reminder_message,
      //   whatsapp_reminder_custom_enabled: settings.whatsapp_reminder_custom_enabled
      // });
      // console.log('🧪 [DEBUG] Processed result for frontend:', result);
      
      return result;
    } catch (error) {
      console.error('Error getting WhatsApp settings:', error);
      return null;
    }
  });

  ipcMain.handle('whatsapp-reminders:set-settings', async (_event, newSettings) => {
    try {
      if (databaseService) {
        const currentSettings = await databaseService.getSettings();
        const updatedSettings = {
          ...currentSettings,
          whatsapp_reminder_enabled: newSettings.whatsapp_reminder_enabled !== undefined ? newSettings.whatsapp_reminder_enabled : currentSettings.whatsapp_reminder_enabled,
          whatsapp_reminder_hours_before: newSettings.hours_before !== undefined ? newSettings.hours_before : currentSettings.whatsapp_reminder_hours_before,
          whatsapp_reminder_minutes_before: newSettings.minutes_before !== undefined ? newSettings.minutes_before : (currentSettings.whatsapp_reminder_minutes_before || newSettings.hours_before * 60),
          whatsapp_reminder_message: newSettings.message !== undefined ? newSettings.message : currentSettings.whatsapp_reminder_message,
          whatsapp_reminder_custom_enabled: newSettings.custom_enabled !== undefined ? newSettings.custom_enabled : currentSettings.whatsapp_reminder_custom_enabled,
        };

        // Apply default minutes if not explicitly set and custom_enabled is off
        if (updatedSettings.whatsapp_reminder_minutes_before === 0 && updatedSettings.whatsapp_reminder_hours_before > 0) {
          updatedSettings.whatsapp_reminder_minutes_before = updatedSettings.whatsapp_reminder_hours_before * 60;
        }

        // console.log('🧪 [DEBUG] About to save to database:', updatedSettings);
        await databaseService.updateSettings(updatedSettings);
        // console.log('✅ WhatsApp settings saved:', updatedSettings);
        
        // Test: Immediately reload from database to verify save
        // setTimeout(async () => {
        //   try {
        //     const testReload = await databaseService.getSettings();
        //     console.log('🧪 [TEST] Database reload after save:', {
        //       whatsapp_reminder_enabled: testReload.whatsapp_reminder_enabled,
        //       whatsapp_reminder_hours_before: testReload.whatsapp_reminder_hours_before,
        //       whatsapp_reminder_minutes_before: testReload.whatsapp_reminder_minutes_before,
        //       whatsapp_reminder_message: testReload.whatsapp_reminder_message,
        //       whatsapp_reminder_custom_enabled: testReload.whatsapp_reminder_custom_enabled
        //     });
        //   } catch (error) {
        //     console.error('🧪 [TEST] Failed to reload from database:', error);
        //   }
        // }, 500);
        
        return { success: true };
      } else {
        return { success: false, error: 'Database service not available' };
      }
    } catch (error) {
      console.error('Error saving WhatsApp settings:', error);
      return { success: false, error: error.message || 'Failed to save WhatsApp settings' };
    }
  });

  ipcMain.handle('whatsapp-reminders:reset-session', async () => {
    try {
      const { resetWhatsAppSession } = require('./services/whatsapp')
      await resetWhatsAppSession()
      return { success: true }
    } catch (error) {
      return { success: false, error: error && error.message ? error.message : 'Failed to reset session' }
    }
  })

  ipcMain.handle('whatsapp-reminders:get-status', async () => {
    try {
      const { getWhatsAppStatus } = require('./services/whatsapp')
      return getWhatsAppStatus()
    } catch (error) {
      return { isReady: false, hasQr: false }
    }
  })

  ipcMain.handle('whatsapp-reminders:logout-other-devices', async () => {
    try {
      const { resetWhatsAppSession } = require('./services/whatsapp')
      await resetWhatsAppSession()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error && error.message) ? error.message : 'failed' }
    }
  })

  ipcMain.handle('whatsapp-reminders:generate-new-qr', async () => {
    try {
      console.log('🔧 Main: Starting QR generation IPC handler...');

      // Try to require the WhatsApp service with explicit error handling
      let whatsappService;
      try {
        whatsappService = require('./services/whatsapp');
        console.log('🔧 Main: WhatsApp service loaded successfully');
      } catch (requireError) {
        console.error('❌ Main: Failed to load WhatsApp service:', requireError);
        throw new Error(`Failed to load WhatsApp service: ${requireError.message}`);
      }

      // Check if generateNewQR function exists
      if (!whatsappService || typeof whatsappService.generateNewQR !== 'function') {
        console.error('❌ Main: generateNewQR function not found:', {
          whatsappService: !!whatsappService,
          hasGenerateNewQR: whatsappService ? typeof whatsappService.generateNewQR : 'N/A',
          availableExports: whatsappService ? Object.keys(whatsappService) : 'None'
        });
        throw new Error('generateNewQR function not available in WhatsApp service');
      }

      console.log('🔧 Main: Calling generateNewQR function...');
      const result = await whatsappService.generateNewQR();

      console.log('🔧 Main: QR generation result:', result);

      // Return the detailed result from generateNewQR function
      return {
        success: result.success,
        message: result.success ? 'QR code generated successfully' : (result.error || 'Failed to generate QR code'),
        timestamp: Date.now(),
        details: result.details || {},
        error: result.error || null
      };
    } catch (error) {
      console.error('❌ Main: Error in QR generation IPC handler:', error);
      console.error('❌ Main: Error details:', {
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace',
        type: error?.constructor?.name || 'Unknown'
      });

      return {
        success: false,
        error: error?.message || 'Failed to generate QR code',
        timestamp: Date.now(),
        details: {
          type: error?.constructor?.name || 'Unknown',
          code: error?.code || 'N/A',
          stack: error?.stack?.substring(0, 500) || 'No stack trace'
        }
      };
    }
  });

  ipcMain.handle('whatsapp-reminders:run-diagnostic', async () => {
    try {
      // Removed dayjs imports/extends, now global in app.whenReady

      // Ensure minutes column exists to avoid failures on fresh DBs
      try {
        const cols = databaseService.db.prepare('PRAGMA table_info(settings)').all();
        const hasMinutes = cols && cols.some(c => c.name === 'whatsapp_reminder_minutes_before');
        if (!hasMinutes) {
          databaseService.db.prepare('ALTER TABLE settings ADD COLUMN whatsapp_reminder_minutes_before INTEGER DEFAULT 0').run();
        }
        const hasCustomEnabled = cols && cols.some(c => c.name === 'whatsapp_reminder_custom_enabled');
        if (!hasCustomEnabled) {
          databaseService.db.prepare('ALTER TABLE settings ADD COLUMN whatsapp_reminder_custom_enabled INTEGER DEFAULT 0').run();
        }
      } catch (e) {
        console.error('Error ensuring minutes/custom_enabled columns for diagnostic:', e);
      }

      const settings = databaseService.getSettings ? await databaseService.getSettings() : null;
      const enabled = !!settings && settings.whatsapp_reminder_enabled === 1;
      const hoursRaw = settings && settings.whatsapp_reminder_hours_before;
      const minutesRaw = settings && settings.whatsapp_reminder_minutes_before;
      const hours = Number(typeof hoursRaw === 'string' ? hoursRaw.trim() : hoursRaw || 0);
      const minutesCandidate = Number(typeof minutesRaw === 'string' ? minutesRaw.trim() : minutesRaw || 0);
      const minutes = minutesCandidate > 0 ? minutesCandidate : (hours > 0 ? hours * 60 : 0);
      const now = dayjs().tz(APP_TZ);

      const appts = await databaseService.getAllAppointments();
      const out = [];
      for (const a of appts) {
        if (!a.start_time) continue;
        const appointmentTime = dayjs(a.start_time).tz(APP_TZ);
        const reminderTime = appointmentTime.subtract(minutes, 'minute');
        const eligible = !reminderTime.isAfter(now) && appointmentTime.isAfter(now);
        out.push({
          id: a.id,
          patient_id: a.patient_id,
          start_time: a.start_time,
          appointmentTime: appointmentTime.toISOString(),
          reminderTime: reminderTime.toISOString(),
          eligible
        });
      }

      return {
        now: now.toISOString(),
        timezone: APP_TZ,
        minutesBefore: minutes,
        settingsEnabled: enabled,
        candidates: out
      };
    } catch (error) {
      return { error: error && error.message ? error.message : 'diagnostic failed' };
    }
  });

  // Handle manual trigger for WhatsApp reminder scheduler
  ipcMain.handle('whatsapp-reminders:run-scheduler-once', async () => {
    try {
      // Removed dayjs imports/extends, now global in app.whenReady

      // Ensure minutes column exists to avoid failures on fresh DBs
      try {
        const cols = databaseService.db.prepare('PRAGMA table_info(settings)').all();
        const hasMinutes = cols && cols.some(c => c.name === 'whatsapp_reminder_minutes_before');
        if (!hasMinutes) {
          databaseService.db.prepare('ALTER TABLE settings ADD COLUMN whatsapp_reminder_minutes_before INTEGER DEFAULT 0').run();
        }
        const hasCustomEnabled = cols && cols.some(c => c.name === 'whatsapp_reminder_custom_enabled');
        if (!hasCustomEnabled) {
          databaseService.db.prepare('ALTER TABLE settings ADD COLUMN whatsapp_reminder_custom_enabled INTEGER DEFAULT 0').run();
        }
      } catch (e) {
        console.error('Error ensuring minutes/custom_enabled columns for scheduler:', e);
      }

      // Inlined logic from whatsappReminderScheduler.ts

      // Helper functions (inlined)
      const getSettings = async () => {
        try {
          const settings = await databaseService.getSettings();
          const hours = settings.whatsapp_reminder_hours_before || 3;
          const minutesRaw = settings.whatsapp_reminder_minutes_before;
          const minutesResolved = (typeof minutesRaw === 'number' && minutesRaw > 0) ? minutesRaw : (hours * 60);
          return {
            whatsapp_reminder_enabled: settings.whatsapp_reminder_enabled || 0,
            whatsapp_reminder_hours_before: hours,
            whatsapp_reminder_minutes_before: minutesResolved,
            whatsapp_reminder_message: settings.whatsapp_reminder_message || 'مرحبًا {{patient_name}}، تذكير بموعدك في عيادة الأسنان بتاريخ {{appointment_date}} الساعة {{appointment_time}}. نشكرك على التزامك.'
          };
        } catch (error) {
          console.error('Error getting settings (inlined):', error);
          return null;
        }
      };

      const getUpcomingAppointments = async (minutesBefore) => {
        const now = dayjs().tz(APP_TZ);
        try {
          const appointments = await databaseService.getAllAppointments();
          console.log(`Loaded ${appointments?.length || 0} appointments for reminder check at`, now.toISOString(), 'TZ:', APP_TZ);

          const upcomingAppointments = [];
          for (const appointment of appointments) {
            if (!appointment.start_time) continue;

            const appointmentTime = dayjs(appointment.start_time).tz(APP_TZ);
            const reminderTime = appointmentTime.subtract(minutesBefore, 'minute');

            if (!reminderTime.isAfter(now) && appointmentTime.isAfter(now)) {
              upcomingAppointments.push({
                id: appointment.id,
                patient_id: appointment.patient_id,
                start_time: appointment.start_time,
                title: (appointment).title || 'موعد',
                patient_name: (appointment).patient_name || 'المريض',
                phone: (appointment).phone || ''
              });
            }
          }
          return upcomingAppointments;
        } catch (error) {
          console.error('Error getting upcoming appointments (inlined):', error);
          return [];
        }
      };

      const isReminderAlreadySent = async (appointmentId) => {
        try {
          const stmt = databaseService.db.prepare(`
            SELECT id FROM whatsapp_reminders
            WHERE appointment_id = ? AND status = 'sent'
          `);
          const existing = stmt.get(appointmentId);
          return !!existing;
        } catch (error) {
          console.error('Error checking if reminder already sent (inlined):', error);
          return false;
        }
      };

      const getPatientPhone = async (patientId) => {
        try {
          const stmt = databaseService.db.prepare(`
            SELECT phone FROM patients WHERE id = ?
          `);
          const patient = stmt.get(patientId);
          return patient?.phone || null;
        } catch (error) {
          console.error('Error getting patient phone (inlined):', error);
          return null;
        }
      };

      const normalizePhone = (raw) => {
        if (!raw) return null;
        let digits = String(raw).replace(/[^0-9]/g, '');
        if (!digits) return null;
        if (digits.startsWith('00')) digits = digits.slice(2);
        if (digits.length === 10 && digits.startsWith('09')) {
          digits = '963' + digits.slice(1);
        }
        if (digits.length === 9 && digits.startsWith('9')) {
          digits = '963' + digits;
        }
        return digits;
      };

      const replaceMessageVariables = (message, appointment) => {
        try {
          const appointmentDate = dayjs(appointment.start_time).format('YYYY-MM-DD');
          const appointmentTime = dayjs(appointment.start_time).format('HH:mm');
          return message
            .replace(/\{\{patient_name\}\}/g, appointment.patient_name)
            .replace(/\{\{appointment_date\}\}/g, appointmentDate)
            .replace(/\{\{appointment_time\}\}/g, appointmentTime);
        } catch (error) {
          console.error('Error replacing message variables (inlined):', error);
          return message;
        }
      };

      const recordReminderSent = async (appointmentId, patientId) => {
        try {
          const stmt = databaseService.db.prepare(`
            INSERT INTO whatsapp_reminders (
              id, appointment_id, patient_id, sent_at, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          const id = Date.now().toString();
          const now = new Date().toISOString();
          stmt.run(id, appointmentId, patientId, now, 'sent', now, now);
        } catch (error) {
          console.error('Error recording reminder sent (inlined):', error);
          throw error;
        }
      };

      // Import sendMessage and initializeClient from whatsapp service
      const { sendMessage, initializeClient } = require('./services/whatsapp');
      await initializeClient(); // Ensure WhatsApp client is initialized

      const checkAndSendReminders = async () => {
        try {
          // Ensure minutes column exists to avoid failures on fresh DBs
          try {
            const cols = databaseService.db.prepare('PRAGMA table_info(settings)').all();
            const hasMinutes = cols && cols.some(c => c.name === 'whatsapp_reminder_minutes_before');
            if (!hasMinutes) {
              databaseService.db.prepare('ALTER TABLE settings ADD COLUMN whatsapp_reminder_minutes_before INTEGER DEFAULT 0').run();
            }
            const hasCustomEnabled = cols && cols.some(c => c.name === 'whatsapp_reminder_custom_enabled');
            if (!hasCustomEnabled) {
              databaseService.db.prepare('ALTER TABLE settings ADD COLUMN whatsapp_reminder_custom_enabled INTEGER DEFAULT 0').run();
            }
          } catch (e) {
            console.error('Error ensuring minutes/custom_enabled columns for scheduler (inlined):', e);
          }

          const settings = await getSettings();
          if (!settings || settings.whatsapp_reminder_enabled !== 1) {
            return;
          }

          console.log('Checking for upcoming appointments to send reminders (inlined from scheduler)...');
          const minutes = settings.whatsapp_reminder_minutes_before ?? (settings.whatsapp_reminder_hours_before * 60);
          const upcomingAppointments = await getUpcomingAppointments(minutes);
          console.log('Eligible appointments count (inlined from scheduler):', upcomingAppointments.length, 'minutesBefore:', minutes);

          for (const appointment of upcomingAppointments) {
            try {
              const alreadySent = await isReminderAlreadySent(appointment.id);
              if (alreadySent) {
                console.log(`Reminder for appointment ${appointment.id} already sent. Skipping.`);
                continue;
              }

              const patientPhone = await getPatientPhone(appointment.patient_id);
              console.log(`Raw patient phone for ${appointment.patient_id}: ${patientPhone}`);

              const normalizedPhone = normalizePhone(patientPhone || '');
              console.log(`Normalized patient phone for ${appointment.patient_id}: ${normalizedPhone}`);

              if (!normalizedPhone) {
                console.warn(`No valid international phone for patient ${appointment.patient_name} (${appointment.patient_id}). Raw: ${patientPhone}`);
                continue;
              }

              // Define a default message if custom messages are not allowed
              const defaultMessage = `مرحباً بك يا {{patient_name}}! نود تذكيرك بموعدك في عيادة الأسنان بتاريخ {{appointment_date}} الساعة {{appointment_time}}. نتطلع لرؤيتك!`;

              const message = settings.whatsapp_reminder_custom_enabled === 1
                ? replaceMessageVariables(settings.whatsapp_reminder_message, appointment)
                : replaceMessageVariables(defaultMessage, appointment);

              console.log(`Generated message for ${appointment.id}: ${message.substring(0, 50)}...`);

              console.log('Sending WhatsApp reminder to (inlined from scheduler):', normalizedPhone, 'appointmentId:', appointment.id);
  
              let sendResult;
              try {
                sendResult = await sendMessage(normalizedPhone, message);
                console.log(`✅ Reminder sent successfully to ${appointment.patient_name} for appointment ${appointment.id}`);
              } catch (sendError) {
                console.error(`❌ Failed to send reminder to ${appointment.patient_name} for appointment ${appointment.id}:`, sendError);
  
                // Check if this is a critical error that should stop the scheduler
                const isCriticalError = sendError.message && (
                  sendError.message.includes('WhatsApp client is not initialized') ||
                  sendError.message.includes('not ready') ||
                  sendError.message.includes('Maximum initialization attempts reached')
                );
  
                if (isCriticalError) {
                  console.error('🚨 Critical WhatsApp error detected, stopping reminder scheduler');
                  // Don't continue with other appointments if WhatsApp is not working
                  break;
                }
  
                // For non-critical errors, continue with other appointments
                continue;
              }
  
              // Only record as sent if the message was actually sent successfully
              if (sendResult && sendResult.success) {
                try {
                  await recordReminderSent(appointment.id, appointment.patient_id);
                  console.log(`✅ Reminder recorded as sent for ${appointment.patient_name} (appointment ${appointment.id})`);
                } catch (recordError) {
                  console.error(`❌ Failed to record reminder as sent for ${appointment.id}:`, recordError);
                  // Continue processing even if recording fails
                }
              } else {
                console.warn(`⚠️ Message send result was not successful for ${appointment.id}:`, sendResult);
              }
            } catch (appointmentError) {
              console.error(`❌ Error processing reminder for appointment ${appointment.id} (inlined from scheduler):`, appointmentError);
  
              // Enhanced error handling for appointment processing
              if (appointmentError.message && appointmentError.message.includes('Maximum initialization attempts reached')) {
                console.error('🚨 WhatsApp service is critically failing, stopping reminder processing');
                break; // Stop processing other appointments
              }
  
              // For other errors, continue with next appointment
              console.log(`🔄 Continuing with next appointment despite error in ${appointment.id}`);
            }
          }
        } catch (error) {
          console.error('❌ Error in checkAndSendReminders (inlined from scheduler):', error);
  
          // Enhanced error handling for the entire scheduler
          if (error.message && (
            error.message.includes('Maximum initialization attempts reached') ||
            error.message.includes('WhatsApp client is not initialized')
          )) {
            console.error('🚨 WhatsApp service is critically failing - scheduler will continue but WhatsApp reminders are disabled');
  
            // Don't throw the error to prevent scheduler from stopping
            // Just log it and let the scheduler continue for next cycle
            return;
          }
  
          // For other errors, log and continue
          console.log('🔄 Scheduler will continue despite error');
          return;
        }
      };

      // Now run the check
      await checkAndSendReminders();
      return { success: true };
    } catch (error) {
      return { success: false, error: error && error.message ? error.message : 'failed' };
    }
  });

  // Test send message directly
  ipcMain.handle('whatsapp-reminders:test-send', async (_event, phoneNumber, message) => {
    try {
      const { sendMessage } = require('./services/whatsapp')
      await sendMessage(String(phoneNumber || ''), String(message || ''))
      return { success: true }
    } catch (error) {
      const msg = error && error.message ? error.message : 'Failed to send test message'
      console.error('Test send failed:', error)
      return { success: false, error: msg }
    }
  })
} catch (e) {
  // ignore boot-time errors; main pieces may not be ready yet
}
ipcMain.handle('reports:generatePatientReport', async (_, filter) => {
  try {
    if (databaseService && reportsService) {
      const patients = await databaseService.getAllPatients()
      const appointments = await databaseService.getAllAppointments()
      return await reportsService.generatePatientReport(patients, appointments, filter)
    } else {
      throw new Error('Database or Reports service not initialized')
    }
  } catch (error) {
    console.error('Error generating patient report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateAppointmentReport', async (_, filter) => {
  try {
    if (databaseService && reportsService) {
      const appointments = await databaseService.getAllAppointments()
      const treatments = await databaseService.getAllTreatments()
      return await reportsService.generateAppointmentReport(appointments, treatments, filter)
    } else {
      throw new Error('Database or Reports service not initialized')
    }
  } catch (error) {
    console.error('Error generating appointment report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateFinancialReport', async (_, filter) => {
  try {
    if (databaseService && reportsService) {
      const payments = await databaseService.getAllPayments()
      const treatments = await databaseService.getAllTreatments()
      const expenses = await databaseService.getAllClinicExpenses()
      return await reportsService.generateFinancialReport(payments, treatments, filter, expenses)
    } else {
      throw new Error('Database or Reports service not initialized')
    }
  } catch (error) {
    console.error('Error generating financial report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateInventoryReport', async (_, filter) => {
  try {
    if (databaseService && reportsService) {
      const inventory = await databaseService.getAllInventoryItems()
      const inventoryUsage = [] // TODO: Implement inventory usage tracking
      return await reportsService.generateInventoryReport(inventory, inventoryUsage, filter)
    } else {
      throw new Error('Database or Reports service not initialized')
    }
  } catch (error) {
    console.error('Error generating inventory report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateTreatmentReport', async (_, filter) => {
  try {
    if (databaseService && reportsService) {
      const toothTreatments = await databaseService.getAllToothTreatments()
      const treatments = await databaseService.getAllTreatments()
      const patients = await databaseService.getAllPatients()
      return await reportsService.generateTreatmentReport(toothTreatments, treatments, filter, patients)
    } else {
      throw new Error('Database or Reports service not initialized')
    }
  } catch (error) {
    console.error('Error generating treatment report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateAnalyticsReport', async (_, filter) => {
  try {
    // TODO: Implement analytics report generation
    return {
      kpis: {
        patientGrowthRate: 15.5,
        revenueGrowthRate: 22.3,
        appointmentUtilization: 85.2,
        averageRevenuePerPatient: 450,
        patientRetentionRate: 78.9,
        appointmentNoShowRate: 12.1
      },
      trends: {
        patientTrend: [],
        revenueTrend: [],
        appointmentTrend: []
      },
      comparisons: {
        currentPeriod: {},
        previousPeriod: {},
        changePercentage: 0
      },
      predictions: {
        nextMonthRevenue: 25000,
        nextMonthAppointments: 120,
        confidence: 85
      }
    }
  } catch (error) {
    console.error('Error generating analytics report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateOverviewReport', async (_, filter) => {
  try {
    if (databaseService && reportsService) {
      const patients = await databaseService.getAllPatients()
      const appointments = await databaseService.getAllAppointments()
      const payments = await databaseService.getAllPayments()
      const treatments = await databaseService.getAllTreatments()
      const inventory = await databaseService.getAllInventoryItems()

      const expenses = await databaseService.getAllClinicExpenses()
      const [patientReport, appointmentReport, financialReport, inventoryReport] = await Promise.all([
        reportsService.generatePatientReport(patients, appointments, filter),
        reportsService.generateAppointmentReport(appointments, treatments, filter),
        reportsService.generateFinancialReport(payments, treatments, filter, expenses),
        reportsService.generateInventoryReport(inventory, [], filter)
      ])

      return {
        patients: patientReport,
        appointments: appointmentReport,
        financial: financialReport,
        inventory: inventoryReport,
        generatedAt: new Date().toISOString(),
        filter
      }
    } else {
      throw new Error('Database or Reports service not initialized')
    }
  } catch (error) {
    console.error('Error generating overview report:', error)
    throw error
  }
})

ipcMain.handle('reports:exportReport', async (_, type, filter, options) => {
  try {
    const { dialog } = require('electron')

    // Get report data based on type
    let reportData
    switch (type) {
      case 'patients':
        if (databaseService && reportsService) {
          const patients = await databaseService.getAllPatients()
          const appointments = await databaseService.getAllAppointments()
          reportData = await reportsService.generatePatientReport(patients, appointments, filter)
        } else {
          throw new Error('Database or Reports service not initialized')
        }
        break
      case 'appointments':
        if (databaseService && reportsService) {
          const appointments = await databaseService.getAllAppointments()
          const treatments = await databaseService.getAllTreatments()
          reportData = await reportsService.generateAppointmentReport(appointments, treatments, filter)
        } else {
          throw new Error('Database or Reports service not initialized')
        }
        break
      case 'financial':
        if (databaseService && reportsService) {
          const payments = await databaseService.getAllPayments()
          const treatments = await databaseService.getAllTreatments()
          reportData = await reportsService.generateFinancialReport(payments, treatments, filter)
        } else {
          throw new Error('Database or Reports service not initialized')
        }
        break
      case 'inventory':
        if (databaseService && reportsService) {
          const inventory = await databaseService.getAllInventoryItems()
          reportData = await reportsService.generateInventoryReport(inventory, [], filter)
        } else {
          throw new Error('Database or Reports service not initialized')
        }
        break
      case 'treatments':
        if (databaseService && reportsService) {
          const toothTreatments = await databaseService.getAllToothTreatments()
          const treatments = await databaseService.getAllTreatments()
          const patients = await databaseService.getAllPatients()
          reportData = await reportsService.generateTreatmentReport(toothTreatments, treatments, filter, patients)
        } else {
          throw new Error('Database or Reports service not initialized')
        }
        break
      case 'overview':
        if (databaseService && reportsService) {
          const [patients, appointments, payments, treatments, inventory] = await Promise.all([
            databaseService.getAllPatients(),
            databaseService.getAllAppointments(),
            databaseService.getAllPayments(),
            databaseService.getAllTreatments(),
            databaseService.getAllInventoryItems()
          ])

          reportData = {
            patients: await reportsService.generatePatientReport(patients, appointments, filter),
            appointments: await reportsService.generateAppointmentReport(appointments, treatments, filter),
            financial: await reportsService.generateFinancialReport(payments, treatments, filter),
            inventory: await reportsService.generateInventoryReport(inventory, [], filter)
          }
        } else {
          throw new Error('Database or Reports service not initialized')
        }
        break
      default:
        throw new Error(`Unsupported report type: ${type}`)
    }

    // Show save dialog
    const fileExtensions = {
      pdf: 'pdf',
      excel: 'xlsx',
      csv: 'csv'
    }

    const extension = fileExtensions[options.format]

    // Generate descriptive Arabic filename with DD-MM-YYYY format
    const generateFileName = (reportType, format) => {
      const now = new Date()
      // Format date as DD-MM-YYYY for filename (Gregorian calendar)
      const day = now.getDate().toString().padStart(2, '0')
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const year = now.getFullYear()
      const dateStr = `${day}-${month}-${year}`
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS

      // Arabic report names mapping
      const reportNames = {
        'patients': 'تقرير_المرضى',
        'appointments': 'تقرير_المواعيد',
        'financial': 'التقرير_المالي',
        'inventory': 'تقرير_المخزون',
        'treatments': 'تقرير_العلاجات',
        'analytics': 'تقرير_التحليلات',
        'overview': 'التقرير_الشامل'
      }

      const reportName = reportNames[reportType] || `تقرير_${reportType}`
      return `${reportName}_${dateStr}_${timeStr}.${format}`
    }

    const defaultFileName = generateFileName(type, extension)

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Report',
      defaultPath: defaultFileName,
      filters: [
        { name: `${options.format.toUpperCase()} Files`, extensions: [extension] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, message: 'تم إلغاء العملية' }
    }

    // Ensure correct file extension
    let filePath = result.filePath
    if (!filePath.endsWith(`.${extension}`)) {
      filePath += `.${extension}`
    }

    // Create export based on format
    const fs = require('fs')
    const path = require('path')

    let content = ''
    let isBuffer = false

    if (options.format === 'csv') {
      // Enhanced CSV export with DD/MM/YYYY date format
      content = '\uFEFF' // BOM for UTF-8 support
      content += `Report ${type} - Modern Dental Clinic\n`
      const currentDate = new Date()
      // Format date as DD/MM/YYYY (Gregorian calendar)
      const day = currentDate.getDate().toString().padStart(2, '0')
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0')
      const year = currentDate.getFullYear()
      const formattedDate = `${day}/${month}/${year}`
      content += `Report Date: ${formattedDate}\n\n`

      if (reportData) {
        if (type === 'overview') {
          content += 'Report Type,Value\n'
          content += `"Total Patients","${reportData.patients?.totalPatients || 0}"\n`
          content += `"New Patients","${reportData.patients?.newPatientsThisMonth || 0}"\n`
          content += `"Total Appointments","${reportData.appointments?.totalAppointments || 0}"\n`
          content += `"Completed Appointments","${reportData.appointments?.completedAppointments || 0}"\n`
          content += `"Total Revenue","$${reportData.financial?.totalRevenue || 0}"\n`
          content += `"Pending Payments","$${reportData.financial?.pendingPayments || 0}"\n`
          content += `"Inventory Items","${reportData.inventory?.totalItems || 0}"\n`
          content += `"Low Stock Items","${reportData.inventory?.lowStockItems || 0}"\n`
        } else if (type === 'patients') {
          content += 'Indicator,Value\n'
          content += `"Total Patients","${reportData.totalPatients || 0}"\n`
          content += `"New Patients This Month","${reportData.newPatientsThisMonth || 0}"\n`
          content += `"Active Patients","${reportData.activePatients || 0}"\n`
          content += `"Average Age","${reportData.averageAge || 0} years"\n`
        } else if (type === 'appointments') {
          content += 'Indicator,Value\n'
          content += `"Total Appointments","${reportData.totalAppointments || 0}"\n`
          content += `"Completed Appointments","${reportData.completedAppointments || 0}"\n`
          content += `"Cancelled Appointments","${reportData.cancelledAppointments || 0}"\n`
          content += `"Attendance Rate","${reportData.attendanceRate || 0}%"\n`
        } else if (type === 'financial') {
          content += 'Indicator,Value\n'
          content += `"Total Revenue","$${reportData.totalRevenue || 0}"\n`
          content += `"Completed Payments","$${reportData.completedPayments || 0}"\n`
          content += `"Pending Payments","$${reportData.pendingPayments || 0}"\n`
          content += `"Overdue Payments","$${reportData.overduePayments || 0}"\n`
        } else if (type === 'inventory') {
          content += 'Indicator,Value\n'
          content += `"Total Items","${reportData.totalItems || 0}"\n`
          content += `"Total Value","$${reportData.totalValue || 0}"\n`
          content += `"Low Stock Items","${reportData.lowStockItems || 0}"\n`
          content += `"Expired Items","${reportData.expiredItems || 0}"\n`
        } else if (type === 'treatments') {
          // Use the specialized CSV export function for treatments
          const csvData = reportsService.exportTreatmentReportToCSV(reportData)
          content = '\uFEFF' // BOM for Arabic support
          content += csvData.map(row =>
            row.map(cell => `"${cell}"`).join(',')
          ).join('\n')
        }
      }
    } else if (options.format === 'excel') {
      // Enhanced Excel-like format (actually TSV for simplicity) with DD/MM/YYYY date format
      content = '\uFEFF' // BOM for Arabic support
      content += `تقرير ${type} - عيادة الأسنان الحديثة\n`
      const currentDate = new Date()
      // Format date as DD/MM/YYYY (Gregorian calendar)
      const day = currentDate.getDate().toString().padStart(2, '0')
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0')
      const year = currentDate.getFullYear()
      const formattedDate = `${day}/${month}/${year}`
      content += `تاريخ التقرير: ${formattedDate}\n\n`

      if (reportData) {
        content += 'المؤشر\tالقيمة\tالوصف\n'
        if (type === 'overview') {
          content += `إجمالي المرضى\t${reportData.patients?.totalPatients || 0}\tالعدد الكلي للمرضى المسجلين\n`
          content += `المرضى الجدد\t${reportData.patients?.newPatientsThisMonth || 0}\tالمرضى الجدد هذا الشهر\n`
          content += `إجمالي المواعيد\t${reportData.appointments?.totalAppointments || 0}\tجميع المواعيد المجدولة\n`
          content += `المواعيد المكتملة\t${reportData.appointments?.completedAppointments || 0}\tالمواعيد التي تم إنجازها\n`
          content += `إجمالي الإيرادات\t$${reportData.financial?.totalRevenue || 0}\tالإيرادات المحققة بالدولار\n`
          content += `المدفوعات الآجلة\t${reportData.financial?.pendingPayments || 0}\tالمدفوعات غير المكتملة\n`
          content += `عناصر المخزون\t${reportData.inventory?.totalItems || 0}\tإجمالي عناصر المخزون\n`
          content += `تنبيهات المخزون\t${reportData.inventory?.lowStockItems || 0}\tعناصر تحتاج إعادة تموين\n`
        }
      }
    } else if (options.format === 'pdf') {
      // Simplified PDF export with better Arabic support
      try {
        const PDFDocument = require('pdfkit')
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        })

        // Create buffer to store PDF
        const chunks = []
        doc.on('data', chunk => chunks.push(chunk))

        // Header
        doc.fontSize(20)
        doc.text('Modern Dental Clinic', { align: 'center' })
        doc.moveDown()

        const reportTitles = {
          overview: 'Comprehensive Report',
          patients: 'Patients Report',
          appointments: 'Appointments Report',
          financial: 'Financial Report',
          inventory: 'Inventory Report'
        }

        doc.fontSize(16)
        doc.text(reportTitles[type] || 'Report', { align: 'center' })
        doc.moveDown()

        doc.fontSize(12)
        // Format date as DD/MM/YYYY (Gregorian calendar)
        const reportDate = (() => {
          const date = new Date()
          const day = date.getDate().toString().padStart(2, '0')
          const month = (date.getMonth() + 1).toString().padStart(2, '0')
          const year = date.getFullYear()
          return `${day}/${month}/${year}`
        })()
        doc.text(`Report Date: ${reportDate}`, { align: 'center' })
        doc.moveDown(2)

        // Statistics Summary
        doc.fontSize(14)
        doc.text('Statistics Summary:', { underline: true })
        doc.moveDown()

        doc.fontSize(12)

        if (reportData) {
          if (type === 'overview') {
            const stats = [
              `Total Patients: ${reportData.patients?.totalPatients || 0}`,
              `New Patients This Month: ${reportData.patients?.newPatientsThisMonth || 0}`,
              `Total Appointments: ${reportData.appointments?.totalAppointments || 0}`,
              `Completed Appointments: ${reportData.appointments?.completedAppointments || 0}`,
              `Total Revenue: $${reportData.financial?.totalRevenue || 0}`,
              `Pending Payments: $${reportData.financial?.pendingPayments || 0}`,
              `Inventory Items: ${reportData.inventory?.totalItems || 0}`,
              `Low Stock Alerts: ${reportData.inventory?.lowStockItems || 0}`
            ]

            stats.forEach(stat => {
              doc.text(`• ${stat}`)
              doc.moveDown(0.5)
            })
          } else if (type === 'patients') {
            const stats = [
              `Total Patients: ${reportData.totalPatients || 0}`,
              `New Patients This Month: ${reportData.newPatientsThisMonth || 0}`,
              `Active Patients: ${reportData.activePatients || 0}`,
              `Average Age: ${reportData.averageAge || 0} years`
            ]

            stats.forEach(stat => {
              doc.text(`• ${stat}`)
              doc.moveDown(0.5)
            })
          } else if (type === 'appointments') {
            const stats = [
              `Total Appointments: ${reportData.totalAppointments || 0}`,
              `Completed Appointments: ${reportData.completedAppointments || 0}`,
              `Cancelled Appointments: ${reportData.cancelledAppointments || 0}`,
              `Attendance Rate: ${reportData.attendanceRate || 0}%`
            ]

            stats.forEach(stat => {
              doc.text(`• ${stat}`)
              doc.moveDown(0.5)
            })
          } else if (type === 'financial') {
            const stats = [
              `Total Revenue: $${reportData.totalRevenue || 0}`,
              `Completed Payments: $${reportData.completedPayments || 0}`,
              `Pending Payments: $${reportData.pendingPayments || 0}`,
              `Overdue Payments: $${reportData.overduePayments || 0}`
            ]

            stats.forEach(stat => {
              doc.text(`• ${stat}`)
              doc.moveDown(0.5)
            })
          } else if (type === 'inventory') {
            const stats = [
              `Total Items: ${reportData.totalItems || 0}`,
              `Total Value: $${reportData.totalValue || 0}`,
              `Low Stock Items: ${reportData.lowStockItems || 0}`,
              `Expired Items: ${reportData.expiredItems || 0}`
            ]

            stats.forEach(stat => {
              doc.text(`• ${stat}`)
              doc.moveDown(0.5)
            })
          } else if (type === 'treatments') {
            const stats = [
              `إجمالي العلاجات: ${reportData.totalTreatments || 0}`,
              `العلاجات المكتملة: ${reportData.completedTreatments || 0}`,
              `العلاجات المخططة: ${reportData.plannedTreatments || 0}`,
              `العلاجات قيد التنفيذ: ${reportData.inProgressTreatments || 0}`,
              `إجمالي الإيرادات: $${reportData.totalRevenue || 0}`,
              `معدل الإنجاز: ${reportData.completionRate || 0}%`,
              `العلاجات الآجلة: ${reportData.pendingTreatments?.length || 0}`,
              `العلاجات المتأخرة: ${reportData.overdueTreatments?.length || 0}`
            ]

            stats.forEach(stat => {
              doc.text(`• ${stat}`)
              doc.moveDown(0.5)
            })
          }
        }

        // Footer
        doc.moveDown(3)
        doc.fontSize(10)
        doc.text('Generated by Dental Clinic Management System', { align: 'center' })

        doc.end()

        // Wait for PDF to be generated
        await new Promise(resolve => {
          doc.on('end', () => {
            content = Buffer.concat(chunks)
            isBuffer = true
            resolve()
          })
        })

      } catch (error) {
        console.error('PDF generation error:', error)
        // Fallback to simple text format with DD/MM/YYYY date format
        content = `Report: ${type} - Modern Dental Clinic\n`
        // Format date as DD/MM/YYYY (Gregorian calendar)
        const fallbackDate = (() => {
          const date = new Date()
          const day = date.getDate().toString().padStart(2, '0')
          const month = (date.getMonth() + 1).toString().padStart(2, '0')
          const year = date.getFullYear()
          return `${day}/${month}/${year}`
        })()
        content += `Report Date: ${fallbackDate}\n`
        content += `${'='.repeat(50)}\n\n`

        if (reportData && type === 'overview') {
          content += 'Comprehensive Report Summary:\n\n'
          content += `• Total Patients: ${reportData.patients?.totalPatients || 0}\n`
          content += `• New Patients This Month: ${reportData.patients?.newPatientsThisMonth || 0}\n`
          content += `• Total Appointments: ${reportData.appointments?.totalAppointments || 0}\n`
          content += `• Completed Appointments: ${reportData.appointments?.completedAppointments || 0}\n`
          content += `• Total Revenue: $${reportData.financial?.totalRevenue || 0}\n`
          content += `• Pending Payments: $${reportData.financial?.pendingPayments || 0}\n`
          content += `• Inventory Items: ${reportData.inventory?.totalItems || 0}\n`
          content += `• Low Stock Alerts: ${reportData.inventory?.lowStockItems || 0}\n`
        }
      }
    } else if (options.format === 'excel') {
      // Real Excel export using ExcelJS
      try {
        const ExcelJS = require('exceljs')
        const workbook = new ExcelJS.Workbook()

        // Set workbook properties
        workbook.creator = 'Dental Clinic Management System'
        workbook.created = new Date()
        workbook.modified = new Date()

        const worksheet = workbook.addWorksheet(`Report_${type}`)

        // Header
        worksheet.mergeCells('A1:C1')
        const headerCell = worksheet.getCell('A1')
        headerCell.value = `Report ${type} - Modern Dental Clinic`
        headerCell.font = { size: 16, bold: true }
        headerCell.alignment = { horizontal: 'center' }

        // Date with DD/MM/YYYY format
        const excelDate = (() => {
          const date = new Date()
          const day = date.getDate().toString().padStart(2, '0')
          const month = (date.getMonth() + 1).toString().padStart(2, '0')
          const year = date.getFullYear()
          return `${day}/${month}/${year}`
        })()
        worksheet.getCell('A3').value = `Report Date: ${excelDate}`
        worksheet.getCell('A3').font = { size: 12 }

        // Headers
        let row = 5
        worksheet.getCell(`A${row}`).value = 'Indicator'
        worksheet.getCell(`B${row}`).value = 'Value'
        worksheet.getCell(`C${row}`).value = 'Description'

        // Style headers
        worksheet.getRow(row).font = { bold: true }
        worksheet.getRow(row).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        }

        row++

        if (reportData) {
          if (type === 'overview') {
            const data = [
              ['Total Patients', reportData.patients?.totalPatients || 0, 'Total number of registered patients'],
              ['New Patients', reportData.patients?.newPatientsThisMonth || 0, 'New patients this month'],
              ['Total Appointments', reportData.appointments?.totalAppointments || 0, 'All scheduled appointments'],
              ['Completed Appointments', reportData.appointments?.completedAppointments || 0, 'Successfully completed appointments'],
              ['Total Revenue', `$${reportData.financial?.totalRevenue || 0}`, 'Total revenue generated'],
              ['Pending Payments', `$${reportData.financial?.pendingPayments || 0}`, 'Outstanding payments'],
              ['Inventory Items', reportData.inventory?.totalItems || 0, 'Total inventory items'],
              ['Stock Alerts', reportData.inventory?.lowStockItems || 0, 'Items requiring restocking']
            ]

            data.forEach(([indicator, value, description]) => {
              worksheet.getCell(`A${row}`).value = indicator
              worksheet.getCell(`B${row}`).value = value
              worksheet.getCell(`C${row}`).value = description
              row++
            })
          } else if (type === 'patients') {
            const data = [
              ['Total Patients', reportData.totalPatients || 0, 'Total number of patients'],
              ['New Patients This Month', reportData.newPatientsThisMonth || 0, 'New registrations this month'],
              ['Active Patients', reportData.activePatients || 0, 'Currently active patients'],
              ['Average Age', `${reportData.averageAge || 0} years`, 'Average patient age']
            ]

            data.forEach(([indicator, value, description]) => {
              worksheet.getCell(`A${row}`).value = indicator
              worksheet.getCell(`B${row}`).value = value
              worksheet.getCell(`C${row}`).value = description
              row++
            })
          } else if (type === 'appointments') {
            const data = [
              ['Total Appointments', reportData.totalAppointments || 0, 'All appointments scheduled'],
              ['Completed Appointments', reportData.completedAppointments || 0, 'Successfully completed'],
              ['Cancelled Appointments', reportData.cancelledAppointments || 0, 'Cancelled appointments'],
              ['Attendance Rate', `${reportData.attendanceRate || 0}%`, 'Patient attendance percentage']
            ]

            data.forEach(([indicator, value, description]) => {
              worksheet.getCell(`A${row}`).value = indicator
              worksheet.getCell(`B${row}`).value = value
              worksheet.getCell(`C${row}`).value = description
              row++
            })
          } else if (type === 'financial') {
            const data = [
              ['Total Revenue', `$${reportData.totalRevenue || 0}`, 'Total revenue generated'],
              ['Completed Payments', `$${reportData.completedPayments || 0}`, 'Successfully collected payments'],
              ['Pending Payments', `$${reportData.pendingPayments || 0}`, 'Outstanding payments'],
              ['Overdue Payments', `$${reportData.overduePayments || 0}`, 'Overdue payment amounts']
            ]

            data.forEach(([indicator, value, description]) => {
              worksheet.getCell(`A${row}`).value = indicator
              worksheet.getCell(`B${row}`).value = value
              worksheet.getCell(`C${row}`).value = description
              row++
            })
          } else if (type === 'inventory') {
            const data = [
              ['Total Items', reportData.totalItems || 0, 'Total inventory items'],
              ['Total Value', `${reportData.totalValue || 0} SAR`, 'Total inventory value'],
              ['Low Stock Items', reportData.lowStockItems || 0, 'Items with low stock'],
              ['Expired Items', reportData.expiredItems || 0, 'Expired inventory items']
            ]

            data.forEach(([indicator, value, description]) => {
              worksheet.getCell(`A${row}`).value = indicator
              worksheet.getCell(`B${row}`).value = value
              worksheet.getCell(`C${row}`).value = description
              row++
            })
          }
        }

        // Auto-fit columns
        worksheet.columns.forEach(column => {
          column.width = 25
        })

        content = await workbook.xlsx.writeBuffer()
        isBuffer = true
      } catch (error) {
        console.error('Excel generation error:', error)
        // Fallback to TSV format with DD/MM/YYYY date format
        content = '\uFEFF' // BOM for UTF-8 support
        content += `Report ${type} - Modern Dental Clinic\n`
        // Format date as DD/MM/YYYY (Gregorian calendar)
        const tsvDate = (() => {
          const date = new Date()
          const day = date.getDate().toString().padStart(2, '0')
          const month = (date.getMonth() + 1).toString().padStart(2, '0')
          const year = date.getFullYear()
          return `${day}/${month}/${year}`
        })()
        content += `Report Date: ${tsvDate}\n\n`

        if (reportData) {
          content += 'Indicator\tValue\tDescription\n'
          if (type === 'overview') {
            content += `Total Patients\t${reportData.patients?.totalPatients || 0}\tTotal number of registered patients\n`
            content += `New Patients\t${reportData.patients?.newPatientsThisMonth || 0}\tNew patients this month\n`
            content += `Total Appointments\t${reportData.appointments?.totalAppointments || 0}\tAll scheduled appointments\n`
            content += `Completed Appointments\t${reportData.appointments?.completedAppointments || 0}\tSuccessfully completed appointments\n`
            content += `Total Revenue\t$${reportData.financial?.totalRevenue || 0}\tTotal revenue generated\n`
            content += `Pending Payments\t$${reportData.financial?.pendingPayments || 0}\tOutstanding payments\n`
            content += `Inventory Items\t${reportData.inventory?.totalItems || 0}\tTotal inventory items\n`
            content += `Stock Alerts\t${reportData.inventory?.lowStockItems || 0}\tItems requiring restocking\n`
          }
        }
      }
    }

    // Validate content
    if (!content || (typeof content === 'string' && content.trim().length === 0) || (isBuffer && content.byteLength === 0)) {
      throw new Error('لا توجد بيانات للتصدير')
    }

    // Write file
    if (isBuffer) {
      await fs.promises.writeFile(filePath, Buffer.from(content))
    } else {
      await fs.promises.writeFile(filePath, content, 'utf8')
    }

    // Verify file was created
    const stats = await fs.promises.stat(filePath)
    if (stats.size === 0) {
      throw new Error('فشل في كتابة الملف')
    }

    // Optionally open the file after export
    try {
      const { shell } = require('electron')
      await shell.openPath(filePath)
    } catch (error) {
      console.log('Could not open file automatically:', error.message)
    }

    return {
      success: true,
      message: `تم تصدير التقرير بنجاح (${Math.round(stats.size / 1024)} KB)`,
      filePath: filePath,
      fileSize: stats.size
    }
  } catch (error) {
    console.error('Error exporting report:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'فشل في تصدير التقرير'
    }
  }
})

// File serving IPC Handlers
ipcMain.handle('files:getDentalImage', async (_, imagePath) => {
  try {
    console.log('Getting dental image:', imagePath)
    const fs = require('fs')
    const path = require('path')

    // Helper function to load and return image
    const loadImage = (fullPath) => {
      const imageBuffer = fs.readFileSync(fullPath)
      const base64 = imageBuffer.toString('base64')

      // Determine MIME type based on file extension
      const ext = path.extname(fullPath).toLowerCase()
      let mimeType = 'image/jpeg' // default

      switch (ext) {
        case '.png':
          mimeType = 'image/png'
          break
        case '.gif':
          mimeType = 'image/gif'
          break
        case '.webp':
          mimeType = 'image/webp'
          break
        case '.bmp':
          mimeType = 'image/bmp'
          break
        case '.jpg':
        case '.jpeg':
        default:
          mimeType = 'image/jpeg'
          break
      }

      return `data:${mimeType};base64,${base64}`
    }

    // Check if imagePath is a directory path (new format: dental_images/patient_id/tooth_number/image_type/)
    if (imagePath.endsWith('/')) {
      console.log('Directory path detected, searching for images in:', imagePath)

      // Search for images in the directory
      // Check if we're in development mode
      const isDevelopment = process.env.NODE_ENV === 'development' ||
                           process.execPath.includes('node') ||
                           process.execPath.includes('electron') ||
                           process.cwd().includes('dental-clinic')

      let baseDir
      if (isDevelopment) {
        // Development: use project directory
        baseDir = process.cwd()
      } else {
        // Production: use app directory
        baseDir = path.dirname(process.execPath)
      }

      const searchPaths = [
        path.join(baseDir, imagePath), // Primary directory
        path.join(app.getPath('userData'), imagePath), // UserData (fallback)
        path.join(__dirname, '..', 'public', 'upload', imagePath) // Development fallback
      ]

      for (const searchPath of searchPaths) {
        if (fs.existsSync(searchPath)) {
          console.log('Searching in directory:', searchPath)

          try {
            const files = fs.readdirSync(searchPath)
            const imageFiles = files.filter(file => {
              const ext = path.extname(file).toLowerCase()
              return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
            })

            if (imageFiles.length > 0) {
              // Return the most recent image found
              const imageFile = imageFiles.sort().reverse()[0]
              const fullImagePath = path.join(searchPath, imageFile)
              console.log('Found image in directory:', fullImagePath)
              return loadImage(fullImagePath)
            }
          } catch (dirError) {
            console.warn('Error reading directory:', searchPath, dirError.message)
          }
        }
      }
    } else {
      // Legacy handling for full file paths
      // Check if we're in development mode
      const isDevelopment = process.env.NODE_ENV === 'development' ||
                           process.execPath.includes('node') ||
                           process.execPath.includes('electron') ||
                           process.cwd().includes('dental-clinic')

      let baseDir
      if (isDevelopment) {
        // Development: use project directory
        baseDir = process.cwd()
      } else {
        // Production: use userData directory for consistency
        baseDir = app.getPath('userData')
      }

      const possiblePaths = [
        path.join(baseDir, imagePath), // Primary directory
        path.join(process.cwd(), imagePath), // Project directory (fallback)
        path.join(app.getPath('userData'), imagePath), // UserData (fallback)
        path.join(__dirname, '..', 'public', 'upload', imagePath), // Development fallback
        path.join(__dirname, '..', imagePath)
      ]

      for (const fullPath of possiblePaths) {
        if (fs.existsSync(fullPath)) {
          console.log('Found image at path:', fullPath)
          return loadImage(fullPath)
        }
      }

      // Try old structure compatibility
      const oldPathMatch = imagePath.match(/dental_images\/([^\/]+)\/(\d+)\/(.+)/)
      if (oldPathMatch) {
        const [, patientId, toothNumber, fileName] = oldPathMatch
        const oldUserDataPath = path.join(app.getPath('userData'), 'dental_images', patientId, toothNumber, fileName)
        if (fs.existsSync(oldUserDataPath)) {
          console.log('Found image at old structure path:', oldUserDataPath)
          return loadImage(oldUserDataPath)
        }
      }
    }

    console.warn('Image not found at any path:', imagePath)
    throw new Error(`Image not found: ${imagePath}`)
  } catch (error) {
    console.error('Error getting dental image:', error)
    throw error
  }
})

ipcMain.handle('files:checkImageExists', async (_, imagePath) => {
  try {
    const fs = require('fs')
    const path = require('path')

    // Check if imagePath is a directory path (new format: dental_images/patient_id/tooth_number/image_type/)
    if (imagePath.endsWith('/')) {
      // Search for any images in the directory
      const searchPaths = [
        path.join(app.getPath('userData'), imagePath),
        path.join(__dirname, '..', 'public', 'upload', imagePath)
      ]

      for (const searchPath of searchPaths) {
        if (fs.existsSync(searchPath)) {
          try {
            const files = fs.readdirSync(searchPath)
            const imageFiles = files.filter(file => {
              const ext = path.extname(file).toLowerCase()
              return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
            })

            if (imageFiles.length > 0) {
              return true
            }
          } catch (dirError) {
            // Continue to next path
          }
        }
      }
    } else {
      // Legacy handling for full file paths
      const possiblePaths = [
        path.join(app.getPath('userData'), imagePath),
        path.join(__dirname, '..', 'public', 'upload', imagePath),
        path.join(__dirname, '..', imagePath)
      ]

      for (const fullPath of possiblePaths) {
        if (fs.existsSync(fullPath)) {
          return true
        }
      }

      // Check old structure for backward compatibility
      const oldPathMatch = imagePath.match(/dental_images\/([^\/]+)\/(\d+)\/(.+)/)
      if (oldPathMatch) {
        const [, patientId, toothNumber, fileName] = oldPathMatch
        const oldUserDataPath = path.join(app.getPath('userData'), 'dental_images', patientId, toothNumber, fileName)
        return fs.existsSync(oldUserDataPath)
      }
    }

    return false
  } catch (error) {
    console.error('Error checking image exists:', error)
    return false
  }
})

// Image preview handler
ipcMain.handle('files:openImagePreview', async (_, imagePath) => {
  try {
    console.log('Opening image preview for:', imagePath)
    const { shell } = require('electron')
    const fs = require('fs')
    const path = require('path')

    // Helper function to find the actual image path
    const findImagePath = (imagePath) => {
      // If it's a directory path, find the first image in it
      if (!path.extname(imagePath) || imagePath.endsWith('/')) {
        // Check if we're in development mode
        const isDevelopment = process.env.NODE_ENV === 'development' ||
                             process.execPath.includes('node') ||
                             process.execPath.includes('electron') ||
                             process.cwd().includes('dental-clinic')

        let baseDir
        if (isDevelopment) {
          // Development: use project directory
          baseDir = process.cwd()
        } else {
          // Production: use userData directory for consistency
          baseDir = app.getPath('userData')
        }

        const searchPaths = [
          // 1. Project directory (development/production)
          path.join(baseDir, imagePath.endsWith('/') ? imagePath : imagePath + '/'),
          // 2. User data directory
          path.join(app.getPath('userData'), imagePath.endsWith('/') ? imagePath : imagePath + '/'),
          // 3. Public upload directory
          path.join(__dirname, '..', 'public', 'upload', imagePath.endsWith('/') ? imagePath : imagePath + '/')
        ]

        console.log('Searching for images in paths:', searchPaths)

        for (const searchPath of searchPaths) {
          if (fs.existsSync(searchPath)) {
            try {
              const files = fs.readdirSync(searchPath)
              const imageFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase()
                return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
              })

              if (imageFiles.length > 0) {
                // Return the first image found (or you could return the most recent)
                const imageFile = imageFiles.sort().reverse()[0] // Get most recent by name
                const fullImagePath = path.join(searchPath, imageFile)
                console.log('Found image:', fullImagePath)
                return fullImagePath
              }
            } catch (dirError) {
              console.warn('Error reading directory:', searchPath, dirError.message)
            }
          } else {
            console.log('Directory does not exist:', searchPath)
          }
        }
      } else {
        // Legacy handling for full file paths
        const possiblePaths = [
          // 1. Project directory
          path.join(process.cwd(), imagePath),
          // 2. New structure: userData/dental_images/patient_id/tooth_number/image_type/filename
          path.join(app.getPath('userData'), imagePath),
          // 3. Fallback structure: public/upload/dental_images/patient_id/tooth_number/image_type/filename
          path.join(__dirname, '..', 'public', 'upload', imagePath),
          // 4. Direct absolute path
          path.isAbsolute(imagePath) ? imagePath : null
        ].filter(Boolean) // Remove null values

        // Try each path until we find the image
        for (const fullPath of possiblePaths) {
          if (fs.existsSync(fullPath)) {
            return fullPath
          }
        }
      }

      return null
    }

    const actualImagePath = findImagePath(imagePath)

    if (actualImagePath && fs.existsSync(actualImagePath)) {
      console.log('Opening image at path:', actualImagePath)
      await shell.openPath(actualImagePath)
    } else {
      console.error('Image not found for preview:', imagePath)
      throw new Error(`Image not found: ${imagePath}`)
    }
  } catch (error) {
    console.error('Error opening image preview:', error)
    throw error
  }
})

// File Upload Handler for Dental Images
ipcMain.handle('files:uploadDentalImage', async (_, fileBuffer, fileName, patientId, toothNumber, imageType, patientName, toothName) => {
  try {
    console.log('Uploading dental image:', { fileName, patientId, toothNumber, imageType, patientName, toothName, bufferSize: fileBuffer.byteLength })

    const fs = require('fs')
    const path = require('path')

    // Validate required parameters
    if (!patientId || !toothNumber || !imageType) {
      throw new Error('Missing required parameters: patientId, toothNumber, or imageType')
    }

    // Validate tooth number (FDI numbering system)
    const isValidToothNumber = (
      (toothNumber >= 11 && toothNumber <= 18) ||
      (toothNumber >= 21 && toothNumber <= 28) ||
      (toothNumber >= 31 && toothNumber <= 38) ||
      (toothNumber >= 41 && toothNumber <= 48) ||
      (toothNumber >= 51 && toothNumber <= 55) ||
      (toothNumber >= 61 && toothNumber <= 65) ||
      (toothNumber >= 71 && toothNumber <= 75) ||
      (toothNumber >= 81 && toothNumber <= 85)
    )

    if (!isValidToothNumber) {
      throw new Error('Invalid tooth number. Must be a valid FDI tooth number (11-18, 21-28, 31-38, 41-48, 51-55, 61-65, 71-75, 81-85)')
    }

    // Create upload directory organized by patient_id/tooth_number/image_type
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development' ||
                         process.execPath.includes('node') ||
                         process.execPath.includes('electron') ||
                         process.cwd().includes('dental-clinic')

    let baseDir
    if (isDevelopment) {
      // Development: use project directory
      baseDir = process.cwd()
    } else {
      // Production: use userData directory for better permissions and consistency
      baseDir = app.getPath('userData')
    }

    const uploadDir = path.join(baseDir, 'dental_images', patientId, toothNumber.toString(), imageType || 'other')
    console.log('Upload directory:', uploadDir)
    console.log('Base directory:', baseDir)
    console.log('Is development:', isDevelopment)

    if (!fs.existsSync(uploadDir)) {
      try {
        fs.mkdirSync(uploadDir, { recursive: true })
        console.log('Created upload directory:', uploadDir)
      } catch (mkdirError) {
        console.error('Failed to create upload directory:', mkdirError.message)
        throw new Error(`Failed to create upload directory: ${mkdirError.message}`)
      }
    }

    // Generate meaningful filename with original name and timestamp
    const extension = path.extname(fileName) || '.jpg'
    const timestamp = Date.now()
    const baseName = path.basename(fileName, extension)

    // Clean filename to remove invalid characters
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9\u0600-\u06FF\s\-_]/g, '').replace(/\s+/g, '_')

    // Create filename: originalname-timestamp.extension
    const meaningfulFileName = `${cleanBaseName || 'image'}-${timestamp}${extension}`
    const filePath = path.join(uploadDir, meaningfulFileName)

    console.log('Saving file to:', filePath)
    console.log('Generated filename:', meaningfulFileName)
    console.log('Patient ID:', patientId)
    console.log('Tooth number:', toothNumber)
    console.log('Image type:', imageType)

    // Convert ArrayBuffer to Buffer and write file to disk
    const buffer = Buffer.from(fileBuffer)
    fs.writeFileSync(filePath, buffer)

    // Return relative path for database storage (WITH filename)
    const relativePath = `dental_images/${patientId}/${toothNumber}/${imageType}/${meaningfulFileName}`
    console.log('Dental image uploaded successfully:', relativePath)

    return relativePath
  } catch (error) {
    console.error('Error uploading dental image:', error)
    throw error
  }
})

// Alternative simpler upload handler
ipcMain.handle('files:saveDentalImage', async (_, base64Data, fileName, patientId, toothNumber, imageType, patientName, toothName) => {
  try {
    console.log('Saving dental image (base64):', { fileName, patientId, toothNumber, imageType, patientName, toothName })

    const fs = require('fs')
    const path = require('path')

    // Validate required parameters
    if (!patientId || !toothNumber || !imageType) {
      throw new Error('Missing required parameters: patientId, toothNumber, or imageType')
    }

    // Validate tooth number (FDI numbering system)
    const isValidToothNumber = (
      (toothNumber >= 11 && toothNumber <= 18) ||
      (toothNumber >= 21 && toothNumber <= 28) ||
      (toothNumber >= 31 && toothNumber <= 38) ||
      (toothNumber >= 41 && toothNumber <= 48) ||
      (toothNumber >= 51 && toothNumber <= 55) ||
      (toothNumber >= 61 && toothNumber <= 65) ||
      (toothNumber >= 71 && toothNumber <= 75) ||
      (toothNumber >= 81 && toothNumber <= 85)
    )

    if (!isValidToothNumber) {
      throw new Error('Invalid tooth number. Must be a valid FDI tooth number (11-18, 21-28, 31-38, 41-48, 51-55, 61-65, 71-75, 81-85)')
    }

    // Create upload directory organized by patient_id/tooth_number/image_type (fallback)
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development' ||
                         process.execPath.includes('node') ||
                         process.execPath.includes('electron') ||
                         process.cwd().includes('dental-clinic')

    let baseDir
    if (isDevelopment) {
      // Development: use project directory
      baseDir = process.cwd()
    } else {
      // Production: use userData directory for better permissions and consistency
      baseDir = app.getPath('userData')
    }

    const uploadDir = path.join(baseDir, 'dental_images', patientId, toothNumber.toString(), imageType || 'other')
    console.log('Upload directory:', uploadDir)
    console.log('Base directory:', baseDir)
    console.log('Is development:', isDevelopment)

    if (!fs.existsSync(uploadDir)) {
      try {
        fs.mkdirSync(uploadDir, { recursive: true })
        console.log('Created upload directory:', uploadDir)
      } catch (mkdirError) {
        console.error('Failed to create upload directory:', mkdirError.message)
        throw new Error(`Failed to create upload directory: ${mkdirError.message}`)
      }
    }

    // Generate meaningful filename with original name and timestamp
    const extension = path.extname(fileName) || '.jpg'
    const timestamp = Date.now()
    const baseName = path.basename(fileName, extension)

    // Clean filename to remove invalid characters
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9\u0600-\u06FF\s\-_]/g, '').replace(/\s+/g, '_')

    // Create filename: originalname-timestamp.extension
    const meaningfulFileName = `${cleanBaseName || 'image'}-${timestamp}${extension}`
    const filePath = path.join(uploadDir, meaningfulFileName)

    console.log('Saving file to (fallback):', filePath)
    console.log('Generated filename:', meaningfulFileName)
    console.log('Patient ID:', patientId)
    console.log('Tooth number:', toothNumber)
    console.log('Image type:', imageType)

    // Remove data URL prefix if present
    const base64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '')

    // Write file to disk
    fs.writeFileSync(filePath, base64, 'base64')

    // Return relative path for database storage (WITH filename)
    const relativePath = `dental_images/${patientId}/${toothNumber}/${imageType}/${meaningfulFileName}`
    console.log('Dental image saved successfully:', relativePath)

    return relativePath
  } catch (error) {
    console.error('Error saving dental image:', error)
    throw error
  }
})

// Smart Alerts IPC Handlers
ipcMain.handle('db:smartAlerts:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllSmartAlerts()
    } else {
      console.log('Getting smart alerts (mock)')
      return []
    }
  } catch (error) {
    console.error('Error getting all smart alerts:', error)
    throw error
  }
})

ipcMain.handle('db:smartAlerts:create', async (_, alert) => {
  try {
    if (databaseService) {
      console.log('Creating smart alert:', alert.title)
      const result = await databaseService.createSmartAlert(alert)
      if (result) {
        console.log('Smart alert created successfully:', result.id)
        return result
      } else {
        console.log('Smart alert creation skipped (duplicate found):', alert.title)
        return null
      }
    } else {
      const newAlert = { ...alert, id: Date.now().toString() }
      console.log('Creating smart alert (mock):', newAlert)
      return newAlert
    }
  } catch (error) {
    console.error('Error creating smart alert:', error)
    throw error
  }
})

ipcMain.handle('db:smartAlerts:update', async (_, id, updates) => {
  try {
    if (databaseService) {
      console.log('Updating smart alert:', id, updates)
      const result = await databaseService.updateSmartAlert(id, updates)
      console.log('Smart alert updated successfully:', id)
      return result
    } else {
      console.log('Updating smart alert (mock):', id, updates)
      return true
    }
  } catch (error) {
    console.error('Error updating smart alert:', error)
    throw error
  }
})

ipcMain.handle('db:smartAlerts:delete', async (_, id) => {
  try {
    if (databaseService) {
      console.log('Deleting smart alert:', id)
      const result = await databaseService.deleteSmartAlert(id)
      console.log('Smart alert deleted successfully:', id)
      return result
    } else {
      console.log('Deleting smart alert (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting smart alert:', error)
    throw error
  }
})

ipcMain.handle('db:smartAlerts:getById', async (_, id) => {
  try {
    if (databaseService) {
      return await databaseService.getSmartAlertById(id)
    } else {
      console.log('Getting smart alert by id (mock):', id)
      return null
    }
  } catch (error) {
    console.error('Error getting smart alert by id:', error)
    throw error
  }
})

ipcMain.handle('db:smartAlerts:clearDismissed', async () => {
  try {
    if (databaseService) {
      console.log('Clearing dismissed smart alerts')
      const result = await databaseService.clearDismissedAlerts()
      console.log('Dismissed smart alerts cleared:', result)
      return result
    } else {
      console.log('Clearing dismissed smart alerts (mock)')
      return 0
    }
  } catch (error) {
    console.error('Error clearing dismissed smart alerts:', error)
    throw error
  }
})

ipcMain.handle('db:smartAlerts:clearExpiredSnoozed', async () => {
  try {
    if (databaseService) {
      console.log('Clearing expired snoozed smart alerts')
      const result = await databaseService.clearExpiredSnoozedAlerts()
      console.log('Expired snoozed smart alerts cleared:', result)
      return result
    } else {
      console.log('Clearing expired snoozed smart alerts (mock)')
      return 0
    }
  } catch (error) {
    console.error('Error clearing expired snoozed smart alerts:', error)
    throw error
  }
})

ipcMain.handle('db:smartAlerts:deleteByPatient', async (_, patientId) => {
  try {
    if (databaseService) {
      console.log('Deleting smart alerts for patient:', patientId)
      const result = await databaseService.deleteSmartAlertsByPatient(patientId)
      console.log('Smart alerts deleted for patient:', patientId, 'count:', result)
      return result
    } else {
      console.log('Deleting smart alerts for patient (mock):', patientId)
      return 0
    }
  } catch (error) {
    console.error('Error deleting smart alerts for patient:', error)
    throw error
  }
})

ipcMain.handle('db:smartAlerts:deleteByType', async (_, type, patientId = null) => {
  try {
    if (databaseService) {
      console.log('Deleting smart alerts by type:', type, 'for patient:', patientId)
      const result = await databaseService.deleteSmartAlertsByType(type, patientId)
      console.log('Smart alerts deleted by type:', type, 'count:', result)
      return result
    } else {
      console.log('Deleting smart alerts by type (mock):', type, patientId)
      return 0
    }
  } catch (error) {
    console.error('Error deleting smart alerts by type:', error)
    throw error
  }
})

ipcMain.handle('db:smartAlerts:deleteByRelatedData', async (_, relatedDataKey, relatedDataValue) => {
  try {
    if (databaseService) {
      console.log('Deleting smart alerts by related data:', relatedDataKey, relatedDataValue)
      const result = await databaseService.deleteSmartAlertsByRelatedData(relatedDataKey, relatedDataValue)
      console.log('Smart alerts deleted by related data:', relatedDataKey, relatedDataValue, 'count:', result)
      return result
    } else {
      console.log('Deleting smart alerts by related data (mock):', relatedDataKey, relatedDataValue)
      return 0
    }
  } catch (error) {
    console.error('Error deleting smart alerts by related data:', error)
    throw error
  }
})

// Clinic Expenses IPC Handlers
ipcMain.handle('db:clinicExpenses:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllClinicExpenses()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting all clinic expenses:', error)
    throw error
  }
})

ipcMain.handle('db:clinicExpenses:create', async (_, expense) => {
  try {
    if (databaseService) {
      console.log('Creating clinic expense:', expense)
      const result = await databaseService.createClinicExpense(expense)
      console.log('Clinic expense created successfully:', result.id)
      return result
    } else {
      const newExpense = { ...expense, id: Date.now().toString() }
      console.log('Creating clinic expense (mock):', newExpense)
      return newExpense
    }
  } catch (error) {
    console.error('Error creating clinic expense:', error)
    throw error
  }
})

ipcMain.handle('db:clinicExpenses:update', async (_, id, expense) => {
  try {
    if (databaseService) {
      console.log('Updating clinic expense:', id, expense)
      const result = await databaseService.updateClinicExpense(id, expense)
      console.log('Clinic expense updated successfully:', id)
      return result
    } else {
      const updatedExpense = { ...expense, id }
      console.log('Updating clinic expense (mock):', updatedExpense)
      return updatedExpense
    }
  } catch (error) {
    console.error('Error updating clinic expense:', error)
    throw error
  }
})

ipcMain.handle('db:clinicExpenses:delete', async (_, id) => {
  try {
    if (databaseService) {
      console.log('Deleting clinic expense:', id)
      const result = await databaseService.deleteClinicExpense(id)
      console.log('Clinic expense deleted successfully:', id)
      return result
    } else {
      console.log('Deleting clinic expense (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting clinic expense:', error)
    throw error
  }
})

ipcMain.handle('db:clinicExpenses:search', async (_, query) => {
  try {
    if (databaseService) {
      return await databaseService.searchClinicExpenses(query)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error searching clinic expenses:', error)
    throw error
  }
})

ipcMain.handle('db:clinicExpenses:getByType', async (_, expenseType) => {
  try {
    if (databaseService) {
      return await databaseService.getClinicExpensesByType(expenseType)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting clinic expenses by type:', error)
    throw error
  }
})

ipcMain.handle('db:clinicExpenses:getByStatus', async (_, status) => {
  try {
    if (databaseService) {
      return await databaseService.getClinicExpensesByStatus(status)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting clinic expenses by status:', error)
    throw error
  }
})

ipcMain.handle('db:clinicExpenses:getRecurring', async () => {
  try {
    if (databaseService) {
      return await databaseService.getRecurringExpenses()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting recurring clinic expenses:', error)
    throw error
  }
})

ipcMain.handle('db:clinicExpenses:getStatistics', async () => {
  try {
    if (databaseService) {
      const expenses = await databaseService.getAllClinicExpenses()

      // Calculate statistics
      const totalExpenses = expenses.length
      const totalAmount = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
      const paidAmount = expenses
        .filter(expense => expense.status === 'paid')
        .reduce((sum, expense) => sum + (expense.amount || 0), 0)
      const pendingAmount = expenses
        .filter(expense => expense.status === 'pending')
        .reduce((sum, expense) => sum + (expense.amount || 0), 0)
      const overdueAmount = expenses
        .filter(expense => expense.status === 'overdue')
        .reduce((sum, expense) => sum + (expense.amount || 0), 0)
      const recurringExpenses = expenses.filter(expense => expense.is_recurring).length

      // Group by type
      const expensesByType = expenses.reduce((acc, expense) => {
        acc[expense.expense_type] = (acc[expense.expense_type] || 0) + (expense.amount || 0)
        return acc
      }, {})

      // Group by status
      const expensesByStatus = expenses.reduce((acc, expense) => {
        acc[expense.status] = (acc[expense.status] || 0) + (expense.amount || 0)
        return acc
      }, {})

      return {
        totalExpenses,
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount,
        recurringExpenses,
        expensesByType,
        expensesByStatus
      }
    } else {
      return {
        totalExpenses: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        recurringExpenses: 0,
        expensesByType: {},
        expensesByStatus: {}
      }
    }
  } catch (error) {
    console.error('Error getting clinic expenses statistics:', error)
    throw error
  }
})


