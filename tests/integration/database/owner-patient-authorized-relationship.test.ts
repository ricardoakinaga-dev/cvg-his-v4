import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getTestPool } from '../../db/db-admin.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

describe('owner-patient authorized relationship persistence', () => {
  const pool = getTestPool();
  const accountId = randomUUID();
  const ownerId = randomUUID();
  const patientId = randomUUID();

  beforeAll(async () => {
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name)
       VALUES ($1, $2, $3, 'Authorized relationship integration account')`,
      [accountId, TENANT_ID, `authorized-link-${accountId}`]
    );
    await pool.query(
      `INSERT INTO owners (id, account_id, full_name)
       VALUES ($1, $2, 'Authorized relationship owner')`,
      [ownerId, accountId]
    );
    await pool.query(
      `INSERT INTO patients (id, account_id, owner_id, name, species)
       VALUES ($1, $2, $3, 'Authorized relationship patient', 'canine')`,
      [patientId, accountId, ownerId]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id = $1', [accountId]);
  });

  it('persists authorized people and rejects unregistered relationship values', async () => {
    const linkId = `authorized_${randomUUID()}`;
    await pool.query(
      `INSERT INTO owner_patient_links (
         id, account_id, owner_id, patient_id, relationship, is_primary, financial_responsible
       ) VALUES ($1, $2, $3, $4, 'authorized', false, false)`,
      [linkId, accountId, ownerId, patientId]
    );

    const persisted = await pool.query(
      `SELECT relationship, is_primary, financial_responsible
       FROM owner_patient_links
       WHERE id = $1`,
      [linkId]
    );
    expect(persisted.rows).toEqual([
      { relationship: 'authorized', is_primary: false, financial_responsible: false }
    ]);

    await expect(
      pool.query(
        `INSERT INTO owner_patient_links (
           id, account_id, owner_id, patient_id, relationship, is_primary, financial_responsible
         ) VALUES ($1, $2, $3, $4, 'unknown_role', false, false)`,
        [`invalid_${randomUUID()}`, accountId, ownerId, patientId]
      )
    ).rejects.toThrow(/owner_patient_links_relationship_chk/);
  });
});
