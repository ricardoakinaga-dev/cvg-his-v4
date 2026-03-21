import { index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accessScopes } from './access_scopes.js';
import { users } from './users.js';

export const userScopeAssignments = pgTable(
  'user_scope_assignments',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    scopeId: uuid('scope_id')
      .notNull()
      .references(() => accessScopes.id, { onDelete: 'cascade' }),
    grantedByUserId: uuid('granted_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true })
  },
  (table) => ({
    pk: primaryKey({ name: 'user_scope_assignments_pkey', columns: [table.userId, table.scopeId] }),
    scopeIdx: index('user_scope_assignments_scope_idx').on(table.scopeId, table.grantedAt)
  })
);
