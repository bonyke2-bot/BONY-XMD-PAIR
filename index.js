const express = require('express');
const app = express();
const fs = require('fs');
const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers } = require("@whiskeysockets/baileys");
const pino = require("pino");

app.use(express.json());

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>BONY-XMD PAIR</title>
<style>body{background:#0a0e1a;color:#fff;font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}.box{background:#141a2e;padding:25px;border-radius:15px;width:90%;max-width:350px;text-align:center}input{width:90%;padding:12px;border-radius:8px;border:0;background:#0a0e1a;color:#fff;margin:10px 0;text-align:center}button{width:95%;padding:12px;border-radius:8px;border:0;background:#6c5ce7;color:#fff;font-weight:bold} #out{margin-top:15px;background:#000;padding:10px;border-radius:8px;word-break:break-all;display:none}</style>
</head><body><div class="box"><h3>BONY-XMD PAIR</h3><p>Number with country code</p><input id="n" placeholder="2547xxxxxxxx"><button onclick="go()">GET CODE</button><div id="out"></div><p id="s"></p></div>
<script>
async function go(){
 let v=document.getElementById('n').value.replace(/[^0-9]/g,'');
 if(v.length<10){alert('Enter full number');return}
 document.getElementById('s').innerText='Wait...';
 let a=await fetch('/code?number='+v); let b=await a.json();
 if(b.code){
  document.getElementById('out').style.display='block';
  document.getElementById('out').innerHTML='<b style=color:#6c5ce7;font-size:22px>'+b.code+'</b><br><br>Enter in WhatsApp > Linked Devices > Link with phone number<br><br>FAST! 20 sec only';
  document.getElementById('s').innerText='Code expires quick! Enter now!';
  chk(v);
 } else { document.getElementById('s').innerText=b.error; }
}
async function chk(v){
 let c=0; let iv=setInterval(async()=>{
  c++; let r=await fetch('/check?number='+v); let j=await r.json();
  if(j.session){ clearInterval(iv); document.getElementById('out').innerHTML='<b>SESSION:</b><br><br><div style=background:#111;padding:8px;font-size:10px;max-height:120px;overflow:auto>'+j.session+'</div><br><button onclick=navigator.clipboard.writeText(&quot;'+j.session+'&quot;)>COPY</button>'; document.getElementById('s').innerText='Copied! Use in Heroku'; }
  if(c>50){ clearInterval(iv); document.getElementById('s').innerText='Timeout - get new code'; }
 },3000);
}
</script></body></html>
  `);
});

let map = {};

app.get('/code', async (req, res) => {
  let num = req.query.number.replace(/[^0-9]/g,'');
  let dir = './auth_' + num;
  if(fs.existsSync(dir)) fs.rmSync(dir,{recursive:true});
  fs.mkdirSync(dir);
  try{
    let { state, saveCreds } = await useMultiFileAuthState(dir);
    let sock = makeWASocket({
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:"fatal"})) },
      logger: pino({level:"fatal"}),
      browser: Browsers.Ubuntu("Chrome"),
      printQRInTerminal: false
    });
    sock.ev.on("creds.update", saveCreds);
    map[num] = { sock, dir };
    await delay(3000);
    if(!sock.authState.creds.registered){
      let code = await sock.requestPairingCode(num);
      console.log('CODE', code, 'for', num);
      setTimeout(()=>{ try{sock.ws.close()}catch{}; if(fs.existsSync(dir)) fs.rmSync(dir,{recursive:true}); delete map[num]; }, 90000);
      return res.json({code});
    } else {
      return res.json({error: 'Already registered'});
    }
  }catch(e){
    console.log(e);
    return res.json({error: 'Failed: '+e.message});
  }
});

app.get('/check', async (req,res)=>{
  let num = req.query.number.replace(/[^0-9]/g,'');
  let m = map[num];
  if(!m) return res.json({});
  let dir = m.dir;
  if(fs.existsSync(dir+'/creds.json')){
    try{
      let raw = fs.readFileSync(dir+'/creds.json','utf8');
      let obj = JSON.parse(raw);
      if(obj.me){
        let b64 = Buffer.from(raw).toString('base64');
        let sess = 'BONY-BOT~'+b64;
        setTimeout(()=>{ if(fs.existsSync(dir)) fs.rmSync(dir,{recursive:true}); try{m.sock.ws.close()}catch{}; delete map[num]; }, 5000);
        return res.json({session: sess});
      }
    }catch{}
  }
  return res.json({waiting:true});
});

app.listen(10000, ()=>console.log('Running on 10000'));
