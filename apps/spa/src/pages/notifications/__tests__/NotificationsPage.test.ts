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

  it('renders the safe Vetus-like SMS campaign surface', async () => {
    const NotificationsPage = (await import('../NotificationsPage.vue')).default;
    const wrapper = mount(NotificationsPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Campanhas de SMS Marketing');
    expect(wrapper.text()).toContain('Seu saldo é de 0 SMS disponíveis para envio');
    expect(wrapper.text()).toContain('Gerar Nova Campanha');
    expect(wrapper.text()).toContain('Descrição');
    expect(wrapper.text()).toContain('Data de');
    expect(wrapper.text()).toContain('Até');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Celulares');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('Nenhuma campanha encontrada');
    expect(wrapper.text()).toContain('1 jobs em fila');
    expect(mockListNotifications).toHaveBeenCalledWith();
    expect(mockListJobs).toHaveBeenCalledWith();
    expect(mockProcessPending).not.toHaveBeenCalled();
  });

  it('prepares a campaign draft locally without sending or creating a real campaign', async () => {
    const NotificationsPage = (await import('../NotificationsPage.vue')).default;
    const wrapper = mount(NotificationsPage);

    await flushPromises();

    await wrapper.find('#marketing-campaign-new').trigger('click');
    await wrapper.find('#marketing-campaign-description').setValue('Retorno vacinal');
    await wrapper.find('#marketing-campaign-title').setValue('Vacina em dia');
    await wrapper.find('#marketing-campaign-body').setValue('Agende o reforço anual do seu pet.');
    await wrapper.find('#marketing-campaign-audience-size').setValue('12');
    await wrapper.find('#marketing-campaign-preview').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Campanha preparada sem envio real');
    expect(wrapper.text()).toContain('Retorno vacinal');
    expect(wrapper.text()).toContain('Vacina em dia');
    expect(wrapper.text()).toContain('12 celulares estimados');
    expect(mockProcessPending).not.toHaveBeenCalled();
  });

  it('reloads campaign signals with search filters and keeps send disabled', async () => {
    const NotificationsPage = (await import('../NotificationsPage.vue')).default;
    const wrapper = mount(NotificationsPage);

    await flushPromises();
    mockListNotifications.mockClear();
    mockListJobs.mockClear();

    await wrapper.find('#marketing-campaign-search').setValue('vacina');
    await wrapper.find('#marketing-campaign-submit-search').trigger('click');
    await flushPromises();

    expect(mockListNotifications).toHaveBeenCalledWith();
    expect(mockListJobs).toHaveBeenCalledWith();
    await wrapper.find('#marketing-campaign-new').trigger('click');
    expect(wrapper.find('#marketing-campaign-send').attributes('disabled')).toBeDefined();
    expect(mockProcessPending).not.toHaveBeenCalled();
  });
});
