import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import cors from 'cors';
import { connectToMongoDB } from '../db/mongo';
import { PollingService } from '../services/PollingService';
import { BotService } from '../services/BotService';
import { PointsService } from '../services/PointsService';
import { loadEnv } from '../config/env';
import { UserSyncService } from '../services/UserSyncService';
import path from 'path';
import { RedemptionRequest } from '../db/models/RedemptionRequest';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

export function createApp() {
  const app = express();
  const env = loadEnv();
  
  // Middleware
  app.use(express.json());
  app.use(pinoHttp({ logger }));
  app.use(cors());

  // Serve static public directory for legacy static shop
  app.use(express.static(path.join(process.cwd(), 'public')));

  // In production, serve built React app if exists at frontend/dist
  const distDir = path.join(process.cwd(), 'frontend', 'dist');
  app.use(express.static(distDir));

  // Initialize services
  const pollingService = new PollingService();
  const botService = new BotService();
  const pointsService = new PointsService();
  const userSyncService = new UserSyncService();

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'image-points-bot'
    });
  });

  // Get polling service status
  app.get('/status', (req, res) => {
    const status = pollingService.getStatus();
    res.json({
      polling: status,
      timestamp: new Date().toISOString()
    });
  });

  // Start polling service
  app.post('/start', async (req, res) => {
    try {
      await pollingService.start();
      res.json({
        success: true,
        message: 'Polling service started',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error({ error }, 'Error starting polling service:');
      res.status(500).json({
        success: false,
        error: 'Failed to start polling service'
      });
    }
  });

  // Sync users from Whop into DB
  app.post('/sync-users', async (req, res) => {
    try {
      const result = await userSyncService.syncCompanyUsers();
      res.json({ success: true, result });
    } catch (error) {
      logger.error({ error }, 'Error syncing users:');
      res.status(500).json({ success: false, error: 'Failed to sync users' });
    }
  });

  // Stop polling service
  app.post('/stop', (req, res) => {
    try {
      pollingService.stop();
      res.json({
        success: true,
        message: 'Polling service stopped',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error({ error }, 'Error stopping polling service:');
      res.status(500).json({
        success: false,
        error: 'Failed to stop polling service'
      });
    }
  });

  // Reset last message IDs (useful for testing or manual reset)
  app.post('/reset-message-ids', async (req, res) => {
    try {
      await pollingService.resetLastMessageIds();
      res.json({
        success: true,
        message: 'Last message IDs reset successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error({ error }, 'Error resetting last message IDs:');
      res.status(500).json({
        success: false,
        error: 'Failed to reset last message IDs'
      });
    }
  });

  // Get user points
  app.get('/user/:userId/points', async (req, res) => {
    try {
      const { userId } = req.params;
      const status = await pointsService.getUserStatus(userId, env.NEXT_PUBLIC_WHOP_COMPANY_ID);
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error({ error }, 'Error getting user points:');
      res.status(500).json({
        success: false,
        error: 'Failed to get user points'
      });
    }
  });

  // Get leaderboard
  app.get('/leaderboard', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await pointsService.getLeaderboard(env.NEXT_PUBLIC_WHOP_COMPANY_ID, limit);
      res.json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      logger.error({ error }, 'Error getting leaderboard:');
      res.status(500).json({
        success: false,
        error: 'Failed to get leaderboard'
      });
    }
  });

  // Revert points for a deleted message
  // app.post('/messages/:messageId/revert', async (req, res) => {
  //   try {
  //     const { messageId } = req.params;
  //     let { userId } = req.body as { userId?: string };

  //     // If userId not provided, try to infer from the transaction log
  //     if (!userId) {
  //       try {
  //         const { PointsTransaction } = await import('../db/models/PointsTransaction');
  //         const tx = await (PointsTransaction as any).findOne({
  //           companyId: env.NEXT_PUBLIC_WHOP_COMPANY_ID,
  //           messageId,
  //           pointsDelta: { $gt: 0 },
  //           reverted: false,
  //         });
  //         userId = tx?.userId;
  //       } catch {}
  //     }

  //     if (!userId) return res.status(400).json({ success: false, error: 'userId not found for messageId' });

  //     const result = await pointsService.revertPointsForMessage(userId, env.NEXT_PUBLIC_WHOP_COMPANY_ID, messageId);
  //     res.json({ success: true, data: result });
  //   } catch (error) {
  //     logger.error({ error }, 'Error reverting points for message:');
  //     res.status(500).json({ success: false, error: 'Failed to revert points' });
  //   }
  // });

  // Increase user points (for external purchases or manual adjustments)
  app.post('/user/:userId/points/increase', async (req, res) => {
    try {
      const { userId } = req.params;
      const { points } = req.body;
      
      if (!points || typeof points !== 'number' || points <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Points must be a positive number'
        });
      }
      
      const result = await pointsService.increasePoints(userId, env.NEXT_PUBLIC_WHOP_COMPANY_ID, points);
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error({ error }, 'Error increasing user points:');
      return res.status(500).json({
        success: false,
        error: 'Failed to increase user points'
      });
    }
  });

  // Set freetime period for user (for external purchases)
  app.post('/user/:userId/freetime', async (req, res) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Both startDate and endDate are required'
        });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format'
        });
      }
      
      if (start >= end) {
        return res.status(400).json({
          success: false,
          error: 'Start date must be before end date'
        });
      }
      
      await pointsService.setFreetimePeriod(userId, env.NEXT_PUBLIC_WHOP_COMPANY_ID, start, end);
      return res.json({
        success: true,
        message: 'Freetime period set successfully'
      });
    } catch (error) {
      logger.error({ error }, 'Error setting freetime period:');
      return res.status(500).json({
        success: false,
        error: 'Failed to set freetime period'
      });
    }
  });

  // List shop prizes (static config for now)
  app.get('/shop/prizes', (req, res) => {
    const prizes = [
      { key: 'free_week', label: '7 day free membership', cost: 50 },
      { key: 'free_month', label: '1 month free access', cost: 150 },
    ];
    res.json({ success: true, data: prizes });
  });

  // Resolve current userId via Whop token (for iframe apps)
  app.get('/auth/current-user', async (req, res) => {
    try {
      const { getWhopSdk } = await import('../lib/whop-sdk.js');
      const whopSdk = getWhopSdk() as any;
      const result = await whopSdk.verifyUserToken(req.headers);
      res.json({ success: true, data: { userId: result?.userId || '' } });
    } catch (error) {
      logger.error({ error }, 'Error verifying user token:');
      res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  });

  // Redeem a prize: create a redemption request ticket
  app.post('/shop/redeem', async (req, res) => {
    try {
      const { userId, prizeKey } = req.body as { userId?: string; prizeKey?: string };
      if (!userId || !prizeKey) {
        return res.status(400).json({ success: false, error: 'userId and prizeKey are required' });
      }

      const prizeCatalog: Record<string, { label: string; cost: number }> = {
        free_week: { label: 'Free Week', cost: 50 },
        free_month: { label: 'Free Month', cost: 150 },
      };
      const prize = prizeCatalog[prizeKey];
      if (!prize) {
        return res.status(400).json({ success: false, error: 'Invalid prizeKey' });
      }

      const status = await pointsService.getUserStatus(userId, env.NEXT_PUBLIC_WHOP_COMPANY_ID);
      if (status.points < prize.cost) {
        return res.status(400).json({ success: false, error: 'Not enough points to redeem' });
      }

      const request = await RedemptionRequest.create({
        userId,
        companyId: env.NEXT_PUBLIC_WHOP_COMPANY_ID,
        prizeKey,
        prizeLabel: prize.label,
        pointsCost: prize.cost,
        status: 'pending',
      });

      return res.json({ success: true, data: { id: request.id } });
    } catch (error) {
      logger.error({ error }, 'Error creating redemption request:');
      return res.status(500).json({ success: false, error: 'Failed to create redemption request' });
    }
  });


  // Send test message
  app.post('/test/message', async (req, res) => {
    try {
      const { experienceId, message } = req.body;
      if (!experienceId || !message) {
        return res.status(400).json({
          success: false,
          error: 'experienceId and message are required'
        });
      }

      await botService.sendMessage(experienceId, message);
      return res.json({
        success: true,
        message: 'Test message sent'
      });
    } catch (error) {
      logger.error({ error }, 'Error sending test message:');
      return res.status(500).json({
        success: false,
        error: 'Failed to send test message'
      });
    }
  });

  // Get chat experiences
  app.get('/experiences', async (req, res) => {
    try {
      const { getWhopSdk } = await import('../lib/whop-sdk.js');
      const whopSdk = getWhopSdk();
      
      const response = await whopSdk.experiences.listExperiences({
        companyId: env.NEXT_PUBLIC_WHOP_COMPANY_ID
      });

      const experiences = response.data
        .filter((exp: any) => exp.app_name === 'chat')
        .map((exp: any) => ({
          id: exp.id,
          companyId: exp.company_id,
          appName: exp.app_name
        }));

      res.json({
        success: true,
        data: experiences
      });
    } catch (error) {
      logger.error({ error }, 'Error getting experiences:');
      res.status(500).json({
        success: false,
        error: 'Failed to get experiences'
      });
    }
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not found'
    });
  });

  return app;
}
