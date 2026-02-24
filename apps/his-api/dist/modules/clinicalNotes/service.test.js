import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClinicalNotesService } from './service.js';
const fakeDb = {};
function makeNote(overrides = {}) {
    return {
        id: 'note-1',
        encounterId: 'encounter-1',
        type: 'SOAP',
        status: 'draft',
        versionNumber: 1,
        signedAt: null,
        signedByUserId: null,
        createdByUserId: 'user-1',
        updatedByUserId: 'user-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        soap: {
            subjective: 'dor abdominal',
            objective: 'sensibilidade em quadrante cranial',
            assessment: 'gastroenterite',
            plan: 'antiemetico'
        },
        ...overrides
    };
}
function createRepoMock() {
    return {
        findEncounterInAccount: vi.fn(async () => false),
        createDraft: vi.fn(async () => makeNote()),
        findById: vi.fn(async () => null),
        updateDraft: vi.fn(async () => null),
        signDraftById: vi.fn(async () => null)
    };
}
function createRequestContext(overrides = {}) {
    return {
        requestId: 'req-1',
        actor: {
            accountId: 'account-1',
            userId: 'user-1',
            role: 'vet',
            roles: ['vet'],
            permissions: []
        },
        ...overrides
    };
}
describe('clinical notes service', () => {
    let repo;
    let appendAudit;
    beforeEach(() => {
        repo = createRepoMock();
        appendAudit = vi.fn(async () => undefined);
    });
    it('cria nota draft e registra auditoria', async () => {
        vi.mocked(repo.findEncounterInAccount).mockResolvedValue(true);
        vi.mocked(repo.createDraft).mockResolvedValue(makeNote());
        const service = createClinicalNotesService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.create({
            encounterId: 'encounter-1',
            soap: {
                subjective: 'vomito',
                objective: 'desidratacao leve',
                assessment: 'quadro gastrico agudo',
                plan: 'fluidoterapia'
            },
            reason: 'Primeira evolucao'
        });
        expect(result.kind).toBe('created');
        expect(repo.createDraft).toHaveBeenCalledWith(expect.objectContaining({
            accountId: 'account-1',
            encounterId: 'encounter-1',
            userId: 'user-1'
        }));
        expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({
            action: 'note.create',
            entityType: 'clinical_note',
            entityId: 'note-1'
        }));
    });
    it('atualiza nota draft com versionamento e auditoria', async () => {
        const before = makeNote({
            id: 'note-2',
            status: 'draft',
            versionNumber: 1
        });
        const after = makeNote({
            id: 'note-2',
            status: 'draft',
            versionNumber: 2,
            updatedAt: new Date('2026-01-01T01:00:00.000Z')
        });
        vi.mocked(repo.findById).mockResolvedValue(before);
        vi.mocked(repo.updateDraft).mockResolvedValue(after);
        const service = createClinicalNotesService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.update('note-2', {
            soap: {
                subjective: 'melhora clinica',
                objective: 'hidratacao adequada',
                assessment: 'evolucao favoravel',
                plan: 'manter dieta'
            },
            reason: 'Ajuste de evolucao'
        });
        expect(result.kind).toBe('updated');
        expect(repo.updateDraft).toHaveBeenCalledWith(expect.objectContaining({
            accountId: 'account-1',
            noteId: 'note-2',
            reason: 'Ajuste de evolucao',
            userId: 'user-1'
        }));
        expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({
            action: 'note.update',
            entityType: 'clinical_note',
            entityId: 'note-2',
            beforeJson: before,
            afterJson: after
        }));
    });
    it('bloqueia update quando nota nao esta draft', async () => {
        vi.mocked(repo.findById).mockResolvedValue(makeNote({
            id: 'note-3',
            status: 'signed',
            signedByUserId: 'vet-9',
            signedAt: new Date('2026-01-01T02:00:00.000Z')
        }));
        const service = createClinicalNotesService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.update('note-3', {
            soap: {
                subjective: 'teste',
                objective: 'teste',
                assessment: 'teste',
                plan: 'teste'
            },
            reason: 'Nao deve editar'
        });
        expect(result.kind).toBe('note_not_editable');
        expect(repo.updateDraft).not.toHaveBeenCalled();
        expect(appendAudit).not.toHaveBeenCalled();
    });
    it('cria versao com reason obrigatoria e emite ClinicalNoteVersionCreated', async () => {
        const before = makeNote({
            id: 'note-4',
            status: 'draft',
            versionNumber: 1
        });
        const after = makeNote({
            id: 'note-4',
            status: 'draft',
            versionNumber: 2
        });
        vi.mocked(repo.findById).mockResolvedValue(before);
        vi.mocked(repo.updateDraft).mockResolvedValue(after);
        const service = createClinicalNotesService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.version('note-4', {
            soap: {
                subjective: 'evolucao positiva',
                objective: 'sem dor a palpacao',
                assessment: 'quadro estabilizado',
                plan: 'manter observacao'
            },
            reason: 'Reavaliacao de conduta'
        });
        expect(result.kind).toBe('version_created');
        if (result.kind === 'version_created') {
            expect(result.event.name).toBe('ClinicalNoteVersionCreated');
            expect(result.event.payload.reason).toBe('Reavaliacao de conduta');
            expect(result.event.payload.versionNumber).toBe(2);
        }
        expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({
            action: 'note.version',
            entityId: 'note-4'
        }));
    });
    it('assina nota draft e emite ClinicalNoteSigned', async () => {
        const before = makeNote({
            id: 'note-5',
            status: 'draft'
        });
        const after = makeNote({
            id: 'note-5',
            status: 'signed',
            signedByUserId: 'user-1',
            signedAt: new Date('2026-01-01T03:00:00.000Z')
        });
        vi.mocked(repo.findById).mockResolvedValueOnce(before);
        vi.mocked(repo.signDraftById).mockResolvedValue(after);
        const service = createClinicalNotesService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.sign('note-5');
        expect(result.kind).toBe('signed');
        if (result.kind === 'signed') {
            expect(result.event.name).toBe('ClinicalNoteSigned');
            expect(result.note.status).toBe('signed');
        }
        expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({
            action: 'note.sign',
            entityId: 'note-5'
        }));
    });
    it('nota assinada permanece readonly para update', async () => {
        vi.mocked(repo.findById).mockResolvedValue(makeNote({
            id: 'note-6',
            status: 'signed',
            signedByUserId: 'user-9',
            signedAt: new Date('2026-01-01T05:00:00.000Z')
        }));
        const service = createClinicalNotesService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.version('note-6', {
            soap: {
                subjective: 'nao deve atualizar',
                objective: 'nao deve atualizar',
                assessment: 'nao deve atualizar',
                plan: 'nao deve atualizar'
            },
            reason: 'Tentativa invalida'
        });
        expect(result.kind).toBe('note_not_editable');
        expect(repo.updateDraft).not.toHaveBeenCalled();
        expect(appendAudit).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=service.test.js.map