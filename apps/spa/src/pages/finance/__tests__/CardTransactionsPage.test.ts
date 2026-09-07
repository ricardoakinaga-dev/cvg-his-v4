import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockList = vi.fn();

vi.mock('@/services/financeCards', () => ({
  financeCardsService: {
    list: (...args: unknown[]) => mockList(...args)
  }
}));

describe('CardTransactionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
    mockList.mockResolvedValue([
      {
        transactionId: 'card_txn_1',
        provider: 'pagarme-card',
        status: 'captured',
        amount: 250,
        netAmount: 242.5,
        feeAmount: 7.5,
        description: 'Consulta cardiologica',
        installments: 1,
        capturedAt: '2026-04-29T10:00:00.000Z',
        providerAuthorizationCode: 'AUTH-123',
        cardBrand: 'visa',
        cardHolderName: 'Maria Souza',
        cardLast4: '4242',
        reconciliationState: 'reconciled',
        ownerName: 'Maria Souza',
        patientName: 'Rex'
      },
      {
        transactionId: 'card_txn_2',
        provider: 'local-card',
        status: 'authorized_pending_capture',
        amount: 120,
        netAmount: 116.4,
        feeAmount: 3.6,
        description: 'Vacina anual',
        installments: 3,
        createdAt: '2026-04-28T12:00:00.000Z',
        providerChargeId: 'CHG-456',
        cardBrand: 'mastercard',
        cardHolderName: 'Joao Pereira',
        cardLast4: '5454',
        reconciliationState: 'pending',
        ownerName: 'Joao Pereira',
        patientName: 'Luna'
      }
    ]);
  });

  it('renders a Vetus-like card transactions surface backed by finance cards', async () => {
    const CardTransactionsPage = (await import('../CardTransactionsPage.vue')).default;
    const wrapper = mount(CardTransactionsPage);

    await flushPromises();

    expect(mockList).toHaveBeenCalledWith({
      search: '',
      provider: '',
      status: '',
      pageSize: 100
    });
    expect(wrapper.text()).toContain('Transações de Cartão');
    expect(wrapper.text()).toContain('Financeiro');
    expect(wrapper.text()).toContain('Maquininha de Cartão');
    expect(wrapper.text()).toContain('Consulta cardiologica');
    expect(wrapper.text()).toContain('Maria Souza');
    expect(wrapper.text()).toContain('Rex');
    expect(normalizeCurrencySpaces(wrapper.text())).toContain('R$ 250,00');
    expect(normalizeCurrencySpaces(wrapper.text())).toContain('R$ 7,50');
    expect(normalizeCurrencySpaces(wrapper.text())).toContain('R$ 242,50');
    expect(wrapper.text()).toContain('Capturada');
    expect(wrapper.text()).toContain('Conciliada');
    expect(wrapper.text()).toContain('Configuração do Split');
    expect(wrapper.text()).toContain('Maquininhas');
    expect(wrapper.text()).toContain('Contas Adm. Cartão');
  });

  it('passes Vetus-like filters to the card reconciliation API', async () => {
    const CardTransactionsPage = (await import('../CardTransactionsPage.vue')).default;
    const wrapper = mount(CardTransactionsPage);

    await flushPromises();
    await wrapper.find('#card-transactions-search').setValue('Rex');
    await wrapper.find('#card-transactions-provider').setValue('pagarme-card');
    await wrapper.find('#card-transactions-status').setValue('captured');
    expect(wrapper.find('.advanced-filters summary').text()).not.toContain('aplicado');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockList).toHaveBeenLastCalledWith({
      search: 'Rex',
      provider: 'pagarme-card',
      status: 'captured',
      pageSize: 100
    });
    expect(wrapper.find('.advanced-filters summary').text()).toContain('2 aplicados');
  });

  it('uses the initial search query from linked card account rows', async () => {
    window.history.replaceState(null, '', '/finance/card-transactions?search=card_txn_1');

    const CardTransactionsPage = (await import('../CardTransactionsPage.vue')).default;
    mount(CardTransactionsPage);

    await flushPromises();

    expect(mockList).toHaveBeenCalledWith({
      search: 'card_txn_1',
      provider: '',
      status: '',
      pageSize: 100
    });
  });

  it('shows empty and error states with transaction wording', async () => {
    mockList.mockResolvedValueOnce([]);
    const CardTransactionsPage = (await import('../CardTransactionsPage.vue')).default;
    const emptyWrapper = mount(CardTransactionsPage);

    await flushPromises();
    expect(emptyWrapper.text()).toContain('Nenhuma transação de cartão encontrada');

    mockList.mockRejectedValueOnce(new Error('Falha ao carregar transações de cartão'));
    const errorWrapper = mount(CardTransactionsPage);

    await flushPromises();
    expect(errorWrapper.text()).toContain('Falha ao carregar transações de cartão');
  });
  it('preserves nullable fee/net and actual currencies without inventing arithmetic', async () => {
    mockList.mockResolvedValueOnce([
      { transactionId: 'unknown-money', provider: 'local-card', amount: 100, currency: 'BRL', status: 'captured', description: 'Valor incompleto', installments: 1 },
      { transactionId: 'zero-money', provider: 'local-card', amount: 0, netAmount: 0, feeAmount: 0, currency: 'USD', status: 'failed', description: 'Valor zero', installments: 1 }
    ]);
    const Page = (await import('../CardTransactionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    const missing = wrapper.findAll('tbody tr').find(r => r.text().includes('Valor incompleto'))!;
    expect(missing.findAll('td')[6].text()).toBe('—');
    expect(missing.findAll('td')[7].text()).toBe('—');
    expect(missing.text()).toContain('Não informado');
    const zero = wrapper.findAll('tbody tr').find(r => r.text().includes('Valor zero'))!;
    expect(zero.findAll('td')[7].text()).toContain('US$');
    expect(zero.findAll('td')[7].text()).toContain('0,00');
    expect(wrapper.findAll('.query-summary dd').slice(0, 3).map(x => x.text())).toEqual(['—', '—', '—']);
  });

  it('keeps failed state after dismissal and recovers without implying zero totals', async () => {
    mockList.mockRejectedValueOnce(new Error('Consulta temporariamente indisponível'));
    const Page = (await import('../CardTransactionsPage.vue')).default;
    const wrapper = mount(Page, { global: { stubs: { DsAlert: false } } });
    expect(wrapper.findAll('.query-summary dd').every(x => x.text() === '—')).toBe(true);
    await flushPromises();
    await wrapper.get('button[aria-label="Fechar alerta"]').trigger('click');
    expect(wrapper.text()).toContain('Transações indisponíveis');
    expect(wrapper.text()).not.toContain('Nenhuma transação de cartão encontrada');
    expect(wrapper.findAll('.query-summary dd').every(x => x.text() === '—')).toBe(true);
    await wrapper.findAll('button').find(x => x.text() === 'Tentar novamente')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Consulta cardiologica');
    expect(wrapper.text()).not.toContain('Transações indisponíveis');
  });

  it('applies reconciliation only with its query snapshot and ignores obsolete failures', async () => {
    const Page = (await import('../CardTransactionsPage.vue')).default;
    const wrapper = mount(Page);
    await flushPromises();
    await wrapper.get('#card-transactions-reconciliation').setValue('reconciled');
    expect(wrapper.find('tbody').text()).toContain('Vacina anual');
    let rejectOld!: (error: Error) => void;
    mockList.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject; }));
    await wrapper.find('form').trigger('submit');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('tbody').text()).toContain('Consulta cardiologica');
    expect(wrapper.find('tbody').text()).not.toContain('Vacina anual');
    rejectOld(new Error('Resposta antiga'));
    await flushPromises();
    expect(wrapper.text()).not.toContain('Resposta antiga');
    expect(wrapper.find('tbody').text()).toContain('Consulta cardiologica');
  });

});

function normalizeCurrencySpaces(value: string): string {
  return value.replace(/\u00a0/g, ' ');
}
