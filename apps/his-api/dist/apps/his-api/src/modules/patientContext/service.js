import { createPatientContextRepo } from './repo.js';
/**
 * Build navigation items for patient context
 */
function buildNavigation(patientId, stayId, encounterId, counts) {
    const nav = {};
    // MAR navigation (only if there's an active stay)
    if (stayId) {
        nav.mar = {
            id: 'mar',
            label: 'MAR',
            href: `/inpatient/mar?stayId=${stayId}`,
            icon: 'pill',
            badge: counts?.pendingAdministrations && counts.pendingAdministrations > 0
                ? String(counts.pendingAdministrations)
                : undefined,
        };
    }
    // Notes navigation
    nav.notes = {
        id: 'notes',
        label: 'Notas Clínicas',
        href: `/patients/${patientId}/record`,
        icon: 'file-text',
        badge: counts?.unsignedNotes && counts.unsignedNotes > 0
            ? String(counts.unsignedNotes)
            : undefined,
    };
    // Orders navigation
    nav.orders = {
        id: 'orders',
        label: 'Prescrições',
        href: `/patients/${patientId}/record#orders`,
        icon: 'clipboard-list',
        badge: counts?.activeOrders && counts.activeOrders > 0
            ? String(counts.activeOrders)
            : undefined,
    };
    // Record navigation
    nav.record = {
        id: 'record',
        label: 'Prontuário',
        href: `/patients/${patientId}/record`,
        icon: 'folder',
    };
    return nav;
}
export function createPatientContextService(db) {
    const repo = createPatientContextRepo(db);
    return {
        /**
         * Get full patient context by patient ID
         */
        async getPatientContext(accountId, patientId) {
            const patient = await repo.getPatientContext(accountId, patientId);
            if (!patient) {
                return null;
            }
            // Get active stay if exists
            const stay = await repo.getActiveStayForPatient(accountId, patientId);
            // Get open encounter if exists
            const encounter = await repo.getOpenEncounterForPatient(accountId, patientId);
            // Get navigation counts
            const counts = await repo.getNavigationCounts(accountId, patientId, stay?.id);
            // Build navigation
            const navigation = buildNavigation(patientId, stay?.id, encounter?.id, counts);
            return {
                patient,
                stay,
                encounter,
                navigation,
            };
        },
        /**
         * Get patient context by stay ID
         */
        async getPatientContextByStay(accountId, stayId) {
            const result = await repo.getPatientContextByStay(accountId, stayId);
            if (!result) {
                return null;
            }
            const { patient, stay } = result;
            // Get open encounter if exists
            const encounter = await repo.getOpenEncounterForPatient(accountId, patient.id);
            // Get navigation counts
            const counts = await repo.getNavigationCounts(accountId, patient.id, stay.id);
            // Build navigation
            const navigation = buildNavigation(patient.id, stay.id, encounter?.id, counts);
            return {
                patient,
                stay,
                encounter,
                navigation,
            };
        },
        /**
         * Get just the patient info (lighter weight)
         */
        async getPatientInfo(accountId, patientId) {
            return repo.getPatientContext(accountId, patientId);
        },
        /**
         * Get just the stay info
         */
        async getStayInfo(accountId, stayId) {
            return repo.getStayContext(accountId, stayId);
        },
    };
}
/**
 * Helper to extract account ID from request
 */
export function getAccountIdFromRequest(request) {
    const accountId = request.requestContext.actor?.accountId;
    if (!accountId) {
        throw new Error('Missing actor context. Provide a valid Bearer token.');
    }
    return accountId;
}
//# sourceMappingURL=service.js.map