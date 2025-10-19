# 🤖 Image Points Bot

A Whop bot that tracks image messages and grants free time when users reach 50 points.

## ✨ Features

### 🎯 Core Functionality
- **Image Detection**: Automatically detects image messages using Whop SDK
- **Points System**: Awards 1 point per image message
- **Free Time Rewards**: Grants free time when users reach 50 points
- **Real-time Monitoring**: Polls chat experiences for new messages
- **Database Tracking**: Stores user points and free time history

### 🤖 Bot Commands
- `!points` - Check your current points and status
- `!leaderboard` - Show top 10 users by points
- `!help` - Show available commands

### 📊 API Endpoints
- `GET /health` - Server health check
- `GET /status` - Polling service status
- `POST /start` - Start the polling service
- `POST /stop` - Stop the polling service
- `POST /reset-message-ids` - Reset last message IDs (prevents processing old messages)
- `GET /user/:userId/points` - Get user's points
- `GET /leaderboard` - Get leaderboard data
- `POST /test/message` - Send test message
- `GET /experiences` - List chat experiences

## 🚀 Quick Start

### 1. Environment Setup
Create `.env` file:
```env
# Whop API Configuration
WHOP_API_KEY=your_whop_api_key
NEXT_PUBLIC_WHOP_APP_ID=your_app_id
NEXT_PUBLIC_WHOP_AGENT_USER_ID=agent_user_id
NEXT_PUBLIC_WHOP_COMPANY_ID=company_id

# Server Configuration
PORT=3001
APP_BASE_URL=http://localhost:3001

# Database Configuration
MONGO_URI=mongodb://localhost:27017
MONGO_DB=image_points_bot

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Bot Configuration
POINTS_PER_IMAGE=1
POLLING_INTERVAL=5000
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Bot
```bash
npm run dev
```

### 4. Start Polling
```bash
# Start the polling service
curl -X POST http://localhost:3001/start

# Check status
curl http://localhost:3001/status
```

## 🏗️ Architecture

### Core Services
- **PollingService**: Monitors chat experiences for new messages
- **MessageProcessor**: Processes messages and detects images
- **PointsService**: Manages user points and freetime periods
- **BotService**: Handles bot commands and responses

### Database Models
- **User**: User points, freetime periods, last image message
- **LastMessage**: Tracks last processed message per experience

### Message Flow
1. **PollingService** monitors chat experiences every 5 seconds
2. **MessageProcessor** detects new messages and checks for images
3. **PointsService** awards points for image messages
4. **Database** stores all user progress and freetime periods

## 📈 How It Works

### Image Detection
The bot uses the Whop SDK to check message attachments:
```typescript
// Check if message contains images
const isImageMessage = attachments.some(attachment => {
  const contentType = attachment.contentType?.toLowerCase() || '';
  return contentType.startsWith('image/');
});
```

### Points System
- **1 point** awarded per image message
- **50 points** required for free time
- **Cooldown protection** prevents spam
- **Database persistence** tracks all progress

### Spam Prevention
The bot automatically prevents processing old messages when starting up:
- **Startup Initialization**: On bot startup, the last message ID is set to the most recent message in each channel
- **Message Tracking**: Only messages posted after the bot starts are processed for points
- **Manual Reset**: Use `POST /reset-message-ids` to reset the tracking point if needed

### Free Time Rewards
When a user reaches 50 points:
1. Free time is granted and recorded in database
2. Congratulations message is sent
3. User's free time counter is incremented

## 🔧 Configuration

### Environment Variables
- `POINTS_PER_IMAGE`: Points awarded per image (default: 1)
- `POLLING_INTERVAL`: Message polling interval in ms (default: 5000)

### Database Settings
- MongoDB for persistent storage
- Redis for caching (optional)
- Automatic connection handling

## 🎮 Usage Examples

### User Commands
```
!points          # Check your points and status
!leaderboard     # Show top 10 users
!help            # Show help message
```

### Bot Responses
```
📊 Your Points Status

⭐ Points: 25
🎁 Free Time Earned: 0
🎯 Points to Next Free Time: 25

Keep sharing images to earn more points! 📸
```

### Free Time Notification
```
🎉 Congratulations @username! You've earned free time by reaching 50 points! Keep sharing those images! 📸✨
```

## 🚀 Production Deployment

### Environment Setup
1. Set all required environment variables
2. Ensure MongoDB and Redis are running
3. Configure proper logging and monitoring

### Database Setup
- MongoDB instance for user data
- Redis instance for caching (optional)
- Automatic connection retry logic

### Monitoring
- Health check endpoint: `/health`
- Status endpoint: `/status`
- Comprehensive logging with Pino

## 🔒 Security

- Environment variable validation
- Input sanitization
- Error handling and logging
- Graceful shutdown handling

## 📝 License

MIT License - Feel free to use and modify for your Whop communities!

---

**Built with ❤️ for Whop communities**
