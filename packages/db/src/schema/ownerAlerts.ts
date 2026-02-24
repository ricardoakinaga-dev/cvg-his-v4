import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { owners } from './owners.js';

export type OwnerAlertSeverity = 'info' | 'warning' | 'critical';

export const ownerAlerts = pgTable(
  'owner_alerts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => owners.id, { onDelete: 'cascade' }),
    severity: text('severity').notNull().default('info').$type<OwnerAlertSeverity>(),
    title: text('title').notNull(),
    message: text('message'),
    isActive: boolean('is_active').notNull().default(true),
    createdByUserId: uuid('created_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedByUserId: uuid('resolved_by_user_id')
  },
  (table) => ({
    accountOwnerIdx: index('idx_owner_alerts_account_owner').on(table.accountId, table.ownerId),
    ownerIdx: index('idx_owner_alerts_owner').on(table.ownerId),
    activeIdx: index('idx_owner_alerts_active').on(table.accountId, table.isActive)
  })
);
