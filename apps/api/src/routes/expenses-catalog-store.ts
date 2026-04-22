import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface ExpenseCatalogItem {
  id: string;
  accountId: string;
  name: string;
  kind: string;
  category: string;
  costCenterCode: string;
  costCenterName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ExpenseCostCenterItem {
  code: string;
  name: string;
  kind: string;
  owner: string;
  description: string;
}

export interface ExpenseCatalogPayload {
  name: string;
  kind: string;
  category: string;
  costCenterCode: string;
  description: string;
}

export interface CostCenterCatalogPayload {
  code: string;
  name: string;
  kind: string;
  owner: string;
  description: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ExpenseCatalogFilters extends PaginationParams {
  search?: string;
  category?: string;
  costCenterCode?: string;
}

export interface CostCenterCatalogFilters extends PaginationParams {
  search?: string;
  kind?: string;
}

interface ExpenseCatalogAccountState {
  items: ExpenseCatalogItem[];
}

interface ExpenseCatalogState {
  version: 1;
  categories: string[];
  costCenters: ExpenseCostCenterItem[];
  accounts: Record<string, ExpenseCatalogAccountState>;
}

const DEFAULT_CATEGORIES = ['Infraestrutura', 'Logística', 'Tecnologia'] as const;

const DEFAULT_COST_CENTERS: ExpenseCostCenterItem[] = [
  {
    code: 'CLI-ATD',
    name: 'Atendimento Clínico',
    kind: 'Operacional',
    owner: 'Coordenação Assistencial',
    description: 'Receita e custo ligados a consultas, procedimentos e jornada ambulatorial.'
  },
  {
    code: 'ESTOQUE',
    name: 'Suprimentos e Estoque',
    kind: 'Administrativo',
    owner: 'Backoffice',
    description: 'Rateio de reposição, compras e consumo estrutural do hospital.'
  },
  {
    code: 'LAB-OP',
    name: 'Laboratório',
    kind: 'Operacional',
    owner: 'Coordenação Laboratorial',
    description: 'Estrutura inicial para separar leitura econômica do domínio laboratorial.'
  }
];

const DEFAULT_ITEMS: ExpenseCatalogItem[] = [
  {
    id: 'DES-101',
    accountId: 'acc-1',
    name: 'Energia Elétrica',
    kind: 'Fixo',
    category: 'Infraestrutura',
    costCenterCode: 'ESTOQUE',
    costCenterName: 'Suprimentos e Estoque',
    description: 'Despesa estrutural da operação',
    createdAt: '2026-04-22T00:00:00.000Z',
    updatedAt: '2026-04-22T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'DES-214',
    accountId: 'acc-1',
    name: 'Frete de Suprimentos',
    kind: 'Operacional',
    category: 'Logística',
    costCenterCode: 'CLI-ATD',
    costCenterName: 'Atendimento Clínico',
    description: 'Reposição de estoque',
    createdAt: '2026-04-22T00:00:00.000Z',
    updatedAt: '2026-04-22T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'DES-318',
    accountId: 'acc-1',
    name: 'Licenças de Software',
    kind: 'Fixo',
    category: 'Tecnologia',
    costCenterCode: 'LAB-OP',
    costCenterName: 'Laboratório',
    description: 'Base administrativa para serviços digitais',
    createdAt: '2026-04-22T00:00:00.000Z',
    updatedAt: '2026-04-22T00:00:00.000Z',
    createdBy: 'system'
  }
];

function defaultState(): ExpenseCatalogState {
  return {
    version: 1,
    categories: [...DEFAULT_CATEGORIES],
    costCenters: DEFAULT_COST_CENTERS.map((item) => ({ ...item })),
    accounts: {}
  };
}

function defaultItemsForAccount(accountId: string): ExpenseCatalogItem[] {
  return DEFAULT_ITEMS.filter((item) => item.accountId === accountId).map((item) => ({ ...item }));
}

function normalizeSearch(value?: string): string {
  return String(value ?? '').trim().toLowerCase();
}

function normalizePage(value?: number): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : 1;
}

function normalizePageSize(value?: number): number {
  return Number.isFinite(value) && Number(value) > 0 ? Math.min(Number(value), 100) : 10;
}

function paginateAndSortItems<T extends object>(items: T[], options: PaginationParams, defaultSort: keyof T & string) {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(options.pageSize);
  const sort = (options.sort ?? defaultSort) as keyof T & string;
  const order = options.order === 'desc' ? 'desc' : 'asc';
  const sorted = [...items].sort((left, right) => {
    const leftValue = String((left as Record<string, unknown>)[sort] ?? '').toLowerCase();
    const rightValue = String((right as Record<string, unknown>)[sort] ?? '').toLowerCase();
    const base = leftValue.localeCompare(rightValue, 'pt-BR');
    return order === 'desc' ? -base : base;
  });
  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    items: sorted.slice(start, start + pageSize),
    page: currentPage,
    pageSize,
    totalItems,
    totalPages,
    sort,
    order
  };
}

