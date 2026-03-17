import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { closeBullMqRedis, createBullMqRedis } from './lib/redis.js';
import { SYSTEM_QUEUE_NAME, SYSTEM_QUEUE_PREFIX_DEFAULT } from './queues/system.queue.js';
import { createSystemWorker } from './workers/system.worker.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });
config();
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
    QUEUE_PREFIX: z.string().trim().min(1).default(SYSTEM_QUEUE_PREFIX_DEFAULT)
});
async function bootstrap() {
    const parsedEnv = envSchema.safeParse(process.env);
    if (!parsedEnv.success) {
        const details = parsedEnv.error.issues
            .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
            .join('; ');
        throw new Error(`Invalid environment variables: ${details}`);
    }
    const env = parsedEnv.data;
    const redis = createBullMqRedis(env.REDIS_URL);
    const worker = createSystemWorker(redis, env.QUEUE_PREFIX);
    worker.on('ready', () => {
        console.info(JSON.stringify({
            level: 'info',
            message: 'his-worker ready',
            queue: SYSTEM_QUEUE_NAME,
            queuePrefix: env.QUEUE_PREFIX
        }));
    });
    worker.on('completed', (job, result) => {
        console.info(JSON.stringify({
            level: 'info',
            message: 'system job completed',
            queue: SYSTEM_QUEUE_NAME,
            jobName: job.name,
            jobId: job.id?.toString() ?? null,
            requestId: job.data.requestId ?? null,
            result
        }));
    });
    worker.on('failed', (job, error) => {
        console.error(JSON.stringify({
            level: 'error',
            message: 'system job failed',
            queue: SYSTEM_QUEUE_NAME,
            jobName: job?.name ?? null,
            jobId: job?.id?.toString() ?? null,
            requestId: job?.data.requestId ?? null,
            error: {
                message: error.message,
                stack: error.stack
            }
        }));
    });
    console.info(JSON.stringify({
        level: 'info',
        message: 'his-worker started',
        nodeEnv: env.NODE_ENV,
        queue: SYSTEM_QUEUE_NAME,
        queuePrefix: env.QUEUE_PREFIX
    }));
    let isShuttingDown = false;
    const shutdown = async (signal) => {
        if (isShuttingDown) {
            return;
        }
        isShuttingDown = true;
        console.info(JSON.stringify({
            level: 'info',
            message: 'his-worker shutting down',
            signal
        }));
        await worker.close();
        await closeBullMqRedis(redis);
    };
    process.on('SIGINT', () => {
        void shutdown('SIGINT').then(() => process.exit(0));
    });
    process.on('SIGTERM', () => {
        void shutdown('SIGTERM').then(() => process.exit(0));
    });
}
void bootstrap().catch((error) => {
    const err = error instanceof Error ? { message: error.message, stack: error.stack } : { error };
    console.error(JSON.stringify({
        level: 'fatal',
        message: 'his-worker bootstrap failed',
        err
    }));
    process.exit(1);
});
//# sourceMappingURL=index.js.map