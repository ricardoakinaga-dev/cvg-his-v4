import { and, eq, ilike, inArray, or, sql } from 'drizzle-orm';

import { services } from '@cvg-his/db';

import type { ServiceCreateInput, ServiceUpdateInput } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

export type ServicesRepo = {
  list(params: {
    accountId: string;
    page: number;
    pageSize: number;
    q?: string;
    group?: string;
    sector?: string;
    active?: boolean;
  }): Promise<{ items: typeof services.$inferSelect[]; total: number }>;
  findById(accountId: string, serviceId: string): Promise<typeof services.$inferSelect | null>;
  findByCode(accountId: string, code: string): Promise<typeof services.$inferSelect | null>;
  create(input: { accountId: string } & ServiceCreateInput): Promise<typeof services.$inferSelect>;
  updateById(params: {
    accountId: string;
    serviceId: string;
    patch: ServiceUpdateInput;
  }): Promise<typeof services.$inferSelect | null>;
  deleteById(accountId: string, serviceId: string): Promise<boolean>;
};

export function createServicesRepo(db: DbClient): ServicesRepo {
  return {
    async list({ accountId, page, pageSize, q, group, sector, active }) {
      const conditions = [eq(services.accountId, accountId)];

      if (active !== undefined) {
        conditions.push(eq(services.active, active));
      }

      if (group) {
        conditions.push(eq(services.group, group));
      }

      if (sector) {
        conditions.push(eq(services.sector, sector));
      }

      if (q) {
        const searchPattern = `%${q}%`;
        conditions.push(or(ilike(services.code, searchPattern), ilike(services.name, searchPattern))!);
      }

      const whereClause = and(...conditions);

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(services)
        .where(whereClause);

      const total = countResult?.count ?? 0;

      // Get paginated items
      const offset = (page - 1) * pageSize;
      const items = await db
        .select()
        .from(services)
        .where(whereClause)
        .orderBy(services.name)
        .limit(pageSize)
        .offset(offset);

      return { items, total };
    },

    async findById(accountId, serviceId) {
      const [service] = await db
        .select()
        .from(services)
        .where(and(eq(services.accountId, accountId), eq(services.id, serviceId)))
        .limit(1);

      return service ?? null;
    },

    async findByCode(accountId, code) {
      const [service] = await db
        .select()
        .from(services)
        .where(and(eq(services.accountId, accountId), eq(services.code, code)))
        .limit(1);

      return service ?? null;
    },

    async create(input) {
      const [service] = await db
        .insert(services)
        .values({
          accountId: input.accountId,
          code: input.code,
          name: input.name,
          group: input.group,
          sector: input.sector,
          basePrice: input.basePrice?.toString() ?? '0',
          durationMinutes: input.durationMinutes ?? null,
          requiresReport: input.requiresReport ?? false,
          consumesStock: input.consumesStock ?? false,
          active: input.active ?? true
        })
        .returning();

      return service;
    },

    async updateById({ accountId, serviceId, patch }) {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date()
      };

      if (patch.code !== undefined) updateData.code = patch.code;
      if (patch.name !== undefined) updateData.name = patch.name;
      if (patch.group !== undefined) updateData.group = patch.group;
      if (patch.sector !== undefined) updateData.sector = patch.sector;
      if (patch.basePrice !== undefined) updateData.basePrice = patch.basePrice.toString();
      if (patch.durationMinutes !== undefined) updateData.durationMinutes = patch.durationMinutes;
      if (patch.requiresReport !== undefined) updateData.requiresReport = patch.requiresReport;
      if (patch.consumesStock !== undefined) updateData.consumesStock = patch.consumesStock;
      if (patch.active !== undefined) updateData.active = patch.active;

      const [service] = await db
        .update(services)
        .set(updateData)
        .where(and(eq(services.accountId, accountId), eq(services.id, serviceId)))
        .returning();

      return service ?? null;
    },

    async deleteById(accountId, serviceId) {
      const [deleted] = await db
        .delete(services)
        .where(and(eq(services.accountId, accountId), eq(services.id, serviceId)))
        .returning();

      return !!deleted;
    }
  };
}
