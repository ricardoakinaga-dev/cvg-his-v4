import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';

import { getPool } from '@cvg-his-v2/shared-database';
import { getAppState } from '../app-state.js';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';
import {
  ExpensesCatalogStore,
  type CostCenterCatalogPayload,
  type ExpenseCatalogItem,
  type ExpenseCatalogPayload,
  type ExpenseCostCenterItem
} from './expenses-catalog-store.js';
import {
  DatabaseFinanceCatalogRepository,
  FINANCE_OPERATIONAL_CATALOG_TYPES,
  type FinanceCatalogPersistence,
  type FinanceOperationalCatalogItem,
  type FinanceOperationalCatalogPayload,
  type FinanceOperationalCatalogStatus,
  type FinanceOperationalCatalogType
} from '../repositories/database-finance-catalog.repository.js';

export type { ExpenseCatalogItem, ExpenseCostCenterItem } from './expenses-catalog-store.js';

export interface ExpensesCatalogHandlers {
  audit: AuditService;
  requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
  storagePath?: string;
  store?: FinanceCatalogPersistence;
}

interface CreateExpensePayload {
  name: string;
  kind?: string;
  category: string;
  costCenterCode: string;
  description: string;
}

interface UpdateExpensePayload {
  name: string;
  kind?: string;
  category: string;
  costCenterCode: string;
  description: string;
}

interface CreateCostCenterPayload {
  code: string;
  name: string;
  kind: string;
  owner: string;
  description: string;
}

interface CatalogPersistence {
  isValidCategory(category: string): boolean;
  list(accountId: string, filters?: Record<string, unknown>): Promise<any>;
  listCostCenters(accountId: string, filters?: Record<string, unknown>): Promise<any>;
  create(
    accountId: string,
    actorId: string,
    payload: ExpenseCatalogPayload
  ): Promise<ExpenseCatalogItem>;
  update(
    accountId: string,
    expenseId: string,
    payload: ExpenseCatalogPayload
  ): Promise<{ item: ExpenseCatalogItem; diffSummary: string }>;
  remove(accountId: string, expenseId: string): Promise<ExpenseCatalogItem>;
  createCostCenter(
    accountId: string,
    payload: CostCenterCatalogPayload
  ): Promise<ExpenseCostCenterItem>;
  updateCostCenter(
    accountId: string,
    code: string,
    payload: CostCenterCatalogPayload
  ): Promise<{ item: ExpenseCostCenterItem; diffSummary: string }>;
  removeCostCenter(accountId: string, code: string): Promise<ExpenseCostCenterItem>;
  listOperationalCatalog?: FinanceCatalogPersistence['listOperationalCatalog'];
  createOperationalCatalog?: FinanceCatalogPersistence['createOperationalCatalog'];
  updateOperationalCatalog?: FinanceCatalogPersistence['updateOperationalCatalog'];
  removeOperationalCatalog?: FinanceCatalogPersistence['removeOperationalCatalog'];
}

interface NormalizedOperationalPayload {
  payload: FinanceOperationalCatalogPayload;
  version?: number;
}

const OPERATIONAL_CONFIGURATION_FIELDS: Record<FinanceOperationalCatalogType, readonly string[]> = {
  banks: [
    'bankCode',
    'agency',
    'accountNumber',
    'accountType',
    'usageKey',
    'usageDescription',
    'reconciliationMode'
  ],
  'payment-methods': ['methodType', 'integration', 'integrationDetail', 'usageDescription'],
  'card-machines': ['provider', 'serialNumber', 'unit', 'settlementBankCode', 'acceptedMethods'],
  'split-rules': ['recipient', 'percentage', 'appliesTo', 'priority']
};

