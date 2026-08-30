const express = require('express');
const app = express();
const pino = require("pino");
let { toBuffer } = require("qrcode");
const path = require('path');
const fs = require("fs");
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true })
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'pair.html'));
});

// Pair Code Route
app.get('/code', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.status(400).send({ error: "Number required" });
    
    num = num.replace(/[^0-9]/g, '');
    
    async function getPCode() {
        const { state, saveCreds } = await useMultiFileAuthState(`./auth_${num}`);
        try {
            let sock = makeWASocket({
                version: [2, 3000, 1023223821],
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.ubuntu("Chrome"),
                markOnlineOnConnect: false,
            });

            sock.ev.on('creds.update', saveCreds);

            if (!sock.authState.creds.registered) {
                await delay(3000);
                let code = await sock.requestPairingCode(num);
                console.log(`Pair code for ${num}: ${code}`);
                if (!res.headersSent) {
                    res.send({ code: code });
                }
                await delay(8000);
                removeFile(`./auth_${num}`);
            }

        } catch (err) {
            console.error("Error in pairing:", err);
            removeFile(`./auth_${num}`);
            if (!res.headersSent) {
                res.status(503).send({ error: err.message });
            }
        }
    }
    await getPCode();
});

app.get('/pair', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.status(400).send({ error: "Number required" });
    num = num.replace(/[^0-9]/g, '');
    res.redirect(`/code?number=${num}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`BONY-XMD PAIR running on port ${PORT}`);
});

module.exports = app;
