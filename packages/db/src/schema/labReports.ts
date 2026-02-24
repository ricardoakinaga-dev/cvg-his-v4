import { index, pgTable, text, timestamp, uuid, pgEnum } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { patients } from './patients.js';
import { users } from './users.js';
import { labOrders } from './labOrders.js';
import { labResults } from './labResults.js';

// Report status enum
export const labReportStatusEnum = pgEnum('lab_report_status', [
  'draft',        // rascunho
  'pending_review', // aguardando revisão
  'finalized',    // finalizado
  'signed',       // assinado
  'amended'       // retificado
]);

// Lab reports (laudos)
export const labReports = pgTable(
  'lab_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    reportNumber: text('report_number').notNull(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => labOrders.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    status: labReportStatusEnum('status').notNull().default('draft'),
    conclusion: text('conclusion'),
    methodology: text('methodology'),
    limitations: text('limitations'),
    notes: text('notes'),
    draftedAt: timestamp('drafted_at', { withTimezone: true }),
    draftedByUserId: uuid('drafted_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }),
    finalizedByUserId: uuid('finalized_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    signedAt: timestamp('signed_at', { withTimezone: true }),
    signedByUserId: uuid('signed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    signatureHash: text('signature_hash'),
    amendedAt: timestamp('amended_at', { withTimezone: true }),
    amendedReason: text('amended_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountUnique: index('lab_reports_account_number_unique').on(table.accountId, table.reportNumber),
    accountIdx: index('idx_lab_reports_account').on(table.accountId),
    orderIdx: index('idx_lab_reports_order').on(table.orderId),
    patientIdx: index('idx_lab_reports_patient').on(table.patientId),
    statusIdx: index('idx_lab_reports_status').on(table.accountId, table.status),
    numberIdx: index('idx_lab_reports_number').on(table.reportNumber)
  })
);

// Report results (link between reports and results)
export const labReportResults = pgTable(
  'lab_report_results',
  {
    reportId: uuid('report_id')
      .notNull()
      .references(() => labReports.id, { onDelete: 'cascade' }),
    resultId: uuid('result_id')
      .notNull()
      .references(() => labResults.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: index('lab_report_results_pk').on(table.reportId, table.resultId),
    resultIdx: index('idx_lab_report_results_result').on(table.resultId)
  })
);

export type LabReport = typeof labReports.$inferSelect;
export type NewLabReport = typeof labReports.$inferInsert;
export type LabReportStatus = typeof labReportStatusEnum.enumValues[number];
export type LabReportResult = typeof labReportResults.$inferSelect;
export type NewLabReportResult = typeof labReportResults.$inferInsert;
