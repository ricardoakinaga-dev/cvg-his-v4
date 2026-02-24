import { z } from 'zod';
// ============================================
// OWNER TYPES
// ============================================
export const ownerContactTypeSchema = z.enum(['phone', 'email', 'whatsapp']);
export const ownerDocumentTypeSchema = z.enum(['cpf', 'cnpj', 'rg', 'passaporte', 'outro']);
export const alertSeveritySchema = z.enum(['info', 'warning', 'critical']);
export const createOwnerContactSchema = z.object({
    type: ownerContactTypeSchema,
    label: z.string().optional(),
    value: z.string().min(1),
    isPrimary: z.boolean().default(false)
});
export const createOwnerAddressSchema = z.object({
    label: z.string().optional(),
    street: z.string().min(1),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().min(1),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().default('Brasil'),
    isPrimary: z.boolean().default(false)
});
export const createOwnerDocumentSchema = z.object({
    type: ownerDocumentTypeSchema,
    value: z.string().min(1),
    issuer: z.string().optional(),
    issueDate: z.string().optional(),
    expiryDate: z.string().optional(),
    notes: z.string().optional()
});
export const createOwnerAlertSchema = z.object({
    severity: alertSeveritySchema.default('info'),
    title: z.string().min(1),
    message: z.string().optional()
});
export const updateOwnerContactSchema = createOwnerContactSchema.partial();
export const updateOwnerAddressSchema = createOwnerAddressSchema.partial();
export const updateOwnerDocumentSchema = createOwnerDocumentSchema.partial();
export const updateOwnerAlertSchema = createOwnerAlertSchema.partial();
export const ownerContactResponseSchema = z.object({
    id: z.string().uuid(),
    ownerId: z.string().uuid(),
    type: ownerContactTypeSchema,
    label: z.string().nullable(),
    value: z.string(),
    isPrimary: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string()
});
export const ownerAddressResponseSchema = z.object({
    id: z.string().uuid(),
    ownerId: z.string().uuid(),
    label: z.string().nullable(),
    street: z.string(),
    number: z.string().nullable(),
    complement: z.string().nullable(),
    neighborhood: z.string().nullable(),
    city: z.string(),
    state: z.string().nullable(),
    postalCode: z.string().nullable(),
    country: z.string(),
    isPrimary: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string()
});
export const ownerDocumentResponseSchema = z.object({
    id: z.string().uuid(),
    ownerId: z.string().uuid(),
    type: ownerDocumentTypeSchema,
    value: z.string(),
    issuer: z.string().nullable(),
    issueDate: z.string().nullable(),
    expiryDate: z.string().nullable(),
    notes: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string()
});
export const ownerAlertResponseSchema = z.object({
    id: z.string().uuid(),
    ownerId: z.string().uuid(),
    severity: alertSeveritySchema,
    title: z.string(),
    message: z.string().nullable(),
    isActive: z.boolean(),
    createdByUserId: z.string().uuid().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    resolvedAt: z.string().nullable(),
    resolvedByUserId: z.string().uuid().nullable()
});
// ============================================
// PATIENT TYPES
// ============================================
export const allergySeveritySchema = z.enum(['mild', 'moderate', 'severe']);
export const createPatientAlertSchema = z.object({
    severity: alertSeveritySchema.default('info'),
    title: z.string().min(1),
    message: z.string().optional()
});
export const createPatientVaccineSchema = z.object({
    vaccineName: z.string().min(1),
    manufacturer: z.string().optional(),
    batchNumber: z.string().optional(),
    administrationDate: z.string(),
    nextDoseDate: z.string().optional(),
    veterinarianName: z.string().optional(),
    notes: z.string().optional()
});
export const createPatientAllergySchema = z.object({
    allergen: z.string().min(1),
    reaction: z.string().optional(),
    severity: allergySeveritySchema.optional(),
    diagnosedDate: z.string().optional(),
    notes: z.string().optional(),
    isActive: z.boolean().default(true)
});
export const updatePatientAlertSchema = createPatientAlertSchema.partial();
export const updatePatientVaccineSchema = createPatientVaccineSchema.partial();
export const updatePatientAllergySchema = createPatientAllergySchema.partial();
export const patientAlertResponseSchema = z.object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    severity: alertSeveritySchema,
    title: z.string(),
    message: z.string().nullable(),
    isActive: z.boolean(),
    createdByUserId: z.string().uuid().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    resolvedAt: z.string().nullable(),
    resolvedByUserId: z.string().uuid().nullable()
});
export const patientVaccineResponseSchema = z.object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    vaccineName: z.string(),
    manufacturer: z.string().nullable(),
    batchNumber: z.string().nullable(),
    administrationDate: z.string(),
    nextDoseDate: z.string().nullable(),
    veterinarianName: z.string().nullable(),
    notes: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string()
});
export const patientAllergyResponseSchema = z.object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    allergen: z.string(),
    reaction: z.string().nullable(),
    severity: allergySeveritySchema.nullable(),
    diagnosedDate: z.string().nullable(),
    notes: z.string().nullable(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string()
});
// ============================================
// SEARCH TYPES
// ============================================
export const searchQuerySchema = z.object({
    q: z.string().min(1),
    limit: z.coerce.number().min(1).max(50).default(10)
});
export const searchOwnerResultSchema = z.object({
    id: z.string().uuid(),
    fullName: z.string(),
    document: z.string().nullable(),
    phoneMain: z.string().nullable(),
    email: z.string().nullable(),
    type: z.literal('owner')
});
export const searchPatientResultSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    species: z.string(),
    breed: z.string().nullable(),
    ownerId: z.string().uuid(),
    ownerName: z.string(),
    type: z.literal('patient')
});
export const searchResponseSchema = z.object({
    owners: z.array(searchOwnerResultSchema),
    patients: z.array(searchPatientResultSchema),
    total: z.number()
});
// ============================================
// TAG TYPES
// ============================================
export const createTagSchema = z.object({
    name: z.string().min(1).max(50),
    color: z.string().default('#6B7280')
});
export const tagResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    color: z.string(),
    createdAt: z.string()
});
//# sourceMappingURL=types.js.map