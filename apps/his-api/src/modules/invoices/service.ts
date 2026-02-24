import { append, type AppendAuditInput } from '@cvg-his/audit';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createInvoicesRepo, type InvoicesRepo } from './repo.js';
import { createBillingItemsRepo, type BillingItemsRepo } from '../billingItems/repo.js';
import type {
  InvoiceStatus,
  PaymentMethod,
  InvoiceWithDetailsResponse,
  CashReportResponse,
  PaymentRecord
} from './types.js';

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

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type WriteActor = AccountActor & {
  userId: string;
};

export type CreateInvoiceResult =
  | { kind: 'encounter_not_found' }
  | { kind: 'encounter_not_closed' }
  | { kind: 'invoice_already_exists'; invoice: { id: string; invoiceNumber: string } }
  | { kind: 'no_billing_items' }
  | { kind: 'created'; invoice: { id: string; invoiceNumber: string; total: string } };

export type CreatePaymentResult =
  | { kind: 'invoice_not_found' }
  | { kind: 'invoice_cancelled' }
  | { kind: 'payment_exceeds_due'; dueAmount: string }
  | { kind: 'created'; payment: { id: string; paymentNumber: string; amount: string } };

export type CancelInvoiceResult =
  | { kind: 'invoice_not_found' }
  | { kind: 'invoice_already_paid' }
  | { kind: 'cancelled'; invoice: { id: string; status: string } };

function unauthorizedError(message: string): Error & { statusCode: 401; code: 'UNAUTHORIZED' } {
  const error = new Error(message) as Error & {
    statusCode: 401;
    code: 'UNAUTHORIZED';
  };

  error.statusCode = 401;
  error.code = 'UNAUTHORIZED';
  return error;
}

function ensureAccountActor(requestContext: RequestContext): AccountActor {
  const actor = requestContext.actor;

  if (!actor?.accountId) {
    throw unauthorizedError('Missing actor context. Provide a valid Bearer token.');
  }

  return actor as AccountActor;
}

function ensureWriteActor(requestContext: RequestContext): WriteActor {
  const actor = ensureAccountActor(requestContext);

  if (!actor.userId) {
    throw unauthorizedError('Missing actor user context in token.');
  }

  return actor as WriteActor;
}

