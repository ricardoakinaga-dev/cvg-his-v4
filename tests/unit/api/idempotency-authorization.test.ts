import { describe, expect, it } from 'vitest';

import {
  idempotencyAuthorizationPermissions,
  isMedicalRecordsMutationPath
} from '../../../apps/api/src/helpers/idempotency-authorization.js';

describe('idempotency authorization contract', () => {
  it('requires current clinical permissions before replaying critical commands', () => {
    expect(idempotencyAuthorizationPermissions('/medical-records/entries', 'POST')).toEqual([
      'medical-records.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/triage/triage-1', 'PATCH')).toEqual([
      'triage.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/encounters/encounter-1/exam-orders', 'POST'))
      .toEqual(['diagnostics.manage']);
    expect(idempotencyAuthorizationPermissions('/encounters/encounter-1/payments', 'POST'))
      .toEqual(['billing.manage']);
    expect(idempotencyAuthorizationPermissions('/payments/pix/intents', 'POST')).toEqual([
      'payments.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/sectors', 'POST')).toEqual(['inpatient.manage']);
    expect(idempotencyAuthorizationPermissions('/beds/bed-1', 'PATCH')).toEqual([
      'inpatient.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/access-control/teams', 'POST')).toEqual([
      'users.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/workflow-tasks', 'POST')).toEqual([
      'workflow-tasks.manage'
    ]);
    expect(idempotencyAuthorizationPermissions('/workflow-tasks/task-1/replay', 'POST')).toEqual([
      'workflow-tasks.replay'
    ]);
    expect(idempotencyAuthorizationPermissions('/workflow-tasks/task-1/complete', 'POST')).toEqual([
      'workflow-tasks.manage'
    ]);
  });

  it('does not add replay authorization to read-only routes and preserves existing mutation scope', () => {
    expect(idempotencyAuthorizationPermissions('/encounters/encounter-1', 'GET')).toBeUndefined();
    expect(idempotencyAuthorizationPermissions('/unmapped-command', 'POST')).toBeUndefined();
    expect(isMedicalRecordsMutationPath('/exam-results/result-1', 'PATCH')).toBe(true);
  });
});
