import { getWhopSdk } from '../lib/whop-sdk';
import { MessageProcessor } from './MessageProcessor';
import { PointsService } from './PointsService';
import { BotService } from './BotService';
import { PointsTransaction } from '../db/models/PointsTransaction';
import { ExperienceConfigService } from './ExperienceConfigService';
import { loadEnv } from '../config/env';

export interface ChatExperience {
  id: string;
  companyId: string;
  appName: string;
}

export class PollingService {
  private whopSdk = getWhopSdk();
  private messageProcessor = new MessageProcessor();
  private pointsService = new PointsService();
  private botService = new BotService();
  private experienceConfig = new ExperienceConfigService();
  private env = loadEnv();
  private isRunning = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private chatExperiences: ChatExperience[] = [];

  /**
   * Start the polling service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      
      return;
    }

    
    
    // Validate environment variables
    if (!this.env.NEXT_PUBLIC_WHOP_COMPANY_ID) {
      console.error('❌ NEXT_PUBLIC_WHOP_COMPANY_ID is not set');
      return;
    }
    
    if (!this.env.WHOP_API_KEY) {
      console.error('❌ WHOP_API_KEY is not set');
      return;
    }

    
    
    this.isRunning = true;

    // Get only configured allowed experiences
    const allowedExperienceIds = this.experienceConfig.getAllowedExperiences();
    
    if (allowedExperienceIds.length === 0) {
      console.log('⚠️ No allowed chat experiences configured. Please run setup.');
      return;
    }
    
    // Create ChatExperience objects for allowed IDs only
    this.chatExperiences = allowedExperienceIds.map(id => ({
      id,
      companyId: this.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
      appName: 'Chat'
    }));
    
    console.log(`✅ Polling ${this.chatExperiences.length} configured chat experiences:`, 
      this.chatExperiences.map(exp => exp.id));

    // Initialize last message IDs to prevent processing old messages on startup
    await this.initializeLastMessageIds();

    // Skip the immediate polling - we just set the pointer, no need to process anything yet
    // await this.pollAllExperiences();

    // Set up interval polling
    this.pollingInterval = setInterval(async () => {
      await this.pollAllExperiences();
    }, this.env.POLLING_INTERVAL);

    
  }

  /**
   * Stop the polling service
   */
  stop(): void {
    if (!this.isRunning) {
      
      return;
    }

    
    this.isRunning = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    
  }

  /**
   * Get the current status of the polling service
   */
  getStatus(): { isRunning: boolean; interval: number } {
    return {
      isRunning: this.isRunning,
      interval: this.env.POLLING_INTERVAL
    };
  }

  /**
   * Reset last message IDs for all experiences (useful for testing or manual reset)
   */
  async resetLastMessageIds(): Promise<void> {
    console.log('🔄 Resetting last message IDs for all experiences...');
    
    for (const experience of this.chatExperiences) {
      try {
        // Get the latest message from this experience
        const response = await this.whopSdk.messages.listMessagesFromChat({
          chatExperienceId: experience.id
        });
        
        const messages = (response && (response.posts || response.data || [])) as any[];
        
        if (messages.length > 0) {
          // Get the most recent message (first in the array since they're in reverse chronological order)
          const latestMessage = messages[0];
          const latestMessageId = latestMessage.id;
          
          // Set this as the last processed message
          await this.messageProcessor.updateLastMessage(
            experience.companyId,
            experience.id,
            latestMessageId
          );
          
          console.log(`✅ Reset last message ID for experience ${experience.id}: ${latestMessageId}`);
        } else {
          console.log(`⚠️ No messages found in experience ${experience.id}`);
        }
      } catch (error) {
        console.error(`❌ Error resetting last message ID for experience ${experience.id}:`, error);
        // Continue with other experiences even if one fails
      }
    }
    
    console.log('✅ Last message ID reset completed');
  }

  /**
   * Initialize last message IDs for all experiences to prevent processing old messages on startup
   */
  private async initializeLastMessageIds(): Promise<void> {
    console.log('🔄 Initializing last message IDs to prevent processing old messages...');
    
    for (const experience of this.chatExperiences) {
      try {
        // Check if we already have a last message ID for this experience
        const existingLastMessageId = await this.messageProcessor.getLastMessage(
          experience.companyId,
          experience.id
        );
        
        if (existingLastMessageId) {
          console.log(`✅ Experience ${experience.id} already has last message ID: ${existingLastMessageId}`);
          continue;
        }
        
        // Get the latest message from this experience
        const response = await this.whopSdk.messages.listMessagesFromChat({
          chatExperienceId: experience.id
        });
        
        const messages = (response && (response.posts || response.data || [])) as any[];
        
        if (messages.length > 0) {
          // Get the most recent message (first in the array since they're in reverse chronological order)
          const latestMessage = messages[0];
          const latestMessageId = latestMessage.id;
          
          // Set this as the last processed message
          await this.messageProcessor.updateLastMessage(
            experience.companyId,
            experience.id,
            latestMessageId
          );
          
          console.log(`✅ Initialized last message ID for experience ${experience.id}: ${latestMessageId}`);
        } else {
          console.log(`⚠️ No messages found in experience ${experience.id}`);
        }
      } catch (error) {
        console.error(`❌ Error initializing last message ID for experience ${experience.id}:`, error);
        // Continue with other experiences even if one fails
      }
    }
    
    console.log('✅ Last message ID initialization completed');
  }

