const express = require('express');
const app = express();
const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs');

app.use(express.json());

app.get('/', (req,res)=>{res.send(`
<html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{background:#0a0e1a;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}.card{background:#141a2e;padding:25px;border-radius:20px;width:90%;max-width:380px;text-align:center}input{width:100%;padding:14px;border-radius:10px;border:none;background:#0a0e1a;color:#fff;margin:12px 0;font-size:18px;text-align:center;box-sizing:border-box}button{width:100%;padding:14px;border-radius:10px;border:none;background:#6c5ce7;color:#fff;font-weight:bold;cursor:pointer}#result{margin-top:15px;word-break:break-all;background:#0a0e1a;padding:12px;border-radius:10px;display:none;font-size:12px}</style>
</head><body><div class="card"><h2 style="color:#6c5ce7">BONY-XMD</h2><p style="color:#8892b0">Enter number without + or spaces<br>Ex: 254712345678</p><input id="num" placeholder="2547XXXXXXXX"/><button onclick="getCode()">GET CODE</button><div id="result"></div><p id="sta"></p></div>
<script>
async function getCode(){
 let n=document.getElementById('num').value.replace(/[^0-9]/g,'');
 if(n.length<10){alert('Enter full number with country code e.g 2547...');return}
 document.getElementById('sta').innerText='Requesting... Wait';
 let r=await fetch('/code?number='+n); let d=await r.json();
 if(d.code){
  document.getElementById('result').style.display='block';
  document.getElementById('result').innerHTML='<b style=font-size:20px;color:#6c5ce7>'+d.code+'</b><br><br>1. WhatsApp > Linked Devices<br>2. Link a Device<br>3. Click <b>Link with phone number</b><br>4. Enter this code <b>FAST within 20 sec</b>';
  document.getElementById('sta').innerText='Code expires in 30 sec! Enter FAST!';
  check(n);
 }else{ document.getElementById('sta').innerText=d.error||'Error, try again'; }
}
async function check(n){
 let t=0; let iv=setInterval(async()=>{
  t++; let r=await fetch('/check?number='+n); let d=await r.json();
  if(d.session){clearInterval(iv); document.getElementById('result').innerHTML='<b>✅ SESSION READY!</b><br><br><div style=background:#000;padding:10px;border-radius:8px;max-height:150px;overflow:auto>'+d.session+'</div><br><button onclick=navigator.clipboard.writeText(\\''+d.session+'\\').then(()=>alert(\\'Copied!\\'))>COPY SESSION</button>'; document.getElementById('sta').innerText='Use in Heroku as SESSION_ID';}
  if(t>40){clearInterval(iv); document.getElementById('sta').innerText='Timed out - Get new code';}
 },3000);
}
</script></body></html>
`)});

let stores={};

app.get('/code', async(req,res)=>{
 let num=req.query.number.replace(/[^0-9]/g,'');
 console.log('Request code for',num);
 let dir='./auth_'+num;
 if(fs.existsSync(dir)) fs.rmSync(dir,{recursive:true});
 fs.mkdirSync(dir);
 try{
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const sock = makeWASocket({
   auth:{ creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys, pino({level:"fatal"})) },
   printQRInTerminal:false,
   logger:pino({level:"fatal"}),
   browser:Browsers.macOS("Safari"),
  });
  sock.ev.on("creds.update", saveCreds);
  stores[num]={sock,dir};

  await delay(2000);
  if(!sock.authState.creds.registered){
   let code = await sock.requestPairingCode(num);
   console.log('CODE:',code,'for',num);
   // Keep alive 120 sec
   setTimeout(()=>{ try{sock.ws.close()}catch{}; if(fs.existsSync(dir)) fs.rmSync(dir,{recursive:true}); delete stores[num]; },120000);
   return res.json({code});
  } else {
   return res.json({error:'Already registered'});
  }
 }catch(e){
  console.log(e);
  return res.json({error:'Failed: '+e.message+' - Try again'});
 }
});

app.get('/check', async(req,res)=>{
 let num=req.query.number.replace(/[^0-9]/g,'');
 let s=stores[num];
 if(!s) return res.json({waiting:true});
 let dir=s.dir;
 if(fs.existsSync(dir+'/creds.json')){
  try{
   let raw=fs.readFileSync(dir+'/creds.json','utf8');
   let j=JSON.parse(raw);
   if(j.me){
    let b64=Buffer.from(raw).toString('base64');
    let sess='BONY-BOT~'+b64;
    setTimeout(()=>{ if(fs.existsSync(dir)) fs.rmSync(dir,{recursive:true}); try{stores[num].sock.ws.close()}catch{}; delete stores[num]; },5000);
    return res.json({session:sess});
   }
  }catch{}
 }
 return res.json({waiting:true});
});

app.listen(3000,()=>console.log('Running'));
