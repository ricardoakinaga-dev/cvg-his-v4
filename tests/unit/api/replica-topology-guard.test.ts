import { describe, expect, it } from 'vitest';

import {
  assertReplicaTopology,
  findReplicaTopologyViolations,
  parseReplicaTopology
} from '../../../apps/api/src/replica-topology-guard';

describe('replica topology guard (R2-ARC-01)', () => {
  it('accepts an unset topology (Compose, local runs)', () => {
    expect(findReplicaTopologyViolations({})).toEqual([]);
    expect(parseReplicaTopology({})).toEqual({ expectedReplicas: null, crossReplicaCacheEnabled: false });
  });

  it('accepts a single replica without cross-replica invalidation', () => {
    expect(
      findReplicaTopologyViolations({ CVG_API_EXPECTED_REPLICAS: '1', CVG_API_CROSS_REPLICA_CACHE: '0' })
    ).toEqual([]);
  });

  it('refuses more than one replica while the per-process cache has no invalidation', () => {
    const violations = findReplicaTopologyViolations({
      CVG_API_EXPECTED_REPLICAS: '3',
      CVG_API_CROSS_REPLICA_CACHE: '0'
    });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('R2-ARC-01');
    expect(() => assertReplicaTopology({ CVG_API_EXPECTED_REPLICAS: '2' })).toThrow(
      /replica topology guard rejected startup/
    );
  });

  it('allows multiple replicas only when cross-replica invalidation is explicitly enabled', () => {
    expect(
      findReplicaTopologyViolations({ CVG_API_EXPECTED_REPLICAS: '3', CVG_API_CROSS_REPLICA_CACHE: 'true' })
    ).toEqual([]);
    expect(assertReplicaTopology({ CVG_API_EXPECTED_REPLICAS: '3', CVG_API_CROSS_REPLICA_CACHE: '1' })).toEqual({
      expectedReplicas: 3,
      crossReplicaCacheEnabled: true
    });
  });

  it('rejects malformed values instead of guessing', () => {
    expect(() => parseReplicaTopology({ CVG_API_EXPECTED_REPLICAS: 'three' })).toThrow(/non-negative integer/);
    expect(() => parseReplicaTopology({ CVG_API_EXPECTED_REPLICAS: '-1' })).toThrow(/non-negative integer/);
    expect(() => parseReplicaTopology({ CVG_API_CROSS_REPLICA_CACHE: 'maybe' })).toThrow(/1\/0\/true\/false/);
  });
});
