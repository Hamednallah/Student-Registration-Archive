"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const env_1 = require("./env");
const { combine, timestamp, json, errors, align, printf, colorize } = winston_1.default.format;
exports.logger = winston_1.default.createLogger({
    level: env_1.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(errors({ stack: true }), timestamp(), json()),
    defaultMeta: { service: 'psau-api' },
    transports: [
        new winston_1.default.transports.Console({
            format: env_1.env.NODE_ENV === 'development'
                ? combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), align(), printf(info => `${info.timestamp} [${info.level}]: ${info.message} ${info.stack || ''}`))
                : json() // Production always structured JSON
        }),
    ],
});
