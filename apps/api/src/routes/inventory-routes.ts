/**
 * Inventory route handlers.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type {
  CreateInventoryPurchaseInput,
  InventoryService,
  InventoryTransferRequest,
  ProcurementService,
  ReceiveInventoryPurchaseInput
} from '@cvg-his-v2/module-inventory';
import type {
  CreateInventoryConsumptionRequest,
  CreateInventoryItemRequest,
  CreateInventoryReservationRequest,
  CreateInventoryStockAdjustmentRequest,
  UpdateInventoryItemRequest
} from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import type { JsonValue } from '@cvg-his-v2/shared-database';
import type { ResourceAttributes } from '@cvg-his-v2/module-access-control';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit, appendAuditAndWait } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';
import type { TenantCommandInput, TenantCommandRunner } from '../helpers/tenant-command.js';

export interface InventoryRoutesHandlers {
  inventory: InventoryService;
  procurement: ProcurementService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
  enforceAbac: (
    actionCode: string,
    principal: AuthenticatedPrincipal,
    attrs: ResourceAttributes,
    request: IncomingMessage
  ) => void;
  runCommand?: TenantCommandRunner;
}

/**
 * Handle all inventory-related routes.
 * Returns true if the request was handled, false if the route didn't match.
 */
export async function handleInventoryRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: InventoryRoutesHandlers
): Promise<boolean> {
  const { inventory, audit, requirePrincipal: rp, enforceAbac } = handlers;
  const runCommand = handlers.runCommand ?? (async <T>(input: TenantCommandInput<T>) => input.command());

  if (pathname === '/inventory/purchases' && request.method === 'GET') {
    const principal = rp(request, 'inventory.read');
    const purchases = handlers.procurement.listPurchases(principal.user.accountId as never);
    response.statusCode = 200;
    response.end(JSON.stringify({ items: purchases }));
    return true;
  }

  if (pathname === '/inventory/purchases' && request.method === 'POST') {
    const principal = rp(request, 'inventory.manage');
    const payload = (await readJsonBody(request)) as CreateInventoryPurchaseInput;
    const purchase = await runCommand({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'inventory.purchases.create',
      payload: payload as unknown as JsonValue,
      command: async () => {
        const created = await handlers.procurement.createPurchase(
          principal.user.accountId as never,
          principal.user.id as never,
          payload
        );
        await appendAuditAndWait(audit, {
          actorId: principal.user.id,
          accountId: principal.user.accountId,
          module: 'inventory',
          action: 'create_purchase',
          entityType: 'inventory-purchase',
          entityId: created.id,
          payloadSummary: `Inventory purchase ${created.id} created for ${created.supplierName}`,
          riskLevel: 'high',
          correlationId
        });
        return created;
      }
    });
    response.statusCode = 201;
    response.end(JSON.stringify(purchase));
    return true;
  }

  if (pathname.startsWith('/inventory/purchases/') && pathname.endsWith('/approve') && request.method === 'POST') {
    const principal = rp(request, 'inventory.manage');
    const purchaseId = requireNonEmptyString(pathname.split('/')[3], 'purchaseId');
    const purchase = await runCommand({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'inventory.purchases.approve',
      payload: { purchaseId },
      command: async () => {
        const approved = await handlers.procurement.approvePurchase(
          principal.user.accountId as never,
          principal.user.id as never,
          purchaseId
        );
        await appendAuditAndWait(audit, {
          actorId: principal.user.id,
          accountId: principal.user.accountId,
          module: 'inventory',
          action: 'approve_purchase',
          entityType: 'inventory-purchase',
          entityId: approved.id,
          payloadSummary: `Inventory purchase ${approved.id} approved`,
          riskLevel: 'high',
          correlationId
        });
        return approved;
      }
    });
    response.statusCode = 200;
    response.end(JSON.stringify(purchase));
    return true;
  }

  if (pathname.startsWith('/inventory/purchases/') && pathname.endsWith('/receive') && request.method === 'POST') {
    const principal = rp(request, 'inventory.manage');
    const purchaseId = requireNonEmptyString(pathname.split('/')[3], 'purchaseId');
    const payload = (await readJsonBody(request)) as ReceiveInventoryPurchaseInput;
    const purchase = await runCommand({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'inventory.purchases.receive',
      payload: { purchaseId, ...payload } as unknown as JsonValue,
      command: async () => {
        const received = await handlers.procurement.receivePurchase(
          principal.user.accountId as never,
          principal.user.id as never,
          purchaseId,
          payload
        );
        await appendAuditAndWait(audit, {
          actorId: principal.user.id,
          accountId: principal.user.accountId,
          module: 'inventory',
          action: 'receive_purchase',
          entityType: 'inventory-purchase',
          entityId: received.id,
          payloadSummary: `Inventory purchase ${received.id} received as ${received.status}`,
          riskLevel: 'high',
          correlationId
        });
        return received;
      }
    });
    response.statusCode = 200;
    response.end(JSON.stringify(purchase));
    return true;
  }

  if (pathname.startsWith('/inventory/purchases/') && pathname.endsWith('/cancel') && request.method === 'POST') {
    const principal = rp(request, 'inventory.manage');
    const purchaseId = requireNonEmptyString(pathname.split('/')[3], 'purchaseId');
    const purchase = await runCommand({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'inventory.purchases.cancel',
      payload: { purchaseId },
      command: async () => {
        const cancelled = await handlers.procurement.cancelPurchase(
          principal.user.accountId as never,
          purchaseId
        );
        await appendAuditAndWait(audit, {
          actorId: principal.user.id,
          accountId: principal.user.accountId,
          module: 'inventory',
          action: 'cancel_purchase',
          entityType: 'inventory-purchase',
          entityId: cancelled.id,
          payloadSummary: `Inventory purchase ${cancelled.id} cancelled`,
          riskLevel: 'high',
          correlationId
        });
        return cancelled;
      }
    });
    response.statusCode = 200;
    response.end(JSON.stringify(purchase));
    return true;
  }

  if (pathname === '/inventory/transfers' && request.method === 'GET') {
    const principal = rp(request, 'inventory.read');
    const transfers = handlers.procurement.listTransfers(principal.user.accountId as never);
    response.statusCode = 200;
    response.end(JSON.stringify({ items: transfers }));
    return true;
  }

  if (pathname === '/inventory/transfers' && request.method === 'POST') {
    const principal = rp(request, 'inventory.manage');
    const payload = (await readJsonBody(request)) as InventoryTransferRequest;
    const transfer = await runCommand({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'inventory.transfers.create',
      payload: payload as unknown as JsonValue,
      command: async () => {
        const created = await handlers.procurement.createTransfer(
          principal.user.accountId as never,
          principal.user.id as never,
          payload
        );
        await appendAuditAndWait(audit, {
          actorId: principal.user.id,
          accountId: principal.user.accountId,
          module: 'inventory',
          action: 'transfer_stock',
          entityType: 'inventory-transfer',
          entityId: created.id,
          payloadSummary: `Inventory transfer ${created.quantity} from ${created.fromLocation} to ${created.toLocation}`,
          riskLevel: 'high',
          correlationId
        });
        return created;
      }
    });
    response.statusCode = 201;
    response.end(JSON.stringify(transfer));
    return true;
  }

  if (pathname === '/inventory/reservations' && request.method === 'GET') {
    const principal = rp(request, 'inventory.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const status = url.searchParams.get('status') ?? undefined;
    const items = inventory.listReservations(
      principal.user.accountId as never,
      status as never
    );
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  if (pathname === '/inventory/reservations' && request.method === 'POST') {
    const principal = rp(request, 'inventory.manage');
    const payload = (await readJsonBody(request)) as CreateInventoryReservationRequest;
    const reservations = await runCommand({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'inventory.reservations.create',
      payload: payload as unknown as JsonValue,
      command: async () => {
        const created = await inventory.reserve(
          principal.user.accountId as never,
          principal.user.id as never,
          payload
        );
        await appendAuditAndWait(audit, {
          actorId: principal.user.id,
          accountId: principal.user.accountId,
          module: 'inventory',
          action: 'reserve_stock',
          entityType: 'inventory-reservation',
          entityId: created[0]?.id ?? 'none',
          payloadSummary: `Inventory reservation created for ${payload.quantity}`,
          riskLevel: 'high',
          correlationId
        });
        return created;
      }
    });
    response.statusCode = 201;
    response.end(JSON.stringify({ items: reservations }));
    return true;
  }

  const reservationAction = pathname.match(/^\/inventory\/reservations\/([^/]+)\/(release|consume|return)$/);
  if (reservationAction && request.method === 'POST') {
    const principal = rp(request, 'inventory.manage');
    const reservationId = requireNonEmptyString(reservationAction[1], 'reservationId');
    const action = reservationAction[2];
    const reservation = await runCommand({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: `inventory.reservations.${action}`,
      payload: { reservationId, action },
      command: async () => {
        const result =
          action === 'release'
            ? await inventory.releaseReservation(
                principal.user.accountId as never,
                principal.user.id as never,
                reservationId as never
              )
            : action === 'consume'
              ? await inventory.consumeReservation(
                  principal.user.accountId as never,
                  principal.user.id as never,
                  reservationId as never
                )
              : await inventory.returnReservation(
                  principal.user.accountId as never,
                  principal.user.id as never,
                  reservationId as never
                );
        await appendAuditAndWait(audit, {
          actorId: principal.user.id,
          accountId: principal.user.accountId,
          module: 'inventory',
          action: `${action}_stock_reservation`,
          entityType: 'inventory-reservation',
          entityId: result.id,
          payloadSummary: `Inventory reservation ${result.id} transitioned to ${result.status}`,
          riskLevel: 'high',
          correlationId
        });
        return result;
      }
    });
    response.statusCode = 200;
    response.end(JSON.stringify(reservation));
    return true;
  }

  // GET /inventory/consumptions
  if (pathname === '/inventory/consumptions' && request.method === 'GET') {
    const principal = rp(request, 'inventory.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const encounterId = url.searchParams.get('encounterId') ?? undefined;
    const items = inventory.listConsumptionsByAccount(
      principal.user.accountId as never,
      encounterId
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inventory',
      action: 'list_consumptions',
      entityType: 'inventory-consumption',
      entityId: encounterId ?? 'all',
      payloadSummary: 'Inventory consumptions listed',
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  // POST /inventory/consumptions
  if (pathname === '/inventory/consumptions' && request.method === 'POST') {
    const principal = rp(request, 'inventory.manage');
    const payload = (await readJsonBody(request)) as CreateInventoryConsumptionRequest;
    const consumption = await runCommand({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'inventory.consumptions.create',
      payload: payload as unknown as JsonValue,
      command: async () => {
        const created = await inventory.consume(
          principal.user.id as never,
          payload,
          principal.user.accountId
        );
        await appendAuditAndWait(audit, {
          actorId: principal.user.id,
          accountId: principal.user.accountId,
          module: 'inventory',
          action: 'consume',
          entityType: 'inventory-consumption',
          entityId: created.id,
          payloadSummary: `Inventory consumption recorded for item ${created.inventoryItemId}`,
          riskLevel: 'high',
          correlationId
        });
        return created;
      }
    });
    response.statusCode = 201;
    response.end(JSON.stringify(consumption));
    return true;
  }

  // GET /inventory/lots
  if (pathname === '/inventory/lots' && request.method === 'GET') {
    const principal = rp(request, 'inventory.read');
    const items = inventory.listLots(principal.user.accountId as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inventory',
      action: 'list_lots',
      entityType: 'inventory-lot',
      entityId: 'all',
      payloadSummary: 'Inventory lots listed',
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  // GET /inventory/movements
  if (pathname === '/inventory/movements' && request.method === 'GET') {
    const principal = rp(request, 'inventory.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const inventoryItemId = url.searchParams.get('inventoryItemId') ?? undefined;
    const items = inventory.listStockMovements(principal.user.accountId as never, inventoryItemId);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inventory',
      action: 'list_stock_movements',
      entityType: 'inventory-stock-movement',
      entityId: inventoryItemId ?? 'all',
      payloadSummary: 'Inventory stock movements listed',
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  // POST /inventory/adjustments
  if (pathname === '/inventory/adjustments' && request.method === 'POST') {
    const principal = rp(request, 'inventory.manage');
    const payload = (await readJsonBody(request)) as CreateInventoryStockAdjustmentRequest;
    enforceAbac(
      'inventory.manage',
      principal,
      {
        resourceType: 'inventory_item',
        resourceId: payload.inventoryItemId,
        accountId: principal.user.accountId as never
      },
      request
    );
    const movement = await runCommand({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'inventory.adjustments.create',
      payload: payload as unknown as JsonValue,
      command: async () => {
        const created = await inventory.createStockAdjustment(
          principal.user.accountId as never,
          principal.user.id as never,
          payload
        );
        await appendAuditAndWait(audit, {
          actorId: principal.user.id,
          accountId: principal.user.accountId,
          module: 'inventory',
          action: 'create_stock_adjustment',
          entityType: 'inventory-stock-movement',
          entityId: created.id,
          payloadSummary: `Inventory stock adjusted for item ${created.inventoryItemId}: ${created.quantityDelta}`,
          riskLevel: 'high',
          correlationId
        });
        return created;
      }
    });
    response.statusCode = 201;
    response.end(JSON.stringify(movement));
    return true;
  }

  // GET /inventory
  if (pathname === '/inventory' && request.method === 'GET') {
    const principal = rp(request, 'inventory.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const search = url.searchParams.get('search') ?? undefined;
    const items = inventory.listItems(principal.user.accountId as never, { search });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inventory',
      action: 'list',
      entityType: 'inventory-item',
      entityId: search ?? 'all',
      payloadSummary: 'Inventory items listed',
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  // POST /inventory
  if (pathname === '/inventory' && request.method === 'POST') {
    const principal = rp(request, 'inventory.manage');
    const payload = (await readJsonBody(request)) as CreateInventoryItemRequest;
    enforceAbac(
      'inventory.manage',
      principal,
      {
        resourceType: 'inventory_item',
        resourceId: 'new',
        accountId: principal.user.accountId as never
      },
      request
    );
    const item = await runCommand({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'inventory.items.create',
      payload: payload as unknown as JsonValue,
      command: async () => {
        const created = await inventory.createItem(principal.user.accountId, payload);
        await appendAuditAndWait(audit, {
          actorId: principal.user.id,
          accountId: principal.user.accountId,
          module: 'inventory',
          action: 'create',
          entityType: 'inventory-item',
          entityId: created.id,
          payloadSummary: `Inventory item ${created.name} created`,
          riskLevel: 'high',
          correlationId
        });
        return created;
      }
    });
    response.statusCode = 201;
    response.end(JSON.stringify(item));
    return true;
  }

  // GET /inventory/:itemId
  if (pathname.startsWith('/inventory/') && request.method === 'GET') {
    const itemId = requireNonEmptyString(pathname.split('/')[2], 'inventoryItemId');
    const principal = rp(request, 'inventory.read');
    try {
      const item = inventory.getItemOrThrow(itemId as never, principal.user.accountId);
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'inventory',
        action: 'read',
        entityType: 'inventory-item',
        entityId: item.id,
        payloadSummary: `Inventory item ${item.name} inspected`,
        riskLevel: 'medium',
        correlationId
      });
      response.statusCode = 200;
      response.end(JSON.stringify(item));
      return true;
    } catch {
      response.statusCode = 404;
      response.end(
        JSON.stringify({
          code: 'NOT_FOUND',
          message: 'Inventory item not found',
          correlationId
        })
      );
      return true;
    }
  }

  // PATCH /inventory/:itemId
  if (pathname.startsWith('/inventory/') && request.method === 'PATCH') {
    const itemId = requireNonEmptyString(pathname.split('/')[2], 'inventoryItemId');
    const principal = rp(request, 'inventory.manage');
    const payload = (await readJsonBody(request)) as UpdateInventoryItemRequest;
    enforceAbac(
      'inventory.manage',
      principal,
      {
        resourceType: 'inventory_item',
        resourceId: itemId,
        accountId: principal.user.accountId as never
      },
      request
    );
    try {
      const item = await runCommand({
        request,
        accountId: principal.user.accountId,
        actorUserId: principal.user.id,
        correlationId,
        operation: 'inventory.items.update',
        payload: { itemId, ...payload } as unknown as JsonValue,
        command: async () => {
          const updated = await inventory.updateItem(principal.user.accountId, itemId as never, payload);
          await appendAuditAndWait(audit, {
            actorId: principal.user.id,
            accountId: principal.user.accountId,
            module: 'inventory',
            action: 'update',
            entityType: 'inventory-item',
            entityId: updated.id,
            payloadSummary: `Inventory item ${updated.name} updated`,
            riskLevel: 'high',
            correlationId
          });
          return updated;
        }
      });
      response.statusCode = 200;
      response.end(JSON.stringify(item));
      return true;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('not found')) {
        response.statusCode = 404;
        response.end(
          JSON.stringify({
            code: 'NOT_FOUND',
            message: 'Inventory item not found',
            correlationId
          })
        );
        return true;
      }
      throw err;
    }
  }

  return false;
}
