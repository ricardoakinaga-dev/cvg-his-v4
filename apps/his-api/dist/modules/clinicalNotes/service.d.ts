import { type AppendAuditInput } from '@cvg-his/audit';
import type { NoteCreateDto, NoteUpdateDto, SoapDto } from '@cvg-his/domain';
import { type ClinicalNoteSignedEvent, type ClinicalNoteVersionCreatedEvent } from '@cvg-his/events';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type ClinicalNoteRecord, type ClinicalNotesRepo } from './repo.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: ClinicalNotesRepo;
    appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};
type SoapTemplate = {
    key: 'gastro' | 'cardio' | 'trauma';
    label: string;
    soap: SoapDto;
};
export type CreateClinicalNoteResult = {
    kind: 'encounter_not_found';
} | {
    kind: 'created';
    note: ClinicalNoteRecord;
};
export type UpdateClinicalNoteResult = {
    kind: 'note_not_found';
} | {
    kind: 'note_not_editable';
    note: ClinicalNoteRecord;
} | {
    kind: 'updated';
    note: ClinicalNoteRecord;
};
export type VersionClinicalNoteResult = {
    kind: 'note_not_found';
} | {
    kind: 'note_not_editable';
    note: ClinicalNoteRecord;
} | {
    kind: 'version_created';
    note: ClinicalNoteRecord;
    event: ClinicalNoteVersionCreatedEvent;
};
export type SignClinicalNoteResult = {
    kind: 'note_not_found';
} | {
    kind: 'already_signed';
    note: ClinicalNoteRecord;
} | {
    kind: 'signed';
    note: ClinicalNoteRecord;
    event: ClinicalNoteSignedEvent;
};
export declare function createClinicalNotesService(context: ServiceContext, dependencies?: ServiceDependencies): {
    listSoapTemplates(): SoapTemplate[];
    create(input: NoteCreateDto & {
        reason?: string;
    }): Promise<CreateClinicalNoteResult>;
    getById(noteId: string): Promise<ClinicalNoteRecord | null>;
    update(noteId: string, input: NoteUpdateDto & {
        reason: string;
    }): Promise<UpdateClinicalNoteResult>;
    version(noteId: string, input: NoteUpdateDto & {
        reason: string;
    }): Promise<VersionClinicalNoteResult>;
    sign(noteId: string): Promise<SignClinicalNoteResult>;
};
export {};
//# sourceMappingURL=service.d.ts.map