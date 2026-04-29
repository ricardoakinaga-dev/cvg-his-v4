import { index, numeric, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const ibsCbsTables = pgTable(
  'ibs_cbs_tables',
  {
    id: varchar('id', { length: 80 }).notNull().primaryKey(),
    code: varchar('code', { length: 32 }).notNull().unique(),
    description: text('description').notNull().default(''),
    ibsPercent: numeric('ibs_percent', { precision: 5, scale: 2 }).notNull(),
    cbsPercent: numeric('cbs_percent', { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    codeIdx: index('ibs_cbs_tables_code_idx').on(table.code),
    descriptionIdx: index('ibs_cbs_tables_description_idx').on(table.description)
  })
);

export type IbsCbsTable = typeof ibsCbsTables.$inferSelect;
export type NewIbsCbsTable = typeof ibsCbsTables.$inferInsert;
