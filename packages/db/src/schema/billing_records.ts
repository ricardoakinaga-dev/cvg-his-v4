import { sql } from 'drizzle-orm';
import {
  check,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { encounters } from './encounters.js';
import { owners } from './owners.js';
import { patients } from './patients.js';

export const billingRecords = pgTable(
  'billing_records',
  {
    id: text('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => owners.id),
    status: text('status').notNull().default('draft'),
    subtotalAmount: numeric('subtotal_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    currency: text('currency').notNull().default('BRL'),
    administrativeNotes: text('administrative_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdIdUnique: uniqueIndex('idx_billing_records_account_id_id_unique').on(
      table.accountId,
      table.id
    ),
    accountEncounterUnique: uniqueIndex('uidx_billing_records_account_encounter').on(
      table.accountId,
      table.encounterId
    ),
    accountStatusIdx: index('idx_billing_records_account_status').on(table.accountId, table.status),
    accountPatientIdx: index('idx_billing_records_account_patient').on(
      table.accountId,
      table.patientId
    ),
    accountOwnerIdx: index('idx_billing_records_account_owner').on(table.accountId, table.ownerId),
    statusChk: check(
      'billing_records_status_chk',
      sql`${table.status} in ('draft', 'estimated', 'open', 'settled')`
    ),
    currencyChk: check('billing_records_currency_chk', sql`${table.currency} = 'BRL'`),
    subtotalNonNegativeChk: check(
      'billing_records_subtotal_non_negative_chk',
      sql`${table.subtotalAmount} >= 0`
    )
  })
);
