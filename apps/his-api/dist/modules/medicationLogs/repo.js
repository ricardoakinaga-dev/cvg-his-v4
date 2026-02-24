function mapOrderStatus(value) {
    return String(value) === 'stopped' ? 'stopped' : 'active';
}
function mapAdministrationStatus(value) {
    const raw = String(value);
    if (raw === 'held') {
        return 'held';
    }
    if (raw === 'refused') {
        return 'refused';
    }
    if (raw === 'delayed') {
        return 'delayed';
    }
    return 'administered';
}
function mapOrderRow(row) {
    return {
        id: String(row.id),
        medicationName: String(row.medication_name),
        doseValue: String(row.dose_value),
        doseUnit: String(row.dose_unit),
        route: String(row.route),
        frequencyType: String(row.frequency_type),
        status: mapOrderStatus(row.status),
        nextDueAt: row.next_due_at ? new Date(String(row.next_due_at)) : null
    };
}
function mapAdministrationRow(row) {
    const effectiveAt = row.effective_at
        ? new Date(String(row.effective_at))
        : row.administered_at
            ? new Date(String(row.administered_at))
            : null;
    return {
        id: String(row.id),
        orderId: String(row.order_id),
        scheduledFor: new Date(String(row.scheduled_for)),
        status: mapAdministrationStatus(row.status),
        effectiveAt,
        delayedUntil: row.delayed_until ? new Date(String(row.delayed_until)) : null,
        administeredAt: effectiveAt,
        reason: row.reason ? String(row.reason) : null,
        byUserId: String(row.administered_by_user_id),
        createdAt: new Date(String(row.created_at))
    };
}
export function createMedicationLogsRepo(db) {
    return {
        async listActiveOrdersByStay(accountId, stayId) {
            const queryResult = await db.$client.query(`
          select
            mo.id,
            mo.medication_name,
            mo.dose_value,
            mo.dose_unit,
            mo.route,
            mo.frequency_type,
            mo.status,
            mos.next_due_at
          from medication_orders mo
          left join lateral (
            select next_due_at
            from medication_order_schedules inner_mos
            where inner_mos.account_id = mo.account_id
              and inner_mos.order_id = mo.id
            order by inner_mos.updated_at desc, inner_mos.created_at desc
            limit 1
          ) mos on true
          where mo.account_id = $1
            and mo.stay_id = $2
            and mo.status = 'active'
          order by mo.created_at desc
        `, [accountId, stayId]);
            return queryResult.rows.map((row) => mapOrderRow(row));
        },
        async listRecentAdministrationsByStay(accountId, stayId, limit) {
            const queryResult = await db.$client.query(`
          select
            id,
            order_id,
            scheduled_for,
            status,
            effective_at,
            delayed_until,
            administered_at,
            reason,
            administered_by_user_id,
            created_at
          from medication_administrations
          where account_id = $1
            and stay_id = $2
          order by scheduled_for desc, created_at desc
          limit $3
        `, [accountId, stayId, limit]);
            return queryResult.rows.map((row) => mapAdministrationRow(row));
        }
    };
}
//# sourceMappingURL=repo.js.map