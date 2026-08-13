/**
 * Inventory route handlers.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { InventoryService } from '@cvg-his-v2/module-inventory';
import type {
  CreateInventoryConsumptionRequest,
  CreateInventoryItemRequest,
  CreateInventoryStockAdjustmentRequest,
  UpdateInventoryItemRequest
} from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import type { ResourceAttributes } from '@cvg-his-v2/module-access-control';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface InventoryRoutesHandlers {
  inventory: InventoryService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
  enforceAbac: (
    actionCode: string,
    principal: AuthenticatedPrincipal,
    attrs: ResourceAttributes,
    request: IncomingMessage
  ) => void;
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
    const consumption = await inventory.consume(
      principal.user.accountId as never,
      principal.user.id as never,
      payload
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inventory',
      action: 'consume',
      entityType: 'inventory-consumption',
      entityId: consumption.id,
      payloadSummary: `Inventory consumption recorded for item ${consumption.inventoryItemId}`,
      riskLevel: 'high',
      correlationId
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
    const movement = await inventory.createStockAdjustment(
      principal.user.accountId as never,
      principal.user.id as never,
      payload
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inventory',
      action: 'create_stock_adjustment',
      entityType: 'inventory-stock-movement',
      entityId: movement.id,
      payloadSummary: `Inventory stock adjusted for item ${movement.inventoryItemId}: ${movement.quantityDelta}`,
      riskLevel: 'high',
      correlationId
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
    const item = await inventory.createItem(
      principal.user.accountId,
      principal.user.id as never,
      payload
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inventory',
      action: 'create',
      entityType: 'inventory-item',
      entityId: item.id,
      payloadSummary: `Inventory item ${item.name} created`,
      riskLevel: 'high',
      correlationId
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
      const item = inventory.getItemOrThrow(principal.user.accountId as never, itemId as never);
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
      const item = await inventory.updateItem(
        principal.user.accountId as never,
        principal.user.id as never,
        itemId as never,
        payload
      );
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'inventory',
        action: 'update',
        entityType: 'inventory-item',
        entityId: item.id,
        payloadSummary: `Inventory item ${item.name} updated`,
        riskLevel: 'high',
        correlationId
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
