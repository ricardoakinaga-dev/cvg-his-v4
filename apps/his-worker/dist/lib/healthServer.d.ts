import type { Redis } from 'ioredis';
import { type WorkerHealthStatus } from './workerHealth.js';
/**
 * Worker Health HTTP Server
 *
 * Provides a simple HTTP endpoint for health checks.
 * Used by container orchestrators and monitoring systems.
 */
export type HealthServerConfig = {
    port: number;
    redis: Redis;
    cronConfigs: Array<{
        name: string;
        intervalMs: number;
    }>;
    onHealthCheck?: (status: WorkerHealthStatus) => void;
};
export type HealthServerHandle = {
    stop: () => Promise<void>;
    port: number;
};
export declare function startHealthServer(config: HealthServerConfig): HealthServerHandle;
//# sourceMappingURL=healthServer.d.ts.map