import { z } from 'zod';
export declare const InpatientStayStatusSchema: z.ZodEnum<["active", "discharged", "transferred"]>;
export declare const InpatientAdmitSchema: z.ZodEffects<z.ZodObject<{
    patientId: z.ZodString;
    wardId: z.ZodString;
    bedId: z.ZodString;
    encounterId: z.ZodOptional<z.ZodString>;
    chiefComplaint: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    reason: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    planSummary: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    wardId: string;
    patientId: string;
    bedId: string;
    encounterId?: string | undefined;
    reason?: string | undefined;
    chiefComplaint?: string | undefined;
    planSummary?: string | undefined;
}, {
    wardId: string;
    patientId: string;
    bedId: string;
    encounterId?: string | undefined;
    reason?: unknown;
    chiefComplaint?: unknown;
    planSummary?: unknown;
}>, {
    wardId: string;
    patientId: string;
    bedId: string;
    encounterId?: string | undefined;
    reason?: string | undefined;
    chiefComplaint?: string | undefined;
    planSummary?: string | undefined;
}, {
    wardId: string;
    patientId: string;
    bedId: string;
    encounterId?: string | undefined;
    reason?: unknown;
    chiefComplaint?: unknown;
    planSummary?: unknown;
}>;
export declare const InpatientTransferSchema: z.ZodObject<{
    toWardId: z.ZodString;
    toBedId: z.ZodString;
    reason: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    toWardId: string;
    toBedId: string;
    reason?: string | undefined;
}, {
    toWardId: string;
    toBedId: string;
    reason?: unknown;
}>;
export declare const InpatientDischargeSchema: z.ZodObject<{
    reason: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export type InpatientStayStatus = z.infer<typeof InpatientStayStatusSchema>;
export type InpatientAdmitDto = z.infer<typeof InpatientAdmitSchema>;
export type InpatientTransferDto = z.infer<typeof InpatientTransferSchema>;
export type InpatientDischargeDto = z.infer<typeof InpatientDischargeSchema>;
//# sourceMappingURL=inpatient.d.ts.map