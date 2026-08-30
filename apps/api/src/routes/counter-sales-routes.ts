import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { CounterSalesService } from '@cvg-his-v2/module-counter-sales';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import type { JsonValue } from '@cvg-his-v2/shared-database';
import { AuthenticationError, ValidationError } from '@cvg-his-v2/shared-errors';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';
import type { TenantCommandInput, TenantCommandRunner } from '../helpers/tenant-command.js';

export interface CounterSalesRoutesHandlers {
  counterSales: CounterSalesService;
  audit: AuditService;
  requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
  runCommand?: TenantCommandRunner;
}

function json(response: ServerResponse, statusCode: number, payload?: unknown): true {
  response.statusCode = statusCode;
  if (payload !== undefined) {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify(payload));
    return true;
  }

  response.end();
  return true;
}

type CounterSalePaymentMethod =
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'pix'
  | 'bank_transfer'
  | 'check'
  | 'insurance'
  | 'other';

interface SettlementPaymentPayload {
  readonly method: CounterSalePaymentMethod;
  readonly amount: number;
  readonly installments: number;
  readonly reference: string | null;
  readonly notes: string | null;
}

const COUNTER_SALE_PAYMENT_METHODS = new Set<CounterSalePaymentMethod>([
  'cash',
  'credit_card',
  'debit_card',
  'pix',
  'bank_transfer',
  'check',
  'insurance',
  'other'
]);

function parseSettlementPayload(value: unknown): {
  readonly payments: readonly SettlementPaymentPayload[];
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError('Settlement body must be a JSON object');
  }

  const payload = value as Readonly<Record<string, unknown>>;
  const unknownField = Object.keys(payload).find((field) => field !== 'payments');
  if (unknownField) throw new ValidationError(`Unknown field '${unknownField}'`);

  if (!Array.isArray(payload.payments) || payload.payments.length === 0) {
    throw new ValidationError('payments must be a non-empty array');
  }
  if (payload.payments.length > 20) {
    throw new ValidationError('payments must contain at most 20 entries');
  }

  return {
    payments: payload.payments.map((value, index) => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new ValidationError(`payments[${index}] must be a JSON object`);
      }
      const payment = value as Readonly<Record<string, unknown>>;
      const allowedFields = new Set(['method', 'amount', 'installments', 'reference', 'notes']);
      const unknownPaymentField = Object.keys(payment).find((field) => !allowedFields.has(field));
      if (unknownPaymentField) {
        throw new ValidationError(`Unknown field 'payments[${index}].${unknownPaymentField}'`);
      }

      if (
        typeof payment.method !== 'string' ||
        !COUNTER_SALE_PAYMENT_METHODS.has(payment.method as CounterSalePaymentMethod)
      ) {
        throw new ValidationError(`payments[${index}].method is invalid`);
      }
      if (
        typeof payment.amount !== 'number' ||
        !Number.isFinite(payment.amount) ||
        payment.amount <= 0 ||
        payment.amount > 1_000_000_000
      ) {
        throw new ValidationError(`payments[${index}].amount must be a positive finite number`);
      }

      const installments = payment.installments ?? 1;
      if (
        typeof installments !== 'number' ||
        !Number.isInteger(installments) ||
        installments < 1 ||
        installments > 120
      ) {
        throw new ValidationError(
          `payments[${index}].installments must be an integer from 1 to 120`
        );
      }

      const reference = payment.reference ?? null;
      const notes = payment.notes ?? null;
      if (
        (reference !== null && typeof reference !== 'string') ||
        (notes !== null && typeof notes !== 'string')
      ) {
        throw new ValidationError(`payments[${index}].reference and notes must be strings or null`);
      }
      if (typeof reference === 'string' && reference.length > 255) {
        throw new ValidationError(
          `payments[${index}].reference must contain at most 255 characters`
        );
      }
      if (typeof notes === 'string' && notes.length > 2000) {
        throw new ValidationError(`payments[${index}].notes must contain at most 2000 characters`);
      }

      return {
        method: payment.method as CounterSalePaymentMethod,
        amount: payment.amount,
        installments,
        reference,
        notes
      };
    })
  };
}

