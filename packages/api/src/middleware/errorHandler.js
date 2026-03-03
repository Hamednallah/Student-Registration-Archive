"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errors_1 = require("../lib/errors");
const logger_1 = require("../config/logger");
const errorHandler = (err, req, res, next) => {
    if (err instanceof errors_1.AppError) {
        // Log warnings for 4xx, errors for 5xx
        if (err.statusCode >= 500) {
            logger_1.logger.error(`[${err.code}] ${err.message}`, { error: err, requestId: req.headers['x-request-id'] });
        }
        else {
            logger_1.logger.warn(`[${err.code}] ${err.message}`, { error: err, requestId: req.headers['x-request-id'] });
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
    logger_1.logger.error('Unhandled Rejection / Exception', { error: err, stack: err.stack, requestId: req.headers['x-request-id'] });
    return res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            message_ar: 'حدث خطأ غير متوقع',
        },
    });
};
exports.errorHandler = errorHandler;
