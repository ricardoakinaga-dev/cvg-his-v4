import { index, numeric, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const pisTables = pgTable(
  'pis_tables',
  {
    id: varchar('id', { length: 80 }).notNull().primaryKey(),
    code: varchar('code', { length: 32 }).notNull().unique(),
    description: text('description').notNull().default(''),
    percent: numeric('percent', { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    codeIdx: index('pis_tables_code_idx').on(table.code),
    descriptionIdx: index('pis_tables_description_idx').on(table.description)
  })
);

export type PisTable = typeof pisTables.$inferSelect;
export type NewPisTable = typeof pisTables.$inferInsert;
