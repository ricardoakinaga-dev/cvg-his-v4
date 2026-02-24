import { z } from 'zod';
export declare const invoiceStatusSchema: z.ZodEnum<["open", "paid", "partial", "cancelled"]>;
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
export declare const paymentMethodSchema: z.ZodEnum<["cash", "card", "pix"]>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export interface InvoiceRecord {
    id: string;
    accountId: string;
    encounterId: string;
    invoiceNumber: string;
    status: InvoiceStatus;
    subtotal: string;
    discount: string;
    total: string;
    paidAmount: string;
    dueAmount: string;
    notes: string | null;
    closedAt: Date | null;
    cancelledAt: Date | null;
    cancelledReason: string | null;
    createdByUserId: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface PaymentRecord {
    id: string;
    accountId: string;
    invoiceId: string;
    paymentNumber: string;
    amount: string;
    method: PaymentMethod;
    reference: string | null;
    notes: string | null;
    receivedByUserId: string;
    receivedAt: Date;
    createdAt: Date;
}
export interface InvoiceWithDetails extends InvoiceRecord {
    encounter?: {
        id: string;
        patientId: string;
        patientName: string;
        patientSpecies: string;
        ownerName: string;
    };
    payments: PaymentRecord[];
    billingItems: BillingItemSummary[];
}
export interface InvoiceWithDetailsResponse {
    invoice: InvoiceRecord;
    encounter?: {
        id: string;
        patientId: string;
        patientName: string;
        patientSpecies: string;
        ownerName: string;
    };
    payments: PaymentRecord[];
    billingItems: BillingItemSummary[];
}
export interface BillingItemSummary {
    id: string;
    description: string;
    qty: string;
    unitPrice: string;
    totalPrice: string;
    status: string;
}
export declare const invoiceIdParamSchema: z.ZodObject<{
    invoiceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    invoiceId: string;
}, {
    invoiceId: string;
}>;
export declare const encounterIdParamSchema: z.ZodObject<{
    encounterId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    encounterId: string;
}, {
    encounterId: string;
}>;
export declare const listInvoicesQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["open", "paid", "partial", "cancelled"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "open" | "partial" | "cancelled" | "paid" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    status?: "open" | "partial" | "cancelled" | "paid" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const createInvoiceFromEncounterSchema: z.ZodObject<{
    discount: z.ZodDefault<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    discount: number;
    notes?: string | undefined;
}, {
    notes?: string | undefined;
    discount?: number | undefined;
}>;
export declare const cancelInvoiceSchema: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const createPaymentSchema: z.ZodObject<{
    amount: z.ZodNumber;
    method: z.ZodEnum<["cash", "card", "pix"]>;
    reference: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    method: "cash" | "card" | "pix";
    amount: number;
    notes?: string | undefined;
    reference?: string | undefined;
}, {
    method: "cash" | "card" | "pix";
    amount: number;
    notes?: string | undefined;
    reference?: string | undefined;
}>;
export declare const listPaymentsQuerySchema: z.ZodObject<{
    invoiceId: z.ZodOptional<z.ZodString>;
    method: z.ZodOptional<z.ZodEnum<["cash", "card", "pix"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    method?: "cash" | "card" | "pix" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    invoiceId?: string | undefined;
}, {
    method?: "cash" | "card" | "pix" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    invoiceId?: string | undefined;
}>;
export declare const cashReportQuerySchema: z.ZodObject<{
    date: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    date?: string | undefined;
}, {
    date?: string | undefined;
}>;
export interface InvoiceListResponse {
    items: InvoiceWithDetails[];
    total: number;
    page: number;
    pageSize: number;
}
export interface PaymentListResponse {
    items: PaymentRecord[];
    total: number;
    page: number;
    pageSize: number;
}
export interface CashReportResponse {
    date: string;
    totalReceived: string;
    paymentCount: number;
    byMethod: {
        method: PaymentMethod;
        count: number;
        total: string;
    }[];
    payments: PaymentRecord[];
}
//# sourceMappingURL=types.d.ts.map