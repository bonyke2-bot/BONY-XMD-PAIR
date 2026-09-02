import express from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';
import { default as makeWASocket, useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static('public'));

let qrData = null;

// HOMEPAGE FIX
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/qr', async (req, res) => {
  if(qrData){
    const qrImage = await QRCode.toDataURL(qrData);
    return res.json({ qr: qrImage });
  }
  res.json({ qr: null });
});

app.post('/pair', async (req, res) => {
  try {
    const { number } = req.body;
    if(!number) return res.status(400).json({ error: 'Enter number' });
    
    const sessionId = 'auth_' + crypto.randomBytes(4).toString('hex');
    const { state, saveCreds } = await useMultiFileAuthState(sessionId);
    
    const sock = makeWASocket({
      auth: state,
      browser: Browsers.macOS('Desktop'),
      printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', (update) => {
      const { qr } = update;
      if(qr) qrData = qr;
    });
    
    if(!sock.authState.creds.registered){
      await new Promise(res => setTimeout(res, 1500));
      const code = await sock.requestPairingCode(number);
      return res.json({ code: code });
    }
    
  } catch(e){
    res.json({ error: e.message });
  }
});

app.listen(process.env.PORT || 8080, () => console.log('BONY XMD Running'));
