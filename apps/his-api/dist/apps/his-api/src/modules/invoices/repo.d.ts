import { type Invoice, type Payment, type BillingItem } from '@cvg-his/db';
import type { InvoiceStatus, PaymentMethod } from './types.js';
interface ListInvoicesInput {
    accountId: string;
    status?: InvoiceStatus;
    startDate?: Date;
    endDate?: Date;
    limit: number;
    offset: number;
}
interface CreateInvoiceInput {
    accountId: string;
    encounterId: string;
    subtotal: string;
    discount: string;
    total: string;
    notes?: string;
    createdByUserId: string;
}
interface CreatePaymentInput {
    accountId: string;
    invoiceId: string;
    amount: string;
    method: PaymentMethod;
    reference?: string;
    notes?: string;
    receivedByUserId: string;
}
export declare function createInvoicesRepo(): {
    listInvoices(input: ListInvoicesInput): Promise<Invoice[]>;
    countInvoices(input: Omit<ListInvoicesInput, "limit" | "offset">): Promise<number>;
    findInvoiceById(input: {
        accountId: string;
        invoiceId: string;
    }): Promise<Invoice | undefined>;
    findInvoiceByEncounter(input: {
        accountId: string;
        encounterId: string;
    }): Promise<Invoice | undefined>;
    createInvoice(input: CreateInvoiceInput): Promise<Invoice>;
    updateInvoiceStatus(input: {
        accountId: string;
        invoiceId: string;
        status: InvoiceStatus;
        closedAt?: Date;
        cancelledAt?: Date;
        cancelledReason?: string;
    }): Promise<Invoice | undefined>;
    getInvoiceWithDetails(input: {
        accountId: string;
        invoiceId: string;
    }): Promise<{
        invoice: Invoice;
        encounter?: {
            id: string;
            patientId: string;
            patientName: string;
            patientSpecies: string;
            ownerName: string;
        };
        payments: Payment[];
        billingItems: Pick<BillingItem, "id" | "description" | "qty" | "unitPrice" | "totalPrice" | "status">[];
    } | undefined>;
    listPayments(input: {
        accountId: string;
        invoiceId?: string;
        method?: PaymentMethod;
        startDate?: Date;
        endDate?: Date;
        limit: number;
        offset: number;
    }): Promise<Payment[]>;
    countPayments(input: {
        accountId: string;
        invoiceId?: string;
        method?: PaymentMethod;
        startDate?: Date;
        endDate?: Date;
    }): Promise<number>;
    createPayment(input: CreatePaymentInput): Promise<Payment>;
    findPaymentById(input: {
        accountId: string;
        paymentId: string;
    }): Promise<Payment | undefined>;
    deletePayment(input: {
        accountId: string;
        paymentId: string;
    }): Promise<void>;
    getCashReport(input: {
        accountId: string;
        date: string;
    }): Promise<{
        payments: Payment[];
        totalByMethod: {
            method: PaymentMethod;
            total: string;
            count: number;
        }[];
    }>;
};
export type InvoicesRepo = ReturnType<typeof createInvoicesRepo>;
export {};
//# sourceMappingURL=repo.d.ts.map