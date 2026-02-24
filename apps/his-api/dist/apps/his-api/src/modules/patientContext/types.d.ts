import { z } from 'zod';
/**
 * Patient Context Types
 *
 * Types for the Patient Context system that provides a unified view
 * of patient information across MAR, Notes, and Orders modules.
 */
export declare const AnesthesiaRiskSchema: z.ZodEnum<["low", "medium", "high"]>;
export type AnesthesiaRisk = z.infer<typeof AnesthesiaRiskSchema>;
export declare const PatientAlertsSchema: z.ZodObject<{
    aggressive: z.ZodOptional<z.ZodBoolean>;
    allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
    chronic_conditions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    aggressive?: boolean | undefined;
    allergies?: string[] | undefined;
    anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
    chronic_conditions?: string[] | undefined;
    notes?: string | null | undefined;
}, {
    aggressive?: boolean | undefined;
    allergies?: string[] | undefined;
    anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
    chronic_conditions?: string[] | undefined;
    notes?: string | null | undefined;
}>;
export type PatientAlerts = z.infer<typeof PatientAlertsSchema>;
export declare const HighlightedAlertsSchema: z.ZodObject<{
    aggressive: z.ZodBoolean;
    allergiesCount: z.ZodNumber;
    anesthesiaRisk: z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>;
    chronicConditionsCount: z.ZodNumber;
    hasNotes: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    aggressive: boolean;
    allergiesCount: number;
    anesthesiaRisk: "low" | "medium" | "high" | null;
    chronicConditionsCount: number;
    hasNotes: boolean;
}, {
    aggressive: boolean;
    allergiesCount: number;
    anesthesiaRisk: "low" | "medium" | "high" | null;
    chronicConditionsCount: number;
    hasNotes: boolean;
}>;
export type HighlightedAlerts = z.infer<typeof HighlightedAlertsSchema>;
export declare const PatientContextInfoSchema: z.ZodObject<{
    id: z.ZodString;
    ownerId: z.ZodString;
    ownerName: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    species: z.ZodString;
    breed: z.ZodNullable<z.ZodString>;
    sex: z.ZodNullable<z.ZodString>;
    birthDate: z.ZodNullable<z.ZodString>;
    ageMonths: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    weightKg: z.ZodNullable<z.ZodString>;
    microchip: z.ZodNullable<z.ZodString>;
    alerts: z.ZodObject<{
        aggressive: z.ZodOptional<z.ZodBoolean>;
        allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
        chronic_conditions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: string | null | undefined;
    }, {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: string | null | undefined;
    }>;
    highlightedAlerts: z.ZodObject<{
        aggressive: z.ZodBoolean;
        allergiesCount: z.ZodNumber;
        anesthesiaRisk: z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>;
        chronicConditionsCount: z.ZodNumber;
        hasNotes: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        aggressive: boolean;
        allergiesCount: number;
        anesthesiaRisk: "low" | "medium" | "high" | null;
        chronicConditionsCount: number;
        hasNotes: boolean;
    }, {
        aggressive: boolean;
        allergiesCount: number;
        anesthesiaRisk: "low" | "medium" | "high" | null;
        chronicConditionsCount: number;
        hasNotes: boolean;
    }>;
    bedName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    wardName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    stayStatus: z.ZodOptional<z.ZodNullable<z.ZodEnum<["active", "discharged", "transferred"]>>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    species: string;
    breed: string | null;
    sex: string | null;
    birthDate: string | null;
    weightKg: string | null;
    microchip: string | null;
    alerts: {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: string | null | undefined;
    };
    highlightedAlerts: {
        aggressive: boolean;
        allergiesCount: number;
        anesthesiaRisk: "low" | "medium" | "high" | null;
        chronicConditionsCount: number;
        hasNotes: boolean;
    };
    ownerName?: string | undefined;
    ageMonths?: number | null | undefined;
    bedName?: string | null | undefined;
    wardName?: string | null | undefined;
    stayStatus?: "active" | "discharged" | "transferred" | null | undefined;
}, {
    name: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    species: string;
    breed: string | null;
    sex: string | null;
    birthDate: string | null;
    weightKg: string | null;
    microchip: string | null;
    alerts: {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: string | null | undefined;
    };
    highlightedAlerts: {
        aggressive: boolean;
        allergiesCount: number;
        anesthesiaRisk: "low" | "medium" | "high" | null;
        chronicConditionsCount: number;
        hasNotes: boolean;
    };
    ownerName?: string | undefined;
    ageMonths?: number | null | undefined;
    bedName?: string | null | undefined;
    wardName?: string | null | undefined;
    stayStatus?: "active" | "discharged" | "transferred" | null | undefined;
}>;
export type PatientContextInfo = z.infer<typeof PatientContextInfoSchema>;
export declare const StayContextInfoSchema: z.ZodObject<{
    id: z.ZodString;
    patientId: z.ZodString;
    wardId: z.ZodString;
    wardName: z.ZodString;
    bedId: z.ZodString;
    bedName: z.ZodString;
    status: z.ZodEnum<["active", "discharged", "transferred"]>;
    admittedAt: z.ZodString;
    dischargedAt: z.ZodNullable<z.ZodString>;
    chiefComplaint: z.ZodNullable<z.ZodString>;
    reason: z.ZodNullable<z.ZodString>;
    planSummary: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "discharged" | "transferred";
    wardId: string;
    id: string;
    reason: string | null;
    patientId: string;
    bedId: string;
    chiefComplaint: string | null;
    planSummary: string | null;
    admittedAt: string;
    dischargedAt: string | null;
    bedName: string;
    wardName: string;
}, {
    status: "active" | "discharged" | "transferred";
    wardId: string;
    id: string;
    reason: string | null;
    patientId: string;
    bedId: string;
    chiefComplaint: string | null;
    planSummary: string | null;
    admittedAt: string;
    dischargedAt: string | null;
    bedName: string;
    wardName: string;
}>;
export type StayContextInfo = z.infer<typeof StayContextInfoSchema>;
export declare const EncounterContextInfoSchema: z.ZodObject<{
    id: z.ZodString;
    patientId: z.ZodString;
    status: z.ZodEnum<["open", "closed"]>;
    openedAt: z.ZodString;
    closedAt: z.ZodNullable<z.ZodString>;
    reason: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "open" | "closed";
    id: string;
    reason: string | null;
    patientId: string;
    closedAt: string | null;
    openedAt: string;
}, {
    status: "open" | "closed";
    id: string;
    reason: string | null;
    patientId: string;
    closedAt: string | null;
    openedAt: string;
}>;
export type EncounterContextInfo = z.infer<typeof EncounterContextInfoSchema>;
export declare const QuickNavItemSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    href: z.ZodString;
    icon: z.ZodOptional<z.ZodString>;
    badge: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    label: string;
    href: string;
    isActive?: boolean | undefined;
    icon?: string | undefined;
    badge?: string | undefined;
}, {
    id: string;
    label: string;
    href: string;
    isActive?: boolean | undefined;
    icon?: string | undefined;
    badge?: string | undefined;
}>;
export type QuickNavItem = z.infer<typeof QuickNavItemSchema>;
export declare const PatientContextResponseSchema: z.ZodObject<{
    patient: z.ZodObject<{
        id: z.ZodString;
        ownerId: z.ZodString;
        ownerName: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        species: z.ZodString;
        breed: z.ZodNullable<z.ZodString>;
        sex: z.ZodNullable<z.ZodString>;
        birthDate: z.ZodNullable<z.ZodString>;
        ageMonths: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        weightKg: z.ZodNullable<z.ZodString>;
        microchip: z.ZodNullable<z.ZodString>;
        alerts: z.ZodObject<{
            aggressive: z.ZodOptional<z.ZodBoolean>;
            allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
            chronic_conditions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            aggressive?: boolean | undefined;
            allergies?: string[] | undefined;
            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
            chronic_conditions?: string[] | undefined;
            notes?: string | null | undefined;
        }, {
            aggressive?: boolean | undefined;
            allergies?: string[] | undefined;
            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
            chronic_conditions?: string[] | undefined;
            notes?: string | null | undefined;
        }>;
        highlightedAlerts: z.ZodObject<{
            aggressive: z.ZodBoolean;
            allergiesCount: z.ZodNumber;
            anesthesiaRisk: z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>;
            chronicConditionsCount: z.ZodNumber;
            hasNotes: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            aggressive: boolean;
            allergiesCount: number;
            anesthesiaRisk: "low" | "medium" | "high" | null;
            chronicConditionsCount: number;
            hasNotes: boolean;
        }, {
            aggressive: boolean;
            allergiesCount: number;
            anesthesiaRisk: "low" | "medium" | "high" | null;
            chronicConditionsCount: number;
            hasNotes: boolean;
        }>;
        bedName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        wardName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        stayStatus: z.ZodOptional<z.ZodNullable<z.ZodEnum<["active", "discharged", "transferred"]>>>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        createdAt: string;
        updatedAt: string;
        ownerId: string;
        species: string;
        breed: string | null;
        sex: string | null;
        birthDate: string | null;
        weightKg: string | null;
        microchip: string | null;
        alerts: {
            aggressive?: boolean | undefined;
            allergies?: string[] | undefined;
            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
            chronic_conditions?: string[] | undefined;
            notes?: string | null | undefined;
        };
        highlightedAlerts: {
            aggressive: boolean;
            allergiesCount: number;
            anesthesiaRisk: "low" | "medium" | "high" | null;
            chronicConditionsCount: number;
            hasNotes: boolean;
        };
        ownerName?: string | undefined;
        ageMonths?: number | null | undefined;
        bedName?: string | null | undefined;
        wardName?: string | null | undefined;
        stayStatus?: "active" | "discharged" | "transferred" | null | undefined;
    }, {
        name: string;
        id: string;
        createdAt: string;
        updatedAt: string;
        ownerId: string;
        species: string;
        breed: string | null;
        sex: string | null;
        birthDate: string | null;
        weightKg: string | null;
        microchip: string | null;
        alerts: {
            aggressive?: boolean | undefined;
            allergies?: string[] | undefined;
            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
            chronic_conditions?: string[] | undefined;
            notes?: string | null | undefined;
        };
        highlightedAlerts: {
            aggressive: boolean;
            allergiesCount: number;
            anesthesiaRisk: "low" | "medium" | "high" | null;
            chronicConditionsCount: number;
            hasNotes: boolean;
        };
        ownerName?: string | undefined;
        ageMonths?: number | null | undefined;
        bedName?: string | null | undefined;
        wardName?: string | null | undefined;
        stayStatus?: "active" | "discharged" | "transferred" | null | undefined;
    }>;
    stay: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        patientId: z.ZodString;
        wardId: z.ZodString;
        wardName: z.ZodString;
        bedId: z.ZodString;
        bedName: z.ZodString;
        status: z.ZodEnum<["active", "discharged", "transferred"]>;
        admittedAt: z.ZodString;
        dischargedAt: z.ZodNullable<z.ZodString>;
        chiefComplaint: z.ZodNullable<z.ZodString>;
        reason: z.ZodNullable<z.ZodString>;
        planSummary: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "active" | "discharged" | "transferred";
        wardId: string;
        id: string;
        reason: string | null;
        patientId: string;
        bedId: string;
        chiefComplaint: string | null;
        planSummary: string | null;
        admittedAt: string;
        dischargedAt: string | null;
        bedName: string;
        wardName: string;
    }, {
        status: "active" | "discharged" | "transferred";
        wardId: string;
        id: string;
        reason: string | null;
        patientId: string;
        bedId: string;
        chiefComplaint: string | null;
        planSummary: string | null;
        admittedAt: string;
        dischargedAt: string | null;
        bedName: string;
        wardName: string;
    }>>;
    encounter: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        patientId: z.ZodString;
        status: z.ZodEnum<["open", "closed"]>;
        openedAt: z.ZodString;
        closedAt: z.ZodNullable<z.ZodString>;
        reason: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "open" | "closed";
        id: string;
        reason: string | null;
        patientId: string;
        closedAt: string | null;
        openedAt: string;
    }, {
        status: "open" | "closed";
        id: string;
        reason: string | null;
        patientId: string;
        closedAt: string | null;
        openedAt: string;
    }>>;
    navigation: z.ZodObject<{
        mar: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            href: z.ZodString;
            icon: z.ZodOptional<z.ZodString>;
            badge: z.ZodOptional<z.ZodString>;
            isActive: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        }, {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        }>>;
        notes: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            href: z.ZodString;
            icon: z.ZodOptional<z.ZodString>;
            badge: z.ZodOptional<z.ZodString>;
            isActive: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        }, {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        }>>;
        orders: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            href: z.ZodString;
            icon: z.ZodOptional<z.ZodString>;
            badge: z.ZodOptional<z.ZodString>;
            isActive: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        }, {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        }>>;
        record: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            href: z.ZodString;
            icon: z.ZodOptional<z.ZodString>;
            badge: z.ZodOptional<z.ZodString>;
            isActive: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        }, {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        notes?: {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        } | undefined;
        orders?: {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        } | undefined;
        mar?: {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        } | undefined;
        record?: {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        } | undefined;
    }, {
        notes?: {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        } | undefined;
        orders?: {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        } | undefined;
        mar?: {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        } | undefined;
        record?: {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    encounter: {
        status: "open" | "closed";
        id: string;
        reason: string | null;
        patientId: string;
        closedAt: string | null;
        openedAt: string;
    } | null;
    patient: {
        name: string;
        id: string;
        createdAt: string;
        updatedAt: string;
        ownerId: string;
        species: string;
        breed: string | null;
        sex: string | null;
        birthDate: string | null;
        weightKg: string | null;
        microchip: string | null;
        alerts: {
            aggressive?: boolean | undefined;
            allergies?: string[] | undefined;
            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
            chronic_conditions?: string[] | undefined;
            notes?: string | null | undefined;
        };
        highlightedAlerts: {
            aggressive: boolean;
            allergiesCount: number;
            anesthesiaRisk: "low" | "medium" | "high" | null;
            chronicConditionsCount: number;
            hasNotes: boolean;
        };
        ownerName?: string | undefined;
        ageMonths?: number | null | undefined;
        bedName?: string | null | undefined;
        wardName?: string | null | undefined;
        stayStatus?: "active" | "discharged" | "transferred" | null | undefined;
    };
    stay: {
        status: "active" | "discharged" | "transferred";
        wardId: string;
        id: string;
        reason: string | null;
        patientId: string;
        bedId: string;
        chiefComplaint: string | null;
        planSummary: string | null;
        admittedAt: string;
        dischargedAt: string | null;
        bedName: string;
        wardName: string;
    } | null;
    navigation: {
        notes?: {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        } | undefined;
        orders?: {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        } | undefined;
        mar?: {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        } | undefined;
        record?: {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        } | undefined;
    };
}, {
    encounter: {
        status: "open" | "closed";
        id: string;
        reason: string | null;
        patientId: string;
        closedAt: string | null;
        openedAt: string;
    } | null;
    patient: {
        name: string;
        id: string;
        createdAt: string;
        updatedAt: string;
        ownerId: string;
        species: string;
        breed: string | null;
        sex: string | null;
        birthDate: string | null;
        weightKg: string | null;
        microchip: string | null;
        alerts: {
            aggressive?: boolean | undefined;
            allergies?: string[] | undefined;
            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
            chronic_conditions?: string[] | undefined;
            notes?: string | null | undefined;
        };
        highlightedAlerts: {
            aggressive: boolean;
            allergiesCount: number;
            anesthesiaRisk: "low" | "medium" | "high" | null;
            chronicConditionsCount: number;
            hasNotes: boolean;
        };
        ownerName?: string | undefined;
        ageMonths?: number | null | undefined;
        bedName?: string | null | undefined;
        wardName?: string | null | undefined;
        stayStatus?: "active" | "discharged" | "transferred" | null | undefined;
    };
    stay: {
        status: "active" | "discharged" | "transferred";
        wardId: string;
        id: string;
        reason: string | null;
        patientId: string;
        bedId: string;
        chiefComplaint: string | null;
        planSummary: string | null;
        admittedAt: string;
        dischargedAt: string | null;
        bedName: string;
        wardName: string;
    } | null;
    navigation: {
        notes?: {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        } | undefined;
        orders?: {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        } | undefined;
        mar?: {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        } | undefined;
        record?: {
            id: string;
            label: string;
            href: string;
            isActive?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
        } | undefined;
    };
}>;
export type PatientContextResponse = z.infer<typeof PatientContextResponseSchema>;
export declare const patientContextParamsSchema: z.ZodObject<{
    patientId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    patientId: string;
}, {
    patientId: string;
}>;
export declare const stayContextParamsSchema: z.ZodObject<{
    stayId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    stayId: string;
}, {
    stayId: string;
}>;
export type PatientContextParams = z.infer<typeof patientContextParamsSchema>;
export type StayContextParams = z.infer<typeof stayContextParamsSchema>;
//# sourceMappingURL=types.d.ts.map