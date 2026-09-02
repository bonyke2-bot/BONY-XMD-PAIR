import express from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { default as makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

const app = express();
app.use(express.json());
app.use(express.static('public'));

let sock;
let qrData = null;

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
    
    sock = makeWASocket({
      auth: state,
      browser: Browsers.macOS('Desktop'),
      printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', (update) => {
      const { connection, qr } = update;
      if(qr) qrData = qr;
      if(connection === 'open') qrData = null;
    });
    
    if(!sock.authState.creds.registered){
      await delay(1500);
      const code = await sock.requestPairingCode(number);
      return res.json({ code: code, sessionId });
    }
    
  } catch(e){
    res.json({ error: e.message });
  }
});

const delay = (ms) => new Promise(res => setTimeout(res, ms));
app.listen(process.env.PORT || 8080, () => console.log('BONY XMD Running'));
