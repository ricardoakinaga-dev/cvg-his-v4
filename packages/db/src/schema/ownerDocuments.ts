import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { owners } from './owners.js';

export type OwnerDocumentType = 'cpf' | 'cnpj' | 'rg' | 'passaporte' | 'outro';

export const ownerDocuments = pgTable(
  'owner_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => owners.id, { onDelete: 'cascade' }),
    type: text('type').notNull().$type<OwnerDocumentType>(),
    value: text('value').notNull(),
    issuer: text('issuer'),
    issueDate: date('issue_date', { mode: 'date' }),
    expiryDate: date('expiry_date', { mode: 'date' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountOwnerIdx: index('idx_owner_documents_account_owner').on(table.accountId, table.ownerId),
    ownerIdx: index('idx_owner_documents_owner').on(table.ownerId),
    valueIdx: index('idx_owner_documents_value').on(table.value)
  })
);
