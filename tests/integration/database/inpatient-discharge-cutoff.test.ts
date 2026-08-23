import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getTestPool } from '../../db/db-admin.js';

const tenantId = randomUUID();
const accountId = randomUUID();
const userId = randomUUID();
const ownerId = randomUUID();
const patientId = randomUUID();
const encounterId = randomUUID();
const stayId = randomUUID();
const inventoryItemId = `inpatient-cutoff-item-${randomUUID()}`;

async function insertProgress(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO inpatient_progress (
       id, account_id, stay_id, encounter_id, note, authored_by_user_id
     ) VALUES ($1, $2, $3, $4, 'Evolucao pos-alta indevida', $5)`,
    [randomUUID(), accountId, stayId, encounterId, userId]
  );
}

async function insertOccurrence(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO inpatient_occurrences (
       id, account_id, stay_id, encounter_id, type, severity, title, description,
       authored_by_user_id, created_at
     ) VALUES ($1, $2, $3, $4, 'clinical', 'info', 'Ocorrencia pos-alta',
       'Registro pos-alta indevido', $5, clock_timestamp())`,
    [randomUUID(), accountId, stayId, encounterId, userId]
  );
}

async function insertDailyCharge(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO inpatient_daily_charges (
       id, account_id, stay_id, encounter_id, patient_id, description, charge_date,
       quantity, unit_amount, total_amount, status, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, 'Diaria pos-alta', CURRENT_DATE, 1, 100, 100,
       'pending', $6, clock_timestamp(), clock_timestamp())`,
    [randomUUID(), accountId, stayId, encounterId, patientId, userId]
  );
}

async function insertPostDischargeInventoryConsumption(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO inventory_consumptions (
       id, account_id, inventory_item_id, encounter_id, patient_id, quantity, unit,
       cost_amount, source_entity_type, source_entity_id, recorded_by_user_id
     ) VALUES ($1, $2, $3, $4, $5, 1, 'unit', 25, 'inpatient_stay', $6, $7)`,
    [
      `inpatient-cutoff-consumption-${randomUUID()}`,
      accountId,
      inventoryItemId,
      encounterId,
      patientId,
      stayId,
      userId
    ]
  );
}

beforeAll(async () => {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status)
     VALUES ($1, $2, 'Inpatient cutoff tenant', 'active')`,
    [tenantId, `inpatient-cutoff-${tenantId}`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, 'Inpatient cutoff account')`,
    [accountId, tenantId, `inpatient-cutoff-${accountId}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', 'Inpatient cutoff operator')`,
    [userId, accountId, `inpatient_cutoff_${userId}`, `inpatient-cutoff-${userId}@example.test`]
  );
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES ($1, $2, 'Inpatient cutoff owner')`,
    [ownerId, accountId]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Inpatient cutoff patient', 'canine')`,
    [patientId, accountId, ownerId]
  );
  await pool.query(
    `INSERT INTO inventory_items (
       id, account_id, sku, name, unit, on_hand_quantity, unit_cost_amount
     ) VALUES ($1, $2, $3, 'Post-discharge test item', 'unit', 10, 25)`,
    [inventoryItemId, accountId, `inpcut-${inventoryItemId.slice(-12)}`]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
     VALUES ($1, $2, $3, $4, 'open', $5)`,
    [encounterId, accountId, patientId, ownerId, userId]
  );
  await pool.query(
    `INSERT INTO inpatient_stays (
       id, account_id, patient_id, owner_id, encounter_id, status, unit, ward, bed,
       admitted_by_user_id, discharged_at, discharge_reason
     ) VALUES ($1, $2, $3, $4, $5, 'discharged', 'Internacao', 'Ala A', 'A-01',
       $6, clock_timestamp(), 'Alta clinica')`,
    [stayId, accountId, patientId, ownerId, encounterId, userId]
  );
});

afterAll(async () => {
  const pool = getTestPool();
  await pool.query('DELETE FROM inventory_consumptions WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM inventory_items WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM inpatient_daily_charges WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM inpatient_occurrences WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM inpatient_progress WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM inpatient_stays WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM encounters WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM patients WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM owners WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM users WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM accounts WHERE id = $1', [accountId]);
  await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
});

describe('inpatient discharge cutoff', () => {
  it('rejects progress, occurrences and new daily charges after discharge', async () => {
    await expect(insertProgress()).rejects.toThrow(/after discharge/i);
    await expect(insertOccurrence()).rejects.toThrow(/after discharge/i);
    await expect(insertDailyCharge()).rejects.toThrow(/after discharge/i);
  });

  it('rejects inpatient-stay inventory consumption after discharge', async () => {
    await expect(insertPostDischargeInventoryConsumption()).rejects.toThrow(/after discharge/i);
  });
});
