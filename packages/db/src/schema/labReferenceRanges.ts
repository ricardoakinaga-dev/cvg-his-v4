import { boolean, index, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { labTests } from './labTests.js';

// Reference ranges by species and age
export const labReferenceRanges = pgTable(
  'lab_reference_ranges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    testId: uuid('test_id')
      .notNull()
      .references(() => labTests.id, { onDelete: 'cascade' }),
    species: text('species'), // espécie (canino, felino, etc), null = todas
    gender: text('gender'), // 'male', 'female', 'both'
    ageMinDays: numeric('age_min_days'),
    ageMaxDays: numeric('age_max_days'),
    lowValue: numeric('low_value'),
    highValue: numeric('high_value'),
    lowCritical: numeric('low_critical'),
    highCritical: numeric('high_critical'),
    unit: text('unit'),
    interpretationNotes: text('interpretation_notes'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdx: index('idx_lab_reference_ranges_account').on(table.accountId),
    testIdx: index('idx_lab_reference_ranges_test').on(table.testId),
    speciesIdx: index('idx_lab_reference_ranges_species').on(table.testId, table.species)
  })
);

export type LabReferenceRange = typeof labReferenceRanges.$inferSelect;
export type NewLabReferenceRange = typeof labReferenceRanges.$inferInsert;
