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
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockList).toHaveBeenLastCalledWith({
      search: 'Rex',
      provider: 'pagarme-card',
      status: 'captured',
      pageSize: 100
    });
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
});

function normalizeCurrencySpaces(value: string): string {
  return value.replace(/\u00a0/g, ' ');
}
