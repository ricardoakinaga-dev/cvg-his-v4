import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

import { getPool } from '@cvg-his-v2/shared-database';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import { getAppState } from '../app-state.js';
import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface CompanySectorItem {
  id: string;
  accountId: string;
  code: string;
  name: string;
  kind: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySectorPayload {
  code: string;
  name: string;
  kind?: string;
  active?: boolean;
}

export interface CompanySectorFilters {
  search?: string;
  kind?: string;
  active?: boolean;
}

export interface CompanySectorPersistence {
  list(accountId: string, filters?: CompanySectorFilters): Promise<CompanySectorItem[]>;
  create(accountId: string, payload: CompanySectorPayload): Promise<CompanySectorItem>;
  update(accountId: string, sectorId: string, payload: CompanySectorPayload): Promise<{ item: CompanySectorItem; diffSummary: string }>;
  remove(accountId: string, sectorId: string): Promise<CompanySectorItem>;
}

export interface CompanySectorHandlers {
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
  store?: CompanySectorPersistence;
}

const collectionPaths = new Set([
  '/company-sectors',
  '/setores',
  '/setores-da-empresa',
  '/estoque/setores',
  '/estoque/setores-da-empresa',
  '/estoque/cadastros/setores',
  '/estoque/cadastros/setores-da-empresa'
]);

let databasePersistence: CompanySectorPersistence | null = null;

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function parseSectorId(pathname: string): string | null {
  const match = pathname.match(/^\/(?:company-sectors|setores|setores-da-empresa)\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function normalizeSearch(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function normalizeCode(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

function normalizePayload(payload: Partial<CompanySectorPayload>): CompanySectorPayload {
  return {
    code: normalizeCode(payload.code),
    name: String(payload.name ?? '').trim(),
    kind: String(payload.kind ?? 'other').trim() || 'other',
    active: payload.active ?? true
  };
}

function validatePayload(payload: CompanySectorPayload): string | null {
  if (!payload.code) return 'code is required';
  if (payload.code.length > 50) return 'code must have at most 50 characters';
  if (!payload.name) return 'name is required';
  if (payload.name.length > 160) return 'name must have at most 160 characters';
  if ((payload.kind ?? '').length > 50) return 'kind must have at most 50 characters';
  return null;
}

function summarizeSector(item: CompanySectorItem): string {
  return `code=${item.code} | name=${item.name} | kind=${item.kind} | active=${item.active}`;
}

function diffSector(previous: CompanySectorItem, current: CompanySectorItem): string {
  const changes: string[] = [];
  if (previous.code !== current.code) changes.push(`code: ${previous.code} -> ${current.code}`);
  if (previous.name !== current.name) changes.push(`name: ${previous.name} -> ${current.name}`);
  if (previous.kind !== current.kind) changes.push(`kind: ${previous.kind} -> ${current.kind}`);
  if (previous.active !== current.active) changes.push(`active: ${previous.active} -> ${current.active}`);
  return changes.join('; ');
}

function mapSectorRow(row: Record<string, unknown>): CompanySectorItem {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    code: String(row.code),
    name: String(row.name),
    kind: String(row.kind),
    active: Boolean(row.active),
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString()
  };
}

class DatabaseCompanySectorRepository implements CompanySectorPersistence {
  async list(accountId: string, filters: CompanySectorFilters = {}): Promise<CompanySectorItem[]> {
    const params: unknown[] = [accountId];
    const conditions = ['account_id = $1'];

    if (filters.active !== false) {
      conditions.push('active = true');
    }

    const kind = String(filters.kind ?? '').trim();
    if (kind) {
      params.push(kind);
      conditions.push(`kind = $${params.length}`);
    }

    const search = normalizeSearch(filters.search);
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(LOWER(code) LIKE $${params.length} OR LOWER(name) LIKE $${params.length})`);
    }

    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `SELECT id, account_id, code, name, kind, active, created_at, updated_at
         FROM sectors
         WHERE ${conditions.join(' AND ')}
         ORDER BY code ASC, name ASC`,
        params
      )
    );
    return result.rows.map(mapSectorRow);
  }

  async create(accountId: string, payload: CompanySectorPayload): Promise<CompanySectorItem> {
    const id = randomUUID();
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `INSERT INTO sectors (id, account_id, code, name, kind, active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, account_id, code, name, kind, active, created_at, updated_at`,
        [id, accountId, payload.code, payload.name, payload.kind ?? 'other', payload.active ?? true]
      )
    );
    return mapSectorRow(result.rows[0]);
  }

  async update(accountId: string, sectorId: string, payload: CompanySectorPayload): Promise<{ item: CompanySectorItem; diffSummary: string }> {
    const previous = await this.findById(accountId, sectorId);
    if (!previous) throw new Error('Company sector not found');
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `UPDATE sectors
         SET code = $3,
             name = $4,
             kind = $5,
             active = $6,
             updated_at = NOW()
         WHERE account_id = $1 AND id = $2
         RETURNING id, account_id, code, name, kind, active, created_at, updated_at`,
        [accountId, sectorId, payload.code, payload.name, payload.kind ?? previous.kind, payload.active ?? previous.active]
      )
    );
    const item = mapSectorRow(result.rows[0]);
    return { item, diffSummary: diffSector(previous, item) };
  }

  async remove(accountId: string, sectorId: string): Promise<CompanySectorItem> {
    const previous = await this.findById(accountId, sectorId);
    if (!previous) throw new Error('Company sector not found');
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `UPDATE sectors
         SET active = false,
             updated_at = NOW()
         WHERE account_id = $1 AND id = $2
         RETURNING id, account_id, code, name, kind, active, created_at, updated_at`,
        [accountId, sectorId]
      )
    );
    return mapSectorRow(result.rows[0]);
  }

  private async findById(accountId: string, sectorId: string): Promise<CompanySectorItem | null> {
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `SELECT id, account_id, code, name, kind, active, created_at, updated_at
         FROM sectors
         WHERE account_id = $1 AND id = $2
         LIMIT 1`,
        [accountId, sectorId]
      )
    );
    return result.rows[0] ? mapSectorRow(result.rows[0]) : null;
  }
}

function resolveStore(override?: CompanySectorPersistence): CompanySectorPersistence | null {
  if (override) return override;
  const state = getAppState();
  if (state.initialized && state.persistenceMode !== 'database') return null;
  databasePersistence ??= new DatabaseCompanySectorRepository();
  return databasePersistence;
}

export async function handleCompanySectorsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: CompanySectorHandlers
): Promise<boolean> {
  const sectorId = parseSectorId(pathname);
  if (!collectionPaths.has(pathname) && !sectorId) return false;

  const store = resolveStore(handlers.store);
  if (!store) {
    return json(response, 503, {
      code: 'PERSISTENCE_UNAVAILABLE',
      message: 'Company sectors require database persistence',
      correlationId
    });
  }

  if (collectionPaths.has(pathname) && request.method === 'GET') {
    const principal = handlers.requirePrincipal(request, 'inventory.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const items = await store.list(principal.user.accountId, {
      search: url.searchParams.get('search') ?? url.searchParams.get('q') ?? undefined,
      kind: url.searchParams.get('kind') ?? undefined,
      active: url.searchParams.get('active') === 'false' ? false : true
    });
    appendAudit(handlers.audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inventory',
      action: 'list_company_sectors',
      entityType: 'company-sector',
      entityId: 'all',
      payloadSummary: 'Company sectors listed',
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, { items, totalItems: items.length });
  }

  if (collectionPaths.has(pathname) && request.method === 'POST') {
    const principal = handlers.requirePrincipal(request, 'inventory.manage');
    const payload = normalizePayload((await readJsonBody(request)) as Partial<CompanySectorPayload>);
    const validationError = validatePayload(payload);
    if (validationError) {
      return json(response, 400, { code: 'VALIDATION_ERROR', message: validationError, correlationId });
    }
    const item = await store.create(principal.user.accountId, payload);
    appendAudit(handlers.audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inventory',
      action: 'create_company_sector',
      entityType: 'company-sector',
      entityId: item.id,
      payloadSummary: `Company sector created | ${summarizeSector(item)}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, item);
  }

  if (sectorId && request.method === 'PATCH') {
    const principal = handlers.requirePrincipal(request, 'inventory.manage');
    const payload = normalizePayload((await readJsonBody(request)) as Partial<CompanySectorPayload>);
    const validationError = validatePayload(payload);
    if (validationError) {
      return json(response, 400, { code: 'VALIDATION_ERROR', message: validationError, correlationId });
    }
    try {
      const { item, diffSummary } = await store.update(principal.user.accountId, sectorId, payload);
      appendAudit(handlers.audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'inventory',
        action: 'update_company_sector',
        entityType: 'company-sector',
        entityId: item.id,
        payloadSummary: `Company sector updated | ${summarizeSector(item)} | changes=${diffSummary || 'no material field changes detected'}`,
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 200, item);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return json(response, 404, { code: 'NOT_FOUND', message: 'Company sector not found', correlationId });
      }
      throw error;
    }
  }

  if (sectorId && request.method === 'DELETE') {
    const principal = handlers.requirePrincipal(request, 'inventory.manage');
    try {
      const item = await store.remove(principal.user.accountId, sectorId);
      appendAudit(handlers.audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'inventory',
        action: 'archive_company_sector',
        entityType: 'company-sector',
        entityId: item.id,
        payloadSummary: `Company sector archived | ${summarizeSector(item)}`,
        riskLevel: 'medium',
        correlationId
      });
      response.statusCode = 204;
      response.end();
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return json(response, 404, { code: 'NOT_FOUND', message: 'Company sector not found', correlationId });
      }
      throw error;
    }
  }

  return false;
}
