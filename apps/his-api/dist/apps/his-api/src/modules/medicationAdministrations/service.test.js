import { describe, expect, it, vi } from 'vitest';
import { createMedicationAdministrationsService } from './service.js';
describe('medication administrations service', () => {
    it('creates follow-up requirement (alert) when dose is refused', async () => {
        const fakeRepo = {
            create: vi.fn(),
            list: vi.fn(),
            findByOrderAndSlot: vi.fn(),
            findOrderInAccount: vi.fn()
        };
        const dbClientParams = [];
        const mockDb = {
            $client: {
                query: vi.fn((queryString, params) => {
                    dbClientParams.push(params);
                    if (queryString.includes('insert into alerts')) {
                        return { rows: [{ id: 'fake-alert-id' }] };
                    }
                    if (queryString.includes('select mo.medication_name')) {
                        return {
                            rows: [{ medication_name: 'Aspirin', patient_name: 'John Doe' }]
                        };
                    }
                    return { rows: [] };
                })
            }
        };
        fakeRepo.create.mockResolvedValue({
            id: 'admin_1',
            accountId: 'acc1',
            stayId: 'stay_1',
            encounterId: null,
            orderId: 'order_1',
            scheduledFor: new Date('2026-02-20T10:00:00Z'),
            status: 'refused',
            delayedUntil: null,
            effectiveAt: null,
            reason: 'Paciente recusou',
            administeredByUserId: 'user_1',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        fakeRepo.findOrderInAccount.mockResolvedValue({
            id: 'order_1',
            stayId: 'stay_1',
            status: 'active'
        });
        // allow order to be active
        const requestContext = {
            actor: { accountId: 'acc1', userId: 'user1' },
            requestId: 'req_1'
        };
        // mock rules
        vi.mock('./rules.js', () => ({
            isMedicationOrderActive: () => true,
            isDuplicateMedicationAdministrationError: () => false,
            isMedicationAdministrationReasonCheckError: () => false
        }));
        const service = createMedicationAdministrationsService({ db: mockDb, requestContext: requestContext }, { repo: fakeRepo, appendAudit: vi.fn() });
        await service.record({
            stayId: 'stay_1',
            orderId: 'order_1',
            scheduledFor: '2026-02-20T10:00:00.000Z',
            status: 'refused',
            reason: 'Paciente recusou'
        });
        const alertInsertCall = mockDb.$client.query.mock.calls.find(call => call[0].includes('insert into alerts'));
        expect(alertInsertCall).toBeDefined();
        // Verify params sent to DB
        const params = alertInsertCall[1];
        // params order:  accountId, type, stayId, orderId, scheduledFor, severity, message
        expect(params[0]).toBe('acc1');
        expect(params[1]).toBe('dose_refused_needs_review');
        expect(params[2]).toBe('stay_1');
        expect(params[3]).toBe('order_1');
        expect(params[6]).toBe('Dose refused: Aspirin for John Doe');
    });
});
//# sourceMappingURL=service.test.js.map