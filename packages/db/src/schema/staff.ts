import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
  index,
  boolean
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';

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
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdx: index('idx_staff_account').on(table.accountId),
    codeUnique: uniqueIndex('idx_staff_code_unique').on(table.accountId, table.employeeCode),
    userIdx: index('idx_staff_user').on(table.userId)
  })
);
