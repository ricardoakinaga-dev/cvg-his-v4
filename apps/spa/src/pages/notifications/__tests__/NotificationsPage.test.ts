import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockNotifications = [
  {
    id: 'ntf-1',
    accountId: 'acc-1',
    channel: 'internal' as const,
    category: 'billing' as const,
    title: 'Cobrança pendente',
    message: 'Nova cobrança foi gerada',
    severity: 'medium' as const,
    status: 'queued' as const,
    createdByUserId: 'user-1',
    createdAt: '2026-04-10T00:00:00Z',
    sentAt: null
  }
];

const mockJobs = [
  {
    id: 'job-1',
    accountId: 'acc-1',
    notificationId: 'ntf-1',
    status: 'queued' as const,
    attempts: 0,
    scheduledAt: '2026-04-10T00:00:00Z',
    processedAt: undefined
  }
];

const mockListNotifications = vi.fn();
const mockListJobs = vi.fn();
const mockProcessPending = vi.fn();

vi.mock('@/services/notifications', () => ({
  notificationService: {
    list: (...args: unknown[]) => mockListNotifications(...args),
    listJobs: (...args: unknown[]) => mockListJobs(...args),
    processPending: (...args: unknown[]) => mockProcessPending(...args)
  }
}));

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListNotifications.mockResolvedValue(mockNotifications);
    mockListJobs.mockResolvedValue(mockJobs);
    mockProcessPending.mockResolvedValue(mockNotifications);
  });

  it('renders notifications and processes queued jobs', async () => {
    const NotificationsPage = (await import('../NotificationsPage.vue')).default;
    const wrapper = mount(NotificationsPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Notificações');
    expect(wrapper.text()).toContain('Cobrança pendente');
    expect(wrapper.text()).toContain('1 jobs em fila');

    // Click the "Processar pendentes" button (2nd button)
    const buttons = wrapper.findAll('button');
    await buttons[1].trigger('click');
    await flushPromises();

    expect(mockProcessPending).toHaveBeenCalledWith(10);
    expect(wrapper.text()).toContain('processada(s) com sucesso');
  });
});
