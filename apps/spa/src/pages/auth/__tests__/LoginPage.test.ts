import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockApiRequest = vi.fn();
const mockRouterPush = vi.fn();
const mockRoute = { query: { next: '/notifications' } };
const mockAuthStore = {
  setTokens: vi.fn(),
  setMfaRequired: vi.fn(),
  setPendingMfaUserId: vi.fn(),
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
      mfaMethods: ['totp']
    });

    const LoginPage = (await import('../../LoginPage.vue')).default;
    const wrapper = mount(LoginPage);

    await wrapper.find('#email').setValue('admin');
    await wrapper.find('#password').setValue('secret');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockApiRequest).toHaveBeenCalledWith(
      '/auth/login',
      expect.objectContaining({
        method: 'POST',
        skipAuth: true
      })
    );
    expect(mockAuthStore.setPendingMfaUserId).toHaveBeenCalledWith('user-123');
    expect(mockAuthStore.setMfaRequired).toHaveBeenCalledWith(true);
    expect(mockRouterPush).toHaveBeenCalledWith({
      path: '/auth/mfa',
      query: { next: '/notifications' }
    });
  });
});
