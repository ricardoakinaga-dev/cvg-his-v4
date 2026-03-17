import type { AlertDto } from '@cvg-his/domain';
import type { RequestContext } from '../../plugins/requestContext.js';
type DbClient = typeof import('@cvg-his/db').db;
type PatientSummaryAuditEvent = {
    id: string;
    createdAt: string;
    action: string;
    actorRole: string | null;
    reason: string | null;
    requestId: string | null;
};
type HighlightedAlerts = {
    aggressive: boolean;
    allergiesCount: number;
    anesthesiaRisk: 'low' | 'medium' | 'high' | null;
    chronicConditionsCount: number;
    hasNotes: boolean;
};
type PatientSummary = {
    patient: {
        id: string;
        ownerId: string;
        name: string;
        species: string;
        microchip: string | null;
        alerts: AlertDto;
        highlightedAlerts: HighlightedAlerts;
        updatedAt: Date;
    };
    auditTrail: PatientSummaryAuditEvent[];
    encounters: [];
    documents: [];
};
export declare function getPatientSummary(db: DbClient, requestContext: RequestContext, patientId: string): Promise<PatientSummary | null>;
export {};
//# sourceMappingURL=summary.d.ts.map