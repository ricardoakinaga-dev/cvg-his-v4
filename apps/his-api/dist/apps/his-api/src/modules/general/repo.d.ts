import { type OwnerDocumentType, type OwnerAlertSeverity, type PatientAlertSeverity, type AllergySeverity } from '@cvg-his/db';
type DbClient = typeof import('@cvg-his/db').db;
type OwnerContactType = 'phone' | 'email' | 'whatsapp';
export declare function createOwnerContactsRepo(db: DbClient): {
    create(accountId: string, ownerId: string, data: {
        type: OwnerContactType;
        label?: string;
        value: string;
        isPrimary: boolean;
    }): Promise<{
        value: string;
        type: "email" | "phone" | "whatsapp";
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        label: string | null;
        isPrimary: boolean;
    }>;
    findByOwner(accountId: string, ownerId: string): Promise<{
        value: string;
        type: "email" | "phone" | "whatsapp";
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        label: string | null;
        isPrimary: boolean;
    }[]>;
    findById(accountId: string, id: string): Promise<{
        value: string;
        type: "email" | "phone" | "whatsapp";
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        label: string | null;
        isPrimary: boolean;
    }>;
    update(accountId: string, id: string, data: Partial<{
        type: OwnerContactType;
        label: string;
        value: string;
        isPrimary: boolean;
    }>): Promise<{
        id: string;
        accountId: string;
        ownerId: string;
        type: "email" | "phone" | "whatsapp";
        label: string | null;
        value: string;
        isPrimary: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    delete(accountId: string, id: string): Promise<{
        value: string;
        type: "email" | "phone" | "whatsapp";
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        label: string | null;
        isPrimary: boolean;
    }>;
};
export declare function createOwnerAddressesRepo(db: DbClient): {
    create(accountId: string, ownerId: string, data: {
        label?: string;
        street: string;
        number?: string;
        complement?: string;
        neighborhood?: string;
        city: string;
        state?: string;
        postalCode?: string;
        country: string;
        isPrimary: boolean;
    }): Promise<{
        number: string | null;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        label: string | null;
        isPrimary: boolean;
        street: string;
        complement: string | null;
        neighborhood: string | null;
        city: string;
        state: string | null;
        postalCode: string | null;
        country: string | null;
    }>;
    findByOwner(accountId: string, ownerId: string): Promise<{
        number: string | null;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        label: string | null;
        isPrimary: boolean;
        street: string;
        complement: string | null;
        neighborhood: string | null;
        city: string;
        state: string | null;
        postalCode: string | null;
        country: string | null;
    }[]>;
    findById(accountId: string, id: string): Promise<{
        number: string | null;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        label: string | null;
        isPrimary: boolean;
        street: string;
        complement: string | null;
        neighborhood: string | null;
        city: string;
        state: string | null;
        postalCode: string | null;
        country: string | null;
    }>;
    update(accountId: string, id: string, data: Partial<{
        label: string;
        street: string;
        number: string;
        complement: string;
        neighborhood: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
        isPrimary: boolean;
    }>): Promise<{
        id: string;
        accountId: string;
        ownerId: string;
        label: string | null;
        street: string;
        number: string | null;
        complement: string | null;
        neighborhood: string | null;
        city: string;
        state: string | null;
        postalCode: string | null;
        country: string | null;
        isPrimary: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    delete(accountId: string, id: string): Promise<{
        number: string | null;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        label: string | null;
        isPrimary: boolean;
        street: string;
        complement: string | null;
        neighborhood: string | null;
        city: string;
        state: string | null;
        postalCode: string | null;
        country: string | null;
    }>;
};
export declare function createOwnerDocumentsRepo(db: DbClient): {
    create(accountId: string, ownerId: string, data: {
        type: OwnerDocumentType;
        value: string;
        issuer?: string;
        issueDate?: Date;
        expiryDate?: Date;
        notes?: string;
    }): Promise<{
        value: string;
        type: OwnerDocumentType;
        notes: string | null;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        issuer: string | null;
        issueDate: Date | null;
        expiryDate: Date | null;
    }>;
    findByOwner(accountId: string, ownerId: string): Promise<{
        value: string;
        type: OwnerDocumentType;
        notes: string | null;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        issuer: string | null;
        issueDate: Date | null;
        expiryDate: Date | null;
    }[]>;
    findById(accountId: string, id: string): Promise<{
        value: string;
        type: OwnerDocumentType;
        notes: string | null;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        issuer: string | null;
        issueDate: Date | null;
        expiryDate: Date | null;
    }>;
    update(accountId: string, id: string, data: Partial<{
        type: OwnerDocumentType;
        value: string;
        issuer: string;
        issueDate: Date;
        expiryDate: Date;
        notes: string;
    }>): Promise<{
        id: string;
        accountId: string;
        ownerId: string;
        type: OwnerDocumentType;
        value: string;
        issuer: string | null;
        issueDate: Date | null;
        expiryDate: Date | null;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    delete(accountId: string, id: string): Promise<{
        value: string;
        type: OwnerDocumentType;
        notes: string | null;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        issuer: string | null;
        issueDate: Date | null;
        expiryDate: Date | null;
    }>;
};
export declare function createOwnerAlertsRepo(db: DbClient): {
    create(accountId: string, ownerId: string, data: {
        severity: OwnerAlertSeverity;
        title: string;
        message?: string;
        createdByUserId?: string;
    }): Promise<{
        message: string | null;
        isActive: boolean;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        createdByUserId: string | null;
        ownerId: string;
        title: string;
        severity: OwnerAlertSeverity;
        resolvedAt: Date | null;
        resolvedByUserId: string | null;
    }>;
    findByOwner(accountId: string, ownerId: string, activeOnly?: boolean): Promise<{
        message: string | null;
        isActive: boolean;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        createdByUserId: string | null;
        ownerId: string;
        title: string;
        severity: OwnerAlertSeverity;
        resolvedAt: Date | null;
        resolvedByUserId: string | null;
    }[]>;
    findById(accountId: string, id: string): Promise<{
        message: string | null;
        isActive: boolean;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        createdByUserId: string | null;
        ownerId: string;
        title: string;
        severity: OwnerAlertSeverity;
        resolvedAt: Date | null;
        resolvedByUserId: string | null;
    }>;
    update(accountId: string, id: string, data: Partial<{
        severity: OwnerAlertSeverity;
        title: string;
        message: string;
        isActive: boolean;
        resolvedAt: Date;
        resolvedByUserId: string;
    }>): Promise<{
        id: string;
        accountId: string;
        ownerId: string;
        severity: OwnerAlertSeverity;
        title: string;
        message: string | null;
        isActive: boolean;
        createdByUserId: string | null;
        createdAt: Date;
        updatedAt: Date;
        resolvedAt: Date | null;
        resolvedByUserId: string | null;
    }>;
    delete(accountId: string, id: string): Promise<{
        message: string | null;
        isActive: boolean;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        createdByUserId: string | null;
        ownerId: string;
        title: string;
        severity: OwnerAlertSeverity;
        resolvedAt: Date | null;
        resolvedByUserId: string | null;
    }>;
    resolve(accountId: string, id: string, resolvedByUserId: string): Promise<{
        id: string;
        accountId: string;
        ownerId: string;
        severity: OwnerAlertSeverity;
        title: string;
        message: string | null;
        isActive: boolean;
        createdByUserId: string | null;
        createdAt: Date;
        updatedAt: Date;
        resolvedAt: Date | null;
        resolvedByUserId: string | null;
    }>;
};
export declare function createPatientAlertsRepo(db: DbClient): {
    create(accountId: string, patientId: string, data: {
        severity: PatientAlertSeverity;
        title: string;
        message?: string;
        createdByUserId?: string;
    }): Promise<{
        message: string | null;
        isActive: boolean;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        createdByUserId: string | null;
        title: string;
        severity: PatientAlertSeverity;
        resolvedAt: Date | null;
        resolvedByUserId: string | null;
    }>;
    findByPatient(accountId: string, patientId: string, activeOnly?: boolean): Promise<{
        message: string | null;
        isActive: boolean;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        createdByUserId: string | null;
        title: string;
        severity: PatientAlertSeverity;
        resolvedAt: Date | null;
        resolvedByUserId: string | null;
    }[]>;
    findById(accountId: string, id: string): Promise<{
        message: string | null;
        isActive: boolean;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        createdByUserId: string | null;
        title: string;
        severity: PatientAlertSeverity;
        resolvedAt: Date | null;
        resolvedByUserId: string | null;
    }>;
    update(accountId: string, id: string, data: Partial<{
        severity: PatientAlertSeverity;
        title: string;
        message: string;
        isActive: boolean;
        resolvedAt: Date;
        resolvedByUserId: string;
    }>): Promise<{
        id: string;
        accountId: string;
        patientId: string;
        severity: PatientAlertSeverity;
        title: string;
        message: string | null;
        isActive: boolean;
        createdByUserId: string | null;
        createdAt: Date;
        updatedAt: Date;
        resolvedAt: Date | null;
        resolvedByUserId: string | null;
    }>;
    delete(accountId: string, id: string): Promise<{
        message: string | null;
        isActive: boolean;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        createdByUserId: string | null;
        title: string;
        severity: PatientAlertSeverity;
        resolvedAt: Date | null;
        resolvedByUserId: string | null;
    }>;
    resolve(accountId: string, id: string, resolvedByUserId: string): Promise<{
        id: string;
        accountId: string;
        patientId: string;
        severity: PatientAlertSeverity;
        title: string;
        message: string | null;
        isActive: boolean;
        createdByUserId: string | null;
        createdAt: Date;
        updatedAt: Date;
        resolvedAt: Date | null;
        resolvedByUserId: string | null;
    }>;
};
export declare function createPatientVaccinesRepo(db: DbClient): {
    create(accountId: string, patientId: string, data: {
        vaccineName: string;
        manufacturer?: string;
        batchNumber?: string;
        administrationDate: Date;
        nextDoseDate?: Date;
        veterinarianName?: string;
        notes?: string;
    }): Promise<{
        notes: string | null;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        vaccineName: string;
        manufacturer: string | null;
        batchNumber: string | null;
        administrationDate: Date;
        nextDoseDate: Date | null;
        veterinarianName: string | null;
    }>;
    findByPatient(accountId: string, patientId: string): Promise<{
        notes: string | null;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        vaccineName: string;
        manufacturer: string | null;
        batchNumber: string | null;
        administrationDate: Date;
        nextDoseDate: Date | null;
        veterinarianName: string | null;
    }[]>;
    findById(accountId: string, id: string): Promise<{
        notes: string | null;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        vaccineName: string;
        manufacturer: string | null;
        batchNumber: string | null;
        administrationDate: Date;
        nextDoseDate: Date | null;
        veterinarianName: string | null;
    }>;
    update(accountId: string, id: string, data: Partial<{
        vaccineName: string;
        manufacturer: string;
        batchNumber: string;
        administrationDate: Date;
        nextDoseDate: Date;
        veterinarianName: string;
        notes: string;
    }>): Promise<{
        id: string;
        accountId: string;
        patientId: string;
        vaccineName: string;
        manufacturer: string | null;
        batchNumber: string | null;
        administrationDate: Date;
        nextDoseDate: Date | null;
        veterinarianName: string | null;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    delete(accountId: string, id: string): Promise<{
        notes: string | null;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        vaccineName: string;
        manufacturer: string | null;
        batchNumber: string | null;
        administrationDate: Date;
        nextDoseDate: Date | null;
        veterinarianName: string | null;
    }>;
    findUpcoming(accountId: string, days?: number): Promise<{
        notes: string | null;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        vaccineName: string;
        manufacturer: string | null;
        batchNumber: string | null;
        administrationDate: Date;
        nextDoseDate: Date | null;
        veterinarianName: string | null;
    }[]>;
};
export declare function createPatientAllergiesRepo(db: DbClient): {
    create(accountId: string, patientId: string, data: {
        allergen: string;
        reaction?: string;
        severity?: AllergySeverity;
        diagnosedDate?: Date;
        notes?: string;
        isActive: boolean;
    }): Promise<{
        notes: string | null;
        isActive: boolean;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        severity: AllergySeverity | null;
        allergen: string;
        reaction: string | null;
        diagnosedDate: Date | null;
    }>;
    findByPatient(accountId: string, patientId: string, activeOnly?: boolean): Promise<{
        notes: string | null;
        isActive: boolean;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        severity: AllergySeverity | null;
        allergen: string;
        reaction: string | null;
        diagnosedDate: Date | null;
    }[]>;
    findById(accountId: string, id: string): Promise<{
        notes: string | null;
        isActive: boolean;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        severity: AllergySeverity | null;
        allergen: string;
        reaction: string | null;
        diagnosedDate: Date | null;
    }>;
    update(accountId: string, id: string, data: Partial<{
        allergen: string;
        reaction: string;
        severity: AllergySeverity;
        diagnosedDate: Date;
        notes: string;
        isActive: boolean;
    }>): Promise<{
        id: string;
        accountId: string;
        patientId: string;
        allergen: string;
        reaction: string | null;
        severity: AllergySeverity | null;
        diagnosedDate: Date | null;
        notes: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    delete(accountId: string, id: string): Promise<{
        notes: string | null;
        isActive: boolean;
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        severity: AllergySeverity | null;
        allergen: string;
        reaction: string | null;
        diagnosedDate: Date | null;
    }>;
};
export declare function createTagsRepo(db: DbClient): {
    create(accountId: string, data: {
        name: string;
        color: string;
    }): Promise<{
        name: string;
        id: string;
        accountId: string;
        createdAt: Date;
        color: string | null;
    }>;
    findByAccount(accountId: string): Promise<{
        name: string;
        id: string;
        accountId: string;
        createdAt: Date;
        color: string | null;
    }[]>;
    findById(accountId: string, id: string): Promise<{
        name: string;
        id: string;
        accountId: string;
        createdAt: Date;
        color: string | null;
    }>;
    delete(accountId: string, id: string): Promise<{
        name: string;
        id: string;
        accountId: string;
        createdAt: Date;
        color: string | null;
    }>;
    addToOwner(ownerId: string, tagId: string): Promise<{
        createdAt: Date;
        ownerId: string;
        tagId: string;
    }>;
    removeFromOwner(ownerId: string, tagId: string): Promise<{
        createdAt: Date;
        ownerId: string;
        tagId: string;
    }>;
    addToPatient(patientId: string, tagId: string): Promise<{
        createdAt: Date;
        patientId: string;
        tagId: string;
    }>;
    removeFromPatient(patientId: string, tagId: string): Promise<{
        createdAt: Date;
        patientId: string;
        tagId: string;
    }>;
    findOwnerTags(accountId: string, ownerId: string): Promise<{
        tag: {
            name: string;
            id: string;
            accountId: string;
            createdAt: Date;
            color: string | null;
        };
    }[]>;
    findPatientTags(accountId: string, patientId: string): Promise<{
        tag: {
            name: string;
            id: string;
            accountId: string;
            createdAt: Date;
            color: string | null;
        };
    }[]>;
};
export declare function createSearchRepo(db: DbClient): {
    search(accountId: string, query: string, limit: number): Promise<{
        owners: {
            type: "owner";
            id: string;
            fullName: string;
            document: string | null;
            phoneMain: string | null;
            email: string | null;
        }[];
        patients: {
            type: "patient";
            id: string;
            name: string;
            species: string;
            breed: string | null;
            ownerId: string;
            ownerName: string;
        }[];
    }>;
};
export {};
//# sourceMappingURL=repo.d.ts.map