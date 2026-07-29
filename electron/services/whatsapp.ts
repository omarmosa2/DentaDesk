import {
  default as makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  Browsers,
  fetchLatestBaileysVersion
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
let lastConnectionError: { code?: number; message?: string; at: string } | null = null;
const WHATSAPP_SERVICE_BUILD = 'baileys-rc14-qr35-pairing-code';
let suppressReconnectUntil = 0;

const sessionPath = app.getPath('userData') + '/baileys-session';

export async function initializeClient(): Promise<void> {
  if (isInitializing) {
    console.log('âڈ³ WhatsApp client initialization already in progress, skipping.');
    return;
  }

  isInitializing = true;
  initializationAttempts++;
  console.log(`ًںڑ€ Initializing WhatsApp client with Baileys (attempt ${initializationAttempts}/${MAX_INITIALIZATION_ATTEMPTS})...`);

  // Skip WhatsApp initialization if already initialized and ready
  if (sock && isReady) {
    console.log('âœ… WhatsApp client already initialized and ready.');
    isInitializing = false;
    return;
  }

  // Clean up any existing socket before reinitializing
  if (sock) {
    try {
      console.log('ًں§¹ Cleaning up existing WhatsApp socket...');
       suppressReconnectUntil = Date.now() + 15000;
      sock.end();
      sock = null;
    } catch (error) {
      console.warn('âڑ ï¸ڈ Error cleaning up existing socket:', error);
    }
  }

  try {
    // Check if session path exists and create it if needed
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
      console.log('âœ… Created session directory:', sessionPath);
    }

    console.log('ًں“± Checking session files...');
    const sessionFiles = fs.readdirSync(sessionPath);
    console.log('ًں“پ Session files found:', sessionFiles.length > 0 ? sessionFiles : 'None');

    // Create auth state
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    // Resolve the latest WA version to avoid handshake rejection after Baileys 7.x breaking change
    let waVersion: [number, number, number] = [2, 2414, 80];
    try {
      const fetched = await fetchLatestBaileysVersion();
      if (Array.isArray(fetched.version)) {
        waVersion = fetched.version as [number, number, number];
        console.log('ًں”„ Resolved latest WA version from Baileys:', waVersion.join('.'));
      }
    } catch (versionError) {
      console.warn('âڑ ï¸ڈ Failed to fetch latest WA version, using fallback', waVersion, versionError);
    }

    // Create Baileys socket with enhanced configuration for latest WhatsApp compatibility
    sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
      },
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      // Keep the fingerprint close to Baileys defaults; over-customizing can trigger early closes.
      browser: Browsers.macOS('Chrome'),
      generateHighQualityLinkPreview: false,
      connectTimeoutMs: 20000,
      qrTimeout: 60000,
      version: waVersion,
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 5,
      syncFullHistory: true,
      fireInitQueries: true,
      // Enhanced error handling
      shouldIgnoreJid: (jid) => false,
      // Additional configuration for better connection stability
      patchMessageBeforeSending: (message) => {
        // Ensure message compatibility
        return message;
      }
    });

    // Handle QR code generation
    sock.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      console.log('ًں”„ Connection update:', {
        connection,
        hasQr: !!qr,
        hasError: !!lastDisconnect?.error,
        errorCode: lastDisconnect?.error?.output?.statusCode,
        errorMessage: lastDisconnect?.error?.message
      });

      if (qr) {
        lastQr = qr;
        console.log('ًں“± QR RECEIVED (length:', qr.length, '):', qr.substring(0, 50) + '...');

        // Validate QR code before sending
        if (!qr || qr.trim().length === 0) {
          console.error('â‌Œ Invalid QR code received (empty or null)');
          return;
        }

        // Send QR code as string directly (not as data URL)
        BrowserWindow.getAllWindows().forEach(window => {
          if (window.webContents && !window.webContents.isDestroyed()) {
            try {
              window.webContents.send('whatsapp:qr', qr);
              console.log('âœ… QR sent to window:', window.id);
            } catch (error) {
              console.error('â‌Œ Failed to send QR to window:', window.id, error);
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
          console.warn('âڑ ï¸ڈ Could not forward QR to main process:', error);
        }

        // Set a timer to auto-mark as ready if QR is successfully scanned and connected
        // This helps with cases where the client never transitions to ready state
        setTimeout(() => {
          if (sock && !isReady && lastQr) {
            console.log('ًں”„ Auto-ready timer triggered - checking connection state...');

            // Check if we have a socket and it's not in an error state
            if (sock && typeof sock.sendMessage === 'function') {
              console.log('âœ… Auto-marking WhatsApp client as ready after QR timeout');
              isReady = true;
              lastReadyAt = Date.now();

              // Send ready event
              BrowserWindow.getAllWindows().forEach(window => {
                if (window.webContents && !window.webContents.isDestroyed()) {
                  try {
                    window.webContents.send('whatsapp:ready', {
                      timestamp: lastReadyAt,
                      message: 'WhatsApp client auto-marked as ready',
                      autoReady: true
                    });
                  } catch (error) {
                    console.error('â‌Œ Failed to send auto-ready event:', error);
                  }
                }
              });
            }
          }
        }, 30000); // 30 seconds after QR is received
      }

      if (connection === 'close') {
        const error = lastDisconnect?.error;
        const errorCode = error?.output?.statusCode;
        const errorMessage = error?.message || 'Unknown error';
        lastConnectionError = {
          code: errorCode,
          message: errorMessage,
          at: new Date().toISOString()
        };

        console.log('ًں”´ Connection closed:');
        console.log('  - Error Code:', errorCode);
        console.log('  - Error Message:', errorMessage);
        console.log('  - Full Error:', error);

        // Enhanced error analysis for common connection errors
        if (errorCode === 405) {
          console.error('ًںڑ¨ CRITICAL: 405 Method Not Allowed error detected!');
          console.error('ًں”چ DIAGNOSIS:');
          console.error('  1. WhatsApp WebSocket connection method not allowed');
          console.error('  2. Baileys version may be outdated or incompatible');
          console.error('  3. WhatsApp API endpoint changes');
          console.error('  4. Network/proxy issues blocking WebSocket connection');
          console.error('  5. Browser fingerprinting issues');
          console.error('');
          console.error('ًں› ï¸ڈ SOLUTION:');
          console.error('  - Updated Baileys to latest version');
          console.error('  - Changed browser config to macOS Desktop');
          console.error('  - Updated version to latest WhatsApp (2.24.14.80)');
          console.error('  - Enhanced connection configuration');
          console.error('  - Clear session and retry');

          // Enhanced 405 error handling with aggressive recovery strategy
          console.log('ًں”„ Enhanced 405 error handling - implementing aggressive recovery strategy...');

          try {
            // Use the specialized 405 error handler (without await in event handler)
            handle405Error().then((recoverySuccess) => {
              if (recoverySuccess) {
                console.log('âœ… 405 error recovery initiated successfully');

                // Notify renderer about recovery attempt
                BrowserWindow.getAllWindows().forEach(window => {
                  if (window.webContents && !window.webContents.isDestroyed()) {
                    try {
                      window.webContents.send('whatsapp:405_recovery_attempted', {
                        message: '405 Method Not Allowed error detected. Attempting aggressive recovery...',
                        timestamp: Date.now(),
                        recoveryMethod: 'aggressive_session_reset'
                      });
                    } catch (sendError) {
                      console.error('â‌Œ Failed to send recovery event:', sendError);
                    }
                  }
                });
              } else {
                console.error('â‌Œ 405 error recovery failed, using standard session clear');

                // Fallback to standard session clear
                clearSessionData();

                // Notify about fallback
                BrowserWindow.getAllWindows().forEach(window => {
                  if (window.webContents && !window.webContents.isDestroyed()) {
                    try {
                      window.webContents.send('whatsapp:session_auto_cleared', {
                        message: '405 recovery failed, session cleared. Please scan QR code again.',
                        timestamp: Date.now(),
                        reason: '405_recovery_failed'
                      });
                    } catch (sendError) {
                      console.error('â‌Œ Failed to send fallback event:', sendError);
                    }
                  }
                });
              }
            }).catch((recoveryError) => {
              console.error('â‌Œ Error in 405 recovery handler:', recoveryError);
              // Fallback to standard session clear
              clearSessionData();
            });

          } catch (clearError) {
            console.error('â‌Œ Failed to initiate 405 error recovery:', clearError);
          }
        } else if (errorCode === 401) {
          console.error('ًںڑ¨ CRITICAL: 401 Unauthorized error detected!');
          console.error('ًں”چ DIAGNOSIS:');
          console.error('  1. WhatsApp session is invalid or expired');
          console.error('  2. Multi-device authentication conflict');
          console.error('  3. Logged out from another device');
          console.error('  4. Session files corrupted or outdated');
          console.error('');
          console.error('ًں› ï¸ڈ SOLUTION:');
          console.error('  - Clear session data and generate new QR');
          console.error('  - Ensure no other WhatsApp sessions are active');
          console.error('  - Try logging out from WhatsApp Web on other devices');

          // Auto-clear session on 401 error to force fresh authentication
          console.log('ًں”„ Auto-clearing session due to 401 error...');
          try {
            clearSessionData();
            console.log('âœ… Session cleared automatically due to 401 error');

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
                  console.error('â‌Œ Failed to send session auto-cleared event:', sendError);
                }
              }
            });
          } catch (clearError) {
            console.error('â‌Œ Failed to auto-clear session:', clearError);
          }
        }

        const suppressReconnect = Date.now() < suppressReconnectUntil;
        const shouldReconnect = suppressReconnect
          ? false
          : (error instanceof Boom)
            ? error.output.statusCode !== DisconnectReason.loggedOut
            : true;

        console.log('ًں”„ Should reconnect:', shouldReconnect);

        if (shouldReconnect) {
          console.log('ًں”„ Connection lost, attempting to reconnect...');
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
                console.error('â‌Œ Failed to send connection failure event:', error);
              }
            }
          });

          attemptReinitialization();
        } else {
          console.log('ًں“± Logged out from WhatsApp');
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
                console.error('â‌Œ Failed to send auth failure event:', error);
              }
            }
          });
          isInitializing = false;
        }
      } else if (connection === 'open') {
        isReady = true;
        lastReadyAt = Date.now();
        lastConnectionError = null;
        console.log('âœ… WhatsApp Client is READY!');
        console.log('ًں“ٹ Connection established successfully at:', new Date(lastReadyAt).toISOString());

        // Send ready event to all windows
        BrowserWindow.getAllWindows().forEach(window => {
          if (window.webContents && !window.webContents.isDestroyed()) {
            try {
              window.webContents.send('whatsapp:ready', {
                timestamp: lastReadyAt,
                message: 'WhatsApp client is ready for sending messages'
              });
              console.log('âœ… Ready event sent to window:', window.id);
            } catch (error) {
              console.error('â‌Œ Failed to send ready event to window:', window.id, error);
            }
          }
        });

        // Also send connected event for backward compatibility
        BrowserWindow.getAllWindows().forEach(window => {
          if (window.webContents && !window.webContents.isDestroyed()) {
            try {
              window.webContents.send('whatsapp:session:connected', {
                message: 'طھظ… ط±ط¨ط· ظˆط§طھط³ط§ط¨ ط¨ظ†ط¬ط§ط­',
                timestamp: lastReadyAt
              });
              console.log('âœ… Connected event sent to window:', window.id);
            } catch (error) {
              console.error('â‌Œ Failed to send connected event to window:', window.id, error);
            }
          }
        });

        isInitializing = false;
        initializationAttempts = 0;
      }
    });

    // Handle credential updates
    sock.ev.on('creds.update', saveCreds);

    // Add additional event handlers for better connection tracking
    sock.ev.on('connection.update', (update: any) => {
      const { connection, receivedPendingNotifications } = update;

      // Log additional connection states for debugging
      if (connection === 'connecting') {
        console.log('ًں”— WhatsApp client connecting...');
      } else if (connection === 'open') {
        console.log('ًں”“ WhatsApp connection opened, initializing...');
      }
    });

    // Handle messages update event to track when client is fully ready
    sock.ev.on('messages.upsert', (m: any) => {
      if (!isReady && m.messages && m.messages.length > 0) {
        console.log('ًں“¨ Messages received, client appears functional');
        // If we're receiving messages but not marked as ready, mark as ready after a delay
        setTimeout(() => {
          if (!isReady && sock) {
            console.log('ًں”„ Auto-marking client as ready after receiving messages');
            isReady = true;
            lastReadyAt = Date.now();
          }
        }, 3000);
      }
    });

    console.log('âœ… WhatsApp client initialized successfully with Baileys');

  } catch (error: any) {
    console.error('â‌Œ WhatsApp client initialization failed:');
    console.error('  - Error Type:', error?.constructor?.name || 'Unknown');
    console.error('  - Error Message:', error?.message || 'Unknown error');
    console.error('  - Error Code:', error?.code || 'N/A');
    console.error('  - Stack Trace:', error?.stack || 'No stack trace');

    // Check for common error patterns
    if (error?.message) {
      if (error.message.includes('401')) {
        console.error('ًںڑ¨ 401 Authorization Error - Session may be invalid');
      }
      if (error.message.includes('timeout')) {
        console.error('âڈ±ï¸ڈ Connection Timeout - Network issues detected');
      }
      if (error.message.includes('ECONNRESET') || error.message.includes('ENOTFOUND')) {
        console.error('ًںŒگ Network Error - Check internet connection');
      }
      if (error.message.includes('session')) {
        console.error('ًں”گ Session Error - May need to re-authenticate');
      }
    }

    // Log diagnostic information
    console.log('ًں“ٹ Diagnostic Info at failure:');
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
          console.error('â‌Œ Failed to send init failure event:', sendError);
        }
      }
    });

    // Attempt to reinitialize only if we haven't exceeded max attempts
    if (initializationAttempts < MAX_INITIALIZATION_ATTEMPTS) {
      console.log('ًں”„ Attempting to reinitialize after failure...');
      attemptReinitialization();
    } else {
      console.error('â‌Œ Max initialization attempts reached. Manual intervention required.');
      // Clear session and notify user
      clearSessionData();
    }

    throw error;
  }
}