const SECRET_FIELD_PATTERN = /(secret|password|token|credential|private.?key|api.?key)/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const defaultStore = new ExpensesCatalogStore();
let databasePersistence: FinanceCatalogPersistence | null = null;

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function normalizePayload(
  payload: CreateExpensePayload | UpdateExpensePayload
): ExpenseCatalogPayload {
  return {
    name: String(payload.name ?? '').trim(),
    kind: String(payload.kind ?? 'Variável').trim() || 'Variável',
    category: String(payload.category ?? '').trim(),
    costCenterCode: String(payload.costCenterCode ?? '').trim(),
    description: String(payload.description ?? '').trim()
  };
}

function normalizeCostCenterPayload(payload: CreateCostCenterPayload): CostCenterCatalogPayload {
  return {
    code: String(payload.code ?? '')
      .trim()
      .toUpperCase(),
    name: String(payload.name ?? '').trim(),
    kind: String(payload.kind ?? '').trim(),
    owner: String(payload.owner ?? '').trim(),
    description: String(payload.description ?? '').trim()
  };
}

function validateExpensePayload(
  persistence: CatalogPersistence,
  payload: ExpenseCatalogPayload
): string | null {
  if (!payload.name || !payload.category || !payload.description || !payload.costCenterCode) {
    return 'name, category, costCenterCode and description are required';
  }
  if (!persistence.isValidCategory(payload.category)) {
    return 'category is invalid';
  }
  return null;
}

