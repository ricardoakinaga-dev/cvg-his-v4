type DbClient = typeof import('@cvg-his/db').db;
export type AlertType = 'medication_delay' | 'dose_refused_needs_review';
export type AlertSeverity = 'low' | 'medium' | 'high';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type AlertRecord = {
    id: string;
    accountId: string;
    type: AlertType;
    stayId: string;
    orderId: string;
    scheduledFor: Date;
    severity: AlertSeverity;
    message: string;
    status: AlertStatus;
    acknowledgedAt: Date | null;
    acknowledgedByUserId: string | null;
    resolvedAt: Date | null;
    resolvedByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
};
type ListAlertsInput = {
    accountId: string;
    stayId?: string;
    type?: AlertType;
    status?: AlertStatus;
    page: number;
    pageSize: number;
};
type CreateAlertInput = {
    accountId: string;
    type: AlertType;
    stayId: string;
    orderId: string;
    scheduledFor: Date;
    severity: AlertSeverity;
    message: string;
};
type AcknowledgeAlertInput = {
    alertId: string;
    accountId: string;
    acknowledgedByUserId: string;
    notes?: string;
};
type ResolveAlertInput = {
    alertId: string;
    accountId: string;
    resolvedByUserId: string;
    notes?: string;
};
type AcknowledgeManyInput = {
    alertIds: string[];
    accountId: string;
    acknowledgedByUserId: string;
    notes?: string;
};
type ResolveManyInput = {
    alertIds: string[];
    accountId: string;
    resolvedByUserId: string;
    notes?: string;
};
export type AlertsRepo = {
    create: (input: CreateAlertInput) => Promise<AlertRecord>;
    list: (input: ListAlertsInput) => Promise<{
        data: AlertRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
    acknowledge: (input: AcknowledgeAlertInput) => Promise<AlertRecord | null>;
    resolve: (input: ResolveAlertInput) => Promise<AlertRecord | null>;
    acknowledgeMany: (input: AcknowledgeManyInput) => Promise<{
        acknowledged: string[];
        notFound: string[];
        alreadyAcknowledged: string[];
    }>;
    resolveMany: (input: ResolveManyInput) => Promise<{
        resolved: string[];
        notFound: string[];
        alreadyResolved: string[];
    }>;
};
export declare function createAlertsRepo(db: DbClient): AlertsRepo;
export {};
//# sourceMappingURL=repo.d.ts.map