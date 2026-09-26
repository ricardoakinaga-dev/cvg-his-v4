import { describe, expect, it, vi } from 'vitest';

import type { AccountId } from '@cvg-his-v2/shared-types';

import { createVetusCacheRefresher } from '../../../apps/api/src/helpers/vetus-cache-recovery.ts';

const accountId = 'acct-1' as AccountId;

describe('createVetusCacheRefresher', () => {
  it('refreshes owners, patients and audit caches', async () => {
    const owners = { refreshFromDatabase: vi.fn(async () => undefined) };
    const patients = { refreshFromDatabase: vi.fn(async () => undefined) };
    const audit = { refreshFromDatabase: vi.fn(async () => undefined) };
    const refresh = createVetusCacheRefresher({ owners, patients, audit });

    await refresh(accountId);

    expect(owners.refreshFromDatabase).toHaveBeenCalledWith(accountId);
    expect(patients.refreshFromDatabase).toHaveBeenCalledWith(accountId);
    expect(audit.refreshFromDatabase).toHaveBeenCalledWith(accountId);
  });

  it('propagates the first rejection after allSettled settles', async () => {
    const owners = { refreshFromDatabase: vi.fn(async () => undefined) };
    const patients = {
      refreshFromDatabase: vi.fn(async () => {
        throw new Error('patients failed');
      })
    };
    const audit = { refreshFromDatabase: vi.fn(async () => undefined) };
    const refresh = createVetusCacheRefresher({ owners, patients, audit });

    await expect(refresh(accountId)).rejects.toThrow('patients failed');
    expect(owners.refreshFromDatabase).toHaveBeenCalled();
    expect(audit.refreshFromDatabase).toHaveBeenCalled();
  });

  it('serializes concurrent refreshes for the same account', async () => {
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const owners = {
      refreshFromDatabase: vi.fn(async () => {
        await firstGate;
      })
    };
    const patients = { refreshFromDatabase: vi.fn(async () => undefined) };
    const audit = { refreshFromDatabase: vi.fn(async () => undefined) };
    const refresh = createVetusCacheRefresher({ owners, patients, audit });

    const first = refresh(accountId);
    const second = refresh(accountId);
    releaseFirst?.();
    await Promise.all([first, second]);

    expect(owners.refreshFromDatabase).toHaveBeenCalledTimes(2);
  });
});
