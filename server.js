import crypto from 'crypto';
global.crypto = crypto;
globalThis.crypto = crypto;

import express from 'express';
import pino from 'pino';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const baileys = await import('@whiskeysockets/baileys');
const makeWASocket = baileys.makeWASocket;
const useMultiFileAuthState = baileys.useMultiFileAuthState;
const delay = baileys.delay;

const app = express();
app.use(cors());
app.use(express.json());

let sessions = {};
let socks = {};

app.get('/', (req,res)=>{
  res.send(`<!DOCTYPE html><html><head><title>BONY XMD</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#000;color:#fff;font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}.card{background:#111;padding:25px;border-radius:15px;width:92%;max-width:420px;text-align:center;border:1px solid #333}h2{color:#25D366}input{width:100%;padding:13px;margin:10px 0;border-radius:8px;border:none;background:#222;color:#fff;box-sizing:border-box}button{width:100%;padding:13px;background:#25D366;border:none;border-radius:8px;color:#000;font-weight:bold;cursor:pointer}#out{margin-top:15px;word-break:break-all;background:#222;padding:12px;border-radius:8px;font-size:11px;display:none;text-align:left}</style></head><body><div class="card"><h2>BONY XMD SESSION</h2><input id="num" placeholder="2547XXXXXXXX"><button onclick="getCode()">GET CODE</button><h3 id="pair" style="color:#25D366;letter-spacing:4px;font-size:28px"></h3><div id="out"></div><p id="status"></p></div><script>
async function getCode(){let n=document.getElementById('num').value.replace(/[^0-9]/g,'');if(n.length<10)return alert('weka number sahihi');document.getElementById('pair').innerText='Loading...';let r=await fetch('/code?number='+n);let d=await r.json();if(d.code){document.getElementById('pair').innerText=d.code;let check=setInterval(async()=>{let s=await fetch('/session?number='+n);let sd=await s.json();if(sd.session){clearInterval(check);document.getElementById('out').style.display='block';document.getElementById('out').innerText=sd.session;document.getElementById('status').innerText='COPY HII SESSION!'}},3000);}else{alert(d.error)}}
</script></body></html>`);
});

app.get('/code', async (req,res)=>{
  try{
    let num = req.query.number.replace(/[^0-9]/g,'');
    let dir = 'auth_' + num;
    if(fs.existsSync(dir)) fs.rmSync(dir,{recursive:true,force:true});
    const {state, saveCreds} = await useMultiFileAuthState(dir);
    const sock = makeWASocket({auth: state, logger: pino({level:'silent'}), printQRInTerminal:false, browser:['BONY XMD','Chrome','1.0']});
    socks[num]=sock;
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u)=>{
      if(u.connection==='open'){
        await delay(2000);
        try{
          let data = fs.readFileSync(path.join(dir,'creds.json'));
          sessions[num]='BONY-XMD~'+Buffer.from(data).toString('base64');
        }catch{}
        try{await sock.logout()}catch{}
      }
    });
    await delay(3000);
    let code = await sock.requestPairingCode(num);
    res.json({code: code.match(/.{1,4}/g).join('-')});
  }catch(e){
    console.log(e);
    res.json({error: 'Failed: '+ e.message});
  }
});

app.get('/session', (req,res)=>{
  let num=req.query.number;
  res.json({session: sessions[num] || null});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('BONY XMD Running on '+PORT));
