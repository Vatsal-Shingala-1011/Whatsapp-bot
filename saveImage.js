import fs from "fs";
import { downloadContentFromMessage } from "@adiwajshing/baileys";

/**
 * Function to download and save an image from a WhatsApp message.
 * @param {Object} msg - The WhatsApp message object.
 */
export async function saveWhatsAppImage(msg) {
  try {
    // Validate if the message contains an image
    if (!msg.message || !msg.message.imageMessage) {
      console.log("No image found in the message.");
      return;
    }

    // Extract image data and metadata
    const imageMessage = msg.message.imageMessage;
    const mimetype = imageMessage.mimetype || "image/jpeg";
    const fileName = `downloaded_image_${Date.now()}.${mimetype.split("/")[1]}`; 
    fs.mkdirSync('./Image', { recursive: true }); //it will make image folder if not exist
    const filePath = `./Image/${fileName}`;

    console.log("Downloading image...");

    // Download and decrypt the image content
    const stream = await downloadContentFromMessage(imageMessage, "image");

    // Save the image to a file
    const writeStream = fs.createWriteStream(filePath);
    for await (const chunk of stream) {
      writeStream.write(chunk);
    }
    writeStream.end();

    console.log(`Image saved successfully`);
  } catch (err) {
    console.error("Error while downloading or saving the image:", err);
  }
}
