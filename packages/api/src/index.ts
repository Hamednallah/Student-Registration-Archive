import { createServer } from './server';
import { env } from './config/env';
import { logger } from './config/logger';
import { initializeDatabase } from './config/database';

async function bootstrap() {
    try {
        // 1. Initialize Database Connection
        initializeDatabase();

        // 2. Start Express Server
        const app = createServer();
        const server = app.listen(env.PORT, () => {
            logger.info(`Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
            logger.info(`Database URL matches SQLite pattern: ${env.DATABASE_URL.startsWith('sqlite:')}`);
        });

        // 3. Graceful Shutdown Handlers
        const shutdown = async (signal: string) => {
            logger.info(`Received ${signal}. Shutting down gracefully...`);
            server.close(() => {
                logger.info('HTTP server closed');
                process.exit(0);
            });
            // Safety timeout
            setTimeout(() => {
                logger.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        logger.error('Failed to start application', { error });
        process.exit(1);
    }
}

bootstrap();
