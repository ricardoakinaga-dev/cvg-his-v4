import {
  boolean,
  foreignKey,
  pgTable,
  text,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';

export const professions = pgTable(
  'professions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdUnique: uniqueIndex('idx_professions_account_id_unique').on(table.accountId, table.id),
    accountCodeUnique: uniqueIndex('idx_professions_account_code_unique').on(table.accountId, table.code),
    accountNameUnique: uniqueIndex('idx_professions_account_name_unique').on(table.accountId, table.name),
    accountActiveIdx: index('idx_professions_account_active').on(table.accountId, table.isActive, table.name)
  })
);

export const staff = pgTable(
  'staff',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),
    employeeCode: varchar('employee_code', { length: 50 }).notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    department: varchar('department', { length: 100 }),
    jobTitle: varchar('job_title', { length: 150 }),
    professionId: uuid('profession_id'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdx: index('idx_staff_account').on(table.accountId),
    codeUnique: uniqueIndex('idx_staff_code_unique').on(table.accountId, table.employeeCode),
    userIdx: index('idx_staff_user').on(table.userId),
    accountIdIdUnique: uniqueIndex('idx_staff_account_id_id_unique').on(table.accountId, table.id),
    accountProfessionIdx: index('idx_staff_account_profession').on(table.accountId, table.professionId),
    accountProfessionFk: foreignKey({
      name: 'staff_account_profession_fk',
      columns: [table.accountId, table.professionId],
      foreignColumns: [professions.accountId, professions.id]
    })
  })
);
