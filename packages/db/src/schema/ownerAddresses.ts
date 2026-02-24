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

export const ownerAddresses = pgTable(
  'owner_addresses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => owners.id, { onDelete: 'cascade' }),
    label: text('label'),
    street: text('street').notNull(),
    number: text('number'),
    complement: text('complement'),
    neighborhood: text('neighborhood'),
    city: text('city').notNull(),
    state: text('state'),
    postalCode: text('postal_code'),
    country: text('country').default('Brasil'),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountOwnerIdx: index('idx_owner_addresses_account_owner').on(table.accountId, table.ownerId),
    ownerIdx: index('idx_owner_addresses_owner').on(table.ownerId)
  })
);
