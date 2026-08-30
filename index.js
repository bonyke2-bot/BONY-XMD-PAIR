const express = require('express');
const app = express();
const pino = require("pino");
const fs = require("fs");
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay } = require("@whiskeysockets/baileys");

function removeFile(p){ if(fs.existsSync(p)){ fs.rmSync(p,{recursive:true,force:true}) } }
app.use(express.json());

app.get('/', (req,res)=>{
res.send(`
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BONY XMD</title>
<style>
body{background:#000;color:#0f0;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif}
.box{border:2px solid #0f0;padding:20px;border-radius:15px;width:90%;max-width:380px;text-align:center;box-shadow:0 0 20px #0f0}
input{width:85%;padding:13px;border-radius:8px;border:none;margin:10px}
button{background:#0f0;color:#000;padding:12px 20px;border:none;border-radius:8px;font-weight:bold;width:90%}
</style>
</head>
<body>
<div class="box">
<h2>✅ BONY XMD PAIR</h2>
<input id="num" placeholder="2547xxxxxxxx" type="number">
<br>
<button onclick="getCode()">GET PAIR CODE</button>
<div id="code" style="margin-top:15px;word-break:break-all"></div>
</div>
<script>
async function getCode(){
 let n=document.getElementById('num').value;
 if(!n)return alert('Enter number with country code');
 document.getElementById('code').innerHTML='<br>⏳ Generating...';
 let r=await fetch('/code?number='+n);
 let j=await r.json();
 if(j.code){
  document.getElementById('code').innerHTML='<br>CODE: <b style="font-size:28px;letter-spacing:4px">'+j.code+'</b><br><br>WhatsApp > Linked Devices > Link with phone number<br>Paste code<br><br>After pairing, check your WhatsApp inbox! Session will be sent there automatically';
 }else{
  document.getElementById('code').innerHTML='❌ '+j.error;
 }
}
</script>
</body>
</html>
`);
});

app.get('/code', async (req,res)=>{
 let num = req.query.number.replace(/[^0-9]/g,'');
 let dir = './auth_'+num;
 removeFile(dir);
 const { state, saveCreds } = await useMultiFileAuthState(dir);
 try{
  let sock = makeWASocket({
   version:[2,3000,1023223821],
   auth:{creds:state.creds,keys:state.keys},
   logger:pino({level:"fatal"}).child({level:"fatal"}),
   browser:Browsers.ubuntu("Chrome"),
  });
  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', async (s)=>{
   if(s.connection === 'open'){
    await delay(2000);
    try{
     let jid = num+'@s.whatsapp.net';
     await sock.sendMessage(jid, {text: "*BONY XMD... generating session id... ⏳*"});
     await delay(5000);
     let credsData = fs.readFileSync(dir+'/creds.json','utf-8');
     let session = "BONY-XMD~"+Buffer.from(credsData).toString('base64');
     await sock.sendMessage(jid, {text: `*✅ Successfully generated!*\n\n*Copy your session id:*\n\n${session}`});
    }catch(e){ console.log(e.message); }
   }
  });

  if(!sock.authState.creds.registered){
   await delay(2000);
   let code = await sock.requestPairingCode(num);
   return res.send({code});
  }
 }catch(e){
  res.send({error:e.message});
  removeFile(dir);
 }
});

app.listen(process.env.PORT || 3000, ()=>console.log("BONY READY"));
