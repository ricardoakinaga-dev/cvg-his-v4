import type { MedicationScheduleCreateDto, MedicationScheduleUpdateDto } from '@cvg-his/domain';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type MedicationScheduleRecord, type MedicationSchedulesRepo } from './repo.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: MedicationSchedulesRepo;
};
type InvalidScheduleReason = 'interval_minutes_required' | 'fixed_times_required';
export type CreateMedicationScheduleResult = {
    kind: 'order_not_found';
} | {
    kind: 'order_stopped';
} | {
    kind: 'schedule_already_exists';
} | {
    kind: 'invalid_schedule';
    reason: InvalidScheduleReason;
} | {
    kind: 'created';
    schedule: MedicationScheduleRecord;
};
export type UpdateMedicationScheduleResult = {
    kind: 'order_not_found';
} | {
    kind: 'order_stopped';
} | {
    kind: 'schedule_not_found';
} | {
    kind: 'invalid_schedule';
    reason: InvalidScheduleReason;
} | {
    kind: 'updated';
    schedule: MedicationScheduleRecord;
};
export declare function createMedicationSchedulesService(context: ServiceContext, dependencies?: ServiceDependencies): {
    create(orderId: string, payload: Omit<MedicationScheduleCreateDto, "orderId">): Promise<CreateMedicationScheduleResult>;
    update(orderId: string, patch: MedicationScheduleUpdateDto): Promise<UpdateMedicationScheduleResult>;
};
export {};
//# sourceMappingURL=service.d.ts.map