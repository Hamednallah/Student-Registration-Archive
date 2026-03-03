"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = __importDefault(require("zod"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env explicitly in dev, otherwise rely on Docker/AWS env injection
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '../../.env') });
}
const envSchema = zod_1.default.object({
    NODE_ENV: zod_1.default.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.default.string().transform(Number).default('8080'),
    DATABASE_URL: zod_1.default.string(),
    JWT_SECRET: zod_1.default.string().min(32, { message: 'JWT_SECRET must be at least 32 characters long' }),
    SWAGGER_ENABLED: zod_1.default.string().transform(v => v === 'true').default('false'),
    ALLOWED_ORIGINS: zod_1.default.string().transform(v => v.split(',')),
    REDIS_ENABLED: zod_1.default.string().transform(v => v === 'true').default('false'),
    REDIS_URL: zod_1.default.string().optional(),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
    process.exit(1);
}
exports.env = parsed.data;
