import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { PoolClient } from 'pg';

import { getTestPool } from '../../db/db-admin.js';

const MIGRATION_SQL = readFileSync(
  resolve('packages/db/migrations/0060_materialize_runtime_schema_gaps.sql'),
  'utf8'
);

const IDS = {
  account: '11111111-1111-4111-8111-111111111111',
  encounter: '55555555-5555-4555-8555-555555555555',
  owner: '33333333-3333-4333-8333-333333333333',
  patient: '44444444-4444-4444-8444-444444444444',
  permission: '77777777-7777-4777-8777-777777777777',
  stay: '66666666-6666-4666-8666-666666666666',
  user: '22222222-2222-4222-8222-222222222222'
} as const;

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function createUpgradeSchema(client: PoolClient): Promise<string> {
  const schemaName = `migration_0060_${randomUUID().replaceAll('-', '')}`;
  await client.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`);
  await client.query(`SET search_path TO ${quoteIdentifier(schemaName)}, public`);
  return schemaName;
}

async function createCanonicalParents(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE accounts (
      id UUID PRIMARY KEY
    );
    CREATE TABLE users (
      id UUID PRIMARY KEY,
      account_id UUID NOT NULL REFERENCES accounts(id)
    );
    CREATE TABLE permissions (
      id UUID PRIMARY KEY
    );
    CREATE TABLE owners (
      id UUID PRIMARY KEY,
      account_id UUID NOT NULL REFERENCES accounts(id)
    );
    CREATE TABLE patients (
      id UUID PRIMARY KEY,
      account_id UUID NOT NULL REFERENCES accounts(id),
      owner_id UUID NOT NULL REFERENCES owners(id)
    );
    CREATE TABLE encounters (
      id UUID PRIMARY KEY,
      account_id UUID NOT NULL REFERENCES accounts(id),
      patient_id UUID NOT NULL REFERENCES patients(id),
      owner_id UUID NOT NULL REFERENCES owners(id)
    );
    CREATE TABLE inpatient_stays (
      id UUID PRIMARY KEY,
      account_id UUID NOT NULL REFERENCES accounts(id),
      encounter_id UUID REFERENCES encounters(id)
    );

    INSERT INTO accounts (id) VALUES ('${IDS.account}');
    INSERT INTO users (id, account_id) VALUES ('${IDS.user}', '${IDS.account}');
    INSERT INTO permissions (id) VALUES ('${IDS.permission}');
    INSERT INTO owners (id, account_id) VALUES ('${IDS.owner}', '${IDS.account}');
    INSERT INTO patients (id, account_id, owner_id)
      VALUES ('${IDS.patient}', '${IDS.account}', '${IDS.owner}');
    INSERT INTO encounters (id, account_id, patient_id, owner_id)
      VALUES ('${IDS.encounter}', '${IDS.account}', '${IDS.patient}', '${IDS.owner}');
    INSERT INTO inpatient_stays (id, account_id, encounter_id)
      VALUES ('${IDS.stay}', '${IDS.account}', '${IDS.encounter}');
  `);
}

