import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { users } from './users.js';

export const accountServicePrincipals = pgTable(
  'account_service_principals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id').notNull(),
    purpose: varchar('purpose', { length: 64 }).$type<'pix-settlement'>().notNull(),
    userId: uuid('user_id').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountFk: foreignKey({
      name: 'account_service_principals_account_fk',
      columns: [table.accountId],
      foreignColumns: [accounts.id]
    }).onDelete('cascade'),
    accountUserFk: foreignKey({
      name: 'account_service_principals_account_user_fk',
      columns: [table.accountId, table.userId],
      foreignColumns: [users.accountId, users.id]
    }).onDelete('restrict'),
    activePurposeUnique: uniqueIndex('account_service_principals_active_purpose_unique')
      .on(table.accountId, table.purpose)
      .where(sql`${table.isActive}`),
    accountUserIdx: index('account_service_principals_account_user_idx').on(
      table.accountId,
      table.userId
    ),
    purposeChk: check(
      'account_service_principals_purpose_chk',
      sql`${table.purpose} = 'pix-settlement'`
    )
  })
);
