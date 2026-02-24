function mapBedMapRow(row) {
    return {
        bedId: String(row.bed_id),
        bedName: String(row.bed_name),
        bedCode: row.bed_code ? String(row.bed_code) : null,
        stayId: row.stay_id ? String(row.stay_id) : null,
        patientId: row.patient_id ? String(row.patient_id) : null,
        patientName: row.patient_name ? String(row.patient_name) : null,
        species: row.species ? String(row.species) : null,
        admittedAt: row.admitted_at ? new Date(String(row.admitted_at)) : null,
        reason: row.reason ? String(row.reason) : null
    };
}
export function createBedMapRepo(db) {
    return {
        async findWard(accountId, wardId) {
            const queryResult = await db.$client.query(`
          select id, name
          from wards
          where id = $1 and account_id = $2
          limit 1
        `, [wardId, accountId]);
            if (queryResult.rows.length === 0) {
                return null;
            }
            const row = queryResult.rows[0];
            return {
                id: String(row.id),
                name: String(row.name)
            };
        },
        async listBedMapRows(accountId, wardId) {
            const queryResult = await db.$client.query(`
          select
            b.id as bed_id,
            b.name as bed_name,
            b.code as bed_code,
            s.id as stay_id,
            s.patient_id as patient_id,
            p.name as patient_name,
            p.species as species,
            s.admitted_at as admitted_at,
            s.reason as reason
          from beds b
          left join inpatient_stays s
            on s.bed_id = b.id
            and s.account_id = b.account_id
            and s.status = 'active'
          left join patients p
            on p.id = s.patient_id
            and p.account_id = b.account_id
          where b.account_id = $1
            and b.ward_id = $2
            and b.is_active = true
          order by b.name asc, b.created_at asc
        `, [accountId, wardId]);
            return queryResult.rows.map((row) => mapBedMapRow(row));
        }
    };
}
//# sourceMappingURL=repo.js.map