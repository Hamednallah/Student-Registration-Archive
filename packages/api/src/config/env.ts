import z from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly in dev, otherwise rely on Docker/AWS env injection
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
}

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.string().transform(Number).default('8080'),
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string().min(32, { message: 'JWT_SECRET must be at least 32 characters long' }),
    SWAGGER_ENABLED: z.string().transform((v: string) => v === 'true').default('false'),
    ALLOWED_ORIGINS: z.string().transform((v: string) => v.split(',')),
    REDIS_ENABLED: z.string().transform((v: string) => v === 'true').default('false'),
    REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
    process.exit(1);
}

export const env = parsed.data;
