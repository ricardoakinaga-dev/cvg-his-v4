import { index, pgTable, text, timestamp, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { patients } from './patients.js';
import { users } from './users.js';
import { labOrders } from './labOrders.js';
import { labOrderItems } from './labOrders.js';
// Sample status enum
export const labSampleStatusEnum = pgEnum('lab_sample_status', [
    'pending', // aguardando coleta
    'collected', // coletado
    'received', // recebido no laboratório
    'processing', // em processamento
    'rejected', // rejeitado
    'discarded' // descartado
]);
// Sample type enum
export const labSampleTypeEnum = pgEnum('lab_sample_type', [
    'blood',
    'urine',
    'feces',
    'tissue',
    'swab',
    'fluid',
    'biopsy',
    'other'
]);
// Lab samples (amostras coletadas)
export const labSamples = pgTable('lab_samples', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    sampleNumber: text('sample_number').notNull(),
    orderId: uuid('order_id')
        .notNull()
        .references(() => labOrders.id, { onDelete: 'cascade' }),
    orderItemId: uuid('order_item_id').references(() => labOrderItems.id, { onDelete: 'set null' }),
    patientId: uuid('patient_id')
        .notNull()
        .references(() => patients.id, { onDelete: 'cascade' }),
    sampleType: labSampleTypeEnum('sample_type').notNull().default('blood'),
    specimenSource: text('specimen_source'),
    volumeCollected: text('volume_collected'),
    collectionMethod: text('collection_method'),
    status: labSampleStatusEnum('status').notNull().default('pending'),
    collectedAt: timestamp('collected_at', { withTimezone: true }),
    collectedByUserId: uuid('collected_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    receivedAt: timestamp('received_at', { withTimezone: true }),
    receivedByUserId: uuid('received_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountUnique: index('lab_samples_account_number_unique').on(table.accountId, table.sampleNumber),
    accountIdx: index('idx_lab_samples_account').on(table.accountId),
    orderIdx: index('idx_lab_samples_order').on(table.orderId),
    patientIdx: index('idx_lab_samples_patient').on(table.patientId),
    statusIdx: index('idx_lab_samples_status').on(table.accountId, table.status),
    collectedIdx: index('idx_lab_samples_collected').on(table.collectedAt),
    numberIdx: index('idx_lab_samples_number').on(table.sampleNumber)
}));
//# sourceMappingURL=labSamples.js.map