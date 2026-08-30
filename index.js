const express = require('express');
const app = express();
const pino = require("pino");
const fs = require("fs");
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore, DisconnectReason } = require("@whiskeysockets/baileys");

function removeFile(p){ if(fs.existsSync(p)) fs.rmSync(p,{recursive:true,force:true}) }
app.use(express.json());

app.get('/', (req,res)=>{
  res.send(`<html><body style="background:#000;color:#fff;text-align:center;padding:40px;font-family:sans-serif"><h1>BONY-XMD PAIR V2</h1><form action="/code"><input name="number" placeholder="2547xxxxxxxx" style="padding:12px;width:220px"><br><br><button style="padding:12px 20px;background:#25D366;color:#000;font-weight:bold;border:none">GET CODE</button></form><p>Enter number WITHOUT +</p></body></html>`);
});

app.get('/code', async (req,res)=>{
  let num = req.query.number?.replace(/[^0-9]/g,'');
  if(!num) return res.send({error:"Add ?number=2547..."});
  let dir = `./auth_${num}`;
  removeFile(dir);
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  let retries = 0;
  async function start(){
    try{
      let sock = makeWASocket({
        version: [2,3000,1015901307],
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:"fatal"}).child({level:"fatal"})) },
        logger: pino({level:"fatal"}).child({level:"fatal"}),
        browser: Browsers.ubuntu("Chrome"),
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });
      sock.ev.on('creds.update', saveCreds);
      sock.ev.on('connection.update', async (u)=>{
        const { connection, lastDisconnect } = u;
        if(connection === 'close'){
          let code = lastDisconnect?.error?.output?.statusCode;
          if(code !== 401 && retries < 3){ retries++; console.log("Retry "+retries); await delay(2000); start(); }
        }
      });
      if(!sock.authState.creds.registered){
        await delay(5000);
        let code = await sock.requestPairingCode(num);
        console.log("CODE:",code,"for",num);
        if(!res.headersSent) res.send({code:code});
        await delay(20000);
        removeFile(dir);
      }
    }catch(e){
      console.log("Error:",e.message);
      if(e.message.includes("Connection Closed") && retries < 3){ retries++; await delay(3000); return start(); }
      removeFile(dir);
      if(!res.headersSent) res.status(500).send({error:e.message, retry:true});
    }
  }
  await start();
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log("Pair running "+PORT));
