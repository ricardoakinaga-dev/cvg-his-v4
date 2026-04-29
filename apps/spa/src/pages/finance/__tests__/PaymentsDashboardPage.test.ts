import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

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

  it('renders a Vetus-like payment dashboard backed by card reconciliation', async () => {
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
    expect(wrapper.text()).toContain('Repasse Previsto');
    expect(wrapper.text()).toContain('Cirurgia ortopedica');
    expect(wrapper.text()).toContain('Pagar.me');
    expect(wrapper.text()).toContain('Centro Veterinário Guarapiranga');
    expect(normalizeCurrencySpaces(wrapper.text())).toContain('R$ 650,00');
    expect(normalizeCurrencySpaces(wrapper.text())).toContain('R$ 630,50');
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
    await wrapper.find('#payments-dashboard-reconciliation').setValue('reconciled');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockList).toHaveBeenLastCalledWith({
      search: 'Rex',
      provider: 'pagarme-card',
      status: 'captured',
      pageSize: 100
    });
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
});

function normalizeCurrencySpaces(value: string): string {
  return value.replace(/\u00a0/g, ' ');
}
