"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const errorHandler_1 = require("./middleware/errorHandler");
// import routes from './routes'; // Will be created in future steps
function createServer() {
    const app = (0, express_1.default)();
    // ------------------------------------------------------------------
    // Security Middleware
    // ------------------------------------------------------------------
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
            }
        }
    }));
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin)
                return callback(null, true);
            if (env_1.env.ALLOWED_ORIGINS.includes(origin)) {
                return callback(null, true);
            }
            else {
                const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
                return callback(new Error(msg), false);
            }
        },
        credentials: true,
    }));
    // ------------------------------------------------------------------
    // Parsing & Logging Middleware
    // ------------------------------------------------------------------
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // Request ID injection for tracing
    app.use((req, res, next) => {
        req.headers['x-request-id'] = req.headers['x-request-id'] || crypto.randomUUID();
        next();
    });
    app.use((0, morgan_1.default)('combined', {
        stream: { write: (message) => logger_1.logger.info(message.trim()) },
    }));
    // ------------------------------------------------------------------
    // Routes
    // ------------------------------------------------------------------
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    // app.use('/api/v1', routes);
    // ------------------------------------------------------------------
    // Error Handling (Must be last)
    // ------------------------------------------------------------------
    // 404 Handler
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            error: {
                code: 'ROUTE_NOT_FOUND',
                message: `Cannot ${req.method} ${req.url}`,
                message_ar: 'المسار غير موجود'
            }
        });
    });
    app.use(errorHandler_1.errorHandler);
    return app;
}
