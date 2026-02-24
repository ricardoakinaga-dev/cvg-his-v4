import { and, eq, gte, lte, sql, desc, asc } from 'drizzle-orm';

import { 
  db,
  invoices,
  payments,
  billingItems,
  encounters,
  patients,
  owners,
  type Invoice,
  type Payment,
  type BillingItem
} from '@cvg-his/db';

import type {
  InvoiceStatus,
  PaymentMethod
} from './types.js';

// ============================================
// INPUT TYPES
// ============================================

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

// ============================================
// REPOSITORY FACTORY
// ============================================

export function createInvoicesRepo() {
  return {
    // ============================================
    // INVOICE OPERATIONS
    // ============================================

    async listInvoices(input: ListInvoicesInput): Promise<Invoice[]> {
      const conditions = [eq(invoices.accountId, input.accountId)];
      
      if (input.status) {
        conditions.push(eq(invoices.status, input.status));
      }
      
      if (input.startDate) {
        conditions.push(gte(invoices.createdAt, input.startDate));
      }
      
      if (input.endDate) {
        conditions.push(lte(invoices.createdAt, input.endDate));
      }

      const result = await db
        .select()
        .from(invoices)
        .where(and(...conditions))
        .orderBy(desc(invoices.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return result;
    },

    async countInvoices(input: Omit<ListInvoicesInput, 'limit' | 'offset'>): Promise<number> {
      const conditions = [eq(invoices.accountId, input.accountId)];
      
      if (input.status) {
        conditions.push(eq(invoices.status, input.status));
      }
      
      if (input.startDate) {
        conditions.push(gte(invoices.createdAt, input.startDate));
      }
      
      if (input.endDate) {
        conditions.push(lte(invoices.createdAt, input.endDate));
      }

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(and(...conditions));

      return Number(result[0]?.count ?? 0);
    },

    async findInvoiceById(input: { accountId: string; invoiceId: string }): Promise<Invoice | undefined> {
      const result = await db
        .select()
        .from(invoices)
        .where(and(
          eq(invoices.accountId, input.accountId),
          eq(invoices.id, input.invoiceId)
        ))
        .limit(1);

      return result[0];
    },

    async findInvoiceByEncounter(input: { accountId: string; encounterId: string }): Promise<Invoice | undefined> {
      const result = await db
        .select()
        .from(invoices)
        .where(and(
          eq(invoices.accountId, input.accountId),
          eq(invoices.encounterId, input.encounterId)
        ))
        .limit(1);

      return result[0];
    },

    async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
      // Generate invoice number using the database function
      const numberResult = await db.execute(sql`
        SELECT generate_invoice_number(${input.accountId}) as invoice_number
      `);

      const invoiceNumber = numberResult.rows[0]?.invoice_number as string;

      const result = await db
        .insert(invoices)
        .values({
          accountId: input.accountId,
          encounterId: input.encounterId,
          invoiceNumber: invoiceNumber,
          status: 'open',
          subtotal: input.subtotal,
          discount: input.discount,
          total: input.total,
          paidAmount: '0',
          dueAmount: input.total,
          notes: input.notes ?? null,
          createdByUserId: input.createdByUserId
        })
        .returning();

      return result[0];
    },

    async updateInvoiceStatus(input: {
      accountId: string;
      invoiceId: string;
      status: InvoiceStatus;
      closedAt?: Date;
      cancelledAt?: Date;
      cancelledReason?: string;
    }): Promise<Invoice | undefined> {
      const updateData: Partial<Invoice> = {
        status: input.status,
        updatedAt: new Date()
      };

      if (input.closedAt !== undefined) {
        updateData.closedAt = input.closedAt;
      }

      if (input.cancelledAt !== undefined) {
        updateData.cancelledAt = input.cancelledAt;
      }

      if (input.cancelledReason !== undefined) {
        updateData.cancelledReason = input.cancelledReason;
      }

      const result = await db
        .update(invoices)
        .set(updateData)
        .where(and(
          eq(invoices.accountId, input.accountId),
          eq(invoices.id, input.invoiceId)
        ))
        .returning();

      return result[0];
    },

    async getInvoiceWithDetails(input: { accountId: string; invoiceId: string }): Promise<{
      invoice: Invoice;
      encounter?: {
        id: string;
        patientId: string;
        patientName: string;
        patientSpecies: string;
        ownerName: string;
      };
      payments: Payment[];
      billingItems: Pick<BillingItem, 'id' | 'description' | 'qty' | 'unitPrice' | 'totalPrice' | 'status'>[];
    } | undefined> {
      const invoice = await this.findInvoiceById(input);
      if (!invoice) return undefined;

      // Get encounter details with patient and owner info
      const encounterResult = await db
        .select({
          id: encounters.id,
          patientId: encounters.patientId,
          patientName: patients.name,
          patientSpecies: patients.species,
          ownerName: owners.fullName
        })
        .from(encounters)
        .innerJoin(patients, eq(encounters.patientId, patients.id))
        .leftJoin(owners, eq(patients.ownerId, owners.id))
        .where(eq(encounters.id, invoice.encounterId))
        .limit(1);

      const encounter = encounterResult[0];

      // Get payments
      const invoicePayments = await db
        .select()
        .from(payments)
        .where(eq(payments.invoiceId, invoice.id))
        .orderBy(desc(payments.receivedAt));

      // Get billing items
      const invoiceBillingItems = await db
        .select({
          id: billingItems.id,
          description: billingItems.description,
          qty: billingItems.qty,
          unitPrice: billingItems.unitPrice,
          totalPrice: billingItems.totalPrice,
          status: billingItems.status
        })
        .from(billingItems)
        .where(and(
          eq(billingItems.encounterId, invoice.encounterId),
          eq(billingItems.status, 'confirmed')
        ))
        .orderBy(asc(billingItems.createdAt));

      return {
        invoice,
        encounter: encounter ? {
          id: encounter.id,
          patientId: encounter.patientId,
          patientName: encounter.patientName,
          patientSpecies: encounter.patientSpecies,
          ownerName: encounter.ownerName ?? ''
        } : undefined,
        payments: invoicePayments,
        billingItems: invoiceBillingItems
      };
    },

    // ============================================
    // PAYMENT OPERATIONS
    // ============================================

    async listPayments(input: {
      accountId: string;
      invoiceId?: string;
      method?: PaymentMethod;
      startDate?: Date;
      endDate?: Date;
      limit: number;
      offset: number;
    }): Promise<Payment[]> {
      const conditions = [eq(payments.accountId, input.accountId)];
      
      if (input.invoiceId) {
        conditions.push(eq(payments.invoiceId, input.invoiceId));
      }
      
      if (input.method) {
        conditions.push(eq(payments.method, input.method));
      }
      
      if (input.startDate) {
        conditions.push(gte(payments.receivedAt, input.startDate));
      }
      
      if (input.endDate) {
        conditions.push(lte(payments.receivedAt, input.endDate));
      }

      const result = await db
        .select()
        .from(payments)
        .where(and(...conditions))
        .orderBy(desc(payments.receivedAt))
        .limit(input.limit)
        .offset(input.offset);

      return result;
    },

    async countPayments(input: {
      accountId: string;
      invoiceId?: string;
      method?: PaymentMethod;
      startDate?: Date;
      endDate?: Date;
    }): Promise<number> {
      const conditions = [eq(payments.accountId, input.accountId)];
      
      if (input.invoiceId) {
        conditions.push(eq(payments.invoiceId, input.invoiceId));
      }
      
      if (input.method) {
        conditions.push(eq(payments.method, input.method));
      }
      
      if (input.startDate) {
        conditions.push(gte(payments.receivedAt, input.startDate));
      }
      
      if (input.endDate) {
        conditions.push(lte(payments.receivedAt, input.endDate));
      }

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(payments)
        .where(and(...conditions));

      return Number(result[0]?.count ?? 0);
    },

    async createPayment(input: CreatePaymentInput): Promise<Payment> {
      // Generate payment number using the database function
      const numberResult = await db.execute(sql`
        SELECT generate_payment_number(${input.accountId}) as payment_number
      `);

      const paymentNumber = numberResult.rows[0]?.payment_number as string;

      const result = await db
        .insert(payments)
        .values({
          accountId: input.accountId,
          invoiceId: input.invoiceId,
          paymentNumber: paymentNumber,
          amount: input.amount,
          method: input.method,
          reference: input.reference ?? null,
          notes: input.notes ?? null,
          receivedByUserId: input.receivedByUserId,
          receivedAt: new Date()
        })
        .returning();

      return result[0];
    },

    async findPaymentById(input: { accountId: string; paymentId: string }): Promise<Payment | undefined> {
      const result = await db
        .select()
        .from(payments)
        .where(and(
          eq(payments.accountId, input.accountId),
          eq(payments.id, input.paymentId)
        ))
        .limit(1);

      return result[0];
    },

    async deletePayment(input: { accountId: string; paymentId: string }): Promise<void> {
      await db
        .delete(payments)
        .where(and(
          eq(payments.accountId, input.accountId),
          eq(payments.id, input.paymentId)
        ));
    },

    // ============================================
    // CASH REPORT OPERATIONS
    // ============================================

    async getCashReport(input: { accountId: string; date: string }): Promise<{
      payments: Payment[];
      totalByMethod: { method: PaymentMethod; total: string; count: number }[];
    }> {
      // Parse date and create range for the day (in Brazil timezone)
      const startDate = new Date(`${input.date}T00:00:00-03:00`);
      const endDate = new Date(`${input.date}T23:59:59-03:00`);

      const dayPayments = await db
        .select()
        .from(payments)
        .where(and(
          eq(payments.accountId, input.accountId),
          gte(payments.receivedAt, startDate),
          lte(payments.receivedAt, endDate)
        ))
        .orderBy(asc(payments.receivedAt));

      // Calculate totals by method
      const methodMap = new Map<PaymentMethod, { total: number; count: number }>();
      
      for (const payment of dayPayments) {
        const method = payment.method as PaymentMethod;
        const current = methodMap.get(method) ?? { total: 0, count: 0 };
        current.total += parseFloat(payment.amount);
        current.count += 1;
        methodMap.set(method, current);
      }

      const totalByMethod = Array.from(methodMap.entries()).map(([method, data]) => ({
        method,
        total: data.total.toFixed(2),
        count: data.count
      }));

      return { payments: dayPayments, totalByMethod };
    }
  };
}

export type InvoicesRepo = ReturnType<typeof createInvoicesRepo>;
