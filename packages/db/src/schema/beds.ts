import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { sectors } from './sectors.js';
import { wards } from './wards.js';

export const beds = pgTable(
  'beds',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    wardId: uuid('ward_id')
      .references(() => wards.id, { onDelete: 'cascade' }),
    sectorId: varchar('sector_id', { length: 255 })
      .notNull()
      .references(() => sectors.id),
    name: text('name').notNull(),
    code: text('code').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('available'),
    supportsSpecies: varchar('supports_species', { length: 100 }),
    active: boolean('active').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountWardActiveIdx: index('idx_beds_account_ward_active').on(
      table.accountId,
      table.wardId,
      table.isActive
    ),
    accountSectorActiveIdx: index('idx_beds_account_sector_active').on(
      table.accountId,
      table.sectorId,
      table.active
    ),
    accountSectorCodeUnique: uniqueIndex('idx_beds_account_sector_code_unique').on(
      table.accountId,
      table.sectorId,
      table.code
    )
  })
);
