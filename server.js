import crypto from 'crypto';
// FORCE overwrite - lazima kabla ya baileys
global.crypto = crypto;
globalThis.crypto = crypto;

import express from 'express';
import pino from 'pino';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

// Dynamic import baileys BAADA ya crypto kuwekwa
const { makeWASocket, useMultiFileAuthState, delay } = await import('@whiskeysockets/baileys');

const app = express();
app.use(cors());
app.use(express.json());

let sessions = {};
let socks = {};

app.get('/', (req,res)=>{
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>BONY XMD SESSION</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{background:#000;color:#fff;font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.card{background:#111;padding:25px;border-radius:15px;width:92%;max-width:420px;text-align:center;border:1px solid #333;box-shadow:0 0 20px #25D36633}
h2{color:#25D366;margin-bottom:20px}
input{width:100%;padding:13px;margin:10px 0;border-radius:8px;border:none;background:#222;color:#fff;box-sizing:border-box;font-size:15px}
button{width:100%;padding:13px;background:#25D366;border:none;border-radius:8px;color:#000;font-weight:bold;cursor:pointer;font-size:15px}
#out{margin-top:15px;word-break:break-all;background:#222;padding:12px;border-radius:8px;font-size:12px;display:none;text-align:left}
.loader{border:3px solid #222;border-top:3px solid #25D366;border-radius:50%;width:20px;height:20px;animation:spin 1s linear infinite;margin:10px auto;display:none}
@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.footer{margin-top:15px;font-size:12px;color:#666}
</style>
</head>
<body>
<div class="card">
<h2>BONY XMD SESSION</h2>
<input id="num" placeholder="2547XXXXXXXX" type="tel" maxlength="15">
<button onclick="getCode()">GET PAIRING CODE</button>
<div class="loader" id="load"></div>
<h3 id="pair" style="color:#25D366;letter-spacing:4px;font-size:28px;margin:15px 0"></h3>
<div id="out"></div>
<p id="status" style="color:#aaa;font-size:13px"></p>
<div class="footer">Enter number with country code. No + or 0</div>
</div>
<script>
let check;
async function getCode(){
  let n=document.getElementById('num').value.replace(/[^0-9]/g,'');
  if(n.length < 10) return alert('Enter valid number with country code');
  document.getElementById('load').style.display='block';
  document.getElementById('pair').innerText='Generating...';
  document.getElementById('status').innerText='';
  document.getElementById('out').style.display='none';
  let r=await fetch('/code?number='+n);
  let d=await r.json();
  document.getElementById('load').style.display='none';
  if(d.code){
    document.getElementById('pair').innerText=d.code;
    document.getElementById('status').innerText='Go to WhatsApp > Linked Devices > Link with phone number';
    check=setInterval(async()=>{
      let s=await fetch('/session?number='+n);
      let sd=await s.json();
      if(sd.session){
        clearInterval(check);
        document.getElementById('out').style.display='block';
        document.getElementById('out').innerText=sd.session;
        document.getElementById('status').innerText='✅ COPY THIS SESSION ID AND PASTE IN YOUR BOT!';
      }
    },3000);
  }else{
    alert(d.error || 'Failed to generate code')
  }
}
</script>
</body>
</html>
`);
});

app.get('/code', async (req,res)=>{
  try{
    let num = req.query.number.replace(/[^0-9]/g,'');
    if(!num) return res.json({error: 'Invalid number'});
    const dir = \`./auth_\${num}\`;
    if(fs.existsSync(dir)) fs.rmSync(dir,{recursive:true,force:true});
    if(socks[num]) { try{await socks[num].logout()}catch{} delete socks[num]; }
    const {state, saveCreds} = await useMultiFileAuthState(dir);
    const sock = makeWASocket({
      auth: state,
      logger: pino({level:'silent'}),
      printQRInTerminal: false,
      browser: ['BONY XMD','Chrome','1.0']
    });
    socks[num] = sock;
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u)=>{
      const {connection} = u;
      if(connection === 'open'){
        await delay(2000);
        try{
          let data = fs.readFileSync(path.join(dir,'creds.json'));
          let b64 = Buffer.from(data).toString('base64');
          sessions[num] = 'BONY-XMD~' + b64;
          setTimeout(() => { delete sessions[num]; }, 5*60*1000);
        }catch(e){}
        await delay(1000);
        try{await sock.logout()}catch{}
        delete socks[num];
      }
      if(connection === 'close'){
        delete socks[num];
      }
    });
    await delay(3000);
    let code = await sock.requestPairingCode(num);
    res.json({code: code.match(/.{1,4}/g).join('-')});
  }catch(e){
    console.log(e);
    res.json({error: 'Failed: ' + e.message})
  }
});

app.get('/session', (req,res)=>{
  let num = req.query.number;
  if(sessions[num]) res.json({session: sessions[num]});
  else res.json({session: null});
});

setInterval(()=>{
  try{
    fs.readdirSync('./').forEach(f=>{
      if(f.startsWith('auth_')){
        fs.rmSync(f,{recursive:true,force:true})
      }
    })
  }catch{}
}, 10*60*1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(\`BONY XMD Running on port \${PORT}\`));
