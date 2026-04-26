import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

import { getPool } from '@cvg-his-v2/shared-database';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import { getAppState } from '../app-state.js';
import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface InventoryWarehouseItem {
  id: string;
  accountId: string;
  displayId: number;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryWarehousePayload {
  description: string;
  active?: boolean;
}

export interface InventoryWarehouseFilters {
  search?: string;
  active?: boolean;
}

export interface InventoryWarehousePersistence {
  list(accountId: string, filters?: InventoryWarehouseFilters): Promise<InventoryWarehouseItem[]>;
  create(accountId: string, payload: InventoryWarehousePayload): Promise<InventoryWarehouseItem>;
  update(accountId: string, warehouseId: string, payload: InventoryWarehousePayload): Promise<{ item: InventoryWarehouseItem; diffSummary: string }>;
  remove(accountId: string, warehouseId: string): Promise<InventoryWarehouseItem>;
}

export interface InventoryWarehouseHandlers {
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
  store?: InventoryWarehousePersistence;
}

const collectionPaths = new Set([
  '/warehouses',
  '/estoques',
  '/estoque/estoques',
  '/estoque/cadastros/estoques'
]);

let databasePersistence: InventoryWarehousePersistence | null = null;

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function parseWarehouseId(pathname: string): string | null {
  const match = pathname.match(/^\/(?:warehouses|estoques)\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function normalizeSearch(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function normalizePayload(payload: Partial<InventoryWarehousePayload>): InventoryWarehousePayload {
  return {
    description: String(payload.description ?? '').trim(),
    active: payload.active ?? true
  };
}

function validatePayload(payload: InventoryWarehousePayload): string | null {
  if (!payload.description) return 'description is required';
  if (payload.description.length > 160) return 'description must have at most 160 characters';
  return null;
}

function summarizeWarehouse(item: InventoryWarehouseItem): string {
  return `id=${item.displayId} | description=${item.description} | active=${item.active}`;
}

function diffWarehouse(previous: InventoryWarehouseItem, current: InventoryWarehouseItem): string {
  const changes: string[] = [];
  if (previous.description !== current.description) {
    changes.push(`description: ${previous.description} -> ${current.description}`);
  }
  if (previous.active !== current.active) {
    changes.push(`active: ${previous.active} -> ${current.active}`);
  }
  return changes.join('; ');
}

function mapWarehouseRow(row: Record<string, unknown>): InventoryWarehouseItem {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    displayId: Number(row.display_id),
    description: String(row.description),
    active: Boolean(row.active),
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString()
  };
}

class DatabaseInventoryWarehouseRepository implements InventoryWarehousePersistence {
  async list(accountId: string, filters: InventoryWarehouseFilters = {}): Promise<InventoryWarehouseItem[]> {
    const params: unknown[] = [accountId];
    const conditions = ['account_id = $1'];

    if (filters.active !== false) {
      conditions.push('active = true');
    }

    const search = normalizeSearch(filters.search);
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(LOWER(description) LIKE $${params.length} OR display_id::text LIKE $${params.length})`);
    }

    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `SELECT id, account_id, display_id, description, active, created_at, updated_at
         FROM inventory_warehouses
         WHERE ${conditions.join(' AND ')}
         ORDER BY display_id DESC, description ASC`,
        params
      )
    );
    return result.rows.map(mapWarehouseRow);
  }

  async create(accountId: string, payload: InventoryWarehousePayload): Promise<InventoryWarehouseItem> {
    const id = randomUUID();
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `WITH next_id AS (
           SELECT COALESCE(MAX(display_id), 0) + 1 AS display_id
           FROM inventory_warehouses
           WHERE account_id = $1
         )
         INSERT INTO inventory_warehouses (id, account_id, display_id, description, active)
         SELECT $2, $1, next_id.display_id, $3, $4
         FROM next_id
         RETURNING id, account_id, display_id, description, active, created_at, updated_at`,
        [accountId, id, payload.description, payload.active ?? true]
      )
    );
    return mapWarehouseRow(result.rows[0]);
  }

  async update(accountId: string, warehouseId: string, payload: InventoryWarehousePayload): Promise<{ item: InventoryWarehouseItem; diffSummary: string }> {
    const previous = await this.findById(accountId, warehouseId);
    if (!previous) throw new Error('Warehouse not found');
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `UPDATE inventory_warehouses
         SET description = $3,
             active = $4,
             updated_at = NOW()
         WHERE account_id = $1 AND id = $2
         RETURNING id, account_id, display_id, description, active, created_at, updated_at`,
        [accountId, warehouseId, payload.description, payload.active ?? previous.active]
      )
    );
    const item = mapWarehouseRow(result.rows[0]);
    return { item, diffSummary: diffWarehouse(previous, item) };
  }

  async remove(accountId: string, warehouseId: string): Promise<InventoryWarehouseItem> {
    const previous = await this.findById(accountId, warehouseId);
    if (!previous) throw new Error('Warehouse not found');
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `UPDATE inventory_warehouses
         SET active = false,
             updated_at = NOW()
         WHERE account_id = $1 AND id = $2
         RETURNING id, account_id, display_id, description, active, created_at, updated_at`,
        [accountId, warehouseId]
      )
    );
    return mapWarehouseRow(result.rows[0]);
  }

  private async findById(accountId: string, warehouseId: string): Promise<InventoryWarehouseItem | null> {
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `SELECT id, account_id, display_id, description, active, created_at, updated_at
         FROM inventory_warehouses
         WHERE account_id = $1 AND id = $2
         LIMIT 1`,
        [accountId, warehouseId]
      )
    );
    return result.rows[0] ? mapWarehouseRow(result.rows[0]) : null;
  }
}

function resolveStore(override?: InventoryWarehousePersistence): InventoryWarehousePersistence | null {
  if (override) return override;
  const state = getAppState();
  if (state.initialized && state.persistenceMode !== 'database') return null;
  databasePersistence ??= new DatabaseInventoryWarehouseRepository();
  return databasePersistence;
}

export async function handleInventoryWarehousesRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: InventoryWarehouseHandlers
): Promise<boolean> {
  const warehouseId = parseWarehouseId(pathname);
  if (!collectionPaths.has(pathname) && !warehouseId) return false;

  const store = resolveStore(handlers.store);
  if (!store) {
    return json(response, 503, {
      code: 'PERSISTENCE_UNAVAILABLE',
      message: 'Inventory warehouses require database persistence',
      correlationId
    });
  }

  if (collectionPaths.has(pathname) && request.method === 'GET') {
    const principal = handlers.requirePrincipal(request, 'inventory.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const items = await store.list(principal.user.accountId, {
      search: url.searchParams.get('search') ?? url.searchParams.get('q') ?? undefined,
      active: url.searchParams.get('active') === 'false' ? false : true
    });
    appendAudit(handlers.audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inventory',
      action: 'list_warehouses',
      entityType: 'inventory-warehouse',
      entityId: 'all',
      payloadSummary: 'Inventory warehouses listed',
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, { items, totalItems: items.length });
  }

  if (collectionPaths.has(pathname) && request.method === 'POST') {
    const principal = handlers.requirePrincipal(request, 'inventory.manage');
    const payload = normalizePayload((await readJsonBody(request)) as Partial<InventoryWarehousePayload>);
    const validationError = validatePayload(payload);
    if (validationError) {
      return json(response, 400, { code: 'VALIDATION_ERROR', message: validationError, correlationId });
    }
    const item = await store.create(principal.user.accountId, payload);
    appendAudit(handlers.audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inventory',
      action: 'create_warehouse',
      entityType: 'inventory-warehouse',
      entityId: item.id,
      payloadSummary: `Inventory warehouse created | ${summarizeWarehouse(item)}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, item);
  }

  if (warehouseId && request.method === 'PATCH') {
    const principal = handlers.requirePrincipal(request, 'inventory.manage');
    const payload = normalizePayload((await readJsonBody(request)) as Partial<InventoryWarehousePayload>);
    const validationError = validatePayload(payload);
    if (validationError) {
      return json(response, 400, { code: 'VALIDATION_ERROR', message: validationError, correlationId });
    }
    try {
      const { item, diffSummary } = await store.update(principal.user.accountId, warehouseId, payload);
      appendAudit(handlers.audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'inventory',
        action: 'update_warehouse',
        entityType: 'inventory-warehouse',
        entityId: item.id,
        payloadSummary: `Inventory warehouse updated | ${summarizeWarehouse(item)} | changes=${diffSummary || 'no material field changes detected'}`,
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 200, item);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return json(response, 404, { code: 'NOT_FOUND', message: 'Warehouse not found', correlationId });
      }
      throw error;
    }
  }

  if (warehouseId && request.method === 'DELETE') {
    const principal = handlers.requirePrincipal(request, 'inventory.manage');
    try {
      const item = await store.remove(principal.user.accountId, warehouseId);
      appendAudit(handlers.audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'inventory',
        action: 'archive_warehouse',
        entityType: 'inventory-warehouse',
        entityId: item.id,
        payloadSummary: `Inventory warehouse archived | ${summarizeWarehouse(item)}`,
        riskLevel: 'medium',
        correlationId
      });
      response.statusCode = 204;
      response.end();
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return json(response, 404, { code: 'NOT_FOUND', message: 'Warehouse not found', correlationId });
      }
      throw error;
    }
  }

  return false;
}
