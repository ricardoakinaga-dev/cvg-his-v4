import { type AppendAuditInput } from '@cvg-his/audit';
import type { ProtocolCreateDto, ProtocolUpdateDto } from '@cvg-his/domain';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type ProtocolsRepo } from './repo.js';
import type { ProtocolRecord } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: ProtocolsRepo;
    appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};
export type CreateProtocolResult = {
    kind: 'slug_conflict';
} | {
    kind: 'created';
    protocol: ProtocolRecord;
};
export type UpdateProtocolResult = {
    kind: 'protocol_not_found';
} | {
    kind: 'slug_conflict';
} | {
    kind: 'updated';
    protocol: ProtocolRecord;
};
export declare function createProtocolsService(context: ServiceContext, dependencies?: ServiceDependencies): {
    create(input: ProtocolCreateDto): Promise<CreateProtocolResult>;
    getById(protocolId: string): Promise<ProtocolRecord | null>;
    update(protocolId: string, patch: ProtocolUpdateDto): Promise<UpdateProtocolResult>;
    list(query: {
        q?: string;
        status?: "draft" | "published";
        specialty?: string;
        domain?: string;
        page: number;
        pageSize: number;
    }): Promise<{
        data: ProtocolRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
};
export {};
//# sourceMappingURL=service.d.ts.map