// Function to attempt re-initialization with enhanced exponential backoff for 405 errors
function attemptReinitialization() {
  if (initializationAttempts < MAX_INITIALIZATION_ATTEMPTS) {
    // Enhanced backoff strategy: slower for 405 errors, faster for other errors
    let delay: number;
    if (initializationAttempts <= 2) {
      // First two attempts: use moderate backoff (3s, 6s)
      delay = (initializationAttempts + 1) * 3000;
    } else {
      // Subsequent attempts: use longer backoff for stability (10s, 15s, 20s)
      delay = (initializationAttempts + 1) * 5000;
    }

    console.log(`âڈ³ Enhanced retry strategy: waiting ${delay / 1000} seconds (attempt ${initializationAttempts + 1}/${MAX_INITIALIZATION_ATTEMPTS})...`);

    setTimeout(async () => {
      try {
        isInitializing = false; // Reset flag before retry
        console.log(`ًں”„ Starting retry attempt ${initializationAttempts + 1}...`);
        await initializeClient();
      } catch (error) {
        console.error('â‌Œ Retry initialization failed:', error);
      }
    }, delay);
  } else {
    console.error(`â‌Œ Maximum WhatsApp client initialization attempts reached (${MAX_INITIALIZATION_ATTEMPTS}). Clearing session data and notifying user.`);
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
          console.error('â‌Œ Failed to send auth failure notification:', error);
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
  console.log('ًں§¹ Clearing WhatsApp session data...');

  if (sock) {
    try {
       suppressReconnectUntil = Date.now() + 15000;
      sock.end();
      sock = null;
      console.log('âœ… WhatsApp socket ended');
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
      console.log('âœ… WhatsApp session directory cleared');
    } catch (e) {
      console.error('â‌Œ Error clearing WhatsApp session directory:', e);
    }
  }

  // Inform renderer processes about session clear
  BrowserWindow.getAllWindows().forEach(window => {
    if (window.webContents && !window.webContents.isDestroyed()) {
      try {
        window.webContents.send('whatsapp:session_cleared', { timestamp: Date.now() });
        console.log('âœ… Session cleared event sent to window:', window.id);
      } catch (error) {
        console.error('â‌Œ Failed to send session cleared event to window:', window.id, error);
      }
    }
  });

  console.log('âœ… WhatsApp session data fully cleared');
}

// Function to reinitialize connection (lighter than full reset)
async function reinitializeConnection(): Promise<void> {
  console.log('ًں”„ Reinitializing WhatsApp connection...');

  if (sock) {
    try {
      // Try to gracefully end the current connection
       suppressReconnectUntil = Date.now() + 15000;
      sock.end();
      sock = null;
      console.log('âœ… Previous socket connection ended');
    } catch (error) {
      console.warn('âڑ ï¸ڈ Error ending previous socket:', error);
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
    console.log('âœ… WhatsApp connection reinitialized');
  } catch (error) {
    console.error('â‌Œ Failed to reinitialize connection:', error);
    throw error;
  }
}

// Function to reset and reinitialize the session
export async function resetSession(): Promise<void> {
  console.log('ًں”„ Resetting WhatsApp session...');

  // Clear existing session
  clearSessionData();

  // Small delay to ensure cleanup is complete
  await new Promise(resolve => setTimeout(resolve, 500));

  // Reinitialize
  await initializeClient();

  console.log('âœ… WhatsApp session reset completed');
}

// Enhanced diagnostic function for troubleshooting WhatsApp issues
export function getWhatsAppDiagnosticInfo(): any {
  return {
    isReady,
    isInitializing,
    lastQr: lastQr ? 'Present' : 'None',
    lastReadyAt,
    initializationAttempts,
    lastConnectionError,
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

// Enhanced function to handle 405 Method Not Allowed errors specifically
async function handle405Error(): Promise<boolean> {
  console.log('ًںڑ¨ Handling 405 Method Not Allowed error with aggressive recovery...');

  try {
    // Step 1: Clear all session data
    console.log('ًں§¹ Step 1: Clearing all session data...');
    clearSessionData();

    // Step 2: Wait longer for cleanup
    console.log('âڈ³ Step 2: Waiting for cleanup...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Force fresh initialization with enhanced config
    console.log('ًںڑ€ Step 3: Force fresh initialization...');
    initializationAttempts = 0; // Reset attempts for fresh start
    isInitializing = false;

    // Step 4: Initialize with more conservative settings for 405 recovery
    await initializeClient();

    console.log('âœ… 405 error recovery completed successfully');
    return true;

  } catch (error) {
    console.error('â‌Œ 405 error recovery failed:', error);
    return false;
  }
}

// Function to force generate a new QR code
export async function generateNewQR(): Promise<{success: boolean, qr?: string, error?: string, details?: any}> {
  try {
    console.log('Generating WhatsApp QR with isolated Baileys socket...');
    lastQr = null;
    isReady = false;
    lastConnectionError = null;

    if (sock) {
      try {
        suppressReconnectUntil = Date.now() + 15000;
        sock.end();
        sock = null;
      } catch (cleanupError) {
        console.warn('Error during socket cleanup:', cleanupError);
      }
    }

    if (fs.existsSync(sessionPath)) {
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      } catch (sessionError) {
        console.warn('Error clearing session directory:', sessionError);
      }
    }

    initializationAttempts = 0;
    isInitializing = false;

    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const fetched = await fetchLatestBaileysVersion().catch((versionError) => {
      console.warn('Failed to fetch latest WA version for isolated QR:', versionError);
      return { version: [2, 3000, 1043857760] as [number, number, number] };
    });

    const qrSock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
      },
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.macOS('Chrome'),
      connectTimeoutMs: 20000,
      qrTimeout: 60000,
      version: fetched.version as [number, number, number],
      syncFullHistory: true,
      generateHighQualityLinkPreview: false,
    });

    sock = qrSock;
    qrSock.ev.on('creds.update', saveCreds);

    return await new Promise((resolve) => {
      const timeoutMs = 70000;
      const startedAt = Date.now();
      let settled = false;
      let timer: NodeJS.Timeout;

      const finish = (result: {success: boolean, qr?: string, error?: string, details?: any}) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          qrSock.ev.off('connection.update', handleUpdate);
        } catch {}
        resolve(result);
      };

      const handleUpdate = (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && qr.trim() !== '') {
          lastQr = qr;
          BrowserWindow.getAllWindows().forEach(window => {
            if (window.webContents && !window.webContents.isDestroyed()) {
              window.webContents.send('whatsapp:qr', qr);
            }
          });
          finish({
            success: true,
            qr,
            details: {
              method: 'isolated_socket',
              elapsedMs: Date.now() - startedAt,
              serviceBuild: WHATSAPP_SERVICE_BUILD
            }
          });
          return;
        }

        if (connection === 'close') {
          const error = lastDisconnect?.error;
          lastConnectionError = {
            code: error?.output?.statusCode,
            message: error?.message || 'Connection closed before QR',
            at: new Date().toISOString()
          };
          finish({
            success: false,
            error: lastConnectionError.message,
            details: {
              method: 'isolated_socket',
              lastConnectionError,
              elapsedMs: Date.now() - startedAt,
              serviceBuild: WHATSAPP_SERVICE_BUILD
            }
          });
        }
      };

      timer = setTimeout(() => {
        finish({
          success: false,
          error: 'Timed out waiting for WhatsApp QR',
          details: {
            method: 'isolated_socket',
            timeoutMs,
            hasSocket: !!sock,
            lastConnectionError,
            serviceBuild: WHATSAPP_SERVICE_BUILD
          }
        });
      }, timeoutMs);

      qrSock.ev.on('connection.update', handleUpdate);
    });
  } catch (error: any) {
    console.error('Failed to generate new QR:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error',
      details: {
        type: error?.constructor?.name || 'Unknown',
        code: error?.code || 'N/A',
        stack: error?.stack?.substring(0, 500) || 'No stack trace',
        serviceBuild: WHATSAPP_SERVICE_BUILD
      }
    };
  }
}
function waitForPairingWindow(timeoutMs = 45000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (lastQr) {
      resolve();
      return;
    }

    if (!sock?.ev?.on) {
      reject(new Error('WhatsApp socket is not available'));
      return;
    }

    let settled = false;
    let timer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      try {
        sock?.ev?.off?.('connection.update', handleConnectionUpdate);
      } catch (cleanupError) {
        console.warn('âڑ ï¸ڈ Failed to remove pairing window listener:', cleanupError);
      }
    };

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };

    const handleConnectionUpdate = (update: any) => {
      if (update?.qr) {
        finish(resolve);
        return;
      }

      if (update?.connection === 'close') {
        const error = update?.lastDisconnect?.error;
        finish(() => reject(error || new Error('Connection closed before pairing window opened')));
      }
    };

    timer = setTimeout(() => {
      finish(() => reject(new Error('Timed out waiting for WhatsApp pairing window')));
    }, timeoutMs);

    sock.ev.on('connection.update', handleConnectionUpdate);
  });
}

