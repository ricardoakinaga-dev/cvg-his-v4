function ensureActor(context) {
    const actor = context.actor;
    if (!actor?.accountId) {
        throw new Error('Actor context is required to use search.');
    }
    return actor;
}
function mapOwnerRow(row) {
    return {
        id: String(row.id),
        fullName: String(row.full_name),
        phoneMain: row.phone_main ? String(row.phone_main) : null,
        document: row.document ? String(row.document) : null
    };
}
function mapPatientRow(row) {
    return {
        id: String(row.id),
        name: String(row.name),
        species: String(row.species),
        ownerId: String(row.owner_id),
        microchip: row.microchip ? String(row.microchip) : null
    };
}
export function createSearchService(context) {
    return {
        async search(query) {
            const actor = ensureActor(context.requestContext);
            const prefix = `${query.q}%`;
            const contains = `%${query.q}%`;
            const offset = (query.page - 1) * query.pageSize;
            const [ownersResult, patientsResult] = await Promise.all([
                context.db.$client.query(`
            select id, full_name, phone_main, document
            from owners
            where account_id = $1
              and (
                full_name ilike $3
                or document ilike $3
                or phone_main ilike $3
              )
            order by
              case
                when full_name ilike $2 or document ilike $2 or phone_main ilike $2 then 0
                else 1
              end asc,
              full_name asc
            limit $4 offset $5
          `, [actor.accountId, prefix, contains, query.pageSize, offset]),
                context.db.$client.query(`
            select id, name, species, owner_id, microchip
            from patients
            where account_id = $1
              and (
                name ilike $3
                or microchip ilike $3
              )
            order by
              case
                when name ilike $2 or microchip ilike $2 then 0
                else 1
              end asc,
              name asc
            limit $4 offset $5
          `, [actor.accountId, prefix, contains, query.pageSize, offset])
            ]);
            return {
                q: query.q,
                owners: ownersResult.rows.map((row) => mapOwnerRow(row)),
                patients: patientsResult.rows.map((row) => mapPatientRow(row))
            };
        }
    };
}
//# sourceMappingURL=service.js.map