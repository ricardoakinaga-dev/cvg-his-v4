import { createBedMapRepo } from './repo.js';
function ensureActor(context) {
    const actor = context.actor;
    if (!actor?.accountId) {
        throw new Error('Actor context is required to access bed map.');
    }
    return actor;
}
export function createBedMapService(context) {
    const repo = createBedMapRepo(context.db);
    return {
        async getByWardId(wardId) {
            const actor = ensureActor(context.requestContext);
            const ward = await repo.findWard(actor.accountId, wardId);
            if (!ward) {
                return { kind: 'ward_not_found' };
            }
            const rows = await repo.listBedMapRows(actor.accountId, wardId);
            return {
                kind: 'ok',
                map: {
                    ward,
                    beds: rows.map((row) => {
                        const stay = row.stayId && row.patientId && row.admittedAt
                            ? {
                                id: row.stayId,
                                patientId: row.patientId,
                                patientName: row.patientName,
                                species: row.species,
                                admittedAt: row.admittedAt.toISOString(),
                                reason: row.reason
                            }
                            : null;
                        return {
                            bed: {
                                id: row.bedId,
                                name: row.bedName,
                                code: row.bedCode
                            },
                            status: stay ? 'occupied' : 'free',
                            stay
                        };
                    })
                }
            };
        }
    };
}
//# sourceMappingURL=service.js.map