function validateCostCenterPayload(payload: CostCenterCatalogPayload): string | null {
  if (!payload.code || !payload.name || !payload.kind || !payload.owner || !payload.description) {
    return 'code, name, kind, owner and description are required';
  }
  if (!['Operacional', 'Administrativo'].includes(payload.kind)) {
    return 'kind is invalid';
  }
  return null;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOrder(value: string | null): 'asc' | 'desc' {
  return value === 'desc' ? 'desc' : 'asc';
}

function parseExpenseSort(value: string | null): 'id' | 'name' | 'category' | 'costCenterCode' {
  if (value === 'id' || value === 'category' || value === 'costCenterCode') return value;
  return 'name';
}

function parseCostCenterSort(value: string | null): 'code' | 'name' | 'kind' | 'owner' {
  if (value === 'code' || value === 'kind' || value === 'owner') return value;
  return 'name';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseOperationalCatalogType(value: string): FinanceOperationalCatalogType | null {
  return FINANCE_OPERATIONAL_CATALOG_TYPES.includes(value as FinanceOperationalCatalogType)
    ? (value as FinanceOperationalCatalogType)
    : null;
}

function normalizeOperationalConfiguration(
  configuration: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(configuration).map(([key, value]) => [
      key,
      typeof value === 'string'
        ? value.trim()
        : Array.isArray(value)
          ? value.map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
          : value
    ])
  );
}

function validateOperationalConfiguration(
  type: FinanceOperationalCatalogType,
  configuration: Record<string, unknown>
): string | null {
  const allowedFields = OPERATIONAL_CONFIGURATION_FIELDS[type];
  const unknownField = Object.keys(configuration).find((field) => !allowedFields.includes(field));
  if (unknownField) {
    return SECRET_FIELD_PATTERN.test(unknownField)
      ? `configuration field ${unknownField} is forbidden`
      : `configuration field ${unknownField} is not supported for ${type}`;
  }
  const missingField = allowedFields.find((field) => !(field in configuration));
  if (missingField) return `configuration.${missingField} is required`;

  const stringFields = allowedFields.filter(
    (field) => !['acceptedMethods', 'percentage', 'priority'].includes(field)
  );
  const invalidString = stringFields.find(
    (field) => typeof configuration[field] !== 'string' || !String(configuration[field]).trim()
  );
  if (invalidString) return `configuration.${invalidString} must be a non-empty string`;

  if (
    type === 'banks' &&
    !['checking', 'savings', 'payment'].includes(String(configuration.accountType))
  ) {
    return 'configuration.accountType is invalid';
  }
  if (
    type === 'banks' &&
    !['settlement', 'card', 'support'].includes(String(configuration.usageKey))
  ) {
    return 'configuration.usageKey is invalid';
  }
  if (
    type === 'banks' &&
    !['manual', 'automatic', 'disabled'].includes(String(configuration.reconciliationMode))
  ) {
    return 'configuration.reconciliationMode is invalid';
  }
  if (
    type === 'payment-methods' &&
    !['cash', 'digital', 'credit', 'receivable'].includes(String(configuration.methodType))
  ) {
    return 'configuration.methodType is invalid';
  }
  if (
    type === 'payment-methods' &&
    !['cash-drawer', 'pix', 'card-machine', 'receivables'].includes(
      String(configuration.integration)
    )
  ) {
    return 'configuration.integration is invalid';
  }
  if (type === 'card-machines') {
    const methods = configuration.acceptedMethods;
    if (
      !Array.isArray(methods) ||
      methods.length === 0 ||
      methods.some((method) => typeof method !== 'string' || !method.trim())
    ) {
      return 'configuration.acceptedMethods must be a non-empty string array';
    }
  }
  if (type === 'split-rules') {
    const percentage = configuration.percentage;
    const priority = configuration.priority;
    if (
      typeof percentage !== 'number' ||
      !Number.isFinite(percentage) ||
      percentage <= 0 ||
      percentage > 100
    ) {
      return 'configuration.percentage must be greater than 0 and at most 100';
    }
    if (typeof priority !== 'number' || !Number.isInteger(priority) || priority < 0) {
      return 'configuration.priority must be a non-negative integer';
    }
  }
  return null;
}

function normalizeOperationalPayload(
  type: FinanceOperationalCatalogType,
  input: unknown,
  requireVersion: boolean
): NormalizedOperationalPayload | { error: string } {
  if (!isPlainObject(input)) return { error: 'request body must be an object' };
  const allowedTopLevel = requireVersion
    ? ['code', 'name', 'status', 'configuration', 'version']
    : ['code', 'name', 'status', 'configuration'];
  const unknownField = Object.keys(input).find((field) => !allowedTopLevel.includes(field));
  if (unknownField) return { error: `field ${unknownField} is not supported` };

  const code = typeof input.code === 'string' ? input.code.trim().toUpperCase() : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const status = input.status as FinanceOperationalCatalogStatus;
  if (!/^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(code)) {
    return { error: 'code must use 1-64 uppercase letters, numbers, underscores or hyphens' };
  }
  if (!name || name.length > 160) return { error: 'name must use 1-160 characters' };
  if (status !== 'active' && status !== 'inactive') {
    return { error: 'status must be active or inactive' };
  }
  if (!isPlainObject(input.configuration)) {
    return { error: 'configuration must be an object' };
  }
  const configuration = normalizeOperationalConfiguration(input.configuration);
  const configurationError = validateOperationalConfiguration(type, configuration);
  if (configurationError) return { error: configurationError };

  if (requireVersion && (!Number.isInteger(input.version) || Number(input.version) < 1)) {
    return { error: 'version must be a positive integer' };
  }
  return {
    payload: { code, name, status, configuration },
    ...(requireVersion ? { version: Number(input.version) } : {})
  };
}

function summarizeExpenseSnapshot(item: ExpenseCatalogItem): string {
  return [
    `id=${item.id}`,
    `name=${item.name}`,
    `kind=${item.kind}`,
    `category=${item.category}`,
    `costCenter=${item.costCenterCode}`,
    `costCenterName=${item.costCenterName}`
  ].join(' | ');
}

function summarizeCostCenterSnapshot(item: ExpenseCostCenterItem): string {
  return [
    `code=${item.code}`,
    `name=${item.name}`,
    `kind=${item.kind}`,
    `owner=${item.owner}`
  ].join(' | ');
}

function summarizeDiffLabel(diffSummary: string): string {
  return diffSummary.trim() ? diffSummary : 'no material field changes detected';
}

function buildExpenseCreateAuditSummary(item: ExpenseCatalogItem): string {
  return `Expense catalog item created | ${summarizeExpenseSnapshot(item)}`;
}

function buildExpenseUpdateAuditSummary(item: ExpenseCatalogItem, diffSummary: string): string {
  return `Expense catalog item updated | ${summarizeExpenseSnapshot(item)} | changes=${summarizeDiffLabel(diffSummary)}`;
}

function buildExpenseRemoveAuditSummary(item: ExpenseCatalogItem): string {
  return `Expense catalog item removed | ${summarizeExpenseSnapshot(item)}`;
}

function buildCostCenterCreateAuditSummary(item: ExpenseCostCenterItem): string {
  return `Cost center catalog item created | ${summarizeCostCenterSnapshot(item)}`;
}

function buildCostCenterUpdateAuditSummary(
  item: ExpenseCostCenterItem,
  diffSummary: string
): string {
  return `Cost center catalog item updated | ${summarizeCostCenterSnapshot(item)} | changes=${summarizeDiffLabel(diffSummary)}`;
}

function buildCostCenterRemoveAuditSummary(item: ExpenseCostCenterItem): string {
  return `Cost center catalog item removed | ${summarizeCostCenterSnapshot(item)}`;
}

function buildOperationalAuditSummary(item: FinanceOperationalCatalogItem): string {
  return [
    `type=${item.type}`,
    `id=${item.id}`,
    `code=${item.code}`,
    `name=${item.name}`,
    `status=${item.status}`,
    `version=${item.version}`,
    `configurationFields=${Object.keys(item.configuration).sort().join(',')}`
  ].join(' | ');
}

function wrapStore(store: ExpensesCatalogStore): CatalogPersistence {
  return {
    isValidCategory(category: string) {
      return store.isValidCategory(category);
    },
    list(accountId: string, filters?: Record<string, unknown>) {
      return store.list(accountId, filters as never);
    },
    listCostCenters(_accountId: string, filters?: Record<string, unknown>) {
      return store.listCostCenters(filters as never);
    },
    create(accountId: string, actorId: string, payload: ExpenseCatalogPayload) {
      return store.create(accountId, actorId, payload);
    },
    update(accountId: string, expenseId: string, payload: ExpenseCatalogPayload) {
      return store.update(accountId, expenseId, payload);
    },
    remove(accountId: string, expenseId: string) {
      return store.remove(accountId, expenseId);
    },
    createCostCenter(_accountId: string, payload: CostCenterCatalogPayload) {
      return store.createCostCenter(payload);
    },
    updateCostCenter(_accountId: string, code: string, payload: CostCenterCatalogPayload) {
      return store.updateCostCenter(code, payload);
    },
    removeCostCenter(_accountId: string, code: string) {
      return store.removeCostCenter(code);
    }
  };
}

function resolvePersistence(handlers: ExpensesCatalogHandlers): CatalogPersistence | null {
  if (handlers.store) {
    return handlers.store as CatalogPersistence;
  }
  if (handlers.storagePath) {
    return wrapStore(new ExpensesCatalogStore(handlers.storagePath));
  }

  const appState = getAppState();
  // A configured database runtime must use the repository composed by
  // bootstrap. Falling back to a process/global store would make the catalog
  // screen disagree with reports and could expose non-persisted state.
  if (appState.databaseConfigured) {
    return null;
  }

  try {
    getPool();
    if (!databasePersistence) {
      databasePersistence = new DatabaseFinanceCatalogRepository();
    }
    return databasePersistence as CatalogPersistence;
  } catch {
    return wrapStore(defaultStore);
  }
}

function isExpensesCatalogRoute(pathname: string): boolean {
  return (
    pathname === '/expenses-catalog' ||
    pathname === '/cost-centers-catalog' ||
    /^\/expenses-catalog\/[^/]+$/.test(pathname) ||
    /^\/cost-centers-catalog\/[^/]+$/.test(pathname) ||
    /^\/finance\/catalogs\/[^/]+(?:\/[^/]+)?$/.test(pathname)
  );
}

export async function handleExpensesCatalogRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: ExpensesCatalogHandlers
): Promise<boolean> {
  if (!isExpensesCatalogRoute(pathname)) return false;

  const { audit, requirePrincipal } = handlers;
  const persistence = resolvePersistence(handlers);

  if (!persistence) {
    return json(response, 503, {
      code: 'FINANCE_CATALOG_DB_REQUIRED',
      message:
        'Finance catalog runtime requires database-backed persistence in the default API runtime',
      correlationId
    });
  }

  if (pathname.startsWith('/finance/catalogs/')) {
    const [, , , rawType, itemId] = pathname.split('/');
    const type = parseOperationalCatalogType(rawType ?? '');
    if (!type) {
      return json(response, 400, {
        code: 'INVALID_FINANCE_CATALOG_TYPE',
        message: `Catalog type must be one of: ${FINANCE_OPERATIONAL_CATALOG_TYPES.join(', ')}`,
        correlationId
      });
    }

    if (!itemId && request.method === 'GET') {
      if (!persistence.listOperationalCatalog) {
        return json(response, 503, {
          code: 'FINANCE_CATALOG_DB_REQUIRED',
          message: 'Operational finance catalogs require database-backed persistence',
          correlationId
        });
      }
      const principal = await requirePrincipal(request, 'billing.read');
      const url = new URL(request.url ?? pathname, 'http://localhost');
      const rawStatus = url.searchParams.get('status');
      if (rawStatus && rawStatus !== 'active' && rawStatus !== 'inactive') {
        return json(response, 400, {
          code: 'VALIDATION_ERROR',
          message: 'status must be active or inactive',
          correlationId
        });
      }
      const result = await persistence.listOperationalCatalog(principal.user.accountId, type, {
        search: url.searchParams.get('search') ?? undefined,
        status: (rawStatus || undefined) as FinanceOperationalCatalogStatus | undefined,
        page: parsePositiveInt(url.searchParams.get('page'), 1),
        pageSize: parsePositiveInt(url.searchParams.get('pageSize'), 10)
      });
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'billing',
        action: 'list_finance_operational_catalog',
        entityType: `finance-${type}`,
        entityId: 'all',
        payloadSummary: `Operational finance catalog listed | type=${type} | total=${result.totalItems}`,
        riskLevel: 'low',
        correlationId
      });
      return json(response, 200, result);
    }

    if (!itemId && request.method === 'POST') {
      if (!persistence.createOperationalCatalog) {
        return json(response, 503, {
          code: 'FINANCE_CATALOG_DB_REQUIRED',
          message: 'Operational finance catalogs require database-backed persistence',
          correlationId
        });
      }
      const principal = await requirePrincipal(request, 'billing.manage');
      const normalized = normalizeOperationalPayload(type, await readJsonBody(request), false);
      if ('error' in normalized) {
        return json(response, 400, {
          code: 'VALIDATION_ERROR',
          message: normalized.error,
          correlationId
        });
      }
      try {
        const created = await persistence.createOperationalCatalog(
          principal.user.accountId,
          principal.user.id,
          type,
          normalized.payload
        );
        appendAudit(audit, {
          actorId: principal.user.id,
          accountId: principal.user.accountId,
          module: 'billing',
          action: 'create_finance_operational_catalog_item',
          entityType: `finance-${type}`,
          entityId: created.id,
          payloadSummary: buildOperationalAuditSummary(created),
          riskLevel: 'medium',
          correlationId
        });
        return json(response, 201, created);
      } catch (error) {
        if (error instanceof Error && error.message === 'DUPLICATE_CATALOG_CODE') {
          return json(response, 409, {
            code: 'DUPLICATE_CATALOG_CODE',
            message: `Code ${normalized.payload.code} already exists in ${type}`,
            correlationId
          });
        }
        throw error;
      }
    }

    if (itemId && request.method === 'PATCH') {
      if (!UUID_PATTERN.test(itemId)) {
        return json(response, 400, {
          code: 'VALIDATION_ERROR',
          message: 'catalog item id must be a UUID',
          correlationId
        });
      }
      if (!persistence.updateOperationalCatalog) {
        return json(response, 503, {
          code: 'FINANCE_CATALOG_DB_REQUIRED',
          message: 'Operational finance catalogs require database-backed persistence',
          correlationId
        });
      }
      const principal = await requirePrincipal(request, 'billing.manage');
      const normalized = normalizeOperationalPayload(type, await readJsonBody(request), true);
      if ('error' in normalized) {
        return json(response, 400, {
          code: 'VALIDATION_ERROR',
          message: normalized.error,
          correlationId
        });
      }
      try {
        const { item, diffSummary } = await persistence.updateOperationalCatalog(
          principal.user.accountId,
          principal.user.id,
          type,
          itemId,
          normalized.version!,
          normalized.payload
        );
        appendAudit(audit, {
          actorId: principal.user.id,
          accountId: principal.user.accountId,
          module: 'billing',
          action: 'update_finance_operational_catalog_item',
          entityType: `finance-${type}`,
          entityId: item.id,
          payloadSummary: `${buildOperationalAuditSummary(item)} | ${diffSummary}`,
          riskLevel: 'medium',
          correlationId
        });
        return json(response, 200, item);
      } catch (error) {
        if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
          return json(response, 409, {
            code: 'VERSION_CONFLICT',
            message: 'Catalog item changed since it was loaded; reload before saving',
            correlationId
          });
        }
        if (error instanceof Error && error.message === 'DUPLICATE_CATALOG_CODE') {
          return json(response, 409, {
            code: 'DUPLICATE_CATALOG_CODE',
            message: `Code ${normalized.payload.code} already exists in ${type}`,
            correlationId
          });
        }
        if (error instanceof Error && error.message === 'NOT_FOUND') {
          return json(response, 404, {
            code: 'NOT_FOUND',
            message: 'Operational finance catalog item not found',
            correlationId
          });
        }
        throw error;
      }
    }

    if (itemId && request.method === 'DELETE') {
      if (!UUID_PATTERN.test(itemId)) {
        return json(response, 400, {
          code: 'VALIDATION_ERROR',
          message: 'catalog item id must be a UUID',
          correlationId
        });
      }
      if (!persistence.removeOperationalCatalog) {
        return json(response, 503, {
          code: 'FINANCE_CATALOG_DB_REQUIRED',
          message: 'Operational finance catalogs require database-backed persistence',
          correlationId
        });
      }
      const principal = await requirePrincipal(request, 'billing.manage');
      try {
        const removed = await persistence.removeOperationalCatalog(
          principal.user.accountId,
          type,
          itemId
        );
        appendAudit(audit, {
          actorId: principal.user.id,
          accountId: principal.user.accountId,
          module: 'billing',
          action: 'remove_finance_operational_catalog_item',
          entityType: `finance-${type}`,
          entityId: removed.id,
          payloadSummary: buildOperationalAuditSummary(removed),
          riskLevel: 'medium',
          correlationId
        });
        return json(response, 200, { ok: true });
      } catch (error) {
        if (error instanceof Error && error.message === 'NOT_FOUND') {
          return json(response, 404, {
            code: 'NOT_FOUND',
            message: 'Operational finance catalog item not found',
            correlationId
          });
        }
        throw error;
      }
    }
  }

  if (pathname === '/expenses-catalog' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'billing.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const search = url.searchParams.get('search') ?? undefined;
    const category = url.searchParams.get('category') ?? undefined;
    const costCenterCode = url.searchParams.get('costCenterCode') ?? undefined;
    const page = parsePositiveInt(url.searchParams.get('page'), 1);
    const pageSize = parsePositiveInt(url.searchParams.get('pageSize'), 10);
    const sort = parseExpenseSort(url.searchParams.get('sort'));
    const order = parseOrder(url.searchParams.get('order'));
    const result = await persistence.list(principal.user.accountId, {
      search,
      category,
      costCenterCode,
      page,
      pageSize,
      sort,
      order
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'billing',
      action: 'list_expenses_catalog',
      entityType: 'expense-catalog',
      entityId: 'all',
      payloadSummary: `Expenses catalog listed search=${search ?? '-'} category=${category ?? '-'} costCenter=${costCenterCode ?? '-'} page=${page} pageSize=${pageSize} sort=${sort} order=${order}`,
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, result);
  }

  if (pathname === '/cost-centers-catalog' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'billing.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const search = url.searchParams.get('search') ?? undefined;
    const kind = url.searchParams.get('kind') ?? undefined;
    const page = parsePositiveInt(url.searchParams.get('page'), 1);
    const pageSize = parsePositiveInt(url.searchParams.get('pageSize'), 10);
    const sort = parseCostCenterSort(url.searchParams.get('sort'));
    const order = parseOrder(url.searchParams.get('order'));
    const result = await persistence.listCostCenters(principal.user.accountId, {
      search,
      kind,
      page,
      pageSize,
      sort,
      order
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'billing',
      action: 'list_cost_centers_catalog',
      entityType: 'cost-center-catalog',
      entityId: 'all',
      payloadSummary: `Cost centers catalog listed search=${search ?? '-'} kind=${kind ?? '-'} page=${page} pageSize=${pageSize} sort=${sort} order=${order}`,
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, result);
  }

  if (pathname === '/cost-centers-catalog' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'billing.manage');
    const payload = normalizeCostCenterPayload(
      (await readJsonBody(request)) as CreateCostCenterPayload
    );
    const validationError = validateCostCenterPayload(payload);
    if (validationError) {
      return json(response, 400, {
        code: 'VALIDATION_ERROR',
        message: validationError,
        correlationId
      });
    }
    try {
      const created = await persistence.createCostCenter(principal.user.accountId, payload);
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'billing',
        action: 'create_cost_center_catalog_item',
        entityType: 'cost-center-catalog',
        entityId: created.code,
        payloadSummary: buildCostCenterCreateAuditSummary(created),
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 201, created);
    } catch (error) {
      if (error instanceof Error && error.message === 'DUPLICATE_COST_CENTER_CODE') {
        return json(response, 409, {
          code: 'DUPLICATE_COST_CENTER_CODE',
          message: 'Cost center code already exists',
          correlationId
        });
      }
      throw error;
    }
  }

  if (pathname.match(/^\/cost-centers-catalog\/[^/]+$/) && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'billing.manage');
    const costCenterCode = pathname.split('/')[2] ?? '';
    const payload = normalizeCostCenterPayload(
      (await readJsonBody(request)) as CreateCostCenterPayload
    );
    const validationError = validateCostCenterPayload(payload);
    if (validationError) {
      return json(response, 400, {
        code: 'VALIDATION_ERROR',
        message: validationError,
        correlationId
      });
    }
    try {
      const { item, diffSummary } = await persistence.updateCostCenter(
        principal.user.accountId,
        costCenterCode,
        payload
      );
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'billing',
        action: 'update_cost_center_catalog_item',
        entityType: 'cost-center-catalog',
        entityId: item.code,
        payloadSummary: buildCostCenterUpdateAuditSummary(item, diffSummary),
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 200, item);
    } catch (error) {
      if (error instanceof Error && error.message === 'DUPLICATE_COST_CENTER_CODE') {
        return json(response, 409, {
          code: 'DUPLICATE_COST_CENTER_CODE',
          message: 'Cost center code already exists',
          correlationId
        });
      }
      return json(response, 404, {
        code: 'NOT_FOUND',
        message: 'Cost center not found',
        correlationId
      });
    }
  }

  if (pathname.match(/^\/cost-centers-catalog\/[^/]+$/) && request.method === 'DELETE') {
    const principal = await requirePrincipal(request, 'billing.manage');
    const costCenterCode = pathname.split('/')[2] ?? '';
    try {
      const removed = await persistence.removeCostCenter(principal.user.accountId, costCenterCode);
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'billing',
        action: 'remove_cost_center_catalog_item',
        entityType: 'cost-center-catalog',
        entityId: removed.code,
        payloadSummary: buildCostCenterRemoveAuditSummary(removed),
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 200, { ok: true });
    } catch (error) {
      if (error instanceof Error && error.message === 'COST_CENTER_IN_USE') {
        return json(response, 409, {
          code: 'COST_CENTER_IN_USE',
          message: 'Cost center is in use by expense catalog items',
          correlationId
        });
      }
      return json(response, 404, {
        code: 'NOT_FOUND',
        message: 'Cost center not found',
        correlationId
      });
    }
  }

  if (pathname === '/expenses-catalog' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'billing.manage');
    const payload = normalizePayload((await readJsonBody(request)) as CreateExpensePayload);
    const validationError = validateExpensePayload(persistence, payload);
    if (validationError) {
      return json(response, 400, {
        code: 'VALIDATION_ERROR',
        message: validationError,
        correlationId
      });
    }
    const catalogSnapshot = await persistence.list(principal.user.accountId, {
      page: 1,
      pageSize: 1000
    });
    if (
      !catalogSnapshot.costCenters.some(
        (center: ExpenseCostCenterItem) => center.code === payload.costCenterCode
      )
    ) {
      return json(response, 400, {
        code: 'VALIDATION_ERROR',
        message: 'costCenterCode is invalid',
        correlationId
      });
    }
    const created = await persistence.create(principal.user.accountId, principal.user.id, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'billing',
      action: 'create_expense_catalog_item',
      entityType: 'expense-catalog',
      entityId: created.id,
      payloadSummary: buildExpenseCreateAuditSummary(created),
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, created);
  }

  if (pathname.match(/^\/expenses-catalog\/[^/]+$/) && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'billing.manage');
    const expenseId = pathname.split('/')[2] ?? '';
    const payload = normalizePayload((await readJsonBody(request)) as UpdateExpensePayload);
    const validationError = validateExpensePayload(persistence, payload);
    if (validationError) {
      return json(response, 400, {
        code: 'VALIDATION_ERROR',
        message: validationError,
        correlationId
      });
    }
    const catalogSnapshot = await persistence.list(principal.user.accountId, {
      page: 1,
      pageSize: 1000
    });
    if (
      !catalogSnapshot.costCenters.some(
        (center: ExpenseCostCenterItem) => center.code === payload.costCenterCode
      )
    ) {
      return json(response, 400, {
        code: 'VALIDATION_ERROR',
        message: 'costCenterCode is invalid',
        correlationId
      });
    }
    try {
      const { item, diffSummary } = await persistence.update(
        principal.user.accountId,
        expenseId,
        payload
      );
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'billing',
        action: 'update_expense_catalog_item',
        entityType: 'expense-catalog',
        entityId: item.id,
        payloadSummary: buildExpenseUpdateAuditSummary(item, diffSummary),
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 200, item);
    } catch {
      return json(response, 404, {
        code: 'NOT_FOUND',
        message: 'Expense catalog item not found',
        correlationId
      });
    }
  }

  if (pathname.match(/^\/expenses-catalog\/[^/]+$/) && request.method === 'DELETE') {
    const principal = await requirePrincipal(request, 'billing.manage');
    const expenseId = pathname.split('/')[2] ?? '';
    try {
      const removed = await persistence.remove(principal.user.accountId, expenseId);
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'billing',
        action: 'remove_expense_catalog_item',
        entityType: 'expense-catalog',
        entityId: removed.id,
        payloadSummary: buildExpenseRemoveAuditSummary(removed),
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 200, { ok: true });
    } catch {
      return json(response, 404, {
        code: 'NOT_FOUND',
        message: 'Expense catalog item not found',
        correlationId
      });
    }
  }

  return false;
}
