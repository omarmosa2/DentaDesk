import {
  default as makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { app, BrowserWindow } from 'electron';
import * as fs from 'fs';
import { pino } from 'pino';

let sock: any = null; // Baileys socket instance
let lastQr: string | null = null;
let isReady = false;
let lastReadyAt: number | null = null;
let initializationAttempts = 0;
const MAX_INITIALIZATION_ATTEMPTS = 5;
let isInitializing = false; // Flag to prevent multiple concurrent initializations

const sessionPath = app.getPath('userData') + '/baileys-session';

export async function initializeClient(): Promise<void> {
  if (isInitializing) {
    console.log('⏳ WhatsApp client initialization already in progress, skipping.');
    return;
  }

  isInitializing = true;
  initializationAttempts++;
  console.log(`🚀 Initializing WhatsApp client with Baileys (attempt ${initializationAttempts}/${MAX_INITIALIZATION_ATTEMPTS})...`);

  // Skip WhatsApp initialization if already initialized and ready
  if (sock && isReady) {
    console.log('✅ WhatsApp client already initialized and ready.');
    isInitializing = false;
    return;
  }

  // Clean up any existing socket before reinitializing
  if (sock) {
    try {
      console.log('🧹 Cleaning up existing WhatsApp socket...');
      sock.end();
      sock = null;
    } catch (error) {
      console.warn('⚠️ Error cleaning up existing socket:', error);
    }
  }

  try {
    // Check if session path exists and create it if needed
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
      console.log('✅ Created session directory:', sessionPath);
    }

    console.log('📱 Checking session files...');
    const sessionFiles = fs.readdirSync(sessionPath);
    console.log('📁 Session files found:', sessionFiles.length > 0 ? sessionFiles : 'None');

    // Create auth state
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    // Create Baileys socket with enhanced configuration
    sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
      },
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: Browsers.macOS('Desktop'),
      generateHighQualityLinkPreview: true,
      // Add connection timeout and retry options
      connectTimeoutMs: 20000,
    });

    // Handle QR code generation
    sock.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      console.log('🔄 Connection update:', {
        connection,
        hasQr: !!qr,
        hasError: !!lastDisconnect?.error,
        errorCode: lastDisconnect?.error?.output?.statusCode,
        errorMessage: lastDisconnect?.error?.message
      });

      if (qr) {
        lastQr = qr;
        console.log('📱 QR RECEIVED (length:', qr.length, '):', qr.substring(0, 50) + '...');

        // Validate QR code before sending
        if (!qr || qr.trim().length === 0) {
          console.error('❌ Invalid QR code received (empty or null)');
          return;
        }

        // Send QR code as string directly (not as data URL)
        BrowserWindow.getAllWindows().forEach(window => {
          if (window.webContents && !window.webContents.isDestroyed()) {
            try {
              window.webContents.send('whatsapp:qr', qr);
              console.log('✅ QR sent to window:', window.id);
            } catch (error) {
              console.error('❌ Failed to send QR to window:', window.id, error);
            }
          }
        });

        // Also send to main process for forwarding
        try {
          const { ipcMain } = require('electron');
          if (ipcMain) {
            ipcMain.emit('whatsapp:qr', null, qr);
          }
        } catch (error) {
          console.warn('⚠️ Could not forward QR to main process:', error);
        }
      }

      if (connection === 'close') {
        const error = lastDisconnect?.error;
        const errorCode = error?.output?.statusCode;
        const errorMessage = error?.message || 'Unknown error';

        console.log('🔴 Connection closed:');
        console.log('  - Error Code:', errorCode);
        console.log('  - Error Message:', errorMessage);
        console.log('  - Full Error:', error);

        // Enhanced error analysis for 401 Unauthorized
        if (errorCode === 401) {
          console.error('🚨 CRITICAL: 401 Unauthorized error detected!');
          console.error('🔍 DIAGNOSIS:');
          console.error('  1. WhatsApp session is invalid or expired');
          console.error('  2. Multi-device authentication conflict');
          console.error('  3. Logged out from another device');
          console.error('  4. Session files corrupted or outdated');
          console.error('');
          console.error('🛠️ SOLUTION:');
          console.error('  - Clear session data and generate new QR');
          console.error('  - Ensure no other WhatsApp sessions are active');
          console.error('  - Try logging out from WhatsApp Web on other devices');

          // Auto-clear session on 401 error to force fresh authentication
          console.log('🔄 Auto-clearing session due to 401 error...');
          try {
            clearSessionData();
            console.log('✅ Session cleared automatically due to 401 error');

            // Notify renderer about auto-clear
            BrowserWindow.getAllWindows().forEach(window => {
              if (window.webContents && !window.webContents.isDestroyed()) {
                try {
                  window.webContents.send('whatsapp:session_auto_cleared', {
                    message: 'Session auto-cleared due to 401 Unauthorized error. Please scan QR code again.',
                    timestamp: Date.now(),
                    reason: '401_unauthorized'
                  });
                } catch (sendError) {
                  console.error('❌ Failed to send session auto-cleared event:', sendError);
                }
              }
            });
          } catch (clearError) {
            console.error('❌ Failed to auto-clear session:', clearError);
          }
        }

        const shouldReconnect = (error instanceof Boom)
          ? error.output.statusCode !== DisconnectReason.loggedOut
          : true;

        console.log('🔄 Should reconnect:', shouldReconnect);

        if (shouldReconnect) {
          console.log('🔄 Connection lost, attempting to reconnect...');
          isReady = false;
          lastQr = null;
          isInitializing = false;

          // Send connection failure event with detailed error info
          BrowserWindow.getAllWindows().forEach(window => {
            if (window.webContents && !window.webContents.isDestroyed()) {
              try {
                window.webContents.send('whatsapp:connection_failure', {
                  message: `Connection failed: ${errorMessage}`,
                  errorCode,
                  timestamp: Date.now(),
                  shouldRetry: true
                });
              } catch (error) {
                console.error('❌ Failed to send connection failure event:', error);
              }
            }
          });

          attemptReinitialization();
        } else {
          console.log('📱 Logged out from WhatsApp');
          isReady = false;
          lastQr = null;

          // Send auth failure event
          BrowserWindow.getAllWindows().forEach(window => {
            if (window.webContents && !window.webContents.isDestroyed()) {
              try {
                window.webContents.send('whatsapp:auth_failure', {
                  message: 'Logged out from WhatsApp',
                  timestamp: Date.now()
                });
              } catch (error) {
                console.error('❌ Failed to send auth failure event:', error);
              }
            }
          });
          isInitializing = false;
        }
      } else if (connection === 'open') {
        isReady = true;
        lastReadyAt = Date.now();
        console.log('✅ WhatsApp Client is READY!');
        console.log('📊 Connection established successfully at:', new Date(lastReadyAt).toISOString());

        // Send ready event to all windows
        BrowserWindow.getAllWindows().forEach(window => {
          if (window.webContents && !window.webContents.isDestroyed()) {
            try {
              window.webContents.send('whatsapp:ready', {
                timestamp: lastReadyAt,
                message: 'WhatsApp client is ready for sending messages'
              });
              console.log('✅ Ready event sent to window:', window.id);
            } catch (error) {
              console.error('❌ Failed to send ready event to window:', window.id, error);
            }
          }
        });

        // Also send connected event for backward compatibility
        BrowserWindow.getAllWindows().forEach(window => {
          if (window.webContents && !window.webContents.isDestroyed()) {
            try {
              window.webContents.send('whatsapp:session:connected', {
                message: 'تم ربط واتساب بنجاح',
                timestamp: lastReadyAt
              });
              console.log('✅ Connected event sent to window:', window.id);
            } catch (error) {
              console.error('❌ Failed to send connected event to window:', window.id, error);
            }
          }
        });

        isInitializing = false;
        initializationAttempts = 0;
      }
    });

    // Handle credential updates
    sock.ev.on('creds.update', saveCreds);

    console.log('✅ WhatsApp client initialized successfully with Baileys');

  } catch (error: any) {
    console.error('❌ WhatsApp client initialization failed:');
    console.error('  - Error Type:', error?.constructor?.name || 'Unknown');
    console.error('  - Error Message:', error?.message || 'Unknown error');
    console.error('  - Error Code:', error?.code || 'N/A');
    console.error('  - Stack Trace:', error?.stack || 'No stack trace');

    // Check for common error patterns
    if (error?.message) {
      if (error.message.includes('401')) {
        console.error('🚨 401 Authorization Error - Session may be invalid');
      }
      if (error.message.includes('timeout')) {
        console.error('⏱️ Connection Timeout - Network issues detected');
      }
      if (error.message.includes('ECONNRESET') || error.message.includes('ENOTFOUND')) {
        console.error('🌐 Network Error - Check internet connection');
      }
      if (error.message.includes('session')) {
        console.error('🔐 Session Error - May need to re-authenticate');
      }
    }

    // Log diagnostic information
    console.log('📊 Diagnostic Info at failure:');
    console.log('  - Session Path:', sessionPath);
    console.log('  - Session Exists:', fs.existsSync(sessionPath));
    if (fs.existsSync(sessionPath)) {
      try {
        const files = fs.readdirSync(sessionPath);
        console.log('  - Session Files:', files);
      } catch (fsError) {
        console.log('  - Session Files: Unable to read directory');
      }
    }
    console.log('  - Initialization Attempts:', initializationAttempts);

    isReady = false;
    lastQr = null;
    isInitializing = false;

    // Send initialization failure event to renderer
    BrowserWindow.getAllWindows().forEach(window => {
      if (window.webContents && !window.webContents.isDestroyed()) {
        try {
          window.webContents.send('whatsapp:init_failure', {
            message: `Initialization failed: ${error?.message || 'Unknown error'}`,
            errorCode: error?.code,
            timestamp: Date.now(),
            attempts: initializationAttempts
          });
        } catch (sendError) {
          console.error('❌ Failed to send init failure event:', sendError);
        }
      }
    });

    // Attempt to reinitialize only if we haven't exceeded max attempts
    if (initializationAttempts < MAX_INITIALIZATION_ATTEMPTS) {
      console.log('🔄 Attempting to reinitialize after failure...');
      attemptReinitialization();
    } else {
      console.error('❌ Max initialization attempts reached. Manual intervention required.');
      // Clear session and notify user
      clearSessionData();
    }

    throw error;
  }
}

