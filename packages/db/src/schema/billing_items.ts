import { sql } from 'drizzle-orm';
import { check, index, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { billingRecords } from './billing_records.js';
import { encounters } from './encounters.js';
import { users } from './users.js';

export const billingItems = pgTable(
  'billing_items',
  {
    id: text('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    billingRecordId: text('billing_record_id')
      .notNull()
      .references(() => billingRecords.id, { onDelete: 'cascade' }),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    itemType: text('item_type').notNull(),
    description: text('description').notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
    unitPriceAmount: numeric('unit_price_amount', { precision: 12, scale: 2 }).notNull(),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    sourceEntityType: text('source_entity_type'),
    sourceEntityId: text('source_entity_id'),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountRecordIdx: index('idx_billing_items_account_record').on(
      table.accountId,
      table.billingRecordId
    ),
    accountEncounterIdx: index('idx_billing_items_account_encounter').on(
      table.accountId,
      table.encounterId
    ),
    accountTypeIdx: index('idx_billing_items_account_type').on(table.accountId, table.itemType),
    sourceIdx: index('idx_billing_items_source').on(
      table.accountId,
      table.sourceEntityType,
      table.sourceEntityId
    ),
    itemTypeChk: check(
      'billing_items_item_type_chk',
      sql`${table.itemType} in ('service', 'supply', 'procedure', 'exam', 'daily_rate', 'other')`
    ),
    sourceTypeChk: check(
      'billing_items_source_type_chk',
      sql`${table.sourceEntityType} is null or ${table.sourceEntityType} in ('encounter', 'diagnostic_order', 'surgery_case', 'inpatient_stay', 'prescription')`
    ),
    quantityPositiveChk: check('billing_items_quantity_positive_chk', sql`${table.quantity} > 0`),
    unitPriceNonNegativeChk: check(
      'billing_items_unit_price_non_negative_chk',
      sql`${table.unitPriceAmount} >= 0`
    ),
    totalNonNegativeChk: check('billing_items_total_non_negative_chk', sql`${table.totalAmount} >= 0`)
  })
);
