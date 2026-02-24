import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    DATABASE_URL: z.ZodString;
    REDIS_URL: z.ZodString;
    QUEUE_PREFIX: z.ZodDefault<z.ZodString>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["fatal", "error", "warn", "info", "debug", "trace", "silent"]>>;
    JWT_SECRET: z.ZodString;
    JWT_ISSUER: z.ZodString;
    JWT_AUDIENCE: z.ZodString;
    DEFAULT_TIMEZONE: z.ZodDefault<z.ZodString>;
    MEDICATION_SCHEDULE_DEFAULT_TIMEZONE: z.ZodDefault<z.ZodString>;
    MEDICATION_SCHEDULE_TIMEZONE_BY_ACCOUNT: z.ZodDefault<z.ZodString>;
    MEDICATION_SCHEDULE_TIMEZONE_BY_WARD: z.ZodDefault<z.ZodString>;
    QDRANT_URL: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    QDRANT_COLLECTION: z.ZodDefault<z.ZodString>;
    QDRANT_API_KEY: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "test" | "production";
    PORT: number;
    DATABASE_URL: string;
    REDIS_URL: string;
    QUEUE_PREFIX: string;
    LOG_LEVEL: "error" | "trace" | "fatal" | "warn" | "info" | "debug" | "silent";
    JWT_SECRET: string;
    JWT_ISSUER: string;
    JWT_AUDIENCE: string;
    DEFAULT_TIMEZONE: string;
    MEDICATION_SCHEDULE_DEFAULT_TIMEZONE: string;
    MEDICATION_SCHEDULE_TIMEZONE_BY_ACCOUNT: string;
    MEDICATION_SCHEDULE_TIMEZONE_BY_WARD: string;
    QDRANT_COLLECTION: string;
    QDRANT_URL?: string | undefined;
    QDRANT_API_KEY?: string | undefined;
}, {
    DATABASE_URL: string;
    REDIS_URL: string;
    JWT_SECRET: string;
    JWT_ISSUER: string;
    JWT_AUDIENCE: string;
    NODE_ENV?: "development" | "test" | "production" | undefined;
    PORT?: number | undefined;
    QUEUE_PREFIX?: string | undefined;
    LOG_LEVEL?: "error" | "trace" | "fatal" | "warn" | "info" | "debug" | "silent" | undefined;
    DEFAULT_TIMEZONE?: string | undefined;
    MEDICATION_SCHEDULE_DEFAULT_TIMEZONE?: string | undefined;
    MEDICATION_SCHEDULE_TIMEZONE_BY_ACCOUNT?: string | undefined;
    MEDICATION_SCHEDULE_TIMEZONE_BY_WARD?: string | undefined;
    QDRANT_URL?: unknown;
    QDRANT_COLLECTION?: string | undefined;
    QDRANT_API_KEY?: unknown;
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