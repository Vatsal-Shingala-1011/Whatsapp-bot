import fs from "fs";
import path from "path";
import { downloadContentFromMessage } from "@adiwajshing/baileys";
import { fileURLToPath } from 'url';

// Get the directory name for the current module correctly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Function to download and save an image from a WhatsApp message.
 * @param {Object} msg - The WhatsApp message object.
 */
export async function saveWhatsAppImage(msg) {
  try {
    // Validate if the message contains an image
    if (!msg.message || !msg.message.imageMessage) return;
    
    // Extract image data and metadata
    const imageMessage = msg.message.imageMessage;
    const mimetype = imageMessage.mimetype || "image/jpeg";
    const fileName = `${Date.now()}.${mimetype.split("/")[1]}`; 
    const imageDirPath = path.join(__dirname, '..', 'logs', 'Image');
    fs.mkdirSync(imageDirPath, { recursive: true });     // Create directory if it doesn't exist
    const filePath = path.join(imageDirPath, fileName);
    
    console.log("Downloading image...");
    // Download and decrypt the image content
    const stream = await downloadContentFromMessage(imageMessage, "image");

    // Save the image to a file
    const writeStream = fs.createWriteStream(filePath);
    for await (const chunk of stream) {
      writeStream.write(chunk);
    }
    writeStream.end();

    console.log(`Image saved successfully at: ${filePath}`);
    return filePath;
  } catch (err) {
    console.error("Error while downloading or saving the image:", err);
    throw err; // Re-throw the error for proper error handling upstream
  }
}