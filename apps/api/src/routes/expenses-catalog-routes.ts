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
  type FinanceCatalogPersistence
} from '../repositories/database-finance-catalog.repository.js';

export type { ExpenseCatalogItem, ExpenseCostCenterItem } from './expenses-catalog-store.js';

export interface ExpensesCatalogHandlers {
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
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
  create(accountId: string, actorId: string, payload: ExpenseCatalogPayload): Promise<ExpenseCatalogItem>;
  update(accountId: string, expenseId: string, payload: ExpenseCatalogPayload): Promise<{ item: ExpenseCatalogItem; diffSummary: string }>;
  remove(accountId: string, expenseId: string): Promise<ExpenseCatalogItem>;
  createCostCenter(accountId: string, payload: CostCenterCatalogPayload): Promise<ExpenseCostCenterItem>;
  updateCostCenter(accountId: string, code: string, payload: CostCenterCatalogPayload): Promise<{ item: ExpenseCostCenterItem; diffSummary: string }>;
  removeCostCenter(accountId: string, code: string): Promise<ExpenseCostCenterItem>;
}

const defaultStore = new ExpensesCatalogStore();
let databasePersistence: FinanceCatalogPersistence | null = null;

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function normalizePayload(payload: CreateExpensePayload | UpdateExpensePayload): ExpenseCatalogPayload {
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
    code: String(payload.code ?? '').trim().toUpperCase(),
    name: String(payload.name ?? '').trim(),
    kind: String(payload.kind ?? '').trim(),
    owner: String(payload.owner ?? '').trim(),
    description: String(payload.description ?? '').trim()
  };
}

