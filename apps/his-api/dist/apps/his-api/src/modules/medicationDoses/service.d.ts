import type { RequestContext } from '../../plugins/requestContext.js';
import { type MedicationDosesRepo } from './repo.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: MedicationDosesRepo;
};
type DueDoseItem = {
    orderId: string;
    stayId: string | null;
    encounterId: string | null;
    timezone: string;
    patient: {
        id: string;
        name: string;
    };
    medication: {
        name: string;
        doseValue: string;
        doseUnit: string;
        route: string;
        frequencyType: string;
    };
    scheduledFor: string;
    nextDueAt: string;
};
export type GetDueDosesResult = {
    now: string;
    windowMin: number;
    overdue: DueDoseItem[];
    upcoming: DueDoseItem[];
    total: number;
};
export declare function createMedicationDosesService(context: ServiceContext, dependencies?: ServiceDependencies): {
    getDue(input: {
        stayId?: string;
        windowMin: number;
    }): Promise<GetDueDosesResult>;
};
export {};
//# sourceMappingURL=service.d.ts.map