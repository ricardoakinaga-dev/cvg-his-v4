/**
 * R2-ARC-01 — replica topology guard.
 *
 * The API hydrates account data into per-process caches at boot (see
 * `runtime.ts`) and has no cross-replica invalidation yet (audit finding A1).
 * Until R2-ARC-03 ships read-through reads plus LISTEN/NOTIFY invalidation, a
 * deployment with more than one API replica serves stale or missing records.
 *
 * The Helm chart exports the intended topology as:
 *   - CVG_API_EXPECTED_REPLICAS   → `api.replicaCount`
 *   - CVG_API_CROSS_REPLICA_CACHE → "1" when `api.crossReplicaCache.enabled`
 *
 * The chart already fails closed at render time; this guard makes the process
 * refuse the same unsafe topology when values reach it through another path
 * (kubectl scale, a hand-written manifest, Compose).
 */

export const EXPECTED_REPLICAS_ENV = 'CVG_API_EXPECTED_REPLICAS';
export const CROSS_REPLICA_CACHE_ENV = 'CVG_API_CROSS_REPLICA_CACHE';

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);
const FALSY = new Set(['0', 'false', 'no', 'off', '']);

export interface ReplicaTopology {
  readonly expectedReplicas: number | null;
  readonly crossReplicaCacheEnabled: boolean;
}

export function parseReplicaTopology(
  environment: Readonly<Record<string, string | undefined>>
): ReplicaTopology {
  const rawReplicas = environment[EXPECTED_REPLICAS_ENV]?.trim();
  let expectedReplicas: number | null = null;
  if (rawReplicas !== undefined && rawReplicas !== '') {
    const parsed = Number(rawReplicas);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(
        `${EXPECTED_REPLICAS_ENV} must be a non-negative integer; received ${JSON.stringify(rawReplicas)}`
      );
    }
    expectedReplicas = parsed;
  }

  const rawCache = (environment[CROSS_REPLICA_CACHE_ENV] ?? '').trim().toLowerCase();
  if (!TRUTHY.has(rawCache) && !FALSY.has(rawCache)) {
    throw new Error(
      `${CROSS_REPLICA_CACHE_ENV} must be one of 1/0/true/false; received ${JSON.stringify(rawCache)}`
    );
  }

  return { expectedReplicas, crossReplicaCacheEnabled: TRUTHY.has(rawCache) };
}

export function findReplicaTopologyViolations(
  environment: Readonly<Record<string, string | undefined>>
): readonly string[] {
  const topology = parseReplicaTopology(environment);
  if (topology.expectedReplicas !== null && topology.expectedReplicas > 1 && !topology.crossReplicaCacheEnabled) {
    return [
      `${EXPECTED_REPLICAS_ENV}=${topology.expectedReplicas} is unsafe: the API keeps per-process account caches ` +
        `without cross-replica invalidation (R2-ARC-01). Run a single replica or set ` +
        `${CROSS_REPLICA_CACHE_ENV}=1 only after R2-ARC-03 read-through reads and LISTEN/NOTIFY invalidation ship.`
    ];
  }
  return [];
}

export function assertReplicaTopology(
  environment: Readonly<Record<string, string | undefined>> = process.env
): ReplicaTopology {
  const violations = findReplicaTopologyViolations(environment);
  if (violations.length > 0) {
    throw new Error(`replica topology guard rejected startup: ${violations.join('; ')}`);
  }
  return parseReplicaTopology(environment);
}
