import type { RequestContext } from '../../plugins/requestContext.js';
import { createBedMapRepo } from './repo.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type BedMapResult =
  | {
      kind: 'ward_not_found';
    }
  | {
      kind: 'ok';
      map: {
        ward: {
          id: string;
          name: string;
        };
        beds: Array<{
          bed: {
            id: string;
            name: string;
            code: string | null;
          };
          status: 'free' | 'occupied';
          stay: null | {
            id: string;
            patientId: string;
            patientName: string | null;
            species: string | null;
            admittedAt: string;
            reason: string | null;
          };
        }>;
      };
    };

function ensureActor(context: RequestContext) {
  const actor = context.actor;

  if (!actor?.accountId) {
    throw new Error('Actor context is required to access bed map.');
  }

  return actor;
}

export function createBedMapService(context: ServiceContext) {
  const repo = createBedMapRepo(context.db);

  return {
    async getByWardId(wardId: string): Promise<BedMapResult> {
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
            const stay =
              row.stayId && row.patientId && row.admittedAt
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
