import { z } from 'zod';
export declare const ownerContactTypeSchema: z.ZodEnum<["phone", "email", "whatsapp"]>;
export declare const ownerDocumentTypeSchema: z.ZodEnum<["cpf", "cnpj", "rg", "passaporte", "outro"]>;
export declare const alertSeveritySchema: z.ZodEnum<["info", "warning", "critical"]>;
export declare const createOwnerContactSchema: z.ZodObject<{
    type: z.ZodEnum<["phone", "email", "whatsapp"]>;
    label: z.ZodOptional<z.ZodString>;
    value: z.ZodString;
    isPrimary: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    value: string;
    type: "email" | "phone" | "whatsapp";
    isPrimary: boolean;
    label?: string | undefined;
}, {
    value: string;
    type: "email" | "phone" | "whatsapp";
    label?: string | undefined;
    isPrimary?: boolean | undefined;
}>;
export declare const createOwnerAddressSchema: z.ZodObject<{
    label: z.ZodOptional<z.ZodString>;
    street: z.ZodString;
    number: z.ZodOptional<z.ZodString>;
    complement: z.ZodOptional<z.ZodString>;
    neighborhood: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    state: z.ZodOptional<z.ZodString>;
    postalCode: z.ZodOptional<z.ZodString>;
    country: z.ZodDefault<z.ZodString>;
    isPrimary: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isPrimary: boolean;
    street: string;
    city: string;
    country: string;
    number?: string | undefined;
    label?: string | undefined;
    complement?: string | undefined;
    neighborhood?: string | undefined;
    state?: string | undefined;
    postalCode?: string | undefined;
}, {
    street: string;
    city: string;
    number?: string | undefined;
    label?: string | undefined;
    isPrimary?: boolean | undefined;
    complement?: string | undefined;
    neighborhood?: string | undefined;
    state?: string | undefined;
    postalCode?: string | undefined;
    country?: string | undefined;
}>;
export declare const createOwnerDocumentSchema: z.ZodObject<{
    type: z.ZodEnum<["cpf", "cnpj", "rg", "passaporte", "outro"]>;
    value: z.ZodString;
    issuer: z.ZodOptional<z.ZodString>;
    issueDate: z.ZodOptional<z.ZodString>;
    expiryDate: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    value: string;
    type: "cpf" | "cnpj" | "rg" | "passaporte" | "outro";
    notes?: string | undefined;
    issuer?: string | undefined;
    issueDate?: string | undefined;
    expiryDate?: string | undefined;
}, {
    value: string;
    type: "cpf" | "cnpj" | "rg" | "passaporte" | "outro";
    notes?: string | undefined;
    issuer?: string | undefined;
    issueDate?: string | undefined;
    expiryDate?: string | undefined;
}>;
export declare const createOwnerAlertSchema: z.ZodObject<{
    severity: z.ZodDefault<z.ZodEnum<["info", "warning", "critical"]>>;
    title: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    severity: "critical" | "warning" | "info";
    message?: string | undefined;
}, {
    title: string;
    message?: string | undefined;
    severity?: "critical" | "warning" | "info" | undefined;
}>;
export declare const updateOwnerContactSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["phone", "email", "whatsapp"]>>;
    label: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    value: z.ZodOptional<z.ZodString>;
    isPrimary: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    value?: string | undefined;
    type?: "email" | "phone" | "whatsapp" | undefined;
    label?: string | undefined;
    isPrimary?: boolean | undefined;
}, {
    value?: string | undefined;
    type?: "email" | "phone" | "whatsapp" | undefined;
    label?: string | undefined;
    isPrimary?: boolean | undefined;
}>;
export declare const updateOwnerAddressSchema: z.ZodObject<{
    label: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    street: z.ZodOptional<z.ZodString>;
    number: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    complement: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    neighborhood: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    postalCode: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    country: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    isPrimary: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    number?: string | undefined;
    label?: string | undefined;
    isPrimary?: boolean | undefined;
    street?: string | undefined;
    complement?: string | undefined;
    neighborhood?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    postalCode?: string | undefined;
    country?: string | undefined;
}, {
    number?: string | undefined;
    label?: string | undefined;
    isPrimary?: boolean | undefined;
    street?: string | undefined;
    complement?: string | undefined;
    neighborhood?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    postalCode?: string | undefined;
    country?: string | undefined;
}>;
export declare const updateOwnerDocumentSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["cpf", "cnpj", "rg", "passaporte", "outro"]>>;
    value: z.ZodOptional<z.ZodString>;
    issuer: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    issueDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    expiryDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    value?: string | undefined;
    type?: "cpf" | "cnpj" | "rg" | "passaporte" | "outro" | undefined;
    notes?: string | undefined;
    issuer?: string | undefined;
    issueDate?: string | undefined;
    expiryDate?: string | undefined;
}, {
    value?: string | undefined;
    type?: "cpf" | "cnpj" | "rg" | "passaporte" | "outro" | undefined;
    notes?: string | undefined;
    issuer?: string | undefined;
    issueDate?: string | undefined;
    expiryDate?: string | undefined;
}>;
export declare const updateOwnerAlertSchema: z.ZodObject<{
    severity: z.ZodOptional<z.ZodDefault<z.ZodEnum<["info", "warning", "critical"]>>>;
    title: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    message?: string | undefined;
    title?: string | undefined;
    severity?: "critical" | "warning" | "info" | undefined;
}, {
    message?: string | undefined;
    title?: string | undefined;
    severity?: "critical" | "warning" | "info" | undefined;
}>;
export declare const ownerContactResponseSchema: z.ZodObject<{
    id: z.ZodString;
    ownerId: z.ZodString;
    type: z.ZodEnum<["phone", "email", "whatsapp"]>;
    label: z.ZodNullable<z.ZodString>;
    value: z.ZodString;
    isPrimary: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: string;
    type: "email" | "phone" | "whatsapp";
    id: string;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    label: string | null;
    isPrimary: boolean;
}, {
    value: string;
    type: "email" | "phone" | "whatsapp";
    id: string;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    label: string | null;
    isPrimary: boolean;
}>;
export declare const ownerAddressResponseSchema: z.ZodObject<{
    id: z.ZodString;
    ownerId: z.ZodString;
    label: z.ZodNullable<z.ZodString>;
    street: z.ZodString;
    number: z.ZodNullable<z.ZodString>;
    complement: z.ZodNullable<z.ZodString>;
    neighborhood: z.ZodNullable<z.ZodString>;
    city: z.ZodString;
    state: z.ZodNullable<z.ZodString>;
    postalCode: z.ZodNullable<z.ZodString>;
    country: z.ZodString;
    isPrimary: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    number: string | null;
    id: string;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    label: string | null;
    isPrimary: boolean;
    street: string;
    complement: string | null;
    neighborhood: string | null;
    city: string;
    state: string | null;
    postalCode: string | null;
    country: string;
}, {
    number: string | null;
    id: string;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    label: string | null;
    isPrimary: boolean;
    street: string;
    complement: string | null;
    neighborhood: string | null;
    city: string;
    state: string | null;
    postalCode: string | null;
    country: string;
}>;
export declare const ownerDocumentResponseSchema: z.ZodObject<{
    id: z.ZodString;
    ownerId: z.ZodString;
    type: z.ZodEnum<["cpf", "cnpj", "rg", "passaporte", "outro"]>;
    value: z.ZodString;
    issuer: z.ZodNullable<z.ZodString>;
    issueDate: z.ZodNullable<z.ZodString>;
    expiryDate: z.ZodNullable<z.ZodString>;
    notes: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: string;
    type: "cpf" | "cnpj" | "rg" | "passaporte" | "outro";
    notes: string | null;
    id: string;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    issuer: string | null;
    issueDate: string | null;
    expiryDate: string | null;
}, {
    value: string;
    type: "cpf" | "cnpj" | "rg" | "passaporte" | "outro";
    notes: string | null;
    id: string;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    issuer: string | null;
    issueDate: string | null;
    expiryDate: string | null;
}>;
export declare const ownerAlertResponseSchema: z.ZodObject<{
    id: z.ZodString;
    ownerId: z.ZodString;
    severity: z.ZodEnum<["info", "warning", "critical"]>;
    title: z.ZodString;
    message: z.ZodNullable<z.ZodString>;
    isActive: z.ZodBoolean;
    createdByUserId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    resolvedAt: z.ZodNullable<z.ZodString>;
    resolvedByUserId: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string | null;
    isActive: boolean;
    id: string;
    createdAt: string;
    updatedAt: string;
    createdByUserId: string | null;
    ownerId: string;
    title: string;
    severity: "critical" | "warning" | "info";
    resolvedAt: string | null;
    resolvedByUserId: string | null;
}, {
    message: string | null;
    isActive: boolean;
    id: string;
    createdAt: string;
    updatedAt: string;
    createdByUserId: string | null;
    ownerId: string;
    title: string;
    severity: "critical" | "warning" | "info";
    resolvedAt: string | null;
    resolvedByUserId: string | null;
}>;
export declare const allergySeveritySchema: z.ZodEnum<["mild", "moderate", "severe"]>;
export declare const createPatientAlertSchema: z.ZodObject<{
    severity: z.ZodDefault<z.ZodEnum<["info", "warning", "critical"]>>;
    title: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    severity: "critical" | "warning" | "info";
    message?: string | undefined;
}, {
    title: string;
    message?: string | undefined;
    severity?: "critical" | "warning" | "info" | undefined;
}>;
export declare const createPatientVaccineSchema: z.ZodObject<{
    vaccineName: z.ZodString;
    manufacturer: z.ZodOptional<z.ZodString>;
    batchNumber: z.ZodOptional<z.ZodString>;
    administrationDate: z.ZodString;
    nextDoseDate: z.ZodOptional<z.ZodString>;
    veterinarianName: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    vaccineName: string;
    administrationDate: string;
    notes?: string | undefined;
    manufacturer?: string | undefined;
    batchNumber?: string | undefined;
    nextDoseDate?: string | undefined;
    veterinarianName?: string | undefined;
}, {
    vaccineName: string;
    administrationDate: string;
    notes?: string | undefined;
    manufacturer?: string | undefined;
    batchNumber?: string | undefined;
    nextDoseDate?: string | undefined;
    veterinarianName?: string | undefined;
}>;
export declare const createPatientAllergySchema: z.ZodObject<{
    allergen: z.ZodString;
    reaction: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodEnum<["mild", "moderate", "severe"]>>;
    diagnosedDate: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isActive: boolean;
    allergen: string;
    notes?: string | undefined;
    severity?: "moderate" | "mild" | "severe" | undefined;
    reaction?: string | undefined;
    diagnosedDate?: string | undefined;
}, {
    allergen: string;
    notes?: string | undefined;
    isActive?: boolean | undefined;
    severity?: "moderate" | "mild" | "severe" | undefined;
    reaction?: string | undefined;
    diagnosedDate?: string | undefined;
}>;
export declare const updatePatientAlertSchema: z.ZodObject<{
    severity: z.ZodOptional<z.ZodDefault<z.ZodEnum<["info", "warning", "critical"]>>>;
    title: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    message?: string | undefined;
    title?: string | undefined;
    severity?: "critical" | "warning" | "info" | undefined;
}, {
    message?: string | undefined;
    title?: string | undefined;
    severity?: "critical" | "warning" | "info" | undefined;
}>;
export declare const updatePatientVaccineSchema: z.ZodObject<{
    vaccineName: z.ZodOptional<z.ZodString>;
    manufacturer: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    batchNumber: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    administrationDate: z.ZodOptional<z.ZodString>;
    nextDoseDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    veterinarianName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    notes?: string | undefined;
    vaccineName?: string | undefined;
    manufacturer?: string | undefined;
    batchNumber?: string | undefined;
    administrationDate?: string | undefined;
    nextDoseDate?: string | undefined;
    veterinarianName?: string | undefined;
}, {
    notes?: string | undefined;
    vaccineName?: string | undefined;
    manufacturer?: string | undefined;
    batchNumber?: string | undefined;
    administrationDate?: string | undefined;
    nextDoseDate?: string | undefined;
    veterinarianName?: string | undefined;
}>;
export declare const updatePatientAllergySchema: z.ZodObject<{
    allergen: z.ZodOptional<z.ZodString>;
    reaction: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    severity: z.ZodOptional<z.ZodOptional<z.ZodEnum<["mild", "moderate", "severe"]>>>;
    diagnosedDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    notes?: string | undefined;
    isActive?: boolean | undefined;
    severity?: "moderate" | "mild" | "severe" | undefined;
    allergen?: string | undefined;
    reaction?: string | undefined;
    diagnosedDate?: string | undefined;
}, {
    notes?: string | undefined;
    isActive?: boolean | undefined;
    severity?: "moderate" | "mild" | "severe" | undefined;
    allergen?: string | undefined;
    reaction?: string | undefined;
    diagnosedDate?: string | undefined;
}>;
export declare const patientAlertResponseSchema: z.ZodObject<{
    id: z.ZodString;
    patientId: z.ZodString;
    severity: z.ZodEnum<["info", "warning", "critical"]>;
    title: z.ZodString;
    message: z.ZodNullable<z.ZodString>;
    isActive: z.ZodBoolean;
    createdByUserId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    resolvedAt: z.ZodNullable<z.ZodString>;
    resolvedByUserId: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string | null;
    isActive: boolean;
    id: string;
    createdAt: string;
    updatedAt: string;
    patientId: string;
    createdByUserId: string | null;
    title: string;
    severity: "critical" | "warning" | "info";
    resolvedAt: string | null;
    resolvedByUserId: string | null;
}, {
    message: string | null;
    isActive: boolean;
    id: string;
    createdAt: string;
    updatedAt: string;
    patientId: string;
    createdByUserId: string | null;
    title: string;
    severity: "critical" | "warning" | "info";
    resolvedAt: string | null;
    resolvedByUserId: string | null;
}>;
export declare const patientVaccineResponseSchema: z.ZodObject<{
    id: z.ZodString;
    patientId: z.ZodString;
    vaccineName: z.ZodString;
    manufacturer: z.ZodNullable<z.ZodString>;
    batchNumber: z.ZodNullable<z.ZodString>;
    administrationDate: z.ZodString;
    nextDoseDate: z.ZodNullable<z.ZodString>;
    veterinarianName: z.ZodNullable<z.ZodString>;
    notes: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    notes: string | null;
    id: string;
    createdAt: string;
    updatedAt: string;
    patientId: string;
    vaccineName: string;
    manufacturer: string | null;
    batchNumber: string | null;
    administrationDate: string;
    nextDoseDate: string | null;
    veterinarianName: string | null;
}, {
    notes: string | null;
    id: string;
    createdAt: string;
    updatedAt: string;
    patientId: string;
    vaccineName: string;
    manufacturer: string | null;
    batchNumber: string | null;
    administrationDate: string;
    nextDoseDate: string | null;
    veterinarianName: string | null;
}>;
export declare const patientAllergyResponseSchema: z.ZodObject<{
    id: z.ZodString;
    patientId: z.ZodString;
    allergen: z.ZodString;
    reaction: z.ZodNullable<z.ZodString>;
    severity: z.ZodNullable<z.ZodEnum<["mild", "moderate", "severe"]>>;
    diagnosedDate: z.ZodNullable<z.ZodString>;
    notes: z.ZodNullable<z.ZodString>;
    isActive: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    notes: string | null;
    isActive: boolean;
    id: string;
    createdAt: string;
    updatedAt: string;
    patientId: string;
    severity: "moderate" | "mild" | "severe" | null;
    allergen: string;
    reaction: string | null;
    diagnosedDate: string | null;
}, {
    notes: string | null;
    isActive: boolean;
    id: string;
    createdAt: string;
    updatedAt: string;
    patientId: string;
    severity: "moderate" | "mild" | "severe" | null;
    allergen: string;
    reaction: string | null;
    diagnosedDate: string | null;
}>;
export declare const searchQuerySchema: z.ZodObject<{
    q: z.ZodString;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    q: string;
    limit: number;
}, {
    q: string;
    limit?: number | undefined;
}>;
export declare const searchOwnerResultSchema: z.ZodObject<{
    id: z.ZodString;
    fullName: z.ZodString;
    document: z.ZodNullable<z.ZodString>;
    phoneMain: z.ZodNullable<z.ZodString>;
    email: z.ZodNullable<z.ZodString>;
    type: z.ZodLiteral<"owner">;
}, "strip", z.ZodTypeAny, {
    type: "owner";
    id: string;
    fullName: string;
    document: string | null;
    email: string | null;
    phoneMain: string | null;
}, {
    type: "owner";
    id: string;
    fullName: string;
    document: string | null;
    email: string | null;
    phoneMain: string | null;
}>;
export declare const searchPatientResultSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    species: z.ZodString;
    breed: z.ZodNullable<z.ZodString>;
    ownerId: z.ZodString;
    ownerName: z.ZodString;
    type: z.ZodLiteral<"patient">;
}, "strip", z.ZodTypeAny, {
    type: "patient";
    name: string;
    id: string;
    ownerId: string;
    species: string;
    breed: string | null;
    ownerName: string;
}, {
    type: "patient";
    name: string;
    id: string;
    ownerId: string;
    species: string;
    breed: string | null;
    ownerName: string;
}>;
export declare const searchResponseSchema: z.ZodObject<{
    owners: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        fullName: z.ZodString;
        document: z.ZodNullable<z.ZodString>;
        phoneMain: z.ZodNullable<z.ZodString>;
        email: z.ZodNullable<z.ZodString>;
        type: z.ZodLiteral<"owner">;
    }, "strip", z.ZodTypeAny, {
        type: "owner";
        id: string;
        fullName: string;
        document: string | null;
        email: string | null;
        phoneMain: string | null;
    }, {
        type: "owner";
        id: string;
        fullName: string;
        document: string | null;
        email: string | null;
        phoneMain: string | null;
    }>, "many">;
    patients: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        species: z.ZodString;
        breed: z.ZodNullable<z.ZodString>;
        ownerId: z.ZodString;
        ownerName: z.ZodString;
        type: z.ZodLiteral<"patient">;
    }, "strip", z.ZodTypeAny, {
        type: "patient";
        name: string;
        id: string;
        ownerId: string;
        species: string;
        breed: string | null;
        ownerName: string;
    }, {
        type: "patient";
        name: string;
        id: string;
        ownerId: string;
        species: string;
        breed: string | null;
        ownerName: string;
    }>, "many">;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    total: number;
    owners: {
        type: "owner";
        id: string;
        fullName: string;
        document: string | null;
        email: string | null;
        phoneMain: string | null;
    }[];
    patients: {
        type: "patient";
        name: string;
        id: string;
        ownerId: string;
        species: string;
        breed: string | null;
        ownerName: string;
    }[];
}, {
    total: number;
    owners: {
        type: "owner";
        id: string;
        fullName: string;
        document: string | null;
        email: string | null;
        phoneMain: string | null;
    }[];
    patients: {
        type: "patient";
        name: string;
        id: string;
        ownerId: string;
        species: string;
        breed: string | null;
        ownerName: string;
    }[];
}>;
export declare const createTagSchema: z.ZodObject<{
    name: z.ZodString;
    color: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    color: string;
}, {
    name: string;
    color?: string | undefined;
}>;
export declare const tagResponseSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: string;
    color: string;
}, {
    name: string;
    id: string;
    createdAt: string;
    color: string;
}>;
export type CreateOwnerContact = z.infer<typeof createOwnerContactSchema>;
export type CreateOwnerAddress = z.infer<typeof createOwnerAddressSchema>;
export type CreateOwnerDocument = z.infer<typeof createOwnerDocumentSchema>;
export type CreateOwnerAlert = z.infer<typeof createOwnerAlertSchema>;
export type UpdateOwnerContact = z.infer<typeof updateOwnerContactSchema>;
export type UpdateOwnerAddress = z.infer<typeof updateOwnerAddressSchema>;
export type UpdateOwnerDocument = z.infer<typeof updateOwnerDocumentSchema>;
export type UpdateOwnerAlert = z.infer<typeof updateOwnerAlertSchema>;
export type CreatePatientAlert = z.infer<typeof createPatientAlertSchema>;
export type CreatePatientVaccine = z.infer<typeof createPatientVaccineSchema>;
export type CreatePatientAllergy = z.infer<typeof createPatientAllergySchema>;
export type UpdatePatientAlert = z.infer<typeof updatePatientAlertSchema>;
export type UpdatePatientVaccine = z.infer<typeof updatePatientVaccineSchema>;
export type UpdatePatientAllergy = z.infer<typeof updatePatientAllergySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type SearchOwnerResult = z.infer<typeof searchOwnerResultSchema>;
export type SearchPatientResult = z.infer<typeof searchPatientResultSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type CreateTag = z.infer<typeof createTagSchema>;
export type TagResponse = z.infer<typeof tagResponseSchema>;
//# sourceMappingURL=types.d.ts.map