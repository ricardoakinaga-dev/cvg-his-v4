import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { appointmentTypes } from './appointment_types.js';
import { collaborators } from './collaborators.js';
import { owners } from './owners.js';
import { patients } from './patients.js';
import { resources } from './resources.js';
import { services } from './services.js';
import { users } from './users.js';

export const appointments = pgTable(
    'appointments',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        accountId: uuid('account_id')
            .notNull()
            .references(() => accounts.id, { onDelete: 'cascade' }),
        typeId: uuid('type_id')
            .notNull()
            .references(() => appointmentTypes.id),
        serviceId: uuid('service_id').references(() => services.id),
        ownerId: uuid('owner_id').references(() => owners.id),
        patientId: uuid('patient_id').references(() => patients.id),
        primaryCollaboratorId: uuid('primary_collaborator_id')
            .notNull()
            .references(() => collaborators.id),
        resourceId: uuid('resource_id').references(() => resources.id),
        startAt: timestamp('start_at', { withTimezone: true }).notNull(),
        endAt: timestamp('end_at', { withTimezone: true }).notNull(),
        status: text('status').notNull().default('scheduled'), // scheduled|confirmed|arrived|in_progress|done|canceled|no_show
        notes: text('notes'),
        createdBy: uuid('created_by').references(() => users.id),
        updatedBy: uuid('updated_by').references(() => users.id),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
    },
    (table) => ({
        collabStartIdx: index('idx_appointments_collab_start').on(
            table.accountId,
            table.primaryCollaboratorId,
            table.startAt
        ),
        resourceStartIdx: index('idx_appointments_resource_start').on(
            table.accountId,
            table.resourceId,
            table.startAt
        ),
        startIdx: index('idx_appointments_start').on(table.accountId, table.startAt),
        ownerIdx: index('idx_appointments_owner').on(table.accountId, table.ownerId),
        patientIdx: index('idx_appointments_patient').on(table.accountId, table.patientId)
    })
);
