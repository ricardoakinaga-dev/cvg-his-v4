import { Queue } from 'bullmq';
export const PROTOCOL_PUBLISH_QUEUE_NAME = 'protocol-publish';
export const PROTOCOL_PUBLISH_JOB_NAME = 'publish';
export function protocolPublishJobId(payload) {
    return `protocol-publish-${payload.accountId}-${payload.protocolId}-${payload.versionId}`;
}
export function protocolPublishJobOptions() {
    return {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: 500,
        removeOnFail: 1000
    };
}
export function createProtocolPublishQueue(connection, prefix) {
    return new Queue(PROTOCOL_PUBLISH_QUEUE_NAME, {
        connection,
        prefix
    });
}
//# sourceMappingURL=protocolPublish.queue.js.map