  /**
   * Poll all chat experiences for new messages
   */
  private async pollAllExperiences(): Promise<void> {
    try {
      
      const experiences = this.chatExperiences;
      
      if (experiences.length === 0) {
        
        return;
      }
      
      
      
      for (const experience of experiences) {
        try {
          await this.pollExperience(experience);
        } catch (error) {
          console.error(`❌ Error polling experience ${experience.id}:`, error);
          // Continue with other experiences even if one fails
        }
      }
    } catch (error) {
      console.error('❌ Error polling experiences:', error);
    }
  }

  /**
   * Poll a specific chat experience for new messages
   */
  private async pollExperience(experience: ChatExperience): Promise<void> {
    try {
      // Get the last processed message for this experience
      const lastMessageId = await this.messageProcessor.getLastMessage(
        experience.companyId,
        experience.id
      );

      // Get messages from the chat experience
      const response = await this.whopSdk.messages.listMessagesFromChat({
        chatExperienceId: experience.id
      });
      // Prefer posts array if present (newer API), fall back to data
      const messages = (response && (response.posts || response.data || [])) as any[];

      // --- Reconcile deletions: auto-revert points for missing messages (always run) ---
      try {
        const currentIds = new Set<string>((messages.map((m: any) => m.id).filter(Boolean)));
        // Find all unreverted positive transactions for this company & experience
        const unreverted = await PointsTransaction.find({
          companyId: experience.companyId,
          experienceId: experience.id,
          pointsDelta: { $gt: 0 },
          reverted: false,
          messageId: { $ne: null }
        }).select('userId messageId pointsDelta');

        for (const tx of unreverted) {
          if (!tx.messageId) continue;

          // Quick check: if message id is not in current page, we may still need to verify via API
          const mightBeDeleted = !currentIds.has(tx.messageId);
          if (!mightBeDeleted) {
            // Message appears in current list. Optionally detect soft-deleted
            try {
              const m = messages.find((m: any) => m.id === tx.messageId);
              const softDeleted = !!(m && (m.deleted || m.isDeleted || m.status === 'deleted' || m.state === 'deleted'));
              if (!softDeleted) continue;
            } catch {}
          }

          // Validate by fetching the message directly. If 404 or deleted flag => revert
          let shouldRevert = false;
          try {
            const details = await this.whopSdk.messages.getMessage({ id: tx.messageId });
            const deleted = !details || !!(details.deleted || details.isDeleted || details.status === 'deleted' || details.state === 'deleted');
            shouldRevert = deleted;
          } catch (fetchErr) {
            // If API throws for not found, treat as deleted
            shouldRevert = true;
          }

          // if (shouldRevert) {
          //   try {
          //     await this.pointsService.revertPointsForMessage(tx.userId, experience.companyId, tx.messageId);
          //     console.log(`↩️ Reverted points for deleted message ${tx.messageId}`);
          //     // Notify chat about point adjustment
          //     try {
          //       const status = await this.pointsService.getUserStatus(tx.userId, experience.companyId);
          //       // await this.botService.sendPointsRevertedMessage(tx.userId, experience.id, status.points);
          //     } catch (notifyErr) {
          //       console.error('❌ Error sending revert notification:', notifyErr);
          //     }
          //   } catch (e) {
          //     console.error('❌ Error auto-reverting points for message:', tx.messageId, e);
          //   }
          // }
        }
      } catch (reconcileError) {
        console.error('❌ Error reconciling deleted messages:', reconcileError);
      }

      if (messages.length === 0) {
        return;
      }

      // Filter for new messages (after the last processed message)
      let newMessages = messages;
      if (lastMessageId) {
        const lastMessageIndex = messages.findIndex((msg: any) => msg.id === lastMessageId);
        if (lastMessageIndex !== -1) {
          newMessages = messages.slice(0, lastMessageIndex);
        }
      }

      if (newMessages.length === 0) {
        return;
      }

      // Process the new messages
      const processedMessages = await this.messageProcessor.processMessages(
        newMessages,
        experience.companyId,
        experience.id
      );

      // Update the last processed message
      if (processedMessages.length > 0) {
        const latestMessage = processedMessages[0]; // Messages are in reverse chronological order
        await this.messageProcessor.updateLastMessage(
          experience.companyId,
          experience.id,
          latestMessage.id
        );
      }

      
    } catch (error) {
      console.error(`❌ Error polling experience ${experience.id}:`, error);
    }
  }
}
