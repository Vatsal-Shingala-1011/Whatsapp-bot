import fs from "fs";
import path from "path";
import { downloadContentFromMessage } from "@adiwajshing/baileys";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generic function to save media from WhatsApp messages and log all messages
 * @param {Object} msg - The WhatsApp message object
 * @returns {Promise<string|undefined>} The path to the saved file for media messages
 */
export async function saveWhatsAppMessage(msg = '') {
  try {
    const senderId = msg.key.participant || msg.key.remoteJid;
    const senderName = msg.pushName || msg.verifiedBizName || "Unkown";
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

    // Handle text messages first
    if (msg.message?.conversation) {
      const logEntry = `[${time}] ${senderId} ${msg.key.participant?msg.key.remoteJid:''} ${senderName}: ${msg.message.conversation}\n`;
      console.log(logEntry);
      await appendToLog(logEntry);
      return;
    }

    // Handle media messages
    const messageTypes = {
      imageMessage: { type: 'image', folder: 'Images' },
      videoMessage: { type: 'video', folder: 'Videos' },
      stickerMessage: { type: 'sticker', folder: 'Stickers' },
      documentMessage: { type: 'document', folder: 'Documents' },
      audioMessage: { type: 'audio', folder: 'Audio' }
    };

    const messageType = Object.keys(messageTypes).find(type => msg.message?.[type]);
    if (!messageType) {
      // Log unsupported message type
      const logEntry = `[${time}] ${senderId} ${msg.key.remoteJid?msg.key.remoteJid:''} ${senderName}: Unsupported message type\n`;
      await appendToLog(logEntry);
      return;
    }

    const mediaMessage = msg.message[messageType];
    const { type, folder } = messageTypes[messageType];

    // Handle filename
    let fileName;
    if (messageType === 'documentMessage' && mediaMessage.fileName) {
      fileName = `${Date.now()}_${mediaMessage.fileName}`;
    } else {
      const mimetype = mediaMessage.mimetype || `${type}/unknown`;
      fileName = `${Date.now()}.${mimetype.split("/")[1]}`;
    }

    // Create directory path and ensure it exists
    const dirPath = path.join(__dirname, '..', 'logs', folder);
    fs.mkdirSync(dirPath, { recursive: true });
    const filePath = path.join(dirPath, fileName);

    // Download and save the media
    const stream = await downloadContentFromMessage(mediaMessage, type);
    const writeStream = fs.createWriteStream(filePath);

    for await (const chunk of stream) {
      writeStream.write(chunk);
    }

    // Properly close the stream
    await new Promise((resolve, reject) => {
      writeStream.end();
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Create log entry for media message
    let logMessage = `[${time}] ${senderId} ${msg.key.remoteJid?msg.key.remoteJid:''} ${senderName}: Sent ${type}`;
    if (messageType === 'documentMessage') {
      logMessage += ` (${mediaMessage.fileName})`;
    }
    logMessage += ` [Saved as: ${fileName}]\n`;

    // Append to log file
    await appendToLog(logMessage);

    // Log additional information to console for media files
    const fileStats = fs.statSync(filePath);
    console.log(`\n${type.charAt(0).toUpperCase() + type.slice(1)} saved successfully!`);
    console.log(`File path: ${filePath}`);
    console.log(`File size: ${formatFileSize(fileStats.size)}`);

    if (messageType === 'audioMessage') {
      console.log(`Duration: ${mediaMessage.seconds} seconds`);
      console.log(`PTT (Push to Talk): ${mediaMessage.ptt}`);
    } else if (messageType === 'videoMessage') {
      console.log(`Duration: ${mediaMessage.seconds} seconds`);
      console.log(`Resolution: ${mediaMessage.width}x${mediaMessage.height}`);
    } else if (messageType === 'imageMessage' || messageType === 'stickerMessage') {
      console.log(`Dimensions: ${mediaMessage.width}x${mediaMessage.height}`);
      if (messageType === 'stickerMessage') {
        console.log(`Animated: ${mediaMessage.isAnimated}`);
        console.log(`Is Avatar: ${mediaMessage.isAvatar}`);
      }
    } else if (messageType === 'documentMessage') {
      if (mediaMessage.pageCount) {
        console.log(`Page count: ${mediaMessage.pageCount}`);
      }
    }
    
  } catch (err) {
    console.error(`Error while processing message:`, err);
    // Log error
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

    const errorLog = `[${errorTime}] Error processing message: ${err.message}\n`;
    await appendToLog(errorLog);
    throw err;
  }
}

/**
 * Append entry to log file
 * @param {string} logEntry - The log entry to append
 */
async function appendToLog(logEntry) {
  const logPath = path.join(__dirname, '..', 'logs', 'chat.log');
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, logEntry);
}

/**
 * Format file size to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}