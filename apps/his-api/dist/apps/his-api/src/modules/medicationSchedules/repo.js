function mapOrderStatus(value) {
    return String(value) === 'stopped' ? 'stopped' : 'active';
}
function mapScheduleType(value) {
    return String(value) === 'fixed_times' ? 'fixed_times' : 'interval';
}
function mapTimes(value) {
    if (!Array.isArray(value)) {
        return null;
    }
    return value.filter((item) => typeof item === 'string');
}
function mapOrderRow(row) {
    return {
        id: String(row.id),
        accountId: String(row.account_id),
        stayId: row.stay_id ? String(row.stay_id) : null,
        wardId: row.ward_id ? String(row.ward_id) : null,
        encounterId: row.encounter_id ? String(row.encounter_id) : null,
        patientId: String(row.patient_id),
        status: mapOrderStatus(row.status),
        startAt: new Date(String(row.start_at)),
        endAt: row.end_at ? new Date(String(row.end_at)) : null
    };
}
function mapScheduleRow(row) {
    return {
        id: String(row.id),
        accountId: String(row.account_id),
        orderId: String(row.order_id),
        scheduleType: mapScheduleType(row.schedule_type),
        intervalMinutes: row.interval_minutes === null || row.interval_minutes === undefined
            ? null
            : Number(row.interval_minutes),
        times: mapTimes(row.times_json),
        nextDueAt: row.next_due_at ? new Date(String(row.next_due_at)) : null,
        createdAt: new Date(String(row.created_at)),
        updatedAt: new Date(String(row.updated_at))
    };
}
export function createMedicationSchedulesRepo(db) {
    return {
        async findOrderInAccount(accountId, orderId) {
            const queryResult = await db.$client.query(`
          select
            mo.id,
            mo.account_id,
            mo.stay_id,
            ist.ward_id,
            mo.encounter_id,
            mo.patient_id,
            mo.status,
            mo.start_at,
            mo.end_at
          from medication_orders mo
          left join inpatient_stays ist
            on ist.id = mo.stay_id
           and ist.account_id = mo.account_id
          where mo.id = $1 and mo.account_id = $2
          limit 1
        `, [orderId, accountId]);
            if (queryResult.rows.length === 0) {
                return null;
            }
            return mapOrderRow(queryResult.rows[0]);
        },
        async findScheduleByOrderId(accountId, orderId) {
            const queryResult = await db.$client.query(`
          select *
          from medication_order_schedules
          where account_id = $1 and order_id = $2
          limit 1
        `, [accountId, orderId]);
            if (queryResult.rows.length === 0) {
                return null;
            }
            return mapScheduleRow(queryResult.rows[0]);
        },
        async findLastScheduledFor(accountId, orderId) {
            const queryResult = await db.$client.query(`
          select max(scheduled_for) as last_scheduled_for
          from medication_administrations
          where account_id = $1 and order_id = $2
        `, [accountId, orderId]);
            const row = queryResult.rows[0];
            const value = row?.last_scheduled_for;
            return value ? new Date(String(value)) : null;
        },
        async createSchedule(input) {
            const timesJson = input.scheduleType === 'fixed_times' ? input.times ?? null : null;
            const intervalMinutes = input.scheduleType === 'interval' ? input.intervalMinutes ?? null : null;
            const queryResult = await db.$client.query(`
          insert into medication_order_schedules (
            account_id,
            order_id,
            schedule_type,
            interval_minutes,
            times_json,
            next_due_at
          ) values ($1, $2, $3, $4, $5, $6)
          returning *
        `, [
                input.accountId,
                input.orderId,
                input.scheduleType,
                intervalMinutes,
                timesJson,
                input.nextDueAt
            ]);
            return mapScheduleRow(queryResult.rows[0]);
        },
        async updateScheduleByOrderId(input) {
            const timesJson = input.scheduleType === 'fixed_times' ? input.times ?? null : null;
            const intervalMinutes = input.scheduleType === 'interval' ? input.intervalMinutes ?? null : null;
            const queryResult = await db.$client.query(`
          update medication_order_schedules
          set
            schedule_type = $1,
            interval_minutes = $2,
            times_json = $3,
            next_due_at = $4,
            updated_at = now()
          where account_id = $5 and order_id = $6
          returning *
        `, [input.scheduleType, intervalMinutes, timesJson, input.nextDueAt, input.accountId, input.orderId]);
            if (queryResult.rows.length === 0) {
                return null;
            }
            return mapScheduleRow(queryResult.rows[0]);
        }
    };
}
//# sourceMappingURL=repo.js.map