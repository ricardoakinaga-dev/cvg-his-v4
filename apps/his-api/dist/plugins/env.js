import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fp from 'fastify-plugin';
import { z } from 'zod';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../../.env') });
config();
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
    QUEUE_PREFIX: z.string().trim().min(1).default('cvg-his'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info')
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