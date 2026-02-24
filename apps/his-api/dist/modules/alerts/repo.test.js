import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@cvg-his/db';
import { createAlertsRepo } from './repo';
describe('alerts repo', () => {
    let accountId;
    let stayId;
    let orderId;
    let patientId;
    beforeEach(async () => {
        // Clear all previous test data
        await db.$client.query('TRUNCATE alerts, medication_orders, inpatient_stays, patients, accounts CASCADE');
        // Create requisite data
        const accountRes = await db.$client.query(`insert into accounts (name, business_name, document_type, document_value, created_by_user_id) 
             values ('Test Acc', 'Test Biz', 'CNPJ', '111', 'usr-1') returning id`);
        accountId = accountRes.rows[0].id;
        const patientRes = await db.$client.query(`insert into patients (account_id, owner_id, name, species) 
             values ($1, '00000000-0000-0000-0000-000000000000', 'Buddy', 'Dog') returning id`, [accountId]);
        patientId = patientRes.rows[0].id;
        const stayRes = await db.$client.query(`insert into inpatient_stays (account_id, patient_id, owner_id, ward_id, bed_id, status, admitted_at, admitted_by_user_id) 
             values ($1, $2, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'active', now(), 'usr-1') returning id`, [accountId, patientId]);
        stayId = stayRes.rows[0].id;
        const orderRes = await db.$client.query(`insert into medication_orders (account_id, patient_id, stay_id, medication_name, dose_value, dose_unit, route, frequency_type, start_at, created_by_user_id) 
             values ($1, $2, $3, 'Aspirin', 10, 'mg', 'VO', 'q8h', now(), 'usr-1') returning id`, [accountId, patientId, stayId]);
        orderId = orderRes.rows[0].id;
    });
    it('creates an active alert, updates it on conflict, but allows a new alert if the original is resolved', async () => {
        const repo = createAlertsRepo(db);
        const scheduledFor = new Date('2024-01-01T10:00:00Z');
        // 1. Create first alert
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
        // 2. Insert same alert, it should UPDATE
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
        // 3. Mark alert as resolved
        await db.$client.query(`update alerts set status = 'resolved' where id = $1`, [a1.id]);
        // 4. Create another one. This should generate a NEW alert ID because the previous was resolved
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
//# sourceMappingURL=repo.test.js.map