import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

import { getPool } from '@cvg-his-v2/shared-database';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import { getAppState } from '../app-state.js';
import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface InventoryManufacturerItem {
  id: string;
  accountId: string;
  displayId: number;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryManufacturerPayload {
  name: string;
  active?: boolean;
}

export interface InventoryManufacturerFilters {
  search?: string;
  active?: boolean;
}

export interface InventoryManufacturerPersistence {
  list(accountId: string, filters?: InventoryManufacturerFilters): Promise<InventoryManufacturerItem[]>;
  create(accountId: string, payload: InventoryManufacturerPayload): Promise<InventoryManufacturerItem>;
  update(accountId: string, manufacturerId: string, payload: InventoryManufacturerPayload): Promise<{ item: InventoryManufacturerItem; diffSummary: string }>;
  remove(accountId: string, manufacturerId: string): Promise<InventoryManufacturerItem>;
}

export interface InventoryManufacturerHandlers {
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
  store?: InventoryManufacturerPersistence;
}

const collectionPaths = new Set([
  '/manufacturers',
  '/fabricantes',
  '/estoque/fabricantes',
  '/estoque/cadastros/fabricantes'
]);

let databasePersistence: InventoryManufacturerPersistence | null = null;

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function parseManufacturerId(pathname: string): string | null {
  const match = pathname.match(/^\/(?:manufacturers|fabricantes)\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function normalizeSearch(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function normalizePayload(payload: Partial<InventoryManufacturerPayload>): InventoryManufacturerPayload {
  return {
    name: String(payload.name ?? '').trim(),
    active: payload.active ?? true
  };
}

function validatePayload(payload: InventoryManufacturerPayload): string | null {
  if (!payload.name) return 'name is required';
  if (payload.name.length > 160) return 'name must have at most 160 characters';
  return null;
}

function summarizeManufacturer(item: InventoryManufacturerItem): string {
  return `id=${item.displayId} | name=${item.name} | active=${item.active}`;
}

function diffManufacturer(previous: InventoryManufacturerItem, current: InventoryManufacturerItem): string {
  const changes: string[] = [];
  if (previous.name !== current.name) {
    changes.push(`name: ${previous.name} -> ${current.name}`);
  }
  if (previous.active !== current.active) {
    changes.push(`active: ${previous.active} -> ${current.active}`);
  }
  return changes.join('; ');
}

function mapManufacturerRow(row: Record<string, unknown>): InventoryManufacturerItem {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    displayId: Number(row.display_id),
    name: String(row.name),
    active: Boolean(row.active),
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString()
  };
}

class DatabaseInventoryManufacturerRepository implements InventoryManufacturerPersistence {
  async list(accountId: string, filters: InventoryManufacturerFilters = {}): Promise<InventoryManufacturerItem[]> {
    const params: unknown[] = [accountId];
    const conditions = ['account_id = $1'];

    if (filters.active !== false) {
      conditions.push('active = true');
    }

    const search = normalizeSearch(filters.search);
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(LOWER(name) LIKE $${params.length} OR display_id::text LIKE $${params.length})`);
    }

    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `SELECT id, account_id, display_id, name, active, created_at, updated_at
         FROM inventory_manufacturers
         WHERE ${conditions.join(' AND ')}
         ORDER BY display_id DESC, name ASC`,
        params
      )
    );
    return result.rows.map(mapManufacturerRow);
  }

  async create(accountId: string, payload: InventoryManufacturerPayload): Promise<InventoryManufacturerItem> {
    const id = randomUUID();
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `WITH next_id AS (
           SELECT COALESCE(MAX(display_id), 0) + 1 AS display_id
           FROM inventory_manufacturers
           WHERE account_id = $1
         )
         INSERT INTO inventory_manufacturers (id, account_id, display_id, name, active)
         SELECT $2, $1, next_id.display_id, $3, $4
         FROM next_id
         RETURNING id, account_id, display_id, name, active, created_at, updated_at`,
        [accountId, id, payload.name, payload.active ?? true]
      )
    );
    return mapManufacturerRow(result.rows[0]);
  }

  async update(accountId: string, manufacturerId: string, payload: InventoryManufacturerPayload): Promise<{ item: InventoryManufacturerItem; diffSummary: string }> {
    const previous = await this.findById(accountId, manufacturerId);
    if (!previous) throw new Error('Manufacturer not found');
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `UPDATE inventory_manufacturers
         SET name = $3,
             active = $4,
             updated_at = NOW()
         WHERE account_id = $1 AND id = $2
         RETURNING id, account_id, display_id, name, active, created_at, updated_at`,
        [accountId, manufacturerId, payload.name, payload.active ?? previous.active]
      )
    );
    const item = mapManufacturerRow(result.rows[0]);
    return { item, diffSummary: diffManufacturer(previous, item) };
  }

  async remove(accountId: string, manufacturerId: string): Promise<InventoryManufacturerItem> {
    const previous = await this.findById(accountId, manufacturerId);
    if (!previous) throw new Error('Manufacturer not found');
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `UPDATE inventory_manufacturers
         SET active = false,
             updated_at = NOW()
         WHERE account_id = $1 AND id = $2
         RETURNING id, account_id, display_id, name, active, created_at, updated_at`,
        [accountId, manufacturerId]
      )
    );
    return mapManufacturerRow(result.rows[0]);
  }

  private async findById(accountId: string, manufacturerId: string): Promise<InventoryManufacturerItem | null> {
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `SELECT id, account_id, display_id, name, active, created_at, updated_at
         FROM inventory_manufacturers
         WHERE account_id = $1 AND id = $2
         LIMIT 1`,
        [accountId, manufacturerId]
      )
    );
    return result.rows[0] ? mapManufacturerRow(result.rows[0]) : null;
  }
}

function resolveStore(override?: InventoryManufacturerPersistence): InventoryManufacturerPersistence | null {
  if (override) return override;
  const state = getAppState();
  if (state.initialized && state.persistenceMode !== 'database') return null;
  databasePersistence ??= new DatabaseInventoryManufacturerRepository();
  return databasePersistence;
}

export async function handleInventoryManufacturersRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: InventoryManufacturerHandlers
): Promise<boolean> {
  const manufacturerId = parseManufacturerId(pathname);
  if (!collectionPaths.has(pathname) && !manufacturerId) return false;

  const store = resolveStore(handlers.store);
  if (!store) {
    return json(response, 503, {
      code: 'PERSISTENCE_UNAVAILABLE',
      message: 'Inventory manufacturers require database persistence',
      correlationId
    });
  }

  if (collectionPaths.has(pathname) && request.method === 'GET') {
    const principal = await handlers.requirePrincipal(request, 'inventory.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const items = await store.list(principal.user.accountId, {
      search: url.searchParams.get('search') ?? url.searchParams.get('q') ?? undefined,
      active: url.searchParams.get('active') === 'false' ? false : true
    });
    appendAudit(handlers.audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inventory',
      action: 'list_manufacturers',
      entityType: 'inventory-manufacturer',
      entityId: 'all',
      payloadSummary: 'Inventory manufacturers listed',
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, { items, totalItems: items.length });
  }

  if (collectionPaths.has(pathname) && request.method === 'POST') {
    const principal = await handlers.requirePrincipal(request, 'inventory.manage');
    const payload = normalizePayload((await readJsonBody(request)) as Partial<InventoryManufacturerPayload>);
    const validationError = validatePayload(payload);
    if (validationError) {
      return json(response, 400, { code: 'VALIDATION_ERROR', message: validationError, correlationId });
    }
    const item = await store.create(principal.user.accountId, payload);
    appendAudit(handlers.audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inventory',
      action: 'create_manufacturer',
      entityType: 'inventory-manufacturer',
      entityId: item.id,
      payloadSummary: `Inventory manufacturer created | ${summarizeManufacturer(item)}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, item);
  }

  if (manufacturerId && request.method === 'PATCH') {
    const principal = await handlers.requirePrincipal(request, 'inventory.manage');
    const payload = normalizePayload((await readJsonBody(request)) as Partial<InventoryManufacturerPayload>);
    const validationError = validatePayload(payload);
    if (validationError) {
      return json(response, 400, { code: 'VALIDATION_ERROR', message: validationError, correlationId });
    }
    try {
      const { item, diffSummary } = await store.update(principal.user.accountId, manufacturerId, payload);
      appendAudit(handlers.audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'inventory',
        action: 'update_manufacturer',
        entityType: 'inventory-manufacturer',
        entityId: item.id,
        payloadSummary: `Inventory manufacturer updated | ${summarizeManufacturer(item)} | changes=${diffSummary || 'no material field changes detected'}`,
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 200, item);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return json(response, 404, { code: 'NOT_FOUND', message: 'Manufacturer not found', correlationId });
      }
      throw error;
    }
  }

  if (manufacturerId && request.method === 'DELETE') {
    const principal = await handlers.requirePrincipal(request, 'inventory.manage');
    try {
      const item = await store.remove(principal.user.accountId, manufacturerId);
      appendAudit(handlers.audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'inventory',
        action: 'archive_manufacturer',
        entityType: 'inventory-manufacturer',
        entityId: item.id,
        payloadSummary: `Inventory manufacturer archived | ${summarizeManufacturer(item)}`,
        riskLevel: 'medium',
        correlationId
      });
      response.statusCode = 204;
      response.end();
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return json(response, 404, { code: 'NOT_FOUND', message: 'Manufacturer not found', correlationId });
      }
      throw error;
    }
  }

  return false;
}
