# Docker Setup Instructions for Soul Society WhatsApp Bot

This guide will help you run the Soul Society WhatsApp bot using Docker.

## Prerequisites

- Docker installed on your system ([Download Docker](https://docs.docker.com/get-docker/))
- Docker Compose installed (usually comes with Docker Desktop)
- Your API keys ready:
  - IPQualityScore API Key
  - WorldNewsAPI Key
  - Google Generative AI API Key

## Quick Start

### 1. Configure API Keys

Before running the bot, you need to update the API keys in the `index.js` and `functions/ocr.js` files:

**In `index.js`:**
```javascript
const IPQS_API_KEY = "your_actual_ipqs_key";
const WORLDNEWS_API_KEY = "your_actual_worldnews_key";
```

**In `functions/ocr.js`:**
```javascript
const genAI = new GoogleGenerativeAI('your_actual_google_ai_key');
```

### 2. Configure Allowed Chats

Edit the `ALLOWED_CHATS` Set in `index.js` to include your WhatsApp numbers and group IDs:

```javascript
const ALLOWED_CHATS = new Set([
  "919315556844@s.whatsapp.net",  // Your phone number
  "120363404090297711@g.us",      // Your group ID
]);
```

### 3. Build and Run with Docker Compose

#### Method 1: Using Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs and scan QR code
docker-compose logs -f
```

When you see the QR code in the logs, scan it with WhatsApp on your phone:
1. Open WhatsApp
2. Go to Settings > Linked Devices
3. Tap "Link a Device"
4. Scan the QR code from the terminal

#### Method 2: Using Docker Commands

```bash
# Build the Docker image
docker build -t soul-society-bot .

# Run the container
docker run -it \
  --name soul-society-bot \
  -v $(pwd)/auth_info_baileys:/app/auth_info_baileys \
  -v $(pwd)/ocr_images:/app/ocr_images \
  -v $(pwd)/sticker:/app/sticker \
  soul-society-bot
```

## Managing the Container

### View Logs
```bash
# View real-time logs
docker-compose logs -f

# Or with docker
docker logs -f soul-society-bot
```

### Stop the Bot
```bash
# With docker-compose
docker-compose down

# Or with docker
docker stop soul-society-bot
```

### Restart the Bot
```bash
# With docker-compose
docker-compose restart

# Or with docker
docker restart soul-society-bot
```

### Remove Container and Start Fresh
```bash
# Stop and remove container
docker-compose down

# Remove authentication data (forces re-login)
rm -rf auth_info_baileys/*

# Start again
docker-compose up -d
```

## Troubleshooting

### QR Code Not Displaying
If the QR code doesn't display properly:
```bash
# Use interactive mode
docker-compose up
```

### Connection Issues
```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs --tail=100
```

### Rebuild After Code Changes
```bash
# Rebuild the image
docker-compose build

# Restart with new image
docker-compose up -d
```

### Permission Issues with Volumes
```bash
# Fix permissions for mounted volumes
sudo chown -R $USER:$USER auth_info_baileys ocr_images sticker
```

## Data Persistence

The following directories are mounted as volumes to persist data:
- `auth_info_baileys/` - WhatsApp authentication data
- `ocr_images/` - Downloaded images for OCR processing
- `sticker/` - Sticker input and output files

These directories will be created automatically if they don't exist.

## Updating the Bot

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

## Production Deployment

For production deployment, consider:

1. **Environment Variables**: Use `.env` file for sensitive data
2. **Restart Policy**: Already set to `unless-stopped` in docker-compose.yml
3. **Monitoring**: Set up log monitoring and alerts
4. **Backups**: Regularly backup `auth_info_baileys` directory

## Useful Commands

```bash
# Enter container shell
docker-compose exec whatsapp-bot sh

# View container resource usage
docker stats soul-society-bot

# Clean up old images
docker system prune -a

# Export logs to file
docker-compose logs > bot-logs.txt
```

## Security Notes

- Never commit your `auth_info_baileys` directory
- Keep your API keys secure
- Regularly update dependencies: `docker-compose build --no-cache`
- Use environment variables for sensitive data in production

## Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify API keys are correct
3. Ensure Docker has enough resources (memory/CPU)
4. Check network connectivity

For more information, refer to the main README.md file.
