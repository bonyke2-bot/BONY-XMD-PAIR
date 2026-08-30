const express = require('express');
const app = express();
const pino = require("pino");
const fs = require("fs");
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay } = require("@whiskeysockets/baileys");

function removeFile(p){ if(fs.existsSync(p)){ fs.rmSync(p, {recursive:true, force:true}) } }
app.use(express.json());

app.get('/', (req,res)=>{
  res.send(`<html><body style="background:#000;color:#0f0;text-align:center;padding:50px"><h1>BONY XMD PAIR ACTIVE ✅</h1><p>Use /code?number=2547xxxxxx</p></body></html>`);
});

app.get('/code', async (req,res)=>{
  let num = req.query.number?.replace(/[^0-9]/g,'');
  if(!num) return res.send({error:"Add ?number=2547xxx"});
  let dir = `./auth_${num}`;
  removeFile(dir);
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  let retries = 0;
  async function start(){
    try{
      let sock = makeWASocket({
        version: [2, 3000, 1023223821],
        auth: { creds: state.creds, keys: state.keys },
        logger: pino({level:"fatal"}).child({level:"fatal"}),
        browser: Browsers.ubuntu("Chrome"),
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });
      sock.ev.on('creds.update', saveCreds);
      sock.ev.on('connection.update', async (s)=>{
        const { connection, lastDisconnect } = s;
        if(connection === 'close'){
          let code = lastDisconnect?.error?.output?.statusCode;
          if(code !== 401 && retries < 3){ retries++; await delay(2000); start(); }
          else { removeFile(dir); }
        }
      });
      if(!sock.authState.creds.registered){
        await delay(1500);
        let code = await sock.requestPairingCode(num);
        res.send({code: code});
      }
    }catch(e){ console.log(e); res.send({error:"Failed: "+e.message}); removeFile(dir); }
  }
  await start();
});

app.listen(process.env.PORT || 3000, ()=> console.log("Alive"));
