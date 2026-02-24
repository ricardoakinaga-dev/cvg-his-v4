import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEncountersService } from './service.js';
const fakeDb = {};
function makeEncounter(overrides = {}) {
    return {
        id: 'encounter-1',
        accountId: 'account-1',
        patientId: 'patient-1',
        ownerId: 'owner-1',
        status: 'open',
        openedByUserId: 'user-1',
        closedByUserId: null,
        openedAt: new Date('2026-01-01T00:00:00.000Z'),
        closedAt: null,
        reason: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        ...overrides
    };
}
function createRepoMock() {
    return {
        findPatientInAccount: vi.fn(async () => null),
        create: vi.fn(async () => makeEncounter()),
        findById: vi.fn(async () => null),
        closeById: vi.fn(async () => null),
        list: vi.fn(async () => ({
            data: [],
            page: 1,
            pageSize: 20,
            total: 0
        })),
        getTimeline: vi.fn(async () => null)
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
describe('encounters service', () => {
    let repo;
    let appendAudit;
    beforeEach(() => {
        repo = createRepoMock();
        appendAudit = vi.fn(async () => undefined);
    });
    it('abre encounter e registra auditoria', async () => {
        vi.mocked(repo.findPatientInAccount).mockResolvedValue({
            patientId: 'patient-1',
            ownerId: 'owner-1'
        });
        vi.mocked(repo.create).mockResolvedValue(makeEncounter());
        const service = createEncountersService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.create({
            patientId: 'patient-1',
            reason: 'Consulta inicial'
        });
        expect(result.kind).toBe('created');
        expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
            accountId: 'account-1',
            patientId: 'patient-1',
            ownerId: 'owner-1',
            openedByUserId: 'user-1',
            reason: 'Consulta inicial'
        }));
        expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({
            action: 'encounter.create',
            entityType: 'encounter',
            entityId: 'encounter-1'
        }));
    });
    it('não abre encounter para paciente de outro tenant', async () => {
        vi.mocked(repo.findPatientInAccount).mockResolvedValue(null);
        const service = createEncountersService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.create({
            patientId: 'patient-1'
        });
        expect(result).toEqual({ kind: 'patient_not_found' });
        expect(repo.create).not.toHaveBeenCalled();
        expect(appendAudit).not.toHaveBeenCalled();
    });
    it('fecha encounter aberto e registra auditoria', async () => {
        const before = makeEncounter({
            id: 'encounter-2',
            status: 'open',
            reason: null
        });
        const after = makeEncounter({
            id: 'encounter-2',
            status: 'closed',
            closedByUserId: 'user-1',
            closedAt: new Date('2026-01-01T01:00:00.000Z'),
            reason: 'Alta'
        });
        vi.mocked(repo.findById).mockResolvedValue(before);
        vi.mocked(repo.closeById).mockResolvedValue(after);
        const service = createEncountersService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.close('encounter-2', { reason: 'Alta' });
        expect(result.kind).toBe('closed');
        expect(repo.closeById).toHaveBeenCalledWith(expect.objectContaining({
            accountId: 'account-1',
            encounterId: 'encounter-2',
            closedByUserId: 'user-1',
            reason: 'Alta'
        }));
        expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({
            action: 'encounter.close',
            entityType: 'encounter',
            entityId: 'encounter-2',
            reason: 'Alta',
            beforeJson: before,
            afterJson: after
        }));
    });
    it('retorna conflito ao fechar encounter já fechado', async () => {
        vi.mocked(repo.findById).mockResolvedValue(makeEncounter({
            id: 'encounter-3',
            status: 'closed',
            closedByUserId: 'user-9',
            closedAt: new Date('2026-01-02T00:00:00.000Z')
        }));
        const service = createEncountersService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.close('encounter-3', {});
        expect(result.kind).toBe('already_closed');
        expect(repo.closeById).not.toHaveBeenCalled();
        expect(appendAudit).not.toHaveBeenCalled();
    });
    it('lista encounters sempre filtrando por account do ator', async () => {
        vi.mocked(repo.list).mockResolvedValue({
            data: [makeEncounter()],
            page: 1,
            pageSize: 20,
            total: 1
        });
        const service = createEncountersService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.list({
            patientId: 'patient-1',
            page: 1,
            pageSize: 20
        });
        expect(repo.list).toHaveBeenCalledWith({
            accountId: 'account-1',
            patientId: 'patient-1',
            page: 1,
            pageSize: 20
        });
        expect(result.total).toBe(1);
    });
    it('falha com 401 quando falta x-user-id para abrir encounter', async () => {
        const service = createEncountersService({
            db: fakeDb,
            requestContext: createRequestContext({
                actor: {
                    accountId: 'account-1',
                    roles: ['vet'],
                    permissions: []
                }
            })
        }, {
            repo,
            appendAudit
        });
        await expect(service.create({ patientId: 'patient-1' })).rejects.toMatchObject({
            statusCode: 401,
            code: 'UNAUTHORIZED'
        });
    });
    it('retorna timeline filtrada por account do ator', async () => {
        vi.mocked(repo.getTimeline).mockResolvedValue({
            encounter: makeEncounter({
                id: 'encounter-9'
            }),
            notes: [],
            versions: [],
            documents: [],
            timeline: []
        });
        const service = createEncountersService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.getTimeline('encounter-9');
        expect(repo.getTimeline).toHaveBeenCalledWith('account-1', 'encounter-9');
        expect(result?.encounter.id).toBe('encounter-9');
    });
});
//# sourceMappingURL=service.test.js.map