export function createDefaultExpensesCatalogStoragePath(): string {
  return process.env.CVG_HIS_EXPENSES_CATALOG_PATH ?? join(process.cwd(), 'data', 'expenses-catalog.json');
}

export class ExpensesCatalogStore {
  readonly #storagePath: string;

  constructor(storagePath: string = createDefaultExpensesCatalogStoragePath()) {
    this.#storagePath = storagePath;
  }

  async list(accountId: string, filters: ExpenseCatalogFilters = {}) {
    const state = await this.#loadState();
    const account = this.#ensureAccount(state, accountId);
    const search = normalizeSearch(filters.search);
    const category = normalizeSearch(filters.category);
    const costCenterCode = normalizeSearch(filters.costCenterCode);

    const filtered = account.items.filter((item) => {
      const matchesSearch =
        !search ||
        item.id.toLowerCase().includes(search) ||
        item.name.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search);
      const matchesCategory = !category || item.category.toLowerCase().includes(category);
      const matchesCostCenter =
        !costCenterCode ||
        item.costCenterCode.toLowerCase().includes(costCenterCode) ||
        item.costCenterName.toLowerCase().includes(costCenterCode);
      return matchesSearch && matchesCategory && matchesCostCenter;
    });

    return {
      ...paginateAndSortItems(filtered, filters, 'name'),
      categories: state.categories,
      costCenters: state.costCenters
    };
  }

  async listCostCenters(filters: CostCenterCatalogFilters = {}) {
    const state = await this.#loadState();
    const search = normalizeSearch(filters.search);
    const kind = normalizeSearch(filters.kind);
    const filtered = state.costCenters.filter((item) => {
      const matchesSearch =
        !search ||
        item.code.toLowerCase().includes(search) ||
        item.name.toLowerCase().includes(search) ||
        item.owner.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search);
      const matchesKind = !kind || item.kind.toLowerCase().includes(kind);
      return matchesSearch && matchesKind;
    });

    return paginateAndSortItems(filtered, filters, 'name');
  }

  async create(accountId: string, actorId: string, payload: ExpenseCatalogPayload): Promise<ExpenseCatalogItem> {
    const state = await this.#loadState();
    const account = this.#ensureAccount(state, accountId);
    const costCenter = this.findCostCenter(state, payload.costCenterCode)!;
    const now = new Date().toISOString();
    const created: ExpenseCatalogItem = {
      id: this.#nextId(account.items),
      accountId,
      name: payload.name,
      kind: payload.kind,
      category: payload.category,
      costCenterCode: costCenter.code,
      costCenterName: costCenter.name,
      description: payload.description,
      createdAt: now,
      updatedAt: now,
      createdBy: actorId
    };
    account.items.unshift(created);
    await this.#saveState(state);
    return created;
  }

  async update(accountId: string, expenseId: string, payload: ExpenseCatalogPayload): Promise<{ item: ExpenseCatalogItem; diffSummary: string }> {
    const state = await this.#loadState();
    const account = this.#ensureAccount(state, accountId);
    const existing = account.items.find((item) => item.id === expenseId);
    if (!existing) throw new Error('NOT_FOUND');

    const previous = { ...existing };
    const costCenter = this.findCostCenter(state, payload.costCenterCode)!;
    existing.name = payload.name;
    existing.kind = payload.kind;
    existing.category = payload.category;
    existing.costCenterCode = costCenter.code;
    existing.costCenterName = costCenter.name;
    existing.description = payload.description;
    existing.updatedAt = new Date().toISOString();
    await this.#saveState(state);

    return { item: existing, diffSummary: summarizeDiff(previous, existing) };
  }

  async remove(accountId: string, expenseId: string): Promise<ExpenseCatalogItem> {
    const state = await this.#loadState();
    const account = this.#ensureAccount(state, accountId);
    const index = account.items.findIndex((item) => item.id === expenseId);
    if (index === -1) throw new Error('NOT_FOUND');
    const removed = account.items.splice(index, 1)[0];
    await this.#saveState(state);
    return removed;
  }

  async createCostCenter(payload: CostCenterCatalogPayload): Promise<ExpenseCostCenterItem> {
    const state = await this.#loadState();
    if (state.costCenters.some((center) => center.code === payload.code)) {
      throw new Error('DUPLICATE_COST_CENTER_CODE');
    }
    const created: ExpenseCostCenterItem = { ...payload };
    state.costCenters.push(created);
    await this.#saveState(state);
    return created;
  }

  async updateCostCenter(code: string, payload: CostCenterCatalogPayload): Promise<{ item: ExpenseCostCenterItem; diffSummary: string }> {
    const state = await this.#loadState();
    const existing = state.costCenters.find((center) => center.code === code);
    if (!existing) throw new Error('NOT_FOUND');
    if (payload.code !== code && state.costCenters.some((center) => center.code === payload.code)) {
      throw new Error('DUPLICATE_COST_CENTER_CODE');
    }

    const previous = { ...existing };
    existing.code = payload.code;
    existing.name = payload.name;
    existing.kind = payload.kind;
    existing.owner = payload.owner;
    existing.description = payload.description;

    Object.values(state.accounts).forEach((account) => {
      account.items.forEach((item) => {
        if (item.costCenterCode === code) {
          item.costCenterCode = existing.code;
          item.costCenterName = existing.name;
          item.updatedAt = new Date().toISOString();
        }
      });
    });

    await this.#saveState(state);
    return { item: existing, diffSummary: summarizeCostCenterDiff(previous, existing) };
  }

  async removeCostCenter(code: string): Promise<ExpenseCostCenterItem> {
    const state = await this.#loadState();
    const inUse = Object.values(state.accounts).some((account) => account.items.some((item) => item.costCenterCode === code));
    if (inUse) throw new Error('COST_CENTER_IN_USE');

    const index = state.costCenters.findIndex((center) => center.code === code);
    if (index === -1) throw new Error('NOT_FOUND');
    const removed = state.costCenters.splice(index, 1)[0];
    await this.#saveState(state);
    return removed;
  }

  findCostCenter(state: ExpenseCatalogState, code: string): ExpenseCostCenterItem | undefined {
    return state.costCenters.find((center) => center.code === code);
  }

  isValidCategory(category: string): boolean {
    return DEFAULT_CATEGORIES.includes(category as (typeof DEFAULT_CATEGORIES)[number]);
  }

  async #loadState(): Promise<ExpenseCatalogState> {
    try {
      const raw = await readFile(this.#storagePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<ExpenseCatalogState>;
      return {
        version: 1,
        categories: parsed.categories?.length ? [...parsed.categories] : [...DEFAULT_CATEGORIES],
        costCenters: parsed.costCenters?.length
          ? parsed.costCenters.map((item) => ({ ...item }))
          : DEFAULT_COST_CENTERS.map((item) => ({ ...item })),
        accounts: parsed.accounts ?? {}
      };
    } catch {
      return defaultState();
    }
  }

  #ensureAccount(state: ExpenseCatalogState, accountId: string): ExpenseCatalogAccountState {
    if (!state.accounts[accountId]) {
      state.accounts[accountId] = { items: defaultItemsForAccount(accountId) };
    }
    return state.accounts[accountId];
  }

  async #saveState(state: ExpenseCatalogState): Promise<void> {
    await mkdir(dirname(this.#storagePath), { recursive: true });
    await writeFile(this.#storagePath, JSON.stringify(state, null, 2), 'utf8');
  }

  #nextId(items: ExpenseCatalogItem[]): string {
    const max = items.reduce((current, item) => {
      const match = item.id.match(/DES-(\d+)/);
      const value = match ? Number(match[1]) : 0;
      return Math.max(current, value);
    }, 0);
    return `DES-${String(max + 1).padStart(3, '0')}`;
  }
}

function summarizeDiff(previous: ExpenseCatalogItem, current: ExpenseCatalogItem): string {
  const changes: string[] = [];
  const fields: Array<keyof ExpenseCatalogItem> = ['name', 'kind', 'category', 'costCenterCode', 'description'];
  for (const field of fields) {
    if (previous[field] !== current[field]) {
      changes.push(`${field}: ${previous[field]} → ${current[field]}`);
    }
  }
  return changes.join('; ');
}

function summarizeCostCenterDiff(previous: ExpenseCostCenterItem, current: ExpenseCostCenterItem): string {
  const changes: string[] = [];
  const fields: Array<keyof ExpenseCostCenterItem> = ['code', 'name', 'kind', 'owner', 'description'];
  for (const field of fields) {
    if (previous[field] !== current[field]) {
      changes.push(`${field}: ${previous[field]} → ${current[field]}`);
    }
  }
  return changes.join('; ');
}
