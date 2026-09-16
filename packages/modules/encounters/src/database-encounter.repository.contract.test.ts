import { beforeEach, expect, test, vi } from 'vitest';

import { encounters, encounterTimeline } from '@cvg-his-v2/shared-database';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';

import {
  DatabaseEncounterRepository,
  DatabaseEncounterTimelineRepository
} from './repositories/database-encounter.repository.js';

const accountId = '00000000-0000-4000-8000-000000000001';
const otherAccountId = '00000000-0000-4000-8000-000000000002';
const patientId = '00000000-0000-4000-8000-000000000003';
const ownerId = '00000000-0000-4000-8000-000000000004';
const encounterId = '00000000-0000-4000-8000-000000000005';
const userId = '00000000-0000-4000-8000-000000000006';
const timestamp = new Date('2026-09-16T12:00:00.000Z');

const execute = vi.fn();
const selectQueue: Array<readonly Record<string, unknown>[]> = [];
const deleted: unknown[] = [];

const encounterRow = {
  id: encounterId,
  accountId,
  ownerId,
  patientId,
  status: 'closed',
  openedByUserId: userId,
  closedByUserId: userId,
  openedAt: timestamp,
  closedAt: timestamp,
  closeReason: 'complete',
  reason: null,
  createdAt: timestamp,
  updatedAt: timestamp
};

const openEncounterRow = { ...encounterRow, status: 'open', closedAt: null, closeReason: null, reason: 'Pain' };

function makeDatabase(): DatabaseClient {
  const select = () => {
    let table: unknown;
    const builder = {
      from(nextTable: unknown) {
        table = nextTable;
        return builder;
      },
      where() {
        return builder;
      },
      orderBy() {
        return builder;
      },
      limit() {
        return builder;
      },
      then(resolve: (rows: readonly Record<string, unknown>[]) => unknown, reject: (reason: unknown) => unknown) {
        const fallback = table === encounters ? [openEncounterRow] : [];
        return Promise.resolve(selectQueue.shift() ?? fallback).then(resolve, reject);
      }
    };
    return builder;
  };
  return {
    execute,
    select: vi.fn(() => select()),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn(async (values: unknown) => {
        if (table === encounterTimeline) deleted.push(values);
      })
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => undefined)
      }))
    })),
    delete: vi.fn(() => ({
      where: vi.fn(async () => {
        deleted.push('delete');
      })
    }))
  } as unknown as DatabaseClient;
}

const tenant = {
  tenantId: accountId,
  accountId,
  correlationId: 'database-encounter-contract'
};

function summary(overrides: Record<string, unknown> = {}) {
  return {
    id: encounterId as never,
    accountId: accountId as never,
    patientId: patientId as never,
    ownerId: ownerId as never,
    visitType: 'walk_in' as const,
    origin: 'reception' as const,
    reason: 'Pain',
    status: 'reception' as const,
    openedAt: timestamp.toISOString(),
    createdByUserId: userId as never,
    updatedAt: timestamp.toISOString(),
    ...overrides
  };
}

beforeEach(() => {
  execute.mockReset();
  execute.mockResolvedValue({ rowCount: 1, rows: [] });
  selectQueue.length = 0;
  deleted.length = 0;
});
test('DatabaseEncounterRepository covers tenant guards, lifecycle writes and reads', async () => {
  const db = makeDatabase();
  const repository = new DatabaseEncounterRepository(db);
  await runWithTenantContext(tenant, async () => {
    await repository.create(summary());
    await repository.update(summary({ status: 'closed', closedAt: timestamp.toISOString(), closeReason: 'complete' }));
    await repository.updateForReopen(summary({ status: 'reception' }));

    selectQueue.push([]);
    expect(await repository.findById(encounterId as never)).toBeNull();
    selectQueue.push([encounterRow]);
    expect(await repository.findById(encounterId as never)).toMatchObject({
      id: encounterId,
      reason: '',
      status: 'closed',
      closedAt: timestamp.toISOString(),
      closeReason: 'complete'
    });
    selectQueue.push([]);
    expect(await repository.findActiveByPatientId(patientId as never)).toBeNull();
    selectQueue.push([openEncounterRow]);
    expect(await repository.findActiveByPatientId(patientId as never)).toMatchObject({
      reason: 'Pain',
      status: 'reception',
      closedAt: undefined
    });
    selectQueue.push([encounterRow]);
    expect(await repository.findAll(accountId as never)).toHaveLength(1);
    selectQueue.push([openEncounterRow]);
    expect(await repository.findActive(accountId as never)).toHaveLength(1);
    await repository.delete(encounterId as never);
  });

  await runWithTenantContext(tenant, async () => {
    await expect(repository.create(summary({ accountId: otherAccountId as never }))).rejects.toThrow(/tenant context/);
    await expect(repository.update(summary({ accountId: otherAccountId as never }))).rejects.toThrow(/tenant context/);
    await expect(repository.updateForReopen(summary({ accountId: otherAccountId as never }))).rejects.toThrow(/tenant context/);
    expect(await repository.findAll(otherAccountId as never)).toEqual([]);
    expect(await repository.findActive(otherAccountId as never)).toEqual([]);
  });
});

test('DatabaseEncounterRepository maps lifecycle conflicts and timeline persistence', async () => {
  const db = makeDatabase();
  const repository = new DatabaseEncounterRepository(db);
  const timelineRepository = new DatabaseEncounterTimelineRepository(db);
  const unique = Object.assign(new Error('duplicate'), {
    code: '23505',
    constraint: 'uidx_encounters_one_active_per_patient'
  });
  execute.mockRejectedValueOnce(unique);
  await runWithTenantContext(tenant, () => expect(repository.create(summary())).rejects.toThrow(/active encounter/));
  execute.mockResolvedValueOnce({ rowCount: 0, rows: [] });
  await runWithTenantContext(tenant, () => expect(repository.create(summary())).rejects.toThrow(/inactive owner/));
  execute.mockResolvedValueOnce({ rowCount: 0, rows: [] });
  await runWithTenantContext(tenant, () => expect(repository.updateForReopen(summary())).rejects.toThrow(/reopen/));

  await runWithTenantContext(tenant, async () => {
    await timelineRepository.create({
      id: '00000000-0000-4000-8000-000000000007' as never,
      accountId: accountId as never,
      encounterId: encounterId as never,
      eventType: 'encounter_opened',
      summary: 'opened',
      actorUserId: userId as never,
      occurredAt: timestamp.toISOString()
    });
    await expect(timelineRepository.create({
      id: '00000000-0000-4000-8000-000000000008' as never,
      accountId: otherAccountId as never,
      encounterId: encounterId as never,
      eventType: 'encounter_opened',
      summary: null,
      actorUserId: null,
      occurredAt: timestamp.toISOString()
    })).rejects.toThrow(/timeline account/);
    selectQueue.push([{
      id: '00000000-0000-4000-8000-000000000007',
      accountId,
      encounterId,
      occurredAt: timestamp,
      eventType: 'encounter_opened',
      summary: null,
      actorUserId: null
    }]);
    expect(await timelineRepository.findByEncounterId(encounterId as never)).toEqual([
      expect.objectContaining({ summary: '', actorUserId: 'system' })
    ]);
  });
});
