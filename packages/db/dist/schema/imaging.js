import { boolean, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, index, date, time } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { patients } from './patients.js';
import { encounters } from './encounters.js';
import { users } from './users.js';
import { documents } from './documents.js';
// Imaging order status enum
export const imagingOrderStatusEnum = pgEnum('imaging_order_status', [
    'pending',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
]);
// Imaging order priority enum
export const imagingOrderPriorityEnum = pgEnum('imaging_order_priority', [
    'stat',
    'asap',
    'routine',
    'timed'
]);
// Imaging study status enum
export const imagingStudyStatusEnum = pgEnum('imaging_study_status', [
    'pending',
    'in_progress',
    'completed',
    'cancelled'
]);
// Imaging report status enum
export const imagingReportStatusEnum = pgEnum('imaging_report_status', [
    'draft',
    'pending_review',
    'finalized',
    'signed',
    'amended'
]);
// Imaging modalities catalog
export const imagingModalities = pgTable('imaging_modalities', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    category: text('category').notNull().default('radiology'),
    description: text('description'),
    preparationInstructions: text('preparation_instructions'),
    contrastRequired: boolean('contrast_required').default(false),
    contrastType: text('contrast_type'),
    estimatedDurationMinutes: integer('estimated_duration_minutes').default(30),
    equipmentType: text('equipment_type'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountCodeUnique: uniqueIndex('imaging_modalities_account_code_unique').on(table.accountId, table.code),
    accountIdx: index('idx_imaging_modalities_account').on(table.accountId),
    activeIdx: index('idx_imaging_modalities_active').on(table.accountId, table.isActive),
    categoryIdx: index('idx_imaging_modalities_category').on(table.accountId, table.category)
}));
// Imaging modality templates
export const imagingModalityTemplates = pgTable('imaging_modality_templates', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    modalityId: uuid('modality_id')
        .notNull()
        .references(() => imagingModalities.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    templateContent: text('template_content').notNull(),
    isDefault: boolean('is_default').default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountIdx: index('idx_imaging_modality_templates_account').on(table.accountId),
    modalityIdx: index('idx_imaging_modality_templates_modality').on(table.modalityId)
}));
// Imaging orders
export const imagingOrders = pgTable('imaging_orders', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    orderNumber: text('order_number').notNull(),
    patientId: uuid('patient_id')
        .notNull()
        .references(() => patients.id, { onDelete: 'cascade' }),
    encounterId: uuid('encounter_id').references(() => encounters.id, { onDelete: 'set null' }),
    modalityId: uuid('modality_id')
        .notNull()
        .references(() => imagingModalities.id, { onDelete: 'restrict' }),
    requesterUserId: uuid('requester_user_id').references(() => users.id, { onDelete: 'set null' }),
    status: imagingOrderStatusEnum('status').notNull().default('pending'),
    priority: imagingOrderPriorityEnum('priority').notNull().default('routine'),
    clinicalIndication: text('clinical_indication').notNull(),
    clinicalHistory: text('clinical_history'),
    suspectedDiagnosis: text('suspected_diagnosis'),
    bodyRegion: text('body_region'),
    laterality: text('laterality'),
    contrastRequested: boolean('contrast_requested').default(false),
    contrastType: text('contrast_type'),
    sedationRequired: boolean('sedation_required').default(false),
    specialInstructions: text('special_instructions'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    performedAt: timestamp('performed_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelledReason: text('cancelled_reason'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountOrderUnique: uniqueIndex('imaging_orders_account_number_unique').on(table.accountId, table.orderNumber),
    accountIdx: index('idx_imaging_orders_account').on(table.accountId),
    patientIdx: index('idx_imaging_orders_patient').on(table.patientId),
    encounterIdx: index('idx_imaging_orders_encounter').on(table.encounterId),
    modalityIdx: index('idx_imaging_orders_modality').on(table.modalityId),
    statusIdx: index('idx_imaging_orders_status').on(table.accountId, table.status),
    scheduledIdx: index('idx_imaging_orders_scheduled').on(table.accountId, table.scheduledAt),
    orderedIdx: index('idx_imaging_orders_ordered').on(table.accountId, table.createdAt),
    numberIdx: index('idx_imaging_orders_number').on(table.orderNumber)
}));
// Imaging studies
export const imagingStudies = pgTable('imaging_studies', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    studyNumber: text('study_number').notNull(),
    orderId: uuid('order_id')
        .notNull()
        .references(() => imagingOrders.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
        .notNull()
        .references(() => patients.id, { onDelete: 'cascade' }),
    modalityId: uuid('modality_id')
        .notNull()
        .references(() => imagingModalities.id, { onDelete: 'restrict' }),
    status: imagingStudyStatusEnum('status').notNull().default('pending'),
    studyDatetime: timestamp('study_datetime', { withTimezone: true }).notNull().defaultNow(),
    studyDurationMinutes: integer('study_duration_minutes'),
    bodyRegion: text('body_region'),
    laterality: text('laterality'),
    contrastAdministered: boolean('contrast_administered').default(false),
    contrastType: text('contrast_type'),
    contrastVolumeMl: numeric('contrast_volume_ml'),
    sedationAdministered: boolean('sedation_administered').default(false),
    sedationDetails: text('sedation_details'),
    equipmentUsed: text('equipment_used'),
    acquisitionParameters: jsonb('acquisition_parameters'),
    numberOfImages: integer('number_of_images').default(0),
    studyNotes: text('study_notes'),
    performedByUserId: uuid('performed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    technicianUserId: uuid('technician_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountStudyUnique: uniqueIndex('imaging_studies_account_number_unique').on(table.accountId, table.studyNumber),
    accountIdx: index('idx_imaging_studies_account').on(table.accountId),
    orderIdx: index('idx_imaging_studies_order').on(table.orderId),
    patientIdx: index('idx_imaging_studies_patient').on(table.patientId),
    modalityIdx: index('idx_imaging_studies_modality').on(table.modalityId),
    statusIdx: index('idx_imaging_studies_status').on(table.accountId, table.status),
    datetimeIdx: index('idx_imaging_studies_datetime').on(table.studyDatetime),
    numberIdx: index('idx_imaging_studies_number').on(table.studyNumber)
}));
// Study document attachments
export const imagingStudyDocuments = pgTable('imaging_study_documents', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    studyId: uuid('study_id')
        .notNull()
        .references(() => imagingStudies.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
        .notNull()
        .references(() => documents.id, { onDelete: 'cascade' }),
    attachmentType: text('attachment_type').notNull().default('image'),
    displayOrder: integer('display_order').default(0),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountIdx: index('idx_imaging_study_documents_account').on(table.accountId),
    studyIdx: index('idx_imaging_study_documents_study').on(table.studyId),
    documentIdx: index('idx_imaging_study_documents_document').on(table.documentId),
    studyDocumentUnique: uniqueIndex('imaging_study_documents_unique').on(table.studyId, table.documentId)
}));
// Imaging reports
export const imagingReports = pgTable('imaging_reports', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    reportNumber: text('report_number').notNull(),
    orderId: uuid('order_id')
        .notNull()
        .references(() => imagingOrders.id, { onDelete: 'cascade' }),
    studyId: uuid('study_id').references(() => imagingStudies.id, { onDelete: 'set null' }),
    patientId: uuid('patient_id')
        .notNull()
        .references(() => patients.id, { onDelete: 'cascade' }),
    modalityId: uuid('modality_id')
        .notNull()
        .references(() => imagingModalities.id, { onDelete: 'restrict' }),
    status: imagingReportStatusEnum('status').notNull().default('draft'),
    technique: text('technique'),
    findings: text('findings'),
    impression: text('impression'),
    conclusion: text('conclusion'),
    recommendations: text('recommendations'),
    limitations: text('limitations'),
    comparison: text('comparison'),
    templateId: uuid('template_id').references(() => imagingModalityTemplates.id, { onDelete: 'set null' }),
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
    amendedFromReportId: uuid('amended_from_report_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountReportUnique: uniqueIndex('imaging_reports_account_number_unique').on(table.accountId, table.reportNumber),
    accountIdx: index('idx_imaging_reports_account').on(table.accountId),
    orderIdx: index('idx_imaging_reports_order').on(table.orderId),
    studyIdx: index('idx_imaging_reports_study').on(table.studyId),
    patientIdx: index('idx_imaging_reports_patient').on(table.patientId),
    modalityIdx: index('idx_imaging_reports_modality').on(table.modalityId),
    statusIdx: index('idx_imaging_reports_status').on(table.accountId, table.status),
    numberIdx: index('idx_imaging_reports_number').on(table.reportNumber),
    signedIdx: index('idx_imaging_reports_signed').on(table.signedAt)
}));
// Report document attachments
export const imagingReportDocuments = pgTable('imaging_report_documents', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    reportId: uuid('report_id')
        .notNull()
        .references(() => imagingReports.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
        .notNull()
        .references(() => documents.id, { onDelete: 'cascade' }),
    attachmentType: text('attachment_type').notNull().default('attachment'),
    displayOrder: integer('display_order').default(0),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountIdx: index('idx_imaging_report_documents_account').on(table.accountId),
    reportIdx: index('idx_imaging_report_documents_report').on(table.reportId),
    documentIdx: index('idx_imaging_report_documents_document').on(table.documentId),
    reportDocumentUnique: uniqueIndex('imaging_report_documents_unique').on(table.reportId, table.documentId)
}));
// Imaging schedule slots
export const imagingScheduleSlots = pgTable('imaging_schedule_slots', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    modalityId: uuid('modality_id').references(() => imagingModalities.id, { onDelete: 'set null' }),
    slotDate: date('slot_date').notNull(),
    slotStartTime: time('slot_start_time').notNull(),
    slotEndTime: time('slot_end_time').notNull(),
    isAvailable: boolean('is_available').notNull().default(true),
    orderId: uuid('order_id').references(() => imagingOrders.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountIdx: index('idx_imaging_schedule_slots_account').on(table.accountId),
    modalityIdx: index('idx_imaging_schedule_slots_modality').on(table.modalityId),
    dateIdx: index('idx_imaging_schedule_slots_date').on(table.accountId, table.slotDate),
    availableIdx: index('idx_imaging_schedule_slots_available').on(table.accountId, table.slotDate, table.isAvailable)
}));
// Imaging sequences
export const imagingSequences = pgTable('imaging_sequences', {
    accountId: uuid('account_id')
        .primaryKey()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    orderSeq: integer('order_seq').notNull().default(0),
    studySeq: integer('study_seq').notNull().default(0),
    reportSeq: integer('report_seq').notNull().default(0)
});
//# sourceMappingURL=imaging.js.map