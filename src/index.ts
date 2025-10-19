import { createApp } from './server/app';
import { connectToMongoDB } from './db/mongo';
import { loadEnv } from './config/env';
import { PollingService } from './services/PollingService';
import { UserSyncService } from './services/UserSyncService';
import { ExperienceConfigService } from './services/ExperienceConfigService';
import pino from 'pino';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

async function main() {
  try {
    const env = loadEnv();

    await connectToMongoDB();

    const app = createApp();

    // Check experience configuration
    const experienceConfig = new ExperienceConfigService();
    if (!experienceConfig.isConfigured()) {
      logger.error('❌ No experience configuration found. Please run: python setup_experiences.py');
      process.exit(1);
    } else {
      const allowedExperiences = experienceConfig.getAllowedExperiences();
      logger.info({ allowedExperiences }, '✅ Experience configuration loaded');
    }

    try {
      const res = await new UserSyncService().syncCompanyUsers();
    } catch (e) {
      logger.warn({ e }, '⚠️ User sync failed (startup continues)');
    }
    
    const pollingService = new PollingService();
    await pollingService.start();
    logger.info('✅ Polling service started automatically');

    const port = env.PORT;
    app.listen(port, () => {
      logger.info(`🚀 Image Points Bot server running on port ${port}`);
      logger.info(`📊 Health check: http://localhost:${port}/health`);
      logger.info(`📈 Status: http://localhost:${port}/status`);
      logger.info(`🔄 Polling is running automatically`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('🛑 Shutting down gracefully...');
      pollingService.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('🛑 Shutting down gracefully...');
      pollingService.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error({ error }, '❌ Failed to start server');
    process.exit(1);
  }
}

main();
