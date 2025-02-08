import fs from "fs";
import path from "path";
import { downloadContentFromMessage } from "@adiwajshing/baileys";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generic function to save media from WhatsApp messages
 * @param {Object} msg - The WhatsApp message object
 */
export async function saveWhatsAppMedia(msg) {
  try {
    const messageTypes = {
      imageMessage: { type: 'image', folder: 'Images' },
      videoMessage: { type: 'video', folder: 'Videos' },
      stickerMessage: { type: 'sticker', folder: 'Stickers' },
      documentMessage: { type: 'document', folder: 'Documents' }
    };

    const messageType = Object.keys(messageTypes).find(type => msg.message?.[type]);
    if (!messageType) return;
    const mediaMessage = msg.message[messageType];
    const { type, folder } = messageTypes[messageType];

    // Handle filename
    let fileName;
    if (messageType === 'documentMessage' && mediaMessage.fileName) {
      // For documents, use original filename if available
      fileName = `${Date.now()}_${mediaMessage.fileName}`;
    } else {
      // For other media types, generate filename from mimetype
      const mimetype = mediaMessage.mimetype || `${type}/unknown`;
      fileName = `${Date.now()}.${mimetype.split("/")[1]}`;
    }

    // Create directory path and ensure it exists
    const dirPath = path.join(__dirname, '..', 'logs', folder);
    fs.mkdirSync(dirPath, { recursive: true });
    const filePath = path.join(dirPath, fileName);

    // Download and save the media
    console.log(`Downloading ${type}...`);
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

    // Log media information
    const fileStats = fs.statSync(filePath);
    console.log(`\n${type.charAt(0).toUpperCase() + type.slice(1)} saved successfully!`);
    console.log(`File path: ${filePath}`);
    console.log(`File size: ${formatFileSize(fileStats.size)}`);

    // Log additional metadata based on media type
    if (messageType === 'videoMessage') {
      console.log(`Duration: ${mediaMessage.seconds} seconds`);
      console.log(`Resolution: ${mediaMessage.width}x${mediaMessage.height}`);
    } else if (messageType === 'imageMessage' || messageType === 'stickerMessage') {
      console.log(`Dimensions: ${mediaMessage.width}x${mediaMessage.height}`);
      if (messageType === 'stickerMessage') {
        console.log(`Animated: ${mediaMessage.isAnimated}`);
        console.log(`Is Avatar: ${mediaMessage.isAvatar}`);
      }
    } else if (messageType === 'documentMessage') {
      console.log(`Original filename: ${mediaMessage.fileName}`);
      if (mediaMessage.pageCount) {
        console.log(`Page count: ${mediaMessage.pageCount}`);
      }
    }

    return filePath;
  } catch (err) {
    console.error(`Error while saving media:`, err);
    throw err;
  }
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