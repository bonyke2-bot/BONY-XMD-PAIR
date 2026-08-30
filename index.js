const express = require("express");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple homepage
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>BONY-BOT Pairing</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          background: #111;
          color: white;
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 50px 20px;
        }

        input, button {
          width: 90%;
          max-width: 400px;
          padding: 15px;
          margin: 10px;
          border-radius: 8px;
          border: none;
          font-size: 16px;
        }

        button {
          background: #25D366;
          color: white;
          cursor: pointer;
          font-weight: bold;
        }

        #code {
          margin-top: 25px;
          font-size: 30px;
          font-weight: bold;
          letter-spacing: 5px;
        }
      </style>
    </head>

    <body>
      <h1>🤖 BONY-BOT</h1>
      <p>Enter your WhatsApp number with country code.</p>

      <input
        id="number"
        type="text"
        placeholder="2547XXXXXXXX"
      />

      <br>

      <button onclick="getCode()">
        GET PAIRING CODE
      </button>

      <div id="status"></div>
      <div id="code"></div>

      <script>
        async function getCode() {
          const number = document.getElementById("number").value.trim();
          const status = document.getElementById("status");
          const code = document.getElementById("code");

          code.innerText = "";
          status.innerText = "Requesting pairing code...";

          try {
            const response = await fetch("/pair", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ number })
            });

            const data = await response.json();

            if (!response.ok) {
              status.innerText = data.error || "Unable to generate code.";
              return;
            }

            status.innerText =
              "Open WhatsApp → Linked Devices → Link a device → Link with phone number.";

            code.innerText = data.code;
          } catch (error) {
            status.innerText = "Something went wrong.";
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Keep active WhatsApp connections here
const sessions = new Map();

async function createPairingSession(number) {
  const sessionDir = `./sessions/${number}`;

  if (!fs.existsSync("./sessions")) {
    fs.mkdirSync("./sessions", { recursive: true });
  }

  const { state, saveCreds } =
    await useMultiFileAuthState(sessionDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: ["BONY-BOT", "Chrome", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  sessions.set(number, sock);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log(`[BONY-BOT] ${number} connected successfully.`);
    }

    if (connection === "close") {
      sessions.delete(number);

      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      if (statusCode !== DisconnectReason.loggedOut) {
        console.log(`[BONY-BOT] Reconnecting ${number}...`);
        setTimeout(() => createPairingSession(number), 3000);
      }
    }
  });

  if (!sock.authState.creds.registered) {
    const cleanNumber = number.replace(/\D/g, "");

    const code = await sock.requestPairingCode(cleanNumber);

    return code;
  }

  return null;
}

// Pairing endpoint
app.post("/pair", async (req, res) => {
  try {
    let { number } = req.body;

    if (!number) {
      return res.status(400).json({
        error: "WhatsApp number is required."
      });
    }

    number = number.replace(/\D/g, "");

    if (number.length < 8) {
      return res.status(400).json({
        error: "Enter a valid WhatsApp number with country code."
      });
    }

    if (sessions.has(number)) {
      return res.status(400).json({
        error: "A pairing session is already active for this number."
      });
    }

    const code = await createPairingSession(number);

    if (!code) {
      return res.status(400).json({
        error: "This number is already registered."
      });
    }

    console.log(`[BONY-BOT] Pairing code generated for ${number}`);

    res.json({
      success: true,
      code
    });

  } catch (error) {
    console.error("[BONY-BOT]", error);

    res.status(500).json({
      error: "Failed to generate pairing code."
    });
  }
});

app.listen(PORT, () => {
  console.log(`BONY-BOT pairing server running on port ${PORT}`);
});
