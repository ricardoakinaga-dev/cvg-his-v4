import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    DATABASE_URL: z.ZodString;
    REDIS_URL: z.ZodString;
    QUEUE_PREFIX: z.ZodDefault<z.ZodString>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["fatal", "error", "warn", "info", "debug", "trace", "silent"]>>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "test" | "production";
    PORT: number;
    DATABASE_URL: string;
    REDIS_URL: string;
    QUEUE_PREFIX: string;
    LOG_LEVEL: "error" | "trace" | "fatal" | "warn" | "info" | "debug" | "silent";
}, {
    DATABASE_URL: string;
    REDIS_URL: string;
    NODE_ENV?: "development" | "test" | "production" | undefined;
    PORT?: number | undefined;
    QUEUE_PREFIX?: string | undefined;
    LOG_LEVEL?: "error" | "trace" | "fatal" | "warn" | "info" | "debug" | "silent" | undefined;
}>;
export type AppEnv = z.infer<typeof envSchema>;
declare module 'fastify' {
    interface FastifyInstance {
        env: AppEnv;
    }
}
export declare const envPlugin: FastifyPluginAsync;
export {};
//# sourceMappingURL=env.d.ts.map