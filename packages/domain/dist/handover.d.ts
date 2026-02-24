import { z } from 'zod';
export declare const ShiftPeriodSchema: z.ZodEnum<["day", "night", "custom"]>;
export declare const HandoverDraftItemSchema: z.ZodEffects<z.ZodObject<{
    stayId: z.ZodString;
    patient_snapshot_json: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    problems_json: z.ZodDefault<z.ZodArray<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>, "many">>;
    plan_json: z.ZodArray<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>, "many">;
    critical_meds_json: z.ZodDefault<z.ZodArray<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>, "many">>;
    alerts_json: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    pending_json: z.ZodDefault<z.ZodArray<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>, "many">>;
    escalation_json: z.ZodEffects<z.ZodObject<{
        ifWorse: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    }, "strip", z.ZodUnknown, z.objectOutputType<{
        ifWorse: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    }, z.ZodUnknown, "strip">, z.objectInputType<{
        ifWorse: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    }, z.ZodUnknown, "strip">>, z.objectOutputType<{
        ifWorse: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    }, z.ZodUnknown, "strip">, z.objectInputType<{
        ifWorse: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    }, z.ZodUnknown, "strip">>;
    notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    stayId: string;
    problems_json: (string | Record<string, unknown>)[];
    plan_json: (string | Record<string, unknown>)[];
    critical_meds_json: (string | Record<string, unknown>)[];
    alerts_json: Record<string, unknown>;
    pending_json: (string | Record<string, unknown>)[];
    escalation_json: {
        ifWorse?: string | undefined;
    } & {
        [k: string]: unknown;
    };
    notes?: string | undefined;
    patient_snapshot_json?: Record<string, unknown> | undefined;
}, {
    stayId: string;
    plan_json: (string | Record<string, unknown>)[];
    escalation_json: {
        ifWorse?: string | undefined;
    } & {
        [k: string]: unknown;
    };
    notes?: unknown;
    patient_snapshot_json?: Record<string, unknown> | undefined;
    problems_json?: (string | Record<string, unknown>)[] | undefined;
    critical_meds_json?: (string | Record<string, unknown>)[] | undefined;
    alerts_json?: Record<string, unknown> | undefined;
    pending_json?: (string | Record<string, unknown>)[] | undefined;
}>, {
    stayId: string;
    problems_json: (string | Record<string, unknown>)[];
    plan_json: (string | Record<string, unknown>)[];
    critical_meds_json: (string | Record<string, unknown>)[];
    alerts_json: Record<string, unknown>;
    pending_json: (string | Record<string, unknown>)[];
    escalation_json: {
        ifWorse?: string | undefined;
    } & {
        [k: string]: unknown;
    };
    notes?: string | undefined;
    patient_snapshot_json?: Record<string, unknown> | undefined;
}, {
    stayId: string;
    plan_json: (string | Record<string, unknown>)[];
    escalation_json: {
        ifWorse?: string | undefined;
    } & {
        [k: string]: unknown;
    };
    notes?: unknown;
    patient_snapshot_json?: Record<string, unknown> | undefined;
    problems_json?: (string | Record<string, unknown>)[] | undefined;
    critical_meds_json?: (string | Record<string, unknown>)[] | undefined;
    alerts_json?: Record<string, unknown> | undefined;
    pending_json?: (string | Record<string, unknown>)[] | undefined;
}>;
export declare const HandoverDraftSchema: z.ZodObject<{
    wardId: z.ZodString;
    shiftDate: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    shiftPeriod: z.ZodEnum<["day", "night", "custom"]>;
    items: z.ZodArray<z.ZodEffects<z.ZodObject<{
        stayId: z.ZodString;
        patient_snapshot_json: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        problems_json: z.ZodDefault<z.ZodArray<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>, "many">>;
        plan_json: z.ZodArray<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>, "many">;
        critical_meds_json: z.ZodDefault<z.ZodArray<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>, "many">>;
        alerts_json: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        pending_json: z.ZodDefault<z.ZodArray<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>, "many">>;
        escalation_json: z.ZodEffects<z.ZodObject<{
            ifWorse: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
        }, "strip", z.ZodUnknown, z.objectOutputType<{
            ifWorse: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
        }, z.ZodUnknown, "strip">, z.objectInputType<{
            ifWorse: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
        }, z.ZodUnknown, "strip">>, z.objectOutputType<{
            ifWorse: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
        }, z.ZodUnknown, "strip">, z.objectInputType<{
            ifWorse: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
        }, z.ZodUnknown, "strip">>;
        notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    }, "strip", z.ZodTypeAny, {
        stayId: string;
        problems_json: (string | Record<string, unknown>)[];
        plan_json: (string | Record<string, unknown>)[];
        critical_meds_json: (string | Record<string, unknown>)[];
        alerts_json: Record<string, unknown>;
        pending_json: (string | Record<string, unknown>)[];
        escalation_json: {
            ifWorse?: string | undefined;
        } & {
            [k: string]: unknown;
        };
        notes?: string | undefined;
        patient_snapshot_json?: Record<string, unknown> | undefined;
    }, {
        stayId: string;
        plan_json: (string | Record<string, unknown>)[];
        escalation_json: {
            ifWorse?: string | undefined;
        } & {
            [k: string]: unknown;
        };
        notes?: unknown;
        patient_snapshot_json?: Record<string, unknown> | undefined;
        problems_json?: (string | Record<string, unknown>)[] | undefined;
        critical_meds_json?: (string | Record<string, unknown>)[] | undefined;
        alerts_json?: Record<string, unknown> | undefined;
        pending_json?: (string | Record<string, unknown>)[] | undefined;
    }>, {
        stayId: string;
        problems_json: (string | Record<string, unknown>)[];
        plan_json: (string | Record<string, unknown>)[];
        critical_meds_json: (string | Record<string, unknown>)[];
        alerts_json: Record<string, unknown>;
        pending_json: (string | Record<string, unknown>)[];
        escalation_json: {
            ifWorse?: string | undefined;
        } & {
            [k: string]: unknown;
        };
        notes?: string | undefined;
        patient_snapshot_json?: Record<string, unknown> | undefined;
    }, {
        stayId: string;
        plan_json: (string | Record<string, unknown>)[];
        escalation_json: {
            ifWorse?: string | undefined;
        } & {
            [k: string]: unknown;
        };
        notes?: unknown;
        patient_snapshot_json?: Record<string, unknown> | undefined;
        problems_json?: (string | Record<string, unknown>)[] | undefined;
        critical_meds_json?: (string | Record<string, unknown>)[] | undefined;
        alerts_json?: Record<string, unknown> | undefined;
        pending_json?: (string | Record<string, unknown>)[] | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    wardId: string;
    shiftDate: string;
    shiftPeriod: "custom" | "day" | "night";
    items: {
        stayId: string;
        problems_json: (string | Record<string, unknown>)[];
        plan_json: (string | Record<string, unknown>)[];
        critical_meds_json: (string | Record<string, unknown>)[];
        alerts_json: Record<string, unknown>;
        pending_json: (string | Record<string, unknown>)[];
        escalation_json: {
            ifWorse?: string | undefined;
        } & {
            [k: string]: unknown;
        };
        notes?: string | undefined;
        patient_snapshot_json?: Record<string, unknown> | undefined;
    }[];
}, {
    wardId: string;
    shiftDate: string;
    shiftPeriod: "custom" | "day" | "night";
    items: {
        stayId: string;
        plan_json: (string | Record<string, unknown>)[];
        escalation_json: {
            ifWorse?: string | undefined;
        } & {
            [k: string]: unknown;
        };
        notes?: unknown;
        patient_snapshot_json?: Record<string, unknown> | undefined;
        problems_json?: (string | Record<string, unknown>)[] | undefined;
        critical_meds_json?: (string | Record<string, unknown>)[] | undefined;
        alerts_json?: Record<string, unknown> | undefined;
        pending_json?: (string | Record<string, unknown>)[] | undefined;
    }[];
}>;
export declare const HandoverPublishSchema: z.ZodObject<{
    handoverId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    handoverId: string;
}, {
    handoverId: string;
}>;
export type ShiftPeriod = z.infer<typeof ShiftPeriodSchema>;
export type HandoverDraftItemDto = z.infer<typeof HandoverDraftItemSchema>;
export type HandoverDraftDto = z.infer<typeof HandoverDraftSchema>;
export type HandoverPublishDto = z.infer<typeof HandoverPublishSchema>;
//# sourceMappingURL=handover.d.ts.map