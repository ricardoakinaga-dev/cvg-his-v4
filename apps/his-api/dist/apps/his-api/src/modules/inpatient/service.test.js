import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseOrThrow422, InpatientDischargeSchema } from '@cvg-his/domain';
import { createInpatientService } from './service.js';
const fakeDb = {};
function makeStay(overrides = {}) {
    return {
        id: 'fdd8c156-b52d-4117-a5e1-73dd61474ef1',
        accountId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef2',
        patientId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef3',
        ownerId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef4',
        encounterId: null,
        wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
        bedId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef6',
        status: 'active',
        admittedAt: new Date('2026-02-17T00:00:00.000Z'),
        dischargedAt: null,
        admittedByUserId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef7',
        dischargedByUserId: null,
        chiefComplaint: 'Dor',
        reason: 'Observacao',
        planSummary: 'Plano inicial',
        createdAt: new Date('2026-02-17T00:00:00.000Z'),
        updatedAt: new Date('2026-02-17T00:00:00.000Z'),
        ...overrides
    };
}
function createRepoMock() {
    return {
        findPatientInAccount: vi.fn(async () => null),
        wardExistsInAccount: vi.fn(async () => false),
        findBedInAccount: vi.fn(async () => null),
        hasActiveStayInBed: vi.fn(async () => false),
        admit: vi.fn(async () => makeStay()),
        findStayById: vi.fn(async () => null),
        transfer: vi.fn(async () => null),
        discharge: vi.fn(async () => null),
        list: vi.fn(async () => ({
            data: [],
            page: 1,
            pageSize: 20,
            total: 0
        }))
    };
}
function createRequestContext(overrides = {}) {
    return {
        requestId: 'req-1',
        actor: {
            accountId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef2',
            userId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef7',
            role: 'admin',
            roles: ['admin'],
            permissions: []
        },
        ...overrides
    };
}
describe('inpatient service', () => {
    let repo;
    let appendAudit;
    beforeEach(() => {
        repo = createRepoMock();
        appendAudit = vi.fn(async () => undefined);
    });
    it('admite em leito livre e audita evento', async () => {
        vi.mocked(repo.findPatientInAccount).mockResolvedValue({
            patientId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef3',
            ownerId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef4'
        });
        vi.mocked(repo.wardExistsInAccount).mockResolvedValue(true);
        vi.mocked(repo.findBedInAccount).mockResolvedValue({
            bedId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef6',
            wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
            isActive: true
        });
        vi.mocked(repo.hasActiveStayInBed).mockResolvedValue(false);
        vi.mocked(repo.admit).mockResolvedValue(makeStay());
        const service = createInpatientService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.admit({
            patientId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef3',
            wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
            bedId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef6',
            reason: 'Internacao inicial'
        });
        expect(result.kind).toBe('admitted');
        expect(repo.admit).toHaveBeenCalledWith(expect.objectContaining({
            accountId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef2',
            admittedByUserId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef7'
        }));
        expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({
            action: 'InpatientAdmitted',
            entityType: 'inpatient_stay'
        }));
    });
    it('retorna conflito ao admitir no mesmo bed ocupado', async () => {
        vi.mocked(repo.findPatientInAccount).mockResolvedValue({
            patientId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef3',
            ownerId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef4'
        });
        vi.mocked(repo.wardExistsInAccount).mockResolvedValue(true);
        vi.mocked(repo.findBedInAccount).mockResolvedValue({
            bedId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef6',
            wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
            isActive: true
        });
        vi.mocked(repo.hasActiveStayInBed).mockResolvedValue(true);
        const service = createInpatientService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.admit({
            patientId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef3',
            wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
            bedId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef6',
            reason: 'Reinternacao'
        });
        expect(result).toEqual({ kind: 'bed_occupied' });
        expect(repo.admit).not.toHaveBeenCalled();
        expect(appendAudit).not.toHaveBeenCalled();
    });
    it('retorna conflito ao transferir para bed ocupado', async () => {
        const currentStay = makeStay({
            id: 'fdd8c156-b52d-4117-a5e1-73dd61474ef8'
        });
        vi.mocked(repo.findStayById).mockResolvedValue(currentStay);
        vi.mocked(repo.wardExistsInAccount).mockResolvedValue(true);
        vi.mocked(repo.findBedInAccount).mockResolvedValue({
            bedId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
            wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474efa',
            isActive: true
        });
        vi.mocked(repo.hasActiveStayInBed).mockResolvedValue(true);
        const service = createInpatientService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.transfer('fdd8c156-b52d-4117-a5e1-73dd61474ef8', {
            toWardId: 'fdd8c156-b52d-4117-a5e1-73dd61474efa',
            toBedId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
            reason: 'Mudanca de ala'
        });
        expect(result).toEqual({ kind: 'bed_occupied' });
        expect(repo.transfer).not.toHaveBeenCalled();
        expect(appendAudit).not.toHaveBeenCalled();
    });
    it('transfere stay ativo e registra auditoria', async () => {
        const before = makeStay({
            id: 'fdd8c156-b52d-4117-a5e1-73dd61474ef8',
            wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
            bedId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef6'
        });
        const after = makeStay({
            id: 'fdd8c156-b52d-4117-a5e1-73dd61474ef8',
            wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474efa',
            bedId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9'
        });
        vi.mocked(repo.findStayById).mockResolvedValue(before);
        vi.mocked(repo.wardExistsInAccount).mockResolvedValue(true);
        vi.mocked(repo.findBedInAccount).mockResolvedValue({
            bedId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
            wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474efa',
            isActive: true
        });
        vi.mocked(repo.hasActiveStayInBed).mockResolvedValue(false);
        vi.mocked(repo.transfer).mockResolvedValue(after);
        const service = createInpatientService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.transfer('fdd8c156-b52d-4117-a5e1-73dd61474ef8', {
            toWardId: 'fdd8c156-b52d-4117-a5e1-73dd61474efa',
            toBedId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
            reason: 'Transferencia assistida'
        });
        expect(result.kind).toBe('transferred');
        expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({
            action: 'InpatientTransferred',
            entityType: 'inpatient_stay',
            entityId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef8',
            beforeJson: before,
            afterJson: after
        }));
    });
    it('dá alta de stay ativo e registra auditoria', async () => {
        const before = makeStay({
            id: 'fdd8c156-b52d-4117-a5e1-73dd61474ef8',
            status: 'active'
        });
        const after = makeStay({
            id: 'fdd8c156-b52d-4117-a5e1-73dd61474ef8',
            status: 'discharged',
            dischargedByUserId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef7',
            dischargedAt: new Date('2026-02-17T10:00:00.000Z'),
            reason: 'Estavel para alta'
        });
        vi.mocked(repo.findStayById).mockResolvedValue(before);
        vi.mocked(repo.discharge).mockResolvedValue(after);
        const service = createInpatientService({
            db: fakeDb,
            requestContext: createRequestContext()
        }, {
            repo,
            appendAudit
        });
        const result = await service.discharge('fdd8c156-b52d-4117-a5e1-73dd61474ef8', {
            reason: 'Estavel para alta'
        });
        expect(result.kind).toBe('discharged');
        expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({
            action: 'InpatientDischarged',
            entityType: 'inpatient_stay',
            entityId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef8',
            beforeJson: before,
            afterJson: after
        }));
    });
    it('exige motivo de alta no contrato (422)', () => {
        expect(() => parseOrThrow422(InpatientDischargeSchema, { reason: '   ' })).toThrow();
    });
});
//# sourceMappingURL=service.test.js.map