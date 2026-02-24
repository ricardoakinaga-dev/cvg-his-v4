import { and, eq, sql } from 'drizzle-orm';

import { billingItems } from '@cvg-his/db';

import type { BillingItemCreateInput, BillingItemUpdateInput, BillingItemStatus } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

export type BillingItemsRepo = {
  listByEncounter(params: {
    accountId: string;
    encounterId: string;
    status?: BillingItemStatus;
  }): Promise<typeof billingItems.$inferSelect[]>;
  findById(params: {
    accountId: string;
    billingItemId: string;
  }): Promise<typeof billingItems.$inferSelect | null>;
  create(params: {
    accountId: string;
    encounterId: string;
    createdByUserId: string;
    input: BillingItemCreateInput;
  }): Promise<typeof billingItems.$inferSelect>;
  updateById(params: {
    accountId: string;
    billingItemId: string;
    patch: BillingItemUpdateInput;
  }): Promise<typeof billingItems.$inferSelect | null>;
  deleteById(params: {
    accountId: string;
    billingItemId: string;
  }): Promise<boolean>;
  confirmAllByEncounter(params: {
    accountId: string;
    encounterId: string;
  }): Promise<number>;
  getTotalByEncounter(params: {
    accountId: string;
    encounterId: string;
  }): Promise<string>;
  countByEncounter(params: {
    accountId: string;
    encounterId: string;
  }): Promise<number>;
};

export function createBillingItemsRepo(db: DbClient): BillingItemsRepo {
  return {
    async listByEncounter({ accountId, encounterId, status }) {
      const conditions = [
        eq(billingItems.accountId, accountId),
        eq(billingItems.encounterId, encounterId)
      ];

      if (status) {
        conditions.push(eq(billingItems.status, status));
      }

      return db
        .select()
        .from(billingItems)
        .where(and(...conditions))
        .orderBy(billingItems.createdAt);
    },

    async findById({ accountId, billingItemId }) {
      const [item] = await db
        .select()
        .from(billingItems)
        .where(and(
          eq(billingItems.accountId, accountId),
          eq(billingItems.id, billingItemId)
        ))
        .limit(1);

      return item ?? null;
    },

    async create({ accountId, encounterId, createdByUserId, input }) {
      const qty = input.qty.toString();
      const unitPrice = input.unitPrice.toString();
      const totalPrice = (input.qty * input.unitPrice).toFixed(2);

      const [item] = await db
        .insert(billingItems)
        .values({
          accountId,
          encounterId,
          serviceId: input.serviceId ?? null,
          description: input.description,
          qty,
          unitPrice,
          totalPrice,
          status: 'draft',
          createdByUserId
        })
        .returning();

      return item;
    },

    async updateById({ accountId, billingItemId, patch }) {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date()
      };

      if (patch.serviceId !== undefined) updateData.serviceId = patch.serviceId;
      if (patch.description !== undefined) updateData.description = patch.description;
      if (patch.status !== undefined) updateData.status = patch.status;

      if (patch.qty !== undefined || patch.unitPrice !== undefined) {
        // Need to fetch current item to recalculate total
        const [current] = await db
          .select()
          .from(billingItems)
          .where(and(
            eq(billingItems.accountId, accountId),
            eq(billingItems.id, billingItemId)
          ))
          .limit(1);

        if (!current) return null;

        const qty = patch.qty !== undefined ? patch.qty : parseFloat(current.qty);
        const unitPrice = patch.unitPrice !== undefined ? patch.unitPrice : parseFloat(current.unitPrice);

        if (patch.qty !== undefined) updateData.qty = qty.toString();
        if (patch.unitPrice !== undefined) updateData.unitPrice = unitPrice.toString();
        updateData.totalPrice = (qty * unitPrice).toFixed(2);
      }

      const [item] = await db
        .update(billingItems)
        .set(updateData)
        .where(and(
          eq(billingItems.accountId, accountId),
          eq(billingItems.id, billingItemId)
        ))
        .returning();

      return item ?? null;
    },

    async deleteById({ accountId, billingItemId }) {
      const [deleted] = await db
        .delete(billingItems)
        .where(and(
          eq(billingItems.accountId, accountId),
          eq(billingItems.id, billingItemId)
        ))
        .returning();

      return !!deleted;
    },

    async confirmAllByEncounter({ accountId, encounterId }) {
      const result = await db
        .update(billingItems)
        .set({ status: 'confirmed', updatedAt: new Date() })
        .where(and(
          eq(billingItems.accountId, accountId),
          eq(billingItems.encounterId, encounterId),
          eq(billingItems.status, 'draft')
        ))
        .returning();

      return result.length;
    },

    async getTotalByEncounter({ accountId, encounterId }) {
      const [result] = await db
        .select({
          total: sql<string>`COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_price::numeric ELSE 0 END), 0)`
        })
        .from(billingItems)
        .where(and(
          eq(billingItems.accountId, accountId),
          eq(billingItems.encounterId, encounterId)
        ));

      return result?.total ?? '0';
    },

    async countByEncounter({ accountId, encounterId }) {
      const [result] = await db
        .select({
          count: sql<number>`COUNT(*)::int`
        })
        .from(billingItems)
        .where(and(
          eq(billingItems.accountId, accountId),
          eq(billingItems.encounterId, encounterId)
        ));

      return result?.count ?? 0;
    }
  };
}
