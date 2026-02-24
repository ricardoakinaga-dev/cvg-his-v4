import { type AppendAuditInput } from '@cvg-his/audit';
import type { HandoverDraftDto } from '@cvg-his/domain';
import type { HandoverBuildEnqueueResult, HandoverBuildJobData } from '../../lib/queues.js';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type HandoverDocumentRecord, type HandoversRepo, type HandoverWithItems } from './repo.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: HandoversRepo;
    appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
    enqueueHandoverBuild?: (payload: HandoverBuildJobData) => Promise<HandoverBuildEnqueueResult>;
};
export type CreateDraftResult = {
    kind: 'ward_not_found';
} | {
    kind: 'stay_not_found';
    stayId: string;
} | {
    kind: 'stay_ward_mismatch';
    stayId: string;
} | {
    kind: 'created';
    handover: HandoverWithItems;
};
export type PublishResult = {
    kind: 'handover_not_found';
} | {
    kind: 'handover_not_draft';
    handover: HandoverWithItems;
} | {
    kind: 'published';
    handover: HandoverWithItems;
    job: HandoverBuildEnqueueResult;
};
export type HandoverDocumentResult = {
    kind: 'handover_not_found';
} | {
    kind: 'document_not_found';
} | {
    kind: 'found';
    document: HandoverDocumentRecord;
};
export declare function createHandoversService(context: ServiceContext, dependencies?: ServiceDependencies): {
    createDraft(input: HandoverDraftDto): Promise<CreateDraftResult>;
    publish(handoverId: string): Promise<PublishResult>;
    getById(handoverId: string): Promise<HandoverWithItems | null>;
    getLatestByWard(wardId: string): Promise<HandoverWithItems | null>;
    getDocumentByHandoverId(handoverId: string): Promise<HandoverDocumentResult>;
};
export {};
//# sourceMappingURL=service.d.ts.map