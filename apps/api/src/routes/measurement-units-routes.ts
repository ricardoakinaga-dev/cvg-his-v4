import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

import { getPool } from '@cvg-his-v2/shared-database';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import { getAppState } from '../app-state.js';
import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface MeasurementUnitItem {
  id: string;
  accountId: string;
  code: string;
  description: string;
  decimalPlaces: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementUnitPayload {
  code: string;
  description: string;
  decimalPlaces?: number;
  active?: boolean;
}

export interface MeasurementUnitFilters {
  search?: string;
  precision?: 'integer' | 'decimal';
  active?: boolean;
}

export interface MeasurementUnitPersistence {
  list(accountId: string, filters?: MeasurementUnitFilters): Promise<MeasurementUnitItem[]>;
  create(accountId: string, payload: MeasurementUnitPayload): Promise<MeasurementUnitItem>;
  update(accountId: string, unitId: string, payload: MeasurementUnitPayload): Promise<{ item: MeasurementUnitItem; diffSummary: string }>;
  remove(accountId: string, unitId: string): Promise<MeasurementUnitItem>;
}

export interface MeasurementUnitHandlers {
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
  store?: MeasurementUnitPersistence;
}

const collectionPaths = new Set([
  '/measurement-units',
  '/unidades-de-medida',
  '/unidades-medida',
  '/estoque/unidades-de-medida',
  '/estoque/unidades-medida',
  '/estoque/cadastros/unidades-de-medida',
  '/estoque/cadastros/unidades-medida'
]);

let databasePersistence: MeasurementUnitPersistence | null = null;

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function parseMeasurementUnitId(pathname: string): string | null {
  const match = pathname.match(/^\/(?:measurement-units|unidades-de-medida|unidades-medida)\/([^/]+)$/);
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

function normalizeDecimalPlaces(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.trunc(parsed);
}

function normalizePrecision(value: string | null | undefined): MeasurementUnitFilters['precision'] {
  if (value === 'integer' || value === 'decimal') return value;
  return undefined;
}

function normalizePayload(payload: Partial<MeasurementUnitPayload>): MeasurementUnitPayload {
  return {
    code: normalizeCode(payload.code),
    description: String(payload.description ?? '').trim(),
    decimalPlaces: normalizeDecimalPlaces(payload.decimalPlaces),
    active: payload.active ?? true
  };
}

function validatePayload(payload: MeasurementUnitPayload): string | null {
  if (!payload.code) return 'code is required';
  if (payload.code.length > 30) return 'code must have at most 30 characters';
  if (!payload.description) return 'description is required';
  if (payload.description.length > 160) return 'description must have at most 160 characters';
  if ((payload.decimalPlaces ?? 0) < 0 || (payload.decimalPlaces ?? 0) > 6) {
    return 'decimalPlaces must be between 0 and 6';
  }
  return null;
}

function summarizeMeasurementUnit(item: MeasurementUnitItem): string {
  return `code=${item.code} | description=${item.description} | decimalPlaces=${item.decimalPlaces} | active=${item.active}`;
}

function diffMeasurementUnit(previous: MeasurementUnitItem, current: MeasurementUnitItem): string {
  const changes: string[] = [];
  if (previous.code !== current.code) changes.push(`code: ${previous.code} -> ${current.code}`);
  if (previous.description !== current.description) {
    changes.push(`description: ${previous.description} -> ${current.description}`);
  }
  if (previous.decimalPlaces !== current.decimalPlaces) {
    changes.push(`decimalPlaces: ${previous.decimalPlaces} -> ${current.decimalPlaces}`);
  }
  if (previous.active !== current.active) changes.push(`active: ${previous.active} -> ${current.active}`);
  return changes.join('; ');
}

function mapMeasurementUnitRow(row: Record<string, unknown>): MeasurementUnitItem {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    code: String(row.code),
    description: String(row.description),
    decimalPlaces: Number(row.decimal_places),
    active: Boolean(row.active),
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString()
  };
}

class DatabaseMeasurementUnitRepository implements MeasurementUnitPersistence {
  async list(accountId: string, filters: MeasurementUnitFilters = {}): Promise<MeasurementUnitItem[]> {
    const params: unknown[] = [accountId];
    const conditions = ['account_id = $1'];

    if (filters.active !== false) {
      conditions.push('active = true');
    }

    if (filters.precision === 'integer') {
      conditions.push('decimal_places = 0');
    } else if (filters.precision === 'decimal') {
      conditions.push('decimal_places > 0');
    }

    const search = normalizeSearch(filters.search);
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(LOWER(code) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`);
    }

    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `SELECT id, account_id, code, description, decimal_places, active, created_at, updated_at
         FROM inventory_measurement_units
         WHERE ${conditions.join(' AND ')}
         ORDER BY code ASC, description ASC`,
        params
      )
    );
    return result.rows.map(mapMeasurementUnitRow);
  }

  async create(accountId: string, payload: MeasurementUnitPayload): Promise<MeasurementUnitItem> {
    const id = randomUUID();
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `INSERT INTO inventory_measurement_units (id, account_id, code, description, decimal_places, active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, account_id, code, description, decimal_places, active, created_at, updated_at`,
        [id, accountId, payload.code, payload.description, payload.decimalPlaces ?? 0, payload.active ?? true]
      )
    );
    return mapMeasurementUnitRow(result.rows[0]);
  }

  async update(accountId: string, unitId: string, payload: MeasurementUnitPayload): Promise<{ item: MeasurementUnitItem; diffSummary: string }> {
    const previous = await this.findById(accountId, unitId);
    if (!previous) throw new Error('Measurement unit not found');
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `UPDATE inventory_measurement_units
         SET code = $3,
             description = $4,
             decimal_places = $5,
             active = $6,
             updated_at = NOW()
         WHERE account_id = $1 AND id = $2
         RETURNING id, account_id, code, description, decimal_places, active, created_at, updated_at`,
        [
          accountId,
          unitId,
          payload.code,
          payload.description,
          payload.decimalPlaces ?? previous.decimalPlaces,
          payload.active ?? previous.active
        ]
      )
    );
    const item = mapMeasurementUnitRow(result.rows[0]);
    return { item, diffSummary: diffMeasurementUnit(previous, item) };
  }

  async remove(accountId: string, unitId: string): Promise<MeasurementUnitItem> {
    const previous = await this.findById(accountId, unitId);
    if (!previous) throw new Error('Measurement unit not found');
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `UPDATE inventory_measurement_units
         SET active = false,
             updated_at = NOW()
         WHERE account_id = $1 AND id = $2
         RETURNING id, account_id, code, description, decimal_places, active, created_at, updated_at`,
        [accountId, unitId]
      )
    );
    return mapMeasurementUnitRow(result.rows[0]);
  }

  private async findById(accountId: string, unitId: string): Promise<MeasurementUnitItem | null> {
    const result = await withTenantQuery(getPool(), (client) =>
      client.query(
        `SELECT id, account_id, code, description, decimal_places, active, created_at, updated_at
         FROM inventory_measurement_units
         WHERE account_id = $1 AND id = $2
         LIMIT 1`,
        [accountId, unitId]
      )
    );
    return result.rows[0] ? mapMeasurementUnitRow(result.rows[0]) : null;
  }
}

function resolveStore(override?: MeasurementUnitPersistence): MeasurementUnitPersistence | null {
  if (override) return override;
  const state = getAppState();
  if (state.initialized && state.persistenceMode !== 'database') return null;
  databasePersistence ??= new DatabaseMeasurementUnitRepository();
  return databasePersistence;
}

export async function handleMeasurementUnitsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: MeasurementUnitHandlers
): Promise<boolean> {
  const unitId = parseMeasurementUnitId(pathname);
  if (!collectionPaths.has(pathname) && !unitId) return false;

  const store = resolveStore(handlers.store);
  if (!store) {
    return json(response, 503, {
      code: 'PERSISTENCE_UNAVAILABLE',
      message: 'Measurement units require database persistence',
      correlationId
    });
  }

  if (collectionPaths.has(pathname) && request.method === 'GET') {
    const principal = handlers.requirePrincipal(request, 'inventory.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const items = await store.list(principal.user.accountId, {
      search: url.searchParams.get('search') ?? url.searchParams.get('q') ?? undefined,
      precision: normalizePrecision(url.searchParams.get('precision')),
      active: url.searchParams.get('active') === 'false' ? false : true
    });
    appendAudit(handlers.audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inventory',
      action: 'list_measurement_units',
      entityType: 'measurement-unit',
      entityId: 'all',
      payloadSummary: 'Measurement units listed',
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, { items, totalItems: items.length });
  }

  if (collectionPaths.has(pathname) && request.method === 'POST') {
    const principal = handlers.requirePrincipal(request, 'inventory.manage');
    const payload = normalizePayload((await readJsonBody(request)) as Partial<MeasurementUnitPayload>);
    const validationError = validatePayload(payload);
    if (validationError) {
      return json(response, 400, { code: 'VALIDATION_ERROR', message: validationError, correlationId });
    }
    const item = await store.create(principal.user.accountId, payload);
    appendAudit(handlers.audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'inventory',
      action: 'create_measurement_unit',
      entityType: 'measurement-unit',
      entityId: item.id,
      payloadSummary: `Measurement unit created | ${summarizeMeasurementUnit(item)}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, item);
  }

  if (unitId && request.method === 'PATCH') {
    const principal = handlers.requirePrincipal(request, 'inventory.manage');
    const payload = normalizePayload((await readJsonBody(request)) as Partial<MeasurementUnitPayload>);
    const validationError = validatePayload(payload);
    if (validationError) {
      return json(response, 400, { code: 'VALIDATION_ERROR', message: validationError, correlationId });
    }
    try {
      const { item, diffSummary } = await store.update(principal.user.accountId, unitId, payload);
      appendAudit(handlers.audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'inventory',
        action: 'update_measurement_unit',
        entityType: 'measurement-unit',
        entityId: item.id,
        payloadSummary: `Measurement unit updated | ${summarizeMeasurementUnit(item)} | changes=${diffSummary || 'no material field changes detected'}`,
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 200, item);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return json(response, 404, { code: 'NOT_FOUND', message: 'Measurement unit not found', correlationId });
      }
      throw error;
    }
  }

  if (unitId && request.method === 'DELETE') {
    const principal = handlers.requirePrincipal(request, 'inventory.manage');
    try {
      const item = await store.remove(principal.user.accountId, unitId);
      appendAudit(handlers.audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'inventory',
        action: 'archive_measurement_unit',
        entityType: 'measurement-unit',
        entityId: item.id,
        payloadSummary: `Measurement unit archived | ${summarizeMeasurementUnit(item)}`,
        riskLevel: 'medium',
        correlationId
      });
      response.statusCode = 204;
      response.end();
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return json(response, 404, { code: 'NOT_FOUND', message: 'Measurement unit not found', correlationId });
      }
      throw error;
    }
  }

  return false;
}
