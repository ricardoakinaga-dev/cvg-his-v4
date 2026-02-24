import { type AppendAuditInput } from '@cvg-his/audit';
import type { MedicationOrderCreateDto, MedicationOrderStopDto, MedicationOrderUpdateDto } from '@cvg-his/domain';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type MedicationOrdersRepo } from './repo.js';
import type { MedicationOrderRecord } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: MedicationOrdersRepo;
    appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};
export type CreateMedicationOrderResult = {
    kind: 'patient_not_found';
} | {
    kind: 'stay_not_found';
} | {
    kind: 'encounter_not_found';
} | {
    kind: 'patient_mismatch';
    message: string;
} | {
    kind: 'created';
    order: MedicationOrderRecord;
};
export type UpdateMedicationOrderResult = {
    kind: 'order_not_found';
} | {
    kind: 'order_stopped';
    order: MedicationOrderRecord;
} | {
    kind: 'updated';
    order: MedicationOrderRecord;
};
export type StopMedicationOrderResult = {
    kind: 'order_not_found';
} | {
    kind: 'already_stopped';
    order: MedicationOrderRecord;
} | {
    kind: 'stopped';
    order: MedicationOrderRecord;
};
export declare function createMedicationOrdersService(context: ServiceContext, dependencies?: ServiceDependencies): {
    create(input: MedicationOrderCreateDto): Promise<CreateMedicationOrderResult>;
    getById(orderId: string): Promise<MedicationOrderRecord | null>;
    list(query: {
        encounterId?: string;
        stayId?: string;
        status?: "active" | "stopped";
        page: number;
        pageSize: number;
    }): Promise<{
        data: MedicationOrderRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
    update(orderId: string, patch: MedicationOrderUpdateDto): Promise<UpdateMedicationOrderResult>;
    stop(orderId: string, input: MedicationOrderStopDto): Promise<StopMedicationOrderResult>;
};
export {};
//# sourceMappingURL=service.d.ts.map