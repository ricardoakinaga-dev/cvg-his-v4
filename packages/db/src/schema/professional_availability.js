import { index, integer, pgTable, text, time, uuid, uniqueIndex } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { users } from './users.js';
export const professionalAvailability = pgTable('professional_availability', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    professionalUserId: uuid('professional_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(), // 0=Sunday, 1=Monday, ..., 6=Saturday
    startTime: time('start_time').notNull(), // HH:MM
    endTime: time('end_time').notNull(), // HH:MM
    slotDurationMinutes: integer('slot_duration_minutes').notNull().default(30),
    notes: text('notes')
}, (table) => ({
    accountProfessionalDayIdx: uniqueIndex('uq_prof_avail_account_prof_day').on(table.accountId, table.professionalUserId, table.dayOfWeek),
    accountProfessionalIdx: index('idx_prof_avail_account_prof').on(table.accountId, table.professionalUserId)
}));
//# sourceMappingURL=professional_availability.js.map