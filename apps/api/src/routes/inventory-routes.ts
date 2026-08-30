/**
 * Inventory route handlers.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { BillingService } from '@cvg-his-v2/module-billing';
import { INVENTORY_CONSUMPTION_CREATED } from '@cvg-his-v2/module-event-bus';
import type { InpatientService } from '@cvg-his-v2/module-inpatient';
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
import {
  getDatabaseTransactionScope,
  getTenantTransactionContext,
  runWithoutDatabaseTransactionScope,
  type JsonValue
} from '@cvg-his-v2/shared-database';
import { AppError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type { ResourceAttributes } from '@cvg-his-v2/module-access-control';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit, appendAuditAndWait } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';
import type { TenantCommandInput, TenantCommandRunner } from '../helpers/tenant-command.js';

export interface InventoryRoutesHandlers {
  inventory: InventoryService;
  billing?: BillingService;
  inpatient?: InpatientService;
  /** Refresh authoritative tenant state before a cross-instance mutation. */
  refreshAccount?: (accountId: string) => Promise<void>;
  procurement: ProcurementService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
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
  const {
    inventory,
    billing,
    inpatient,
    audit,
    requirePrincipal: rp,
    enforceAbac,
    refreshAccount
  } = handlers;
  const runCommand =
    handlers.runCommand ?? (async <T>(input: TenantCommandInput<T>) => input.command());

  if (pathname === '/inventory/purchases' && request.method === 'GET') {
    const principal = await rp(request, 'inventory.read');
    const purchases = handlers.procurement.listPurchases(principal.user.accountId as never);
    response.statusCode = 200;
    response.end(JSON.stringify({ items: purchases }));
    return true;
  }

  if (pathname === '/inventory/purchases' && request.method === 'POST') {
    const principal = await rp(request, 'inventory.manage');
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

  if (
    pathname.startsWith('/inventory/purchases/') &&
    pathname.endsWith('/approve') &&
    request.method === 'POST'
  ) {
    const principal = await rp(request, 'inventory.manage');
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

  if (
    pathname.startsWith('/inventory/purchases/') &&
    pathname.endsWith('/receive') &&
    request.method === 'POST'
  ) {
    const principal = await rp(request, 'inventory.manage');
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

  if (
    pathname.startsWith('/inventory/purchases/') &&
    pathname.endsWith('/cancel') &&
    request.method === 'POST'
  ) {
    const principal = await rp(request, 'inventory.manage');
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
    const principal = await rp(request, 'inventory.read');
    const transfers = handlers.procurement.listTransfers(principal.user.accountId as never);
    response.statusCode = 200;
    response.end(JSON.stringify({ items: transfers }));
    return true;
  }

  if (pathname === '/inventory/transfers' && request.method === 'POST') {
    const principal = await rp(request, 'inventory.manage');
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
    const principal = await rp(request, 'inventory.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const status = url.searchParams.get('status') ?? undefined;
    const items = inventory.listReservations(principal.user.accountId as never, status as never);
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  if (pathname === '/inventory/reservations' && request.method === 'POST') {
    const principal = await rp(request, 'inventory.manage');
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

  const reservationAction = pathname.match(
    /^\/inventory\/reservations\/([^/]+)\/(release|consume|return)$/
  );
  if (reservationAction && request.method === 'POST') {
    const principal = await rp(request, 'inventory.manage');
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
    const principal = await rp(request, 'inventory.read');
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
    const principal = await rp(request, 'inventory.manage');
    const payload = (await readJsonBody(request)) as CreateInventoryConsumptionRequest;
    // Inventory charge capture can be retried on a different API replica than
    // the admission command. Hydrate committed tenant state before resolving
    // the stay, encounter, item and lot from process-local caches.
    await refreshAccount?.(principal.user.accountId);
    let consumption: Awaited<ReturnType<InventoryService['consume']>>;
    try {
      consumption = await runCommand({
        request,
        accountId: principal.user.accountId,
        actorUserId: principal.user.id,
        correlationId,
        operation: 'inventory.consumptions.create',
        payload: payload as unknown as JsonValue,
        command: async () => {
          const inpatientCharge = payload.sourceEntityType === 'inpatient_stay';
          const chargeSourceId = inpatientCharge
            ? requireNonEmptyString(payload.sourceEntityId, 'sourceEntityId')
            : undefined;
          const item = inventory.getItemOrThrow(
            payload.inventoryItemId as never,
            principal.user.accountId as never
          );

          if (inpatientCharge) {
            if (!inpatient || !billing) {
              throw new AppError(
                'BILLING_UNAVAILABLE',
                'Inpatient inventory consumption billing is not configured',
                503
              );
            }
            const stay = inpatient.getOrThrow(
              chargeSourceId as never,
              principal.user.accountId as never
            );
            if (
              stay.accountId !== principal.user.accountId ||
              stay.encounterId !== payload.encounterId
            ) {
              throw new NotFoundError('Inpatient stay not found', { stayId: chargeSourceId });
            }
            if (!item.chargeUnitPriceAmount || item.chargeUnitPriceAmount <= 0) {
              throw new AppError(
                'PRICE_SOURCE_REQUIRED',
                'Inventory item has no configured charge price',
                422,
                { inventoryItemId: item.id }
              );
            }
          }

          const transaction = getTenantTransactionContext();
          if (inventory.persistenceMode === 'database' && !transaction) {
            throw new AppError(
              'TRANSACTION_REQUIRED',
              'Inventory consumption requires the canonical tenant transaction context',
              503
            );
          }

          const created = await inventory.consume(
            principal.user.id as never,
            payload,
            principal.user.accountId
          );

          let billingItemId: string | undefined;

          if (inpatientCharge) {
            const billingItem = await billing!.addItem(principal.user.id as never, {
              encounterId: created.encounterId,
              itemType: 'supply',
              description: `Consumo de ${item.name} na internacao`,
              quantity: created.quantity,
              unitPriceAmount: item.chargeUnitPriceAmount!,
              sourceEntityType: 'inventory_consumption',
              sourceEntityId: created.id
            });
            billingItemId = billingItem.id;
            await appendAuditAndWait(audit, {
              actorId: principal.user.id,
              accountId: principal.user.accountId,
              module: 'billing',
              action: 'capture_inventory_consumption_charge',
              entityType: 'billing-item',
              entityId: billingItem.id,
              payloadSummary: `Billing item ${billingItem.id} captured from inventory consumption ${created.id}`,
              riskLevel: 'high',
              correlationId
            });
          }

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
          if (transaction) {
            await transaction.outbox.append({
              moduleName: 'inventory',
              eventType: INVENTORY_CONSUMPTION_CREATED,
              payload: {
                consumptionId: created.id,
                inventoryItemId: created.inventoryItemId,
                encounterId: created.encounterId,
                patientId: created.patientId,
                quantity: created.quantity,
                unit: created.unit,
                costAmount: created.costAmount,
                sourceEntityType: created.sourceEntityType,
                ...(created.sourceEntityId === undefined
                  ? {}
                  : { sourceEntityId: created.sourceEntityId }),
                ...(billingItemId === undefined ? {} : { billingItemId })
              }
            });
          }
          return created;
        }
      });
    } catch (error) {
      const refreshCaches = async (): Promise<void> => {
        const refreshOperations: Promise<unknown>[] = [];
        if (inventory.persistenceMode === 'database') {
          refreshOperations.push(inventory.hydrateFromDatabase(principal.user.accountId as never));
        }
        if (billing && typeof billing.refreshFromDatabase === 'function') {
          refreshOperations.push(billing.refreshFromDatabase(principal.user.accountId as never));
        }
        if (typeof audit.refreshFromDatabase === 'function') {
          refreshOperations.push(audit.refreshFromDatabase(principal.user.accountId as never));
        }
        await Promise.allSettled(refreshOperations);
      };
      if (getDatabaseTransactionScope()) {
        setImmediate(() => {
          runWithoutDatabaseTransactionScope(() => {
            void refreshCaches();
          });
        });
      } else {
        await refreshCaches();
      }
      throw error;
    }
    response.statusCode = 201;
    response.end(JSON.stringify(consumption));
    return true;
  }

  // GET /inventory/lots
  if (pathname === '/inventory/lots' && request.method === 'GET') {
    const principal = await rp(request, 'inventory.read');
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
    const principal = await rp(request, 'inventory.read');
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
    const principal = await rp(request, 'inventory.manage');
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
    const principal = await rp(request, 'inventory.read');
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
    const principal = await rp(request, 'inventory.manage');
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
    const principal = await rp(request, 'inventory.read');
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
    const principal = await rp(request, 'inventory.manage');
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
          const updated = await inventory.updateItem(
            principal.user.accountId,
            itemId as never,
            payload
          );
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
