import type { RequestContext } from '../../plugins/requestContext.js';
type DbClient = typeof import('@cvg-his/db').db;
type OwnerSummaryAuditEvent = {
    id: string;
    createdAt: string;
    action: string;
    actorRole: string | null;
    reason: string | null;
    requestId: string | null;
};
type OwnerSummary = {
    owner: {
        id: string;
        fullName: string;
        document: string | null;
        email: string | null;
        phoneMain: string | null;
        phoneAlt: string | null;
        updatedAt: Date;
    };
    auditTrail: OwnerSummaryAuditEvent[];
    encounters: [];
    documents: [];
};
export declare function getOwnerSummary(db: DbClient, requestContext: RequestContext, ownerId: string): Promise<OwnerSummary | null>;
export {};
//# sourceMappingURL=summary.d.ts.map