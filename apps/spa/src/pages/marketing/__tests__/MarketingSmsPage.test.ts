import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockListOwners = vi.fn();
const mockGetConsent = vi.fn();
const mockSetConsent = vi.fn();

vi.mock('@/services/owner', () => ({
  ownerService: {
    list: (...args: unknown[]) => mockListOwners(...args)
  }
}));

vi.mock('@/services/marketing', () => ({
  marketingService: {
    getConsent: (...args: unknown[]) => mockGetConsent(...args),
    setConsent: (...args: unknown[]) => mockSetConsent(...args)
  }
}));

const owners = [
  {
    id: 'owner-1',
    accountId: 'acc-1',
    fullName: 'Maria Souza',
    documentId: '111',
    contacts: [
      { label: 'Celular', value: '(11) 99999-1111', type: 'whatsapp' as const, primary: true },
      { label: 'Email', value: 'maria@example.com', type: 'email' as const, primary: false }
    ],
    financialResponsible: true,
    status: 'active' as const,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z'
  },
  {
    id: 'owner-2',
    accountId: 'acc-1',
    fullName: 'João Pereira',
    contacts: [{ label: 'Telefone', value: '(11) 3333-2222', type: 'phone' as const, primary: true }],
    financialResponsible: true,
    status: 'active' as const,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z'
  }
];

describe('MarketingSmsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListOwners.mockResolvedValue(structuredClone(owners));
    mockGetConsent.mockResolvedValue({
      id: 'consent-1',
      accountId: 'acc-1',
      ownerId: 'owner-1',
      purpose: 'marketing',
      status: 'granted',
      updatedAt: '2026-08-07T12:00:00Z'
    });
    mockSetConsent.mockImplementation(async (payload: { ownerId: string; status: string }) => ({
      id: 'consent-1',
      accountId: 'acc-1',
      ownerId: payload.ownerId,
      purpose: 'marketing',
      status: payload.status,
      updatedAt: '2026-08-07T12:00:00Z'
    }));
  });

  it('renders a Vetus-like safe SMS drafting surface without sending messages', async () => {
    const MarketingSmsPage = (await import('../MarketingSmsPage.vue')).default;
    const wrapper = mount(MarketingSmsPage);
    await flushPromises();

    expect(mockListOwners).toHaveBeenCalledWith({ status: 'active', page: 1, pageSize: 50 });
    expect(wrapper.text()).toContain('Envio de SMS Simples');
    expect(wrapper.text()).toContain('Marketing');
    expect(wrapper.text()).toContain('Envios');
    expect(wrapper.text()).toContain('Seu saldo é de 0 SMS disponíveis para envio');
    expect(wrapper.text()).toContain('Histórico de SMS');
    expect(wrapper.text()).toContain('Maria Souza');
    expect(wrapper.find('button[disabled]').text()).toContain('Enviar SMS');
  });

  it('selects a client phone and keeps the SMS body bounded to 150 characters', async () => {
    const MarketingSmsPage = (await import('../MarketingSmsPage.vue')).default;
    const wrapper = mount(MarketingSmsPage);
    await flushPromises();

    await wrapper.find('#marketing-sms-client').setValue('owner-1');
    expect((wrapper.find('#marketing-sms-phone').element as HTMLInputElement).value).toBe('(11) 99999-1111');

    await wrapper.find('#marketing-sms-body').setValue('Vacina da Luna agendada para amanhã.');
    expect(wrapper.text()).toContain('114 caracteres restantes');

    await wrapper.find('#marketing-sms-preview').trigger('click');
    expect(wrapper.text()).toContain('Rascunho preparado sem envio real');
    expect(wrapper.text()).toContain('Vacina da Luna agendada para amanhã.');
  });

  it('shows service errors without exposing a send action', async () => {
    mockListOwners.mockRejectedValueOnce(new Error('Falha ao carregar clientes'));

    const MarketingSmsPage = (await import('../MarketingSmsPage.vue')).default;
    const wrapper = mount(MarketingSmsPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Falha ao carregar clientes');
    expect(wrapper.find('button[disabled]').text()).toContain('Enviar SMS');
  });

  it('allows an operator to record a marketing opt-out for the selected owner', async () => {
    const MarketingSmsPage = (await import('../MarketingSmsPage.vue')).default;
    const wrapper = mount(MarketingSmsPage);
    await flushPromises();

    await wrapper.find('#marketing-sms-client').setValue('owner-1');
    await flushPromises();
    expect(wrapper.text()).toContain('Consentimento de marketing ativo');

    await wrapper.find('#marketing-sms-opt-out').trigger('click');
    await flushPromises();

    expect(mockSetConsent).toHaveBeenCalledWith({ ownerId: 'owner-1', status: 'revoked' });
    expect(wrapper.text()).toContain('Comunicações bloqueadas para este cliente');
  });
});
