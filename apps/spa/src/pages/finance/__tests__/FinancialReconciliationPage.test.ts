import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUnified = vi.fn();

vi.mock('@/services/financialReconciliation', () => ({
  financialReconciliationService: {
    getUnified: (...args: unknown[]) => mockGetUnified(...args)
  }
}));

function makeReconciliation() {
  return {
    rows: [
      {
        id: 'pix-1',
        domain: 'pix',
        origin: 'PIX · local-pix',
        description: 'PIX consulta',
        counterparty: 'Ana Lima · Mel',
        amount: 150,
        status: 'completed',
        reconciliationState: 'reconciled',
        reference: 'bill-1',
        nextAction: 'Monitorar'
      },
      {
        id: 'card-1',
        domain: 'card',
        origin: 'Cartão · pagarme-card',
        description: 'Cartão cirurgia',
        counterparty: 'João Souza · Thor',
        amount: 500,
        status: 'captured',
        reconciliationState: 'attention_required',
        reference: 'bill-2',
        nextAction: 'Conferir cartão'
      },
      {
        id: 'payable-1',
        domain: 'payable',
        origin: 'Pagável · bank_transfer',
        description: 'NF fornecedor',
        counterparty: 'Fornecedor banco',
        amount: 300,
        status: 'paid',
        reconciliationState: 'pending',
        reference: 'extrato-300',
        nextAction: 'Conciliar pagável'
      }
    ],
    totals: {
      totalAmount: 950,
      reconciledAmount: 150,
      pendingAmount: 300,
      attentionAmount: 500,
      totalCount: 3,
      reconciledCount: 1,
      pendingCount: 1,
      attentionCount: 1
    }
  };
}

describe('FinancialReconciliationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUnified.mockResolvedValue(makeReconciliation());
  });

  it('renders a unified reconciliation surface for PIX, cards and payables', async () => {
    const FinancialReconciliationPage = (await import('../FinancialReconciliationPage.vue')).default;
    const wrapper = mount(FinancialReconciliationPage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          }
        }
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Conciliação Financeira');
    expect(wrapper.text()).toContain('PIX · local-pix');
    expect(wrapper.text()).toContain('Cartão · pagarme-card');
    expect(wrapper.text()).toContain('Pagável · bank_transfer');
    expect(wrapper.text()).toContain('R$\u00A0950,00');
    expect(wrapper.text()).toContain('R$\u00A0500,00');
    expect(wrapper.text()).toContain('Conferir cartão');
    expect(mockGetUnified).toHaveBeenCalledWith({
      search: '',
      page: 1,
      pageSize: 100
    });
  });

  it('filters rows by domain and reconciliation state', async () => {
    const FinancialReconciliationPage = (await import('../FinancialReconciliationPage.vue')).default;
    const wrapper = mount(FinancialReconciliationPage);

    await flushPromises();
    await wrapper.get('#reconciliation-domain').setValue('payable');
    expect(wrapper.text()).toContain('Pagável · bank_transfer');
    expect(wrapper.text()).not.toContain('PIX · local-pix');

    await wrapper.get('#reconciliation-state').setValue('pending');
    expect(wrapper.text()).toContain('Conciliar pagável');
    expect(wrapper.text()).not.toContain('Conferir cartão');
  });

  it('shows error state with reconciliation wording', async () => {
    mockGetUnified.mockRejectedValueOnce(new Error('Falha na conciliação'));
    const FinancialReconciliationPage = (await import('../FinancialReconciliationPage.vue')).default;
    const wrapper = mount(FinancialReconciliationPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Falha na conciliação');
    expect(wrapper.text()).toContain('Nenhuma conciliação encontrada');
  });
});