export async function generatePairingCode(phoneNumber: string): Promise<{success: boolean, pairingCode?: string, phoneNumber?: string, error?: string, details?: any}> {
  try {
    const normalizedPhoneNumber = String(phoneNumber || '').replace(/\D/g, '');

    if (normalizedPhoneNumber.length < 8 || normalizedPhoneNumber.length > 15) {
      return {
      success: false,
      error: 'Phone number must include country code and digits only',
      details: { normalizedPhoneNumberLength: normalizedPhoneNumber.length, serviceBuild: WHATSAPP_SERVICE_BUILD }
      };
    }

    console.log('ًں”„ Generating WhatsApp pairing code for:', normalizedPhoneNumber);

    lastQr = null;
    isReady = false;
    lastConnectionError = null;

    if (sock) {
      try {
        console.log('ًں§¹ Cleaning up existing socket before pairing code generation...');
         suppressReconnectUntil = Date.now() + 15000;
        sock.end();
        sock = null;
      } catch (cleanupError) {
        console.warn('âڑ ï¸ڈ Error during socket cleanup:', cleanupError);
      }
    }

    if (fs.existsSync(sessionPath)) {
      try {
        console.log('ًں—‘ï¸ڈ Clearing session directory for fresh pairing code...');
        fs.rmSync(sessionPath, { recursive: true, force: true });
      } catch (sessionError) {
        console.warn('âڑ ï¸ڈ Error clearing session directory:', sessionError);
      }
    }

    initializationAttempts = 0;
    isInitializing = false;

    await initializeClient();
    await waitForPairingWindow();

    if (!sock || typeof sock.requestPairingCode !== 'function') {
      return {
        success: false,
      error: 'Pairing code API is not available on the WhatsApp socket',
      details: { hasSocket: !!sock, socketKeys: sock ? Object.keys(sock).slice(0, 30) : [], serviceBuild: WHATSAPP_SERVICE_BUILD }
      };
    }

    if (sock.authState?.creds?.registered) {
      return {
        success: false,
      error: 'WhatsApp socket is already registered. Reset the session before pairing again.',
      details: { registered: true, serviceBuild: WHATSAPP_SERVICE_BUILD }
      };
    }

    const pairingCode = await sock.requestPairingCode(normalizedPhoneNumber);

    return {
      success: true,
      pairingCode,
      phoneNumber: normalizedPhoneNumber,
      details: { method: 'pairing_code', serviceBuild: WHATSAPP_SERVICE_BUILD }
    };
  } catch (error: any) {
    console.error('â‌Œ Failed to generate WhatsApp pairing code:', error);

    return {
      success: false,
      error: error?.message || 'Failed to generate pairing code',
      details: {
        type: error?.constructor?.name || 'Unknown',
        code: error?.code || 'N/A',
        stack: error?.stack?.substring(0, 500) || 'No stack trace',
        lastConnectionError,
        serviceBuild: WHATSAPP_SERVICE_BUILD
      }
    };
  }
}

