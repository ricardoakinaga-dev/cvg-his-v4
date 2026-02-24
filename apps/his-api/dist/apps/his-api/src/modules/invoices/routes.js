import { requirePermission } from '../../middlewares/requirePermission.js';
import { createInvoicesService } from './service.js';
import { invoiceIdParamSchema, encounterIdParamSchema, listInvoicesQuerySchema, createInvoiceFromEncounterSchema, cancelInvoiceSchema, createPaymentSchema, listPaymentsQuerySchema, cashReportQuerySchema } from './types.js';
export const invoicesRoutes = async (app) => {
    // ============================================
    // INVOICE ROUTES
    // ============================================
    // List invoices
    app.get('/', {
        preHandler: requirePermission('financeiro.faturamento.read')
    }, async (request, reply) => {
        const query = listInvoicesQuerySchema.parse(request.query ?? {});
        const service = createInvoicesService({ db: app.db, requestContext: request.requestContext });
        const startDate = query.startDate ? new Date(query.startDate) : undefined;
        const endDate = query.endDate ? new Date(query.endDate) : undefined;
        const result = await service.listInvoices({
            status: query.status,
            startDate,
            endDate,
            page: query.page,
            pageSize: query.pageSize
        });
        return reply.send({
            items: result.items,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize
        });
    });
    // Get invoice by ID
    app.get('/:invoiceId', {
        preHandler: requirePermission('financeiro.faturamento.read')
    }, async (request, reply) => {
        const params = invoiceIdParamSchema.parse(request.params);
        const service = createInvoicesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.getInvoiceById(params.invoiceId);
        if (!result) {
            return reply.status(404).send({ message: 'Invoice not found' });
        }
        return reply.send(result);
    });
    // Create invoice from encounter
    app.post('/from-encounter/:encounterId', {
        preHandler: requirePermission('financeiro.faturamento.update')
    }, async (request, reply) => {
        const params = encounterIdParamSchema.parse(request.params);
        const body = createInvoiceFromEncounterSchema.parse(request.body ?? {});
        const service = createInvoicesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.createInvoiceFromEncounter({
            encounterId: params.encounterId,
            discount: body.discount,
            notes: body.notes
        });
        if (result.kind === 'encounter_not_found') {
            return reply.status(404).send({ message: 'Encounter not found' });
        }
        if (result.kind === 'encounter_not_closed') {
            return reply.status(400).send({ message: 'Encounter must be closed before creating invoice' });
        }
        if (result.kind === 'invoice_already_exists') {
            return reply.status(409).send({
                message: 'Invoice already exists for this encounter',
                invoice: result.invoice
            });
        }
        if (result.kind === 'no_billing_items') {
            return reply.status(400).send({ message: 'No confirmed billing items found for this encounter' });
        }
        return reply.status(201).send(result.invoice);
    });
    // Cancel invoice
    app.post('/:invoiceId/cancel', {
        preHandler: requirePermission('financeiro.faturamento.update')
    }, async (request, reply) => {
        const params = invoiceIdParamSchema.parse(request.params);
        const body = cancelInvoiceSchema.parse(request.body);
        const service = createInvoicesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.cancelInvoice(params.invoiceId, body.reason);
        if (result.kind === 'invoice_not_found') {
            return reply.status(404).send({ message: 'Invoice not found' });
        }
        if (result.kind === 'invoice_already_paid') {
            return reply.status(400).send({ message: 'Cannot cancel a fully paid invoice' });
        }
        return reply.send(result.invoice);
    });
    // ============================================
    // PAYMENT ROUTES
    // ============================================
    // List payments
    app.get('/payments', {
        preHandler: requirePermission('financeiro.pagamentos.read')
    }, async (request, reply) => {
        const query = listPaymentsQuerySchema.parse(request.query ?? {});
        const service = createInvoicesService({ db: app.db, requestContext: request.requestContext });
        const startDate = query.startDate ? new Date(query.startDate) : undefined;
        const endDate = query.endDate ? new Date(query.endDate) : undefined;
        const result = await service.listPayments({
            invoiceId: query.invoiceId,
            method: query.method,
            startDate,
            endDate,
            page: query.page,
            pageSize: query.pageSize
        });
        return reply.send({
            items: result.items,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize
        });
    });
    // Create payment
    app.post('/:invoiceId/payments', {
        preHandler: requirePermission('financeiro.pagamentos.create')
    }, async (request, reply) => {
        const params = invoiceIdParamSchema.parse(request.params);
        const body = createPaymentSchema.parse(request.body);
        const service = createInvoicesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.createPayment({
            invoiceId: params.invoiceId,
            amount: body.amount,
            method: body.method,
            reference: body.reference,
            notes: body.notes
        });
        if (result.kind === 'invoice_not_found') {
            return reply.status(404).send({ message: 'Invoice not found' });
        }
        if (result.kind === 'invoice_cancelled') {
            return reply.status(400).send({ message: 'Cannot add payment to a cancelled invoice' });
        }
        if (result.kind === 'payment_exceeds_due') {
            return reply.status(400).send({
                message: `Payment amount exceeds due amount. Due: ${result.dueAmount}`
            });
        }
        return reply.status(201).send(result.payment);
    });
    // ============================================
    // CASH REPORT ROUTES
    // ============================================
    // Get daily cash report
    app.get('/cash-report', {
        preHandler: requirePermission('financeiro.caixa.read')
    }, async (request, reply) => {
        const query = cashReportQuerySchema.parse(request.query ?? {});
        const service = createInvoicesService({ db: app.db, requestContext: request.requestContext });
        const result = await service.getCashReport(query.date);
        return reply.send(result);
    });
};
//# sourceMappingURL=routes.js.map