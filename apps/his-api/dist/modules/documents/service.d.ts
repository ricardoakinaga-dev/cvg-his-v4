import { type AppendAuditInput } from '@cvg-his/audit';
import type { DocumentCreateDto } from '@cvg-his/domain';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type DocumentRecord, type DocumentsRepo, type EncounterDocumentRecord } from './repo.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: DocumentsRepo;
    appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};
export type AttachDocumentResult = {
    kind: 'encounter_not_found';
} | {
    kind: 'document_not_found';
} | {
    kind: 'attached';
    relation: EncounterDocumentRecord;
    alreadyAttached: boolean;
};
export declare function createDocumentsService(context: ServiceContext, dependencies?: ServiceDependencies): {
    create(input: DocumentCreateDto): Promise<DocumentRecord>;
    getById(documentId: string): Promise<DocumentRecord | null>;
    attachToEncounter(encounterId: string, documentId: string): Promise<AttachDocumentResult>;
};
export {};
//# sourceMappingURL=service.d.ts.map