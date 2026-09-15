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
  totalOriginal: 850,
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
    expect(wrapper.text()).toContain('R$\u00A0850,00');
    expect(wrapper.text()).toContain('Esse é um estado financeiro esperado');
    expect(wrapper.findAll('.ds-stat-card--error')).toHaveLength(0);
    expect(wrapper.text()).not.toContain('Dashboard Financeiro');
    expect(mockListReceivables).toHaveBeenCalledWith({
      search: '',
      status: '',
      page: 1,
      pageSize: 20
    });
  });

  it('uses the backend page contract for pagination and displays the filtered range', async () => {
    const firstPageRows = Array.from({ length: 20 }, (_, index) => ({
      ...mockReceivablesResponse.data[0],
      id: `recv-page-${index + 1}`,
      encounterId: `enc-page-${index + 1}`,
      ownerName: `Cliente ${index + 1}`,
      installmentLabel: `Parcela ${index + 1}/1`,
      amountOriginal: 100,
      amountPaid: 0,
      amountOutstanding: 100,
      totalAmount: 100
    }));
    const secondPageRow = {
      ...firstPageRows[0],
      id: 'recv-page-21',
      encounterId: 'enc-page-21',
      ownerName: 'Cliente 21'
    };

    mockListReceivables
      .mockResolvedValueOnce({
        ...mockReceivablesResponse,
        data: firstPageRows,
        page: 1,
        total: 21,
        totalOriginal: 2100,
        totalOutstanding: 2100,
        totalSettled: 0
      })
      .mockResolvedValueOnce({
        ...mockReceivablesResponse,
        data: [secondPageRow],
        page: 2,
        total: 21,
        totalOriginal: 2100,
        totalOutstanding: 2100,
        totalSettled: 0
      });

    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage);

    await flushPromises();
    expect(wrapper.findAll('tbody tr')).toHaveLength(20);
    expect(wrapper.text()).toContain('Página 1 de 2');
    expect(wrapper.text()).toContain('1–20 de 21 títulos');
    expect(wrapper.text()).toContain('R$\u00A02.100,00');

    await wrapper.find('button[aria-label="Próxima página"]').trigger('click');
    await flushPromises();

    expect(mockListReceivables).toHaveBeenLastCalledWith({
      search: '',
      status: '',
      page: 2,
      pageSize: 20
    });
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);
    expect(wrapper.text()).toContain('Cliente 21');
    expect(wrapper.text()).toContain('Página 2 de 2');
    expect(wrapper.text()).toContain('21–21 de 21 títulos');
  });

  it('sends supported status filters and resets the page to one', async () => {
    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage);

    await flushPromises();
    await wrapper.find('#receivable-status').setValue('open');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(mockListReceivables).toHaveBeenLastCalledWith({
      search: '',
      status: 'open',
      page: 1,
      pageSize: 20
    });
  });

  it('sends due filters to the backend and exposes only contract statuses', async () => {
    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage);

    await flushPromises();
    await wrapper.find('#receivable-due-from').setValue('2026-04-01');
    await wrapper.find('#receivable-due-to').setValue('2026-04-30');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(mockListReceivables).toHaveBeenLastCalledWith({
      search: '',
      status: '',
      dueFrom: '2026-04-01',
      dueTo: '2026-04-30',
      page: 1,
      pageSize: 20
    });
    expect(wrapper.find('#receivable-status option[value="cancelled"]').exists()).toBe(false);
  });

  it('does not let an older response replace a newer filter result', async () => {
    let resolveInitial: (value: typeof mockReceivablesResponse) => void = () => undefined;
    let resolveFiltered: (value: typeof mockReceivablesResponse) => void = () => undefined;
    const initialRequest = new Promise<typeof mockReceivablesResponse>((resolve) => {
      resolveInitial = resolve;
    });
    const filteredRequest = new Promise<typeof mockReceivablesResponse>((resolve) => {
      resolveFiltered = resolve;
    });
    mockListReceivables.mockReset();
    mockListReceivables.mockReturnValueOnce(initialRequest).mockReturnValueOnce(filteredRequest);

    const BillingListPage = (await import('../BillingListPage.vue')).default;
    const wrapper = mount(BillingListPage);

    await wrapper.find('#receivable-status').setValue('open');
    await wrapper.find('form').trigger('submit.prevent');

    resolveFiltered({
      ...mockReceivablesResponse,
      data: [{ ...mockReceivablesResponse.data[0], ownerName: 'Resultado novo' }],
      page: 1,
      total: 1
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Resultado novo');

    resolveInitial(mockReceivablesResponse);
    await flushPromises();
    expect(wrapper.text()).toContain('Resultado novo');
    expect(wrapper.text()).not.toContain('Maria Santos');
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
    expect(errorWrapper.text()).toContain('Não foi possível carregar contas a receber');
    expect(errorWrapper.text()).toContain('Tentar novamente');
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
    expect(wrapper.text()).not.toContain('Gerar Conta Avulsa');
    expect(wrapper.text()).toContain('decisão explícita de Produto/Financeiro');
    expect(wrapper.findAll('button').some((button) => button.text() === 'Baixar')).toBe(false);
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false);
  });
});