function validateExpensePayload(persistence: CatalogPersistence, payload: ExpenseCatalogPayload): string | null {
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
  if (appState.databaseConfigured && appState.persistenceMode !== 'database') {
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

export async function handleExpensesCatalogRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: ExpensesCatalogHandlers
): Promise<boolean> {
  const { audit, requirePrincipal } = handlers;
  const persistence = resolvePersistence(handlers);

  if (!persistence) {
    return json(response, 503, {
      code: 'FINANCE_CATALOG_DB_REQUIRED',
      message: 'Finance catalog runtime requires database-backed persistence in the default API runtime',
      correlationId
    });
  }

  if (pathname === '/expenses-catalog' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'billing.read');
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
    const principal = requirePrincipal(request, 'billing.read');
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
    const principal = requirePrincipal(request, 'billing.manage');
    const payload = normalizeCostCenterPayload((await readJsonBody(request)) as CreateCostCenterPayload);
    const validationError = validateCostCenterPayload(payload);
    if (validationError) {
      return json(response, 400, { code: 'VALIDATION_ERROR', message: validationError, correlationId });
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
        payloadSummary: `Cost center ${created.code} created`,
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 201, created);
    } catch (error) {
      if (error instanceof Error && error.message === 'DUPLICATE_COST_CENTER_CODE') {
        return json(response, 409, { code: 'DUPLICATE_COST_CENTER_CODE', message: 'Cost center code already exists', correlationId });
      }
      throw error;
    }
  }

  if (pathname.match(/^\/cost-centers-catalog\/[^/]+$/) && request.method === 'PATCH') {
    const principal = requirePrincipal(request, 'billing.manage');
    const costCenterCode = pathname.split('/')[2] ?? '';
    const payload = normalizeCostCenterPayload((await readJsonBody(request)) as CreateCostCenterPayload);
    const validationError = validateCostCenterPayload(payload);
    if (validationError) {
      return json(response, 400, { code: 'VALIDATION_ERROR', message: validationError, correlationId });
    }
    try {
      const { item, diffSummary } = await persistence.updateCostCenter(principal.user.accountId, costCenterCode, payload);
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'billing',
        action: 'update_cost_center_catalog_item',
        entityType: 'cost-center-catalog',
        entityId: item.code,
        payloadSummary: `Cost center ${item.code} updated; ${diffSummary}`,
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 200, item);
    } catch (error) {
      if (error instanceof Error && error.message === 'DUPLICATE_COST_CENTER_CODE') {
        return json(response, 409, { code: 'DUPLICATE_COST_CENTER_CODE', message: 'Cost center code already exists', correlationId });
      }
      return json(response, 404, { code: 'NOT_FOUND', message: 'Cost center not found', correlationId });
    }
  }

  if (pathname.match(/^\/cost-centers-catalog\/[^/]+$/) && request.method === 'DELETE') {
    const principal = requirePrincipal(request, 'billing.manage');
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
        payloadSummary: `Cost center ${removed.code} removed`,
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 200, { ok: true });
    } catch (error) {
      if (error instanceof Error && error.message === 'COST_CENTER_IN_USE') {
        return json(response, 409, { code: 'COST_CENTER_IN_USE', message: 'Cost center is in use by expense catalog items', correlationId });
      }
      return json(response, 404, { code: 'NOT_FOUND', message: 'Cost center not found', correlationId });
    }
  }

  if (pathname === '/expenses-catalog' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'billing.manage');
    const payload = normalizePayload((await readJsonBody(request)) as CreateExpensePayload);
    const validationError = validateExpensePayload(persistence, payload);
    if (validationError) {
      return json(response, 400, { code: 'VALIDATION_ERROR', message: validationError, correlationId });
    }
    const catalogSnapshot = await persistence.list(principal.user.accountId, { page: 1, pageSize: 1000 });
    if (!catalogSnapshot.costCenters.some((center: ExpenseCostCenterItem) => center.code === payload.costCenterCode)) {
      return json(response, 400, { code: 'VALIDATION_ERROR', message: 'costCenterCode is invalid', correlationId });
    }
    const created = await persistence.create(principal.user.accountId, principal.user.id, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'billing',
      action: 'create_expense_catalog_item',
      entityType: 'expense-catalog',
      entityId: created.id,
      payloadSummary: `Expense catalog item ${created.id} created for ${created.costCenterCode}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, created);
  }

  if (pathname.match(/^\/expenses-catalog\/[^/]+$/) && request.method === 'PATCH') {
    const principal = requirePrincipal(request, 'billing.manage');
    const expenseId = pathname.split('/')[2] ?? '';
    const payload = normalizePayload((await readJsonBody(request)) as UpdateExpensePayload);
    const validationError = validateExpensePayload(persistence, payload);
    if (validationError) {
      return json(response, 400, { code: 'VALIDATION_ERROR', message: validationError, correlationId });
    }
    const catalogSnapshot = await persistence.list(principal.user.accountId, { page: 1, pageSize: 1000 });
    if (!catalogSnapshot.costCenters.some((center: ExpenseCostCenterItem) => center.code === payload.costCenterCode)) {
      return json(response, 400, { code: 'VALIDATION_ERROR', message: 'costCenterCode is invalid', correlationId });
    }
    try {
      const { item, diffSummary } = await persistence.update(principal.user.accountId, expenseId, payload);
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'billing',
        action: 'update_expense_catalog_item',
        entityType: 'expense-catalog',
        entityId: item.id,
        payloadSummary: `Expense catalog item ${item.id} updated; ${diffSummary}`,
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 200, item);
    } catch {
      return json(response, 404, { code: 'NOT_FOUND', message: 'Expense catalog item not found', correlationId });
    }
  }

  if (pathname.match(/^\/expenses-catalog\/[^/]+$/) && request.method === 'DELETE') {
    const principal = requirePrincipal(request, 'billing.manage');
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
        payloadSummary: `Expense catalog item ${removed.id} removed (${removed.name}, ${removed.category}, ${removed.costCenterCode})`,
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 200, { ok: true });
    } catch {
      return json(response, 404, { code: 'NOT_FOUND', message: 'Expense catalog item not found', correlationId });
    }
  }

  return false;
}
