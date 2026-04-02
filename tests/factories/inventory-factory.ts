import { uuid, insertOne, cleanupRegistry, queryOne } from '../helpers/db-helpers.js';
import { ensureDefaultAccount } from './unit-factory.js';

export interface ProductRecord {
  id: string;
  accountId: string;
  name: string;
  code: string | null;
  description: string | null;
  basePrice: number;
  active: boolean;
}

export interface ProductOptions {
  accountId?: string;
  name?: string;
  code?: string;
  description?: string;
  basePrice?: number;
  active?: boolean;
}

export async function createProduct(options: ProductOptions = {}): Promise<ProductRecord> {
  const id = uuid();
  const accountId = options.accountId ?? (await ensureDefaultAccount());
  const name = options.name ?? `Produto ${id.slice(0, 8)}`;
  const code = options.code ?? `PROD-${id.slice(0, 6).toUpperCase()}`;
  const description = options.description ?? null;
  const basePrice = options.basePrice ?? 10.0;
  const active = options.active !== false;

  const row = await insertOne<Record<string, unknown>>(
    `INSERT INTO products (id, account_id, name, code, description, base_price, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, account_id, name, code, description, base_price, active`,
    [id, accountId, name, code, description, basePrice, active]
  );

  const product: ProductRecord = {
    id: row.id as string,
    accountId: row.account_id as string,
    name: row.name as string,
    code: row.code as string | null,
    description: row.description as string | null,
    basePrice: Number(row.base_price),
    active: row.active as boolean
  };

  cleanupRegistry.register('products', id);
  return product;
}

export interface StockItemRecord {
  id: string;
  accountId: string;
  productId: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number | null;
  location: string | null;
  active: boolean;
}

export interface StockItemOptions {
  accountId?: string;
  productId?: string;
  quantity?: number;
  minQuantity?: number;
  maxQuantity?: number;
  location?: string;
  active?: boolean;
}

export async function createStockItem(options: StockItemOptions = {}): Promise<StockItemRecord> {
  const id = uuid();
  const accountId = options.accountId ?? (await ensureDefaultAccount());
  const productId = options.productId ?? (await createProduct({ accountId })).id;
  const quantity = options.quantity ?? 100;
  const minQuantity = options.minQuantity ?? 10;
  const maxQuantity = options.maxQuantity ?? null;
  const location = options.location ?? null;
  const active = options.active !== false;

  const row = await insertOne<Record<string, unknown>>(
    `INSERT INTO stock_items (id, account_id, product_id, quantity, min_quantity, max_quantity, location, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, account_id, product_id, quantity, min_quantity, max_quantity, location, active`,
    [id, accountId, productId, quantity, minQuantity, maxQuantity, location, active]
  );

  const item: StockItemRecord = {
    id: row.id as string,
    accountId: row.account_id as string,
    productId: row.product_id as string,
    quantity: row.quantity as number,
    minQuantity: row.min_quantity as number,
    maxQuantity: row.max_quantity as number | null,
    location: row.location as string | null,
    active: row.active as boolean
  };

  cleanupRegistry.register('stock_items', id);
  return item;
}

export async function findProductById(id: string): Promise<ProductRecord | null> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT id, account_id, name, code, description, base_price, active FROM products WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!row) return null;
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    name: row.name as string,
    code: row.code as string | null,
    description: row.description as string | null,
    basePrice: Number(row.base_price),
    active: row.active as boolean
  };
}

export async function findStockItemById(id: string): Promise<StockItemRecord | null> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT id, account_id, product_id, quantity, min_quantity, max_quantity, location, active FROM stock_items WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!row) return null;
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    productId: row.product_id as string,
    quantity: row.quantity as number,
    minQuantity: row.min_quantity as number,
    maxQuantity: row.max_quantity as number | null,
    location: row.location as string | null,
    active: row.active as boolean
  };
}
