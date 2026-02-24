import type { RequestContext } from '../../plugins/requestContext.js';
import { type MedicationLogsRepo } from './repo.js';
import type { MedicationLogsResponse } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: MedicationLogsRepo;
};
export declare function createMedicationLogsService(context: ServiceContext, dependencies?: ServiceDependencies): {
    getByStay(stayId: string): Promise<MedicationLogsResponse>;
};
export {};
//# sourceMappingURL=service.d.ts.map