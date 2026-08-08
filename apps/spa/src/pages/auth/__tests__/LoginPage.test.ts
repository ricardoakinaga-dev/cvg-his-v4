import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockApiRequest = vi.fn();
const mockRouterPush = vi.fn();
const mockRoute = { query: { next: '/notifications' } };
const mockAuthStore = {
  setTokens: vi.fn(),
  setMfaRequired: vi.fn(),
  setPendingMfaUserId: vi.fn(),
  setPendingMfaChallengeId: vi.fn(),
  setMfaSetupRequired: vi.fn(),
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
  useRoute: () => mockRoute
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiRequest.mockReset();
    mockRouterPush.mockReset();
  });

  it('redirects to MFA when backend requires a second factor', async () => {
    mockApiRequest.mockResolvedValue({
      requiresMfa: true,
      userId: 'user-123',
      mfaMethods: ['totp'],
      challengeId: 'challenge-123',
      enrollmentRequired: false
    });

    const LoginPage = (await import('../../LoginPage.vue')).default;
    const wrapper = mount(LoginPage);

    await wrapper.find('#email').setValue('admin');
    await wrapper.find('#password').setValue('secret');
    await wrapper.find('#account').setValue('account-123');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockApiRequest).toHaveBeenCalledWith(
      '/auth/login',
      expect.objectContaining({
        method: 'POST',
        skipAuth: true
      })
    );
    expect(JSON.parse(mockApiRequest.mock.calls[0][1].body)).toEqual({
      username: 'admin',
      password: 'secret',
      accountId: 'account-123'
    });
    expect(mockAuthStore.setPendingMfaUserId).toHaveBeenCalledWith('user-123');
    expect(mockAuthStore.setPendingMfaChallengeId).toHaveBeenCalledWith('challenge-123');
    expect(mockAuthStore.setMfaRequired).toHaveBeenCalledWith(true);
    expect(mockRouterPush).toHaveBeenCalledWith({
      path: '/auth/mfa',
      query: { next: '/notifications' }
    });
  });
});
