import express from "express";
import { makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore } from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs";
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req,res)=>{
res.send(`
<!DOCTYPE html>
<html>
<head>
<title>BONY XMD - Pair</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{background:#050a05;color:#00ff88;font-family:monospace;margin:0;padding:20px;overflow-x:hidden}
.bg{position:fixed;top:0;left:0;width:100%;height:100%;background:radial-gradient(circle at 20% 30%, #00ff8822 0%, transparent 40%), radial-gradient(circle at 80% 70%, #00ff8822 0%, transparent 40%);z-index:-1}
.glow{position:fixed;width:15px;height:15px;background:#00ff88;border-radius:50%;box-shadow:0 0 20px #00ff88,0 0 40px #00ff88;animation:float 6s infinite}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}
h1{font-size:48px;text-align:center;letter-spacing:5px;margin-top:40px;text-shadow:0 0 20px #00ff88}
h1 span{color:white}
.sub{text-align:center;color:#666;letter-spacing:4px;font-size:12px;margin-bottom:40px}
.card{background:rgba(15,25,15,0.8);border:1px solid #00ff8833;border-radius:20px;padding:20px;margin:15px auto;max-width:500px;backdrop-filter:blur(10px);transition:0.3s;cursor:pointer}
.card:hover{border-color:#00ff88;box-shadow:0 0 30px #00ff8844;transform:translateY(-3px)}
.badge{background:#00ff88;color:black;padding:6px 18px;border-radius:6px;font-weight:bold;font-size:14px;display:inline-block}
.link{color:#00ff88;font-size:18px;margin:15px 0 5px 0;display:block;text-decoration:none}
.url{color:#444;font-size:12px}
.status{border-top:1px solid #ffffff11;margin-top:15px;padding-top:10px;color:#555;font-size:11px;display:flex;align-items:center;gap:6px}
.dot{width:8px;height:8px;background:#00ff88;border-radius:50%;box-shadow:0 0 10px #00ff88;animation:blink 2s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
.box{background:rgba(15,25,15,0.9);border:1px solid #00ff88;padding:25px;border-radius:20px;max-width:500px;margin:30px auto;text-align:center}
input{width:85%;padding:14px;border-radius:12px;border:1px solid #00ff8833;background:#111;color:white;text-align:center;font-size:16px}
button{width:90%;padding:14px;background:#00ff88;color:black;border:none;border-radius:12px;font-weight:bold;font-size:16px;margin-top:15px;cursor:pointer;box-shadow:0 0 20px #00ff8844}
#code{font-size:32px;margin-top:20px;letter-spacing:4px;font-weight:bold;color:#fff;text-shadow:0 0 10px #00ff88}
.footer{text-align:center;color:#333;font-size:10px;margin-top:50px;letter-spacing:2px}
.footer b{color:#00ff88}
</style>
</head>
<body>
<div class="bg"></div>
<div class="glow" style="top:15%;left:10%"></div>
<div class="glow" style="top:60%;left:5%"></div>
<div class="glow" style="top:30%;right:10%"></div>
<div class="glow" style="top:80%;right:15%"></div>

<h1>BONY<span>XMD</span></h1>
<p class="sub">⚡ PAIR SITES - SELECT TO CONNECT</p>

<div class="box">
<h3 style="margin:0 0 10px 0">GET YOUR PAIR CODE</h3>
<input id="num" placeholder="2547XXXXXXXX"/>
<button onclick="getCode()">GET PAIR CODE</button>
<p id="code"></p>
<p id="msg" style="font-size:11px;color:#888"></p>
</div>

<div class="card" onclick="window.scrollTo(0,0)">
<span class="badge">PAIR SITE 1</span><span style="float:right">→</span>
<span class="link">bony-xmd-pair.onrender.com</span>
<span class="url">https://bony-xmd-pair.onrender.com</span>
<div class="status"><div class="dot"></div> ONLINE • RENDER CLOUD • MAIN SERVER</div>
</div>

<div class="card" onclick="alert('Use Server 1 for now - Server 2 coming soon')">
<span class="badge">PAIR SITE 2</span><span style="float:right">→</span>
<span class="link">bony-xmd-pair-2.onrender.com</span>
<span class="url">https://bony-xmd-pair-2.onrender.com</span>
<div class="status"><div class="dot"></div> ONLINE • BACKUP SERVER</div>
</div>

<div class="card" onclick="alert('Use Server 1 for now - Server 3 coming soon')">
<span class="badge">PAIR SITE 3</span><span style="float:right">→</span>
<span class="link">bony-xmd-pair-3.onrender.com</span>
<span class="url">https://bony-xmd-pair-3.onrender.com</span>
<div class="status"><div class="dot"></div> ONLINE • US REGION</div>
</div>

<p class="footer"><b>BONY XMD</b> • BY BONYKE • ALL CONNECTIONS SSL SECURED</p>

<script>
async function getCode(){
const num=document.getElementById('num').value;
if(!num){alert('Enter number!');return}
document.getElementById('code').innerText='⏳ GENERATING...';
try{
const res=await fetch('/code?number='+encodeURIComponent(num));
const data=await res.json();
if(data.code){
document.getElementById('code').innerText=data.code;
document.getElementById('msg').innerText='Go to WhatsApp > Linked Devices > Link with phone number > Enter this code';
}else{
document.getElementById('code').innerText='❌ ERROR';
document.getElementById('msg').innerText=data.error||'Failed';
}
}catch(e){
document.getElementById('code').innerText='ERROR';
document.getElementById('msg').innerText=e.message;
}
}
</script>
</body>
</html>
`);
});

app.get("/code", async (req,res)=>{
let num=req.query.number; if(!num) return res.json({error:"Enter number"}); num=num.replace(/[^0-9]/g,'');
let tempDir = "./tmp/"+Date.now();
try{
if(fs.existsSync("./auth")) fs.rmSync("./auth",{recursive:true,force:true});
const {state,saveCreds}=await useMultiFileAuthState(tempDir);
const sock=makeWASocket({auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,pino({level:"silent"}))},logger:pino({level:"silent"}),printQRInTerminal:false,browser:["BONY","Chrome","1.0"]});
sock.ev.on("creds.update",saveCreds);
await delay(3000);
if(!sock.authState.creds.registered){
let code=await sock.requestPairingCode(num);
code=code?.match(/.{1,4}/g)?.join("-")||code;
res.json({code:code});
setTimeout(()=>{try{sock.ws.close(); if(fs.existsSync(tempDir)) fs.rmSync(tempDir,{recursive:true,force:true});}catch{}},5000);
}else{res.json({error:"Already registered"});}
}catch(e){res.json({error:"Failed: "+e.message});
if(fs.existsSync(tempDir)) try{fs.rmSync(tempDir,{recursive:true,force:true})}catch{}
}
});
app.listen(PORT,()=>console.log("BONY XMD Pair Running on "+PORT));
