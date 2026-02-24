import { append } from '@cvg-his/audit';
import { createInvoicesRepo } from './repo.js';
import { createBillingItemsRepo } from '../billingItems/repo.js';
function unauthorizedError(message) {
    const error = new Error(message);
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return error;
}
function ensureAccountActor(requestContext) {
    const actor = requestContext.actor;
    if (!actor?.accountId) {
        throw unauthorizedError('Missing actor context. Provide a valid Bearer token.');
    }
    return actor;
}
function ensureWriteActor(requestContext) {
    const actor = ensureAccountActor(requestContext);
    if (!actor.userId) {
        throw unauthorizedError('Missing actor user context in token.');
    }
    return actor;
}
export function createInvoicesService(context, dependencies = {}) {
    const repo = dependencies.repo ?? createInvoicesRepo();
    const billingItemsRepo = dependencies.billingItemsRepo ?? createBillingItemsRepo(context.db);
    const appendAuditFn = dependencies.appendAudit ?? append;
    return {
        // ============================================
        // INVOICE OPERATIONS
        // ============================================
        async listInvoices(input) {
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
            const itemsWithDetails = await Promise.all(invoices.map(async (invoice) => {
                const details = await repo.getInvoiceWithDetails({
                    accountId: actor.accountId,
                    invoiceId: invoice.id
                });
                return details ?? { invoice, payments: [], billingItems: [] };
            }));
            return {
                items: itemsWithDetails,
                total,
                page: input.page,
                pageSize: input.pageSize
            };
        },
        async getInvoiceById(invoiceId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.getInvoiceWithDetails({
                accountId: actor.accountId,
                invoiceId
            });
        },
        async createInvoiceFromEncounter(input) {
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
            const subtotal = billingItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
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
        async cancelInvoice(invoiceId, reason) {
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
        async createPayment(input) {
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
        async listPayments(input) {
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
        async getCashReport(date) {
            const actor = ensureAccountActor(context.requestContext);
            // Use provided date or today's date in Brazil timezone
            const reportDate = date ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
            const { payments, totalByMethod } = await repo.getCashReport({
                accountId: actor.accountId,
                date: reportDate
            });
            const totalReceived = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
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
//# sourceMappingURL=service.js.map