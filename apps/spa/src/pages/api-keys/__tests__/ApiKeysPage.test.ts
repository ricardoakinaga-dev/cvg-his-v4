import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockApiKeys = [
  {
    id: 'key-1',
    accountId: 'acc-1',
    name: 'Integração Financeira',
    keyPrefix: 'cvg_live_1a2b',
    keyHash: 'hash-1',
    permissions: ['integrations.read', 'payments.manage'],
    rateLimit: 120,
    rateLimitWindow: 3600,
    expiresAt: null,
    lastUsedAt: null,
    isActive: true,
    createdBy: 'user-1',
    createdAt: '2026-04-10T00:00:00Z',
    updatedAt: '2026-04-10T00:00:00Z'
  }
];

const mockPermissions = [
  {
    id: 'perm-1',
    code: 'integrations.read',
    module: 'integrations',
    description: 'Ler catálogo de integrações'
  },
  {
    id: 'perm-2',
    code: 'payments.manage',
    module: 'payments',
    description: 'Gerenciar pagamentos'
  }
];

const mockListKeys = vi.fn();
const mockCreateKey = vi.fn();
const mockListPermissions = vi.fn();

vi.mock('@/services/apiKeys', () => ({
  apiKeysService: {
    list: (...args: unknown[]) => mockListKeys(...args),
    create: (...args: unknown[]) => mockCreateKey(...args)
  }
}));

vi.mock('@/services/accessControl', () => ({
  accessControlService: {
    listPermissions: (...args: unknown[]) => mockListPermissions(...args)
  }
}));

describe('ApiKeysPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListKeys.mockResolvedValue(mockApiKeys);
    mockCreateKey.mockResolvedValue({
      apiKey: {
        id: 'key-2',
        accountId: 'acc-1',
        name: 'Nova Integração',
        keyPrefix: 'cvg_live_2b3c',
        permissions: ['integrations.read'],
        rateLimit: 60,
        rateLimitWindow: 3600,
        expiresAt: null,
        lastUsedAt: null,
        isActive: true,
        createdBy: 'user-1',
        createdAt: '2026-04-10T00:00:00Z',
        updatedAt: '2026-04-10T00:00:00Z'
      },
      rawKey: 'cvg_secret_new_key'
    });
    mockListPermissions.mockResolvedValue(mockPermissions);
  });

  it('renders existing api keys and creates a new one', async () => {
    const ApiKeysPage = (await import('../ApiKeysPage.vue')).default;
    const wrapper = mount(ApiKeysPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Chaves de API');
    expect(wrapper.text()).toContain('Integração Financeira');

    await wrapper.find('#api-key-name').setValue('Nova Integração');
    const checkbox = wrapper.find('input[type="checkbox"]');
    await checkbox.setValue(true);
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreateKey).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nova Integração',
        permissions: ['integrations.read']
      })
    );
    expect((wrapper.find('#api-key-secret').element as HTMLInputElement).value).toBe(
      'cvg_secret_new_key'
    );
  });
});
