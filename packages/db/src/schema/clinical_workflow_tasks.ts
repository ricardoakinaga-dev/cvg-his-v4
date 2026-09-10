import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  foreignKey,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { encounters } from './encounters.js';
import { patients } from './patients.js';
import { users } from './users.js';

export const clinicalWorkflowTasks = pgTable(
  'clinical_workflow_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    taskType: varchar('task_type', { length: 80 }).notNull(),
    status: varchar('status', { length: 24 }).notNull().default('pending'),
    executionMode: varchar('execution_mode', { length: 16 }).notNull().default('manual'),
    priority: varchar('priority', { length: 16 }).notNull().default('normal'),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    patientId: uuid('patient_id'),
    encounterId: uuid('encounter_id'),
    ownerType: varchar('owner_type', { length: 24 }),
    ownerId: varchar('owner_id', { length: 160 }),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    fingerprint: varchar('fingerprint', { length: 64 }).notNull(),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull(),
    leaseOwner: varchar('lease_owner', { length: 160 }),
    leaseToken: uuid('lease_token'),
    leaseVersion: bigint('lease_version', { mode: 'number' }).notNull().default(0),
    revision: integer('revision').notNull().default(0),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    lastError: text('last_error'),
    acknowledgedByUserId: uuid('acknowledged_by_user_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    completedByUserId: uuid('completed_by_user_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledByUserId: uuid('cancelled_by_user_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    escalationLevel: integer('escalation_level').notNull().default(0),
    lastEscalatedAt: timestamp('last_escalated_at', { withTimezone: true }),
    correlationId: varchar('correlation_id', { length: 255 }).notNull(),
    causationId: varchar('causation_id', { length: 255 }),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdempotencyUnique: uniqueIndex('uq_clinical_workflow_tasks_account_idempotency').on(
      table.accountId,
      table.idempotencyKey
    ),
    accountIdUnique: uniqueIndex('uq_clinical_workflow_tasks_account_id').on(
      table.accountId,
      table.id
    ),
    accountDueIdx: index('idx_clinical_workflow_tasks_account_due').on(
      table.accountId,
      table.status,
      table.nextAttemptAt,
      table.leaseExpiresAt
    ),
    accountPatientIdx: index('idx_clinical_workflow_tasks_account_patient').on(
      table.accountId,
      table.patientId,
      table.dueAt
    ),
    accountEncounterIdx: index('idx_clinical_workflow_tasks_account_encounter').on(
      table.accountId,
      table.encounterId,
      table.dueAt
    ),
    accountPatientFk: foreignKey({
      name: 'clinical_workflow_tasks_patient_account_fk',
      columns: [table.accountId, table.patientId],
      foreignColumns: [patients.accountId, patients.id]
    }),
    accountEncounterFk: foreignKey({
      name: 'clinical_workflow_tasks_encounter_account_fk',
      columns: [table.accountId, table.encounterId],
      foreignColumns: [encounters.accountId, encounters.id]
    })
  })
);

export const clinicalWorkflowTaskEvents = pgTable(
  'clinical_workflow_task_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id')
      .notNull()
      .references(() => clinicalWorkflowTasks.id, { onDelete: 'cascade' }),
    taskRevision: integer('task_revision'),
    eventType: varchar('event_type', { length: 48 }).notNull(),
    schemaVersion: integer('schema_version').notNull().default(1),
    source: varchar('source', { length: 80 }).notNull().default('clinical-workflow'),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    correlationId: varchar('correlation_id', { length: 255 }).notNull(),
    causationId: varchar('causation_id', { length: 255 }),
    payload: jsonb('payload')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    revisionUnique: unique('clinical_workflow_task_events_revision_unique').on(
      table.accountId,
      table.taskId,
      table.taskRevision
    ),
    accountTaskIdx: index('idx_clinical_workflow_task_events_account_task').on(
      table.accountId,
      table.taskId,
      table.occurredAt
    ),
    accountOccurredIdx: index('idx_clinical_workflow_task_events_account_occurred').on(
      table.accountId,
      table.occurredAt
    ),
    taskAccountFk: foreignKey({
      name: 'clinical_workflow_task_events_task_account_fk',
      columns: [table.accountId, table.taskId],
      foreignColumns: [clinicalWorkflowTasks.accountId, clinicalWorkflowTasks.id]
    }).onDelete('cascade')
  })
);
