const express = require('express');
const app = express();
const pino = require("pino");
const fs = require("fs");
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");

function removeFile(p){ if(fs.existsSync(p)){ fs.rmSync(p,{recursive:true,force:true}) } }
app.use(express.json());

app.get('/', (req,res)=>{
res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#000;color:#0f0;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif}.box{border:2px solid #0f0;padding:20px;border-radius:15px;width:90%;max-width:380px;text-align:center}input{width:85%;padding:13px;border-radius:8px}button{background:#0f0;color:#000;padding:12px;border:none;border-radius:8px;font-weight:bold;width:90%}</style></head><body><div class="box"><h2>✅ BONY XMD PAIR</h2><input id="num" placeholder="2547xxxxxxx" type="number"><br><button onclick="getCode()">GET CODE</button><div id="code" style="margin-top:15px"></div></div><script>async function getCode(){let n=document.getElementById('num').value;if(!n)return alert('Enter number');document.getElementById('code').innerHTML='⏳ Wait 8 sec...';let r=await fetch('/code?number='+n);let j=await r.json();if(j.code)document.getElementById('code').innerHTML='CODE: <b style="font-size:32px">'+j.code+'</b><br><br><b>PASTE NOW! 15 SEC ONLY!</b><br>Linked Devices > Link with phone number';else document.getElementById('code').innerHTML=j.error}</script></body></html>`);
});

app.get('/code', async (req,res)=>{
 let num = req.query.number.replace(/[^0-9]/g,'');
 let dir = './auth_'+num;
 removeFile(dir);
 const { version } = await fetchLatestBaileysVersion();
 const { state, saveCreds } = await useMultiFileAuthState(dir);
 try{
  let sock = makeWASocket({
   version,
   auth:{creds:state.creds,keys:state.keys},
   logger:pino({level:"fatal"}).child({level:"fatal"}),
   browser:Browsers.ubuntu("Chrome"),
   printQRInTerminal:false,
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (s)=>{
   if(s.connection === 'open'){
    await delay(2500);
    let jid = num+'@s.whatsapp.net';
    await sock.sendMessage(jid, {text: "*BONY XMD... generating session id... ⏳*"});
    await delay(4000);
    let data = fs.readFileSync(dir+'/creds.json','utf-8');
    let sess = "BONY-XMD~"+Buffer.from(data).toString('base64');
    await
  if(!sock.authState.creds.registered){
   await delay(3500);
   let code = await sock.requestPairingCode(num);
   return res.send({code});
  }
 }catch(e){ res.send({error:"Failed: "+e.message}); removeFile(dir); }
});

app.listen(p
           
