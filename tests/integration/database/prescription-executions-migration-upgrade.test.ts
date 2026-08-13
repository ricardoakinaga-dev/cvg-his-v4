import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { PoolClient } from 'pg';

import { getTestPool } from '../../db/db-admin.js';
import { RLS_TEST_ROLE } from '../../helpers/rls-helpers.js';

const LEGACY_012_SQL = readFileSync(
  resolve('packages/shared/database/src/migrations/012_create_prescription_executions.sql'),
  'utf8'
);
const MIGRATION_0067_SQL = readFileSync(
  resolve('packages/db/migrations/0067_prescription_executions.sql'),
  'utf8'
);
const MIGRATION_0068_SQL = readFileSync(
  resolve('packages/db/migrations/0068_discharges.sql'),
  'utf8'
);

const IDS = {
  accountA: '11111111-1111-4111-8111-111111111111',
  accountB: '22222222-2222-4222-8222-222222222222',
  userA: '33333333-3333-4333-8333-333333333333',
  userB: '44444444-4444-4444-8444-444444444444',
  patientA: '55555555-5555-4555-8555-555555555555',
  patientB: '66666666-6666-4666-8666-666666666666',
  encounterA: '77777777-7777-4777-8777-777777777777',
  encounterB: '88888888-8888-4888-8888-888888888888'
} as const;

interface UpgradeSchemas {
  readonly legacyParentSchema: string;
  readonly schemaName: string;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function createUpgradeSchemas(client: PoolClient): Promise<UpgradeSchemas> {
  const suffix = randomUUID().replaceAll('-', '');
  const schemaName = `migration_0067_${suffix}`;
  const legacyParentSchema = `migration_0067_legacy_${suffix}`;

  await client.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`);
  await client.query(`CREATE SCHEMA ${quoteIdentifier(legacyParentSchema)}`);
  await client.query(`SET search_path TO ${quoteIdentifier(schemaName)}, public`);
  await client.query(`SET TIME ZONE 'America/Sao_Paulo'`);

  return { legacyParentSchema, schemaName };
}

async function createLegacyParents(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE accounts (
      id VARCHAR(255) PRIMARY KEY
    );
    CREATE TABLE clinical_entries (
      id VARCHAR(255) PRIMARY KEY,
      account_id VARCHAR(255) NOT NULL
    );
    CREATE TABLE patients (
      id VARCHAR(255) PRIMARY KEY,
      account_id VARCHAR(255) NOT NULL
    );
    CREATE TABLE encounters (
      id VARCHAR(255) PRIMARY KEY,
      account_id VARCHAR(255) NOT NULL
    );

    INSERT INTO accounts (id) VALUES ('${IDS.accountA}'), ('${IDS.accountB}');
    INSERT INTO clinical_entries (id, account_id)
      VALUES ('clinical-entry-a', '${IDS.accountA}'), ('clinical-entry-b', '${IDS.accountB}');
    INSERT INTO patients (id, account_id)
      VALUES ('${IDS.patientA}', '${IDS.accountA}'), ('${IDS.patientB}', '${IDS.accountB}');
    INSERT INTO encounters (id, account_id)
      VALUES ('${IDS.encounterA}', '${IDS.accountA}'), ('${IDS.encounterB}', '${IDS.accountB}');
  `);
}

async function seedLegacyExecutionRows(client: PoolClient): Promise<void> {
  await client.query(`
    INSERT INTO prescription_executions (
      id, account_id, clinical_entry_id, patient_id, encounter_id,
      medication_name, dosage, scheduled_at, status, administered_by,
      administered_at, notes, version, created_at, updated_at
    ) VALUES
      (
        'pe-legacy-a', '${IDS.accountA}', 'clinical-entry-a', '${IDS.patientA}',
        '${IDS.encounterA}', 'Dipirona', '25 mg/kg', '2026-08-12 09:30:00',
        'administered', '${IDS.userA}', '2026-08-12 09:35:00', 'Preserved A', 2,
        '2026-08-12 09:00:00', '2026-08-12 09:35:00'
      ),
      (
        'pe-legacy-b', '${IDS.accountB}', 'clinical-entry-b', '${IDS.patientB}',
        '${IDS.encounterB}', 'Meloxicam', '0.1 mg/kg', '2026-08-12 10:30:00',
        'pending', NULL, NULL, 'Preserved B', 1,
        '2026-08-12 10:00:00', '2026-08-12 10:00:00'
      );

    INSERT INTO administration_events (
      id, execution_id, event_type, actor_id, occurred_at, notes, created_at
    ) VALUES
      (
        'ae-legacy-a', 'pe-legacy-a', 'administered', '${IDS.userA}',
        '2026-08-12 09:35:00', 'Preserved event A', '2026-08-12 09:35:00'
      ),
      (
        'ae-legacy-b', 'pe-legacy-b', 'created', 'system',
        '2026-08-12 10:00:00', 'Preserved event B', '2026-08-12 10:00:00'
      );
  `);
}