// Function to attempt re-initialization with exponential backoff
function attemptReinitialization() {
  if (initializationAttempts < MAX_INITIALIZATION_ATTEMPTS) {
    const delay = Math.pow(2, initializationAttempts) * 1000; // Exponential backoff (2s, 4s, 8s, etc.)
    console.log(`⏳ Retrying WhatsApp client initialization in ${delay / 1000} seconds (attempt ${initializationAttempts + 1}/${MAX_INITIALIZATION_ATTEMPTS})...`);

    setTimeout(async () => {
      try {
        isInitializing = false; // Reset flag before retry
        await initializeClient();
      } catch (error) {
        console.error('❌ Retry initialization failed:', error);
      }
    }, delay);
  } else {
    console.error(`❌ Maximum WhatsApp client initialization attempts reached (${MAX_INITIALIZATION_ATTEMPTS}). Clearing session data and notifying user.`);
    clearSessionData(); // Clear session if max attempts reached

    // Notify user about the failure
    BrowserWindow.getAllWindows().forEach(window => {
      if (window.webContents && !window.webContents.isDestroyed()) {
        try {
          window.webContents.send('whatsapp:auth_failure', {
            message: 'Maximum initialization attempts reached. Please try again later.',
            timestamp: Date.now()
          });
        } catch (error) {
          console.error('❌ Failed to send auth failure notification:', error);
        }
      }
    });
  }
}

