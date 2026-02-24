import { z } from 'zod';
import { trim } from './common.js';
const filenameSchema = z
    .string()
    .transform(trim)
    .pipe(z.string().min(1, 'filename is required'));
const mimeTypeSchema = z
    .string()
    .transform(trim)
    .pipe(z.string().regex(/^[\w.+-]+\/[\w.+-]+$/, 'mimeType must be a valid mime type'));
const sizeSchema = z.coerce
    .number()
    .int('size must be an integer')
    .positive('size must be greater than zero');
export const DocumentCreateSchema = z.object({
    filename: filenameSchema,
    mimeType: mimeTypeSchema,
    size: sizeSchema
});
//# sourceMappingURL=document.js.map