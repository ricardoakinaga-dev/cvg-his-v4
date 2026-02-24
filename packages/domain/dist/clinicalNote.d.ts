import { z } from 'zod';
export declare const ClinicalNoteTypeSchema: z.ZodEnum<["SOAP"]>;
export declare const ClinicalNoteStatusSchema: z.ZodEnum<["draft", "signed"]>;
export declare const SoapSchema: z.ZodObject<{
    subjective: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    objective: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    assessment: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    plan: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
}, "strict", z.ZodTypeAny, {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
}, {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
}>;
export declare const NoteCreateSchema: z.ZodObject<{
    encounterId: z.ZodString;
    soap: z.ZodObject<{
        subjective: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
        objective: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
        assessment: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
        plan: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
    }, {
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
    }>;
}, "strip", z.ZodTypeAny, {
    encounterId: string;
    soap: {
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
    };
}, {
    encounterId: string;
    soap: {
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
    };
}>;
export declare const NoteUpdateSchema: z.ZodObject<{
    soap: z.ZodObject<{
        subjective: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
        objective: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
        assessment: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
        plan: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
    }, {
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
    }>;
}, "strip", z.ZodTypeAny, {
    soap: {
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
    };
}, {
    soap: {
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
    };
}>;
export declare const NoteSignSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const NoteVersionSchema: z.ZodObject<{
    reason: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export type ClinicalNoteType = z.infer<typeof ClinicalNoteTypeSchema>;
export type ClinicalNoteStatus = z.infer<typeof ClinicalNoteStatusSchema>;
export type SoapDto = z.infer<typeof SoapSchema>;
export type NoteCreateDto = z.infer<typeof NoteCreateSchema>;
export type NoteUpdateDto = z.infer<typeof NoteUpdateSchema>;
export type NoteSignDto = z.infer<typeof NoteSignSchema>;
export type NoteVersionDto = z.infer<typeof NoteVersionSchema>;
//# sourceMappingURL=clinicalNote.d.ts.map