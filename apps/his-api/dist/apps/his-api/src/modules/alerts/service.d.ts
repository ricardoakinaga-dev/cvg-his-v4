import type { MedicationOverdueScanEnqueueResult, MedicationOverdueScanJobData } from '../../lib/queues.js';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type AlertType, type AlertsRepo, type AlertRecord } from './repo.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: AlertsRepo;
    enqueueMedicationOverdueScan?: (payload: MedicationOverdueScanJobData) => Promise<MedicationOverdueScanEnqueueResult>;
};
export declare function createAlertsService(context: ServiceContext, dependencies?: ServiceDependencies): {
    list(query: {
        stayId?: string;
        type?: AlertType;
        page: number;
        pageSize: number;
    }): Promise<{
        data: AlertRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
    enqueueOverdueScan(input: {
        graceMinutes?: number;
    }): Promise<MedicationOverdueScanEnqueueResult>;
    /**
     * Acknowledge an alert - confirms that a clinician has seen the alert
     */
    acknowledge(alertId: string, notes?: string): Promise<AlertRecord | null>;
    /**
     * Resolve an alert - marks the alert as resolved after action taken
     */
    resolve(alertId: string, notes?: string): Promise<AlertRecord | null>;
    /**
     * Acknowledge multiple alerts at once
     */
    acknowledgeMany(alertIds: string[], notes?: string): Promise<{
        acknowledged: string[];
        notFound: string[];
        alreadyAcknowledged: string[];
    }>;
    /**
     * Resolve multiple alerts at once
     */
    resolveMany(alertIds: string[], notes?: string): Promise<{
        resolved: string[];
        notFound: string[];
        alreadyResolved: string[];
    }>;
};
export {};
//# sourceMappingURL=service.d.ts.map