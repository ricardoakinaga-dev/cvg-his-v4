import { append } from '@cvg-his/audit';
import type { InpatientAdmitDto, InpatientDischargeDto, InpatientTransferDto } from '@cvg-his/domain';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type InpatientRepo, type InpatientStayRecord } from './repo.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: InpatientRepo;
    appendAudit?: typeof append;
};
export type AdmitResult = {
    kind: 'patient_not_found';
} | {
    kind: 'ward_not_found';
} | {
    kind: 'bed_not_found';
} | {
    kind: 'bed_inactive';
} | {
    kind: 'bed_ward_mismatch';
} | {
    kind: 'bed_occupied';
} | {
    kind: 'admitted';
    stay: InpatientStayRecord;
};
export type TransferResult = {
    kind: 'stay_not_found';
} | {
    kind: 'stay_not_active';
    stay: InpatientStayRecord;
} | {
    kind: 'ward_not_found';
} | {
    kind: 'bed_not_found';
} | {
    kind: 'bed_inactive';
} | {
    kind: 'bed_ward_mismatch';
} | {
    kind: 'bed_occupied';
} | {
    kind: 'transferred';
    stay: InpatientStayRecord;
};
export type DischargeResult = {
    kind: 'stay_not_found';
} | {
    kind: 'stay_not_active';
    stay: InpatientStayRecord;
} | {
    kind: 'discharged';
    stay: InpatientStayRecord;
};
export declare function createInpatientService(context: ServiceContext, dependencies?: ServiceDependencies): {
    admit(input: InpatientAdmitDto): Promise<AdmitResult>;
    transfer(stayId: string, input: InpatientTransferDto): Promise<TransferResult>;
    discharge(stayId: string, input: InpatientDischargeDto): Promise<DischargeResult>;
    getById(stayId: string): Promise<InpatientStayRecord | null>;
    list(query: {
        page: number;
        pageSize: number;
        status?: InpatientStayStatus;
        wardId?: string;
    }): Promise<{
        data: InpatientStayRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
};
export {};
//# sourceMappingURL=service.d.ts.map