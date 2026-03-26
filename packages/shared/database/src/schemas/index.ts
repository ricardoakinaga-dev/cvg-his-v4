import {
  pgTable,
  varchar,
  timestamp,
  jsonb,
  boolean,
  bigint,
  integer,
  numeric,
  date
} from 'drizzle-orm/pg-core';

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const auditEvents = pgTable('audit_events', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  actorUserId: varchar('actor_user_id', { length: 255 }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }),
  entityId: varchar('entity_id', { length: 255 }),
  metadata: jsonb('metadata'),
  correlationId: varchar('correlation_id', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: varchar('user_agent', { length: 500 }),
  occurredAt: timestamp('occurred_at').notNull()
});

export const owners = pgTable('owners', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  documentType: varchar('document_type', { length: 20 }),
  documentNumber: varchar('document_number', { length: 50 }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: jsonb('address'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const patients = pgTable('patients', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  ownerId: varchar('owner_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  species: varchar('species', { length: 50 }),
  breed: varchar('breed', { length: 100 }),
  sex: varchar('sex', { length: 20 }),
  birthDate: date('birth_date'),
  weight: numeric('weight', { precision: 10, scale: 2 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const ownerPatientLinks = pgTable('owner_patient_links', {
  id: varchar('id', { length: 255 }).primaryKey(),
  ownerId: varchar('owner_id', { length: 255 }).notNull(),
  patientId: varchar('patient_id', { length: 255 }).notNull(),
  relationship: varchar('relationship', { length: 50 }),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at').notNull()
});

export const encounters = pgTable('encounters', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  ownerId: varchar('owner_id', { length: 255 }).notNull(),
  patientId: varchar('patient_id', { length: 255 }).notNull(),
  appointmentId: varchar('appointment_id', { length: 255 }),
  visitType: varchar('visit_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  priority: varchar('priority', { length: 20 }),
  assignedToUserId: varchar('assigned_to_user_id', { length: 255 }),
  chiefComplaint: varchar('chief_complaint', { length: 1000 }),
  queuedAt: timestamp('queued_at'),
  triagedAt: timestamp('triaged_at'),
  inCareAt: timestamp('in_care_at'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const encounterTimeline = pgTable('encounter_timeline', {
  id: varchar('id', { length: 255 }).primaryKey(),
  encounterId: varchar('encounter_id', { length: 255 }).notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  summary: varchar('summary', { length: 500 }),
  actorUserId: varchar('actor_user_id', { length: 255 }),
  metadata: jsonb('metadata'),
  occurredAt: timestamp('occurred_at').notNull()
});

export const medicalRecords = pgTable('medical_records', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  encounterId: varchar('encounter_id', { length: 255 }).notNull(),
  patientId: varchar('patient_id', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const clinicalEntries = pgTable('clinical_entries', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  medicalRecordId: varchar('medical_record_id', { length: 255 }).notNull(),
  encounterId: varchar('encounter_id', { length: 255 }).notNull(),
  patientId: varchar('patient_id', { length: 255 }).notNull(),
  authorUserId: varchar('author_user_id', { length: 255 }).notNull(),
  entryType: varchar('entry_type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: varchar('content', { length: 10000 }).notNull(),
  version: integer('version').notNull().default(1),
  deletedAt: timestamp('deleted_at'),
  deletedByUserId: varchar('deleted_by_user_id', { length: 255 }),
  deleteReason: varchar('delete_reason', { length: 1000 }),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const entryRevisions = pgTable('entry_revisions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  entryId: varchar('entry_id', { length: 255 }).notNull(),
  version: integer('version').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: varchar('content', { length: 10000 }).notNull(),
  authorUserId: varchar('author_user_id', { length: 255 }).notNull(),
  reason: varchar('reason', { length: 1000 }),
  createdAt: timestamp('created_at').notNull()
});

export const clinicalTimeline = pgTable('clinical_timeline', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  medicalRecordId: varchar('medical_record_id', { length: 255 }).notNull(),
  encounterId: varchar('encounter_id', { length: 255 }).notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  summary: varchar('summary', { length: 500 }),
  actorUserId: varchar('actor_user_id', { length: 255 }),
  clinicalEntryId: varchar('clinical_entry_id', { length: 255 }),
  attachmentId: varchar('attachment_id', { length: 255 }),
  occurredAt: timestamp('occurred_at').notNull()
});

export const attachments = pgTable('attachments', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  linkedEntityType: varchar('linked_entity_type', { length: 50 }).notNull(),
  linkedEntityId: varchar('linked_entity_id', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  storageKey: varchar('storage_key', { length: 500 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  checksum: varchar('checksum', { length: 255 }).notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }),
  source: varchar('source', { length: 50 }).notNull(),
  uploadedByUserId: varchar('uploaded_by_user_id', { length: 255 }),
  createdAt: timestamp('created_at').notNull()
});

export const appointments = pgTable('appointments', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  ownerId: varchar('owner_id', { length: 255 }).notNull(),
  patientId: varchar('patient_id', { length: 255 }).notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  duration: integer('duration'),
  visitType: varchar('visit_type', { length: 50 }).notNull(),
  reason: varchar('reason', { length: 500 }),
  status: varchar('status', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const billingRecords = pgTable('billing_records', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  encounterId: varchar('encounter_id', { length: 255 }).notNull(),
  patientId: varchar('patient_id', { length: 255 }).notNull(),
  ownerId: varchar('owner_id', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  subtotalAmount: numeric('subtotal_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  administrativeNotes: varchar('administrative_notes', { length: 2000 }),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const billingItems = pgTable('billing_items', {
  id: varchar('id', { length: 255 }).primaryKey(),
  billingRecordId: varchar('billing_record_id', { length: 255 }).notNull(),
  encounterId: varchar('encounter_id', { length: 255 }).notNull(),
  itemType: varchar('item_type', { length: 50 }).notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPriceAmount: numeric('unit_price_amount', { precision: 12, scale: 2 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  sourceEntityType: varchar('source_entity_type', { length: 50 }),
  sourceEntityId: varchar('source_entity_id', { length: 255 }),
  createdByUserId: varchar('created_by_user_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull()
});

export const inventoryItems = pgTable('inventory_items', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  onHandQuantity: numeric('on_hand_quantity', { precision: 10, scale: 2 }).notNull(),
  reorderLevel: numeric('reorder_level', { precision: 10, scale: 2 }).notNull(),
  unitCostAmount: numeric('unit_cost_amount', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const inventoryConsumptions = pgTable('inventory_consumptions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  inventoryItemId: varchar('inventory_item_id', { length: 255 }).notNull(),
  encounterId: varchar('encounter_id', { length: 255 }).notNull(),
  patientId: varchar('patient_id', { length: 255 }).notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  costAmount: numeric('cost_amount', { precision: 12, scale: 2 }).notNull(),
  sourceEntityType: varchar('source_entity_type', { length: 50 }),
  sourceEntityId: varchar('source_entity_id', { length: 255 }),
  recordedByUserId: varchar('recorded_by_user_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull()
});

export const notifications = pgTable('notifications', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  channel: varchar('channel', { length: 50 }).notNull().default('internal'),
  category: varchar('category', { length: 50 }).notNull(),
  encounterId: varchar('encounter_id', { length: 255 }),
  patientId: varchar('patient_id', { length: 255 }),
  recipientRoleCode: varchar('recipient_role_code', { length: 100 }),
  title: varchar('title', { length: 255 }).notNull(),
  message: varchar('message', { length: 2000 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  createdByUserId: varchar('created_by_user_id', { length: 255 }),
  createdAt: timestamp('created_at').notNull(),
  sentAt: timestamp('sent_at')
});

export const notificationJobs = pgTable('notification_jobs', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull().default('acc_cvg_demo'),
  notificationId: varchar('notification_id', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  scheduledAt: timestamp('scheduled_at').notNull(),
  processedAt: timestamp('processed_at')
});

export const inpatientStays = pgTable('inpatient_stays', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  encounterId: varchar('encounter_id', { length: 255 }).notNull(),
  patientId: varchar('patient_id', { length: 255 }).notNull(),
  unit: varchar('unit', { length: 100 }).notNull(),
  ward: varchar('ward', { length: 100 }).notNull(),
  bed: varchar('bed', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  admittedAt: timestamp('admitted_at').notNull(),
  dischargedAt: timestamp('discharged_at'),
  dischargeReason: varchar('discharge_reason', { length: 500 }),
  transferToUnit: varchar('transfer_to_unit', { length: 100 }),
  transferToWard: varchar('transfer_to_ward', { length: 100 }),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const inpatientProgress = pgTable('inpatient_progress', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  stayId: varchar('stay_id', { length: 255 }).notNull(),
  encounterId: varchar('encounter_id', { length: 255 }).notNull(),
  note: varchar('note', { length: 5000 }).notNull(),
  authoredByUserId: varchar('authored_by_user_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull()
});

export const surgeryCases = pgTable('surgery_cases', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  encounterId: varchar('encounter_id', { length: 255 }).notNull(),
  patientId: varchar('patient_id', { length: 255 }).notNull(),
  procedureName: varchar('procedure_name', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  surgeonUserId: varchar('surgeon_user_id', { length: 255 }),
  surgicalTeam: jsonb('surgical_team'),
  preparationNotes: varchar('preparation_notes', { length: 2000 }),
  operativeNotes: varchar('operative_notes', { length: 5000 }),
  scheduledAt: timestamp('scheduled_at'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const diagnosticOrders = pgTable('diagnostic_orders', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  encounterId: varchar('encounter_id', { length: 255 }).notNull(),
  patientId: varchar('patient_id', { length: 255 }).notNull(),
  examType: varchar('exam_type', { length: 255 }).notNull(),
  examCatalogId: varchar('exam_catalog_id', { length: 255 }),
  reason: varchar('reason', { length: 500 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  collectedAt: timestamp('collected_at'),
  collectedByUserId: varchar('collected_by_user_id', { length: 255 }),
  resultSummary: varchar('result_summary', { length: 5000 }),
  resultAttachmentId: varchar('result_attachment_id', { length: 255 }),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});
