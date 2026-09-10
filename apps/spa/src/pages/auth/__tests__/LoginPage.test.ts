import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const mockApiRequest = vi.fn();
const mockRouterPush = vi.fn();
const mockRouterReplace = vi.fn();
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
    push: mockRouterPush,
    replace: mockRouterReplace
  }),
  useRoute: () => mockRoute
}));

describe('LoginPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockApiRequest.mockReset();
    mockRouterPush.mockReset();
    mockRouterReplace.mockReset();
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

  it('uses the hospital logo poster and loop on the identity stage', async () => {
    const LoginPage = (await import('../../LoginPage.vue')).default;
    const wrapper = mount(LoginPage);

    expect(wrapper.get('.login-stage__media').attributes('data-visual-asset')).toBe('hospital-logo');
    expect(wrapper.get('.login-stage__poster').attributes('src')).toBe('/art/hospital-logo-poster.webp');
    expect(wrapper.get('.login-stage__video').attributes('src')).toBe('/art/hospital-logo-loop.mp4');
    expect(wrapper.get('.login-stage__video').attributes('poster')).toBe('/art/hospital-logo-poster.webp');
    expect(wrapper.get('.login-stage__video').attributes('preload')).toBe('metadata');
  });

  it('routes in the SPA after a successful login without reloading the document', async () => {
    mockApiRequest.mockResolvedValue({ accessToken: 'access-token' });

    const LoginPage = (await import('../../LoginPage.vue')).default;
    const wrapper = mount(LoginPage);

    await wrapper.find('#email').setValue('admin');
    await wrapper.find('#password').setValue('secret');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockAuthStore.setTokens).toHaveBeenCalledWith('access-token');
    expect(mockRouterReplace).toHaveBeenCalledWith('/notifications');
    expect(window.location.pathname).not.toBe('/notifications');
  });

  it('keeps the poster-only identity stage on constrained networks', async () => {
    const originalConnection = Object.getOwnPropertyDescriptor(window.navigator, 'connection');
    Object.defineProperty(window.navigator, 'connection', {
      configurable: true,
      value: {
        saveData: true,
        effectiveType: '4g',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
    });
    vi.resetModules();

    try {
      const LoginPage = (await import('../../LoginPage.vue')).default;
      const wrapper = mount(LoginPage);

      expect(wrapper.find('.login-stage__poster').exists()).toBe(true);
      expect(wrapper.find('.login-stage__video').exists()).toBe(false);
      expect(wrapper.find('button[aria-label="Reproduzir animação"]').exists()).toBe(false);
      expect(wrapper.get('.login-stage__interaction').attributes('disabled')).toBeDefined();
    } finally {
      if (originalConnection) Object.defineProperty(window.navigator, 'connection', originalConnection);
      else delete (window.navigator as Navigator & { connection?: unknown }).connection;
    }
  });

  it('localizes a rate-limit response and keeps the alert actionable', async () => {
    mockApiRequest.mockRejectedValue(
      Object.assign(new Error('Too many requests. Please try again later.'), {
        status: 429,
        body: { code: 'RATE_LIMIT_EXCEEDED' }
      })
    );

    const LoginPage = (await import('../../LoginPage.vue')).default;
    const wrapper = mount(LoginPage);

    await wrapper.find('#email').setValue('admin');
    await wrapper.find('#password').setValue('secret');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Muitas tentativas de acesso. Aguarde um instante e tente novamente.');
    expect(wrapper.text()).not.toContain('Too many requests');
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });

  it('localizes a network failure without exposing the browser message', async () => {
    mockApiRequest.mockRejectedValue(new TypeError('Failed to fetch'));

    const LoginPage = (await import('../../LoginPage.vue')).default;
    const wrapper = mount(LoginPage);

    await wrapper.find('#email').setValue('admin');
    await wrapper.find('#password').setValue('secret');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Não foi possível conectar ao serviço de acesso. Verifique a conexão e tente novamente.');
    expect(wrapper.text()).not.toContain('Failed to fetch');
  });
});
