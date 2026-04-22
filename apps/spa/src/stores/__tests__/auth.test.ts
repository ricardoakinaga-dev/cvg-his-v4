import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useAuthStore } from '../auth';

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('persists and clears the pending MFA user id through state and actions', () => {
    const auth = useAuthStore();

    expect(auth.pendingMfaUserId).toBeNull();

    auth.setPendingMfaUserId('user-123');
    expect(auth.pendingMfaUserId).toBe('user-123');

    auth.clearMfaChallenge();
    expect(auth.pendingMfaUserId).toBeNull();
    expect(auth.needsMfa).toBe(false);
  });
});
