import pkg from "@whiskeysockets/baileys";
const { makeWASocket, DisconnectReason, useMultiFileAuthState } = pkg;
import { Boom } from "@hapi/boom";
import fs from "fs";
import { saveWhatsAppMessage } from "./saveWhatsAppMessage.js";

async function connectToWhatsApp() {
  // Setup persistent authentication
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  // Initialize the WhatsApp socket connection
  const sock = makeWASocket({
    auth: state, // Use persistent authentication
    printQRInTerminal: true, // Prints QR code in the terminal for initial connection
  });

  // Listen for connection updates
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
        console.log('WhatsApp bot connected!');
      } else if (connection === 'close') {
        const shouldReconnect =
          lastDisconnect?.error instanceof Boom &&
          lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('Connection closed', shouldReconnect);
        if (shouldReconnect) connectToWhatsApp(); // Reconnect if not logged out
      }
    });

  // Save authentication state when updated
  sock.ev.on("creds.update", saveCreds);

  // Listen for incoming messages
  sock.ev.on("messages.upsert", async (m) => {
    if (m.type !== "notify" ) return; // Ignore non-notification messages
    const messages = m.messages;
    for (const msg of messages) {
      console.log('messages->',msg);
      await saveWhatsAppMessage(msg);
    }
  });

  // Listen for deleted messages (if applicable)
  sock.ev.on("messages.update", (updates) => {
    for (const update of updates) {
      if (update.message) {
        const deletedMessageLog = `Message deleted: ${JSON.stringify(update)}\n`;
        fs.appendFileSync("deleted_messages.log", deletedMessageLog, "utf8");
        console.log("A message was deleted:", update);
      }
    }
  });
}

// Run the bot
connectToWhatsApp().catch((err) => console.error("Failed to start WhatsApp bot:", err));
