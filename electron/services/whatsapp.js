"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeClient = initializeClient;
exports.getClient = getClient;
exports.getLastQr = getLastQr;
exports.getIsReady = getIsReady;
exports.getLastReadyAt = getLastReadyAt;
exports.clearSessionData = clearSessionData;
exports.resetSession = resetSession;
exports.getWhatsAppDiagnosticInfo = getWhatsAppDiagnosticInfo;
exports.getWhatsAppStatus = getWhatsAppStatus;
exports.generateNewQR = generateNewQR;
exports.generatePairingCode = generatePairingCode;
exports.sendMessage = sendMessage;
exports.validateConnectionState = validateConnectionState;
exports.isClientReady = () => isReady;
const baileys_1 = require("@whiskeysockets/baileys");
const boom_1 = require("@hapi/boom");
const electron_1 = require("electron");
const fs = require("fs");
const pino_1 = require("pino");
let sock = null; // Baileys socket instance
let lastQr = null;
let isReady = false;
let lastReadyAt = null;
let initializationAttempts = 0;
const MAX_INITIALIZATION_ATTEMPTS = 5;
let isInitializing = false; // Flag to prevent multiple concurrent initializations
let lastConnectionError = null;
const WHATSAPP_SERVICE_BUILD = 'baileys-rc14-qr35-pairing-code';
let suppressReconnectUntil = 0;
const sessionPath = electron_1.app.getPath('userData') + '/baileys-session';
async function initializeClient() {
    console.log('ًں”چ DEBUG: initializeClient() function called');
    if (isInitializing) {
        console.log('âڈ³ WhatsApp client initialization already in progress, skipping.');
        return;
    }
    isInitializing = true;
    initializationAttempts++;
    console.log(`ًںڑ€ Initializing WhatsApp client with Baileys (attempt ${initializationAttempts}/${MAX_INITIALIZATION_ATTEMPTS})...`);
    console.log('ًں”چ DEBUG: Initialization state set, proceeding with setup...');
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
        }
        catch (error) {
            console.warn('âڑ ï¸ڈ Error cleaning up existing socket:', error);
        }
    }
    try {
        // Resolve latest WA version (Baileys 7.x breaking change requires matching version)
        let waVersion = [2, 2414, 80];
        try {
            const fetched = await (0, baileys_1.fetchLatestBaileysVersion)();
            if (Array.isArray(fetched.version)) {
                waVersion = fetched.version;
                console.log('ًں”„ Resolved latest WA version from Baileys:', waVersion.join('.'));
            }
        }
        catch (versionError) {
            console.warn('âڑ ï¸ڈ Failed to fetch latest WA version, using fallback', waVersion, versionError);
        }
        // Create auth state
        const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(sessionPath);
        // Create Baileys socket
        sock = (0, baileys_1.default)({
            auth: {
                creds: state.creds,
                keys: (0, baileys_1.makeCacheableSignalKeyStore)(state.keys, (0, pino_1.pino)({ level: 'silent' })),
            },
            printQRInTerminal: false,
            logger: (0, pino_1.pino)({ level: 'silent' }),
            // Keep the fingerprint close to Baileys defaults; over-customizing can trigger early closes.
            browser: baileys_1.Browsers.macOS('Chrome'),
            generateHighQualityLinkPreview: false,
            connectTimeoutMs: 20000,
            qrTimeout: 60000,
            version: waVersion,
            retryRequestDelayMs: 250,
            maxMsgRetryCount: 5,
            syncFullHistory: true,
        });
        // Handle QR code generation
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                lastQr = qr;
                console.log('QR RECEIVED:', qr.substring(0, 50) + '...');
                // Send QR code as string directly (not as data URL)
                electron_1.BrowserWindow.getAllWindows().forEach(window => {
                    if (window.webContents && !window.webContents.isDestroyed()) {
                        try {
                            window.webContents.send('whatsapp:qr', qr);
                            console.log('âœ… QR sent to window:', window.id);
                        }
                        catch (error) {
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
                }
                catch (error) {
                    console.warn('âڑ ï¸ڈ Could not forward QR to main process:', error);
                }
            }
            if (connection === 'close') {
                const errorCode = lastDisconnect?.error?.output?.statusCode;
                const errorMessage = lastDisconnect?.error?.message || 'Unknown error';
                lastConnectionError = {
                    code: errorCode,
                    message: errorMessage,
                    at: new Date().toISOString()
                };
                const suppressReconnect = Date.now() < suppressReconnectUntil;
                const shouldReconnect = suppressReconnect
                    ? false
                    : (lastDisconnect?.error instanceof boom_1.Boom)
                        ? lastDisconnect.error.output.statusCode !== baileys_1.DisconnectReason.loggedOut
                        : true;
                console.log('Connection closed due to:', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
                if (shouldReconnect) {
                    console.log('ًں”„ Connection lost, attempting to reconnect...');
                    isReady = false;
                    lastQr = null;
                    isInitializing = false;
                    attemptReinitialization();
                }
                else {
                    console.log('ًں“± Logged out from WhatsApp');
                    isReady = false;
                    lastQr = null;
                    electron_1.BrowserWindow.getAllWindows().forEach(window => {
                        if (window.webContents && !window.webContents.isDestroyed()) {
                            try {
                                window.webContents.send('whatsapp:auth_failure', {
                                    message: 'Logged out from WhatsApp',
                                    timestamp: Date.now()
                                });
                            }
                            catch (error) {
                                console.error('â‌Œ Failed to send auth failure event:', error);
                            }
                        }
                    });
                    isInitializing = false;
                }
            }
            else if (connection === 'open') {
                isReady = true;
                lastReadyAt = Date.now();
                lastConnectionError = null;
                console.log('âœ… WhatsApp Client is READY!');
                // Send ready event to all windows
                electron_1.BrowserWindow.getAllWindows().forEach(window => {
                    if (window.webContents && !window.webContents.isDestroyed()) {
                        try {
                            window.webContents.send('whatsapp:ready', {
                                timestamp: lastReadyAt,
                                message: 'WhatsApp client is ready for sending messages'
                            });
                            console.log('âœ… Ready event sent to window:', window.id);
                        }
                        catch (error) {
                            console.error('â‌Œ Failed to send ready event to window:', window.id, error);
                        }
                    }
                });
                // Also send connected event for backward compatibility
                electron_1.BrowserWindow.getAllWindows().forEach(window => {
                    if (window.webContents && !window.webContents.isDestroyed()) {
                        try {
                            window.webContents.send('whatsapp:session:connected', {
                                message: 'طھظ… ط±ط¨ط· ظˆط§طھط³ط§ط¨ ط¨ظ†ط¬ط§ط­',
                                timestamp: lastReadyAt
                            });
                            console.log('âœ… Connected event sent to window:', window.id);
                        }
                        catch (error) {
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
        console.log('âœ… WhatsApp client initialized successfully with Baileys');
        console.log('ًں”چ DEBUG: initializeClient() completed successfully');
    }
    catch (error) {
        console.error('â‌Œ WhatsApp client initialization failed:', error);
        console.error('Error details:', error?.message || 'Unknown error');
        console.error('Stack trace:', error?.stack || 'No stack trace');
        console.error('ًں”چ DEBUG: initializeClient() failed with error:', error);
        isReady = false;
        lastQr = null;
        isInitializing = false;
        // Attempt to reinitialize
        attemptReinitialization();
        throw error;
    }
    finally {
        console.log('ًں”چ DEBUG: initializeClient() function ending, isInitializing:', isInitializing);
    }
}
// Function to attempt re-initialization with exponential backoff
function attemptReinitialization() {
    if (initializationAttempts < MAX_INITIALIZATION_ATTEMPTS) {
        const delay = Math.pow(2, initializationAttempts) * 1000; // Exponential backoff (2s, 4s, 8s, etc.)
        console.log(`âڈ³ Retrying WhatsApp client initialization in ${delay / 1000} seconds (attempt ${initializationAttempts + 1}/${MAX_INITIALIZATION_ATTEMPTS})...`);
        setTimeout(async () => {
            try {
                isInitializing = false; // Reset flag before retry
                await initializeClient();
            }
            catch (error) {
                console.error('â‌Œ Retry initialization failed:', error);
            }
        }, delay);
    }
    else {
        console.error(`â‌Œ Maximum WhatsApp client initialization attempts reached (${MAX_INITIALIZATION_ATTEMPTS}). Clearing session data and notifying user.`);
        clearSessionData(); // Clear session if max attempts reached
        // Notify user about the failure
        electron_1.BrowserWindow.getAllWindows().forEach(window => {
            if (window.webContents && !window.webContents.isDestroyed()) {
                try {
                    window.webContents.send('whatsapp:auth_failure', {
                        message: 'Maximum initialization attempts reached. Please try again later.',
                        timestamp: Date.now()
                    });
                }
                catch (error) {
                    console.error('â‌Œ Failed to send auth failure notification:', error);
                }
            }
        });
    }
}
function getClient() {
    return sock;
}
function getLastQr() {
    return lastQr;
}
function getIsReady() {
    return isReady;
}
function getLastReadyAt() {
    return lastReadyAt;
}

// Enhanced connection state validation function
function validateConnectionState() {
    const now = Date.now();
    const timeSinceReady = lastReadyAt ? now - lastReadyAt : Infinity;

    console.log('ًں”چ Validating WhatsApp connection state:', {
        hasSocket: !!sock,
        isReady,
        hasSendMessage: sock ? typeof sock.sendMessage === 'function' : false,
        timeSinceReady: timeSinceReady / 1000 + 's',
        initializationAttempts,
        isInitializing
    });

    // Check if socket exists and is ready
    if (!sock) {
        console.error('â‌Œ Socket validation failed: No socket instance');
        return { isValid: false, reason: 'No socket instance' };
    }

    if (!isReady) {
        console.error('â‌Œ Socket validation failed: Client not ready');
        return { isValid: false, reason: 'Client not ready' };
    }

    if (typeof sock.sendMessage !== 'function') {
        console.error('â‌Œ Socket validation failed: No sendMessage method');
        return { isValid: false, reason: 'No sendMessage method' };
    }

    // Check if connection has been ready for too long (might be stale)
    const maxConnectionAge = 10 * 60 * 1000; // 10 minutes
    if (timeSinceReady > maxConnectionAge) {
        console.warn('âڑ ï¸ڈ Connection is stale (ready for', timeSinceReady / 1000, 'seconds), should reinitialize');
        return { isValid: false, reason: 'Connection stale', shouldReinitialize: true };
    }

    console.log('âœ… Connection state validation passed');
    return { isValid: true };
}
// Function to clear WhatsApp session data
function clearSessionData() {
    console.log('ًں§¹ Clearing WhatsApp session data...');
    if (sock) {
        try {
             suppressReconnectUntil = Date.now() + 15000;
            sock.end();
            sock = null;
            console.log('âœ… WhatsApp socket ended');
        }
        catch (e) {
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
        }
        catch (e) {
            console.error('â‌Œ Error clearing WhatsApp session directory:', e);
        }
    }
    // Inform renderer processes about session clear
    electron_1.BrowserWindow.getAllWindows().forEach(window => {
        if (window.webContents && !window.webContents.isDestroyed()) {
            try {
                window.webContents.send('whatsapp:session_cleared', { timestamp: Date.now() });
                console.log('âœ… Session cleared event sent to window:', window.id);
            }
            catch (error) {
                console.error('â‌Œ Failed to send session cleared event to window:', window.id, error);
            }
        }
    });
    console.log('âœ… WhatsApp session data fully cleared');
}
// Function to reinitialize connection (lighter than full reset)
async function reinitializeConnection() {
    console.log('ًں”„ Reinitializing WhatsApp connection...');

    // Set a flag to prevent concurrent reinitializations
    if (isInitializing) {
        console.log('âڈ³ WhatsApp reinitialization already in progress, skipping.');
        return;
    }

    isInitializing = true;

    try {
        if (sock) {
            try {
                // Try to gracefully end the current connection
                console.log('ًں§¹ Cleaning up existing WhatsApp socket...');
                 suppressReconnectUntil = Date.now() + 15000;
                sock.end();
                sock = null;
                console.log('âœ… Previous socket connection ended');
            }
            catch (error) {
                console.warn('âڑ ï¸ڈ Error ending previous socket:', error);
                // Continue with reinitialization even if cleanup fails
            }
        }

        // Reset state variables
        isReady = false;
        lastQr = null;

        // Longer delay to ensure cleanup is complete
        console.log('âڈ³ Waiting for cleanup to complete...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            // Reinitialize the client
            await initializeClient();
            console.log('âœ… WhatsApp connection reinitialized');

            // Wait a bit more to ensure the connection is stable
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        catch (error) {
            console.error('â‌Œ Failed to reinitialize connection:', error);
            throw error;
        }
    }
    finally {
        isInitializing = false;
    }
}
// Function to reset and reinitialize the session
async function resetSession() {
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
function getWhatsAppDiagnosticInfo() {
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
function getWhatsAppStatus() {
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
async function generateNewQR() {
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
            }
            catch (cleanupError) {
                console.warn('Error during socket cleanup:', cleanupError);
            }
        }
        if (fs.existsSync(sessionPath)) {
            try {
                fs.rmSync(sessionPath, { recursive: true, force: true });
            }
            catch (sessionError) {
                console.warn('Error clearing session directory:', sessionError);
            }
        }
        initializationAttempts = 0;
        isInitializing = false;
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }
        const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(sessionPath);
        const fetched = await (0, baileys_1.fetchLatestBaileysVersion)().catch((versionError) => {
            console.warn('Failed to fetch latest WA version for isolated QR:', versionError);
            return { version: [2, 3000, 1043857760] };
        });
        const qrSock = (0, baileys_1.default)({
            auth: {
                creds: state.creds,
                keys: (0, baileys_1.makeCacheableSignalKeyStore)(state.keys, (0, pino_1.pino)({ level: 'silent' })),
            },
            logger: (0, pino_1.pino)({ level: 'silent' }),
            printQRInTerminal: false,
            browser: baileys_1.Browsers.macOS('Chrome'),
            connectTimeoutMs: 20000,
            qrTimeout: 60000,
            version: fetched.version,
            syncFullHistory: true,
            generateHighQualityLinkPreview: false,
        });
        sock = qrSock;
        qrSock.ev.on('creds.update', saveCreds);
        return await new Promise((resolve) => {
            const timeoutMs = 70000;
            const startedAt = Date.now();
            let settled = false;
            let timer;
            const finish = (result) => {
                if (settled)
                    return;
                settled = true;
                clearTimeout(timer);
                try {
                    qrSock.ev.off('connection.update', handleUpdate);
                }
                catch { }
                resolve(result);
            };
            const handleUpdate = (update) => {
                const { connection, lastDisconnect, qr } = update;
                if (qr && qr.trim() !== '') {
                    lastQr = qr;
                    electron_1.BrowserWindow.getAllWindows().forEach(window => {
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
    }
    catch (error) {
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
function waitForPairingWindow(timeoutMs = 45000) {
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
        let timer = null;
        const cleanup = () => {
            if (timer)
                clearTimeout(timer);
            try {
                sock?.ev?.off?.('connection.update', handleConnectionUpdate);
            }
            catch (cleanupError) {
                console.warn('âڑ ï¸ڈ Failed to remove pairing window listener:', cleanupError);
            }
        };
        const finish = (callback) => {
            if (settled)
                return;
            settled = true;
            cleanup();
            callback();
        };
        const handleConnectionUpdate = (update) => {
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
async function generatePairingCode(phoneNumber) {
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
            }
            catch (cleanupError) {
                console.warn('âڑ ï¸ڈ Error during socket cleanup:', cleanupError);
            }
        }
        if (fs.existsSync(sessionPath)) {
            try {
                console.log('ًں—‘ï¸ڈ Clearing session directory for fresh pairing code...');
                fs.rmSync(sessionPath, { recursive: true, force: true });
            }
            catch (sessionError) {
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
    }
    catch (error) {
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
async function sendMessage(phoneNumber, message, retryCount = 0) {
    const MAX_RETRIES = 4;
    const RETRY_DELAY = 2000; // 2 seconds
    const MESSAGE_TIMEOUT = 60000; // 60 seconds timeout (increased)
    console.log(`ًں“± Attempting to send WhatsApp message (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

    // Use the new connection state validation
    const validation = validateConnectionState();
    if (!validation.isValid) {
        console.error('â‌Œ Connection validation failed:', validation.reason);
        if (validation.shouldReinitialize) {
            console.log('ًں”„ Attempting to reinitialize connection due to stale connection...');
            try {
                await reinitializeConnection();
                // Re-validate after reinitialization
                const reValidation = validateConnectionState();
                if (!reValidation.isValid) {
                    throw new Error('WhatsApp client is not ready after reinitialization.');
                }
            }
            catch (reinitError) {
                console.error('â‌Œ Failed to reinitialize connection:', reinitError);
                throw new Error('WhatsApp client is not initialized.');
            }
        } else {
            throw new Error('WhatsApp client is not ready.');
        }
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
    const finalNumber = sanitizedNumber.startsWith('+' ) ? sanitizedNumber.slice(1) : sanitizedNumber;
    try {
        console.log(`ًں“± Sending message to ${finalNumber}...`);

        // Send message using Baileys with longer timeout
        const sendPromise = sock.sendMessage(`${finalNumber}@s.whatsapp.net`, { text: message.trim() });

        // Add timeout to prevent hanging (increased to 60 seconds)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Message send timeout')), MESSAGE_TIMEOUT);
        });

        await Promise.race([sendPromise, timeoutPromise]);
        console.log(`âœ… Message sent successfully to ${finalNumber}`);
        return { success: true, phoneNumber: finalNumber };
    }
    catch (error) {
        console.error(`â‌Œ Failed to send message to ${finalNumber}:`, error);

        // Check if error is recoverable with improved error classification
        const isRecoverableError = (error.message &&
            (error.message.includes('timeout') ||
                error.message.includes('Connection lost') ||
                error.message.includes('network') ||
                error.message.includes('ECONNRESET') ||
                error.message.includes('ENOTFOUND') ||
                error.message.includes('socket hang up') ||
                error.message.includes('connection reset') ||
                error.message.includes('EPIPE') ||
                error.message.includes('service unavailable') ||
                error.message.includes('503') ||
                error.message.includes('502') ||
                error.message.includes('Connection closed') ||
                error.message.includes('Connection ended')));

        // Attempt retry if error is recoverable and we haven't exceeded max retries
        if (isRecoverableError && retryCount < MAX_RETRIES) {
            const delay = Math.min(RETRY_DELAY * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10 seconds
            console.log(`ًں”„ Retrying message send in ${delay}ms (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`);

            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));

            // Attempt to reinitialize connection on retry attempts
            if (retryCount >= 1) {
                console.log('ًں”„ Attempting to reinitialize WhatsApp connection...');
                try {
                    await reinitializeConnection();
                    // Wait a bit after reinitialization to ensure connection is stable
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                catch (reinitError) {
                    console.warn('âڑ ï¸ڈ Failed to reinitialize connection:', reinitError);
                }
            }

            // Retry the message
            return await sendMessage(phoneNumber, message, retryCount + 1);
        }

        // If retries exhausted or error is not recoverable, throw the error
        console.error(`â‌Œ All retry attempts failed for ${finalNumber} after ${retryCount + 1} attempts`);
        throw new Error(`Failed to send WhatsApp message after ${retryCount + 1} attempts: ${error.message}`);
    }
}

