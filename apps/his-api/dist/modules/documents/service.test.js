import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocumentsService } from './service.js';
const fakeDb = {};
function makeDocument(overrides = {}) {
    return {
        id: 'document-1',
        accountId: 'account-1',
        storageKey: 'account-1/test.pdf',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        createdByUserId: 'user-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        ...overrides
    };
}
function makeRelation(overrides = {}) {
    return {
        id: 'relation-1',
        encounterId: 'encounter-1',
        documentId: 'document-1',
        attachedByUserId: 'user-1',
        createdAt: new Date('2026-01-01T01:00:00.000Z'),
        ...overrides
    };
}
function createRepoMock() {
    return {
        create: vi.fn(async () => makeDocument()),
        findById: vi.fn(async () => null),
        encounterExistsInAccount: vi.fn(async () => false),
        attachToEncounter: vi.fn(async () => null)
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
describe('documents service', () => {
    let repo;
    let appendAudit;
    beforeEach(() => {
        repo = createRepoMock();
        appendAudit = vi.fn(async () => undefined);
    });
    it('cria documento e registra auditoria', async () => {
        vi.mocked(repo.create).mockResolvedValue(makeDocument());
        const service = createDocumentsService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const created = await service.create({
            filename: '  exame.pdf ',
            mimeType: 'application/pdf',
            size: 1234
        });
        expect(created.id).toBe('document-1');
        expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
            accountId: 'account-1',
            createdByUserId: 'user-1'
        }));
        expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({
            action: 'document.create',
            entityType: 'document',
            entityId: 'document-1'
        }));
    });
    it('retorna document_not_found quando documento nao existe no account', async () => {
        vi.mocked(repo.encounterExistsInAccount).mockResolvedValue(true);
        vi.mocked(repo.findById).mockResolvedValue(null);
        const service = createDocumentsService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.attachToEncounter('encounter-1', 'document-404');
        expect(result.kind).toBe('document_not_found');
        expect(repo.attachToEncounter).not.toHaveBeenCalled();
    });
    it('anexa documento no encounter e sinaliza duplicado quando ja anexado', async () => {
        vi.mocked(repo.encounterExistsInAccount).mockResolvedValue(true);
        vi.mocked(repo.findById).mockResolvedValue(makeDocument());
        vi.mocked(repo.attachToEncounter)
            .mockResolvedValueOnce({
            relation: makeRelation(),
            alreadyAttached: false
        })
            .mockResolvedValueOnce({
            relation: makeRelation(),
            alreadyAttached: true
        });
        const service = createDocumentsService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const first = await service.attachToEncounter('encounter-1', 'document-1');
        const second = await service.attachToEncounter('encounter-1', 'document-1');
        expect(first.kind).toBe('attached');
        if (first.kind === 'attached') {
            expect(first.alreadyAttached).toBe(false);
        }
        expect(second.kind).toBe('attached');
        if (second.kind === 'attached') {
            expect(second.alreadyAttached).toBe(true);
        }
    });
});
//# sourceMappingURL=service.test.js.map