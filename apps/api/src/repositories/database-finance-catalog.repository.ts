import { randomUUID } from 'node:crypto';

import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';

import type {
  CostCenterCatalogFilters,
  CostCenterCatalogPayload,
  ExpenseCatalogFilters,
  ExpenseCatalogItem,
  ExpenseCatalogPayload,
  ExpenseCostCenterItem
} from '../routes/expenses-catalog-store.js';

export interface FinanceCatalogPersistence {
  list(
    accountId: string,
    filters?: ExpenseCatalogFilters
  ): Promise<{
    items: ExpenseCatalogItem[];
    categories: string[];
    costCenters: ExpenseCostCenterItem[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    sort: string;
    order: string;
  }>;
  listCostCenters(
    accountId: string,
    filters?: CostCenterCatalogFilters
  ): Promise<{
    items: ExpenseCostCenterItem[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    sort: string;
    order: string;
  }>;
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
  isValidCategory(category: string): boolean;
}

const DEFAULT_CATEGORIES = ['Infraestrutura', 'Logística', 'Tecnologia'] as const;
const DEFAULT_COST_CENTERS: readonly ExpenseCostCenterItem[] = [
  {
    code: 'CC-ADM',
    name: 'Administrativo Central',
    kind: 'Administrativo',
    owner: 'Diretoria Administrativa',
    description:
      'Centro responsável por despesas administrativas, contratos corporativos e custos de apoio.'
  },
  {
    code: 'CC-ATD',
    name: 'Operação de Atendimento',
    kind: 'Operacional',
    owner: 'Coordenação Assistencial',
    description: 'Centro ligado à operação clínica, recepção e rotinas assistenciais da unidade.'
  },
  {
    code: 'CC-LAB',
    name: 'Diagnóstico e Laboratório',
    kind: 'Operacional',
    owner: 'Coordenação de Diagnóstico',
    description:
      'Centro vinculado a exames, imagem, processamento laboratorial e suporte técnico diagnóstico.'
  }
] as const;

function normalizeSearch(value?: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function normalizePage(value?: number): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : 1;
}

function normalizePageSize(value?: number): number {
  return Number.isFinite(value) && Number(value) > 0 ? Math.min(Number(value), 100) : 10;
}

function mapExpenseRow(row: Record<string, unknown>): ExpenseCatalogItem {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    name: row.name as string,
    kind: row.kind as string,
    category: row.category as string,
    costCenterCode: row.cost_center_code as string,
    costCenterName: row.cost_center_name as string,
    description: row.description as string,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
    createdBy: row.created_by_user_id as string
  };
}

function mapCostCenterRow(row: Record<string, unknown>): ExpenseCostCenterItem {
  return {
    code: row.code as string,
    name: row.name as string,
    kind: row.kind as string,
    owner: row.owner as string,
    description: row.description as string
  };
}

function summarizeExpenseDiff(previous: ExpenseCatalogItem, current: ExpenseCatalogItem): string {
  const fields: Array<keyof ExpenseCatalogItem> = [
    'name',
    'kind',
    'category',
    'costCenterCode',
    'description'
  ];
  return fields
    .filter((field) => previous[field] !== current[field])
    .map((field) => `${field}: ${previous[field]} → ${current[field]}`)
    .join('; ');
}

function summarizeCostCenterDiff(
  previous: ExpenseCostCenterItem,
  current: ExpenseCostCenterItem
): string {
  const fields: Array<keyof ExpenseCostCenterItem> = [
    'code',
    'name',
    'kind',
    'owner',
    'description'
  ];
  return fields
    .filter((field) => previous[field] !== current[field])
    .map((field) => `${field}: ${previous[field]} → ${current[field]}`)
    .join('; ');
}

export class DatabaseFinanceCatalogRepository implements FinanceCatalogPersistence {
  isValidCategory(category: string): boolean {
    return DEFAULT_CATEGORIES.includes(category as (typeof DEFAULT_CATEGORIES)[number]);
  }

