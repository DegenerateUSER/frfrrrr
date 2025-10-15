class SpamDetector {
  constructor(config = {}) {
    // Store flagged users: { "groupId|userId": { flaggedAt, duration } }
    this.flaggedUsers = {};
    
    // Store message history: { "groupId|userId": [timestamps] }
    this.messageHistory = {};
    
    // Configuration
    this.messageThreshold = config.messageThreshold || 5; // Messages in timeWindow
    this.timeWindow = config.timeWindow || 10000; // 10 seconds (in milliseconds)
    this.flagDuration = config.flagDuration || 15 * 60 * 1000; // 15 minutes
    
    console.log(`🔧 SpamDetector initialized: ${this.messageThreshold} msgs in ${this.timeWindow}ms`);
  }

  // Generate unique key for user in group
  getUserKey(groupId, userId) {
    return `${groupId}|${userId}`;
  }

  // Check if a user is flagged for spam
  isFlagged(groupId, userId) {
    const key = this.getUserKey(groupId, userId);
    
    if (!this.flaggedUsers[key]) {
      return false;
    }

    const { flaggedAt, duration } = this.flaggedUsers[key];
    const now = Date.now();

    // Check if flag duration has expired
    if (now - flaggedAt > duration) {
      delete this.flaggedUsers[key];
      console.log(`✅ User ${userId} unflagged automatically`);
      return false;
    }

    return true;
  }

  // Record a message from a user
  recordMessage(groupId, userId) {
    // If already flagged, just return true to delete message
    if (this.isFlagged(groupId, userId)) {
      return true;
    }

    const key = this.getUserKey(groupId, userId);
    const now = Date.now();

    // Initialize history if not exists
    if (!this.messageHistory[key]) {
      this.messageHistory[key] = [];
    }

    // Add current timestamp
    this.messageHistory[key].push(now);

    // Remove old messages outside time window
    this.messageHistory[key] = this.messageHistory[key].filter(
      timestamp => now - timestamp <= this.timeWindow
    );

    const messageCount = this.messageHistory[key].length;

    console.log(`📊 User ${userId}: ${messageCount}/${this.messageThreshold} messages in ${this.timeWindow}ms`);

    // Check if user is spamming
    if (messageCount >= this.messageThreshold) {
      console.log(`🚨 SPAM DETECTED: ${messageCount} >= ${this.messageThreshold}`);
      this.flagUser(groupId, userId);
      return true; // User is spamming
    }

    return false;
  }

  // Flag a user for spam
  flagUser(groupId, userId) {
    const key = this.getUserKey(groupId, userId);

    this.flaggedUsers[key] = {
      flaggedAt: Date.now(),
      duration: this.flagDuration
    };
    
    console.log(`🚩 User ${userId} flagged for ${this.flagDuration/60000} minutes`);
  }

  // Get remaining flag time in seconds
  getRemainingFlagTime(groupId, userId) {
    const key = this.getUserKey(groupId, userId);
    
    if (!this.flaggedUsers[key]) {
      return 0;
    }

    const { flaggedAt, duration } = this.flaggedUsers[key];
    const remaining = duration - (Date.now() - flaggedAt);

    return Math.max(0, Math.ceil(remaining / 1000)); // Return in seconds
  }

  // Clear user's spam flag by setting duration to 0
  clearUserHistory(groupId, userId) {
    const key = this.getUserKey(groupId, userId);
    
    if (this.flaggedUsers[key]) {
      // Set duration to 0 so it unflag immediately
      this.flaggedUsers[key].duration = 0;
      console.log(`🗑️ Cleared spam flag for ${userId} (duration set to 0)`);
      
      // Check if flagged will auto-remove it now
      this.isFlagged(groupId, userId);
    } else {
      console.log(`⚠️ No spam flag found for ${userId}`);
    }
    
    // Also clear message history
    if (this.messageHistory[key]) {
      delete this.messageHistory[key];
      console.log(`🗑️ Cleared message history for ${userId}`);
    }
  }

  // Get spam status for debugging
  getSpamStatus(groupId, userId) {
    const key = this.getUserKey(groupId, userId);
    
    return {
      isFlagged: this.isFlagged(groupId, userId),
      messageCount: this.messageHistory[key]?.length || 0,
      remainingTime: this.getRemainingFlagTime(groupId, userId),
      flaggedAt: this.flaggedUsers[key]?.flaggedAt || null,
    };
  }
}

export default SpamDetector;