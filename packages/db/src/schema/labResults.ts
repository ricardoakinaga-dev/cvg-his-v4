import { index, numeric, pgTable, text, timestamp, uuid, pgEnum } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { patients } from './patients.js';
import { users } from './users.js';
import { labTests } from './labTests.js';
import { labOrderItems } from './labOrders.js';
import { labSamples } from './labSamples.js';
import { labReferenceRanges } from './labReferenceRanges.js';

// Result status enum
export const labResultStatusEnum = pgEnum('lab_result_status', [
  'pending',      // aguardando resultado
  'preliminary',  // resultado preliminar
  'final',        // resultado final
  'corrected',    // corrigido
  'cancelled'     // cancelado
]);

// Result flag enum
export const labResultFlagEnum = pgEnum('lab_result_flag', [
  'low',
  'high',
  'critical_low',
  'critical_high',
  'abnormal',
  'normal'
]);

// Lab results (resultados dos exames)
export const labResults = pgTable(
  'lab_results',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => labOrderItems.id, { onDelete: 'cascade' }),
    sampleId: uuid('sample_id').references(() => labSamples.id, { onDelete: 'set null' }),
    testId: uuid('test_id')
      .notNull()
      .references(() => labTests.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    resultValue: text('result_value'),
    resultNumeric: numeric('result_numeric'),
    unit: text('unit'),
    referenceRange: text('reference_range'),
    referenceRangeId: uuid('reference_range_id').references(() => labReferenceRanges.id, { onDelete: 'set null' }),
    flag: text('flag'), // 'low', 'high', 'critical_low', 'critical_high', 'abnormal', 'normal'
    status: labResultStatusEnum('status').notNull().default('pending'),
    notes: text('notes'),
    interpretation: text('interpretation'),
    performedAt: timestamp('performed_at', { withTimezone: true }),
    performedByUserId: uuid('performed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedByUserId: uuid('verified_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdx: index('idx_lab_results_account').on(table.accountId),
    orderItemIdx: index('idx_lab_results_order_item').on(table.orderItemId),
    sampleIdx: index('idx_lab_results_sample').on(table.sampleId),
    patientIdx: index('idx_lab_results_patient').on(table.patientId),
    statusIdx: index('idx_lab_results_status').on(table.accountId, table.status),
    flagIdx: index('idx_lab_results_flag').on(table.orderItemId, table.flag)
  })
);

export type LabResult = typeof labResults.$inferSelect;
export type NewLabResult = typeof labResults.$inferInsert;
export type LabResultStatus = typeof labResultStatusEnum.enumValues[number];
export type LabResultFlag = typeof labResultFlagEnum.enumValues[number];
