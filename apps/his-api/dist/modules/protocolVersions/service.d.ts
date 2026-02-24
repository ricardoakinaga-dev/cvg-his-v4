import { type AppendAuditInput } from '@cvg-his/audit';
import type { ProtocolContentDto } from '@cvg-his/domain';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type ProtocolVersionRecord, type ProtocolVersionsRepo } from './repo.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: ProtocolVersionsRepo;
    appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};
export type CreateProtocolVersionResult = {
    kind: 'protocol_not_found';
} | {
    kind: 'created';
    version: ProtocolVersionRecord;
};
export type ListProtocolVersionsResult = {
    kind: 'protocol_not_found';
} | {
    kind: 'ok';
    versions: {
        data: ProtocolVersionRecord[];
        page: number;
        pageSize: number;
        total: number;
    };
};
export type EditProtocolVersionResult = {
    kind: 'version_not_found';
} | {
    kind: 'version_not_editable';
    version: ProtocolVersionRecord;
} | {
    kind: 'change_reason_required';
} | {
    kind: 'edited';
    version: ProtocolVersionRecord;
};
export declare function createProtocolVersionsService(context: ServiceContext, dependencies?: ServiceDependencies): {
    createDraft(protocolId: string): Promise<CreateProtocolVersionResult>;
    listByProtocol(protocolId: string, query: {
        page: number;
        pageSize: number;
    }): Promise<ListProtocolVersionsResult>;
    getById(versionId: string): Promise<ProtocolVersionRecord | null>;
    editDraft(versionId: string, patch: {
        contentJson: ProtocolContentDto;
        changeReason?: string;
    }): Promise<EditProtocolVersionResult>;
};
export {};
//# sourceMappingURL=service.d.ts.map