async function replaceLegacyParentsWithCanonicalParents(
  client: PoolClient,
  legacyParentSchema: string
): Promise<void> {
  const quotedLegacySchema = quoteIdentifier(legacyParentSchema);

  for (const tableName of ['accounts', 'clinical_entries', 'patients', 'encounters']) {
    await client.query(
      `ALTER TABLE ${quoteIdentifier(tableName)} SET SCHEMA ${quotedLegacySchema}`
    );
  }

  await client.query(`
    CREATE TABLE accounts (
      id UUID PRIMARY KEY
    );
    CREATE TABLE users (
      id UUID PRIMARY KEY,
      account_id UUID NOT NULL REFERENCES accounts(id)
    );
    CREATE TABLE clinical_entries (
      id VARCHAR(255) PRIMARY KEY,
      account_id UUID NOT NULL REFERENCES accounts(id)
    );
    CREATE TABLE patients (
      id UUID PRIMARY KEY,
      account_id UUID NOT NULL REFERENCES accounts(id)
    );
    CREATE TABLE encounters (
      id UUID PRIMARY KEY,
      account_id UUID NOT NULL REFERENCES accounts(id)
    );

    CREATE UNIQUE INDEX uq_users_id_account ON users (id, account_id);
    CREATE UNIQUE INDEX uq_patients_id_account ON patients (id, account_id);
    CREATE UNIQUE INDEX uq_encounters_id_account ON encounters (id, account_id);

    INSERT INTO accounts (id) VALUES ('${IDS.accountA}'), ('${IDS.accountB}');
    INSERT INTO users (id, account_id)
      VALUES ('${IDS.userA}', '${IDS.accountA}'), ('${IDS.userB}', '${IDS.accountB}');
    INSERT INTO clinical_entries (id, account_id)
      VALUES ('clinical-entry-a', '${IDS.accountA}'), ('clinical-entry-b', '${IDS.accountB}');
    INSERT INTO patients (id, account_id)
      VALUES ('${IDS.patientA}', '${IDS.accountA}'), ('${IDS.patientB}', '${IDS.accountB}');
    INSERT INTO encounters (id, account_id)
      VALUES ('${IDS.encounterA}', '${IDS.accountA}'), ('${IDS.encounterB}', '${IDS.accountB}');
  `);
}

async function prepareLegacyUpgrade(client: PoolClient): Promise<UpgradeSchemas> {
  const schemas = await createUpgradeSchemas(client);
  await createLegacyParents(client);
  await client.query(LEGACY_012_SQL);
  await seedLegacyExecutionRows(client);
  await replaceLegacyParentsWithCanonicalParents(client, schemas.legacyParentSchema);
  return schemas;
}

