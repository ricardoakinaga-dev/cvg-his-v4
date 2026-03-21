import { describe, expect, it } from 'vitest';

import { PERMISSIONS, permissionsForRole } from './index.js';

describe('hospital RBAC matrix', () => {
  it('keeps reception without detailed medical record access', () => {
    const permissions = permissionsForRole('recepcao');

    expect(permissions).toContain(PERMISSIONS.PATIENT_READ);
    expect(permissions).not.toContain(PERMISSIONS.MEDICAL_RECORD_READ);
    expect(permissions).not.toContain(PERMISSIONS.FINANCIAL_REPORTS_READ);
  });

  it('keeps veterinarian with clinical signing access but without strategic financial reports', () => {
    const permissions = permissionsForRole('veterinario');

    expect(permissions).toContain(PERMISSIONS.MEDICAL_RECORD_READ);
    expect(permissions).toContain(PERMISSIONS.MEDICAL_RECORD_SIGN);
    expect(permissions).toContain(PERMISSIONS.NOTE_SIGN);
    expect(permissions).not.toContain(PERMISSIONS.FINANCIAL_REPORTS_READ);
  });

  it('keeps finance without clinical record access', () => {
    const permissions = permissionsForRole('financeiro');

    expect(permissions).toContain(PERMISSIONS.FINANCIAL_ACCOUNT_READ);
    expect(permissions).toContain(PERMISSIONS.FINANCIAL_REPORTS_READ);
    expect(permissions).not.toContain(PERMISSIONS.MEDICAL_RECORD_READ);
    expect(permissions).not.toContain(PERMISSIONS.NOTE_SIGN);
  });

  it('keeps resident without final signature privileges', () => {
    const permissions = permissionsForRole('residente');

    expect(permissions).toContain(PERMISSIONS.MEDICAL_RECORD_WRITE);
    expect(permissions).not.toContain(PERMISSIONS.MEDICAL_RECORD_SIGN);
    expect(permissions).not.toContain(PERMISSIONS.NOTE_SIGN);
  });
});
