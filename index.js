const express = require('express');
const app = express();
const pino = require("pino");
const fs = require("fs");
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true })
};

app.use(express.json());

app.get('/', (req, res) => {
  res.send(`
  <html>
  <body style="background:black;color:white;text-align:center;padding:50px;font-family:sans-serif">
  <h1>BONY-XMD PAIR</h1>
  <p>Enter number with country code (2547...)</p>
  <form action="/code" method="get">
  <input name="number" placeholder="2547xxxxxxxx" style="padding:10px;width:200px"/>
  <button style="padding:10px;background:green;color:white">GET CODE</button>
  </form>
  </body></html>
  `);
});

app.get('/code', async (req, res) => {
    let num = req.query.number?.replace(/[^0-9]/g,'');
    if(!num) return res.send({error:"Add number ?number=2547..."});
    
    const { state, saveCreds } = await useMultiFileAuthState(`./auth_${num}`);
    try {
        let sock = makeWASocket({
            version: [2, 3000, 1023223821],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({level:"fatal"}).child({level:"fatal"})),
            },
            logger: pino({level:"fatal"}).child({level:"fatal"}),
            browser: Browsers.ubuntu("Chrome"),
        });
        sock.ev.on('creds.update', saveCreds);
        if(!sock.authState.creds.registered){
            await delay(3000);
            let code = await sock.requestPairingCode(num);
            if(!res.headersSent) res.send({code:code, number:num});
            await delay(10000);
            removeFile(`./auth_${num}`);
        }
    } catch(e){
        removeFile(`./auth_${num}`);
        if(!res.headersSent) res.status(503).send({error:e.message});
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("Running on "+PORT));
