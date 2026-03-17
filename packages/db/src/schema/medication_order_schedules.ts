import { index, integer, jsonb, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { medicationOrders } from './medication_orders.js';

export const medicationOrderScheduleTypeEnum = pgEnum('medication_order_schedule_type', [
  'interval',
  'fixed_times'
]);

export const medicationOrderSchedules = pgTable(
  'medication_order_schedules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => medicationOrders.id, { onDelete: 'cascade' }),
    scheduleType: medicationOrderScheduleTypeEnum('schedule_type').notNull(),
    intervalMinutes: integer('interval_minutes'),
    timesJson: jsonb('times_json').$type<string[]>(),
    nextDueAt: timestamp('next_due_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    orderIdx: index('idx_medication_order_schedules_order_id').on(table.orderId),
    nextDueAtIdx: index('idx_medication_order_schedules_next_due_at').on(table.nextDueAt)
  })
);