export async function sendMessage(phoneNumber: string, message: string, retryCount: number = 0): Promise<{ success: boolean; phoneNumber: string }> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  console.log(`ًں“± Attempting to send WhatsApp message (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

  // Enhanced connection state validation
  if (!sock) {
    console.error('â‌Œ WhatsApp socket is null/undefined');
    throw new Error('WhatsApp client is not initialized.');
  }

  // More lenient ready state check - wait for ready state or proceed if socket is functional
  if (!isReady) {
    console.warn('âڑ ï¸ڈ WhatsApp client is not ready, but socket exists. Checking socket state...');

    // Check if socket appears functional even if not marked as ready
    if (typeof sock.sendMessage === 'function') {
      console.log('âœ… Socket has sendMessage method, attempting to send despite not being ready...');

      // Try to wait a bit for ready state
      let waitAttempts = 0;
      const maxWaitAttempts = 5; // Wait up to 5 seconds

      while (!isReady && waitAttempts < maxWaitAttempts && sock) {
        console.log(`âڈ³ Waiting for ready state (attempt ${waitAttempts + 1}/${maxWaitAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        waitAttempts++;
      }

      if (!isReady) {
        console.warn('âڑ ï¸ڈ Proceeding with message send despite not being fully ready...');
      }
    } else {
      console.error('â‌Œ WhatsApp socket does not have sendMessage method');
      throw new Error('WhatsApp client is not properly initialized.');
    }
  }

  // Final check - if socket is completely invalid, throw error
  if (typeof sock.sendMessage !== 'function') {
    console.error('â‌Œ WhatsApp socket does not have sendMessage method');
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
    console.log(`ًں“± Sending message to ${finalNumber}...`);

    // Send message using Baileys with timeout
    const sendPromise = sock.sendMessage(`${finalNumber}@s.whatsapp.net`, { text: message.trim() });

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Message send timeout')), 30000); // 30 second timeout
    });

    await Promise.race([sendPromise, timeoutPromise]);

    console.log(`âœ… Message sent successfully to ${finalNumber}`);
    return { success: true, phoneNumber: finalNumber };
  } catch (error: any) {
    console.error(`â‌Œ Failed to send message to ${finalNumber}:`, error);

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
      console.log(`ًں”„ Retrying message send in ${RETRY_DELAY}ms (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`);

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

      // Attempt to reinitialize connection if this is not the first retry
      if (retryCount === 0) {
        console.log('ًں”„ Attempting to reinitialize WhatsApp connection...');
        try {
          await reinitializeConnection();
        } catch (reinitError) {
          console.warn('âڑ ï¸ڈ Failed to reinitialize connection:', reinitError);
        }
      }

      // Retry the message
      return await sendMessage(phoneNumber, message, retryCount + 1);
    }

    // If retries exhausted or error is not recoverable, throw the error
    console.error(`â‌Œ All retry attempts failed for ${finalNumber}`);
    throw new Error(`Failed to send WhatsApp message after ${retryCount + 1} attempts: ${error.message}`);
  }
}

