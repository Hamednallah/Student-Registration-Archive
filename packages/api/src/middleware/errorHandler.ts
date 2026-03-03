import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { logger } from '../config/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
        // Log warnings for 4xx, errors for 5xx
        if (err.statusCode >= 500) {
            logger.error(`[${err.code}] ${err.message}`, { error: err, requestId: req.headers['x-request-id'] });
        } else {
            logger.warn(`[${err.code}] ${err.message}`, { error: err, requestId: req.headers['x-request-id'] });
        }

        return res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: err.message, // English
                message_ar: err.messageAr, // Arabic
            },
        });
    }

    // Unhandled / Unexpected Errors
    logger.error('Unhandled Rejection / Exception', { error: err, stack: err.stack, requestId: req.headers['x-request-id'] });

    return res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            message_ar: 'حدث خطأ غير متوقع',
        },
    });
};