function parseCancellationPayload(value: unknown): { readonly reason: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError('Cancellation body must be a JSON object');
  }

  const payload = value as Readonly<Record<string, unknown>>;
  const unknownField = Object.keys(payload).find((field) => field !== 'reason');
  if (unknownField) throw new ValidationError(`Unknown field '${unknownField}'`);

  if (typeof payload.reason !== 'string') {
    throw new ValidationError('reason is required');
  }

  if (/[\u0000-\u001f\u007f-\u009f]/u.test(payload.reason)) {
    throw new ValidationError('reason cannot contain control characters');
  }
  const reason = payload.reason.trim();
  if (reason.length === 0 || reason.length > 500) {
    throw new ValidationError('reason must contain 1 to 500 characters');
  }

  return { reason };
}

function parsePaymentIdempotencyKey(request: IncomingMessage): string | undefined {
  const header = request.headers?.['idempotency-key'];
  if (Array.isArray(header) && header.length > 1) {
    throw new ValidationError('idempotency-key must contain exactly one value');
  }
  const value = Array.isArray(header) ? header[0] : header;
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (normalized.length > 255) {
    throw new ValidationError('idempotency-key must contain at most 255 characters');
  }
  return normalized || undefined;
}

export async function handleCounterSalesRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: CounterSalesRoutesHandlers
): Promise<boolean> {
  if (pathname !== '/admin/commercial-dashboard' && !pathname.startsWith('/counter-sales')) {
    return false;
  }

  const { counterSales, audit, requirePrincipal } = handlers;
  const runCommand =
    handlers.runCommand ?? (async <T>(input: TenantCommandInput<T>) => input.command());
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? pathname, 'http://localhost');

  if (pathname === '/admin/commercial-dashboard' && method === 'GET') {
    const principal = await requirePrincipal(request, 'counter_sale.read');
    const dateFrom = url.searchParams.get('dateFrom') ?? undefined;
    const dateTo = url.searchParams.get('dateTo') ?? undefined;
    const dashboard = await counterSales.getCommercialDashboard(
      principal.user.accountId,
      dateFrom,
      dateTo
    );

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'counter-sales',
      action: 'read_dashboard',
      entityType: 'counter-sale-dashboard',
      entityId: `${dateFrom ?? 'all'}:${dateTo ?? 'all'}`,
      payloadSummary: 'Commercial dashboard inspected',
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, dashboard);
  }

  if (pathname === '/counter-sales' && method === 'GET') {
    const principal = await requirePrincipal(request, 'counter_sale.read');
    const search = url.searchParams.get('search') ?? undefined;
    const status = url.searchParams.get('status') ?? undefined;
    const ownerId = url.searchParams.get('ownerId') ?? undefined;
    const dateFrom = url.searchParams.get('dateFrom') ?? undefined;
    const dateTo = url.searchParams.get('dateTo') ?? undefined;
    const items = counterSales.list(principal.user.accountId, {
      search,
      status,
      ownerId,
      dateFrom,
      dateTo
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'counter-sales',
      action: 'list',
      entityType: 'counter-sale',
      entityId: ownerId ?? status ?? search ?? 'all',
      payloadSummary: 'Counter sales listed',
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, { items });
  }

  if (pathname === '/counter-sales' && method === 'POST') {
    const principal = await requirePrincipal(request, 'counter_sale.write');
    const payload = (await readJsonBody(request).catch(() => ({}))) as {
      ownerId?: string | null;
      patientId?: string | null;
      encounterId?: string | null;
      queueEntryId?: string | null;
      billingRecordId?: string | null;
      notes?: string | null;
    };
    const openPayload = {
      ownerId: payload.ownerId ?? null,
      patientId: payload.patientId ?? null,
      encounterId: payload.encounterId ?? null,
      queueEntryId: payload.queueEntryId ?? null,
      billingRecordId: payload.billingRecordId ?? null,
      notes: payload.notes ?? null
    };
    const sale = await runCommand({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'counter_sale.open',
      payload: openPayload as unknown as JsonValue,
      command: () =>
        counterSales.open(principal.user.accountId, principal.user.id, {
          ownerId: payload.ownerId,
          patientId: payload.patientId,
          encounterId: payload.encounterId,
          queueEntryId: payload.queueEntryId,
          billingRecordId: payload.billingRecordId,
          notes: payload.notes
        })
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'counter-sales',
      action: 'open',
      entityType: 'counter-sale',
      entityId: sale.id,
      payloadSummary: `Counter sale ${sale.number} opened`,
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 201, sale);
  }

  const saleMatch = pathname.match(/^\/counter-sales\/([^/]+)$/);
  if (saleMatch && method === 'GET') {
    const principal = await requirePrincipal(request, 'counter_sale.read');
    const sale =
      typeof counterSales.getByIdForAccount === 'function'
        ? await counterSales.getByIdForAccount(principal.user.accountId, saleMatch[1])
        : counterSales.getOrThrow(saleMatch[1]);
    if (sale.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Counter sale not found for current account');
    }

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'counter-sales',
      action: 'read',
      entityType: 'counter-sale',
      entityId: sale.id,
      payloadSummary: `Counter sale ${sale.number} inspected`,
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, {
      ...sale,
      items: counterSales.getItems(sale.id, principal.user.accountId),
      payments: counterSales.getPayments(sale.id),
      receipt: counterSales.getReceipt(sale.id) ?? null,
      cancellationHistory: await counterSales.listCancellationHistory(
        principal.user.accountId,
        sale.id
      )
    });
  }

  const addItemMatch = pathname.match(/^\/counter-sales\/([^/]+)\/items$/);
  if (addItemMatch && method === 'POST') {
    const principal = await requirePrincipal(request, 'counter_sale.write');
    const saleId = addItemMatch[1];
    const sale = counterSales.getOrThrow(saleId);
    if (sale.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Counter sale not found for current account');
    }

    const payload = (await readJsonBody(request)) as {
      itemType: 'product' | 'service';
      catalogItemId?: string | null;
      nameSnapshot: string;
      codeSnapshot?: string | null;
      unitPrice: number;
      quantity?: number;
      discountAmount?: number;
      notes?: string | null;
    };
    const result = await runCommand({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'counter_sale.add_item',
      payload: {
        ...payload,
        saleId,
        accountId: principal.user.accountId
      } as unknown as JsonValue,
      command: () =>
        counterSales.addItem(saleId, payload, {
          saleId,
          accountId: principal.user.accountId
        })
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'counter-sales',
      action: 'add_item',
      entityType: 'counter-sale-item',
      entityId: result.item.id,
      payloadSummary: `Item added to counter sale ${result.sale.number}`,
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 201, result.item);
  }

  const updateItemMatch = pathname.match(/^\/counter-sales\/([^/]+)\/items\/([^/]+)$/);
  if (updateItemMatch && method === 'PATCH') {
    const principal = await requirePrincipal(request, 'counter_sale.write');
    const sale = counterSales.getOrThrow(updateItemMatch[1]);
    if (sale.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Counter sale not found for current account');
    }

    const payload = (await readJsonBody(request)) as {
      quantity?: number;
      discountAmount?: number;
      notes?: string | null;
    };
    const result = await runCommand({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'counter_sale.update_item',
      payload: { itemId: updateItemMatch[2], ...payload } as unknown as JsonValue,
      command: () =>
        counterSales.updateItem(updateItemMatch[2], payload, {
          saleId: updateItemMatch[1],
          accountId: principal.user.accountId
        })
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'counter-sales',
      action: 'update_item',
      entityType: 'counter-sale-item',
      entityId: result.item.id,
      payloadSummary: `Item updated in counter sale ${result.sale.number}`,
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, result.item);
  }

  if (updateItemMatch && method === 'DELETE') {
    const principal = await requirePrincipal(request, 'counter_sale.write');
    const sale = counterSales.getOrThrow(updateItemMatch[1]);
    if (sale.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Counter sale not found for current account');
    }

    const updatedSale = await runCommand({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'counter_sale.remove_item',
      payload: { itemId: updateItemMatch[2] },
      command: () =>
        counterSales.removeItem(updateItemMatch[2], {
          saleId: updateItemMatch[1],
          accountId: principal.user.accountId
        })
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'counter-sales',
      action: 'remove_item',
      entityType: 'counter-sale-item',
      entityId: updateItemMatch[2],
      payloadSummary: `Item removed from counter sale ${updatedSale.number}`,
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 204);
  }

  const paymentMatch = pathname.match(/^\/counter-sales\/([^/]+)\/payments$/);
  if (paymentMatch && method === 'POST') {
    const principal = await requirePrincipal(request, 'counter_sale.write');
    const sale = counterSales.getOrThrow(paymentMatch[1]);
    if (sale.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Counter sale not found for current account');
    }

    const payment = parseSettlementPayload({ payments: [await readJsonBody(request)] }).payments[0];
    if (!payment) throw new ValidationError('Payment body is required');
    const idempotencyKey = parsePaymentIdempotencyKey(request);
    const result = await runCommand({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'counter_sale.add_payment',
      payload: { saleId: paymentMatch[1], ...payment } as unknown as JsonValue,
      command: () =>
        counterSales.addPayment(paymentMatch[1], {
          ...payment,
          idempotencyKey
        })
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'counter-sales',
      action: 'add_payment',
      entityType: 'counter-sale-payment',
      entityId: result.payment.id,
      payloadSummary: `Payment added to counter sale ${result.sale.number}`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 201, result.payment);
  }

  const transitionMatch = pathname.match(/^\/counter-sales\/([^/]+)\/(close|cancel|reopen)$/);

  const settleMatch = pathname.match(/^\/counter-sales\/([^/]+)\/settle$/);
  if (settleMatch && method === 'POST') {
    const principal = await requirePrincipal(request, 'counter_sale.write');
    const saleId = settleMatch[1];
    const sale = counterSales.getOrThrow(saleId);
    if (sale.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Counter sale not found for current account');
    }
    const { payments } = parseSettlementPayload(await readJsonBody(request));
    const result = await runCommand({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'counter_sale.settle',
      payload: { saleId, payments } as unknown as JsonValue,
      command: () => counterSales.settle(saleId, principal.user.id, { payments })
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'counter-sales',
      action: 'settle',
      entityType: 'counter-sale-receipt',
      entityId: result.receipt.id,
      payloadSummary: `Counter sale ${result.sale.number} settled with immutable receipt`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, { ...result.sale, receipt: result.receipt });
  }

  if (transitionMatch && method === 'POST') {
    const principal = await requirePrincipal(request, 'counter_sale.write');
    const saleId = transitionMatch[1];
    const action = transitionMatch[2];

    if (action === 'cancel') {
      const { reason } = parseCancellationPayload(await readJsonBody(request));
      const updatedSale = await runCommand({
        request,
        accountId: principal.user.accountId,
        actorUserId: principal.user.id,
        correlationId,
        operation: 'counter_sale.cancel',
        payload: { saleId, reason },
        command: () =>
          counterSales.cancel(saleId, {
            accountId: principal.user.accountId,
            cancelledByUserId: principal.user.id,
            reason,
            correlationId
          }),
        onCommit:
          counterSales.persistenceMode === 'database' &&
          typeof audit.refreshFromDatabase === 'function'
            ? () => audit.refreshFromDatabase(principal.user.accountId)
            : undefined
      });
      return json(response, 200, updatedSale);
    }

    const sale = counterSales.getOrThrow(saleId);
    if (sale.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Counter sale not found for current account');
    }

    if (action === 'close') {
      const result = await runCommand({
        request,
        accountId: principal.user.accountId,
        actorUserId: principal.user.id,
        correlationId,
        operation: 'counter_sale.close',
        payload: { saleId },
        command: () => counterSales.close(saleId, principal.user.id)
      });
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'counter-sales',
        action: 'close',
        entityType: 'counter-sale',
        entityId: result.sale.id,
        payloadSummary: `Counter sale ${result.sale.number} closed`,
        riskLevel: 'high',
        correlationId
      });
      return json(response, 200, { ...result.sale, receipt: result.receipt });
    }

    const updatedSale = await runCommand({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'counter_sale.reopen',
      payload: { saleId },
      command: () => counterSales.reopen(saleId)
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'counter-sales',
      action: 'reopen',
      entityType: 'counter-sale',
      entityId: updatedSale.id,
      payloadSummary: `Counter sale ${updatedSale.number} reopened`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, updatedSale);
  }

  return false;
}
