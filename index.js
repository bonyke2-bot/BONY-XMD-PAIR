const express = require("express");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");
const pino = require("pino");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>BONY XMD SESSION</title>
        <style>
          body {
            background:#050505;
            color:white;
            font-family:Arial;
            text-align:center;
            padding:60px 20px;
          }
          h1 {
            color:#ff0000;
            text-shadow:0 0 15px red;
          }
          input,button {
            padding:14px;
            margin:8px;
            border-radius:8px;
            border:1px solid red;
          }
          button {
            background:red;
            color:white;
            font-weight:bold;
          }
        </style>
      </head>
      <body>
        <h1>BONY XMD SESSION</h1>
        <p>Enter your WhatsApp number with country code.</p>

        <input id="number" placeholder="2547XXXXXXXX">

        <br>

        <button onclick="getCode()">GET PAIRING CODE</button>

        <h2 id="result"></h2>

        <script>
          async function getCode() {
            const number =
              document.getElementById("number").value.trim();

            if (!number) {
              document.getElementById("result").innerText =
                "Enter your WhatsApp number.";
              return;
            }

            document.getElementById("result").innerText =
              "Generating code...";

            try {
              const response = await fetch("/pair", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ number })
              });

              const data = await response.json();

              document.getElementById("result").innerText =
                data.code || data.error || "Something went wrong.";
            } catch (error) {
              document.getElementById("result").innerText =
                "Server error.";
            }
          }
        </script>
      </body>
    </html>
  `);
});

app.post("/pair", async (req, res) => {
  const number = String(req.body.number || "")
    .replace(/[^0-9]/g, "");

  if (!number) {
    return res.status(400).json({
      error: "Invalid phone number"
    });
  }

  try {
    const { state, saveCreds } =
      await useMultiFileAuthState("./session");

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false
    });

    sock.ev.on("creds.update", saveCreds);

    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(number);

      return res.json({
        code
      });
    }

    res.json({
      error: "This session is already registered."
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to generate pairing code."
    });
  }
});

app.listen(PORT, () => {
  console.log(`BONY XMD SESSION running on port ${PORT}`);
});
