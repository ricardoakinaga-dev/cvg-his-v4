import { randomUUID } from 'node:crypto';
import { Client, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { reconcileRuntimeRoles } from '../../../packages/db/src/reconcile-runtime-roles.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const tenantId = randomUUID();
const accountId = randomUUID();
const actorId = randomUUID();
const ownerId = randomUUID();
const patientId = randomUUID();
const encounterId = randomUUID();
const recordId = randomUUID();
const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
const roles = [`timeline_api_${suffix}`, `timeline_worker_${suffix}`];
const tables = ['clinical_timeline', 'encounter_timeline', 'audit_events'] as const;
type EvidenceTable = typeof tables[number];

async function append(client: PoolClient, table: EvidenceTable, id: string, summary: string) {
  if (table === 'audit_events') {
    await client.query(`INSERT INTO audit_events
      (id, account_id, action, entity_type, entity_id, metadata, correlation_id, occurred_at, created_at)
      VALUES ($1, $2, 'timeline.correction', 'encounter', $3, $4, $5, now(), now())`,
    [id, accountId, encounterId, JSON.stringify({ summary }), id]);
  } else if (table === 'clinical_timeline') {
    await client.query(`INSERT INTO clinical_timeline
      (id, account_id, medical_record_id, encounter_id, event_type, summary, actor_user_id, occurred_at)
      VALUES ($1, $2, $3, $4, 'entry_updated', $5, $6, now())`,
    [id, accountId, recordId, encounterId, summary, actorId]);
  } else {
    await client.query(`INSERT INTO encounter_timeline
      (id, account_id, encounter_id, event_type, summary, actor_user_id, occurred_at)
      VALUES ($1, $2, $3, 'status_changed', $4, $5, now())`,
    [id, accountId, encounterId, summary, actorId]);
  }
}

beforeAll(async () => {
  const pool = getTestPool();
  await pool.query(`INSERT INTO tenants (id, slug, name, status) VALUES ($1, $2, 'Timeline proof', 'active')`, [tenantId, `timeline-${suffix}`]);
  await pool.query(`INSERT INTO accounts (id, tenant_id, slug, name) VALUES ($1, $2, $3, 'Timeline proof')`, [accountId, tenantId, `timeline-${suffix}`]);
  await pool.query(`INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active)
    VALUES ($1, $2, $3, $4, 'fixture', 'Timeline actor', true)`, [actorId, accountId, `timeline-${suffix}`, `${suffix}@example.test`]);
  await pool.query(`INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, 'Timeline owner')`, [ownerId, accountId]);
  await pool.query(`INSERT INTO patients (id, account_id, owner_id, name, species) VALUES ($1, $2, $3, 'Timeline patient', 'canine')`, [patientId, accountId, ownerId]);
  await pool.query(`INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
    VALUES ($1, $2, $3, $4, 'open', $5)`, [encounterId, accountId, patientId, ownerId, actorId]);
  await pool.query(`INSERT INTO medical_records (id, account_id, encounter_id, patient_id, status, version, created_at, updated_at)
    VALUES ($1, $2, $3, $4, 'open', 1, now(), now())`, [recordId, accountId, encounterId, patientId]);
  for (const role of roles) {
    await pool.query(`CREATE ROLE "${role}" LOGIN PASSWORD 'timeline-fixture-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
  }
  // Another suite may already have revoked PUBLIC execution on app functions.
  // Provision the real runtime contract before deliberately broadening table
  // privileges; these roles must never depend on clean-schema PUBLIC defaults.
  const client = await pool.connect();
  try {
    await reconcileRuntimeRoles(client, { apiRole: roles[0], workerRole: roles[1] });
    for (const role of roles) {
      const privileges = await client.query(`SELECT rolsuper, rolbypassrls,
        has_function_privilege(oid, 'app.current_account_id()', 'EXECUTE') AS account_context,
        has_function_privilege(oid, 'app.has_account_context()', 'EXECUTE') AS context_present
        FROM pg_roles WHERE rolname = $1`, [role]);
      expect(privileges.rows).toEqual([{
        rolsuper: false, rolbypassrls: false, account_context: true, context_present: true
      }]);
      await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public TO "${role}"`);
    }
  } finally {
    client.release();
  }
});

