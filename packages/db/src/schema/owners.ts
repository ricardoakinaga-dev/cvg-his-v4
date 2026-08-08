import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { units } from './units.js';

export const owners = pgTable(
  'owners',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    unitId: uuid('unit_id').references(() => units.id, { onDelete: 'set null' }),
    fullName: text('full_name').notNull(),
    document: text('document'),
    email: text('email'),
    phoneMain: text('phone_main'),
    phoneAlt: text('phone_alt'),
    addressJson: jsonb('address_json').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountFullNameIdx: index('idx_owners_account_full_name').on(table.accountId, table.fullName),
    accountDocumentIdx: index('idx_owners_account_document').on(table.accountId, table.document),
    accountPhoneMainIdx: index('idx_owners_account_phone').on(table.accountId, table.phoneMain),
    accountIdIdUnique: uniqueIndex('idx_owners_account_id_id_unique').on(table.accountId, table.id)
  })
);
