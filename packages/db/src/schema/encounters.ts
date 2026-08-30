import { sql } from 'drizzle-orm';
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { owners } from './owners.js';
import { patients } from './patients.js';
import { users } from './users.js';

export const encounterStatusEnum = pgEnum('encounter_status', ['open', 'closed']);

export const encounters = pgTable(
  'encounters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => owners.id, { onDelete: 'cascade' }),
    status: encounterStatusEnum('status').notNull().default('open'),
    openedByUserId: uuid('opened_by_user_id')
      .notNull()
      .references(() => users.id),
    closedByUserId: uuid('closed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    closeReason: text('close_reason'),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdIdUnique: uniqueIndex('idx_encounters_account_id_id_unique').on(
      table.accountId,
      table.id
    ),
    activePatientUnique: uniqueIndex('uidx_encounters_one_active_per_patient')
      .on(table.accountId, table.patientId)
      .where(sql`${table.status} <> 'closed'`),
    patientIdIdx: index('idx_encounters_patient_id').on(table.patientId),
    accountStatusIdx: index('idx_encounters_account_status').on(table.accountId, table.status)
  })
);
