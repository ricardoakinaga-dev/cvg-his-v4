import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';

export const financeCostCenters = pgTable(
  'finance_cost_centers',
  {
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 100 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    kind: varchar('kind', { length: 32 }).notNull(),
    owner: varchar('owner', { length: 150 }).notNull(),
    description: text('description').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.accountId, table.code], name: 'finance_cost_centers_pk' }),
    accountNameIdx: index('idx_finance_cost_centers_account_name').on(table.accountId, table.name),
    kindCheck: check(
      'finance_cost_centers_kind_chk',
      sql`${table.kind} IN ('Operacional', 'Administrativo')`
    )
  })
);

export const financeExpenseCatalogItems = pgTable(
  'finance_expense_catalog_items',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    kind: varchar('kind', { length: 64 }).notNull(),
    category: varchar('category', { length: 64 }).notNull(),
    costCenterCode: varchar('cost_center_code', { length: 100 }).notNull(),
    costCenterName: varchar('cost_center_name', { length: 150 }).notNull(),
    description: text('description').notNull(),
    createdByUserId: varchar('created_by_user_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountNameIdx: index('idx_finance_expense_catalog_items_account_name').on(
      table.accountId,
      table.name
    ),
    accountCategoryIdx: index('idx_finance_expense_catalog_items_account_category').on(
      table.accountId,
      table.category
    ),
    accountCostCenterIdx: index('idx_finance_expense_catalog_items_account_cost_center').on(
      table.accountId,
      table.costCenterCode
    ),
    costCenterFk: foreignKey({
      name: 'finance_expense_catalog_items_cost_center_fk',
      columns: [table.accountId, table.costCenterCode],
      foreignColumns: [financeCostCenters.accountId, financeCostCenters.code]
    })
      .onUpdate('cascade')
      .onDelete('restrict')
  })
);
