import { type AppendAuditInput } from '@cvg-his/audit';
import type { ProtocolPublishEnqueueResult, ProtocolPublishJobData } from '../../lib/queues.js';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type ProtocolPublishRepo, type ProtocolVersionPublishRecord } from './repo.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: ProtocolPublishRepo;
    appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
    enqueueProtocolPublish?: (payload: ProtocolPublishJobData) => Promise<ProtocolPublishEnqueueResult>;
};
type PublishValidationIssue = {
    path: string;
    message: string;
};
export type RequestProtocolPublishResult = {
    kind: 'version_not_found';
} | {
    kind: 'version_not_publishable';
    version: ProtocolVersionPublishRecord;
} | {
    kind: 'invalid_content';
    issues: PublishValidationIssue[];
} | {
    kind: 'queued';
    version: ProtocolVersionPublishRecord;
    jobId: string | null;
};
export declare function createProtocolPublishService(context: ServiceContext, dependencies?: ServiceDependencies): {
    requestPublish(versionId: string): Promise<RequestProtocolPublishResult>;
};
export {};
//# sourceMappingURL=service.d.ts.map