import { z } from 'zod';
import { trim } from './common.js';
const requiredSoapTextSchema = z
    .string()
    .transform(trim)
    .pipe(z.string().min(1, 'SOAP fields are required'));
const noteIdSchema = z.string().uuid('id must be a valid UUID');
const reasonSchema = z
    .string()
    .transform(trim)
    .pipe(z.string().min(1, 'reason is required'));
export const ClinicalNoteTypeSchema = z.enum(['SOAP']);
export const ClinicalNoteStatusSchema = z.enum(['draft', 'signed']);
export const SoapSchema = z
    .object({
    subjective: requiredSoapTextSchema,
    objective: requiredSoapTextSchema,
    assessment: requiredSoapTextSchema,
    plan: requiredSoapTextSchema
})
    .strict();
export const NoteCreateSchema = z.object({
    encounterId: z.string().uuid('encounterId must be a valid UUID'),
    soap: SoapSchema
});
export const NoteUpdateSchema = z.object({
    soap: SoapSchema
});
export const NoteSignSchema = z.object({
    id: noteIdSchema
});
export const NoteVersionSchema = z.object({
    reason: reasonSchema
});
//# sourceMappingURL=clinicalNote.js.map