export function createInvoicesService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const repo = dependencies.repo ?? createInvoicesRepo();
  const billingItemsRepo = dependencies.billingItemsRepo ?? createBillingItemsRepo(context.db);
  const appendAuditFn = dependencies.appendAudit ?? append;

  return {
    // ============================================
    // INVOICE OPERATIONS
    // ============================================

    async listInvoices(input: {
      status?: InvoiceStatus;
      startDate?: Date;
      endDate?: Date;
      page: number;
      pageSize: number;
    }): Promise<{ items: InvoiceWithDetailsResponse[]; total: number; page: number; pageSize: number }> {
      const actor = ensureAccountActor(context.requestContext);
      const limit = input.pageSize;
      const offset = (input.page - 1) * input.pageSize;

      const [invoices, total] = await Promise.all([
        repo.listInvoices({
          accountId: actor.accountId,
          status: input.status,
          startDate: input.startDate,
          endDate: input.endDate,
          limit,
          offset
        }),
        repo.countInvoices({
          accountId: actor.accountId,
          status: input.status,
          startDate: input.startDate,
          endDate: input.endDate
        })
      ]);

      // Get details for each invoice
      const itemsWithDetails = await Promise.all(
        invoices.map(async (invoice) => {
          const details = await repo.getInvoiceWithDetails({
            accountId: actor.accountId,
            invoiceId: invoice.id
          });
          return details ?? { invoice, payments: [], billingItems: [] };
        })
      );

      return {
        items: itemsWithDetails,
        total,
        page: input.page,
        pageSize: input.pageSize
      };
    },

    async getInvoiceById(invoiceId: string): Promise<InvoiceWithDetailsResponse | undefined> {
      const actor = ensureAccountActor(context.requestContext);

      return repo.getInvoiceWithDetails({
        accountId: actor.accountId,
        invoiceId
      });
    },

    async createInvoiceFromEncounter(input: {
      encounterId: string;
      discount?: number;
      notes?: string;
    }): Promise<CreateInvoiceResult> {
      const actor = ensureWriteActor(context.requestContext);

      // Check if invoice already exists for this encounter
      const existingInvoice = await repo.findInvoiceByEncounter({
        accountId: actor.accountId,
        encounterId: input.encounterId
      });

      if (existingInvoice) {
        return {
          kind: 'invoice_already_exists',
          invoice: {
            id: existingInvoice.id,
            invoiceNumber: existingInvoice.invoiceNumber
          }
        };
      }

      // Get billing items for the encounter
      const billingItems = await billingItemsRepo.listByEncounter({
        accountId: actor.accountId,
        encounterId: input.encounterId,
        status: 'confirmed'
      });

      if (billingItems.length === 0) {
        return { kind: 'no_billing_items' };
      }

      // Calculate totals
      const subtotal = billingItems.reduce(
        (sum, item) => sum + parseFloat(item.totalPrice),
        0
      );
      const discount = input.discount ?? 0;
      const total = subtotal - discount;

      // Create invoice
      const invoice = await repo.createInvoice({
        accountId: actor.accountId,
        encounterId: input.encounterId,
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        notes: input.notes,
        createdByUserId: actor.userId
      });

      await appendAuditFn({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'invoice',
        entityId: invoice.id,
        action: 'InvoiceCreated',
        beforeJson: null,
        afterJson: invoice,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'created',
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          total: invoice.total
        }
      };
    },

    async cancelInvoice(invoiceId: string, reason: string): Promise<CancelInvoiceResult> {
      const actor = ensureWriteActor(context.requestContext);

      const invoice = await repo.findInvoiceById({
        accountId: actor.accountId,
        invoiceId
      });

      if (!invoice) {
        return { kind: 'invoice_not_found' };
      }

      if (invoice.status === 'paid') {
        return { kind: 'invoice_already_paid' };
      }

      const cancelled = await repo.updateInvoiceStatus({
        accountId: actor.accountId,
        invoiceId,
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledReason: reason
      });

      await appendAuditFn({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'invoice',
        entityId: invoiceId,
        action: 'InvoiceCancelled',
        beforeJson: invoice,
        afterJson: cancelled,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'cancelled',
        invoice: {
          id: invoiceId,
          status: 'cancelled'
        }
      };
    },

    // ============================================
    // PAYMENT OPERATIONS
    // ============================================

    async createPayment(input: {
      invoiceId: string;
      amount: number;
      method: PaymentMethod;
      reference?: string;
      notes?: string;
    }): Promise<CreatePaymentResult> {
      const actor = ensureWriteActor(context.requestContext);

      const invoice = await repo.findInvoiceById({
        accountId: actor.accountId,
        invoiceId: input.invoiceId
      });

      if (!invoice) {
        return { kind: 'invoice_not_found' };
      }

      if (invoice.status === 'cancelled') {
        return { kind: 'invoice_cancelled' };
      }

      const dueAmount = parseFloat(invoice.dueAmount);
      if (input.amount > dueAmount) {
        return {
          kind: 'payment_exceeds_due',
          dueAmount: invoice.dueAmount
        };
      }

      const payment = await repo.createPayment({
        accountId: actor.accountId,
        invoiceId: input.invoiceId,
        amount: input.amount.toFixed(2),
        method: input.method,
        reference: input.reference,
        notes: input.notes,
        receivedByUserId: actor.userId
      });

      await appendAuditFn({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'payment',
        entityId: payment.id,
        action: 'PaymentCreated',
        beforeJson: null,
        afterJson: payment,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'created',
        payment: {
          id: payment.id,
          paymentNumber: payment.paymentNumber,
          amount: payment.amount
        }
      };
    },

    async listPayments(input: {
      invoiceId?: string;
      method?: PaymentMethod;
      startDate?: Date;
      endDate?: Date;
      page: number;
      pageSize: number;
    }): Promise<{ items: PaymentRecord[]; total: number; page: number; pageSize: number }> {
      const actor = ensureAccountActor(context.requestContext);
      const limit = input.pageSize;
      const offset = (input.page - 1) * input.pageSize;

      const [payments, total] = await Promise.all([
        repo.listPayments({
          accountId: actor.accountId,
          invoiceId: input.invoiceId,
          method: input.method,
          startDate: input.startDate,
          endDate: input.endDate,
          limit,
          offset
        }),
        repo.countPayments({
          accountId: actor.accountId,
          invoiceId: input.invoiceId,
          method: input.method,
          startDate: input.startDate,
          endDate: input.endDate
        })
      ]);

      return {
        items: payments,
        total,
        page: input.page,
        pageSize: input.pageSize
      };
    },

    // ============================================
    // CASH REPORT
    // ============================================

    async getCashReport(date?: string): Promise<CashReportResponse> {
      const actor = ensureAccountActor(context.requestContext);

      // Use provided date or today's date in Brazil timezone
      const reportDate = date ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

      const { payments, totalByMethod } = await repo.getCashReport({
        accountId: actor.accountId,
        date: reportDate
      });

      const totalReceived = payments.reduce(
        (sum, p) => sum + parseFloat(p.amount),
        0
      );

      return {
        date: reportDate,
        totalReceived: totalReceived.toFixed(2),
        paymentCount: payments.length,
        byMethod: totalByMethod,
        payments
      };
    }
  };
}
