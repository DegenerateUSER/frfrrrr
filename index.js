import {
  DisconnectReason,
  useMultiFileAuthState,
  makeWASocket,
  downloadMediaMessage,
  Browsers,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import { readFileSync, writeFileSync } from "fs";
import NodeCache from "node-cache";
import axios from "axios";
import sharp from "sharp";
import pino from "pino";
import { extractUrl, scanUrl } from "./functions/url.js";
import { AbuseDetector } from "./functions/hinglishAbuseDetector.js";
import { runOCR } from "./functions/ocr.js";
import SpamDetector from "./functions/spamDetector.js";
import { searchTopNews } from "./functions/newsApi.js";

const IPQS_API_KEY = "siJ8Ny9prnE6r2YY3lYO3v69mhJOsKuE";
const WORLDNEWS_API_KEY = "bece4368344f474392a6fb34198b73b4"; // Get from https://worldnewsapi.com/

// Allowed chats (Baileys format)
const ALLOWED_CHATS = new Set([
  "919315556844@s.whatsapp.net",
  "919953214734@s.whatsapp.net",
  "18334363285@s.whatsapp.net",
  "919810273920@s.whatsapp.net",
  "120363404090297711@g.us",
  "120363192540481930@g.us",
  "919873698730@s.whatsapp.net",
  "120363373610766722@g.us"
]);

// Initialize spam detector with custom config
const spamDetector = new SpamDetector({
  messageThreshold: 5,      // Flag after 8 messages
  timeWindow: 5000,        // Within 3 seconds
  flagDuration: 15 * 60 * 1000, // 15 minutes flag
});

const specialJid = "18334363285@s.whatsapp.net"; // Bot chat ID
const pendingBotQueries = new Map();

// State variables
let moderation = 0;
let shadowBannedNumbers = [];
const groupInviteRegex = /(?:https?:\/\/)?chat\.whatsapp\.com\/[\w\d]{20,}/gi;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const msgRetryCache = new NodeCache();
  const logger = pino({ level: "silent" });
  const sock = makeWASocket({
    logger,
    browser: Browsers.ubuntu("FireFox"),
    auth: state,
     version: [2, 3000, 1028442591],
    printQRInTerminal: true,
    msgRetryCache,
    qrTimeout: 40000,
  });

  // Connection handler
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log("Scan the QR code above to connect");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Connection closed due to", lastDisconnect?.error);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === "open") {
      console.log("✅ Bot connected");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // Message handler
  sock.ev.on("messages.upsert", async (m) => {
    try {
      if (m.type !== "notify") return;

      const msg = m.messages[0];
      if (!msg || !msg.message) return;
      console.log(msg.key);
      // Ignore bot messages
      if (msg.key && msg.key.remoteJid?.endsWith("@bot")) {
        console.log("Ignoring Meta AI or bot message");
        return;
      }

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid) return;

      console.log("Remote JID:", remoteJid);

      // Check whitelist
      if (!ALLOWED_CHATS.has(remoteJid)) {
        console.log(`❌ Ignoring message from: ${remoteJid}`);
        return;
      }

      const isGroup = remoteJid.endsWith("@g.us");
      let isAdmin = false;
      let participants = [];

      // Check if user is admin in group
      if (isGroup) {
        try {
          const groupMetadata = await sock.groupMetadata(remoteJid);
          participants = groupMetadata.participants || [];
          const myId = "919315556844@s.whatsapp.net";
          const myLid = "116599839318143@lid"
          isAdmin = participants.some((p) => p.phoneNumber === myId && p.admin);
          console.log("Is admin:", isAdmin);
          console.log("participants:", participants )
          console.log("remoteJid:", remoteJid)

          if (!isAdmin) {
            console.log("❌ You must be an admin to use commands in this group.");
          }
        } catch (error) {
          console.error("Error processing group metadata:", error);
        }
      } else {
        isAdmin = true; // In private chats, always allow
      }

      // Extract message content
      let messageContent = "";
      if (msg.message.conversation) {
        messageContent = msg.message.conversation;
      } else if (msg.message.extendedTextMessage?.text) {
        messageContent = msg.message.extendedTextMessage.text;
      } else if (msg.message.imageMessage?.caption) {
        messageContent = msg.message.imageMessage.caption;
      }

      console.log("Received message:", messageContent);

      const trimmed = messageContent.trim();
      const parts = trimmed.split(" ");
      const command = parts[0];
      const arg = parts.slice(1).join(" ");

      // Admin-only command check
      if (
        isGroup &&
        !isAdmin &&
        (command.toLowerCase() === "!tagall" || command.toLowerCase() === "!tagadmins")
      ) {
        await sock.sendMessage(remoteJid, {
          text: "❌ You must be an admin to use this command.",
        });
        return;
      }

      // Set moderation level
      if (isGroup && isAdmin && command.toLowerCase() === "!setmoderation") {
        const newValue = parseInt(arg);
        if (!isNaN(newValue)) {
          moderation = newValue;
          await sock.sendMessage(remoteJid, {
            text: `✅ Chat Moderation level set to ${moderation}`,
          });
          console.log(`Updated moderation value to: ${moderation}`);
        } else {
          await sock.sendMessage(remoteJid, {
            text: "⚠️ Invalid number.\nUsage: !setmoderation 5",
          });
        }
        return;
      }

      // Get moderation level
      if (isGroup && isAdmin && command.toLowerCase() === "!getmoderation") {
        await sock.sendMessage(remoteJid, {
          text: `🛡️ Current moderation level is ${moderation}`,
        });
        return;
      }

      // Group message moderation
      if (isGroup) {
        // Check for abuse
        if (await AbuseDetector(messageContent, 10 - moderation)) {
          console.log("Abuse detected in group message:", messageContent);
          await sock.sendMessage(remoteJid, { delete: msg.key });
          await sock.sendMessage(remoteJid, {
            text: "❌ Abusive content detected!",
          });
          return;
        }

        // Check for group invite links
        const groupLink = extractUrl(messageContent);
        const foundLinks = groupLink ? groupLink.match(groupInviteRegex) : null;

        if (foundLinks && foundLinks.length > 0) {
          console.log("✅ Group invite link detected:", foundLinks[0]);
          await sock.sendMessage(remoteJid, { delete: msg.key });
          const sticker = readFileSync("./sticker/output/image.webp");
          await sock.sendMessage(remoteJid, { sticker: sticker });
          return;
        }
      }

      // URL Scan command
      if (command.toLowerCase() === "!urlscan") {
        const url = extractUrl(arg);
        if (url) {
          console.log("URL found in message:", url);
          const result = await scanUrl(url);
          console.log(result);
          if (result) {
            const safety = result.unsafe ? "⚠️ UNSAFE" : "✅ SAFE";
            const response = `URL Analysis for ${url}:\n${safety}\nRisk Score: ${result.risk_score}/100\n${result.domain}`;
            await sock.sendMessage(remoteJid, { text: response });
          }
        }
        return;
      }

      // Ping command
      if (messageContent.toLowerCase() === "!ping") {
        await sock.sendMessage(remoteJid, { text: "pong 🏓" });
        return;
      }

      // Sticker command
      if (messageContent.toLowerCase() === "!sticker") {
        const sticker = readFileSync("./sticker/output/image.webp");
        await sock.sendMessage(remoteJid, { sticker: sticker });
        return;
      }

      // OCR/Info command
      if (command.toLowerCase() === "!info" || command.toLowerCase() === "!check") {
        let imageMessage = null;

        // Check if current message has image
        if (msg.message.imageMessage) {
          imageMessage = msg.message.imageMessage;
        } 
        // Check if replying to an image
        else if (msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
          imageMessage = msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
        }

        if (imageMessage) {
          try {
            // Download the image
            const buffer = await downloadMediaMessage(
              { message: { imageMessage } },
              "buffer",
              {},
              { logger }
            );

            const imagePath = "./ocr_images/downloaded_image.jpg";
            writeFileSync(imagePath, buffer);
            console.log("Image downloaded and saved!");

            const extractedText = await runOCR(imagePath);

            if (extractedText) {
              console.log("Extracted text:", extractedText);
              await sock.sendMessage(remoteJid, {
                text: `📄 Text extracted from image:\n\n${extractedText}`,
              });
            } else {
              await sock.sendMessage(remoteJid, {
                text: "⚠️ Could not extract any text from this image.",
              });
            }
          } catch (error) {
            console.error("Error processing image:", error);
            await sock.sendMessage(remoteJid, {
              text: "❌ Error processing the image.",
            });
          }
        } else {
          await sock.sendMessage(remoteJid, {
            text: "⚠️ Please send an image or reply to an image with !check",
          });
        }
        return;
      }

      // Delete message command
      if (messageContent.toLowerCase() === "!delete") {
        await sock.sendMessage(remoteJid, { delete: msg.key });
        return;
      }

      // Shadow ban command
      if (command.toLowerCase() === "!shadowban") {
        const shadowJid = arg + "@s.whatsapp.net";

        if (shadowBannedNumbers.includes(shadowJid)) {
          await sock.sendMessage(remoteJid, {
            text: "❌ Number is already shadowbanned.",
          });
          return;
        }

        shadowBannedNumbers.push(shadowJid);
        await sock.sendMessage(remoteJid, {
          text: `✅ ${shadowJid} is now shadowbanned.`,
        });
        return;
      }

      // Remove shadow ban
      if (command.toLowerCase() === "!shadowremove") {
        const shadowJid = arg + "@s.whatsapp.net";
        const beforeLength = shadowBannedNumbers.length;

        shadowBannedNumbers = shadowBannedNumbers.filter((item) => item !== shadowJid);

        const afterLength = shadowBannedNumbers.length;
        const responseText =
          beforeLength === afterLength
            ? `❌ No entry found for ${shadowJid}`
            : `✅ Removed ${shadowJid} from shadowban list`;

        await sock.sendMessage(remoteJid, { text: responseText });
        return;
      }

      // Shadow ban check - delete messages from banned users
      const sender = msg.key.participant || msg.key.remoteJid;
      if (shadowBannedNumbers.includes(sender)) {
        await sock.sendMessage(remoteJid, { delete: msg.key });
        return;
      }

      // Tag all members
      if (messageContent.toLowerCase() === "!tagall") {
        if (!isGroup) {
          await sock.sendMessage(remoteJid, {
            text: "❌ This command can only be used in groups.",
          });
          return;
        }

        const groupMetadata = await sock.groupMetadata(remoteJid);
        const participants = groupMetadata.participants;

        const mentionedJids = participants.map((p) => p.id);

        let message = "📢 Tagging all members:\n\n";
        participants.forEach((participant, i) => {
          message += `@${participant.id.split("@")[0]} `;
          if ((i + 1) % 5 === 0) message += "\n";
        });

        await sock.sendMessage(remoteJid, {
          text: message,
          mentions: mentionedJids,
        });
        return;
      }

      // Tag admins only
      if (messageContent.toLowerCase() === "!tagadmins") {
        if (!isGroup) {
          await sock.sendMessage(remoteJid, {
            text: "❌ This command can only be used in groups.",
          });
          return;
        }

        const groupMetadata = await sock.groupMetadata(remoteJid);
        const participants = groupMetadata.participants;

        const admins = participants.filter((p) => p.admin !== null);
        const mentionedJids = admins.map((a) => a.id);

        if (admins.length === 0) {
          await sock.sendMessage(remoteJid, {
            text: "⚠️ No admins found in this group.",
          });
          return;
        }

        let message = "👑 Tagging all Admins:\n\n";
        admins.forEach((admin, i) => {
          message += `@${admin.id.split("@")[0]} `;
          if ((i + 1) % 5 === 0) message += "\n";
        });

        await sock.sendMessage(remoteJid, {
          text: message,
          mentions: mentionedJids,
        });
        return;
      }

      // Ask bot command
      if (command.toLowerCase() === "!ask") {
        const question = arg;

        if (!question) {
          await sock.sendMessage(remoteJid, {
            text: "❌ Please provide a question after !ask",
          });
          return;
        }

        try {
          const queryId = `ask_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 15)}`;

          pendingBotQueries.set(queryId, {
            originalJid: remoteJid,
            question: question,
            timestamp: Date.now(),
            messageKey: msg.key,
          });

          setTimeout(() => {
            if (pendingBotQueries.has(queryId)) {
              console.log(`Query ${queryId} expired and removed`);
              pendingBotQueries.delete(queryId);
            }
          }, 5 * 60 * 1000);

          await sock.sendMessage(specialJid, {
            text: `${queryId}\n\n${question}`,
          });

          await sock.sendMessage(remoteJid, {
            text: "Fetching and Analysing latest news...",
          });
        } catch (error) {
          console.error("Error in !ask command:", error);
          await sock.sendMessage(remoteJid, {
            text: "❌ Error communicating with the bot.",
          });
        }
        return;
      }

      // Top news command
      if (command.toLowerCase() === "!topnews") {
        const topic = arg;

        if (!topic) {
          await sock.sendMessage(remoteJid, {
            text: "❌ Please provide a topic.\n\nUsage: !topnews <topic>\nExample: !topnews technology",
          });
          return;
        }

        try {
          // Send searching message
          await sock.sendMessage(remoteJid, {
            text: `🔍 Searching latest news on "${topic}"...`,
          });

          // Fetch news
          const newsResult = await searchTopNews(topic, WORLDNEWS_API_KEY);

          // Send news results
          await sock.sendMessage(remoteJid, {
            text: newsResult,
          });
        } catch (error) {
          console.error("Error in !topnews command:", error);
          await sock.sendMessage(remoteJid, {
            text: "❌ Error fetching news. Please try again later.",
          });
        }
        return;
      }

      // Handle bot responses
      if (remoteJid === specialJid && !msg.key.fromMe) {
        console.log("Received a message from the bot", messageContent);

        let cleaned = messageContent
          .replace(/⁽\d+⁾/g, "")
          .replace(/⁽\d+⁾.*(?:\n)?/g, "")
          .trim();

        // Remove the last line
        const lines = cleaned.split("\n");
        if (lines.length > 1) {
          lines.pop();
          cleaned = lines.join("\n").trim();
        }

        console.log("After cleaning:", cleaned);

        // Delete the bot's message
        await sock.sendMessage(remoteJid, { delete: msg.key });

        // Find and respond to original query
        for (const [queryId, queryData] of pendingBotQueries.entries()) {
          if (messageContent.includes(queryId) || queryData.originalJid) {
            await sock.sendMessage(queryData.originalJid, {
              text: `Final Verdict says:\n\n${cleaned}`,
            });
            pendingBotQueries.delete(queryId);
            return;
          }
        }

        console.log("Received bot message without matching query");
        return;
      }

      // ============ SPAM DETECTION (Group messages only) ============
      if (isGroup) {
        const userId = msg.key.participantAlt || msg.key.remoteJid;
        
        // Check if user is flagged for spam
        if (spamDetector.isFlagged(remoteJid, userId)) {
          console.log(`⛔ Deleting message from flagged user ${userId}`);
          await sock.sendMessage(remoteJid, { delete: msg.key });
          return;
        }

        // Record the message and check for spam
        const isSpamming = spamDetector.recordMessage(remoteJid, userId);
        const phoneNumber = userId.split('@')[0];
        if (isSpamming) {
          console.log(`🚨 SPAM DETECTED from ${userId}`);
          await sock.sendMessage(remoteJid, { delete: msg.key });
          await sock.sendMessage(remoteJid, {
            text: `⚠️ Spam detected! Messages will be auto-deleted for 15 minutes @${phoneNumber}.`,
            mentions: [userId],
          });
          return;
        }
      }

      // ============ SPAM MANAGEMENT COMMANDS ============
      
      // Check spam status
//       if (command.toLowerCase() === "!spam-status") {
//         if (!isGroup) {
//           await sock.sendMessage(remoteJid, {
//             text: "❌ This command can only be used in groups.",
//           });
//           return;
//         }

//         const userId = msg.key.participantAlt || msg.key.remoteJid;
//         const status = spamDetector.getSpamStatus(remoteJid, userId);
        
//         const statusText = `
// 📊 Your Spam Status:
// ━━━━━━━━━━━━━━━━━━━━
// • Flagged: ${status.isFlagged ? '🚨 YES' : '✅ NO'}
// • Messages sent: ${status.messageCount}/8
// • Remaining flag time: ${status.remainingTime}s
// ━━━━━━━━━━━━━━━━━━━━
//         `.trim();
        
//         await sock.sendMessage(remoteJid, { text: statusText });
//         return;
//       }

      // Clear spam history (Admin only)
      if (isGroup && isAdmin && command.toLowerCase() === "!clear-spam") {
        if (!arg) {
          await sock.sendMessage(remoteJid, {
            text: "⚠️ Usage: !clear-spam <phone number>\nExample: !clear-spam 919315556844",
          });
          return;
        }

        const targetUser = arg + "@s.whatsapp.net";
        spamDetector.clearUserHistory(remoteJid, targetUser);
        
        await sock.sendMessage(remoteJid, {
          text: `✅ Cleared spam history for ${arg}`,
        });
        return;
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });
}

startBot();