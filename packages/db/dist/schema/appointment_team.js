import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { appointments } from './appointments.js';
import { collaborators } from './collaborators.js';
export const appointmentTeam = pgTable('appointment_team', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id')
        .notNull()
        .references(() => appointments.id, { onDelete: 'cascade' }),
    collaboratorId: uuid('collaborator_id')
        .notNull()
        .references(() => collaborators.id),
    teamRole: text('team_role').notNull() // surgeon | anesthetist | assistant | nurse | other
});
//# sourceMappingURL=appointment_team.js.map