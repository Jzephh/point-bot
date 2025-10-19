import { getWhopSdk } from '../lib/whop-sdk.js';
import { PointsService } from './PointsService.js';
import { loadEnv } from '../config/env.js';

export class BotService {
  private whopSdk = getWhopSdk();
  private pointsService = new PointsService();
  private env = loadEnv();

  /**
   * Send a message to a chat experience
   */
  async sendMessage(experienceId: string, message: string): Promise<void> {
    try {
      await this.whopSdk.messages.sendMessageToChat({
        experienceId,
        message
      });
      console.log(`📤 Sent message to experience ${experienceId}: ${message}`);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  /**
   * React to a message with an emoji
   */
  async reactToMessage(messageId: string, emoji: string): Promise<void> {
    try {
      // Use Whop REST API directly
      const res = await fetch('https://api.whop.com/api/v1/reactions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resource_id: messageId,
          emoji
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
      }

      console.log(`🔥 Reacted to message ${messageId} with ${emoji}`);
    } catch (error) {
      console.error('❌ Error reacting to message:', error);
      throw error;
    }
  }


  /**
   * Send a points update message
   */
  async sendPointsUpdate(userId: string, experienceId: string, points: number): Promise<void> {
    const message = `⭐ <@${userId}> earned a point! Total: ${points} points`;
    await this.sendMessage(experienceId, message);
  }

  /**
   * Send message when user earns points from posting image
   */
  async sendPointsEarnedMessage(userId: string, experienceId: string, totalPoints: number): Promise<void> {
    try {
      // Get user details for better personalization
      let username = userId;
      try {
        const userDetails = await this.whopSdk.users.getUser({ userId });
        username = userDetails.username || userDetails.name || userId;
      } catch (error) {
        console.log('Could not fetch user details, using userId');
      }

      // Send professional text message
      const professionalMessage = `@${username}
Congrats, you earned +1 point for posting success. 🎉 
✅ You can redeem your points for free time in the points shop. ⌛`;

      await this.sendMessage(experienceId, professionalMessage);
      console.log(`✅ Sent congratulatory message for user ${userId}`);
    } catch (error) {
      console.error('❌ Error sending congratulatory message:', error);
      
      // Fallback to simple text message
      const fallbackMessage = `⭐ @${userId} earned 1 point! Total: ${totalPoints} points. Redeem your points in the point shop! 🛒`;
      await this.sendMessage(experienceId, fallbackMessage);
    }
  }

  /**
   * Send message when points are reverted due to a deleted message
   */
//   async sendPointsRevertedMessage(userId: string, experienceId: string, totalPoints: number): Promise<void> {
//     try {
//       // Try to personalize with username
//       let username = userId;
//       try {
//         const userDetails = await this.whopSdk.users.getUser({ userId });
//         username = userDetails.username || userDetails.name || userId;
//       } catch {}

//       const message = `↩️ **Points adjusted for @${username}**

// ❗ A post was deleted, so the awarded point was reverted.
// 📊 **Total Points:** ${totalPoints}`;

//       await this.sendMessage(experienceId, message);
//     } catch (error) {
//       console.error('❌ Error sending points reverted message:', error);
//       const fallback = `↩️ @${userId} had a point reverted. Total: ${totalPoints} points.`;
//       await this.sendMessage(experienceId, fallback);
//     }
//   }

  /**
   * Send leaderboard message
   */
  async sendLeaderboard(experienceId: string, leaderboard: Array<{ userId: string; points: number }>): Promise<void> {
    let message = '🏆 **Image Points Leaderboard**\n\n';
    
    leaderboard.forEach((user, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📍';
      message += `${medal} **${index + 1}.** <@${user.userId}> - ${user.points} points\n`;
    });

    await this.sendMessage(experienceId, message);
  }


  /**
   * Send help message with available commands
   */
  async sendHelp(experienceId: string): Promise<void> {
    const message = `🤖 **Image Points Bot Commands**

📸 **How it works:** Post images to earn points! Every image message gives you 1 point.

**Available Commands:**
• \`!points\` - Check your current points
• \`!leaderboard\` - Show top 10 users
• \`!help\` - Show this help message

Keep sharing those images! 📸✨`;

    await this.sendMessage(experienceId, message);
  }

  /**
   * Process bot commands
   */
  async processCommand(command: string, userId: string, experienceId: string): Promise<void> {
    const cmd = command.toLowerCase().trim();

    try {
      switch (cmd) {
        case '!points':
          const status = await this.pointsService.getUserStatus(userId, this.env.NEXT_PUBLIC_WHOP_COMPANY_ID);
          const message = `📊 **Your Points Status**

⭐ **Points:** ${status.points}
${status.freetimeStartDate && status.freetimeEndDate ? `🎁 **Free Time:** ${status.freetimeStartDate.toLocaleDateString()} - ${status.freetimeEndDate.toLocaleDateString()}` : ''}

Keep sharing images to earn more points! 📸`;
          await this.sendMessage(experienceId, message);
          break;

        case '!leaderboard':
          const leaderboard = await this.pointsService.getLeaderboard(this.env.NEXT_PUBLIC_WHOP_COMPANY_ID, 10);
          await this.sendLeaderboard(experienceId, leaderboard);
          break;

        case '!help':
          await this.sendHelp(experienceId);
          break;

        default:
          // Unknown command, do nothing
          break;
      }
    } catch (error) {
      console.error('❌ Error processing command:', error);
    }
  }
}
