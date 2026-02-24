import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fp from 'fastify-plugin';
import { z } from 'zod';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../../.env') });
const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== 'string') {
        return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
}, z.string().min(1).optional());
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
    QUEUE_PREFIX: z.string().trim().min(1).default('cvg-his'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    JWT_SECRET: z.string().trim().min(1, 'JWT_SECRET is required'),
    JWT_ISSUER: z.string().trim().min(1, 'JWT_ISSUER is required'),
    JWT_AUDIENCE: z.string().trim().min(1, 'JWT_AUDIENCE is required'),
    DEFAULT_TIMEZONE: z.string().trim().min(1).default('America/Sao_Paulo'),
    MEDICATION_SCHEDULE_DEFAULT_TIMEZONE: z.string().trim().min(1).default('America/Sao_Paulo'),
    MEDICATION_SCHEDULE_TIMEZONE_BY_ACCOUNT: z.string().default('{}'),
    MEDICATION_SCHEDULE_TIMEZONE_BY_WARD: z.string().default('{}'),
    QDRANT_URL: optionalTrimmedString,
    QDRANT_COLLECTION: z.string().trim().min(1).default('professor'),
    QDRANT_API_KEY: optionalTrimmedString
});
const envPluginImpl = async (app) => {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        const details = parsed.error.issues
            .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
            .join('; ');
        throw new Error(`Invalid environment variables: ${details}`);
    }
    app.decorate('env', parsed.data);
};
export const envPlugin = fp(envPluginImpl, {
    name: 'env-plugin'
});
//# sourceMappingURL=env.js.map