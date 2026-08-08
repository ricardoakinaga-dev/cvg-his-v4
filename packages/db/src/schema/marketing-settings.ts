import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';

export const marketingSettings = pgTable(
  'marketing_settings',
  {
    accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
    settingKey: varchar('setting_key', { length: 80 }).notNull(),
    channel: varchar('channel', { length: 16 }).notNull(),
    valuesJson: jsonb('values_json').notNull(),
    updatedByUserId: uuid('updated_by_user_id').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull()
  },
  (table) => ({
    accountChannelIdx: index('idx_marketing_settings_account_channel').on(table.accountId, table.channel)
  })
);

export type MarketingSetting = typeof marketingSettings.$inferSelect;
export type NewMarketingSetting = typeof marketingSettings.$inferInsert;
