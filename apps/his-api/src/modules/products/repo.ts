import { and, eq, ilike, inArray, or, sql } from 'drizzle-orm';

import { products } from '@cvg-his/db';

import type { ProductCreateInput, ProductUpdateInput } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

export type ProductsRepo = {
  list(params: {
    accountId: string;
    page: number;
    pageSize: number;
    q?: string;
    active?: boolean;
    category?: string;
  }): Promise<{ items: typeof products.$inferSelect[]; total: number }>;
  findById(accountId: string, productId: string): Promise<typeof products.$inferSelect | null>;
  findBySku(accountId: string, sku: string): Promise<typeof products.$inferSelect | null>;
  create(input: { accountId: string } & ProductCreateInput): Promise<typeof products.$inferSelect>;
  updateById(params: {
    accountId: string;
    productId: string;
    patch: ProductUpdateInput;
  }): Promise<typeof products.$inferSelect | null>;
  deleteById(accountId: string, productId: string): Promise<boolean>;
};

export function createProductsRepo(db: DbClient): ProductsRepo {
  return {
    async list({ accountId, page, pageSize, q, active, category }) {
      const conditions = [eq(products.accountId, accountId)];

      if (active !== undefined) {
        conditions.push(eq(products.active, active));
      }

      if (category) {
        conditions.push(eq(products.category, category));
      }

      if (q) {
        const searchPattern = `%${q}%`;
        conditions.push(or(ilike(products.sku, searchPattern), ilike(products.name, searchPattern))!);
      }

      const whereClause = and(...conditions);

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(whereClause);

      const total = countResult?.count ?? 0;

      // Get paginated items
      const offset = (page - 1) * pageSize;
      const items = await db
        .select()
        .from(products)
        .where(whereClause)
        .orderBy(products.name)
        .limit(pageSize)
        .offset(offset);

      return { items, total };
    },

    async findById(accountId, productId) {
      const [product] = await db
        .select()
        .from(products)
        .where(and(eq(products.accountId, accountId), eq(products.id, productId)))
        .limit(1);

      return product ?? null;
    },

    async findBySku(accountId, sku) {
      const [product] = await db
        .select()
        .from(products)
        .where(and(eq(products.accountId, accountId), eq(products.sku, sku)))
        .limit(1);

      return product ?? null;
    },

    async create(input) {
      const [product] = await db
        .insert(products)
        .values({
          accountId: input.accountId,
          sku: input.sku,
          name: input.name,
          category: input.category ?? null,
          uom: input.uom ?? null,
          cost: input.cost?.toString() ?? '0',
          price: input.price?.toString() ?? '0',
          isControlled: input.isControlled ?? false,
          trackLot: input.trackLot ?? false,
          trackExpiry: input.trackExpiry ?? false,
          minStock: input.minStock?.toString() ?? '0',
          active: input.active ?? true
        })
        .returning();

      return product;
    },

    async updateById({ accountId, productId, patch }) {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date()
      };

      if (patch.sku !== undefined) updateData.sku = patch.sku;
      if (patch.name !== undefined) updateData.name = patch.name;
      if (patch.category !== undefined) updateData.category = patch.category;
      if (patch.uom !== undefined) updateData.uom = patch.uom;
      if (patch.cost !== undefined) updateData.cost = patch.cost.toString();
      if (patch.price !== undefined) updateData.price = patch.price.toString();
      if (patch.isControlled !== undefined) updateData.isControlled = patch.isControlled;
      if (patch.trackLot !== undefined) updateData.trackLot = patch.trackLot;
      if (patch.trackExpiry !== undefined) updateData.trackExpiry = patch.trackExpiry;
      if (patch.minStock !== undefined) updateData.minStock = patch.minStock.toString();
      if (patch.active !== undefined) updateData.active = patch.active;

      const [product] = await db
        .update(products)
        .set(updateData)
        .where(and(eq(products.accountId, accountId), eq(products.id, productId)))
        .returning();

      return product ?? null;
    },

    async deleteById(accountId, productId) {
      const [deleted] = await db
        .delete(products)
        .where(and(eq(products.accountId, accountId), eq(products.id, productId)))
        .returning();

      return !!deleted;
    }
  };
}
