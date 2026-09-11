import assert from 'node:assert/strict';

import test from 'node:test';

import { createClinicalOperationalMetricsProvider } from './clinical-operational-metrics.js';

const ACCOUNT_A = 'account-a';
const ACCOUNT_B = 'account-b';
const NOW = Date.parse('2026-09-11T12:00:00.000Z');

test('clinical operational metrics aggregate tenant caches without tenant labels', async () => {
  const provider = createClinicalOperationalMetricsProvider(
    {
      users: {
        list: () => [{ accountId: ACCOUNT_A }, { accountId: ACCOUNT_B }, { accountId: ACCOUNT_A }]
      },
      inpatient: {
        list: (accountId) =>
          accountId === ACCOUNT_A
            ? [{ status: 'admitted' }, { status: 'admitted' }]
            : [{ status: 'admitted' }]
      },
      encounters: {
        listActive: (accountId) => (accountId === ACCOUNT_A ? [{}, {}] : [{}])
      },
      workflowTasks: {
        list: async (accountId) =>
          accountId === ACCOUNT_A
            ? [
                { status: 'pending', dueAt: '2026-09-11T11:00:00.000Z' },
                { status: 'completed', dueAt: '2026-09-11T10:00:00.000Z' }
              ]
            : [{ status: 'retrying', dueAt: '2026-09-11T13:00:00.000Z' }]
      },
      prescriptionExecutions: {
        list: (accountId) =>
          accountId === ACCOUNT_A
            ? [
                { status: 'pending', scheduledAt: '2026-09-11T11:59:00.000Z' },
                { status: 'administered', scheduledAt: '2026-09-11T10:00:00.000Z' }
              ]
            : [{ status: 'pending', scheduledAt: '2026-09-11T13:00:00.000Z' }]
      },
      diagnostics: {
        list: (accountId) =>
          accountId === ACCOUNT_A
            ? [{ status: 'requested' }, { status: 'delivered' }]
            : [{ status: 'reported' }]
      },
      clinicalHandoffs: {
        list: (accountId) =>
          accountId === ACCOUNT_A
            ? [
                { handoffStatus: 'waiting_pending_resolution' },
                { handoffStatus: 'sent_to_finance' }
              ]
            : [{ handoffStatus: 'sent_to_reception' }]
      }
    },
    () => NOW
  );

  assert.deepEqual(await provider(), {
    activeInpatients: 3,
    openEncounters: 3,
    pendingWorkflowTasks: 2,
    overdueWorkflowTasks: 1,
    medicationOverdue: 1,
    pendingDiagnostics: 2,
    handoverPending: 2
  });
});

test('clinical operational metrics remain empty when no account identity is available', async () => {
  const provider = createClinicalOperationalMetricsProvider({
    users: { list: () => [] },
    inpatient: { list: () => [] },
    encounters: { listActive: () => [] },
    workflowTasks: { list: async () => [] },
    prescriptionExecutions: { list: () => [] },
    diagnostics: { list: () => [] },
    clinicalHandoffs: { list: () => [] }
  });

  assert.deepEqual(await provider(), {
    activeInpatients: 0,
    openEncounters: 0,
    pendingWorkflowTasks: 0,
    overdueWorkflowTasks: 0,
    medicationOverdue: 0,
    pendingDiagnostics: 0,
    handoverPending: 0
  });
});
