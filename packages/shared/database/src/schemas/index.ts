import {
  pgTable,
  varchar,
  timestamp,
  jsonb,
  boolean,
  bigint,
  integer,
  numeric,
  date,
  text,
  uuid
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
  id: uuid('id').primaryKey(),
  accountId: uuid('account_id'),
  actorUserId: uuid('actor_user_id'),
  actorRole: varchar('actor_role', { length: 64 }),
  actorRoles: jsonb('actor_roles').notNull().default([]),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 64 }).notNull(),
  entityId: varchar('entity_id', { length: 128 }).notNull(),
  metadata: jsonb('metadata'),
  correlationId: varchar('correlation_id', { length: 255 }),
  occurredAt: timestamp('occurred_at').notNull(),
  beforeJson: jsonb('before_json'),
  afterJson: jsonb('after_json'),
  reason: text('reason'),
  requestId: varchar('request_id', { length: 128 }),
  createdAt: timestamp('created_at').notNull()
});

export const owners = pgTable('owners', {
  id: uuid('id').primaryKey(),
  accountId: uuid('account_id').notNull(),
  unitId: uuid('unit_id'),
  fullName: text('full_name').notNull(),
  document: text('document'),
  email: varchar('email', { length: 255 }),
  phoneMain: text('phone_main'),
  phoneAlt: text('phone_alt'),
  addressJson: jsonb('address_json'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const patients = pgTable('patients', {
  id: uuid('id').primaryKey(),
  accountId: uuid('account_id').notNull(),
  unitId: uuid('unit_id'),
  ownerId: uuid('owner_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  species: varchar('species', { length: 50 }).notNull(),
  breed: varchar('breed', { length: 100 }),
  sex: varchar('sex', { length: 20 }),
  birthDate: date('birth_date'),
  weightKg: numeric('weight_kg', { precision: 10, scale: 3 }),
  microchip: text('microchip'),
  alertsJson: jsonb('alerts_json').notNull().default({}),
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
  id: uuid('id').primaryKey(),
  accountId: uuid('account_id').notNull(),
  ownerId: uuid('owner_id').notNull(),
  patientId: uuid('patient_id').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  openedByUserId: uuid('opened_by_user_id').notNull(),
  closedByUserId: uuid('closed_by_user_id'),
  openedAt: timestamp('opened_at').notNull(),
  closedAt: timestamp('closed_at'),
  reason: text('reason'),
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
  accountId: uuid('account_id').notNull(),
  encounterId: uuid('encounter_id').notNull(),
  patientId: uuid('patient_id').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const clinicalEntries = pgTable('clinical_entries', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: uuid('account_id').notNull(),
  medicalRecordId: varchar('medical_record_id', { length: 255 }).notNull(),
  encounterId: uuid('encounter_id').notNull(),
  patientId: uuid('patient_id').notNull(),
  authorUserId: uuid('author_user_id').notNull(),
  entryType: varchar('entry_type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: varchar('content', { length: 10000 }).notNull(),
  version: integer('version').notNull().default(1),
  deletedAt: timestamp('deleted_at'),
  deletedByUserId: uuid('deleted_by_user_id'),
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
  authorUserId: uuid('author_user_id').notNull(),
  reason: varchar('reason', { length: 1000 }),
  createdAt: timestamp('created_at').notNull()
});

export const clinicalTimeline = pgTable('clinical_timeline', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: uuid('account_id').notNull(),
  medicalRecordId: varchar('medical_record_id', { length: 255 }).notNull(),
  encounterId: uuid('encounter_id').notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  summary: varchar('summary', { length: 500 }),
  actorUserId: uuid('actor_user_id'),
  clinicalEntryId: varchar('clinical_entry_id', { length: 255 }),
  attachmentId: uuid('attachment_id'),
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
  practitionerStaffId: varchar('practitioner_staff_id', { length: 255 }),
  serviceId: varchar('service_id', { length: 255 }),
  unit: varchar('unit', { length: 120 }),
  specialty: varchar('specialty', { length: 120 }),
  resourceLabel: varchar('resource_label', { length: 120 }),
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
  sectorId: varchar('sector_id', { length: 255 }),
  bedId: varchar('bed_id', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull(),
  admittedAt: timestamp('admitted_at').notNull(),
  dischargedAt: timestamp('discharged_at'),
  dischargeReason: varchar('discharge_reason', { length: 500 }),
  transferToUnit: varchar('transfer_to_unit', { length: 100 }),
  transferToWard: varchar('transfer_to_ward', { length: 100 }),
  transferToSectorId: varchar('transfer_to_sector_id', { length: 255 }),
  transferToBedId: varchar('transfer_to_bed_id', { length: 255 }),
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

export const laboratoryEquipment = pgTable('laboratory_equipment', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  serialNumber: varchar('serial_number', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  lastCalibrationAt: timestamp('last_calibration_at').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const laboratoryReportTypes = pgTable('laboratory_report_types', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  description: varchar('description', { length: 1000 }).notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const laboratoryReferenceValues = pgTable('laboratory_reference_values', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  parameter: varchar('parameter', { length: 255 }).notNull(),
  examType: varchar('exam_type', { length: 50 }).notNull(),
  minValue: numeric('min_value', { precision: 12, scale: 3 }).notNull(),
  maxValue: numeric('max_value', { precision: 12, scale: 3 }).notNull(),
  unit: varchar('unit', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const sectors = pgTable('sectors', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  kind: varchar('kind', { length: 50 }).notNull().default('other'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const beds = pgTable('beds', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  sectorId: varchar('sector_id', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('available'),
  supportsSpecies: varchar('supports_species', { length: 100 }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const mfaCredentials = pgTable('mfa_credentials', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  secretEncrypted: text('secret_encrypted').notNull(),
  isActive: boolean('is_active').notNull().default(false),
  recoveryCodesHash: jsonb('recovery_codes_hash').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at').notNull(),
  activatedAt: timestamp('activated_at'),
  lastUsedAt: timestamp('last_used_at'),
  lastRecoveryCodesRegeneratedAt: timestamp('last_recovery_codes_regenerated_at')
});

export const consentRecords = pgTable('consent_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').notNull(),
  subjectId: uuid('subject_id').notNull(),
  subjectType: text('subject_type').notNull(),
  purpose: text('purpose').notNull(),
  status: text('status').notNull().default('granted'),
  origin: text('origin').notNull().default('api'),
  grantedBy: uuid('granted_by').notNull(),
  grantedAt: timestamp('granted_at').notNull(),
  revokedBy: uuid('revoked_by'),
  revokedAt: timestamp('revoked_at'),
  expiresAt: timestamp('expires_at'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull()
});

export const dataSubjectRequests = pgTable('data_subject_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').notNull(),
  subjectId: uuid('subject_id').notNull(),
  subjectType: text('subject_type').notNull(),
  requestType: text('request_type').notNull(),
  status: text('status').notNull().default('pending'),
  requestedBy: uuid('requested_by').notNull(),
  requestedAt: timestamp('requested_at').notNull(),
  completedAt: timestamp('completed_at'),
  completedBy: uuid('completed_by'),
  notes: text('notes'),
  rejectionReason: text('rejection_reason'),
  resultJson: jsonb('result_json').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const responsibilityTerms = pgTable('responsibility_terms', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: uuid('account_id').notNull(),
  title: varchar('title', { length: 160 }).notNull(),
  code: varchar('code', { length: 80 }),
  usageContext: varchar('usage_context', { length: 32 }).notNull().default('atendimento'),
  content: text('content').notNull(),
  active: boolean('active').notNull().default(true),
  requiresOwnerSignature: boolean('requires_owner_signature').notNull().default(true),
  requiresWitnessSignature: boolean('requires_witness_signature').notNull().default(false),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const breeds = pgTable('breeds', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: uuid('account_id').notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  code: varchar('code', { length: 80 }),
  species: varchar('species', { length: 32 }).notNull().default('canine'),
  description: text('description'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const animalSpecies = pgTable('animal_species', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: uuid('account_id').notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  code: varchar('code', { length: 80 }),
  systemCode: varchar('system_code', { length: 32 }).notNull().default('other'),
  description: text('description'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const webhooks = pgTable('webhooks', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  url: varchar('url', { length: 2048 }).notNull(),
  events: jsonb('events').$type<string[]>().notNull(),
  secret: varchar('secret', { length: 512 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: varchar('id', { length: 255 }).primaryKey(),
  webhookId: varchar('webhook_id', { length: 255 }).notNull(),
  event: varchar('event', { length: 100 }).notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  lastAttemptAt: timestamp('last_attempt_at'),
  responseStatus: integer('response_status'),
  responseBody: text('response_body'),
  nextRetryAt: timestamp('next_retry_at'),
  createdAt: timestamp('created_at').notNull()
});