afterAll(async () => {
  const pool = getTestPool();
  await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
  for (const role of roles) {
    if ((await pool.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role])).rowCount) {
      await pool.query(`DROP OWNED BY "${role}"`);
      await pool.query(`DROP ROLE "${role}"`);
    }
  }
});

describe('production runtime reconciliation protects clinical evidence', () => {
  it('repairs permissive API/worker grants, preserves appended corrections, and permits owner cleanup', async () => {
    const client = await getTestPool().connect();
    try {
      // Even accidental broad grants cannot bypass the evidence trigger.
      // Roll back each probe so no fixture or seed evidence is lost.
      for (const role of roles) {
        for (const table of tables) {
          await client.query('BEGIN');
          await client.query(`SET LOCAL ROLE "${role}"`);
          await client.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
          const id = randomUUID();
          await append(client, table, id, 'original');
          for (const statement of [`UPDATE ${table} SET occurred_at = now() WHERE id = '${id}'`, `DELETE FROM ${table} WHERE id = '${id}'`, `TRUNCATE ${table}`]) {
            await client.query('SAVEPOINT broad_grant');
            await expect(client.query(statement)).rejects.toMatchObject({ code: '42501', constraint: 'clinical_evidence_append_only' });
            await client.query('ROLLBACK TO SAVEPOINT broad_grant');
          }
          await client.query('ROLLBACK');
        }
      }
      // This is the production reconciler, not test-side REVOKE statements.
      await reconcileRuntimeRoles(client, { apiRole: roles[0], workerRole: roles[1] });
      await reconcileRuntimeRoles(client, { apiRole: roles[0], workerRole: roles[1] });
      for (const role of roles) {
        for (const table of tables) {
          await client.query('BEGIN');
          await client.query(`SET LOCAL ROLE "${role}"`);
          await client.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
          const original = randomUUID();
          const correction = randomUUID();
          await append(client, table, original, 'original');
          await append(client, table, correction, 'appended correction');
          const before = (await client.query(`SELECT * FROM ${table} WHERE id IN ($1, $2) ORDER BY id`, [original, correction])).rows;
          expect(before).toHaveLength(2);
          for (const statement of [
            `UPDATE ${table} SET occurred_at = now() WHERE id = '${original}'`,
            `DELETE FROM ${table} WHERE id = '${original}'`,
            `TRUNCATE ${table}`
          ]) {
            await client.query('SAVEPOINT denied_mutation');
            await expect(client.query(statement)).rejects.toMatchObject({ code: '42501' });
            await client.query('ROLLBACK TO SAVEPOINT denied_mutation');
          }
          expect((await client.query(`SELECT * FROM ${table} WHERE id IN ($1, $2) ORDER BY id`, [original, correction])).rows).toEqual(before);
          await client.query('COMMIT');
        }
      }
      // Table-owner cascades and rollback remain available for administration.
      await client.query('BEGIN');
      await client.query('DELETE FROM encounters WHERE id = $1', [encounterId]);
      for (const table of ['clinical_timeline', 'encounter_timeline']) {
        expect((await client.query(`SELECT id FROM ${table} WHERE encounter_id = $1`, [encounterId])).rowCount).toBe(0);
      }
      await client.query('ROLLBACK');
      for (const table of ['clinical_timeline', 'encounter_timeline']) {
        expect((await client.query(`SELECT id FROM ${table} WHERE encounter_id = $1`, [encounterId])).rowCount).toBe(4);
      }
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
  it('rejects parent cascades from real LOGIN roles and SET ROLE without rewriting evidence', async () => {
    const pool = getTestPool();
    const snapshot = async () => Promise.all(tables.map(async (table) =>
      (await pool.query(`SELECT * FROM ${table} WHERE account_id = $1 ORDER BY id`, [accountId])).rows
    ));
    const before = await snapshot();
    expect(before.every((rows) => rows.length > 0)).toBe(true);
    for (const role of roles) {
      const url = new URL(TEST_DB_URL);
      url.username = role;
      url.password = 'timeline-fixture-only';
      const runtime = new Client({ connectionString: url.toString() });
      await runtime.connect();
      try {
        await runtime.query("SELECT set_config('app.current_account_id', $1, false)", [accountId]);
        expect((await runtime.query('SELECT session_user, current_user')).rows[0]).toEqual({ session_user: role, current_user: role });
        for (const [parent, id] of [['medical_records', recordId], ['encounters', encounterId]]) {
          await runtime.query('BEGIN');
          try {
            await expect(runtime.query(`DELETE FROM ${parent} WHERE id = $1`, [id])).rejects.toMatchObject({ code: '42501', constraint: 'clinical_evidence_append_only' });
          } finally { await runtime.query('ROLLBACK'); }
          expect(await snapshot()).toEqual(before);
        }
        const delegated = await pool.connect();
        try {
          await delegated.query('BEGIN');
          await delegated.query(`SET LOCAL ROLE "${role}"`);
          await delegated.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
          await expect(delegated.query('DELETE FROM medical_records WHERE id = $1', [recordId])).rejects.toMatchObject({ code: '42501', constraint: 'clinical_evidence_append_only' });
        } finally { await delegated.query('ROLLBACK'); delegated.release(); }
        await expect(runtime.query("SELECT set_config('role', 'postgres', false)")).rejects.toMatchObject({ code: '42501' });
      } finally { await runtime.end(); }
    }
  });

  it('blocks all ancestor deletion attempts, SET NULL audit mutations and privileged TRUNCATE CASCADE', async () => {
    const pool = getTestPool();
    const edges = await pool.query(`WITH RECURSIVE ancestors AS (
      SELECT conrelid, confrelid, confdeltype FROM pg_constraint
      WHERE contype = 'f' AND conrelid IN ('clinical_timeline'::regclass, 'encounter_timeline'::regclass, 'audit_events'::regclass)
        AND confdeltype IN ('c', 'n', 'd')
      UNION
      SELECT fk.conrelid, fk.confrelid, fk.confdeltype FROM pg_constraint fk
      JOIN ancestors previous ON fk.conrelid = previous.confrelid
      WHERE fk.contype = 'f' AND fk.confdeltype IN ('c', 'n', 'd')
    ) SELECT conrelid::regclass::text AS child, confrelid::regclass::text AS parent, confdeltype AS action
      FROM ancestors ORDER BY child, parent`);
    process.stdout.write(`clinical evidence FK mutation chains ${JSON.stringify(edges.rows)}\n`);
    expect(new Set(edges.rows.map((row) => row.parent))).toEqual(new Set([
      'accounts', 'tenants', 'units', 'users', 'owners', 'patients', 'encounters', 'medical_records', 'clinical_entries'
    ]));
    const entryId = randomUUID();
    await pool.query(`INSERT INTO clinical_entries (id, account_id, medical_record_id, encounter_id, patient_id, author_user_id, entry_type, title, content, version, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'note', 'Original', 'Original', 1, now(), now())`, [entryId, accountId, recordId, encounterId, patientId, actorId]);
    await pool.query('UPDATE clinical_timeline SET clinical_entry_id = $1 WHERE account_id = $2', [entryId, accountId]);
    const evidenceBefore = await Promise.all(tables.map(async (table) =>
      (await pool.query(`SELECT * FROM ${table} WHERE account_id = $1 ORDER BY id`, [accountId])).rows
    ));
    const auditAccount = randomUUID();
    const auditActor = randomUUID();
    const auditId = randomUUID();
    await pool.query(`INSERT INTO accounts (id, tenant_id, slug, name) VALUES ($1, $2, $3, 'Audit cascade fixture')`, [auditAccount, tenantId, `audit-${suffix}`]);
    await pool.query(`INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active)
      VALUES ($1, $2, $3, $4, 'fixture', 'Audit actor', true)`, [auditActor, auditAccount, `audit-${suffix}`, `audit-${suffix}@example.test`]);
    await pool.query(`INSERT INTO audit_events (id, account_id, actor_user_id, action, entity_type, entity_id, occurred_at, created_at)
      VALUES ($1, $2, $3, 'original', 'fixture', $4, now(), now())`, [auditId, auditAccount, auditActor, auditId]);
    const auditBefore = (await pool.query('SELECT * FROM audit_events WHERE id = $1', [auditId])).rows;
    for (const role of roles) {
      // Defense in depth against a future broad grant: owner-context referential
      // actions must still respect the initiating runtime role.
      await pool.query(`GRANT SELECT, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public TO "${role}"`);
      const url = new URL(TEST_DB_URL); url.username = role; url.password = 'timeline-fixture-only';
      const runtime = new Client({ connectionString: url.toString() });
      await runtime.connect();
      try {
        await runtime.query("SELECT set_config('app.current_account_id', $1, false)", [accountId]);
        await runtime.query('BEGIN');
        try { await expect(runtime.query('DELETE FROM clinical_entries WHERE id = $1', [entryId])).rejects.toMatchObject({ code: '42501', constraint: 'clinical_evidence_append_only' }); }
        finally { await runtime.query('ROLLBACK'); }
        for (const [parent, id] of [['patients', patientId], ['owners', ownerId], ['accounts', accountId], ['tenants', tenantId]]) {
          await runtime.query('BEGIN');
          try {
            let code: string | undefined;
            try { await runtime.query(`DELETE FROM ${parent} WHERE id = $1`, [id]); }
            catch (error) { code = (error as { code: string }).code; }
            expect(['42501', '23503']).toContain(code);
          } finally { await runtime.query('ROLLBACK'); }
        }
        await runtime.query('BEGIN');
        try { await expect(runtime.query('TRUNCATE encounters CASCADE')).rejects.toMatchObject({ code: '42501' }); }
        finally { await runtime.query('ROLLBACK'); }
        await runtime.query("SELECT set_config('app.current_account_id', $1, false)", [auditAccount]);
        for (const [parent, id] of [['users', auditActor], ['accounts', auditAccount]]) {
          await runtime.query('BEGIN');
          try { await expect(runtime.query(`DELETE FROM ${parent} WHERE id = $1`, [id])).rejects.toMatchObject({ code: '42501', constraint: 'clinical_evidence_append_only' }); }
          finally { await runtime.query('ROLLBACK'); }
          expect((await pool.query('SELECT * FROM audit_events WHERE id = $1', [auditId])).rows).toEqual(auditBefore);
        }
      } finally { await runtime.end(); }
    }
    expect(await Promise.all(tables.map(async (table) =>
      (await pool.query(`SELECT * FROM ${table} WHERE account_id = $1 ORDER BY id`, [accountId])).rows
    ))).toEqual(evidenceBefore);
  });

  it('permits runtime draft deletion without evidence and ordinary clinical status updates', async () => {
    const pool = getTestPool();
    const draftPatient = randomUUID();
    const draftEncounter = randomUUID();
    const draftRecord = randomUUID();
    await pool.query(`INSERT INTO patients (id, account_id, owner_id, name, species) VALUES ($1, $2, $3, 'Draft', 'canine')`, [draftPatient, accountId, ownerId]);
    await pool.query(`INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
      VALUES ($1, $2, $3, $4, 'open', $5)`, [draftEncounter, accountId, draftPatient, ownerId, actorId]);
    await pool.query(`INSERT INTO medical_records (id, account_id, encounter_id, patient_id, status, version, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'open', 1, now(), now())`, [draftRecord, accountId, draftEncounter, draftPatient]);
    const client = await pool.connect();
    try {
      for (const role of roles) {
        await client.query('BEGIN');
        await client.query(`SET LOCAL ROLE "${role}"`);
        await client.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
        expect((await client.query("UPDATE medical_records SET status = 'completed' WHERE id = $1", [recordId])).rowCount).toBe(1);
        expect((await client.query('DELETE FROM medical_records WHERE id = $1', [draftRecord])).rowCount).toBe(1);
        expect((await client.query('DELETE FROM encounters WHERE id = $1', [draftEncounter])).rowCount).toBe(1);
        await client.query('ROLLBACK');
      }
    } finally { await client.query('ROLLBACK'); client.release(); }
  });

});
