import pkg from "@whiskeysockets/baileys";
const { makeWASocket, DisconnectReason, useMultiFileAuthState } = pkg;
import { Boom } from "@hapi/boom";
import fs from "fs";
import { saveWhatsAppMedia } from "./saveWhatsAppMedia.js";

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
      const senderId = msg.key.participant || msg.key.remoteJid; // senderId's WhatsApp ID
      console.log('messages---> ',msg);

      const messageContent =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        "Unsupported message type";

      const timestamp = new Date(msg.messageTimestamp * 1000); // messageTimestamp: 1738975201
      const time = timestamp.toLocaleString("en-IN", {  //[8 February 2025 at 6:10:01 am]
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: true 
      });
      const senderIdName = msg.pushName || msg.verifiedBizName || "user";

      await saveWhatsAppMedia(msg);

      console.log(`[${time}] Message from ${senderId} ${senderIdName}: ${messageContent}`);

      // Save the message locally
      const logEntry = `[${time}] ${senderId} ${senderIdName}: ${messageContent}\n`;
      fs.appendFileSync("logs/messages.log", logEntry, "utf8");

      // Automatically reply to the message
    //   await sock.sendMessage(senderId, { text: "Hello! Your message has been saved." });
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