  async list(accountId: string, filters: ExpenseCatalogFilters = {}) {
    const page = normalizePage(filters.page);
    const pageSize = normalizePageSize(filters.pageSize);
    const sortMap = {
      id: 'id',
      name: 'name',
      category: 'category',
      costCenterCode: 'cost_center_code'
    } as const;
    const sort = sortMap[(filters.sort as keyof typeof sortMap) ?? 'name'] ?? 'name';
    const order = filters.order === 'desc' ? 'DESC' : 'ASC';
    const params: unknown[] = [accountId];
    const clauses = ['account_id = $1'];
    const search = normalizeSearch(filters.search);
    const category = normalizeSearch(filters.category);
    const costCenter = normalizeSearch(filters.costCenterCode);

    if (search) {
      params.push(`%${search}%`);
      clauses.push(
        `(id ILIKE $${params.length} OR name ILIKE $${params.length} OR description ILIKE $${params.length})`
      );
    }
    if (category) {
      params.push(`%${category}%`);
      clauses.push(`category ILIKE $${params.length}`);
    }
    if (costCenter) {
      params.push(`%${costCenter}%`);
      clauses.push(
        `(cost_center_code ILIKE $${params.length} OR cost_center_name ILIKE $${params.length})`
      );
    }
    if (filters.dateFrom) {
      params.push(filters.dateFrom);
      clauses.push(`created_at >= $${params.length}::date`);
    }
    if (filters.dateTo) {
      params.push(filters.dateTo);
      clauses.push(`created_at < ($${params.length}::date + INTERVAL '1 day')`);
    }

    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      const whereClause = clauses.join(' AND ');
      const countResult = await client.query(
        `SELECT COUNT(*)::int AS total FROM finance_expense_catalog_items WHERE ${whereClause}`,
        params
      );
      const totalItems = Number(countResult.rows[0]?.total ?? 0);
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const currentPage = Math.min(page, totalPages);
      const offset = (currentPage - 1) * pageSize;
      const rows = await client.query(
        `SELECT id, account_id, name, kind, category, cost_center_code, cost_center_name, description, created_by_user_id, created_at, updated_at
         FROM finance_expense_catalog_items
         WHERE ${whereClause}
         ORDER BY ${sort} ${order}, id ${order}
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, offset]
      );
      const centers = await client.query(
        `SELECT code, name, kind, owner, description
         FROM finance_cost_centers
         WHERE account_id = $1
         ORDER BY name ASC`,
        [accountId]
      );

      return {
        items: rows.rows.map((row) => mapExpenseRow(row as Record<string, unknown>)),
        categories: [...DEFAULT_CATEGORIES],
        costCenters: centers.rows.map((row) => mapCostCenterRow(row as Record<string, unknown>)),
        page: currentPage,
        pageSize,
        totalItems,
        totalPages,
        sort:
          Object.keys(sortMap).find((key) => sortMap[key as keyof typeof sortMap] === sort) ??
          'name',
        order: order.toLowerCase()
      };
    });
  }

  async listCostCenters(accountId: string, filters: CostCenterCatalogFilters = {}) {
    const page = normalizePage(filters.page);
    const pageSize = normalizePageSize(filters.pageSize);
    const sortMap = { code: 'code', name: 'name', kind: 'kind', owner: 'owner' } as const;
    const sort = sortMap[(filters.sort as keyof typeof sortMap) ?? 'name'] ?? 'name';
    const order = filters.order === 'desc' ? 'DESC' : 'ASC';
    const params: unknown[] = [accountId];
    const clauses = ['account_id = $1'];
    const search = normalizeSearch(filters.search);
    const kind = normalizeSearch(filters.kind);

    if (search) {
      params.push(`%${search}%`);
      clauses.push(
        `(code ILIKE $${params.length} OR name ILIKE $${params.length} OR owner ILIKE $${params.length} OR description ILIKE $${params.length})`
      );
    }
    if (kind) {
      params.push(`%${kind}%`);
      clauses.push(`kind ILIKE $${params.length}`);
    }

    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      const whereClause = clauses.join(' AND ');
      const countResult = await client.query(
        `SELECT COUNT(*)::int AS total FROM finance_cost_centers WHERE ${whereClause}`,
        params
      );
      const totalItems = Number(countResult.rows[0]?.total ?? 0);
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const currentPage = Math.min(page, totalPages);
      const offset = (currentPage - 1) * pageSize;
      const rows = await client.query(
        `SELECT code, name, kind, owner, description
         FROM finance_cost_centers
         WHERE ${whereClause}
         ORDER BY ${sort} ${order}
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, offset]
      );
      return {
        items: rows.rows.map((row) => mapCostCenterRow(row as Record<string, unknown>)),
        page: currentPage,
        pageSize,
        totalItems,
        totalPages,
        sort,
        order: order.toLowerCase()
      };
    });
  }

  async create(
    accountId: string,
    actorId: string,
    payload: ExpenseCatalogPayload
  ): Promise<ExpenseCatalogItem> {
    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      // The table keeps a global primary key for compatibility with existing
      // catalog consumers, so a per-account numeric counter is unsafe here.
      const nextId = `DES-${randomUUID()}`;
      const centerRow = await client.query(
        'SELECT name FROM finance_cost_centers WHERE account_id = $1 AND code = $2 LIMIT 1',
        [accountId, payload.costCenterCode]
      );
      const costCenterName = centerRow.rows[0]?.name as string;
      const inserted = await client.query(
        `INSERT INTO finance_expense_catalog_items (
          id, account_id, name, kind, category, cost_center_code, cost_center_name, description, created_by_user_id, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
        RETURNING id, account_id, name, kind, category, cost_center_code, cost_center_name, description, created_by_user_id, created_at, updated_at`,
        [
          nextId,
          accountId,
          payload.name,
          payload.kind,
          payload.category,
          payload.costCenterCode,
          costCenterName,
          payload.description,
          actorId
        ]
      );
      return mapExpenseRow(inserted.rows[0] as Record<string, unknown>);
    });
  }

  async update(accountId: string, expenseId: string, payload: ExpenseCatalogPayload) {
    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      const existingRow = await client.query(
        `SELECT id, account_id, name, kind, category, cost_center_code, cost_center_name, description, created_by_user_id, created_at, updated_at
         FROM finance_expense_catalog_items WHERE account_id = $1 AND id = $2 LIMIT 1`,
        [accountId, expenseId]
      );
      if (!existingRow.rows[0]) throw new Error('NOT_FOUND');
      const previous = mapExpenseRow(existingRow.rows[0] as Record<string, unknown>);
      const centerRow = await client.query(
        'SELECT name FROM finance_cost_centers WHERE account_id = $1 AND code = $2 LIMIT 1',
        [accountId, payload.costCenterCode]
      );
      const costCenterName = centerRow.rows[0]?.name as string;
      const updatedRow = await client.query(
        `UPDATE finance_expense_catalog_items
         SET name = $3, kind = $4, category = $5, cost_center_code = $6, cost_center_name = $7, description = $8, updated_at = NOW()
         WHERE account_id = $1 AND id = $2
         RETURNING id, account_id, name, kind, category, cost_center_code, cost_center_name, description, created_by_user_id, created_at, updated_at`,
        [
          accountId,
          expenseId,
          payload.name,
          payload.kind,
          payload.category,
          payload.costCenterCode,
          costCenterName,
          payload.description
        ]
      );
      const item = mapExpenseRow(updatedRow.rows[0] as Record<string, unknown>);
      return { item, diffSummary: summarizeExpenseDiff(previous, item) };
    });
  }

  async remove(accountId: string, expenseId: string): Promise<ExpenseCatalogItem> {
    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      const result = await client.query(
        `DELETE FROM finance_expense_catalog_items
         WHERE account_id = $1 AND id = $2
         RETURNING id, account_id, name, kind, category, cost_center_code, cost_center_name, description, created_by_user_id, created_at, updated_at`,
        [accountId, expenseId]
      );
      if (!result.rows[0]) throw new Error('NOT_FOUND');
      return mapExpenseRow(result.rows[0] as Record<string, unknown>);
    });
  }

  async createCostCenter(
    accountId: string,
    payload: CostCenterCatalogPayload
  ): Promise<ExpenseCostCenterItem> {
    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      const result = await client.query(
        `INSERT INTO finance_cost_centers (account_id, code, name, kind, owner, description, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
         RETURNING code, name, kind, owner, description`,
        [accountId, payload.code, payload.name, payload.kind, payload.owner, payload.description]
      );
      return mapCostCenterRow(result.rows[0] as Record<string, unknown>);
    });
  }

  async updateCostCenter(accountId: string, code: string, payload: CostCenterCatalogPayload) {
    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      const existingRow = await client.query(
        'SELECT code, name, kind, owner, description FROM finance_cost_centers WHERE account_id = $1 AND code = $2 LIMIT 1',
        [accountId, code]
      );
      if (!existingRow.rows[0]) throw new Error('NOT_FOUND');
      const previous = mapCostCenterRow(existingRow.rows[0] as Record<string, unknown>);
      const updated = await client.query(
        `UPDATE finance_cost_centers
         SET code = $3, name = $4, kind = $5, owner = $6, description = $7, updated_at = NOW()
         WHERE account_id = $1 AND code = $2
         RETURNING code, name, kind, owner, description`,
        [
          accountId,
          code,
          payload.code,
          payload.name,
          payload.kind,
          payload.owner,
          payload.description
        ]
      );
      await client.query(
        `UPDATE finance_expense_catalog_items
         SET cost_center_code = $3, cost_center_name = $4, updated_at = NOW()
         WHERE account_id = $1 AND cost_center_code = $2`,
        [accountId, payload.code, payload.code, payload.name]
      );
      const item = mapCostCenterRow(updated.rows[0] as Record<string, unknown>);
      return { item, diffSummary: summarizeCostCenterDiff(previous, item) };
    });
  }

  async removeCostCenter(accountId: string, code: string): Promise<ExpenseCostCenterItem> {
    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      const usage = await client.query(
        'SELECT COUNT(*)::int AS total FROM finance_expense_catalog_items WHERE account_id = $1 AND cost_center_code = $2',
        [accountId, code]
      );
      if (Number(usage.rows[0]?.total ?? 0) > 0) throw new Error('COST_CENTER_IN_USE');
      const result = await client.query(
        `DELETE FROM finance_cost_centers WHERE account_id = $1 AND code = $2 RETURNING code, name, kind, owner, description`,
        [accountId, code]
      );
      if (!result.rows[0]) throw new Error('NOT_FOUND');
      return mapCostCenterRow(result.rows[0] as Record<string, unknown>);
    });
  }
}
