import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';

export function createServer(): Express {
    const app = express();

    // ------------------------------------------------------------------
    // Security Middleware
    // ------------------------------------------------------------------
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
            }
        }
    }));

    app.use(cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            if (env.ALLOWED_ORIGINS.includes(origin)) {
                return callback(null, true);
            } else {
                const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
                return callback(new Error(msg), false);
            }
        },
        credentials: true,
    }));

    // ------------------------------------------------------------------
    // Parsing & Logging Middleware
    // ------------------------------------------------------------------
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request ID injection for tracing
    app.use((req: Request, res: Response, next: NextFunction) => {
        req.headers['x-request-id'] = req.headers['x-request-id'] || crypto.randomUUID();
        next();
    });

    app.use(morgan('combined', {
        stream: { write: (message) => logger.info(message.trim()) },
    }));

    // ------------------------------------------------------------------
    // Routes
    // ------------------------------------------------------------------
    app.get('/health', (req: Request, res: Response) => {
        res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.use('/api/v1', routes);

    // ------------------------------------------------------------------
    // Error Handling (Must be last)
    // ------------------------------------------------------------------

    // 404 Handler
    app.use((req: Request, res: Response) => {
        res.status(404).json({
            success: false,
            error: {
                code: 'ROUTE_NOT_FOUND',
                message: `Cannot ${req.method} ${req.url}`,
                message_ar: 'المسار غير موجود'
            }
        });
    });

    app.use(errorHandler);

    return app;
}
