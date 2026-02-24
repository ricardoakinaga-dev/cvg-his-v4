import { z } from 'zod';
import { MedicationOrderStatusSchema } from '@cvg-his/domain';
export declare const medicationOrderIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const listMedicationOrdersQuerySchema: z.ZodObject<{
    encounterId: z.ZodOptional<z.ZodString>;
    stayId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "stopped"]>>;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "active" | "stopped" | undefined;
    encounterId?: string | undefined;
    stayId?: string | undefined;
}, {
    status?: "active" | "stopped" | undefined;
    encounterId?: string | undefined;
    stayId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export type MedicationOrderStatus = z.infer<typeof MedicationOrderStatusSchema>;
export type MedicationOrderRecord = {
    id: string;
    accountId: string;
    encounterId: string | null;
    stayId: string | null;
    patientId: string;
    medicationName: string;
    doseValue: string;
    doseUnit: string;
    route: string;
    frequencyType: string;
    prescriptionText: string | null;
    durationValue: number | null;
    durationUnit: string | null;
    startAt: Date;
    endAt: Date | null;
    status: MedicationOrderStatus;
    stopReason: string | null;
    createdByUserId: string;
    stoppedByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
};
//# sourceMappingURL=types.d.ts.map