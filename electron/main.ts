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
let whatsAppService = null

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
    title: 'DORalSoft',
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
            : "default-src 'self' 'unsafe-inline' data: blob: https://fonts.googleapis.com https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://api.qrserver.com; font-src 'self' https://fonts.gstatic.com;"
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
  })

  mainWindow.on('closed', () => {
    mainWindow = null
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

    // Initialize critical services only (lazy load heavy services)
    console.log('🚀 Starting critical services initialization...')

    // Initialize database service asynchronously with lazy loading
    initializeDatabaseService().catch(error => {
      console.error('❌ Critical database service initialization failed:', error)
    })

    // Initialize other heavy services lazily with staggered loading
    setTimeout(() => {
      initializeHeavyServices().catch(error => {
        console.error('❌ Heavy services initialization failed:', error)
      })
    }, 500) // Reduced delay to 500ms for faster startup

    // Initialize WhatsApp service when app is ready
    initializeWhatsAppService().catch(error => {
      console.error('❌ WhatsApp service initialization failed:', error)
    })

    // Listen for WhatsApp QR events and forward them to renderer
    const { ipcMain } = require('electron')
    ipcMain.on('whatsapp:qr', (event, qr) => {
      console.log('📱 Main: Received QR event, forwarding to renderer:', qr.substring(0, 50) + '...')
      // Forward QR to all renderer windows
      BrowserWindow.getAllWindows().forEach(window => {
        if (window.webContents && !window.webContents.isDestroyed()) {
          window.webContents.send('whatsapp:qr', qr)
        }
      })
    })

    // Listen for WhatsApp ready events
    ipcMain.on('whatsapp:ready', (event, data) => {
      console.log('📱 Main: WhatsApp client is ready')
      BrowserWindow.getAllWindows().forEach(window => {
        if (window.webContents && !window.webContents.isDestroyed()) {
          window.webContents.send('whatsapp:ready', data)
        }
      })
    })

    // Listen for WhatsApp auth failure events
    ipcMain.on('whatsapp:auth_failure', (event, data) => {
      console.log('📱 Main: WhatsApp authentication failed')
      BrowserWindow.getAllWindows().forEach(window => {
        if (window.webContents && !window.webContents.isDestroyed()) {
          window.webContents.send('whatsapp:auth_failure', data)
        }
      })
    })

    // Listen for WhatsApp session cleared events
    ipcMain.on('whatsapp:session_cleared', (event, data) => {
      console.log('📱 Main: WhatsApp session cleared')
      BrowserWindow.getAllWindows().forEach(window => {
        if (window.webContents && !window.webContents.isDestroyed()) {
          window.webContents.send('whatsapp:session_cleared', data)
        }
      })
    })

    // Listen for WhatsApp connection failure events
    ipcMain.on('whatsapp:connection_failure', (event, data) => {
      console.log('📱 Main: WhatsApp connection failure')
      BrowserWindow.getAllWindows().forEach(window => {
        if (window.webContents && !window.webContents.isDestroyed()) {
          window.webContents.send('whatsapp:connection_failure', data)
        }
      })
    })

    // Listen for WhatsApp initialization failure events
    ipcMain.on('whatsapp:init_failure', (event, data) => {
      console.log('📱 Main: WhatsApp initialization failure')
      BrowserWindow.getAllWindows().forEach(window => {
        if (window.webContents && !window.webContents.isDestroyed()) {
          window.webContents.send('whatsapp:init_failure', data)
        }
      })
    })

    // Listen for WhatsApp session auto-cleared events (for 401 errors)
    ipcMain.on('whatsapp:session_auto_cleared', (event, data) => {
      console.log('📱 Main: WhatsApp session auto-cleared due to 401 error')
      BrowserWindow.getAllWindows().forEach(window => {
        if (window.webContents && !window.webContents.isDestroyed()) {
          window.webContents.send('whatsapp:session_auto_cleared', data)
        }
      })
    })

    // WhatsApp reminders aliases for renderer API
    ipcMain.handle('whatsapp-reminders:set-settings', async (_event, newSettings) => {
      try {
        console.log('🔧 Main: Handling whatsapp-reminders:set-settings request with payload:', newSettings);

        // Log all payload properties
        console.log('🔧 Payload details:', {
          whatsapp_reminder_enabled: newSettings.whatsapp_reminder_enabled,
          hours_before: newSettings.hours_before,
          minutes_before: newSettings.minutes_before,
          message: newSettings.message,
          custom_enabled: newSettings.custom_enabled
        });

        if (databaseService) {
          try {
            const currentSettings = await databaseService.getSettings();
            console.log('🔧 Current settings from database:', currentSettings);

            // Calculate minutes from hours if minutes not provided
            const minutesBefore = newSettings.minutes_before !== undefined ? newSettings.minutes_before :
              (newSettings.hours_before !== undefined ? newSettings.hours_before * 60 : 180);

            const updatedSettings = {
              ...currentSettings,
              whatsapp_reminder_enabled: newSettings.whatsapp_reminder_enabled !== undefined ? newSettings.whatsapp_reminder_enabled : currentSettings.whatsapp_reminder_enabled,
              whatsapp_reminder_hours_before: newSettings.hours_before !== undefined ? newSettings.hours_before : currentSettings.whatsapp_reminder_hours_before,
              whatsapp_reminder_minutes_before: minutesBefore,
              whatsapp_reminder_message: newSettings.message !== undefined ? newSettings.message : currentSettings.whatsapp_reminder_message,
              whatsapp_reminder_custom_enabled: newSettings.custom_enabled !== undefined ? newSettings.custom_enabled : currentSettings.whatsapp_reminder_custom_enabled,
            };

            console.log('🔧 Updated settings to save:', updatedSettings);

            await databaseService.updateSettings(updatedSettings);

            // Verify the update was successful
            const verifySettings = await databaseService.getSettings();
            console.log('🔍 Verification - settings after update:', verifySettings);

            // console.log('✅ WhatsApp settings saved successfully');
            return { success: true, settings: verifySettings };
          } catch (dbError) {
            console.error('❌ Database error while saving WhatsApp settings:', dbError);
            return { success: false, error: 'Database error: ' + dbError.message };
          }
        } else {
          console.error('❌ Database service not available');
          return { success: false, error: 'Database service not available' };
        }
      } catch (error) {
        console.error('❌ Error saving WhatsApp settings:', error);
        return { success: false, error: error.message || 'Failed to save WhatsApp settings' };
      }
    });

    ipcMain.handle('whatsapp-reminders:get-settings', async () => {
      try {
        if (databaseService) {
          const settings = await databaseService.getSettings();
          console.log('🔧 Main: Retrieved settings from databaseService.getSettings():', settings);

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

          console.log('🔧 Main: Returning WhatsApp settings:', result);
          return result;
        } else {
          console.warn('🔧 Main: databaseService not available, returning default WhatsApp reminder settings.');
          return {
            whatsapp_reminder_enabled: 0,
            hours_before: 3,
            minutes_before: 180,
            message: '',
            custom_enabled: 0,
          };
        }
      } catch (error) {
        console.error('❌ Error getting WhatsApp settings:', error);
        return {
          whatsapp_reminder_enabled: 0,
          hours_before: 3,
          minutes_before: 180,
          message: '',
          custom_enabled: 0,
          error: 'Failed to load settings'
        };
      }
    });

    // Debug handler for testing IPC communication and database access
    ipcMain.handle('debug:test-whatsapp-handler', async () => {
      console.log('🔧 Main: DEBUG - debug:test-whatsapp-handler called successfully')
      return {
        success: true,
        message: 'IPC communication is working',
        timestamp: new Date().toISOString(),
        handlerRegistered: true
      }
    })

    // Lab Orders IPC Handlers
    ipcMain.handle('db:labOrders:getAll', async () => {
      try {
        console.log('🔧 Main: Handling db:labOrders:getAll request')
        
        // Wait for database service to be available
        let attempts = 0
        const maxAttempts = 10
        while (!databaseService && attempts < maxAttempts) {
          console.log(`⏳ Waiting for database service... (attempt ${attempts + 1}/${maxAttempts})`)
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
        
        if (!databaseService) {
          console.error('❌ Database service not available after waiting')
          return []
        }
        
        const labOrders = await databaseService.getAllLabOrders()
        console.log(`✅ Retrieved ${labOrders.length} lab orders`)
        return labOrders
      } catch (error) {
        console.error('❌ Error getting lab orders:', error)
        return []
      }
    })

    ipcMain.handle('db:labOrders:getByPatient', async (_event, patientId) => {
      try {
        console.log('🔧 Main: Handling db:labOrders:getByPatient request for patient:', patientId)
        
        // Wait for database service to be available
        let attempts = 0
        const maxAttempts = 10
        while (!databaseService && attempts < maxAttempts) {
          console.log(`⏳ Waiting for database service... (attempt ${attempts + 1}/${maxAttempts})`)
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
        
        if (!databaseService) {
          console.error('❌ Database service not available after waiting')
          return []
        }
        
        const labOrders = await databaseService.getLabOrdersByPatient(patientId)
        console.log(`✅ Retrieved ${labOrders.length} lab orders for patient ${patientId}`)
        return labOrders
      } catch (error) {
        console.error('❌ Error getting lab orders by patient:', error)
        return []
      }
    })

    ipcMain.handle('db:labOrders:create', async (_event, labOrderData) => {
      try {
        console.log('🔧 Main: Handling db:labOrders:create request with data:', labOrderData)
        console.log('🔧 Main: Event details:', {
          eventType: _event.type,
          senderId: _event.sender.id,
          frameId: _event.frameId
        })
        console.log('🔧 Main: Data validation:', {
          hasLabId: !!labOrderData.lab_id,
          hasServiceName: !!labOrderData.service_name,
          hasCost: typeof labOrderData.cost === 'number' && labOrderData.cost > 0,
          hasOrderDate: !!labOrderData.order_date,
          dataType: typeof labOrderData,
          keys: Object.keys(labOrderData),
          labOrderData: labOrderData
        })
        
        // Validate required fields
        if (!labOrderData.lab_id) {
          throw new Error('Lab ID is required')
        }
        if (!labOrderData.service_name) {
          throw new Error('Service name is required')
        }
        if (!labOrderData.cost || labOrderData.cost <= 0) {
          throw new Error('Valid cost is required')
        }
        if (!labOrderData.order_date) {
          throw new Error('Order date is required')
        }
        
        // Wait for database service to be available
        let attempts = 0
        const maxAttempts = 10
        while (!databaseService && attempts < maxAttempts) {
          console.log(`⏳ Waiting for database service... (attempt ${attempts + 1}/${maxAttempts})`)
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
        
        if (!databaseService) {
          console.error('❌ Database service not available after waiting')
          throw new Error('Database service not available')
        }
        
        console.log('✅ Database service is available, creating lab order...')
        console.log('🔍 Lab order data validation:', {
          lab_id: labOrderData.lab_id,
          service_name: labOrderData.service_name,
          cost: labOrderData.cost,
          status: labOrderData.status,
          hasRequiredFields: !!(labOrderData.lab_id && labOrderData.service_name && labOrderData.cost)
        })
        
        console.log('🔧 Main: About to call databaseService.createLabOrder...')
        const newLabOrder = await databaseService.createLabOrder(labOrderData)
        console.log('✅ Lab order created successfully:', newLabOrder.id)
        console.log('✅ Lab order details:', newLabOrder)
        return newLabOrder
      } catch (error) {
        console.error('❌ Error creating lab order:', error)
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace',
          name: error instanceof Error ? error.name : 'Unknown',
          type: typeof error,
          labOrderData: labOrderData
        })
        
        // Create a serializable error object
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Failed to create lab order in main process'
        
        const serializableError = {
          message: errorMessage,
          name: error instanceof Error ? error.name : 'Error',
          stack: error instanceof Error ? error.stack : undefined,
          type: typeof error
        }
        
        console.error('❌ Throwing serializable error:', serializableError)
        throw serializableError
      }
    })

    ipcMain.handle('db:labOrders:update', async (_event, id, labOrderData) => {
      try {
        console.log('🔧 Main: Handling db:labOrders:update request for ID:', id)
        
        // Wait for database service to be available
        let attempts = 0
        const maxAttempts = 10
        while (!databaseService && attempts < maxAttempts) {
          console.log(`⏳ Waiting for database service... (attempt ${attempts + 1}/${maxAttempts})`)
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
        
        if (!databaseService) {
          console.error('❌ Database service not available after waiting')
          throw new Error('Database service not available')
        }
        
        const updatedLabOrder = await databaseService.updateLabOrder(id, labOrderData)
        console.log('✅ Lab order updated successfully:', id)
        return updatedLabOrder
      } catch (error) {
        console.error('❌ Error updating lab order:', error)
        throw error
      }
    })

    ipcMain.handle('db:labOrders:delete', async (_event, id) => {
      try {
        console.log('🔧 Main: Handling db:labOrders:delete request for ID:', id)
        
        // Wait for database service to be available
        let attempts = 0
        const maxAttempts = 10
        while (!databaseService && attempts < maxAttempts) {
          console.log(`⏳ Waiting for database service... (attempt ${attempts + 1}/${maxAttempts})`)
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
        
        if (!databaseService) {
          console.error('❌ Database service not available after waiting')
          return false
        }
        
        await databaseService.deleteLabOrder(id)
        console.log('✅ Lab order deleted successfully:', id)
        return true
      } catch (error) {
        console.error('❌ Error deleting lab order:', error)
        return false
      }
    })

    ipcMain.handle('db:labOrders:search', async (_event, query) => {
      try {
        console.log('🔧 Main: Handling db:labOrders:search request with query:', query)
        
        // Wait for database service to be available
        let attempts = 0
        const maxAttempts = 10
        while (!databaseService && attempts < maxAttempts) {
          console.log(`⏳ Waiting for database service... (attempt ${attempts + 1}/${maxAttempts})`)
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
        
        if (!databaseService) {
          console.error('❌ Database service not available after waiting')
          return []
        }
        
        const labOrders = await databaseService.searchLabOrders(query)
        console.log(`✅ Found ${labOrders.length} lab orders matching query`)
        return labOrders
      } catch (error) {
        console.error('❌ Error searching lab orders:', error)
        return []
      }
    })

    // WhatsApp service handlers
    ipcMain.handle('whatsapp-reminders:reset-session', async () => {
      try {
        console.log('🔧 Main: Handling whatsapp-reminders:reset-session request')

        // Ensure WhatsApp service is initialized
        if (!global.whatsappClient) {
          await initializeWhatsAppService()
        }

        if (global.whatsappClient) {
          const { resetSession } = require('./services/whatsapp.ts')
          await resetSession()
          return { success: true, message: 'WhatsApp session reset successfully' }
        } else {
          return { success: false, error: 'WhatsApp service not initialized' }
        }
      } catch (error) {
        console.error('❌ Error resetting WhatsApp session:', error)
        return { success: false, error: error.message || 'Failed to reset session' }
      }
    })

    ipcMain.handle('whatsapp-reminders:get-status', async () => {
      try {
        console.log('🔧 Main: Handling whatsapp-reminders:get-status request')

        if (global.whatsappClient) {
          const { getIsReady, getLastQr, getLastReadyAt } = require('./services/whatsapp.ts')

          const status = {
            isReady: getIsReady(),
            hasQr: !!getLastQr(),
            qr: getLastQr(),
            lastReadyAt: getLastReadyAt(),
            state: getIsReady() ? 'connected' : 'disconnected'
          }

          console.log('🔧 Main: Returning WhatsApp status:', status)
          return status
        } else {
          return {
            isReady: false,
            hasQr: false,
            qr: null,
            lastReadyAt: null,
            state: 'disconnected'
          }
        }
      } catch (error) {
        console.error('❌ Error getting WhatsApp status:', error)
        return {
          isReady: false,
          hasQr: false,
          qr: null,
          lastReadyAt: null,
          state: 'error'
        }
      }
    })

    ipcMain.handle('whatsapp-reminders:test-send', async (_event, phoneNumber, message) => {
      try {
        console.log('🔧 Main: Handling whatsapp-reminders:test-send request')

        if (global.whatsappClient) {
          const { sendMessage } = require('./services/whatsapp.ts')
          await sendMessage(phoneNumber, message)
          return { success: true, message: 'Test message sent successfully' }
        } else {
          return { success: false, error: 'WhatsApp service not initialized' }
        }
      } catch (error) {
        console.error('❌ Error sending test message:', error)
        return { success: false, error: error.message || 'Failed to send test message' }
      }
    })

    ipcMain.handle('whatsapp-reminders:logout-other-devices', async () => {
      try {
        console.log('🔧 Main: Handling whatsapp-reminders:logout-other-devices request')

        if (global.whatsappClient) {
          const { getClient } = require('./services/whatsapp.ts')
          const sock = getClient()

          if (!sock) {
            return { success: false, error: 'WhatsApp client not initialized' }
          }

          // Use Baileys logout function
          await sock.logout()
          return { success: true, message: 'Logged out from other devices successfully' }
        } else {
          return { success: false, error: 'WhatsApp service not initialized' }
        }
      } catch (error) {
        console.error('❌ Error logging out from other devices:', error)
        return { success: false, error: error.message || 'Failed to logout from other devices' }
      }
    })

    // Run diagnostic
    ipcMain.handle('whatsapp-reminders:run-diagnostic', async () => {
      try {
        console.log('🔧 Main: Running WhatsApp diagnostic')

        if (global.whatsappClient) {
          const { getIsReady, getLastQr } = require('./services/whatsapp.ts')

          const diagnostic = {
            isReady: getIsReady(),
            hasQr: !!getLastQr(),
            sessionPath: app.getPath('userData') + '/baileys-session',
            lastQrTimestamp: getLastQr() ? new Date().toISOString() : null,
            timestamp: new Date().toISOString()
          }

          console.log('🔧 Main: Diagnostic result:', diagnostic)
          return diagnostic
        } else {
          return {
            isReady: false,
            hasQr: false,
            sessionPath: app.getPath('userData') + '/baileys-session',
            lastQrTimestamp: null,
            timestamp: new Date().toISOString(),
            error: 'WhatsApp service not initialized'
          }
        }
      } catch (error) {
        console.error('❌ Error running diagnostic:', error)
        return { success: false, error: error.message || 'Failed to run diagnostic' }
      }
    })

    // Run scheduler once
    ipcMain.handle('whatsapp-reminders:run-scheduler-once', async () => {
      try {
        console.log('🔧 Main: Running WhatsApp scheduler once')

        if (global.whatsappClient) {
          // Import and use WhatsApp reminder scheduler
          const { runSchedulerOnce } = require('./services/whatsappReminderScheduler.js')

          // Run scheduler once
          await runSchedulerOnce()

          return { success: true, message: 'Scheduler run completed' }
        } else {
          return { success: false, error: 'WhatsApp service not initialized' }
        }
      } catch (error) {
        console.error('❌ Error running scheduler once:', error)
        return { success: false, error: error.message || 'Failed to run scheduler' }
      }
    })

    // Generate new QR code
    ipcMain.handle('whatsapp-reminders:generate-new-qr', async () => {
      try {
        console.log('🔧 Main: Handling whatsapp-reminders:generate-new-qr request')

        // Ensure WhatsApp service is initialized
        if (!global.whatsappClient) {
          console.log('🔧 Main: WhatsApp client not available, initializing...')
          await initializeWhatsAppService()
        }

        if (global.whatsappClient) {
          const { generateNewQR } = require('./services/whatsapp.ts')
          const result = await generateNewQR()

          console.log('🔧 Main: QR generation result:', result)

          // Return the detailed result from generateNewQR function
          return {
            success: result.success,
            message: result.success ? 'QR code generated successfully' : (result.error || 'Failed to generate QR code'),
            timestamp: Date.now(),
            details: result.details || {},
            error: result.error || null
          }
        } else {
          console.error('🔧 Main: WhatsApp service still not available after initialization')
          return {
            success: false,
            error: 'WhatsApp service failed to initialize',
            timestamp: Date.now(),
            details: {
              type: 'ServiceNotInitialized',
              code: 'SERVICE_UNAVAILABLE'
            }
          }
        }
      } catch (error: any) {
        console.error('❌ Error generating new QR:', error)
        return {
          success: false,
          error: error?.message || 'Failed to generate QR code',
          timestamp: Date.now(),
          details: {
            type: error?.constructor?.name || 'Unknown',
            code: error?.code || 'N/A',
            stack: error?.stack?.substring(0, 500) || 'No stack trace'
          }
        }
      }
    })

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

// Lazy loading functions for better startup performance
async function initializeDatabaseService() {
  console.log('🚀 Starting database service initialization...')
  try {
    console.log('📦 Importing DatabaseService...')
    const { DatabaseService } = require('../src/services/databaseService.js')
    console.log('✅ DatabaseService imported successfully')

    // Initialize SQLite database service
    const dbPath = join(app.getPath('userData'), 'dental_clinic.db')
    console.log('🗄️ Database will be created at:', dbPath)

    // Ensure userData directory exists
    const userDataPath = app.getPath('userData')
    console.log('📁 User data path:', userDataPath)

    const fs = require('fs')
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
      console.log('✅ Created userData directory:', userDataPath)
    }

    console.log('🏗️ Creating DatabaseService instance...')
    try {
      databaseService = new DatabaseService()
      console.log('✅ DatabaseService instance created successfully')

      // Initialize database asynchronously to ensure WhatsApp tables are created
      console.log('🔄 Initializing database asynchronously...')
      if (databaseService && typeof databaseService.initializeAsync === 'function') {
        databaseService.initializeAsync()
          .then(() => {
            console.log('✅ Database async initialization completed successfully')
          })
          .catch((initError) => {
            console.error('❌ Database async initialization failed:', initError)
          })
      } else {
        console.warn('⚠️ DatabaseService does not have initializeAsync method')
      }
    } catch (dbError: any) {
      console.error('❌ Failed to create DatabaseService instance:', dbError.message)
      console.error('Stack trace:', dbError.stack)
      databaseService = null
    }

    // Check if database file was created
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath)
      console.log('📊 Database file exists, size:', stats.size, 'bytes')
    } else {
      console.log('❌ Database file was not created')
    }

    console.log('✅ SQLite database service initialized successfully')

  } catch (error) {
    console.error('❌ Failed to initialize database service:', error)
    console.error('Error details:', error.message)
    console.error('Stack trace:', error.stack)
    databaseService = null
  }

  console.log('📋 Final database service status:', databaseService ? 'ACTIVE' : 'NULL')
}

async function initializeHeavyServices() {
  console.log('🚀 Initializing heavy services (lazy loaded)...')

  try {
    // Initialize backup service
    if (!backupService) {
      console.log('📦 Importing BackupService...')
      const { BackupService } = require('../src/services/backupService.js')
      backupService = new BackupService()
      console.log('✅ BackupService initialized')
    }

    // Initialize reports service
    if (!reportsService) {
      console.log('📦 Importing ReportsService...')
      const { ReportsService } = require('../src/services/reportsService.js')
      reportsService = new ReportsService()
      console.log('✅ ReportsService initialized')
    }

    // Initialize other heavy services as needed
    console.log('✅ All heavy services initialized successfully')

  } catch (error) {
    console.error('❌ Failed to initialize heavy services:', error)
    console.error('Error details:', error.message)
  }
}

async function initializeWhatsAppService() {
  console.log('🚀 Initializing WhatsApp service (lazy loaded)...')

  try {
    // Import WhatsApp service modules
    console.log('📦 Importing WhatsApp service modules...')
    const { initializeClient, getClient, getIsReady, getLastQr } = require('./services/whatsapp.ts')

    // Initialize the WhatsApp client
    console.log('🔄 Initializing WhatsApp client...')
    await initializeClient()

    console.log('✅ WhatsApp service initialized successfully')

    // Make functions available globally for IPC handlers
    global.whatsappClient = {
      getClient,
      getIsReady,
      getLastQr,
      initializeClient
    }

  } catch (error) {
    console.error('❌ Failed to initialize WhatsApp service:', error)
    console.error('Error details:', error.message)
    global.whatsappClient = null
  }
}
