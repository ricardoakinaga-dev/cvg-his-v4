import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { accounts } from './accounts.js';
import { encounters } from './encounters.js';
import { inpatientStays } from './inpatient_stays.js';
import { medicationOrders } from './medication_orders.js';
import { users } from './users.js';

export const medicationAdministrationStatusEnum = pgEnum('medication_administration_status', [
  'administered',
  'refused',
  'delayed',
  'held'
]);

export const medicationAdministrations = pgTable(
  'medication_administrations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => medicationOrders.id, { onDelete: 'cascade' }),
    stayId: uuid('stay_id').references(() => inpatientStays.id, { onDelete: 'set null' }),
    encounterId: uuid('encounter_id').references(() => encounters.id, { onDelete: 'set null' }),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    administeredAt: timestamp('administered_at', { withTimezone: true }),
    effectiveAt: timestamp('effective_at', { withTimezone: true }),
    delayedUntil: timestamp('delayed_until', { withTimezone: true }),
    status: medicationAdministrationStatusEnum('status').notNull(),
    reason: text('reason'),
    administeredByUserId: uuid('administered_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    orderScheduledIdx: index('idx_medication_administrations_order_scheduled').on(
      table.orderId,
      table.scheduledFor
    ),
    accountStayScheduledIdx: index('idx_medication_administrations_account_stay_scheduled').on(
      table.accountId,
      table.stayId,
      table.scheduledFor
    ),
    orderSlotUnique: uniqueIndex('uq_medication_administrations_order_slot').on(
      table.orderId,
      table.scheduledFor
    ),
    reasonConsistencyChk: check(
      'medication_administrations_reason_required_chk',
      sql`(
        (${table.status} = 'administered' and ${table.reason} is null and ${table.effectiveAt} is not null and ${table.delayedUntil} is null)
        or
        (${table.status} = 'delayed' and ${table.reason} is not null and length(btrim(${table.reason})) > 0 and ${table.delayedUntil} is not null and ${table.effectiveAt} is null)
        or
        (${table.status} in ('refused', 'held') and ${table.reason} is not null and length(btrim(${table.reason})) > 0 and ${table.delayedUntil} is null and ${table.effectiveAt} is null)
      )`
    )
  })
);
