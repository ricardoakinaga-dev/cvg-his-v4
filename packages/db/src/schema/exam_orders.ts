import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { patients } from './patients.js';
import { encounters } from './encounters.js';
import { users } from './users.js';

export const examOrderStatusEnum = pgEnum('exam_order_status', [
  'requested',
  'collected',
  'in_progress',
  'completed',
  'cancelled'
]);

export const examOrderPriorityEnum = pgEnum('exam_order_priority', ['routine', 'urgent', 'stat']);

export const examCategoryEnum = pgEnum('exam_category', ['laboratory', 'imaging', 'other']);

export const examOrders = pgTable(
  'exam_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    encounterId: uuid('encounter_id').references(() => encounters.id, { onDelete: 'set null' }),
    requestedByUserId: uuid('requested_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    category: examCategoryEnum('category').notNull().default('laboratory'),
    examName: text('exam_name').notNull(),
    examCode: text('exam_code'),
    priority: examOrderPriorityEnum('priority').notNull().default('routine'),
    status: examOrderStatusEnum('status').notNull().default('requested'),
    notes: text('notes'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountPatientIdx: index('idx_exam_orders_account_patient').on(table.accountId, table.patientId),
    accountEncounterIdx: index('idx_exam_orders_account_encounter').on(table.accountId, table.encounterId),
    accountStatusIdx: index('idx_exam_orders_account_status').on(table.accountId, table.status),
    accountCategoryIdx: index('idx_exam_orders_account_category').on(table.accountId, table.category)
  })
);
