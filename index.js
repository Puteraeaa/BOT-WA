const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Set your API key as an environment variable
const API_KEY = 'AIzaSyCqL-076Vg2R2eB4VneqgBx7cX5727DL-8';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function connectToWhatsapp() {
    const authState = await useMultiFileAuthState('session');
    const sock = makeWASocket({
        printQRInTerminal: true,
        browser: ['WhatsApp', 'Chrome', '3.0.0'],
        logger: pino({ level: 'silent' }),
        auth: authState.state,
    });

    sock.ev.on('creds.update', authState.saveCreds);
    sock.ev.on('connection.update', ({ connection, qr }) => {
        if (connection === 'close') {
            console.log('Connection closed. Reconnecting...');
            connectToWhatsapp();
        }
        if (connection === 'open') {
            console.log('Connection opened');
        }
        if (connection === 'connecting') {
            console.log('Connecting...');
        }
        if (qr) {
            console.log(qr);
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        console.log(messages);
        for (const message of messages) {
            if (!message.key.fromMe) {
                const text = getMessageText(message);
                if (text) {
                    // Send default welcome message
                    await sock.sendMessage(message.key.remoteJid, { text: "Selamat datang di Bot Whatsapp Uta, saya sedang memproses pesan anda" });

                    // Generate AI response and send it
                    const generatedText = await generateAIResponse(text);
                    await sock.sendMessage(message.key.remoteJid, { text: generatedText });
                }
            }
        }
    });
}

function getMessageText(message) {
    if (message.message.conversation) {
        return message.message.conversation;
    } else if (message.message.extendedTextMessage) {
        return message.message.extendedTextMessage.text;
    } else if (message.message.imageMessage && message.message.imageMessage.caption) {
        return message.message.imageMessage.caption;
    } else if (message.message.videoMessage && message.message.videoMessage.caption) {
        return message.message.videoMessage.caption;
    }
    // Add other message types as needed
    return null;
}

async function generateAIResponse(prompt) {
    try {
        const promptInIndonesian = `Jawab dalam bahasa Indonesia: ${prompt}`;
        const result = await model.generateContent(promptInIndonesian);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error generating AI response:', error);
        return 'Maaf, terjadi kesalahan dalam menghasilkan tanggapan.';
    }
}

connectToWhatsapp();