export function getClient(): any {
  return sock;
}

export function getLastQr(): string | null {
  return lastQr;
}

export function getIsReady(): boolean {
  return isReady;
}

export function getLastReadyAt(): number | null {
  return lastReadyAt;
}

// Function to clear WhatsApp session data
export function clearSessionData(): void {
  console.log('🧹 Clearing WhatsApp session data...');

  if (sock) {
    try {
      sock.end();
      sock = null;
      console.log('✅ WhatsApp socket ended');
    } catch (e) {
      console.error('Error ending WhatsApp socket:', e);
    }
  }

  // Reset all state variables
  isReady = false;
  lastQr = null;
  initializationAttempts = 0;
  isInitializing = false;

  // Clear session files
  if (fs.existsSync(sessionPath)) {
    try {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log('✅ WhatsApp session directory cleared');
    } catch (e) {
      console.error('❌ Error clearing WhatsApp session directory:', e);
    }
  }

  // Inform renderer processes about session clear
  BrowserWindow.getAllWindows().forEach(window => {
    if (window.webContents && !window.webContents.isDestroyed()) {
      try {
        window.webContents.send('whatsapp:session_cleared', { timestamp: Date.now() });
        console.log('✅ Session cleared event sent to window:', window.id);
      } catch (error) {
        console.error('❌ Failed to send session cleared event to window:', window.id, error);
      }
    }
  });

  console.log('✅ WhatsApp session data fully cleared');
}

