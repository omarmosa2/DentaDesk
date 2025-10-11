"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeClient = initializeClient;
exports.getClient = getClient;
exports.getLastQr = getLastQr;
exports.getIsReady = getIsReady;
exports.getLastReadyAt = getLastReadyAt;
exports.clearSessionData = clearSessionData;
exports.sendMessage = sendMessage;
const baileys_1 = require("@whiskeysockets/baileys");
const boom_1 = require("@hapi/boom");
const electron_1 = require("electron");
const fs = require("fs");
const pino_1 = require("pino");
const qrcode_1 = require("qrcode");
let sock = null; // Baileys socket instance
let lastQr = null;
let isReady = false;
let lastReadyAt = null;
let initializationAttempts = 0;
const MAX_INITIALIZATION_ATTEMPTS = 5;
let isInitializing = false; // Flag to prevent multiple concurrent initializations
const sessionPath = electron_1.app.getPath('userData') + '/baileys-session';
async function initializeClient() {
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
    try {
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
            browser: baileys_1.Browsers.macOS('Desktop'),
            generateHighQualityLinkPreview: true,
        });
        // Handle QR code generation
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                lastQr = qr;
                console.log('QR RECEIVED');
                qrcode_1.default.toDataURL(qr, (err, url) => {
                    if (!err) {
                        electron_1.BrowserWindow.getAllWindows().forEach(window => {
                            if (window.webContents && !window.webContents.isDestroyed()) {
                                window.webContents.send('whatsapp:qr', url);
                            }
                        });
                    }
                });
            }
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error instanceof boom_1.Boom)
                    ? lastDisconnect.error.output.statusCode !== baileys_1.DisconnectReason.loggedOut
                    : true;
                console.log('Connection closed due to:', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
                if (shouldReconnect) {
                    isReady = false;
                    lastQr = null;
                    isInitializing = false;
                    attemptReinitialization();
                }
                else {
                    console.log('Logged out from WhatsApp');
                    isReady = false;
                    lastQr = null;
                    electron_1.BrowserWindow.getAllWindows().forEach(window => {
                        if (window.webContents && !window.webContents.isDestroyed()) {
                            window.webContents.send('whatsapp:auth_failure', 'Logged out');
                        }
                    });
                    isInitializing = false;
                }
            }
            else if (connection === 'open') {
                isReady = true;
                lastReadyAt = Date.now();
                console.log('✅ WhatsApp Client is READY!');
                electron_1.BrowserWindow.getAllWindows().forEach(window => {
                    if (window.webContents && !window.webContents.isDestroyed()) {
                        window.webContents.send('whatsapp:ready');
                    }
                });
                isInitializing = false;
                initializationAttempts = 0;
            }
        });
        // Handle credential updates
        sock.ev.on('creds.update', saveCreds);
        console.log('✅ WhatsApp client initialized successfully with Baileys');
    }
    catch (error) {
        console.error('❌ WhatsApp client initialization failed:', error);
        isReady = false;
        lastQr = null;
        isInitializing = false;
        attemptReinitialization();
        throw error;
    }
}
// Function to attempt re-initialization with exponential backoff
function attemptReinitialization() {
    if (initializationAttempts < MAX_INITIALIZATION_ATTEMPTS) {
        const delay = Math.pow(2, initializationAttempts) * 1000; // Exponential backoff (2s, 4s, 8s, etc.)
        console.log(`⏳ Retrying WhatsApp client initialization in ${delay / 1000} seconds...`);
        setTimeout(() => initializeClient(), delay);
    }
    else {
        console.error(`❌ Maximum WhatsApp client initialization attempts reached (${MAX_INITIALIZATION_ATTEMPTS}). Clearing session data.`);
        clearSessionData(); // Clear session if max attempts reached
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
// Function to clear WhatsApp session data
function clearSessionData() {
    if (sock) {
        try {
            sock.end();
            sock = null;
            isReady = false;
            lastQr = null;
            initializationAttempts = 0;
            isInitializing = false;
        }
        catch (e) {
            console.error('Error ending WhatsApp socket:', e);
        }
    }
    if (fs.existsSync(sessionPath)) {
        try {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log('✅ WhatsApp session data cleared.');
        }
        catch (e) {
            console.error('❌ Error clearing WhatsApp session directory:', e);
        }
    }
    // Inform renderer processes about session clear
    electron_1.BrowserWindow.getAllWindows().forEach(window => {
        if (window.webContents && !window.webContents.isDestroyed()) {
            window.webContents.send('whatsapp:session_cleared');
        }
    });
}
async function sendMessage(phoneNumber, message) {
    if (!isReady || !sock) {
        throw new Error('WhatsApp client is not ready.');
    }
    // Logic to send message
    const sanitizedNumber = phoneNumber.replace(/[-\s]/g, ''); // Remove dashes and spaces
    const finalNumber = sanitizedNumber.startsWith('+') ? sanitizedNumber : `+${sanitizedNumber}`;
    try {
        // Send message using Baileys
        await sock.sendMessage(`${finalNumber}@s.whatsapp.net`, { text: message });
        console.log(`✅ Message sent to ${finalNumber}`);
    }
    catch (error) {
        console.error(`❌ Failed to send message to ${finalNumber}:`, error);
        throw error;
    }
}
