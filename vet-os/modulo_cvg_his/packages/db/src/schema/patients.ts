import { sql } from 'drizzle-orm';
import {
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { owners } from './owners.js';
import { units } from './units.js';

export type PatientAlerts = {
  aggressive?: boolean;
  allergies?: string[];
  anesthesia_risk?: 'low' | 'medium' | 'high' | null;
  chronic_conditions?: string[];
  notes?: string | null;
};

export const patients = pgTable(
  'patients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    unitId: uuid('unit_id').references(() => units.id, { onDelete: 'set null' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => owners.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    species: text('species').notNull(),
    breed: text('breed'),
    sex: text('sex'),
    birthDate: date('birth_date', { mode: 'date' }),
    weightKg: numeric('weight_kg', { precision: 10, scale: 3 }),
    microchip: text('microchip'),
    alertsJson: jsonb('alerts_json').$type<PatientAlerts>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountNameIdx: index('idx_patients_account_name').on(table.accountId, table.name),
    accountMicrochipIdx: index('idx_patients_account_microchip').on(table.accountId, table.microchip),
    ownerIdIdx: index('idx_patients_owner_id').on(table.ownerId)
  })
);