// Function to reinitialize connection (lighter than full reset)
async function reinitializeConnection(): Promise<void> {
  console.log('🔄 Reinitializing WhatsApp connection...');

  if (sock) {
    try {
      // Try to gracefully end the current connection
      sock.end();
      sock = null;
      console.log('✅ Previous socket connection ended');
    } catch (error) {
      console.warn('⚠️ Error ending previous socket:', error);
    }
  }

  // Reset state variables
  isReady = false;
  lastQr = null;

  // Small delay to ensure cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // Reinitialize the client
    await initializeClient();
    console.log('✅ WhatsApp connection reinitialized');
  } catch (error) {
    console.error('❌ Failed to reinitialize connection:', error);
    throw error;
  }
}

// Function to reset and reinitialize the session
export async function resetSession(): Promise<void> {
  console.log('🔄 Resetting WhatsApp session...');

  // Clear existing session
  clearSessionData();

  // Small delay to ensure cleanup is complete
  await new Promise(resolve => setTimeout(resolve, 500));

  // Reinitialize
  await initializeClient();

  console.log('✅ WhatsApp session reset completed');
}

// Enhanced diagnostic function for troubleshooting WhatsApp issues
export function getWhatsAppDiagnosticInfo(): any {
  return {
    isReady,
    isInitializing,
    lastQr: lastQr ? 'Present' : 'None',
    lastReadyAt,
    initializationAttempts,
    sessionPath,
    socketExists: !!sock,
    socketType: sock ? typeof sock : 'null',
    hasSendMessageMethod: sock ? typeof sock.sendMessage === 'function' : false,
    socketState: sock ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    environment: {
      platform: process.platform,
      nodeVersion: process.version,
      electronVersion: process.versions.electron
    }
  };
}

// Function to get WhatsApp status with detailed information
export function getWhatsAppStatus(): any {
  const diagnostic = getWhatsAppDiagnosticInfo();

  return {
    isReady: diagnostic.isReady,
    hasQr: !!diagnostic.lastQr && diagnostic.lastQr !== 'None',
    isConnected: diagnostic.socketExists,
    lastReadyAt: diagnostic.lastReadyAt,
    status: diagnostic.isReady ? 'Connected' : diagnostic.hasQr ? 'QR Required' : 'Disconnected',
    diagnostic: diagnostic
  };
}

