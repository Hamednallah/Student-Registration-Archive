import winston from 'winston';
import { env } from './env';

const { combine, timestamp, json, errors, align, printf, colorize } = winston.format;

export const logger = winston.createLogger({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(
        errors({ stack: true }),
        timestamp(),
        json()
    ),
    defaultMeta: { service: 'psau-api' },
    transports: [
        new winston.transports.Console({
            format: env.NODE_ENV === 'development'
                ? combine(
                    colorize(),
                    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                    align(),
                    printf(info => `${info.timestamp} [${info.level}]: ${info.message} ${info.stack || ''}`)
                )
                : json() // Production always structured JSON
        }),
    ],
});
