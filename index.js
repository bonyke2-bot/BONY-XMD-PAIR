const express = require('express');
const app = express();
const pino = require("pino");
const fs = require("fs");
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay } = require("@whiskeysockets/baileys");

function removeFile(p){ if(fs.existsSync(p)){ fs.rmSync(p, {recursive:true, force:true}) } }
app.use(express.json());

app.get('/', (req,res)=>{
res.send(`
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BONY XMD PAIR</title>
<style>
body{background:#000;color:#0f0;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:sans-serif;margin:0}
.box{border:2px solid #0f0;padding:25px;border-radius:15px;width:90%;max-width:380px;text-align:center;box-shadow:0 0 20px #0f0}
input{width:85%;padding:14px;border-radius:8px;border:none;margin:12px;font-size:16px;text-align:center}
button{background:#0f0;color:#000;padding:14px 25px;border:none;border-radius:8px;font-weight:bold;font-size:16px;width:90%}
#code{margin-top:20px;word-break:break-all;font-size:18px}
</style>
</head>
<body>
<div class="box">
<h2>✅ BONY XMD PAIR</h2>
<p>Enter WhatsApp number</p>
<input id="num" placeholder="2547xxxxxxx" type="number">
<button onclick="getCode()">GET PAIR CODE</button>
<div id="code"></div>
</div>
<script>
async function getCode(){
 let n=document.getElementById('num').value;
 if(!n) return alert('Enter number with country code');
 document.getElementById('code').innerHTML='<br>⏳ Generating... Wait 10s';
 let r=await fetch('/code?number='+n);
 let j=await r.json();
 if(j.code){
   document.getElementById('code').innerHTML='<br>YOUR CODE:<br><b style="font-size:32px;letter-spacing:5px">'+j.code+'</b><br><br><small>WhatsApp > Linked Devices > Link with phone number > Paste code</small><br><br><button onclick="getSession(\\''+n+'\\')">GET SESSION ID</button><div id="sess"></div>';
 } else {
   document.getElementById('code').innerHTML='<br>❌ '+ (j.error||'Failed');
 }
}
async function getSession(n){
 document.getElementById('sess').innerHTML='<br>Checking...';
 let r=await fetch('/session?number='+n);
 let j=await r.json();
 if(j.session){
   document.getElementById('sess').innerHTML='<br><b>SESSION ID:</b><br><textarea style="width:95%;height:120px;background:#111;color:#0f0;padding:10px">'+j.session+'</textarea><br><small>Copy to Heroku Config Vars</small>';
 } else {
   document.getElementById('sess').innerHTML='<br>⚠️ '+(j.error||'Not paired yet. Pair first then click again');
 }
}
</script>
</body>
</html>
`);
});

app.get('/code', async (req,res)=>{
  let num = req.query.number?.replace(/[^0-9]/g,'');
  if(!num) return res.send({error:"Add number"});
  let dir = './auth_'+num;
  removeFile(dir);
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  try{
    let sock = makeWASocket({
      version:[2,3000,1023223821],
      auth:{creds:state.creds,keys:state.keys},
      logger:pino({level:"fatal"}).child({level:"fatal"}),
      browser:Browsers.ubuntu("Chrome"),
      printQRInTerminal:false,
    });
    sock.ev.on('creds.update', saveCreds);
    if(!sock.authState.creds.registered){
      await delay(3000);
      let code = await sock.requestPairingCode(num);
      return res.send({code:code});
    }
  }catch(e){ res.send({error:"Failed: "+e.message}); removeFile(dir); }
});

app.get('/session', async (req,res)=>{
  let num = req.query.number?.replace(/[^0-9]/g,'');
  let dir = './auth_'+num;
  try{
    if(!fs.existsSync(dir+'/creds.json')) return res.send({error:"Not paired yet! Go pair in WhatsApp first"});
    let creds = fs.readFileSync(dir+'/creds.json','utf-8');
    let session = Buffer.from(creds).toString('base64');
    res.send({session: "BONY-XMD~"+session});
  }catch(e){res.send({error:"Session not found"})}
});

app.listen(process.env.PORT || 3000, ()=>console.log("BONY ACTIVE"));
