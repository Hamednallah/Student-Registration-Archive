"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const database_1 = require("./config/database");
async function bootstrap() {
    try {
        // 1. Initialize Database Connection
        (0, database_1.initializeDatabase)();
        // 2. Start Express Server
        const app = (0, server_1.createServer)();
        const server = app.listen(env_1.env.PORT, () => {
            logger_1.logger.info(`Server listening on port ${env_1.env.PORT} in ${env_1.env.NODE_ENV} mode`);
            logger_1.logger.info(`Database URL matches SQLite pattern: ${env_1.env.DATABASE_URL.startsWith('sqlite:')}`);
        });
        // 3. Graceful Shutdown Handlers
        const shutdown = async (signal) => {
            logger_1.logger.info(`Received ${signal}. Shutting down gracefully...`);
            server.close(() => {
                logger_1.logger.info('HTTP server closed');
                process.exit(0);
            });
            // Safety timeout
            setTimeout(() => {
                logger_1.logger.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        logger_1.logger.error('Failed to start application', { error });
        process.exit(1);
    }
}
bootstrap();
