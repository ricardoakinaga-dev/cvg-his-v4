import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

import { getPool } from '@cvg-his-v2/shared-database';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import { getAppState } from '../app-state.js';
import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface InventoryProductGroupItem {
  id: string;
  accountId: string;
  displayId: number;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryProductGroupPayload {
  description: string;
  active?: boolean;
}

export interface InventoryProductGroupFilters {
  search?: string;
  active?: boolean;
}

export interface InventoryProductGroupPersistence {
  list(accountId: string, filters?: InventoryProductGroupFilters): Promise<InventoryProductGroupItem[]>;
  create(accountId: string, payload: InventoryProductGroupPayload): Promise<InventoryProductGroupItem>;
  update(accountId: string, groupId: string, payload: InventoryProductGroupPayload): Promise<{ item: InventoryProductGroupItem; diffSummary: string }>;
  remove(accountId: string, groupId: string): Promise<InventoryProductGroupItem>;
}

export interface InventoryProductGroupHandlers {
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
  store?: InventoryProductGroupPersistence;
}

const collectionPaths = new Set([
  '/product-groups',
  '/grupos-de-produto',
  '/grupos-de-produtos',
  '/grupos-produto',
  '/grupos-produtos',
  '/estoque/grupos-de-produto',
  '/estoque/grupos-de-produtos',
  '/estoque/cadastros/grupos-de-produto',
  '/estoque/cadastros/grupos-de-produtos'
]);

let databasePersistence: InventoryProductGroupPersistence | null = null;

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function parseProductGroupId(pathname: string): string | null {
  const match = pathname.match(/^\/(?:product-groups|grupos-de-produto|grupos-de-produtos|grupos-produto|grupos-produtos)\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function normalizeSearch(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function normalizePayload(payload: Partial<InventoryProductGroupPayload>): InventoryProductGroupPayload {
  return {
    description: String(payload.description ?? '').trim(),
    active: payload.active ?? true
  };
}

function validatePayload(payload: InventoryProductGroupPayload): string | null {
  if (!payload.description) return 'description is required';
  if (payload.description.length > 160) return 'description must have at most 160 characters';
  return null;
}

function summarizeProductGroup(item: InventoryProductGroupItem): string {
  return `id=${item.displayId} | description=${item.description} | active=${item.active}`;
}

function diffProductGroup(previous: InventoryProductGroupItem, current: InventoryProductGroupItem): string {
  const changes: string[] = [];
  if (previous.description !== current.description) {
    changes.push(`description: ${previous.description} -> ${current.description}`);
  }
  if (previous.active !== current.active) {
    changes.push(`active: ${previous.active} -> ${current.active}`);
  }
  return changes.join('; ');
}

function mapProductGroupRow(row: Record<string, unknown>): InventoryProductGroupItem {
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

class DatabaseInventoryProductGroupRepository implements InventoryProductGroupPersistence {
  async list(accountId: string, filters: InventoryProductGroupFilters = {}): Promise<InventoryProductGroupItem[]> {
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
         FROM inventory_product_groups
         WHERE ${conditions.join(' AND ')}
         ORDER BY display_id DESC, description ASC`,
        params
      )
    );
    return result.rows.map(mapProductGroupRow);
  }

  async create(accountId: string, payload: InventoryProductGroupPayload): Promise<InventoryProductGroupItem> {
    const id = randomUUID();
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `WITH next_id AS (
           SELECT COALESCE(MAX(display_id), 0) + 1 AS display_id
           FROM inventory_product_groups
           WHERE account_id = $1
         )
         INSERT INTO inventory_product_groups (id, account_id, display_id, description, active)
         SELECT $2, $1, next_id.display_id, $3, $4
         FROM next_id
         RETURNING id, account_id, display_id, description, active, created_at, updated_at`,
        [accountId, id, payload.description, payload.active ?? true]
      )
    );
    return mapProductGroupRow(result.rows[0]);
  }

  async update(accountId: string, groupId: string, payload: InventoryProductGroupPayload): Promise<{ item: InventoryProductGroupItem; diffSummary: string }> {
    const previous = await this.findById(accountId, groupId);
    if (!previous) throw new Error('Product group not found');
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `UPDATE inventory_product_groups
         SET description = $3,
             active = $4,
             updated_at = NOW()
         WHERE account_id = $1 AND id = $2
         RETURNING id, account_id, display_id, description, active, created_at, updated_at`,
        [accountId, groupId, payload.description, payload.active ?? previous.active]
      )
    );
    const item = mapProductGroupRow(result.rows[0]);
    return { item, diffSummary: diffProductGroup(previous, item) };
  }

  async remove(accountId: string, groupId: string): Promise<InventoryProductGroupItem> {
    const previous = await this.findById(accountId, groupId);
    if (!previous) throw new Error('Product group not found');
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `UPDATE inventory_product_groups
         SET active = false,
             updated_at = NOW()
         WHERE account_id = $1 AND id = $2
         RETURNING id, account_id, display_id, description, active, created_at, updated_at`,
        [accountId, groupId]
      )
    );
    return mapProductGroupRow(result.rows[0]);
  }

  private async findById(accountId: string, groupId: string): Promise<InventoryProductGroupItem | null> {
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `SELECT id, account_id, display_id, description, active, created_at, updated_at
         FROM inventory_product_groups
         WHERE account_id = $1 AND id = $2
         LIMIT 1`,
        [accountId, groupId]
      )
    );
    return result.rows[0] ? mapProductGroupRow(result.rows[0]) : null;
  }
}

function resolveStore(override?: InventoryProductGroupPersistence): InventoryProductGroupPersistence | null {
  if (override) return override;
  const state = getAppState();
  if (state.initialized && state.persistenceMode !== 'database') return null;
  databasePersistence ??= new DatabaseInventoryProductGroupRepository();
  return databasePersistence;
}

export async function handleInventoryProductGroupsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: InventoryProductGroupHandlers
): Promise<boolean> {
  const groupId = parseProductGroupId(pathname);
  if (!collectionPaths.has(pathname) && !groupId) return false;

  const store = resolveStore(handlers.store);
  if (!store) {
    return json(response, 503, {
      code: 'PERSISTENCE_UNAVAILABLE',
      message: 'Inventory product groups require database persistence',
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
      action: 'list_product_groups',
      entityType: 'inventory-product-group',
      entityId: 'all',
      payloadSummary: 'Inventory product groups listed',
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, { items, totalItems: items.length });
  }

  if (collectionPaths.has(pathname) && request.method === 'POST') {
    const principal = handlers.requirePrincipal(request, 'inventory.manage');
    const payload = normalizePayload((await readJsonBody(request)) as Partial<InventoryProductGroupPayload>);
    const validationError = validatePayload(payload);
    if (validationError) {
      return json(response, 400, { code: 'VALIDATION_ERROR', message: validationError, correlationId });
    }
    const item = await store.create(principal.user.accountId, payload);
    appendAudit(handlers.audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inventory',
      action: 'create_product_group',
      entityType: 'inventory-product-group',
      entityId: item.id,
      payloadSummary: `Inventory product group created | ${summarizeProductGroup(item)}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, item);
  }

  if (groupId && request.method === 'PATCH') {
    const principal = handlers.requirePrincipal(request, 'inventory.manage');
    const payload = normalizePayload((await readJsonBody(request)) as Partial<InventoryProductGroupPayload>);
    const validationError = validatePayload(payload);
    if (validationError) {
      return json(response, 400, { code: 'VALIDATION_ERROR', message: validationError, correlationId });
    }
    try {
      const { item, diffSummary } = await store.update(principal.user.accountId, groupId, payload);
      appendAudit(handlers.audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'inventory',
        action: 'update_product_group',
        entityType: 'inventory-product-group',
        entityId: item.id,
        payloadSummary: `Inventory product group updated | ${summarizeProductGroup(item)} | changes=${diffSummary || 'no material field changes detected'}`,
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 200, item);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return json(response, 404, { code: 'NOT_FOUND', message: 'Product group not found', correlationId });
      }
      throw error;
    }
  }

  if (groupId && request.method === 'DELETE') {
    const principal = handlers.requirePrincipal(request, 'inventory.manage');
    try {
      const item = await store.remove(principal.user.accountId, groupId);
      appendAudit(handlers.audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'inventory',
        action: 'archive_product_group',
        entityType: 'inventory-product-group',
        entityId: item.id,
        payloadSummary: `Inventory product group archived | ${summarizeProductGroup(item)}`,
        riskLevel: 'medium',
        correlationId
      });
      response.statusCode = 204;
      response.end();
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return json(response, 404, { code: 'NOT_FOUND', message: 'Product group not found', correlationId });
      }
      throw error;
    }
  }

  return false;
}
