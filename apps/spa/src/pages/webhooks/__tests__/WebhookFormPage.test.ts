import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockPush = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRoute = { params: {}, path: '/webhooks/new' };

vi.mock('@/services/webhook', () => ({
  webhookService: {
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    getById: vi.fn()
  }
}));

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({ push: mockPush })
}));

describe('WebhookFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute.params = {};
    mockRoute.path = '/webhooks/new';
    mockCreate.mockResolvedValue({ id: 'webhook-created' });
    mockUpdate.mockResolvedValue({ id: 'webhook-updated' });
  });

  it('mounts the real new-webhook form and rejects an empty submission', async () => {
    const WebhookFormPage = (await import('../WebhookFormPage.vue')).default;
    const wrapper = mount(WebhookFormPage);

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('URL é obrigatória');
    expect(wrapper.text()).toContain('Selecione pelo menos um evento');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('submits the real form after selecting an event', async () => {
    const WebhookFormPage = (await import('../WebhookFormPage.vue')).default;
    const wrapper = mount(WebhookFormPage);

    await wrapper.get('#url').setValue('https://hooks.example.test/cvg');
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreate).toHaveBeenCalledWith({
      url: 'https://hooks.example.test/cvg',
      events: ['billing.record.created'],
      secret: undefined
    });
  });
});
