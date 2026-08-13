import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { CounterSalesService } from '@cvg-his-v2/module-counter-sales';
import type { OwnersService } from '@cvg-his-v2/module-owners';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { AuthenticationError } from '@cvg-his-v2/shared-errors';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface CounterSalesRoutesHandlers {
  counterSales: CounterSalesService;
  owners?: OwnersService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
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

  const { counterSales, owners, audit, requirePrincipal } = handlers;
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? pathname, 'http://localhost');

  if (pathname === '/admin/commercial-dashboard' && method === 'GET') {
    const principal = requirePrincipal(request, 'counter_sale.read');
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
    const principal = requirePrincipal(request, 'counter_sale.read');
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
    const principal = requirePrincipal(request, 'counter_sale.write');
    const payload = (await readJsonBody(request).catch(() => ({}))) as {
      ownerId?: string | null;
      notes?: string | null;
    };
    if (payload.ownerId) {
      owners?.getForAccountOrThrow(
        payload.ownerId as never,
        principal.user.accountId as never
      );
    }
    const sale = await counterSales.open(principal.user.accountId, principal.user.id, {
      ownerId: payload.ownerId,
      notes: payload.notes
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
    const principal = requirePrincipal(request, 'counter_sale.read');
    const sale = counterSales.getOrThrow(saleMatch[1]);
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
      items: counterSales.getItems(sale.id),
      payments: counterSales.getPayments(sale.id)
    });
  }

  const addItemMatch = pathname.match(/^\/counter-sales\/([^/]+)\/items$/);
  if (addItemMatch && method === 'POST') {
    const principal = requirePrincipal(request, 'counter_sale.write');
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
    const result = await counterSales.addItem(saleId, payload);

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
    const principal = requirePrincipal(request, 'counter_sale.write');
    const sale = counterSales.getOrThrow(updateItemMatch[1]);
    if (sale.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Counter sale not found for current account');
    }

    const payload = (await readJsonBody(request)) as {
      quantity?: number;
      discountAmount?: number;
      notes?: string | null;
    };
    const result = await counterSales.updateItem(updateItemMatch[2], payload);

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
    const principal = requirePrincipal(request, 'counter_sale.write');
    const sale = counterSales.getOrThrow(updateItemMatch[1]);
    if (sale.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Counter sale not found for current account');
    }

    const updatedSale = await counterSales.removeItem(updateItemMatch[2]);

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
    const principal = requirePrincipal(request, 'counter_sale.write');
    const sale = counterSales.getOrThrow(paymentMatch[1]);
    if (sale.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Counter sale not found for current account');
    }

    const payload = (await readJsonBody(request)) as {
      method: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'bank_transfer' | 'check' | 'insurance' | 'other';
      amount: number;
      installments?: number;
      reference?: string | null;
      notes?: string | null;
    };
    const result = await counterSales.addPayment(paymentMatch[1], payload);

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
  if (transitionMatch && method === 'POST') {
    const principal = requirePrincipal(request, 'counter_sale.write');
    const sale = counterSales.getOrThrow(transitionMatch[1]);
    if (sale.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Counter sale not found for current account');
    }

    const saleId = transitionMatch[1];
    const action = transitionMatch[2];

    if (action === 'close') {
      const result = await counterSales.close(saleId, principal.user.id);
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
      return json(response, 200, result.sale);
    }

    if (action === 'cancel') {
      const updatedSale = await counterSales.cancel(saleId);
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'counter-sales',
        action: 'cancel',
        entityType: 'counter-sale',
        entityId: updatedSale.id,
        payloadSummary: `Counter sale ${updatedSale.number} cancelled`,
        riskLevel: 'high',
        correlationId
      });
      return json(response, 200, updatedSale);
    }

    const updatedSale = await counterSales.reopen(saleId);
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
