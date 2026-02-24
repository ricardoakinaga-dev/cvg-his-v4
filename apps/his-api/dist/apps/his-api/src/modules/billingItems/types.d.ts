import { z } from 'zod';
export declare const BILLING_ITEM_STATUS: readonly ["draft", "confirmed", "cancelled"];
export type BillingItemStatus = (typeof BILLING_ITEM_STATUS)[number];
export type BillingItemRecord = {
    id: string;
    accountId: string;
    encounterId: string;
    serviceId: string | null;
    description: string;
    qty: string;
    unitPrice: string;
    totalPrice: string;
    status: BillingItemStatus;
    createdByUserId: string;
    createdAt: Date;
    updatedAt: Date;
};
export type BillingItemWithService = BillingItemRecord & {
    service?: {
        id: string;
        code: string;
        name: string;
        group: string;
    } | null;
};
export declare const billingItemIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const encounterIdParamSchema: z.ZodObject<{
    encounterId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    encounterId: string;
}, {
    encounterId: string;
}>;
export declare const listBillingItemsQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["draft", "confirmed", "cancelled"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "draft" | "confirmed" | "cancelled" | undefined;
}, {
    status?: "draft" | "confirmed" | "cancelled" | undefined;
}>;
export declare const billingItemCreateSchema: z.ZodObject<{
    serviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodString;
    qty: z.ZodDefault<z.ZodNumber>;
    unitPrice: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    description: string;
    qty: number;
    unitPrice: number;
    serviceId?: string | null | undefined;
}, {
    description: string;
    serviceId?: string | null | undefined;
    qty?: number | undefined;
    unitPrice?: number | undefined;
}>;
export declare const billingItemUpdateSchema: z.ZodObject<{
    serviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodString>;
    qty: z.ZodOptional<z.ZodNumber>;
    unitPrice: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["draft", "confirmed", "cancelled"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "draft" | "confirmed" | "cancelled" | undefined;
    description?: string | undefined;
    serviceId?: string | null | undefined;
    qty?: number | undefined;
    unitPrice?: number | undefined;
}, {
    status?: "draft" | "confirmed" | "cancelled" | undefined;
    description?: string | undefined;
    serviceId?: string | null | undefined;
    qty?: number | undefined;
    unitPrice?: number | undefined;
}>;
export declare const closeEncounterWithBillingSchema: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: string | undefined;
}>;
export type BillingItemCreateInput = z.infer<typeof billingItemCreateSchema>;
export type BillingItemUpdateInput = z.infer<typeof billingItemUpdateSchema>;
export type CloseEncounterWithBillingInput = z.infer<typeof closeEncounterWithBillingSchema>;
export declare const billingItemResponseSchema: z.ZodObject<{
    id: z.ZodString;
    encounterId: z.ZodString;
    serviceId: z.ZodNullable<z.ZodString>;
    description: z.ZodString;
    qty: z.ZodString;
    unitPrice: z.ZodString;
    totalPrice: z.ZodString;
    status: z.ZodEnum<["draft", "confirmed", "cancelled"]>;
    service: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        code: z.ZodString;
        name: z.ZodString;
        group: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        code: string;
        name: string;
        id: string;
        group: string;
    }, {
        code: string;
        name: string;
        id: string;
        group: string;
    }>>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "confirmed" | "cancelled";
    id: string;
    createdAt: Date;
    updatedAt: Date;
    encounterId: string;
    description: string;
    serviceId: string | null;
    qty: string;
    unitPrice: string;
    totalPrice: string;
    service?: {
        code: string;
        name: string;
        id: string;
        group: string;
    } | null | undefined;
}, {
    status: "draft" | "confirmed" | "cancelled";
    id: string;
    createdAt: Date;
    updatedAt: Date;
    encounterId: string;
    description: string;
    serviceId: string | null;
    qty: string;
    unitPrice: string;
    totalPrice: string;
    service?: {
        code: string;
        name: string;
        id: string;
        group: string;
    } | null | undefined;
}>;
export declare const billingItemsListResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        encounterId: z.ZodString;
        serviceId: z.ZodNullable<z.ZodString>;
        description: z.ZodString;
        qty: z.ZodString;
        unitPrice: z.ZodString;
        totalPrice: z.ZodString;
        status: z.ZodEnum<["draft", "confirmed", "cancelled"]>;
        service: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            id: z.ZodString;
            code: z.ZodString;
            name: z.ZodString;
            group: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            code: string;
            name: string;
            id: string;
            group: string;
        }, {
            code: string;
            name: string;
            id: string;
            group: string;
        }>>>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        status: "draft" | "confirmed" | "cancelled";
        id: string;
        createdAt: Date;
        updatedAt: Date;
        encounterId: string;
        description: string;
        serviceId: string | null;
        qty: string;
        unitPrice: string;
        totalPrice: string;
        service?: {
            code: string;
            name: string;
            id: string;
            group: string;
        } | null | undefined;
    }, {
        status: "draft" | "confirmed" | "cancelled";
        id: string;
        createdAt: Date;
        updatedAt: Date;
        encounterId: string;
        description: string;
        serviceId: string | null;
        qty: string;
        unitPrice: string;
        totalPrice: string;
        service?: {
            code: string;
            name: string;
            id: string;
            group: string;
        } | null | undefined;
    }>, "many">;
    total: z.ZodString;
    itemCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    items: {
        status: "draft" | "confirmed" | "cancelled";
        id: string;
        createdAt: Date;
        updatedAt: Date;
        encounterId: string;
        description: string;
        serviceId: string | null;
        qty: string;
        unitPrice: string;
        totalPrice: string;
        service?: {
            code: string;
            name: string;
            id: string;
            group: string;
        } | null | undefined;
    }[];
    total: string;
    itemCount: number;
}, {
    items: {
        status: "draft" | "confirmed" | "cancelled";
        id: string;
        createdAt: Date;
        updatedAt: Date;
        encounterId: string;
        description: string;
        serviceId: string | null;
        qty: string;
        unitPrice: string;
        totalPrice: string;
        service?: {
            code: string;
            name: string;
            id: string;
            group: string;
        } | null | undefined;
    }[];
    total: string;
    itemCount: number;
}>;
export declare const encounterClosedResponseSchema: z.ZodObject<{
    encounter: z.ZodObject<{
        id: z.ZodString;
        status: z.ZodEnum<["open", "closed"]>;
        closedAt: z.ZodNullable<z.ZodDate>;
        closedByUserId: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "open" | "closed";
        id: string;
        closedAt: Date | null;
        closedByUserId: string | null;
    }, {
        status: "open" | "closed";
        id: string;
        closedAt: Date | null;
        closedByUserId: string | null;
    }>;
    billingItems: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        encounterId: z.ZodString;
        serviceId: z.ZodNullable<z.ZodString>;
        description: z.ZodString;
        qty: z.ZodString;
        unitPrice: z.ZodString;
        totalPrice: z.ZodString;
        status: z.ZodEnum<["draft", "confirmed", "cancelled"]>;
        service: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            id: z.ZodString;
            code: z.ZodString;
            name: z.ZodString;
            group: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            code: string;
            name: string;
            id: string;
            group: string;
        }, {
            code: string;
            name: string;
            id: string;
            group: string;
        }>>>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        status: "draft" | "confirmed" | "cancelled";
        id: string;
        createdAt: Date;
        updatedAt: Date;
        encounterId: string;
        description: string;
        serviceId: string | null;
        qty: string;
        unitPrice: string;
        totalPrice: string;
        service?: {
            code: string;
            name: string;
            id: string;
            group: string;
        } | null | undefined;
    }, {
        status: "draft" | "confirmed" | "cancelled";
        id: string;
        createdAt: Date;
        updatedAt: Date;
        encounterId: string;
        description: string;
        serviceId: string | null;
        qty: string;
        unitPrice: string;
        totalPrice: string;
        service?: {
            code: string;
            name: string;
            id: string;
            group: string;
        } | null | undefined;
    }>, "many">;
    billingTotal: z.ZodString;
}, "strip", z.ZodTypeAny, {
    encounter: {
        status: "open" | "closed";
        id: string;
        closedAt: Date | null;
        closedByUserId: string | null;
    };
    billingItems: {
        status: "draft" | "confirmed" | "cancelled";
        id: string;
        createdAt: Date;
        updatedAt: Date;
        encounterId: string;
        description: string;
        serviceId: string | null;
        qty: string;
        unitPrice: string;
        totalPrice: string;
        service?: {
            code: string;
            name: string;
            id: string;
            group: string;
        } | null | undefined;
    }[];
    billingTotal: string;
}, {
    encounter: {
        status: "open" | "closed";
        id: string;
        closedAt: Date | null;
        closedByUserId: string | null;
    };
    billingItems: {
        status: "draft" | "confirmed" | "cancelled";
        id: string;
        createdAt: Date;
        updatedAt: Date;
        encounterId: string;
        description: string;
        serviceId: string | null;
        qty: string;
        unitPrice: string;
        totalPrice: string;
        service?: {
            code: string;
            name: string;
            id: string;
            group: string;
        } | null | undefined;
    }[];
    billingTotal: string;
}>;
//# sourceMappingURL=types.d.ts.map