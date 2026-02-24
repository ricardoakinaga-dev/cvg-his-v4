import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { type ProtocolPublishJobData, type ProtocolPublishJobName, type ProtocolPublishJobResult } from '../queues/protocolPublish.queue.js';
export declare function createProtocolPublishWorker(connection: Redis, prefix: string): Worker<ProtocolPublishJobData, ProtocolPublishJobResult, ProtocolPublishJobName>;
//# sourceMappingURL=protocolPublish.worker.d.ts.map