import { type AppendAuditInput } from '@cvg-his/audit';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type ProtocolReferenceRecord, type ProtocolReferenceType, type ProtocolReferencesRepo } from './repo.js';
import type { ProtocolReferenceSuggestHit, ProtocolReferencesSuggestAdapter } from './qdrant.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: ProtocolReferencesRepo;
    appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
    suggestAdapter?: ProtocolReferencesSuggestAdapter | null;
};
type AddReferenceInput = {
    refType: ProtocolReferenceType;
    title?: string;
    url?: string;
    sourceId?: string;
    score?: number;
    metadataJson?: Record<string, unknown>;
};
export type ListProtocolReferencesResult = {
    kind: 'protocol_not_found';
} | {
    kind: 'ok';
    references: ProtocolReferenceRecord[];
};
export type AddProtocolReferenceResult = {
    kind: 'protocol_not_found';
} | {
    kind: 'created';
    reference: ProtocolReferenceRecord;
};
export type RemoveProtocolReferenceResult = {
    kind: 'protocol_not_found';
} | {
    kind: 'reference_not_found';
} | {
    kind: 'removed';
    reference: ProtocolReferenceRecord;
};
export type SuggestProtocolReferencesResult = {
    kind: 'protocol_not_found';
} | {
    kind: 'qdrant_unavailable';
    message: string;
} | {
    kind: 'ok';
    hits: ProtocolReferenceSuggestHit[];
};
export declare function createProtocolReferencesService(context: ServiceContext, dependencies?: ServiceDependencies): {
    list(protocolId: string): Promise<ListProtocolReferencesResult>;
    add(protocolId: string, input: AddReferenceInput): Promise<AddProtocolReferenceResult>;
    remove(protocolId: string, refId: string): Promise<RemoveProtocolReferenceResult>;
    suggest(protocolId: string, query: {
        q: string;
        limit: number;
    }): Promise<SuggestProtocolReferencesResult>;
};
export {};
//# sourceMappingURL=service.d.ts.map