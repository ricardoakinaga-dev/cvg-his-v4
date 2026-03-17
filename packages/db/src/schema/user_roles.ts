import { pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';

import { roles } from './roles.js';
import { users } from './users.js';

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({ name: 'user_roles_pkey', columns: [table.userId, table.roleId] })
  })
);