// Function to force generate a new QR code
export async function generateNewQR(): Promise<{success: boolean, error?: string, details?: any}> {
  try {
    console.log('🔄 Forcing QR code generation...');

    // Clear any existing state
    lastQr = null;
    isReady = false;

    // Clean up existing socket
    if (sock) {
      try {
        console.log('🧹 Cleaning up existing socket...');
        sock.end();
        sock = null;
      } catch (cleanupError) {
        console.warn('⚠️ Error during socket cleanup:', cleanupError);
      }
    }

    // Clear session directory to force fresh authentication
    if (fs.existsSync(sessionPath)) {
      try {
        console.log('🗑️ Clearing session directory for fresh QR...');
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log('✅ Session directory cleared');
      } catch (sessionError) {
        console.warn('⚠️ Error clearing session directory:', sessionError);
      }
    }

    // Reset initialization attempts
    initializationAttempts = 0;
    isInitializing = false;

    // Create a fresh client
    console.log('🚀 Creating fresh WhatsApp client for QR generation...');
    await initializeClient();

    // Wait for QR code to be generated
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`⏳ Waiting for QR code (attempt ${attempts}/${maxAttempts})...`);

      await new Promise(resolve => setTimeout(resolve, 1000));

      if (lastQr) {
        console.log('✅ QR code generated successfully after', attempts, 'attempts');
        return { success: true };
      }
    }

    console.log('⚠️ QR code generation timeout - no QR received after', maxAttempts, 'attempts');
    return {
      success: false,
      error: 'QR code generation timeout - no QR received after maximum attempts',
      details: { maxAttempts, actualAttempts: attempts }
    };

  } catch (error: any) {
    console.error('❌ Failed to generate new QR:', error);
    console.error('Error details:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      code: error?.code || 'Unknown code'
    });

    return {
      success: false,
      error: error?.message || 'Unknown error',
      details: {
        type: error?.constructor?.name || 'Unknown',
        code: error?.code || 'N/A',
        stack: error?.stack?.substring(0, 500) || 'No stack trace'
      }
    };
  }
}

export async function sendMessage(phoneNumber: string, message: string, retryCount: number = 0): Promise<{ success: boolean; phoneNumber: string }> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  console.log(`📱 Attempting to send WhatsApp message (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

  // Enhanced connection state validation
  if (!sock) {
    console.error('❌ WhatsApp socket is null/undefined');
    throw new Error('WhatsApp client is not initialized.');
  }

  if (!isReady) {
    console.error('❌ WhatsApp client is not ready (isReady: false)');
    throw new Error('WhatsApp client is not ready.');
  }

  // Additional socket state checks
  if (typeof sock.sendMessage !== 'function') {
    console.error('❌ WhatsApp socket does not have sendMessage method');
    throw new Error('WhatsApp client is not properly initialized.');
  }

  // Validate phone number
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    throw new Error('Invalid phone number provided.');
  }

  // Validate message
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new Error('Invalid message provided.');
  }

  // Sanitize phone number
  const sanitizedNumber = phoneNumber.replace(/[-\s]/g, ''); // Remove dashes and spaces
  if (!sanitizedNumber || sanitizedNumber.length < 8) {
    throw new Error('Phone number is too short or invalid.');
  }

  const finalNumber = sanitizedNumber.startsWith('+') ? sanitizedNumber : `+${sanitizedNumber}`;

  try {
    console.log(`📱 Sending message to ${finalNumber}...`);

    // Send message using Baileys with timeout
    const sendPromise = sock.sendMessage(`${finalNumber}@s.whatsapp.net`, { text: message.trim() });

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Message send timeout')), 30000); // 30 second timeout
    });

    await Promise.race([sendPromise, timeoutPromise]);

    console.log(`✅ Message sent successfully to ${finalNumber}`);
    return { success: true, phoneNumber: finalNumber };
  } catch (error: any) {
    console.error(`❌ Failed to send message to ${finalNumber}:`, error);

    // Check if error is recoverable
    const isRecoverableError = (
      error.message &&
      (
        error.message.includes('attrs') ||
        error.message.includes('undefined') ||
        error.message.includes('Cannot read properties') ||
        error.message.includes('Connection lost') ||
        error.message.includes('timeout') ||
        error.message.includes('network') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ENOTFOUND')
      )
    );

    // Attempt retry if error is recoverable and we haven't exceeded max retries
    if (isRecoverableError && retryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying message send in ${RETRY_DELAY}ms (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`);

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

      // Attempt to reinitialize connection if this is not the first retry
      if (retryCount === 0) {
        console.log('🔄 Attempting to reinitialize WhatsApp connection...');
        try {
          await reinitializeConnection();
        } catch (reinitError) {
          console.warn('⚠️ Failed to reinitialize connection:', reinitError);
        }
      }

      // Retry the message
      return await sendMessage(phoneNumber, message, retryCount + 1);
    }

    // If retries exhausted or error is not recoverable, throw the error
    console.error(`❌ All retry attempts failed for ${finalNumber}`);
    throw new Error(`Failed to send WhatsApp message after ${retryCount + 1} attempts: ${error.message}`);
  }
}