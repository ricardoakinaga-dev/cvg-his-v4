import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@cvg-his/db';

import { createAlertsRepo } from './repo.js';

describe('alerts repo', () => {
  let accountId: string;
  let userId: string;
  let ownerId: string;
  let patientId: string;
  let wardId: string;
  let bedId: string;
  let stayId: string;
  let orderId: string;

  beforeEach(async () => {
    await db.$client.query('TRUNCATE alerts, medication_orders, inpatient_stays, beds, wards, patients, owners, users, accounts CASCADE');

    const accountRes = await db.$client.query(
      `insert into accounts (slug, name) values ('test-acc', 'Test Acc') returning id`
    );
    accountId = accountRes.rows[0].id;

    const userRes = await db.$client.query(
      `insert into users (account_id, email, password_hash, full_name)
       values ($1, 'test@example.com', 'hash', 'Test User') returning id`,
      [accountId]
    );
    userId = userRes.rows[0].id;

    const ownerRes = await db.$client.query(
      `insert into owners (account_id, full_name, phone_main)
       values ($1, 'Owner Teste', '11999999999') returning id`,
      [accountId]
    );
    ownerId = ownerRes.rows[0].id;

    const patientRes = await db.$client.query(
      `insert into patients (account_id, owner_id, name, species)
       values ($1, $2, 'Buddy', 'Dog') returning id`,
      [accountId, ownerId]
    );
    patientId = patientRes.rows[0].id;

    const wardRes = await db.$client.query(
      `insert into wards (account_id, name, code) values ($1, 'Internacao', 'INT') returning id`,
      [accountId]
    );
    wardId = wardRes.rows[0].id;

    const bedRes = await db.$client.query(
      `insert into beds (account_id, ward_id, name, code) values ($1, $2, 'Leito 1', 'L1') returning id`,
      [accountId, wardId]
    );
    bedId = bedRes.rows[0].id;

    const stayRes = await db.$client.query(
      `insert into inpatient_stays (account_id, patient_id, owner_id, ward_id, bed_id, status, admitted_at, admitted_by_user_id)
       values ($1, $2, $3, $4, $5, 'active', now(), $6) returning id`,
      [accountId, patientId, ownerId, wardId, bedId, userId]
    );
    stayId = stayRes.rows[0].id;

    const orderRes = await db.$client.query(
      `insert into medication_orders (account_id, patient_id, stay_id, medication_name, dose_value, dose_unit, route, frequency_type, start_at, created_by_user_id)
       values ($1, $2, $3, 'Aspirin', 10, 'mg', 'VO', 'q8h', now(), $4) returning id`,
      [accountId, patientId, stayId, userId]
    );
    orderId = orderRes.rows[0].id;
  });

  it('creates an active alert, updates it on conflict, but allows a new alert if the original is resolved', async () => {
    const repo = createAlertsRepo(db);
    const scheduledFor = new Date('2024-01-01T10:00:00Z');

    const a1 = await repo.create({
      accountId,
      type: 'medication_delay',
      stayId,
      orderId,
      scheduledFor,
      severity: 'low',
      message: 'Delay 30m'
    });

    expect(a1.status).toBe('active');
    expect(a1.severity).toBe('low');

    const a2 = await repo.create({
      accountId,
      type: 'medication_delay',
      stayId,
      orderId,
      scheduledFor,
      severity: 'high',
      message: 'Delay 120m'
    });

    expect(a2.id).toBe(a1.id);
    expect(a2.severity).toBe('high');
    expect(a2.updatedAt.getTime()).toBeGreaterThanOrEqual(a1.updatedAt.getTime());

    await db.$client.query(`update alerts set status = 'resolved' where id = $1`, [a1.id]);

    const a3 = await repo.create({
      accountId,
      type: 'medication_delay',
      stayId,
      orderId,
      scheduledFor,
      severity: 'low',
      message: 'New Delay 30m'
    });

    expect(a3.id).not.toBe(a1.id);
    expect(a3.status).toBe('active');
  });
});
