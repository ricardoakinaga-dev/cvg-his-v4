import { z } from 'zod';
export declare const DocumentCreateSchema: z.ZodObject<{
    filename: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    mimeType: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    size: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    filename: string;
    mimeType: string;
    size: number;
}, {
    filename: string;
    mimeType: string;
    size: number;
}>;
export type DocumentCreateDto = z.infer<typeof DocumentCreateSchema>;
//# sourceMappingURL=document.d.ts.map