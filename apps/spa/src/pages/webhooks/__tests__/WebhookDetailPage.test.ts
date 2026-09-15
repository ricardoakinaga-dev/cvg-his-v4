import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockRoute = { params: { id: 'webhook-1' } };
const mockWebhook = {
  id: 'webhook-1',
  accountId: 'account-1',
  url: 'https://hooks.example.test/cvg',
  events: ['billing.record.created'],
  isActive: true,
  createdAt: '2026-09-14T08:00:00.000Z',
  updatedAt: '2026-09-14T08:00:00.000Z'
};
const mockDelivery = {
  id: 'delivery-1',
  webhookId: 'webhook-1',
  event: 'billing.record.created',
  status: 'delivered' as const,
  attempts: 1,
  responseStatus: 200,
  responseBody: '{}',
  responseError: null,
  nextRetryAt: null,
  deadLetteredAt: null,
  lastAttemptAt: '2026-09-14T08:30:00.000Z',
  createdAt: '2026-09-14T08:30:00.000Z'
};

const mockGetById = vi.fn();
const mockGetDeliveries = vi.fn();
const mockTest = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/services/webhook', () => ({
  webhookService: {
    getById: (...args: unknown[]) => mockGetById(...args),
    getDeliveries: (...args: unknown[]) => mockGetDeliveries(...args),
    test: (...args: unknown[]) => mockTest(...args),
    update: (...args: unknown[]) => mockUpdate(...args)
  }
}));

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({ push: vi.fn() })
}));

describe('WebhookDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetById.mockResolvedValue(mockWebhook);
    mockGetDeliveries.mockResolvedValue([mockDelivery]);
    mockTest.mockResolvedValue({ success: true, statusCode: 200 });
    mockUpdate.mockResolvedValue({ ...mockWebhook, isActive: false });
  });

  it('mounts the real detail route and renders deliveries', async () => {
    const WebhookDetailPage = (await import('../WebhookDetailPage.vue')).default;
    const wrapper = mount(WebhookDetailPage);

    await flushPromises();

    expect(mockGetById).toHaveBeenCalledWith('webhook-1');
    expect(mockGetDeliveries).toHaveBeenCalledWith('webhook-1');
    expect(wrapper.text()).toContain('https://hooks.example.test/cvg');
    expect(wrapper.text()).toContain('billing.record.created');
    expect(wrapper.text()).toContain('100%');
  });

  it('executes the real delivery test action and exposes a load error', async () => {
    const WebhookDetailPage = (await import('../WebhookDetailPage.vue')).default;
    const wrapper = mount(WebhookDetailPage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Testar')!.trigger('click');
    await flushPromises();

    expect(mockTest).toHaveBeenCalledWith('webhook-1');
    expect(wrapper.text()).toContain('Teste enviado com sucesso');

    mockGetById.mockRejectedValueOnce(new Error('Falha ao carregar webhook'));
    const failedWrapper = mount(WebhookDetailPage);
    await flushPromises();
    expect(failedWrapper.text()).toContain('Falha ao carregar webhook');
  });
});