async function materializeLegacyRuntimeTables(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE access_teams (
      id VARCHAR(255) PRIMARY KEY,
      account_id VARCHAR(255) NOT NULL,
      code VARCHAR(100) NOT NULL,
      name VARCHAR(150) NOT NULL,
      description VARCHAR(500),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT access_teams_account_code_unique UNIQUE (account_id, code)
    );
    CREATE TABLE access_sectors (
      id VARCHAR(255) PRIMARY KEY,
      account_id VARCHAR(255) NOT NULL,
      code VARCHAR(100) NOT NULL,
      name VARCHAR(150) NOT NULL,
      description VARCHAR(500),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT access_sectors_account_code_unique UNIQUE (account_id, code)
    );
    CREATE TABLE access_team_memberships (
      user_id VARCHAR(255) NOT NULL,
      team_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, team_id)
    );
    CREATE TABLE access_sector_memberships (
      user_id VARCHAR(255) NOT NULL,
      sector_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, sector_id)
    );
    CREATE TABLE access_user_permissions (
      user_id VARCHAR(255) NOT NULL,
      permission_id VARCHAR(255) NOT NULL,
      effect VARCHAR(16) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, permission_id)
    );
    CREATE TABLE access_team_permissions (
      team_id VARCHAR(255) NOT NULL,
      permission_id VARCHAR(255) NOT NULL,
      effect VARCHAR(16) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (team_id, permission_id)
    );
    CREATE TABLE access_sector_permissions (
      sector_id VARCHAR(255) NOT NULL,
      permission_id VARCHAR(255) NOT NULL,
      effect VARCHAR(16) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (sector_id, permission_id)
    );

    CREATE TABLE owner_patient_links (
      id VARCHAR(255) PRIMARY KEY,
      owner_id VARCHAR(255) NOT NULL,
      patient_id VARCHAR(255) NOT NULL,
      relationship VARCHAR(50),
      is_primary BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL
    );

    CREATE TABLE inventory_items (
      id VARCHAR(255) PRIMARY KEY,
      account_id VARCHAR(255) NOT NULL,
      sku VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      unit VARCHAR(50) NOT NULL,
      on_hand_quantity NUMERIC(10, 2) NOT NULL,
      reorder_level NUMERIC(10, 2) NOT NULL,
      unit_cost_amount NUMERIC(12, 2) NOT NULL,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );
    CREATE TABLE inventory_consumptions (
      id VARCHAR(255) PRIMARY KEY,
      account_id VARCHAR(255) NOT NULL,
      inventory_item_id VARCHAR(255) NOT NULL,
      encounter_id VARCHAR(255) NOT NULL,
      patient_id VARCHAR(255) NOT NULL,
      quantity NUMERIC(10, 2) NOT NULL,
      unit VARCHAR(50) NOT NULL,
      cost_amount NUMERIC(12, 2) NOT NULL,
      source_entity_type VARCHAR(50),
      source_entity_id VARCHAR(255),
      recorded_by_user_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL
    );

    CREATE TABLE inpatient_progress (
      id VARCHAR(255) PRIMARY KEY,
      account_id VARCHAR(255),
      stay_id VARCHAR(255) NOT NULL,
      encounter_id VARCHAR(255) NOT NULL,
      note VARCHAR(5000) NOT NULL,
      authored_by_user_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL
    );

    CREATE TABLE surgery_cases (
      id VARCHAR(255) PRIMARY KEY,
      account_id VARCHAR(255) NOT NULL,
      encounter_id VARCHAR(255) NOT NULL,
      patient_id VARCHAR(255) NOT NULL,
      procedure_name VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      surgeon_user_id VARCHAR(255),
      surgical_team JSONB,
      preparation_notes VARCHAR(2000),
      operative_notes VARCHAR(5000),
      scheduled_at TIMESTAMP,
      started_at TIMESTAMP,
      ended_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );
  `);
}

async function seedValidLegacyRows(client: PoolClient): Promise<void> {
  await client.query(`
    INSERT INTO access_teams (id, account_id, code, name)
      VALUES ('team-legacy', '${IDS.account}', 'CLINICAL', 'Clinical');
    INSERT INTO access_sectors (id, account_id, code, name)
      VALUES ('sector-legacy', '${IDS.account}', 'WARD', 'Ward');
    INSERT INTO access_team_memberships (user_id, team_id)
      VALUES ('${IDS.user}', 'team-legacy');
    INSERT INTO access_sector_memberships (user_id, sector_id)
      VALUES ('${IDS.user}', 'sector-legacy');
    INSERT INTO access_user_permissions (user_id, permission_id, effect)
      VALUES ('${IDS.user}', '${IDS.permission}', 'allow');
    INSERT INTO access_team_permissions (team_id, permission_id, effect)
      VALUES ('team-legacy', '${IDS.permission}', 'deny');
    INSERT INTO access_sector_permissions (sector_id, permission_id, effect)
      VALUES ('sector-legacy', '${IDS.permission}', 'allow');

    INSERT INTO owner_patient_links (
      id, owner_id, patient_id, relationship, is_primary, created_at
    ) VALUES (
      'owner-patient-legacy', '${IDS.owner}', '${IDS.patient}', 'guardian', true,
      '2026-08-11 10:00:00'
    );

    INSERT INTO inventory_items (
      id, account_id, sku, name, unit, on_hand_quantity, reorder_level,
      unit_cost_amount, created_at, updated_at
    ) VALUES (
      'inventory-legacy', '${IDS.account}', 'SKU-LEGACY', 'Legacy item', 'unit',
      10, 2, 3.50, '2026-08-11 10:00:00', '2026-08-11 10:00:00'
    );
    INSERT INTO inventory_consumptions (
      id, account_id, inventory_item_id, encounter_id, patient_id, quantity,
      unit, cost_amount, recorded_by_user_id, created_at
    ) VALUES (
      'consumption-legacy', '${IDS.account}', 'inventory-legacy', '${IDS.encounter}',
      '${IDS.patient}', 1, 'unit', 3.50, '${IDS.user}', '2026-08-11 10:00:00'
    );

    INSERT INTO inpatient_progress (
      id, account_id, stay_id, encounter_id, note, authored_by_user_id, created_at
    ) VALUES (
      'progress-legacy', NULL, '${IDS.stay}', '${IDS.encounter}', 'Stable',
      '${IDS.user}', '2026-08-11 10:00:00'
    );

    INSERT INTO surgery_cases (
      id, account_id, encounter_id, patient_id, procedure_name, status,
      surgeon_user_id, surgical_team, scheduled_at, created_at, updated_at
    ) VALUES (
      'surgery-legacy', '${IDS.account}', '${IDS.encounter}', '${IDS.patient}',
      'Procedure', 'scheduled', '${IDS.user}', '[]'::jsonb,
      '2026-08-11 10:00:00', '2026-08-11 10:00:00', '2026-08-11 10:00:00'
    );
  `);
}

async function columnTypes(
  client: PoolClient,
  schemaName: string
): Promise<Record<string, string>> {
  const result = await client.query<{ column_name: string; data_type: string; table_name: string }>(
    `SELECT table_name, column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = $1
       AND (table_name, column_name) IN (
         ('access_teams', 'account_id'),
         ('access_sectors', 'account_id'),
         ('access_team_memberships', 'user_id'),
         ('access_sector_memberships', 'user_id'),
         ('access_user_permissions', 'user_id'),
         ('access_user_permissions', 'permission_id'),
         ('access_team_permissions', 'permission_id'),
         ('access_sector_permissions', 'permission_id'),
         ('finance_expense_catalog_items', 'created_by_user_id'),
         ('owner_patient_links', 'account_id'),
         ('owner_patient_links', 'owner_id'),
         ('owner_patient_links', 'patient_id'),
         ('inventory_items', 'account_id'),
         ('inventory_consumptions', 'account_id'),
         ('inventory_consumptions', 'encounter_id'),
         ('inventory_consumptions', 'patient_id'),
         ('inventory_consumptions', 'recorded_by_user_id'),
         ('inpatient_progress', 'account_id'),
         ('inpatient_progress', 'stay_id'),
         ('inpatient_progress', 'encounter_id'),
         ('inpatient_progress', 'authored_by_user_id'),
         ('surgery_cases', 'account_id'),
         ('surgery_cases', 'encounter_id'),
         ('surgery_cases', 'patient_id'),
         ('surgery_cases', 'surgeon_user_id')
       )
     ORDER BY table_name, column_name`,
    [schemaName]
  );

  return Object.fromEntries(
    result.rows.map((row) => [`${row.table_name}.${row.column_name}`, row.data_type])
  );
}

describe.sequential('Migration 0060 — legacy upgrade rehearsal', () => {
  it('reconciles materialized legacy formats, preserves rows and is idempotent', async () => {
    const client = await getTestPool().connect();
    let schemaName: string | undefined;

    try {
      schemaName = await createUpgradeSchema(client);
      await createCanonicalParents(client);
      await materializeLegacyRuntimeTables(client);
      await seedValidLegacyRows(client);

      await client.query(MIGRATION_SQL);
      await client.query(MIGRATION_SQL);

      expect(await columnTypes(client, schemaName)).toEqual({
        'access_sector_memberships.user_id': 'uuid',
        'access_sector_permissions.permission_id': 'uuid',
        'access_sectors.account_id': 'uuid',
        'access_team_memberships.user_id': 'uuid',
        'access_team_permissions.permission_id': 'uuid',
        'access_teams.account_id': 'uuid',
        'access_user_permissions.permission_id': 'uuid',
        'access_user_permissions.user_id': 'uuid',
        'finance_expense_catalog_items.created_by_user_id': 'uuid',
        'inpatient_progress.authored_by_user_id': 'uuid',
        'inpatient_progress.account_id': 'uuid',
        'inpatient_progress.encounter_id': 'uuid',
        'inpatient_progress.stay_id': 'uuid',
        'inventory_consumptions.account_id': 'uuid',
        'inventory_consumptions.encounter_id': 'uuid',
        'inventory_consumptions.patient_id': 'uuid',
        'inventory_consumptions.recorded_by_user_id': 'uuid',
        'inventory_items.account_id': 'uuid',
        'owner_patient_links.account_id': 'uuid',
        'owner_patient_links.owner_id': 'uuid',
        'owner_patient_links.patient_id': 'uuid',
        'surgery_cases.account_id': 'uuid',
        'surgery_cases.encounter_id': 'uuid',
        'surgery_cases.patient_id': 'uuid',
        'surgery_cases.surgeon_user_id': 'uuid'
      });

      const preserved = await client.query<{ account_id: string; rows: number }>(`
        SELECT account_id::text, COUNT(*)::int AS rows
        FROM (
          SELECT account_id FROM owner_patient_links
          UNION ALL SELECT account_id FROM inventory_items
          UNION ALL SELECT account_id FROM inventory_consumptions
          UNION ALL SELECT account_id FROM inpatient_progress
          UNION ALL SELECT account_id FROM surgery_cases
        ) AS upgraded
        GROUP BY account_id
      `);
      expect(preserved.rows).toEqual([{ account_id: IDS.account, rows: 5 }]);

      const constraints = await client.query<{ conname: string }>(
        `SELECT conname
         FROM pg_constraint
         WHERE connamespace = $1::regnamespace
           AND conname IN (
             'owner_patient_links_owner_account_fk',
             'owner_patient_links_patient_account_fk',
             'inventory_consumptions_item_account_fk',
             'inpatient_progress_stay_account_fk',
             'surgery_cases_encounter_account_fk'
           )
         ORDER BY conname`,
        [schemaName]
      );
      expect(constraints.rows.map((row) => row.conname)).toEqual([
        'inpatient_progress_stay_account_fk',
        'inventory_consumptions_item_account_fk',
        'owner_patient_links_owner_account_fk',
        'owner_patient_links_patient_account_fk',
        'surgery_cases_encounter_account_fk'
      ]);

      const policies = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM pg_policy AS policy
         JOIN pg_class AS relation ON relation.oid = policy.polrelid
         JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
         WHERE namespace.nspname = $1
           AND policy.polname IN (
             'access_teams_tenant_isolation',
             'owner_patient_links_tenant_isolation',
             'inventory_consumptions_tenant_isolation',
             'inpatient_progress_tenant_isolation',
             'surgery_cases_tenant_isolation'
           )`,
        [schemaName]
      );
      expect(policies.rows[0]?.count).toBe(5);
    } finally {
      if (schemaName) {
        await client.query('RESET search_path');
        await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`);
      }
      client.release();
    }
  });

  it('aborts explicitly and preserves legacy data when a UUID conversion is unsafe', async () => {
    const client = await getTestPool().connect();
    let schemaName: string | undefined;

    try {
      schemaName = await createUpgradeSchema(client);
      await createCanonicalParents(client);
      await materializeLegacyRuntimeTables(client);
      await seedValidLegacyRows(client);
      await client.query(`UPDATE access_teams SET account_id = 'not-a-uuid'`);

      await client.query('BEGIN');
      await expect(client.query(MIGRATION_SQL)).rejects.toThrow(
        /0060 unsafe upgrade: access_teams\.account_id contains 1 non-UUID value/
      );
      await client.query('ROLLBACK');

      const legacyRow = await client.query<{ account_id: string }>(
        'SELECT account_id FROM access_teams WHERE id = $1',
        ['team-legacy']
      );
      expect(legacyRow.rows).toEqual([{ account_id: 'not-a-uuid' }]);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      if (schemaName) {
        await client.query('RESET search_path');
        await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`);
      }
      client.release();
    }
  });

  it('aborts explicitly instead of backfilling an ambiguous cross-account relationship', async () => {
    const client = await getTestPool().connect();
    let schemaName: string | undefined;

    try {
      schemaName = await createUpgradeSchema(client);
      await createCanonicalParents(client);
      await materializeLegacyRuntimeTables(client);
      await seedValidLegacyRows(client);
      await client.query(`
        INSERT INTO accounts (id) VALUES ('99999999-9999-4999-8999-999999999999');
        UPDATE patients
        SET account_id = '99999999-9999-4999-8999-999999999999'
        WHERE id = '${IDS.patient}'
      `);

      await client.query('BEGIN');
      await expect(client.query(MIGRATION_SQL)).rejects.toThrow(
        /0060 unsafe upgrade: owner_patient_links contains 1 missing, ambiguous or cross-account relationship/
      );
      await client.query('ROLLBACK');

      const legacyRow = await client.query<{ owner_id: string; patient_id: string }>(
        'SELECT owner_id, patient_id FROM owner_patient_links WHERE id = $1',
        ['owner-patient-legacy']
      );
      expect(legacyRow.rows).toEqual([{ owner_id: IDS.owner, patient_id: IDS.patient }]);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      if (schemaName) {
        await client.query('RESET search_path');
        await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`);
      }
      client.release();
    }
  });

  it('audits hidden rows when the migration runs as a non-superuser table owner', async () => {
    const client = await getTestPool().connect();
    const roleName = `migration_0060_owner_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
    let schemaName: string | undefined;

    try {
      schemaName = await createUpgradeSchema(client);
      await createCanonicalParents(client);
      await materializeLegacyRuntimeTables(client);
      await seedValidLegacyRows(client);
      await client.query(`UPDATE access_teams SET account_id = 'hidden-invalid-uuid'`);
      await client.query(`
        ALTER TABLE access_teams ENABLE ROW LEVEL SECURITY;
        ALTER TABLE access_teams FORCE ROW LEVEL SECURITY;
        CREATE POLICY access_teams_deny_upgrade_owner ON access_teams
          FOR ALL USING (false) WITH CHECK (false)
      `);

      await client.query(`CREATE ROLE ${quoteIdentifier(roleName)} NOLOGIN`);
      await client.query(`GRANT USAGE ON SCHEMA app TO ${quoteIdentifier(roleName)}`);
      await client.query(`ALTER SCHEMA ${quoteIdentifier(schemaName)} OWNER TO ${quoteIdentifier(roleName)}`);

      const relations = await client.query<{ relation_name: string }>(
        `SELECT relation.relname AS relation_name
         FROM pg_class AS relation
         JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
         WHERE namespace.nspname = $1
           AND relation.relkind IN ('r', 'p')
         ORDER BY relation.relname`,
        [schemaName]
      );
      for (const relation of relations.rows) {
        await client.query(
          `ALTER TABLE ${quoteIdentifier(schemaName)}.${quoteIdentifier(relation.relation_name)} OWNER TO ${quoteIdentifier(roleName)}`
        );
      }

      await client.query(
        'DROP FUNCTION IF EXISTS pg_temp.cvg_0060_convert_uuid_column(TEXT, TEXT)'
      );
      await client.query(
        'DROP FUNCTION IF EXISTS pg_temp.cvg_0060_replace_constraint(TEXT, TEXT, TEXT)'
      );
      await client.query(`SET ROLE ${quoteIdentifier(roleName)}`);
      await client.query(`SET search_path TO ${quoteIdentifier(schemaName)}, public`);
      await client.query('BEGIN');
      await expect(client.query(MIGRATION_SQL)).rejects.toThrow(
        /0060 unsafe upgrade: access_teams\.account_id contains 1 non-UUID value/
      );
      await client.query('ROLLBACK');
      await client.query('RESET ROLE');

      const legacyRow = await client.query<{ account_id: string }>(
        `SELECT account_id FROM ${quoteIdentifier(schemaName)}.access_teams WHERE id = $1`,
        ['team-legacy']
      );
      expect(legacyRow.rows).toEqual([{ account_id: 'hidden-invalid-uuid' }]);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      await client.query('RESET ROLE').catch(() => undefined);
      await client.query('RESET search_path').catch(() => undefined);
      if (schemaName) {
        await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`);
      }
      await client.query(`DROP OWNED BY ${quoteIdentifier(roleName)}`).catch(() => undefined);
      await client.query(`DROP ROLE IF EXISTS ${quoteIdentifier(roleName)}`).catch(() => undefined);
      client.release();
    }
  });
});
