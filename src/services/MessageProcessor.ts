import { getWhopSdk } from '../lib/whop-sdk';
import { PointsService } from './PointsService';
import { BotService } from './BotService';
import { LastMessage, type ILastMessage } from '../db/models/LastMessage';

export interface ProcessedMessage {
  id: string;
  userId: string;
  companyId: string;
  experienceId: string;
  content: string;
  attachments: Array<{ contentType: string; id: string }>;
  timestamp: number;
  isImageMessage: boolean;
}

export class MessageProcessor {
  private whopSdk = getWhopSdk();
  private pointsService = new PointsService();
  private botService = new BotService();

  /**
   * Check if a message contains images
   */
  private isImageMessage(attachments: any[]): boolean {
    if (!attachments || attachments.length === 0) {
      return false;
    }

    return attachments.some(attachment => {
      const contentType = attachment.contentType?.toLowerCase() || '';
      return contentType.startsWith('image/');
    });
  }

  /**
   * Process a single message
   */
  async processMessage(message: any, companyId: string, experienceId: string): Promise<ProcessedMessage | null> {
    try {
      const userId = message.user?.id || message.user_id || message.userId;
      const processedMessage: ProcessedMessage = {
        id: message.id,
        userId,
        companyId,
        experienceId,
        content: message.content || '',
        attachments: message.attachments || [],
        timestamp: new Date(message.created_at || message.createdAt || Date.now()).getTime(),
        isImageMessage: this.isImageMessage(message.attachments || [])
      };

      // If it's an image message, award points
      if (processedMessage.isImageMessage) {
        const result = await this.pointsService.awardPointsForImage(
          processedMessage.userId,
          processedMessage.companyId,
          processedMessage.experienceId,
          processedMessage.id
        );

        console.log(`📸 Image message detected from user ${processedMessage.userId}`);
        console.log(`⭐ Points awarded: ${result.points} total points`);

        // Send message to chat about earning points
        try {
          await this.botService.sendPointsEarnedMessage(
            processedMessage.userId,
            processedMessage.experienceId,
            result.points
          );
        } catch (error) {
          console.error('❌ Error sending points earned message:', error);
        }

        // React to the image message with fire emoji
        try {
          await this.botService.reactToMessage(processedMessage.id, '🔥');
        } catch (error) {
          console.error('❌ Error reacting to image message:', error);
        }
      }

      return processedMessage;
    } catch (error) {
      console.error('❌ Error processing message:', error);
      return null;
    }
  }

  /**
   * Process multiple messages from a chat experience
   */
  async processMessages(messages: any[], companyId: string, experienceId: string): Promise<ProcessedMessage[]> {
    const processedMessages: ProcessedMessage[] = [];

    for (const message of messages) {
      const processed = await this.processMessage(message, companyId, experienceId);
      if (processed) {
        processedMessages.push(processed);
      }
    }

    return processedMessages;
  }

  /**
   * Update the last processed message for a chat experience
   */
  async updateLastMessage(companyId: string, experienceId: string, messageId: string): Promise<void> {
    try {
      await LastMessage.findOneAndUpdate(
        { companyId, experienceId },
        { 
          lastMessageId: messageId,
          lastProcessedAt: new Date()
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('❌ Error updating last message:', error);
      throw error;
    }
  }

  /**
   * Get the last processed message for a chat experience
   */
  async getLastMessage(companyId: string, experienceId: string): Promise<string | null> {
    try {
      const lastMessage = await LastMessage.findOne({ companyId, experienceId });
      return lastMessage?.lastMessageId || null;
    } catch (error) {
      console.error('❌ Error getting last message:', error);
      return null;
    }
  }
}
