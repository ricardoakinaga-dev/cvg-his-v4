import {
  boolean,
  index,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { permissions } from './permissions.js';
import { users } from './users.js';

export const accessTeams = pgTable(
  'access_teams',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    accountId: varchar('account_id', { length: 255 })
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 100 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    description: varchar('description', { length: 500 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdx: index('idx_access_teams_account').on(table.accountId),
    codeUnique: uniqueIndex('idx_access_teams_code_unique').on(table.accountId, table.code)
  })
);

export const accessSectors = pgTable(
  'access_sectors',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    accountId: varchar('account_id', { length: 255 })
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 100 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    description: varchar('description', { length: 500 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdx: index('idx_access_sectors_account').on(table.accountId),
    codeUnique: uniqueIndex('idx_access_sectors_code_unique').on(table.accountId, table.code)
  })
);

export const accessTeamMemberships = pgTable(
  'access_team_memberships',
  {
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    teamId: varchar('team_id', { length: 255 })
      .notNull()
      .references(() => accessTeams.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({
      name: 'access_team_memberships_pkey',
      columns: [table.userId, table.teamId]
    }),
    userIdx: index('idx_access_team_memberships_user').on(table.userId),
    teamIdx: index('idx_access_team_memberships_team').on(table.teamId)
  })
);

export const accessSectorMemberships = pgTable(
  'access_sector_memberships',
  {
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sectorId: varchar('sector_id', { length: 255 })
      .notNull()
      .references(() => accessSectors.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({
      name: 'access_sector_memberships_pkey',
      columns: [table.userId, table.sectorId]
    }),
    userIdx: index('idx_access_sector_memberships_user').on(table.userId),
    sectorIdx: index('idx_access_sector_memberships_sector').on(table.sectorId)
  })
);

export const accessUserPermissions = pgTable(
  'access_user_permissions',
  {
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    permissionId: varchar('permission_id', { length: 255 })
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    effect: varchar('effect', { length: 16 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({
      name: 'access_user_permissions_pkey',
      columns: [table.userId, table.permissionId]
    }),
    userIdx: index('idx_access_user_permissions_user').on(table.userId),
    permissionIdx: index('idx_access_user_permissions_permission').on(table.permissionId)
  })
);

export const accessTeamPermissions = pgTable(
  'access_team_permissions',
  {
    teamId: varchar('team_id', { length: 255 })
      .notNull()
      .references(() => accessTeams.id, { onDelete: 'cascade' }),
    permissionId: varchar('permission_id', { length: 255 })
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    effect: varchar('effect', { length: 16 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({
      name: 'access_team_permissions_pkey',
      columns: [table.teamId, table.permissionId]
    }),
    teamIdx: index('idx_access_team_permissions_team').on(table.teamId),
    permissionIdx: index('idx_access_team_permissions_permission').on(table.permissionId)
  })
);

export const accessSectorPermissions = pgTable(
  'access_sector_permissions',
  {
    sectorId: varchar('sector_id', { length: 255 })
      .notNull()
      .references(() => accessSectors.id, { onDelete: 'cascade' }),
    permissionId: varchar('permission_id', { length: 255 })
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    effect: varchar('effect', { length: 16 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({
      name: 'access_sector_permissions_pkey',
      columns: [table.sectorId, table.permissionId]
    }),
    sectorIdx: index('idx_access_sector_permissions_sector').on(table.sectorId),
    permissionIdx: index('idx_access_sector_permissions_permission').on(table.permissionId)
  })
);
