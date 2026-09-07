import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';

const mockList = vi.fn();

vi.mock('@/services/financeCards', () => ({
  financeCardsService: {
    list: (...args: unknown[]) => mockList(...args)
  }
}));

describe('PaymentsDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([
      {
        transactionId: 'card_txn_1',
        provider: 'pagarme-card',
        status: 'captured',
        amount: 500,
        netAmount: 485,
        feeAmount: 15,
        description: 'Cirurgia ortopedica',
        installments: 2,
        capturedAt: '2026-04-29T10:00:00.000Z',
        providerAuthorizationCode: 'AUTH-123',
        reconciliationState: 'reconciled',
        ownerName: 'Maria Souza',
        patientName: 'Rex'
      },
      {
        transactionId: 'card_txn_2',
        provider: 'local-card',
        status: 'authorized_pending_capture',
        amount: 150,
        netAmount: 145.5,
        feeAmount: 4.5,
        description: 'Vacina anual',
        installments: 1,
        createdAt: '2026-04-28T12:00:00.000Z',
        providerChargeId: 'CHG-456',
        reconciliationState: 'attention_required',
        ownerName: 'Joao Pereira',
        patientName: 'Luna'
      }
    ]);
  });

  it('renders captured and reconciled totals only from their eligible records', async () => {
    const PaymentsDashboardPage = (await import('../PaymentsDashboardPage.vue')).default;
    const wrapper = mount(PaymentsDashboardPage);

    await flushPromises();

    expect(mockList).toHaveBeenCalledWith({
      search: '',
      provider: '',
      status: '',
      pageSize: 100
    });
    expect(wrapper.text()).toContain('Pagamento Dashboard');
    expect(wrapper.text()).toContain('Financeiro');
    expect(wrapper.text()).toContain('Maquininha de Cartão');
    expect(wrapper.text()).toContain('Capturado');
    expect(wrapper.text()).toContain('Conciliado');
    expect(wrapper.text()).toContain('Repasse previsto');
    expect(wrapper.text()).toContain('Cirurgia ortopedica');
    expect(wrapper.text()).toContain('Pagar.me');
    expect(wrapper.text()).toContain('Maria Souza');
    expect(wrapper.text()).not.toContain('Centro Veterinário Guarapiranga');
    expect(normalizeCurrencySpaces(wrapper.text())).toContain('R$ 500,00');
    expect(normalizeCurrencySpaces(wrapper.text())).toContain('R$ 485,00');
    const summary = normalizeCurrencySpaces(wrapper.find('.payments-dashboard-summary-grid').text());
    expect(summary).not.toContain('R$ 650,00');
    expect(summary).not.toContain('R$ 630,50');
    expect(wrapper.text()).toContain('Transações de Cartão');
    expect(wrapper.text()).toContain('Exportador de Split');
    expect(wrapper.text()).toContain('Habilitar Pagamento');
  });

  it('passes dashboard filters to card reconciliation and filters reconciliation locally', async () => {
    const PaymentsDashboardPage = (await import('../PaymentsDashboardPage.vue')).default;
    const wrapper = mount(PaymentsDashboardPage);

    await flushPromises();
    await wrapper.find('#payments-dashboard-search').setValue('Rex');
    await wrapper.find('#payments-dashboard-provider').setValue('pagarme-card');
    await wrapper.find('#payments-dashboard-status').setValue('captured');
    expect(wrapper.find('.advanced-filters summary').text()).not.toContain('aplicado');
    await wrapper.find('#payments-dashboard-reconciliation').setValue('reconciled');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockList).toHaveBeenLastCalledWith({
      search: 'Rex',
      provider: 'pagarme-card',
      status: 'captured',
      pageSize: 100
    });
    expect(wrapper.find('.advanced-filters summary').text()).toContain('3 aplicados');
    expect(wrapper.text()).toContain('Cirurgia ortopedica');
    expect(wrapper.text()).not.toContain('Vacina anual');
  });

  it('shows empty and error states with payment dashboard wording', async () => {
    mockList.mockResolvedValueOnce([]);
    const PaymentsDashboardPage = (await import('../PaymentsDashboardPage.vue')).default;
    const emptyWrapper = mount(PaymentsDashboardPage);

    await flushPromises();
    expect(emptyWrapper.text()).toContain('Nenhum pagamento encontrado');

    mockList.mockRejectedValueOnce(new Error('Falha ao carregar pagamento dashboard'));
    const errorWrapper = mount(PaymentsDashboardPage);

    await flushPromises();
    expect(errorWrapper.text()).toContain('Falha ao carregar pagamento dashboard');
  });
  it('does not infer net, settlement, missing money or missing statuses', async () => {
    mockList.mockResolvedValueOnce([{ transactionId: 'unknown', provider: 'local-card', amount: null }]);
    const Page = (await import('../PaymentsDashboardPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    expect(wrapper.text()).toContain('Não informado');
    expect(wrapper.text()).toContain('Não informada');
    expect(wrapper.find('tbody').text()).not.toContain('Pendente');
    expect(wrapper.findAll('tbody td').filter(cell => cell.text() === '—')).toHaveLength(3);
    mockList.mockResolvedValueOnce([{ transactionId: 'gross-only', amount: 100, status: 'captured', reconciliationState: 'reconciled' }]);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const summary = normalizeCurrencySpaces(wrapper.find('.payments-dashboard-summary').text());
    expect(summary).toContain('R$ 100,00');
    expect(summary).not.toContain('R$ 97,00');
    expect(wrapper.findAll('tbody td').filter(cell => cell.text() === '—')).toHaveLength(2);
  });

  it('refuses mixed currency totals and preserves row currencies', async () => {
    mockList.mockResolvedValueOnce([
      { transactionId: 'brl', amount: 100, netAmount: 90, currency: 'BRL', status: 'captured', reconciliationState: 'reconciled' },
      { transactionId: 'usd', amount: 200, netAmount: 180, currency: 'USD', status: 'captured', reconciliationState: 'reconciled' }
    ]);
    const Page = (await import('../PaymentsDashboardPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    const summary = wrapper.find('.payments-dashboard-summary-grid').text();
    expect(summary).not.toContain('300');
    expect(summary).not.toContain('270');
    expect(summary.match(/—/g)).toHaveLength(3);
    expect(normalizeCurrencySpaces(wrapper.find('tbody').text())).toContain('US$ 200,00');
  });

  it('keeps failure and recovery visible after dismissing the alert', async () => {
    mockList.mockRejectedValueOnce(new Error('Servidor indisponível'));
    const Page = (await import('../PaymentsDashboardPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    wrapper.findAllComponents(DsAlert).find(alert => alert.text().includes('Servidor indisponível'))!.vm.$emit('dismiss');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Servidor indisponível');
    expect(wrapper.text()).toContain('Consulta indisponível');
    expect(wrapper.text()).not.toContain('Nenhum pagamento encontrado');
    expect(wrapper.find('.payments-dashboard-summary-grid').text().match(/—/g)).toHaveLength(4);
    await wrapper.find('.payments-dashboard-failure button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Cirurgia ortopedica');
    expect(wrapper.text()).not.toContain('Consulta indisponível');
  });

  it('applies reconciliation with the completed query and ignores older failures', async () => {
    let rejectOld!: (error: Error) => void;
    mockList.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject; }));
    const Page = (await import('../PaymentsDashboardPage.vue')).default;
    const wrapper = mount(Page);
    expect(wrapper.text()).not.toContain('Nenhum pagamento encontrado');
    await wrapper.find('#payments-dashboard-reconciliation').setValue('reconciled');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Cirurgia ortopedica');
    expect(wrapper.text()).not.toContain('Vacina anual');
    await wrapper.find('#payments-dashboard-reconciliation').setValue('attention_required');
    expect(wrapper.text()).toContain('Cirurgia ortopedica');
    rejectOld(new Error('Erro antigo'));
    await flushPromises();
    expect(wrapper.text()).toContain('Cirurgia ortopedica');
    expect(wrapper.text()).not.toContain('Erro antigo');
  });

  it('does not let an old success replace a newer failure', async () => {
    let resolveOld!: (rows: unknown[]) => void;
    mockList.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    mockList.mockRejectedValueOnce(new Error('Consulta recente falhou'));
    const Page = (await import('../PaymentsDashboardPage.vue')).default;
    const wrapper = mount(Page);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    resolveOld([{ transactionId: 'stale', amount: 999, description: 'Resultado antigo' }]);
    await flushPromises();
    expect(wrapper.text()).toContain('Consulta recente falhou');
    expect(wrapper.text()).not.toContain('Resultado antigo');
    expect(wrapper.find('.payments-dashboard-summary-grid').text().match(/—/g)).toHaveLength(4);
  });

});

function normalizeCurrencySpaces(value: string): string {
  return value.replace(/\u00a0/g, ' ');
}
