import { type AppendAuditInput } from '@cvg-his/audit';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type InvoicesRepo } from './repo.js';
import { type BillingItemsRepo } from '../billingItems/repo.js';
import type { InvoiceStatus, PaymentMethod, InvoiceWithDetailsResponse, CashReportResponse, PaymentRecord } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: InvoicesRepo;
    billingItemsRepo?: BillingItemsRepo;
    appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};
export type CreateInvoiceResult = {
    kind: 'encounter_not_found';
} | {
    kind: 'encounter_not_closed';
} | {
    kind: 'invoice_already_exists';
    invoice: {
        id: string;
        invoiceNumber: string;
    };
} | {
    kind: 'no_billing_items';
} | {
    kind: 'created';
    invoice: {
        id: string;
        invoiceNumber: string;
        total: string;
    };
};
export type CreatePaymentResult = {
    kind: 'invoice_not_found';
} | {
    kind: 'invoice_cancelled';
} | {
    kind: 'payment_exceeds_due';
    dueAmount: string;
} | {
    kind: 'created';
    payment: {
        id: string;
        paymentNumber: string;
        amount: string;
    };
};
export type CancelInvoiceResult = {
    kind: 'invoice_not_found';
} | {
    kind: 'invoice_already_paid';
} | {
    kind: 'cancelled';
    invoice: {
        id: string;
        status: string;
    };
};
export declare function createInvoicesService(context: ServiceContext, dependencies?: ServiceDependencies): {
    listInvoices(input: {
        status?: InvoiceStatus;
        startDate?: Date;
        endDate?: Date;
        page: number;
        pageSize: number;
    }): Promise<{
        items: InvoiceWithDetailsResponse[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getInvoiceById(invoiceId: string): Promise<InvoiceWithDetailsResponse | undefined>;
    createInvoiceFromEncounter(input: {
        encounterId: string;
        discount?: number;
        notes?: string;
    }): Promise<CreateInvoiceResult>;
    cancelInvoice(invoiceId: string, reason: string): Promise<CancelInvoiceResult>;
    createPayment(input: {
        invoiceId: string;
        amount: number;
        method: PaymentMethod;
        reference?: string;
        notes?: string;
    }): Promise<CreatePaymentResult>;
    listPayments(input: {
        invoiceId?: string;
        method?: PaymentMethod;
        startDate?: Date;
        endDate?: Date;
        page: number;
        pageSize: number;
    }): Promise<{
        items: PaymentRecord[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getCashReport(date?: string): Promise<CashReportResponse>;
};
export {};
//# sourceMappingURL=service.d.ts.map