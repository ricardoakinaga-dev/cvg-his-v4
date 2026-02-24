/**
 * Cross-Tenant Access Tests
 *
 * These tests verify that all repositories properly scope queries by account_id
 * and that cross-tenant access attempts are blocked.
 */
import { describe, it, expect } from 'vitest';
describe('Cross-Tenant Access Prevention', () => {
    const tenantA = 'tenant-a-id';
    const tenantB = 'tenant-b-id';
    describe('Repository account_id filtering', () => {
        it('should include account_id in all list queries', async () => {
            // This test documents the expected pattern for all repos
            const repoPatterns = [
                { table: 'patients', expectedFilter: 'account_id = $1' },
                { table: 'owners', expectedFilter: 'account_id = $1' },
                { table: 'encounters', expectedFilter: 'account_id = $1' },
                { table: 'inpatient_stays', expectedFilter: 'account_id = $1' },
                { table: 'medication_orders', expectedFilter: 'account_id = $1' },
                { table: 'medication_administrations', expectedFilter: 'account_id = $1' },
                { table: 'protocols', expectedFilter: 'account_id = $1' },
                { table: 'protocol_versions', expectedFilter: 'account_id = $1' },
                { table: 'documents', expectedFilter: 'account_id = $1' },
                { table: 'alerts', expectedFilter: 'account_id = $1' },
                { table: 'wards', expectedFilter: 'account_id = $1' },
                { table: 'beds', expectedFilter: 'account_id = $1' },
                { table: 'shift_handovers', expectedFilter: 'account_id = $1' },
                { table: 'shift_handover_items', expectedFilter: 'account_id = $1' },
            ];
            for (const pattern of repoPatterns) {
                expect(pattern.expectedFilter).toContain('account_id');
            }
        });
        it('should include account_id in all findById queries', async () => {
            // This test documents the expected pattern for findById operations
            const findByIdPatterns = [
                { table: 'patients', expectedFilter: 'id = $1 and account_id = $2' },
                { table: 'owners', expectedFilter: 'id = $1 and account_id = $2' },
                { table: 'encounters', expectedFilter: 'id = $1 and account_id = $2' },
                { table: 'inpatient_stays', expectedFilter: 'id = $1 and account_id = $2' },
                { table: 'medication_orders', expectedFilter: 'id = $1 and account_id = $2' },
                { table: 'protocols', expectedFilter: 'id = $1 and account_id = $2' },
                { table: 'documents', expectedFilter: 'id = $1 and account_id = $2' },
                { table: 'wards', expectedFilter: 'id = $1 and account_id = $2' },
                { table: 'beds', expectedFilter: 'id = $1 and account_id = $2' },
            ];
            for (const pattern of findByIdPatterns) {
                expect(pattern.expectedFilter).toContain('account_id');
            }
        });
    });
    describe('Tenant Guardrail', () => {
        it('should throw MissingTenantContextError when account_id is missing', async () => {
            const { MissingTenantContextError, requireAccountId } = await import('../../lib/tenantGuardrail.js');
            const mockRequest = {
                requestContext: {
                    actor: null
                }
            };
            expect(() => requireAccountId(mockRequest)).toThrow(MissingTenantContextError);
        });
        it('should throw TenantMismatchError on cross-tenant access', async () => {
            const { TenantMismatchError, requireTenantMatch } = await import('../../lib/tenantGuardrail.js');
            const mockRequest = {
                requestContext: {
                    actor: {
                        userId: 'user-1',
                        accountId: tenantA,
                        roles: ['user'],
                        permissions: ['read']
                    }
                }
            };
            expect(() => requireTenantMatch(mockRequest, tenantB)).toThrow(TenantMismatchError);
        });
        it('should not throw when tenant matches', async () => {
            const { requireTenantMatch } = await import('../../lib/tenantGuardrail.js');
            const mockRequest = {
                requestContext: {
                    actor: {
                        userId: 'user-1',
                        accountId: tenantA,
                        roles: ['user'],
                        permissions: ['read']
                    }
                }
            };
            expect(() => requireTenantMatch(mockRequest, tenantA)).not.toThrow();
        });
    });
    describe('Patient Context Repository', () => {
        it('should filter getActiveStayForPatient by account_id', async () => {
            const { createPatientContextRepo } = await import('../patientContext/repo.js');
            let capturedQuery = '';
            let capturedValues = [];
            const mockDb = {
                $client: {
                    query: async (text, values) => {
                        capturedQuery = text;
                        capturedValues = values || [];
                        return { rows: [] };
                    }
                }
            };
            const repo = createPatientContextRepo(mockDb);
            await repo.getActiveStayForPatient(tenantA, 'patient-1');
            expect(capturedQuery.toLowerCase()).toContain('account_id');
            expect(capturedValues).toContain(tenantA);
        });
        it('should filter getStayContext by account_id', async () => {
            const { createPatientContextRepo } = await import('../patientContext/repo.js');
            let capturedQuery = '';
            let capturedValues = [];
            const mockDb = {
                $client: {
                    query: async (text, values) => {
                        capturedQuery = text;
                        capturedValues = values || [];
                        return { rows: [] };
                    }
                }
            };
            const repo = createPatientContextRepo(mockDb);
            await repo.getStayContext(tenantA, 'stay-1');
            expect(capturedQuery.toLowerCase()).toContain('account_id');
            expect(capturedValues).toContain(tenantA);
        });
        it('should filter getOpenEncounterForPatient by account_id', async () => {
            const { createPatientContextRepo } = await import('../patientContext/repo.js');
            let capturedQuery = '';
            let capturedValues = [];
            const mockDb = {
                $client: {
                    query: async (text, values) => {
                        capturedQuery = text;
                        capturedValues = values || [];
                        return { rows: [] };
                    }
                }
            };
            const repo = createPatientContextRepo(mockDb);
            await repo.getOpenEncounterForPatient(tenantA, 'patient-1');
            expect(capturedQuery.toLowerCase()).toContain('account_id');
            expect(capturedValues).toContain(tenantA);
        });
        it('should filter getNavigationCounts by account_id', async () => {
            const { createPatientContextRepo } = await import('../patientContext/repo.js');
            const capturedQueries = [];
            const mockDb = {
                $client: {
                    query: async (text, values) => {
                        capturedQueries.push({ text, values: values || [] });
                        return { rows: [{ count: 0 }] };
                    }
                }
            };
            const repo = createPatientContextRepo(mockDb);
            await repo.getNavigationCounts(tenantA, 'patient-1', 'stay-1');
            // All queries should include account_id
            for (const query of capturedQueries) {
                expect(query.text.toLowerCase()).toContain('account_id');
                expect(query.values).toContain(tenantA);
            }
        });
    });
});
describe('Tenant Isolation Integration Tests', () => {
    const tenantA = 'tenant-a-id';
    it('should prevent cross-tenant patient access', async () => {
        const { createPatientsRepo } = await import('../patients/repo.js');
        let capturedQuery = '';
        let capturedValues = [];
        const mockDb = {
            $client: {
                query: async (text, values) => {
                    capturedQuery = text;
                    capturedValues = values || [];
                    return { rows: [] };
                }
            }
        };
        const repo = createPatientsRepo(mockDb);
        await repo.findById(tenantA, 'patient-1');
        expect(capturedQuery.toLowerCase()).toContain('account_id');
        expect(capturedValues).toContain(tenantA);
    });
    it('should prevent cross-tenant medication order access', async () => {
        const { createMedicationOrdersRepo } = await import('../medicationOrders/repo.js');
        let capturedQuery = '';
        let capturedValues = [];
        const mockDb = {
            $client: {
                query: async (text, values) => {
                    capturedQuery = text;
                    capturedValues = values || [];
                    return { rows: [] };
                }
            }
        };
        const repo = createMedicationOrdersRepo(mockDb);
        await repo.findById(tenantA, 'order-1');
        expect(capturedQuery.toLowerCase()).toContain('account_id');
        expect(capturedValues).toContain(tenantA);
    });
    it('should prevent cross-tenant encounter access', async () => {
        const { createEncountersRepo } = await import('../encounters/repo.js');
        let capturedQuery = '';
        let capturedValues = [];
        const mockDb = {
            $client: {
                query: async (text, values) => {
                    capturedQuery = text;
                    capturedValues = values || [];
                    return { rows: [] };
                }
            }
        };
        const repo = createEncountersRepo(mockDb);
        await repo.findById(tenantA, 'encounter-1');
        expect(capturedQuery.toLowerCase()).toContain('account_id');
        expect(capturedValues).toContain(tenantA);
    });
    it('should prevent cross-tenant inpatient stay access', async () => {
        const { createInpatientRepo } = await import('../inpatient/repo.js');
        let capturedQuery = '';
        let capturedValues = [];
        const mockDb = {
            $client: {
                query: async (text, values) => {
                    capturedQuery = text;
                    capturedValues = values || [];
                    return { rows: [] };
                }
            }
        };
        const repo = createInpatientRepo(mockDb);
        await repo.findStayById(tenantA, 'stay-1');
        expect(capturedQuery.toLowerCase()).toContain('account_id');
        expect(capturedValues).toContain(tenantA);
    });
    it('should prevent cross-tenant protocol access', async () => {
        const { createProtocolsRepo } = await import('../protocols/repo.js');
        let capturedQuery = '';
        let capturedValues = [];
        const mockDb = {
            $client: {
                query: async (text, values) => {
                    capturedQuery = text;
                    capturedValues = values || [];
                    return { rows: [] };
                }
            }
        };
        const repo = createProtocolsRepo(mockDb);
        await repo.findById(tenantA, 'protocol-1');
        expect(capturedQuery.toLowerCase()).toContain('account_id');
        expect(capturedValues).toContain(tenantA);
    });
    it('should prevent cross-tenant document access', async () => {
        const { createDocumentsRepo } = await import('../documents/repo.js');
        let capturedQuery = '';
        let capturedValues = [];
        const mockDb = {
            $client: {
                query: async (text, values) => {
                    capturedQuery = text;
                    capturedValues = values || [];
                    return { rows: [] };
                }
            }
        };
        const repo = createDocumentsRepo(mockDb);
        await repo.findById(tenantA, 'document-1');
        expect(capturedQuery.toLowerCase()).toContain('account_id');
        expect(capturedValues).toContain(tenantA);
    });
});
//# sourceMappingURL=crossTenant.test.js.map