import { z } from 'zod';
export declare const MedicationRouteSchema: z.ZodEnum<["IV", "IM", "VO", "SC", "TOP", "INH", "SL", "RECTAL", "OTIC", "OPHTHALMIC", "OTHER"]>;
export declare const MedicationFrequencyTypeSchema: z.ZodEnum<["q8h", "q12h", "sid", "bid", "tid", "custom"]>;
export declare const MedicationOrderStatusSchema: z.ZodEnum<["active", "stopped"]>;
export declare const MedicationScheduleTypeSchema: z.ZodEnum<["interval", "fixed_times"]>;
export declare const MedicationAdministrationStatusSchema: z.ZodEnum<["administered", "refused", "delayed", "held"]>;
export declare const MedicationOrderCreateSchemaBase: z.ZodObject<{
    patientId: z.ZodString;
    stayId: z.ZodOptional<z.ZodString>;
    encounterId: z.ZodOptional<z.ZodString>;
    medicationName: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    doseValue: z.ZodNumber;
    doseUnit: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    route: z.ZodEnum<["IV", "IM", "VO", "SC", "TOP", "INH", "SL", "RECTAL", "OTIC", "OPHTHALMIC", "OTHER"]>;
    frequencyType: z.ZodEnum<["q8h", "q12h", "sid", "bid", "tid", "custom"]>;
    prescriptionText: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    startAt: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    endAt: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    durationValue: z.ZodEffects<z.ZodOptional<z.ZodNumber>, number | undefined, unknown>;
    durationUnit: z.ZodOptional<z.ZodEnum<["days", "hours"]>>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    medicationName: string;
    doseValue: number;
    doseUnit: string;
    route: "IV" | "IM" | "VO" | "SC" | "TOP" | "INH" | "SL" | "RECTAL" | "OTIC" | "OPHTHALMIC" | "OTHER";
    frequencyType: "custom" | "q8h" | "q12h" | "sid" | "bid" | "tid";
    startAt: string;
    encounterId?: string | undefined;
    stayId?: string | undefined;
    prescriptionText?: string | undefined;
    endAt?: string | undefined;
    durationValue?: number | undefined;
    durationUnit?: "days" | "hours" | undefined;
}, {
    patientId: string;
    medicationName: string;
    doseValue: number;
    doseUnit: string;
    route: "IV" | "IM" | "VO" | "SC" | "TOP" | "INH" | "SL" | "RECTAL" | "OTIC" | "OPHTHALMIC" | "OTHER";
    frequencyType: "custom" | "q8h" | "q12h" | "sid" | "bid" | "tid";
    startAt: string;
    encounterId?: string | undefined;
    stayId?: string | undefined;
    prescriptionText?: unknown;
    endAt?: string | undefined;
    durationValue?: unknown;
    durationUnit?: "days" | "hours" | undefined;
}>;
export declare const MedicationOrderCreateSchema: z.ZodEffects<z.ZodObject<{
    patientId: z.ZodString;
    stayId: z.ZodOptional<z.ZodString>;
    encounterId: z.ZodOptional<z.ZodString>;
    medicationName: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    doseValue: z.ZodNumber;
    doseUnit: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    route: z.ZodEnum<["IV", "IM", "VO", "SC", "TOP", "INH", "SL", "RECTAL", "OTIC", "OPHTHALMIC", "OTHER"]>;
    frequencyType: z.ZodEnum<["q8h", "q12h", "sid", "bid", "tid", "custom"]>;
    prescriptionText: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    startAt: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    endAt: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    durationValue: z.ZodEffects<z.ZodOptional<z.ZodNumber>, number | undefined, unknown>;
    durationUnit: z.ZodOptional<z.ZodEnum<["days", "hours"]>>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    medicationName: string;
    doseValue: number;
    doseUnit: string;
    route: "IV" | "IM" | "VO" | "SC" | "TOP" | "INH" | "SL" | "RECTAL" | "OTIC" | "OPHTHALMIC" | "OTHER";
    frequencyType: "custom" | "q8h" | "q12h" | "sid" | "bid" | "tid";
    startAt: string;
    encounterId?: string | undefined;
    stayId?: string | undefined;
    prescriptionText?: string | undefined;
    endAt?: string | undefined;
    durationValue?: number | undefined;
    durationUnit?: "days" | "hours" | undefined;
}, {
    patientId: string;
    medicationName: string;
    doseValue: number;
    doseUnit: string;
    route: "IV" | "IM" | "VO" | "SC" | "TOP" | "INH" | "SL" | "RECTAL" | "OTIC" | "OPHTHALMIC" | "OTHER";
    frequencyType: "custom" | "q8h" | "q12h" | "sid" | "bid" | "tid";
    startAt: string;
    encounterId?: string | undefined;
    stayId?: string | undefined;
    prescriptionText?: unknown;
    endAt?: string | undefined;
    durationValue?: unknown;
    durationUnit?: "days" | "hours" | undefined;
}>, {
    patientId: string;
    medicationName: string;
    doseValue: number;
    doseUnit: string;
    route: "IV" | "IM" | "VO" | "SC" | "TOP" | "INH" | "SL" | "RECTAL" | "OTIC" | "OPHTHALMIC" | "OTHER";
    frequencyType: "custom" | "q8h" | "q12h" | "sid" | "bid" | "tid";
    startAt: string;
    encounterId?: string | undefined;
    stayId?: string | undefined;
    prescriptionText?: string | undefined;
    endAt?: string | undefined;
    durationValue?: number | undefined;
    durationUnit?: "days" | "hours" | undefined;
}, {
    patientId: string;
    medicationName: string;
    doseValue: number;
    doseUnit: string;
    route: "IV" | "IM" | "VO" | "SC" | "TOP" | "INH" | "SL" | "RECTAL" | "OTIC" | "OPHTHALMIC" | "OTHER";
    frequencyType: "custom" | "q8h" | "q12h" | "sid" | "bid" | "tid";
    startAt: string;
    encounterId?: string | undefined;
    stayId?: string | undefined;
    prescriptionText?: unknown;
    endAt?: string | undefined;
    durationValue?: unknown;
    durationUnit?: "days" | "hours" | undefined;
}>;
export declare const MedicationOrderUpdateSchemaBase: z.ZodObject<{
    doseValue: z.ZodEffects<z.ZodOptional<z.ZodNumber>, number | undefined, unknown>;
    doseUnit: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    route: z.ZodOptional<z.ZodEnum<["IV", "IM", "VO", "SC", "TOP", "INH", "SL", "RECTAL", "OTIC", "OPHTHALMIC", "OTHER"]>>;
    frequencyType: z.ZodOptional<z.ZodEnum<["q8h", "q12h", "sid", "bid", "tid", "custom"]>>;
    prescriptionText: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | null | undefined, unknown>;
    endAt: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    durationValue: z.ZodEffects<z.ZodOptional<z.ZodNumber>, number | undefined, unknown>;
    durationUnit: z.ZodOptional<z.ZodEnum<["days", "hours"]>>;
}, "strip", z.ZodTypeAny, {
    doseValue?: number | undefined;
    doseUnit?: string | undefined;
    route?: "IV" | "IM" | "VO" | "SC" | "TOP" | "INH" | "SL" | "RECTAL" | "OTIC" | "OPHTHALMIC" | "OTHER" | undefined;
    frequencyType?: "custom" | "q8h" | "q12h" | "sid" | "bid" | "tid" | undefined;
    prescriptionText?: string | null | undefined;
    endAt?: string | undefined;
    durationValue?: number | undefined;
    durationUnit?: "days" | "hours" | undefined;
}, {
    doseValue?: unknown;
    doseUnit?: string | undefined;
    route?: "IV" | "IM" | "VO" | "SC" | "TOP" | "INH" | "SL" | "RECTAL" | "OTIC" | "OPHTHALMIC" | "OTHER" | undefined;
    frequencyType?: "custom" | "q8h" | "q12h" | "sid" | "bid" | "tid" | undefined;
    prescriptionText?: unknown;
    endAt?: string | undefined;
    durationValue?: unknown;
    durationUnit?: "days" | "hours" | undefined;
}>;
export declare const MedicationOrderUpdateSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    doseValue: z.ZodEffects<z.ZodOptional<z.ZodNumber>, number | undefined, unknown>;
    doseUnit: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    route: z.ZodOptional<z.ZodEnum<["IV", "IM", "VO", "SC", "TOP", "INH", "SL", "RECTAL", "OTIC", "OPHTHALMIC", "OTHER"]>>;
    frequencyType: z.ZodOptional<z.ZodEnum<["q8h", "q12h", "sid", "bid", "tid", "custom"]>>;
    prescriptionText: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | null | undefined, unknown>;
    endAt: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    durationValue: z.ZodEffects<z.ZodOptional<z.ZodNumber>, number | undefined, unknown>;
    durationUnit: z.ZodOptional<z.ZodEnum<["days", "hours"]>>;
}, "strip", z.ZodTypeAny, {
    doseValue?: number | undefined;
    doseUnit?: string | undefined;
    route?: "IV" | "IM" | "VO" | "SC" | "TOP" | "INH" | "SL" | "RECTAL" | "OTIC" | "OPHTHALMIC" | "OTHER" | undefined;
    frequencyType?: "custom" | "q8h" | "q12h" | "sid" | "bid" | "tid" | undefined;
    prescriptionText?: string | null | undefined;
    endAt?: string | undefined;
    durationValue?: number | undefined;
    durationUnit?: "days" | "hours" | undefined;
}, {
    doseValue?: unknown;
    doseUnit?: string | undefined;
    route?: "IV" | "IM" | "VO" | "SC" | "TOP" | "INH" | "SL" | "RECTAL" | "OTIC" | "OPHTHALMIC" | "OTHER" | undefined;
    frequencyType?: "custom" | "q8h" | "q12h" | "sid" | "bid" | "tid" | undefined;
    prescriptionText?: unknown;
    endAt?: string | undefined;
    durationValue?: unknown;
    durationUnit?: "days" | "hours" | undefined;
}>, {
    doseValue?: number | undefined;
    doseUnit?: string | undefined;
    route?: "IV" | "IM" | "VO" | "SC" | "TOP" | "INH" | "SL" | "RECTAL" | "OTIC" | "OPHTHALMIC" | "OTHER" | undefined;
    frequencyType?: "custom" | "q8h" | "q12h" | "sid" | "bid" | "tid" | undefined;
    prescriptionText?: string | null | undefined;
    endAt?: string | undefined;
    durationValue?: number | undefined;
    durationUnit?: "days" | "hours" | undefined;
}, {
    doseValue?: unknown;
    doseUnit?: string | undefined;
    route?: "IV" | "IM" | "VO" | "SC" | "TOP" | "INH" | "SL" | "RECTAL" | "OTIC" | "OPHTHALMIC" | "OTHER" | undefined;
    frequencyType?: "custom" | "q8h" | "q12h" | "sid" | "bid" | "tid" | undefined;
    prescriptionText?: unknown;
    endAt?: string | undefined;
    durationValue?: unknown;
    durationUnit?: "days" | "hours" | undefined;
}>, {
    doseValue?: number | undefined;
    doseUnit?: string | undefined;
    route?: "IV" | "IM" | "VO" | "SC" | "TOP" | "INH" | "SL" | "RECTAL" | "OTIC" | "OPHTHALMIC" | "OTHER" | undefined;
    frequencyType?: "custom" | "q8h" | "q12h" | "sid" | "bid" | "tid" | undefined;
    prescriptionText?: string | null | undefined;
    endAt?: string | undefined;
    durationValue?: number | undefined;
    durationUnit?: "days" | "hours" | undefined;
}, {
    doseValue?: unknown;
    doseUnit?: string | undefined;
    route?: "IV" | "IM" | "VO" | "SC" | "TOP" | "INH" | "SL" | "RECTAL" | "OTIC" | "OPHTHALMIC" | "OTHER" | undefined;
    frequencyType?: "custom" | "q8h" | "q12h" | "sid" | "bid" | "tid" | undefined;
    prescriptionText?: unknown;
    endAt?: string | undefined;
    durationValue?: unknown;
    durationUnit?: "days" | "hours" | undefined;
}>;
export declare const MedicationOrderStopSchema: z.ZodObject<{
    stopReason: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
}, "strip", z.ZodTypeAny, {
    stopReason: string;
}, {
    stopReason: string;
}>;
export declare const MedicationOrderReadSchema: z.ZodObject<{
    id: z.ZodString;
    accountId: z.ZodString;
    encounterId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    stayId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    patientId: z.ZodString;
    medicationName: z.ZodString;
    doseValue: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    doseUnit: z.ZodString;
    route: z.ZodEnum<["IV", "IM", "VO", "SC", "TOP", "INH", "SL", "RECTAL", "OTIC", "OPHTHALMIC", "OTHER"]>;
    frequencyType: z.ZodEnum<["q8h", "q12h", "sid", "bid", "tid", "custom"]>;
    prescriptionText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    durationValue: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    durationUnit: z.ZodOptional<z.ZodNullable<z.ZodEnum<["days", "hours"]>>>;
    startAt: z.ZodDate;
    endAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    status: z.ZodEnum<["active", "stopped"]>;
    stopReason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdByUserId: z.ZodString;
    stoppedByUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status: "active" | "stopped";
    id: string;
    accountId: string;
    createdAt: Date;
    updatedAt: Date;
    patientId: string;
    medicationName: string;
    doseValue: string | number;
    doseUnit: string;
    route: "IV" | "IM" | "VO" | "SC" | "TOP" | "INH" | "SL" | "RECTAL" | "OTIC" | "OPHTHALMIC" | "OTHER";
    frequencyType: "custom" | "q8h" | "q12h" | "sid" | "bid" | "tid";
    startAt: Date;
    createdByUserId: string;
    encounterId?: string | null | undefined;
    stayId?: string | null | undefined;
    prescriptionText?: string | null | undefined;
    endAt?: Date | null | undefined;
    durationValue?: number | null | undefined;
    durationUnit?: "days" | "hours" | null | undefined;
    stopReason?: string | null | undefined;
    stoppedByUserId?: string | null | undefined;
}, {
    status: "active" | "stopped";
    id: string;
    accountId: string;
    createdAt: Date;
    updatedAt: Date;
    patientId: string;
    medicationName: string;
    doseValue: string | number;
    doseUnit: string;
    route: "IV" | "IM" | "VO" | "SC" | "TOP" | "INH" | "SL" | "RECTAL" | "OTIC" | "OPHTHALMIC" | "OTHER";
    frequencyType: "custom" | "q8h" | "q12h" | "sid" | "bid" | "tid";
    startAt: Date;
    createdByUserId: string;
    encounterId?: string | null | undefined;
    stayId?: string | null | undefined;
    prescriptionText?: string | null | undefined;
    endAt?: Date | null | undefined;
    durationValue?: number | null | undefined;
    durationUnit?: "days" | "hours" | null | undefined;
    stopReason?: string | null | undefined;
    stoppedByUserId?: string | null | undefined;
}>;
export declare const MedicationScheduleCreateSchemaBase: z.ZodObject<{
    orderId: z.ZodString;
    scheduleType: z.ZodEnum<["interval", "fixed_times"]>;
    intervalMinutes: z.ZodEffects<z.ZodOptional<z.ZodNumber>, number | undefined, unknown>;
    times: z.ZodOptional<z.ZodArray<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, "many">>;
    nextDueAt: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    orderId: string;
    scheduleType: "interval" | "fixed_times";
    intervalMinutes?: number | undefined;
    times?: string[] | undefined;
    nextDueAt?: string | undefined;
}, {
    orderId: string;
    scheduleType: "interval" | "fixed_times";
    intervalMinutes?: unknown;
    times?: string[] | undefined;
    nextDueAt?: string | undefined;
}>;
export declare const MedicationScheduleCreateSchema: z.ZodEffects<z.ZodObject<{
    orderId: z.ZodString;
    scheduleType: z.ZodEnum<["interval", "fixed_times"]>;
    intervalMinutes: z.ZodEffects<z.ZodOptional<z.ZodNumber>, number | undefined, unknown>;
    times: z.ZodOptional<z.ZodArray<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, "many">>;
    nextDueAt: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    orderId: string;
    scheduleType: "interval" | "fixed_times";
    intervalMinutes?: number | undefined;
    times?: string[] | undefined;
    nextDueAt?: string | undefined;
}, {
    orderId: string;
    scheduleType: "interval" | "fixed_times";
    intervalMinutes?: unknown;
    times?: string[] | undefined;
    nextDueAt?: string | undefined;
}>, {
    orderId: string;
    scheduleType: "interval" | "fixed_times";
    intervalMinutes?: number | undefined;
    times?: string[] | undefined;
    nextDueAt?: string | undefined;
}, {
    orderId: string;
    scheduleType: "interval" | "fixed_times";
    intervalMinutes?: unknown;
    times?: string[] | undefined;
    nextDueAt?: string | undefined;
}>;
export declare const MedicationScheduleUpdateSchemaBase: z.ZodObject<{
    scheduleType: z.ZodOptional<z.ZodEnum<["interval", "fixed_times"]>>;
    intervalMinutes: z.ZodEffects<z.ZodOptional<z.ZodNumber>, number | undefined, unknown>;
    times: z.ZodOptional<z.ZodArray<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, "many">>;
    nextDueAt: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    scheduleType?: "interval" | "fixed_times" | undefined;
    intervalMinutes?: number | undefined;
    times?: string[] | undefined;
    nextDueAt?: string | undefined;
}, {
    scheduleType?: "interval" | "fixed_times" | undefined;
    intervalMinutes?: unknown;
    times?: string[] | undefined;
    nextDueAt?: string | undefined;
}>;
export declare const MedicationScheduleUpdateSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    scheduleType: z.ZodOptional<z.ZodEnum<["interval", "fixed_times"]>>;
    intervalMinutes: z.ZodEffects<z.ZodOptional<z.ZodNumber>, number | undefined, unknown>;
    times: z.ZodOptional<z.ZodArray<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, "many">>;
    nextDueAt: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    scheduleType?: "interval" | "fixed_times" | undefined;
    intervalMinutes?: number | undefined;
    times?: string[] | undefined;
    nextDueAt?: string | undefined;
}, {
    scheduleType?: "interval" | "fixed_times" | undefined;
    intervalMinutes?: unknown;
    times?: string[] | undefined;
    nextDueAt?: string | undefined;
}>, {
    scheduleType?: "interval" | "fixed_times" | undefined;
    intervalMinutes?: number | undefined;
    times?: string[] | undefined;
    nextDueAt?: string | undefined;
}, {
    scheduleType?: "interval" | "fixed_times" | undefined;
    intervalMinutes?: unknown;
    times?: string[] | undefined;
    nextDueAt?: string | undefined;
}>, {
    scheduleType?: "interval" | "fixed_times" | undefined;
    intervalMinutes?: number | undefined;
    times?: string[] | undefined;
    nextDueAt?: string | undefined;
}, {
    scheduleType?: "interval" | "fixed_times" | undefined;
    intervalMinutes?: unknown;
    times?: string[] | undefined;
    nextDueAt?: string | undefined;
}>;
export declare const MedicationAdministrationCreateSchemaBase: z.ZodObject<{
    orderId: z.ZodString;
    stayId: z.ZodOptional<z.ZodString>;
    encounterId: z.ZodOptional<z.ZodString>;
    scheduledFor: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    effectiveAt: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    delayedUntil: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    status: z.ZodEnum<["administered", "refused", "delayed", "held"]>;
    reason: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    status: "administered" | "delayed" | "refused" | "held";
    scheduledFor: string;
    orderId: string;
    encounterId?: string | undefined;
    reason?: string | undefined;
    delayedUntil?: string | undefined;
    stayId?: string | undefined;
    effectiveAt?: string | undefined;
}, {
    status: "administered" | "delayed" | "refused" | "held";
    scheduledFor: string;
    orderId: string;
    encounterId?: string | undefined;
    reason?: unknown;
    delayedUntil?: string | undefined;
    stayId?: string | undefined;
    effectiveAt?: string | undefined;
}>;
export declare const MedicationAdministrationCreateSchema: z.ZodEffects<z.ZodObject<{
    orderId: z.ZodString;
    stayId: z.ZodOptional<z.ZodString>;
    encounterId: z.ZodOptional<z.ZodString>;
    scheduledFor: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    effectiveAt: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    delayedUntil: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    status: z.ZodEnum<["administered", "refused", "delayed", "held"]>;
    reason: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    status: "administered" | "delayed" | "refused" | "held";
    scheduledFor: string;
    orderId: string;
    encounterId?: string | undefined;
    reason?: string | undefined;
    delayedUntil?: string | undefined;
    stayId?: string | undefined;
    effectiveAt?: string | undefined;
}, {
    status: "administered" | "delayed" | "refused" | "held";
    scheduledFor: string;
    orderId: string;
    encounterId?: string | undefined;
    reason?: unknown;
    delayedUntil?: string | undefined;
    stayId?: string | undefined;
    effectiveAt?: string | undefined;
}>, {
    status: "administered" | "delayed" | "refused" | "held";
    scheduledFor: string;
    orderId: string;
    encounterId?: string | undefined;
    reason?: string | undefined;
    delayedUntil?: string | undefined;
    stayId?: string | undefined;
    effectiveAt?: string | undefined;
}, {
    status: "administered" | "delayed" | "refused" | "held";
    scheduledFor: string;
    orderId: string;
    encounterId?: string | undefined;
    reason?: unknown;
    delayedUntil?: string | undefined;
    stayId?: string | undefined;
    effectiveAt?: string | undefined;
}>;
export type MedicationRoute = z.infer<typeof MedicationRouteSchema>;
export type MedicationFrequencyType = z.infer<typeof MedicationFrequencyTypeSchema>;
export type MedicationOrderStatus = z.infer<typeof MedicationOrderStatusSchema>;
export type MedicationScheduleType = z.infer<typeof MedicationScheduleTypeSchema>;
export type MedicationAdministrationStatus = z.infer<typeof MedicationAdministrationStatusSchema>;
export type MedicationOrderCreateDto = z.infer<typeof MedicationOrderCreateSchema>;
export type MedicationOrderUpdateDto = z.infer<typeof MedicationOrderUpdateSchema>;
export type MedicationOrderStopDto = z.infer<typeof MedicationOrderStopSchema>;
export type MedicationOrderReadDto = z.infer<typeof MedicationOrderReadSchema>;
export type MedicationScheduleCreateDto = z.infer<typeof MedicationScheduleCreateSchema>;
export type MedicationScheduleUpdateDto = z.infer<typeof MedicationScheduleUpdateSchema>;
export type MedicationAdministrationCreateDto = z.infer<typeof MedicationAdministrationCreateSchema>;
//# sourceMappingURL=medication.d.ts.map