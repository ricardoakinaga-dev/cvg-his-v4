import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';

// Lab test categories
export const labTestCategories = pgTable(
  'lab_test_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    parentId: uuid('parent_id'),
    displayOrder: integer('display_order').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountUnique: uniqueIndex('lab_test_categories_account_name_unique').on(table.accountId, table.name),
    accountIdx: index('idx_lab_test_categories_account').on(table.accountId),
    parentIdx: index('idx_lab_test_categories_parent').on(table.parentId)
  })
);

// Lab tests catalog
export const labTests = pgTable(
  'lab_tests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    categoryId: uuid('category_id').references(() => labTestCategories.id, { onDelete: 'set null' }),
    description: text('description'),
    method: text('method'),
    specimenType: text('specimen_type').notNull().default('blood'),
    specimenVolume: text('specimen_volume'),
    specimenInstructions: text('specimen_instructions'),
    turnaroundHours: integer('turnaround_hours').default(24),
    isActive: boolean('is_active').notNull().default(true),
    requiresFasting: boolean('requires_fasting').default(false),
    specialInstructions: text('special_instructions'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountCodeUnique: uniqueIndex('lab_tests_account_code_unique').on(table.accountId, table.code),
    accountIdx: index('idx_lab_tests_account').on(table.accountId),
    categoryIdx: index('idx_lab_tests_category').on(table.categoryId),
    activeIdx: index('idx_lab_tests_active').on(table.accountId, table.isActive),
    nameIdx: index('idx_lab_tests_name').on(table.accountId, table.name)
  })
);

// Lab test panels
export const labTestPanels = pgTable(
  'lab_test_panels',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountCodeUnique: uniqueIndex('lab_test_panels_account_code_unique').on(table.accountId, table.code),
    accountIdx: index('idx_lab_test_panels_account').on(table.accountId)
  })
);

// Panel items
export const labTestPanelItems = pgTable(
  'lab_test_panel_items',
  {
    panelId: uuid('panel_id')
      .notNull()
      .references(() => labTestPanels.id, { onDelete: 'cascade' }),
    testId: uuid('test_id')
      .notNull()
      .references(() => labTests.id, { onDelete: 'cascade' }),
    displayOrder: integer('display_order').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: uniqueIndex('lab_test_panel_items_pk').on(table.panelId, table.testId),
    testIdx: index('idx_lab_test_panel_items_test').on(table.testId)
  })
);

export type LabTestCategory = typeof labTestCategories.$inferSelect;
export type NewLabTestCategory = typeof labTestCategories.$inferInsert;
export type LabTest = typeof labTests.$inferSelect;
export type NewLabTest = typeof labTests.$inferInsert;
export type LabTestPanel = typeof labTestPanels.$inferSelect;
export type NewLabTestPanel = typeof labTestPanels.$inferInsert;
export type LabTestPanelItem = typeof labTestPanelItems.$inferSelect;
export type NewLabTestPanelItem = typeof labTestPanelItems.$inferInsert;
