import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { users } from './users.js';

export const collaborators = pgTable('collaborators', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    roleTitle: text('role_title'),
    specialty: text('specialty'),
    licenseType: text('license_type'),
    licenseNumber: text('license_number'),
    phone: text('phone'),
    email: text('email'),
    status: text('status').notNull().default('active'),
    defaultAppointmentDurationMinutes: integer('default_appointment_duration_minutes')
        .notNull()
        .default(30),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
