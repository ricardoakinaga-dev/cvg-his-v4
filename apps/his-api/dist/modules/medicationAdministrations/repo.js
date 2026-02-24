function mapStatus(value) {
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
function mapMedicationOrderStatus(value) {
    return String(value) === 'stopped' ? 'stopped' : 'active';
}
function mapAdministrationRow(row) {
    const effectiveAt = row.effective_at
        ? new Date(String(row.effective_at))
        : row.administered_at
            ? new Date(String(row.administered_at))
            : null;
    return {
        id: String(row.id),
        accountId: String(row.account_id),
        orderId: String(row.order_id),
        stayId: row.stay_id ? String(row.stay_id) : null,
        encounterId: row.encounter_id ? String(row.encounter_id) : null,
        scheduledFor: new Date(String(row.scheduled_for)),
        effectiveAt,
        delayedUntil: row.delayed_until ? new Date(String(row.delayed_until)) : null,
        administeredAt: effectiveAt,
        status: mapStatus(row.status),
        reason: row.reason ? String(row.reason) : null,
        administeredByUserId: String(row.administered_by_user_id),
        createdAt: new Date(String(row.created_at))
    };
}
function mapOrderRefRow(row) {
    return {
        id: String(row.id),
        accountId: String(row.account_id),
        patientId: String(row.patient_id),
        stayId: row.stay_id ? String(row.stay_id) : null,
        encounterId: row.encounter_id ? String(row.encounter_id) : null,
        status: mapMedicationOrderStatus(row.status)
    };
}
export function createMedicationAdministrationsRepo(db) {
    return {
        async findOrderInAccount(accountId, orderId) {
            const queryResult = await db.$client.query(`
          select
            id,
            account_id,
            patient_id,
            stay_id,
            encounter_id,
            status
          from medication_orders
          where id = $1 and account_id = $2
          limit 1
        `, [orderId, accountId]);
            if (queryResult.rows.length === 0) {
                return null;
            }
            return mapOrderRefRow(queryResult.rows[0]);
        },
        async findPatientInfo(accountId, patientId) {
            const queryResult = await db.$client.query(`
          select
            id,
            name,
            species
          from patients
          where id = $1 and account_id = $2
          limit 1
        `, [patientId, accountId]);
            if (queryResult.rows.length === 0) {
                return null;
            }
            const row = queryResult.rows[0];
            return {
                id: String(row.id),
                name: String(row.name),
                species: String(row.species)
            };
        },
        async create(input) {
            const queryResult = await db.$client.query(`
          insert into medication_administrations (
            account_id,
            order_id,
            stay_id,
            encounter_id,
            scheduled_for,
            effective_at,
            delayed_until,
            administered_at,
            status,
            reason,
            administered_by_user_id
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
          )
          returning *
        `, [
                input.accountId,
                input.orderId,
                input.stayId ?? null,
                input.encounterId ?? null,
                input.scheduledFor,
                input.effectiveAt ?? null,
                input.delayedUntil ?? null,
                input.effectiveAt ?? null,
                input.status,
                input.reason ?? null,
                input.administeredByUserId
            ]);
            return mapAdministrationRow(queryResult.rows[0]);
        },
        async list(input) {
            const whereParts = ['account_id = $1'];
            const values = [input.accountId];
            let index = 2;
            if (input.stayId) {
                whereParts.push(`stay_id = $${index}`);
                values.push(input.stayId);
                index += 1;
            }
            if (input.orderId) {
                whereParts.push(`order_id = $${index}`);
                values.push(input.orderId);
                index += 1;
            }
            const whereClause = whereParts.join(' and ');
            const offset = (input.page - 1) * input.pageSize;
            const [rowsResult, totalResult] = await Promise.all([
                db.$client.query(`
            select *
            from medication_administrations
            where ${whereClause}
            order by scheduled_for desc, created_at desc
            limit $${index} offset $${index + 1}
          `, [...values, input.pageSize, offset]),
                db.$client.query(`
            select count(*)::int as total
            from medication_administrations
            where ${whereClause}
          `, values)
            ]);
            return {
                data: rowsResult.rows.map((row) => mapAdministrationRow(row)),
                page: input.page,
                pageSize: input.pageSize,
                total: Number(totalResult.rows[0]?.total ?? 0)
            };
        }
    };
}
//# sourceMappingURL=repo.js.map