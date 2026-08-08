import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockApiRequest = vi.fn();
const mockRouterPush = vi.fn();
const mockAuthStore = {
  pendingMfaUserId: 'user-123',
  pendingMfaChallengeId: 'challenge-123',
  mfaSetupRequired: false,
  setTokens: vi.fn(),
  clearMfaChallenge: vi.fn()
};

vi.mock('@/services/api', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush
  }),
  useRoute: () => ({
    query: { next: '/api-keys' }
  })
}));

describe('MfaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiRequest.mockReset();
    mockRouterPush.mockReset();
    mockAuthStore.mfaSetupRequired = false;
  });

  it('completes the MFA challenge and clears the pending state', async () => {
    mockApiRequest.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      principal: {
        user: { id: 'user-123', accountId: 'acc-1', username: 'admin' },
        access: { roleCodes: ['admin'], permissionCodes: [] },
        session: { sessionId: 'sess-1' }
      }
    });

    const MfaPage = (await import('../MfaPage.vue')).default;
    const wrapper = mount(MfaPage);

    await wrapper.find('#mfa-token').setValue('123456');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockApiRequest).toHaveBeenCalledWith(
      '/auth/login/mfa',
      expect.objectContaining({
        method: 'POST',
        skipAuth: true
      })
    );
    expect(mockAuthStore.setTokens).toHaveBeenCalledWith('access-token');
    expect(mockAuthStore.clearMfaChallenge).toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith('/api-keys');
  });

  it('enrolls and confirms MFA when the account has no active credential', async () => {
    mockAuthStore.mfaSetupRequired = true;
    mockApiRequest
      .mockResolvedValueOnce({
        secret: 'TOTPSECRET',
        provisioningUri: 'otpauth://totp/CVG:user',
        recoveryCodes: ['RECOVERY1', 'RECOVERY2']
      })
      .mockResolvedValueOnce({ accessToken: 'access-token', refreshToken: 'refresh-token' });

    const MfaPage = (await import('../MfaPage.vue')).default;
    const wrapper = mount(MfaPage);
    await flushPromises();

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      '/auth/mfa/enroll',
      expect.objectContaining({ method: 'POST', skipAuth: true })
    );
    await wrapper.find('#mfa-token').setValue('123456');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      '/auth/mfa/enroll/confirm',
      expect.objectContaining({ method: 'POST', skipAuth: true })
    );
    mockAuthStore.mfaSetupRequired = false;
  });
});
