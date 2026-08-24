import assert from 'node:assert/strict';
import { expect, test } from 'vitest';

import { ConflictError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import {
  CommissionsService,
  type CommissionBillingItemAuthorityRecord,
  type CommissionSourceLineInput,
  type CommissionStaffAuthorityRecord
} from './index.js';

const ACCOUNT = 'acc-commission-authority' as AccountId;
const OTHER_ACCOUNT = 'acc-commission-authority-other' as AccountId;
const USER = 'user-commission-authority' as UserId;

const authoritativeStaff: CommissionStaffAuthorityRecord = {
  id: 'staff-authoritative',
  accountId: ACCOUNT,
  fullName: 'Dra. Fonte Oficial',
  department: 'Clínica',
  jobTitle: 'Médica Veterinária',
  isActive: true,
  professionId: 'profession-veterinary',
  professionName: 'Medicina Veterinária',
  professionIsActive: true
};

const settledBillingItem: CommissionBillingItemAuthorityRecord = {
  id: 'billing-item-authoritative',
  accountId: ACCOUNT,
  status: 'settled',
  itemKind: 'service',
  description: 'Consulta oficial',
  baseAmount: 200,
  occurredAt: '2026-05-10'
};

function authorityFor(
  staff: CommissionStaffAuthorityRecord = authoritativeStaff,
  billingItem: CommissionBillingItemAuthorityRecord = settledBillingItem
): Record<string, unknown> {
  return {
    findStaff: async (accountId: AccountId, staffId: string) =>
      accountId === staff.accountId && staffId === staff.id ? staff : null,
    findBillingItem: async (accountId: AccountId, billingItemId: string) =>
      accountId === billingItem.accountId && billingItemId === billingItem.id ? billingItem : null
  };
}

function sourceLine(overrides: Partial<CommissionSourceLineInput> = {}): CommissionSourceLineInput {
  return {
    staffId: authoritativeStaff.id,
    staffName: 'Nome forjado pelo cliente',
    department: 'Departamento forjado',
    jobTitle: 'Cargo forjado',
    itemKind: 'product',
    sourceType: 'billing_item',
    sourceId: settledBillingItem.id,
    sourceDescription: 'Descrição forjada',
    baseAmount: 1,
    occurredAt: '2026-05-01',
    ...overrides
  };
}

test('resolves staff, profession and billing values from the authoritative tenant source', async () => {
  const service = new CommissionsService({ sourceAuthority: authorityFor() } as never);
  await service.createRule(ACCOUNT, USER, {
    description: 'Comissão clínica',
    itemKind: 'service',
    percentage: 10
  });

  const calculation = await service.calculate(ACCOUNT, USER, {
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    lines: [sourceLine()]
  });

  expect(calculation.lines[0]).toEqual(expect.objectContaining({
    staffId: authoritativeStaff.id,
    staffName: authoritativeStaff.fullName,
    department: authoritativeStaff.department,
    jobTitle: authoritativeStaff.jobTitle,
    itemKind: settledBillingItem.itemKind,
    sourceDescription: settledBillingItem.description,
    baseAmount: settledBillingItem.baseAmount,
    occurredAt: settledBillingItem.occurredAt,
    commissionAmount: 20
  }));
});

test('rejects inactive staff, inactive profession and cross-tenant authority records', async () => {
  const inactiveStaffService = new CommissionsService({
    sourceAuthority: authorityFor({ ...authoritativeStaff, isActive: false })
  } as never);
  await assert.rejects(
    () => inactiveStaffService.calculate(ACCOUNT, USER, {
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      lines: [sourceLine()]
    }),
    /staff.*active/i
  );

  const inactiveProfessionService = new CommissionsService({
    sourceAuthority: authorityFor({ ...authoritativeStaff, professionIsActive: false })
  } as never);
  await assert.rejects(
    () => inactiveProfessionService.calculate(ACCOUNT, USER, {
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      lines: [sourceLine()]
    }),
    /profession.*active/i
  );

  const missingProfessionService = new CommissionsService({
    sourceAuthority: authorityFor({
      ...authoritativeStaff,
      professionId: null,
      professionName: null,
      professionIsActive: null
    })
  } as never);
  await assert.rejects(
    () => missingProfessionService.calculate(ACCOUNT, USER, {
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      lines: [sourceLine()]
    }),
    /profession.*required/i
  );

  const crossTenantService = new CommissionsService({
    sourceAuthority: authorityFor({ ...authoritativeStaff, accountId: OTHER_ACCOUNT })
  } as never);
  await assert.rejects(
    () => crossTenantService.calculate(ACCOUNT, USER, {
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      lines: [sourceLine()]
    }),
    /authoritative|tenant|staff/i
  );
});

test('requires a settled billing source and rejects forged source values', async () => {
  const service = new CommissionsService({
    sourceAuthority: authorityFor(authoritativeStaff, { ...settledBillingItem, status: 'open' })
  } as never);

  await assert.rejects(
    () => service.calculate(ACCOUNT, USER, {
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      lines: [sourceLine()]
    }),
    /settled|liquidat/i
  );
});

test('rejects a billing item that was already used by another calculation', async () => {
  const service = new CommissionsService({ sourceAuthority: authorityFor() } as never);
  await service.createRule(ACCOUNT, USER, {
    description: 'Comissão clínica',
    itemKind: 'service',
    percentage: 10
  });

  const input = {
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    lines: [sourceLine()]
  };
  await service.calculate(ACCOUNT, USER, input);

  await assert.rejects(
    () => service.calculate(ACCOUNT, USER, input),
    ConflictError
  );
});

test('does not mark a reviewed calculation paid without a payable gateway', async () => {
  const service = new CommissionsService({ sourceAuthority: authorityFor() } as never);
  await service.createRule(ACCOUNT, USER, {
    description: 'Comissão clínica',
    itemKind: 'service',
    percentage: 10
  });
  const calculation = await service.calculate(ACCOUNT, USER, {
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    lines: [sourceLine()]
  });
  await service.review(ACCOUNT, calculation.id, USER);

  await assert.rejects(
    () => service.markPaid(ACCOUNT, calculation.id, USER, { paymentMethod: 'pix' }),
    ValidationError
  );
});
