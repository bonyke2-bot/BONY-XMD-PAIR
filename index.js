const express = require('express');
const app = express();
const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs');

app.use(express.json());
app.use(express.static('public'));

// HOMEPAGE - CypherX Style
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BONY-XMD - Pair Code</title>
<style>
body{background:#0a0e1a;color:white;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.card{background:#141a2e;padding:30px;border-radius:20px;width:90%;max-width:400px;text-align:center;border:1px solid #1e2a4a}
input{width:100%;padding:15px;border-radius:10px;border:none;background:#0a0e1a;color:white;margin:15px 0;font-size:18px;text-align:center}
button{width:100%;padding:15px;border-radius:10px;border:none;background:#6c5ce7;color:white;font-weight:bold;font-size:16px;cursor:pointer}
#result{margin-top:20px;word-break:break-all;background:#0a0e1a;padding:15px;border-radius:10px;display:none;text-align:left}
h2{margin:0;color:#6c5ce7} p{color:#8892b0;font-size:14px}
</style>
</head>
<body>
<div class="card">
<h2>BONY-XMD</h2>
<p>Enter your WhatsApp number with country code</p>
<input id="number" placeholder="2547XXXXXXXX" type="text"/>
<button onclick="getCode()">GET PAIR CODE</button>
<div id="result"></div>
<p id="status" style="margin-top:15px"></p>
</div>
<script>
async function getCode(){
 const num=document.getElementById('number').value;
 if(!num){alert('Enter number');return}
 document.getElementById('status').innerText='Generating...';
 const res=await fetch('/code?number='+num);
 const data=await res.json();
 if(data.code){
  document.getElementById('result').style.display='block';
  document.getElementById('result').innerHTML='<b>PAIR CODE: <span style=color:#6c5ce7;font-size:24px>'+data.code+'</span></b><br><br><small>Go to WhatsApp > Linked Devices > Link with Phone Number > Enter this code<br><br>Wait... Session will appear here...</small>';
  checkSession(num);
 } else {
  document.getElementById('status').innerText=data.error || 'Error';
 }
}
async function checkSession(num){
 let tries=0;
 let interval=setInterval(async()=>{
  tries++;
  const res=await fetch('/session?number='+num);
  const data=await res.json();
  if(data.session){
   clearInterval(interval);
   document.getElementById('result').innerHTML='<b>✅ SESSION GENERATED!</b><br><br><div style=background:#000;padding:10px;border-radius:8px;font-size:12px>'+data.session+'</div><br><button onclick=navigator.clipboard.writeText(\\''+data.session+'\\')>COPY SESSION</button><br><br><small>Use this in Heroku Config Vars as SESSION_ID</small>';
   document.getElementById('status').innerText='Success! Copied?';
  }
  if(tries>60){clearInterval(interval); document.getElementById('status').innerText='Timeout, try again';}
 },3000);
}
</script>
</body>
</html>
  `);
});

let sessions = {};

app.get('/code', async (req, res) => {
  let num = req.query.number.replace(/[^0-9]/g,'');
  if(!num) return res.json({error:'Invalid number'});

  const dir = './auth_'+num;
  if(fs.existsSync(dir)) fs.rmSync(dir,{recursive:true});
  fs.mkdirSync(dir);

  const { state, saveCreds } = await useMultiFileAuthState(dir);

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({level:"fatal"})),
    },
    printQRInTerminal: false,
    logger: pino({level:"fatal"}),
    browser: Browsers.macOS("Desktop"),
  });

  sock.ev.on("creds.update", saveCreds);

  if(!sock.authState.creds.registered){
    await delay(1500);
    let code = await sock.requestPairingCode(num);
    console.log('CODE for',num,':',code);
    sessions[num]= { sock, dir };
    return res.json({code});
  } else {
    return res.json({error:'Already registered'});
  }
});

app.get('/session', async (req,res)=>{
  let num = req.query.number.replace(/[^0-9]/g,'');
  let sess = sessions[num];
  if(!sess) return res.json({waiting:true});

  const dir = sess.dir;
  // Check if creds.json exists and is logged in
  if(fs.existsSync(dir+'/creds.json')){
    try{
      const creds = JSON.parse(fs.readFileSync(dir+'/creds.json'));
      if(creds.me){
        // Generate BONY-BOT~ session
        const data = fs.readFileSync(dir+'/creds.json','utf8');
        const b64 = Buffer.from(data).toString('base64');
        const sessionId = 'BONY-BOT~'+b64;

        // Cleanup
        setTimeout(()=>{ if(fs.existsSync(dir)) fs.rmSync(dir,{recursive:true}); delete sessions[num]; },5000);

        return res.json({session: sessionId});
      }
    }catch(e){}
  }
  return res.json({waiting:true});
});

app.listen(3000, ()=> console.log('BONY-XMD Pair running on 3000'));
