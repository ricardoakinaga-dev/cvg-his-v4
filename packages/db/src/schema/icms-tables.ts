import { index, numeric, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const icmsTables = pgTable(
  'icms_tables',
  {
    id: varchar('id', { length: 80 }).notNull().primaryKey(),
    code: varchar('code', { length: 32 }).notNull().unique(),
    description: text('description').notNull().default(''),
    percent: numeric('percent', { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    codeIdx: index('icms_tables_code_idx').on(table.code),
    descriptionIdx: index('icms_tables_description_idx').on(table.description)
  })
);

export type IcmsTable = typeof icmsTables.$inferSelect;
export type NewIcmsTable = typeof icmsTables.$inferInsert;
