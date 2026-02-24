import { boolean, integer, jsonb, pgTable, time, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { collaborators } from './collaborators.js';
export const collaboratorAvailability = pgTable('collaborator_availability', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    collaboratorId: uuid('collaborator_id')
        .notNull()
        .references(() => collaborators.id, { onDelete: 'cascade' }),
    weekday: integer('weekday').notNull(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    breaksJson: jsonb('breaks_json').default([]), // array of { start: '12:00', end: '13:00' }
    active: boolean('active').default(true).notNull()
});
//# sourceMappingURL=collaborator_availability.js.map