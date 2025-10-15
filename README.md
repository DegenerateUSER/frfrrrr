# Soul Society - WhatsApp Bot

<div align="center">

![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**A powerful WhatsApp moderation and utility bot built with Baileys**

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Commands](#commands)
- [Moderation Features](#moderation-features)
- [Functions](#functions)
- [Dependencies](#dependencies)
- [Usage](#usage)
- [License](#license)

---

## 🌟 Overview

Soul Society is an advanced WhatsApp bot designed for group moderation and utility purposes. Built using the Baileys library, it provides comprehensive features including spam detection, abuse filtering, OCR capabilities, news fetching, URL scanning, and various administrative tools.

---

## ✨ Features

- 🛡️ **Advanced Moderation System** - Configurable abuse detection and content filtering
- 🚫 **Spam Detection** - Automatic spam detection with intelligent rate limiting
- 🔗 **URL Scanning** - Real-time URL safety analysis using IPQualityScore API
- 📰 **News Fetching** - Get latest news on any topic
- 📸 **OCR (Text Extraction)** - Extract text from images using Google Generative AI
- 🎯 **Admin Tools** - Tag members, manage permissions, and moderate content
<!-- - 🔇 **Shadow Ban System** - Silently remove messages from specific users -->
- 🌐 **Group Invite Link Detection** - Automatically detect and remove group invitation links
- 🤖 **AI Integration** - Query processing with custom bot responses
- 🔒 **Whitelist System** - Restrict bot usage to authorized chats only

---

## 📦 Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- WhatsApp account

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/RadicalThinker/wweb-aizen.git
   cd soul-society
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Update API keys in `index.js`:
     - `IPQS_API_KEY` - IPQualityScore API key
     - `WORLDNEWS_API_KEY` - WorldNewsAPI key
     - Google Generative AI key in `functions/ocr.js`

4. **Configure allowed chats**
   - Edit the `ALLOWED_CHATS` Set in `index.js` with authorized chat IDs

5. **Start the bot**
   ```bash
   node index.js
   ```

6. **Scan QR Code**
   - Scan the QR code displayed in terminal with WhatsApp

---

## ⚙️ Configuration

### Allowed Chats
Update the `ALLOWED_CHATS` Set in `index.js` with WhatsApp JIDs (phone numbers or group IDs):

```javascript
const ALLOWED_CHATS = new Set([
  "919315556844@s.whatsapp.net",     // Individual chat
  "120363404090297711@g.us",          // Group chat
]);
```

### Spam Detection Settings
Customize spam detection parameters in `index.js`:

```javascript
const spamDetector = new SpamDetector({
  messageThreshold: 5,           // Messages count to trigger spam
  timeWindow: 5000,              // Time window in milliseconds
  flagDuration: 15 * 60 * 1000,  // Ban duration (15 minutes)
});
```

### Moderation Level
Use `!setmoderation` command to adjust abuse detection sensitivity (0-10).

---

## 🎮 Commands

### 🔧 Utility Commands

| Command | Description | Usage | Access |
|---------|-------------|-------|--------|
<!-- | `!ping` | Test bot responsiveness | `!ping` | All users | -->
<!-- | `!sticker` | Send a predefined sticker | `!sticker` | All users | -->
<!-- | `!delete` | Delete your own message | `!delete` | All users | -->

### 📸 OCR & Image Processing

| Command | Description | Usage | Access |
|---------|-------------|-------|--------|
| `!info` / `!check` | Extract text from images using OCR | Send image with caption `!info` or reply to image with `!check` | All users |

### 👥 Group Management Commands

| Command | Description | Usage | Access |
|---------|-------------|-------|--------|
| `!tagall` | Tag all group members | `!tagall` | Admins only |
| `!tagadmins` | Tag only group administrators | `!tagadmins` | Admins only |

### 🛡️ Moderation Commands

| Command | Description | Usage | Access |
|---------|-------------|-------|--------|
| `!setmoderation <level>` | Set moderation sensitivity (0-10) | `!setmoderation 7` | Admins only |
| `!getmoderation` | Check current moderation level | `!getmoderation` | Admins only |
<!-- | `!shadowban <number>` | Shadow ban a user (silently delete their messages) | `!shadowban 919315556844` | Admins only | -->
<!-- | `!shadowremove <number>` | Remove shadow ban from a user | `!shadowremove 919315556844` | Admins only | -->
| `!clear-spam <number>` | Clear spam history for a user | `!clear-spam 919315556844` | Admins only |

### 🔗 URL & Security

| Command | Description | Usage | Access |
|---------|-------------|-------|--------|
| `!urlscan <url>` | Scan URL for safety and threats | `!urlscan https://example.com` | All users |

### 📰 News & Information

| Command | Description | Usage | Access |
|---------|-------------|-------|--------|
| `!topnews <topic>` | Get latest news on a specific topic | `!topnews technology` | All users |
| `!ask <question>` | Ask the AI bot a question with news analysis | `!ask latest tech trends` | All users |

---

## 🛡️ Moderation Features

### Automatic Content Filtering

#### 1. **Abuse Detection**
- Detects abusive language in Hinglish (Hindi + English)
- Configurable severity levels (0-10)
- Automatically deletes offensive messages
- Handles obfuscated text (e.g., "b@d", "w0rd")
- Database: `functions/data/hinglish_abuse.csv`

#### 2. **Group Invite Link Detection**
- Automatically detects WhatsApp group invitation links
- Deletes messages containing invite links
- Responds with a warning sticker
- Pattern: `chat.whatsapp.com/*`

#### 3. **Spam Detection**
- Real-time message rate monitoring
- Configurable thresholds and time windows
- Automatic 15-minute message deletion for spammers
- Per-user, per-group tracking
- Auto-unflag after duration expires

<!-- #### 4. **Shadow Ban System**
- Silently delete all messages from banned users
- No notification to the banned user
- Permanent until manually removed
- Admin-controlled ban list -->

---

## 🔧 Functions

### 1. **Abuse Detector** (`functions/hinglishAbuseDetector.js`)

Detects abusive content in multiple languages with advanced obfuscation detection.

**Features:**
- CSV-based abuse word database
- Severity-based filtering (1-10 scale)
- Character substitution detection (@→a, 0→o, etc.)
- Substring matching for word variations
- Hinglish language support

**Usage:**
```javascript
import { AbuseDetector } from './functions/hinglishAbuseDetector.js';

const isAbusive = await AbuseDetector(text, severityThreshold);
```

---

### 2. **URL Scanner** (`functions/url.js`)

Scans URLs for security threats using IPQualityScore API.

**Features:**
- URL extraction from text
- Real-time threat analysis
- Risk score calculation (0-100)
- Domain reputation checking
- Malware and phishing detection

**Functions:**
- `extractUrl(text)` - Extract first URL from text
- `scanUrl(url)` - Scan URL for threats

**Response:**
```javascript
{
  unsafe: boolean,
  risk_score: number,
  domain: string,
  // ... additional threat data
}
```

---

### 3. **OCR Engine** (`functions/ocr.js`)

<!-- Extracts text from images using Google Generative AI. -->

**Features:**
- Multi-format image support (PNG, JPG, JPEG)
- High accuracy text extraction
- Powered by Gemini 2.5 Flash model
- Base64 image encoding

**Usage:**
```javascript
import { runOCR } from './functions/ocr.js';

const extractedText = await runOCR(imagePath);
```

---

### 4. **Spam Detector** (`functions/spamDetector.js`)

Intelligent spam detection with rate limiting and auto-flagging.

**Configuration:**
```javascript
{
  messageThreshold: 5,              // Messages to trigger spam flag
  timeWindow: 10000,                // Time window in ms (10 seconds)
  flagDuration: 15 * 60 * 1000      // Flag duration (15 minutes)
}
```

**Methods:**
- `recordMessage(groupId, userId)` - Record and check for spam
- `isFlagged(groupId, userId)` - Check if user is flagged
- `flagUser(groupId, userId)` - Manually flag a user
- `clearUserHistory(groupId, userId)` - Clear spam history

**Features:**
- Per-group, per-user tracking
- Sliding time window
- Auto-unflag after duration
- Message history management

---

### 5. **News API** (`functions/newsApi.js`)

Fetches latest news articles using WorldNewsAPI.

**Features:**
- Topic-based news search
- Latest news sorting (publish time)
- English language filtering
- Returns top 5 articles

**Usage:**
```javascript
import { searchTopNews } from './functions/newsApi.js';

const newsText = await searchTopNews(topic, apiKey);
```

**Response Format:**
```
📰 Top News on "topic":

1. *Article Title*
   📅 Publish Date
   🔗 Article URL
   📝 Summary...
```

---

## 📚 Dependencies

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@whiskeysockets/baileys` | ^7.0.0-rc.5 | WhatsApp Web API |
| `@hapi/boom` | ^10.0.1 | HTTP error handling |
| `@google/generative-ai` | ^0.24.1 | Google Gemini AI integration |
| `axios` | ^1.12.2 | HTTP client for API requests |
| `sharp` | ^0.34.4 | Image processing |
| `tesseract.js` | ^6.0.1 | OCR engine |
| `qrcode-terminal` | ^0.12.0 | QR code display in terminal |
| `node-cache` | ^5.1.2 | Message retry caching |
| `pino` | ^10.0.0 | Fast logging library |
| `form-data` | ^4.0.4 | Multipart form data |
| `dotenv` | ^17.2.3 | Environment variable management |

---

## 🚀 Usage

### Starting the Bot

```bash
node index.js
```

### First Time Setup

1. Run the bot
2. Scan the QR code with WhatsApp
3. Bot connects and logs "✅ Bot connected"
4. Add the bot's number to your authorized groups
5. Make the bot an admin for full functionality

### Admin Requirements

For group commands (`!tagall`, `!tagadmins`, `!setmoderation`, etc.), the bot user must be an admin in the group.

### Testing the Bot

```
User: !ping
Bot: pong 🏓

User: !getmoderation
Bot: 🛡️ Current moderation level is 0

User: !topnews AI
Bot: 🔍 Searching latest news on "AI"...
     📰 Top News on "AI": [articles...]
```

---

## 📁 Project Structure

```
soul-society/
├── index.js                    # Main bot file
├── package.json                # Dependencies and scripts
├── commands.txt                # Command reference
├── eng.traineddata            # Tesseract language data
├── auth_info_baileys/         # Authentication credentials
├── functions/                  # Core functionality modules
│   ├── hinglishAbuseDetector.js   # Abuse detection
│   ├── url.js                     # URL scanning
│   ├── ocr.js                     # OCR text extraction
│   ├── spamDetector.js            # Spam detection
│   ├── newsApi.js                 # News fetching
│   └── data/
│       └── hinglish_abuse.csv     # Abuse words database
├── ocr_images/                 # Temporary OCR image storage
├── sticker/                    # Sticker assets
│   └── output/
│       └── image.webp          # Default sticker
└── README.md                   # This file
```

---

## 🔐 Security & Privacy

- **Whitelist System**: Only responds to authorized chats
- **Admin Verification**: Sensitive commands require admin privileges
- **Shadow Ban**: Non-intrusive user management
- **Message Deletion**: Automatic cleanup of harmful content
- **API Key Protection**: External API keys for security services

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 Notes

- **Group Links**: Automatically deleted when detected
- **Spam Protection**: Users are auto-unflagged after 15 minutes
- **OCR Language**: Currently supports English (can be extended)
- **Moderation Levels**: Higher levels = more strict filtering (0-10)
- **Admin Detection**: Uses phone number matching for admin verification

---

## ⚠️ Troubleshooting

### Common Issues

**Bot not responding:**
- Check if chat is in `ALLOWED_CHATS`
- Verify bot is admin (for group commands)
- Check terminal for error logs

**QR Code not scanning:**
- Increase `qrTimeout` in `index.js`
- Ensure stable internet connection
- Try regenerating by restarting bot

**OCR not working:**
- Verify Google AI API key is valid
- Check image format (PNG/JPG only)
- Ensure image file exists in `ocr_images/`

**Commands not executing:**
- Verify command syntax (case-insensitive)
- Check if admin privileges are required
- Review console logs for errors

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**RadicalThinker**
- GitHub: [@RadicalThinker](https://github.com/RadicalThinker)
- Repository: [wweb-aizen](https://github.com/RadicalThinker/wweb-aizen)

---

## 🙏 Acknowledgments

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [Google Generative AI](https://ai.google.dev/) - OCR capabilities
- [IPQualityScore](https://www.ipqualityscore.com/) - URL scanning
- [WorldNewsAPI](https://worldnewsapi.com/) - News data

---

<div align="center">

**Made with ❤️ by RadicalThinker**

⭐ Star this repository if you find it helpful!

</div>
