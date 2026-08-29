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
body{background:#000;color:#00ff88;font-family:monospace;margin:0;padding:20px;overflow-x:hidden}
#bgVideo{position:fixed;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:-2;opacity:0.2}
.robot-wrap{display:flex;justify-content:center;perspective:800px;margin-top:20px}
.robot{font-size:90px;animation:turn 3s linear infinite;transform-style:preserve-3d;text-shadow:0 0 30px #00ff88,0 0 60px #00ff88;filter:drop-shadow(0 0 20px #00ff88)}
@keyframes turn{0%{transform:rotateY(0deg)}100%{transform:rotateY(360deg)}}
.robot-shadow{width:80px;height:15px;background:radial-gradient(#00ff88,transparent);border-radius:50%;margin:5px auto 10px;animation:shadow 3s ease-in-out infinite;opacity:0.5}
@keyframes shadow{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(0.6);opacity:0.2}}
h1{font-size:44px;text-align:center;letter-spacing:6px;margin:5px 0;text-shadow:0 0 20px #00ff88}
h1 span{color:white}
.sub{text-align:center;color:#666;letter-spacing:4px;font-size:11px;margin-bottom:25px}
.box{background:rgba(10,20,10,0.92);border:1px solid #00ff88;padding:25px;border-radius:20px;max-width:500px;margin:20px auto;text-align:center;box-shadow:0 0 40px #00ff8833}
input{width:85%;padding:14px;border-radius:12px;border:1px solid #00ff8833;background:#111;color:white;text-align:center;font-size:16px}
button{width:90%;padding:14px;background:#00ff88;color:black;border:none;border-radius:12px;font-weight:bold;margin-top:15px;cursor:pointer;box-shadow:0 0 25px #00ff88}
#code{font-size:34px;margin-top:18px;letter-spacing:4px;color:#fff;text-shadow:0 0 15px #00ff88;font-weight:bold}
.card{background:rgba(15,25,15,0.8);border:1px solid #00ff8833;border-radius:20px;padding:16px;margin:12px auto;max-width:500px}
.badge{background:#00ff88;color:black;padding:5px 14px;border-radius:6px;font-weight:bold;font-size:13px}
.status{color:#555;font-size:11px;margin-top:10px;display:flex;gap:6px;align-items:center}
.dot{width:8px;height:8px;background:#00ff88;border-radius:50%;animation:blink 1.5s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
.footer{text-align:center;color:#333;font-size:10px;margin-top:40px}
</style>
</head>
<body>
<video autoplay muted loop playsinline id="bgVideo">
<source src="https://videos.pexels.com/video-files/18069234/18069234-uhd_1440_1440_24fps.mp4" type="video/mp4">
</video>

<div class="robot-wrap"><div class="robot">🤖</div></div>
<div class="robot-shadow"></div>

<h1>BONY<span>XMD</span></h1>
<p class="sub">⚡ ROBOT SYSTEM ONLINE • TURNING 360°</p>

<div class="box">
<h3 style="margin-top:0">GET YOUR PAIR CODE</h3>
<input id="num" placeholder="2547XXXXXXXX"/>
<button onclick="getCode()">GET PAIR CODE</button>
<p id="code"></p>
<p id="msg" style="font-size:11px;color:#888"></p>
</div>

<div class="card"><span class="badge">PAIR SITE 1</span><span style="float:right">🤖</span><div style="color:#00ff88;margin-top:10px">bony-xmd-pair.onrender.com</div><div class="status"><div class="dot"></div> ROBOT ACTIVE • MAIN</div></div>
<div class="card"><span class="badge">PAIR SITE 2</span><span style="float:right">🤖</span><div style="color:#00ff88;margin-top:10px">bony-xmd-pair-2.onrender.com</div><div class="status"><div class="dot"></div> ROBOT ACTIVE • BACKUP</div></div>
<div class="card"><span class="badge">PAIR SITE 3</span><span style="float:right">🤖</span><div style="color:#00ff88;margin-top:10px">bony-xmd-pair-3.onrender.com</div><div class="status"><div class="dot"></div> ROBOT ACTIVE • US</div></div>

<p class="footer">BONY XMD • ROBOT MODE • BY BONYKE</p>

<script>
async function getCode(){
const n=document.getElementById('num').value;
if(!n){alert('Enter number');return}
document.getElementById('code').innerText='🤖 GENERATING...';
try{
const r=await fetch('/code?number='+encodeURIComponent(n));
const d=await r.json();
if(d.code){document.getElementById('code').innerText=d.code;document.getElementById('msg').innerText='WhatsApp > Linked Devices > Link with phone number';}
else{document.getElementById('code').innerText='❌';document.getElementById('msg').innerText=d.error;}
}catch(e){document.getElementById('msg').innerText=e.message;}
}
</script>
</body>
</html>
`);
});
app.get("/code", async (req,res)=>{
let num=req.query.number; if(!num) return res.json({error:"Enter number"}); num=num.replace(/[^0-9]/g,'');
let tempDir="./tmp/"+Date.now();
try{
const {state,saveCreds}=await useMultiFileAuthState(tempDir);
const sock=makeWASocket({auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,pino({level:"silent"}))},logger:pino({level:"silent"}),printQRInTerminal:false,browser:["BONY","Chrome","1.0"]});
sock.ev.on("creds.update",saveCreds);
await delay(3000);
if(!sock.authState.creds.registered){
let code=await sock.requestPairingCode(num);
code=code?.match(/.{1,4}/g)?.join("-")||code;
res.json({code:code});
setTimeout(()=>{try{sock.ws.close(); if(fs.existsSync(tempDir)) fs.rmSync(tempDir,{recursive:true,force:true});}catch{}},60000);
}else{res.json({error:"Already registered"});}
}catch(e){res.json({error:"Failed: "+e.message});}
});
app.listen(PORT,()=>console.log("BONY XMD Pair Running "+PORT));