async function cleanupUpgradeSchemas(
  client: PoolClient,
  schemas: UpgradeSchemas | undefined
): Promise<void> {
  await client.query('ROLLBACK').catch(() => undefined);
  await client.query('RESET ROLE').catch(() => undefined);
  await client.query('RESET search_path').catch(() => undefined);
  await client.query('RESET TIME ZONE').catch(() => undefined);
  if (!schemas) return;

  await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schemas.schemaName)} CASCADE`);
  await client.query(
    `DROP SCHEMA IF EXISTS ${quoteIdentifier(schemas.legacyParentSchema)} CASCADE`
  );
}

describe.sequential('Migration 0067 — prescription execution legacy upgrade', () => {
  it('upgrades 012 through 0067/0068, preserves rows and enforces tenant RLS', async () => {
    const client = await getTestPool().connect();
    let schemas: UpgradeSchemas | undefined;

    try {
      schemas = await prepareLegacyUpgrade(client);

      await client.query(MIGRATION_0067_SQL);
      await client.query(MIGRATION_0067_SQL);
      await client.query(MIGRATION_0068_SQL);

      const columnTypes = await client.query<{
        column_name: string;
        data_type: string;
        table_name: string;
      }>(
        `SELECT table_name, column_name, data_type
         FROM information_schema.columns
         WHERE table_schema = $1
           AND (table_name, column_name) IN (
             ('prescription_executions', 'id'),
             ('prescription_executions', 'account_id'),
             ('prescription_executions', 'clinical_entry_id'),
             ('prescription_executions', 'patient_id'),
             ('prescription_executions', 'encounter_id'),
             ('prescription_executions', 'administered_by'),
             ('prescription_executions', 'scheduled_at'),
             ('prescription_executions', 'administered_at'),
             ('prescription_executions', 'created_at'),
             ('prescription_executions', 'updated_at'),
             ('administration_events', 'id'),
             ('administration_events', 'account_id'),
             ('administration_events', 'execution_id'),
             ('administration_events', 'actor_id'),
             ('administration_events', 'occurred_at'),
             ('administration_events', 'created_at')
           )
         ORDER BY table_name, column_name`,
        [schemas.schemaName]
      );
      expect(
        Object.fromEntries(
          columnTypes.rows.map((row) => [`${row.table_name}.${row.column_name}`, row.data_type])
        )
      ).toEqual({
        'administration_events.account_id': 'uuid',
        'administration_events.actor_id': 'character varying',
        'administration_events.created_at': 'timestamp with time zone',
        'administration_events.execution_id': 'character varying',
        'administration_events.id': 'character varying',
        'administration_events.occurred_at': 'timestamp with time zone',
        'prescription_executions.account_id': 'uuid',
        'prescription_executions.administered_at': 'timestamp with time zone',
        'prescription_executions.administered_by': 'uuid',
        'prescription_executions.clinical_entry_id': 'character varying',
        'prescription_executions.created_at': 'timestamp with time zone',
        'prescription_executions.encounter_id': 'uuid',
        'prescription_executions.id': 'character varying',
        'prescription_executions.patient_id': 'uuid',
        'prescription_executions.scheduled_at': 'timestamp with time zone',
        'prescription_executions.updated_at': 'timestamp with time zone'
      });

      const preservedRows = await client.query<{
        account_id: string;
        actor_id: string;
        event_account_id: string;
        execution_id: string;
        occurred_at_utc: string;
        scheduled_at_utc: string;
      }>(`
        SELECT
          execution.id AS execution_id,
          execution.account_id::text AS account_id,
          event.account_id::text AS event_account_id,
          event.actor_id,
          to_char(execution.scheduled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS scheduled_at_utc,
          to_char(event.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS occurred_at_utc
        FROM prescription_executions AS execution
        JOIN administration_events AS event ON event.execution_id = execution.id
        ORDER BY execution.id
      `);
      expect(preservedRows.rows).toEqual([
        {
          account_id: IDS.accountA,
          actor_id: IDS.userA,
          event_account_id: IDS.accountA,
          execution_id: 'pe-legacy-a',
          occurred_at_utc: '2026-08-12 09:35:00',
          scheduled_at_utc: '2026-08-12 09:30:00'
        },
        {
          account_id: IDS.accountB,
          actor_id: 'system',
          event_account_id: IDS.accountB,
          execution_id: 'pe-legacy-b',
          occurred_at_utc: '2026-08-12 10:00:00',
          scheduled_at_utc: '2026-08-12 10:30:00'
        }
      ]);

      const constraints = await client.query<{ conname: string; definition: string }>(
        `SELECT constraint_row.conname, pg_get_constraintdef(constraint_row.oid) AS definition
         FROM pg_constraint AS constraint_row
         JOIN pg_class AS relation ON relation.oid = constraint_row.conrelid
         JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
         WHERE namespace.nspname = $1
           AND relation.relname IN ('prescription_executions', 'administration_events')
           AND constraint_row.contype = 'f'
         ORDER BY constraint_row.conname`,
        [schemas.schemaName]
      );
      expect(constraints.rows).toEqual([
        expect.objectContaining({ conname: 'administration_events_account_fk' }),
        expect.objectContaining({
          conname: 'administration_events_execution_account_fk',
          definition: expect.stringContaining('FOREIGN KEY (execution_id, account_id)')
        }),
        expect.objectContaining({ conname: 'prescription_executions_account_fk' }),
        expect.objectContaining({
          conname: 'prescription_executions_administered_by_account_fk',
          definition: expect.stringContaining('FOREIGN KEY (administered_by, account_id)')
        }),
        expect.objectContaining({
          conname: 'prescription_executions_clinical_entry_account_fk',
          definition: expect.stringContaining('FOREIGN KEY (clinical_entry_id, account_id)')
        }),
        expect.objectContaining({
          conname: 'prescription_executions_encounter_account_fk',
          definition: expect.stringContaining('FOREIGN KEY (encounter_id, account_id)')
        }),
        expect.objectContaining({
          conname: 'prescription_executions_patient_account_fk',
          definition: expect.stringContaining('FOREIGN KEY (patient_id, account_id)')
        })
      ]);

      const relationSecurity = await client.query<{
        relforcerowsecurity: boolean;
        relname: string;
        relrowsecurity: boolean;
      }>(
        `SELECT relation.relname, relation.relrowsecurity, relation.relforcerowsecurity
         FROM pg_class AS relation
         JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
         WHERE namespace.nspname = $1
           AND relation.relname IN ('prescription_executions', 'administration_events')
         ORDER BY relation.relname`,
        [schemas.schemaName]
      );
      expect(relationSecurity.rows).toEqual([
        { relforcerowsecurity: true, relname: 'administration_events', relrowsecurity: true },
        { relforcerowsecurity: true, relname: 'prescription_executions', relrowsecurity: true }
      ]);
      expect(
        await client.query(
          `SELECT to_regclass('${schemas.schemaName}.discharges') IS NOT NULL AS ok`
        )
      ).toMatchObject({ rows: [{ ok: true }] });

      await client.query(
        `GRANT USAGE ON SCHEMA ${quoteIdentifier(schemas.schemaName)} TO ${RLS_TEST_ROLE}`
      );
      await client.query(
        `GRANT SELECT, INSERT ON prescription_executions, administration_events TO ${RLS_TEST_ROLE}`
      );
      await client.query('BEGIN');
      await client.query(`SET LOCAL ROLE ${RLS_TEST_ROLE}`);
      await client.query("SELECT set_config('app.current_account_id', $1, true)", [IDS.accountA]);

      expect(
        (await client.query<{ id: string }>('SELECT id FROM prescription_executions ORDER BY id'))
          .rows
      ).toEqual([{ id: 'pe-legacy-a' }]);
      expect(
        (await client.query<{ id: string }>('SELECT id FROM administration_events ORDER BY id'))
          .rows
      ).toEqual([{ id: 'ae-legacy-a' }]);

      await client.query('SAVEPOINT cross_tenant_insert');
      await expect(
        client.query(
          `INSERT INTO administration_events (
             id, account_id, execution_id, event_type, actor_id
           ) VALUES ('ae-cross-tenant', $1, 'pe-legacy-b', 'created', 'system')`,
          [IDS.accountB]
        )
      ).rejects.toMatchObject({ code: '42501' });
      await client.query('ROLLBACK TO SAVEPOINT cross_tenant_insert');

      await client.query("SELECT set_config('app.current_account_id', $1, true)", [IDS.accountB]);
      expect(
        (await client.query<{ id: string }>('SELECT id FROM prescription_executions ORDER BY id'))
          .rows
      ).toEqual([{ id: 'pe-legacy-b' }]);
      await client.query('ROLLBACK');
    } finally {
      await cleanupUpgradeSchemas(client, schemas);
      client.release();
    }
  });

  it('aborts explicitly and preserves 012 rows when a UUID cannot be converted', async () => {
    const client = await getTestPool().connect();
    let schemas: UpgradeSchemas | undefined;

    try {
      schemas = await prepareLegacyUpgrade(client);
      await client.query(
        `UPDATE prescription_executions SET account_id = 'not-a-uuid' WHERE id = 'pe-legacy-a'`
      );

      await client.query('BEGIN');
      await expect(client.query(MIGRATION_0067_SQL)).rejects.toThrow(
        /0067 unsafe upgrade: prescription_executions\.account_id contains 1 non-UUID value/
      );
      await client.query('ROLLBACK');

      const preserved = await client.query<{ account_id: string; account_type: string }>(`
        SELECT account_id, pg_typeof(account_id)::text AS account_type
        FROM prescription_executions
        WHERE id = 'pe-legacy-a'
      `);
      expect(preserved.rows).toEqual([
        { account_id: 'not-a-uuid', account_type: 'character varying' }
      ]);
    } finally {
      await cleanupUpgradeSchemas(client, schemas);
      client.release();
    }
  });

  it('aborts explicitly instead of accepting a legacy cross-account relationship', async () => {
    const client = await getTestPool().connect();
    let schemas: UpgradeSchemas | undefined;

    try {
      schemas = await prepareLegacyUpgrade(client);
      await client.query(
        `UPDATE prescription_executions SET account_id = $1 WHERE id = 'pe-legacy-a'`,
        [IDS.accountB]
      );

      await client.query('BEGIN');
      await expect(client.query(MIGRATION_0067_SQL)).rejects.toThrow(
        /0067 unsafe upgrade: prescription_executions contains 1 missing or cross-account relationship/
      );
      await client.query('ROLLBACK');

      const preserved = await client.query<{ account_id: string; rows: number }>(`
        SELECT account_id, COUNT(*)::int AS rows
        FROM prescription_executions
        WHERE id = 'pe-legacy-a'
        GROUP BY account_id
      `);
      expect(preserved.rows).toEqual([{ account_id: IDS.accountB, rows: 1 }]);
    } finally {
      await cleanupUpgradeSchemas(client, schemas);
      client.release();
    }
  });
});
