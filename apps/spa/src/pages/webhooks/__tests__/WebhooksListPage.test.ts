import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import WebhooksListPage from '@/pages/webhooks/WebhooksListPage.vue';
import { webhookService } from '@/services/webhook';
import type { WebhookSummary } from '@/types/webhook';

vi.mock('@/services/webhook', () => ({
  webhookService: {
    list: vi.fn()
  }
}));

const mockWebhooks: WebhookSummary[] = [
  {
    id: 'wh-1',
    accountId: 'acc-1',
    url: 'https://api.example.com/webhook',
    events: ['billing.record.created', 'billing.status_changed'],
    isActive: true,
    createdAt: '2026-04-08T00:00:00Z',
    updatedAt: '2026-04-08T00:00:00Z'
  },
  {
    id: 'wh-2',
    accountId: 'acc-1',
    url: 'https://hooks.example.com/cvg',
    events: ['encounter.created', 'patient.created'],
    isActive: false,
    createdAt: '2026-04-07T00:00:00Z',
    updatedAt: '2026-04-07T00:00:00Z'
  }
];

function createRouterInstance() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/webhooks', component: WebhooksListPage },
      { path: '/webhooks/new', component: { template: '<div />' } },
      { path: '/webhooks/:id', component: { template: '<div />' } }
    ]
  });
}

async function mountComponent() {
  const router = createRouterInstance();
  await router.push('/');
  await router.isReady();
  const wrapper = mount(WebhooksListPage, {
    global: {
      plugins: [router],
      stubs: {
        RouterLink: {
          template: '<a :href="to"><slot /></a>',
          props: ['to']
        }
      }
    }
  });
  return { wrapper, router };
}

describe('WebhooksListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', async () => {
    vi.mocked(webhookService.list).mockResolvedValue([]);
    const { wrapper } = await mountComponent();
    expect(wrapper.text()).toContain('Webhooks');
  });

  it('shows loading state', async () => {
    vi.mocked(webhookService.list).mockReturnValue(new Promise(() => {}));
    const { wrapper } = await mountComponent();
    await flushPromises();
    expect(wrapper.find('.data-table-loading').exists()).toBe(true);
  });

  it('shows empty state when no webhooks', async () => {
    vi.mocked(webhookService.list).mockResolvedValue([]);
    const { wrapper } = await mountComponent();
    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum registro encontrado');
  });

  it('renders webhook data', async () => {
    vi.mocked(webhookService.list).mockResolvedValue(mockWebhooks);
    const { wrapper } = await mountComponent();
    await flushPromises();
    expect(wrapper.text()).toContain('https://api.example.com/webhook');
    expect(wrapper.text()).toContain('https://hooks.example.com/cvg');
  });

  it('shows status badges', async () => {
    vi.mocked(webhookService.list).mockResolvedValue(mockWebhooks);
    const { wrapper } = await mountComponent();
    await flushPromises();
    expect(wrapper.text()).toContain('Ativo');
    expect(wrapper.text()).toContain('Inativo');
  });

  it('has Novo Webhook button', async () => {
    vi.mocked(webhookService.list).mockResolvedValue([]);
    const { wrapper } = await mountComponent();
    expect(wrapper.text()).toContain('Incluir');
  });

  it('shows error when API fails', async () => {
    vi.mocked(webhookService.list).mockRejectedValue(new Error('Network error'));
    const { wrapper } = await mountComponent();
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Network error');
  });

  it('requests Vetus-like filters when searching', async () => {
    vi.mocked(webhookService.list).mockResolvedValue(mockWebhooks);
    const { wrapper } = await mountComponent();
    await flushPromises();

    await wrapper.find('input[placeholder="URL"]').setValue('hooks.example.com');
    await wrapper.find('input[placeholder="Evento"]').setValue('patient.created');
    await wrapper.find('select').setValue('all');
    const searchButton = wrapper.findAll('button').find((button) => button.text() === 'Pesquisar');
    expect(searchButton).toBeTruthy();
    await searchButton!.trigger('click');
    await flushPromises();

    expect(webhookService.list).toHaveBeenLastCalledWith({
      url: 'hooks.example.com',
      event: 'patient.created',
      active: undefined
    });
  });
});
