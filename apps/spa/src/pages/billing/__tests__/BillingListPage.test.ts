import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockReceivablesResponse = {
  data: [
    {
      id: 'recv-1',
      encounterId: 'enc-1',
      financialAccountId: 'fin-1',
      installmentNumber: 1,
      installmentLabel: 'Parcela 1/1',
      dueAt: '2026-04-30T00:00:00.000Z',
      status: 'open' as const,
      amountOriginal: 350,
      amountPaid: 100,
      amountOutstanding: 250,
      issuedAt: '2026-04-20T10:00:00.000Z',
      settledAt: null,
      notes: 'Comanda 123',
      payments: [],
      encounterStatus: 'open' as const,
      patientId: 'pat-1',
      patientName: 'Rex',
      patientSpecies: 'canine',
      ownerId: 'owner-1',
      ownerName: 'João Silva',
      ownerPhoneMain: '(11) 99999-0000',
      financialStatus: 'partial' as const,
      totalAmount: 350,
      lastClosedAt: null
    },
    {
      id: 'recv-2',
      encounterId: 'enc-2',
      financialAccountId: 'fin-2',
      installmentNumber: 1,
      installmentLabel: 'Parcela única',
      dueAt: '2026-04-18T00:00:00.000Z',
      status: 'settled' as const,
      amountOriginal: 500,
      amountPaid: 500,
      amountOutstanding: 0,
      issuedAt: '2026-04-10T10:00:00.000Z',
      settledAt: '2026-04-18T12:00:00.000Z',
      notes: null,
      payments: [],
      encounterStatus: 'closed' as const,
      patientId: 'pat-2',
      patientName: 'Mimi',
      patientSpecies: 'feline',
      ownerId: 'owner-2',
      ownerName: 'Maria Santos',
      ownerPhoneMain: null,
      financialStatus: 'paid' as const,
      totalAmount: 500,
      lastClosedAt: '2026-04-18T12:00:00.000Z'
    }
  ],
  page: 1,
  pageSize: 20,
  total: 2,
  openCount: 1,
  settledCount: 1,
  totalOutstanding: 250,
  totalSettled: 600
};

const mockListReceivables = vi.fn().mockResolvedValue(mockReceivablesResponse);

vi.mock('@/services/financialReceivables', () => ({
  financialReceivablesService: {
    get list() {
      return mockListReceivables;
    }
  }
}));

describe('BillingListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListReceivables.mockResolvedValue(mockReceivablesResponse);
  });

  it('renders a Vetus-like accounts receivable page', async () => {
    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage);

    await flushPromises();

    expect(wrapper.text()).toContain('Contas a Receber');
    expect(wrapper.text()).toContain('Gerar Conta Avulsa');
    expect(wrapper.text()).toContain('recebimento do atendimento');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('Vencimento entre');
    expect(wrapper.text()).toContain('até');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Origem');
    expect(wrapper.text()).toContain('Emissão');
    expect(wrapper.text()).toContain('Vencimento');
    expect(wrapper.text()).toContain('Total');
    expect(wrapper.text()).toContain('Recebido');
    expect(wrapper.text()).toContain('A Receber');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('João Silva');
    expect(wrapper.text()).toContain('Maria Santos');
    expect(wrapper.text()).toContain('R$\u00A0250,00');
    expect(wrapper.text()).not.toContain('Dashboard Financeiro');
    expect(mockListReceivables).toHaveBeenCalledWith({
      search: '',
      status: '',
      page: 1,
      pageSize: 20
    });
  });

  it('shows empty and error states with accounts receivable wording', async () => {
    mockListReceivables.mockResolvedValueOnce({ ...mockReceivablesResponse, data: [], total: 0 });
    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const emptyWrapper = mount(BillingListPage);

    await flushPromises();
    expect(emptyWrapper.text()).toContain('Nenhuma conta a receber encontrada');

    mockListReceivables.mockRejectedValueOnce(new Error('Falha financeira'));
    const errorWrapper = mount(BillingListPage);

    await flushPromises();
    expect(errorWrapper.text()).toContain('Falha financeira');
  });

  it('links each receivable to the encounter billing detail', async () => {
    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    await flushPromises();
    const openLinks = wrapper.findAll('a').filter((anchor) => anchor.text() === 'Abrir');
    expect(openLinks).toHaveLength(2);
    expect(openLinks[0].attributes('href')).toBe('/billing/enc-1');
    expect(openLinks[1].attributes('href')).toBe('/billing/enc-2');
  });

  it('does not expose direct or batch settlement shortcuts', async () => {
    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage);

    await flushPromises();

    expect(wrapper.text()).not.toContain('Baixar contas em lote');
    expect(wrapper.findAll('button').some((button) => button.text() === 'Baixar')).toBe(false);
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false);
  });
});
