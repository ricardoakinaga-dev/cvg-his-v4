import assert from 'node:assert/strict';
import test from 'node:test';

import { AuditService } from '@cvg-his-v2/module-audit';
import type { AccountId, AuditEventSummary } from '@cvg-his-v2/shared-types';

import { createVetusCacheRefresher } from './vetus-cache-recovery.js';

const ACCOUNT_ID = '00000000-0000-0000-0000-000000000001' as AccountId;

test('reconciles the audit cache together with Vetus participant caches', async () => {
  const committedEvents: AuditEventSummary[] = [];
  const audit = new AuditService({
    auditRepository: {
      async create(event) {
        committedEvents.push(event);
      },
      async list(accountId?: AccountId) {
        return committedEvents.filter((event) => !accountId || event.accountId === accountId);
      },
      async findById() {
        return null;
      }
    }
  });
  const phantom = audit.write({
    actorId: 'user-1',
    accountId: ACCOUNT_ID,
    module: 'vetus-imports',
    action: 'create_batch',
    entityType: 'vetus-import-batch',
    entityId: 'rolled-back-batch',
    payloadSummary: 'Rolled-back Vetus batch',
    riskLevel: 'high'
  });
  await audit.waitForPersistence();
  committedEvents.splice(0, committedEvents.length);

  const refresh = createVetusCacheRefresher({
    owners: { refreshFromDatabase: async () => undefined },
    patients: { refreshFromDatabase: async () => undefined },
    audit
  });

  await refresh(ACCOUNT_ID);

  assert.equal(audit.list().some((event) => event.eventId === phantom.eventId), false);
});

test('serializes refreshes for one account while allowing each completed refresh to win', async () => {
  let resolveFirst!: () => void;
  let firstStarted!: () => void;
  const firstGate = new Promise<void>((resolve) => {
    resolveFirst = resolve;
  });
  const started = new Promise<void>((resolve) => {
    firstStarted = resolve;
  });
  let ownerRefreshes = 0;

  const refresh = createVetusCacheRefresher({
    owners: {
      refreshFromDatabase: async () => {
        ownerRefreshes += 1;
        if (ownerRefreshes === 1) {
          firstStarted();
          await firstGate;
        }
      }
    },
    patients: { refreshFromDatabase: async () => undefined },
    audit: { refreshFromDatabase: async () => undefined }
  });

  const first = refresh(ACCOUNT_ID);
  await started;
  const second = refresh(ACCOUNT_ID);
  await Promise.resolve();
  assert.equal(ownerRefreshes, 1);

  resolveFirst();
  await Promise.all([first, second]);
  assert.equal(ownerRefreshes, 2);
});

test('does not release the account queue while a sibling refresh is still settling', async () => {
  let releasePatientRefresh!: () => void;
  let patientRefreshStarted!: () => void;
  let ownerRefreshFailed!: () => void;
  const patientRefreshGate = new Promise<void>((resolve) => {
    releasePatientRefresh = resolve;
  });
  const patientStarted = new Promise<void>((resolve) => {
    patientRefreshStarted = resolve;
  });
  const ownerFailed = new Promise<void>((resolve) => {
    ownerRefreshFailed = resolve;
  });
  let ownerRefreshes = 0;
  let patientRefreshes = 0;

  const refresh = createVetusCacheRefresher({
    owners: {
      refreshFromDatabase: async () => {
        ownerRefreshes += 1;
        if (ownerRefreshes === 1) {
          ownerRefreshFailed();
          throw new Error('owner refresh failed');
        }
      }
    },
    patients: {
      refreshFromDatabase: async () => {
        patientRefreshes += 1;
        if (patientRefreshes === 1) {
          patientRefreshStarted();
          await patientRefreshGate;
        }
      }
    },
    audit: { refreshFromDatabase: async () => undefined }
  });

  const firstResult = refresh(ACCOUNT_ID).then(
    () => null,
    (error: unknown) => error
  );
  await Promise.all([ownerFailed, patientStarted]);
  await new Promise<void>((resolve) => setImmediate(resolve));
  const second = refresh(ACCOUNT_ID);

  try {
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(patientRefreshes, 1);
  } finally {
    releasePatientRefresh();
  }

  const firstError = await firstResult;
  assert.ok(firstError instanceof Error);
  await second;
  assert.equal(ownerRefreshes, 2);
  assert.equal(patientRefreshes, 2);
});
