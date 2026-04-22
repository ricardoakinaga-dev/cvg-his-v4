export interface ExpenseCatalogItem {
  id: string;
  name: string;
  kind: string;
  category: string;
  description: string;
}

export interface CreateExpenseCatalogItemInput {
  name: string;
  kind: string;
  category: string;
  description: string;
}

export interface UpdateExpenseCatalogItemInput extends CreateExpenseCatalogItemInput {}

const STORAGE_KEY = 'cvg-his-v2:finance:expenses-catalog';

const DEFAULT_ITEMS: ExpenseCatalogItem[] = [
  {
    id: 'DES-101',
    name: 'Energia Elétrica',
    kind: 'Fixo',
    category: 'Infraestrutura',
    description: 'Despesa estrutural da operação'
  },
  {
    id: 'DES-214',
    name: 'Frete de Suprimentos',
    kind: 'Operacional',
    category: 'Logística',
    description: 'Reposição de estoque'
  },
  {
    id: 'DES-318',
    name: 'Licenças de Software',
    kind: 'Fixo',
    category: 'Tecnologia',
    description: 'Base administrativa para serviços digitais'
  }
];

function normalizeItem(item: Partial<ExpenseCatalogItem>): ExpenseCatalogItem {
  return {
    id: String(item.id ?? ''),
    name: String(item.name ?? '').trim(),
    kind: String(item.kind ?? 'Variável').trim() || 'Variável',
    category: String(item.category ?? 'Geral').trim() || 'Geral',
    description: String(item.description ?? '').trim()
  };
}

function readStorage(): ExpenseCatalogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_ITEMS];
    const parsed = JSON.parse(raw) as ExpenseCatalogItem[];
    return Array.isArray(parsed) ? parsed.map(normalizeItem) : [...DEFAULT_ITEMS];
  } catch {
    return [...DEFAULT_ITEMS];
  }
}

function writeStorage(items: ExpenseCatalogItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* noop */
  }
}

function nextId(items: ExpenseCatalogItem[]): string {
  const max = items.reduce((current, item) => {
    const match = item.id.match(/DES-(\d+)/);
    const value = match ? Number(match[1]) : 0;
    return Math.max(current, value);
  }, 0);
  return `DES-${String(max + 1).padStart(3, '0')}`;
}

export const expensesCatalogService = {
  async list(): Promise<ExpenseCatalogItem[]> {
    return readStorage();
  },

  async create(input: CreateExpenseCatalogItemInput): Promise<ExpenseCatalogItem> {
    const items = readStorage();
    const created: ExpenseCatalogItem = normalizeItem({
      id: nextId(items),
      name: input.name,
      kind: input.kind,
      category: input.category,
      description: input.description
    });
    const next = [created, ...items];
    writeStorage(next);
    return created;
  },

  async update(id: string, input: UpdateExpenseCatalogItemInput): Promise<ExpenseCatalogItem> {
    const items = readStorage();
    const updated = normalizeItem({
      id,
      name: input.name,
      kind: input.kind,
      category: input.category,
      description: input.description
    });
    const next = items.map((item) => (item.id === id ? updated : item));
    writeStorage(next);
    return updated;
  },

  async remove(id: string): Promise<{ ok: true }> {
    const items = readStorage();
    const next = items.filter((item) => item.id !== id);
    writeStorage(next);
    return { ok: true };
  }
};
