const express = require('express');
const app = express();
const pino = require("pino");
const fs = require("fs");
let { default: makeWASocket, useMultiFileAuthState, Browsers, delay, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");

function removeFile(path){ if(fs.existsSync(path)){ fs.rmSync(path,{recursive:true,force:true}) } }

app.get('/', (req,res)=>{
res.send(`
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#000;color:#0f0;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:Arial}.box{border:2px solid #0f0;padding:25px;border-radius:15px;text-align:center;width:90%;max-width:350px}input{width:90%;padding:10px;border-radius:8px;border:none}button{width:95%;padding:12px;background:#0f0;border:none;border-radius:8px;font-weight:bold;margin-top:10px}</style></head>
<body><div class="box"><h2>BONY XMD PAIR</h2><input id="num" placeholder="2547xxxxxxx"><br><button onclick="go()">GET CODE</button><h3 id="out"></h3></div>
<script>
async function go(){
let n=document.getElementById('num').value;
if(!n){alert('Enter number');return}
document.getElementById('out').innerText='Wait...';
let r=await fetch('/code?number='+n);
let d=await r.json();
if(d.code){document.getElementById('out').innerHTML='YOUR CODE:<br><b style=font-size:32px>'+d.code+'</b><br><br>Paste fast!'}else{document.getElementById('out').innerText=d.error||'Failed'}}
</script></body></html>
`);
});

app.get('/code', async (req,res)=>{
let num = req.query.number.replace(/[^0-9]/g,'');
let dir = './auth_'+num;
removeFile(dir);
try{
let {version} = await fetchLatestBaileysVersion();
let {state,saveCreds} = await useMultiFileAuthState(dir);
let sock = makeWASocket({version,auth:state,logger:pino({level:'silent'}),browser:Browsers.macOS('Desktop'),printQRInTerminal:false});
sock.ev.on('creds.update',saveCreds);
sock.ev.on('connection.update',async (s)=>{
if(s.connection==='open'){
await delay(3000);
let data = fs.readFileSync(dir+'/creds.json');
let b64 = Buffer.from(data).toString('base64');
let code = 'BONY-XMD~'+b64;
await sock.sendMessage(num+'@s.whatsapp.net',{text:'*BONY XMD SESSION*\n\n'+code});
}
});
if(!sock.authState.creds.registered){
await delay(3500);
let pairingCode = await sock.requestPairingCode(num);
res.json({code:pairingCode});
await delay(90000);
removeFile(dir);
} else {
res.json({error:'Already registered'});
}
}catch(e){
console.log(e);
res.json({error:'Try again after 2 mins'});
removeFile(dir);
}
});

app.listen(process.env.PORT||3000,()=>console.log('BONY READY'));
