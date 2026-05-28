import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const payable = {
  id: 'payable-1',
  accountId: 'acc-1',
  supplierName: 'Fornecedor de medicamentos',
  description: 'NF 123',
  category: 'Compras',
  costCenterCode: 'EST',
  costCenterName: 'Estoque',
  issuedAt: '2026-05-01',
  dueAt: '2026-05-20',
  totalAmount: 600,
  paidAmount: 0,
  outstandingAmount: 600,
  status: 'open' as const,
  sourceExpenseId: 'expense-1',
  notes: null,
  paymentMethod: null,
  paymentReference: null,
  reconciliationStatus: 'not_required' as const,
  reconciliationReference: null,
  createdByUserId: 'user-1',
  paidByUserId: null,
  cancelledByUserId: null,
  reconciledByUserId: null,
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
  paidAt: null,
  cancelledAt: null,
  reconciledAt: null
};

const paidPayable = {
  ...payable,
  id: 'payable-2',
  supplierName: 'Laboratório parceiro',
  category: 'Serviços',
  costCenterCode: 'LAB',
  costCenterName: 'Laboratório',
  totalAmount: 400,
  paidAmount: 400,
  outstandingAmount: 0,
  status: 'paid' as const,
  paymentMethod: 'bank_transfer' as const,
  paymentReference: 'extrato-400',
  reconciliationStatus: 'pending' as const,
  paidByUserId: 'user-1',
  paidAt: '2026-05-10T10:00:00.000Z'
};

const mockPayablesResponse = {
  data: [payable, paidPayable],
  page: 1,
  pageSize: 50,
  total: 2,
  openCount: 1,
  paidCount: 1,
  cancelledCount: 0,
  totalAmount: 1000,
  totalPaid: 400,
  totalOutstanding: 600
};

const mockListPayables = vi.fn().mockResolvedValue(mockPayablesResponse);
const mockCreatePayable = vi.fn().mockResolvedValue(payable);
const mockPayPayable = vi.fn().mockResolvedValue({ ...payable, status: 'paid', paidAmount: 600, outstandingAmount: 0 });
const mockReconcilePayable = vi.fn().mockResolvedValue({
  ...paidPayable,
  reconciliationStatus: 'reconciled',
  reconciliationReference: 'extrato-400'
});

vi.mock('@/services/financialPayables', () => ({
  financialPayablesService: {
    get list() {
      return mockListPayables;
    },
    get create() {
      return mockCreatePayable;
    },
    get pay() {
      return mockPayPayable;
    },
    get reconcile() {
      return mockReconcilePayable;
    }
  }
}));

describe('AccountsPayablePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPayables.mockResolvedValue(mockPayablesResponse);
    mockCreatePayable.mockResolvedValue(payable);
    mockPayPayable.mockResolvedValue({ ...payable, status: 'paid', paidAmount: 600, outstandingAmount: 0 });
    mockReconcilePayable.mockResolvedValue({
      ...paidPayable,
      reconciliationStatus: 'reconciled',
      reconciliationReference: 'extrato-400'
    });
  });

  it('renders a Vetus-like accounts payable page backed by the payables subledger', async () => {
    const AccountsPayablePage = (await import('../AccountsPayablePage.vue')).default;
    const wrapper = mount(AccountsPayablePage, {
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

    expect(wrapper.text()).toContain('Contas a Pagar');
    expect(wrapper.text()).toContain('Gerar Conta Avulsa');
    expect(wrapper.text()).toContain('Baixar Contas Em Lote');
    expect(wrapper.text()).toContain('Método de Baixa');
    expect(wrapper.text()).toContain('Referência');
    expect(wrapper.text()).toContain('Fornecedor');
    expect(wrapper.text()).toContain('Vencimento de');
    expect(wrapper.text()).toContain('Até');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Fornecedor de medicamentos');
    expect(wrapper.text()).toContain('Laboratório parceiro');
    expect(wrapper.text()).toContain('R$\u00A0600,00');
    expect(wrapper.text()).toContain('Baixar');
    expect(wrapper.text()).toContain('Conciliar');
    expect(mockListPayables).toHaveBeenCalledWith({
      search: '',
      status: '',
      page: 1,
      pageSize: 50
    });
  });

  it('creates a standalone payable and reloads the list', async () => {
    const AccountsPayablePage = (await import('../AccountsPayablePage.vue')).default;
    const wrapper = mount(AccountsPayablePage);

    await flushPromises();
    await wrapper.get('#payable-new-supplier').setValue('Fornecedor novo');
    await wrapper.get('#payable-new-description').setValue('NF 456');
    await wrapper.get('#payable-new-category').setValue('Compras');
    await wrapper.get('#payable-new-cost-center').setValue('EST');
    await wrapper.get('#payable-new-due').setValue('2026-05-30');
    await wrapper.get('#payable-new-total').setValue('300');
    await wrapper.findAll('button').find((button) => button.text() === 'Gerar Conta Avulsa')?.trigger('click');
    await flushPromises();

    expect(mockCreatePayable).toHaveBeenCalledWith({
      supplierName: 'Fornecedor novo',
      description: 'NF 456',
      category: 'Compras',
      costCenterCode: 'EST',
      costCenterName: 'EST',
      dueAt: '2026-05-30',
      totalAmount: 300,
      notes: null
    });
    expect(mockListPayables).toHaveBeenCalledTimes(2);
  });

  it('pays an open payable and supports batch payment for selected rows', async () => {
    const AccountsPayablePage = (await import('../AccountsPayablePage.vue')).default;
    const wrapper = mount(AccountsPayablePage);

    await flushPromises();
    await wrapper.findAll('button').find((button) => button.text() === 'Baixar')?.trigger('click');
    await flushPromises();
    expect(mockPayPayable).toHaveBeenCalledWith('payable-1', {
      amountPaid: 600,
      paymentMethod: 'cash',
      paymentReference: 'gaveta-principal',
      notes: 'Baixa operacional em Contas a Pagar'
    });

    await wrapper.get('#payable-payment-method').setValue('bank_transfer');
    await wrapper.get('#payable-payment-reference').setValue('conta-operacional');
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await wrapper.findAll('button').find((button) => button.text() === 'Baixar Contas Em Lote')?.trigger('click');
    await flushPromises();
    expect(mockPayPayable).toHaveBeenCalledWith('payable-1', {
      amountPaid: 600,
      paymentMethod: 'bank_transfer',
      paymentReference: 'conta-operacional',
      notes: 'Baixa em lote em Contas a Pagar'
    });
  });

  it('reconciles paid non-cash payables from the row action', async () => {
    const AccountsPayablePage = (await import('../AccountsPayablePage.vue')).default;
    const wrapper = mount(AccountsPayablePage);

    await flushPromises();
    await wrapper.get('#payable-payment-reference').setValue('OFX-400');
    await wrapper.findAll('button').find((button) => button.text() === 'Conciliar')?.trigger('click');
    await flushPromises();

    expect(mockReconcilePayable).toHaveBeenCalledWith('payable-2', {
      reconciliationReference: 'OFX-400',
      notes: 'Conciliação operacional em Contas a Pagar'
    });
    expect(mockListPayables).toHaveBeenCalledTimes(2);
  });

  it('shows empty and error states with accounts payable wording', async () => {
    mockListPayables.mockResolvedValueOnce({ ...mockPayablesResponse, data: [], total: 0 });
    const AccountsPayablePage = (await import('../AccountsPayablePage.vue')).default;
    const emptyWrapper = mount(AccountsPayablePage);

    await flushPromises();
    expect(emptyWrapper.text()).toContain('Nenhuma conta a pagar encontrada');

    mockListPayables.mockRejectedValueOnce(new Error('Falha no subledger'));
    const errorWrapper = mount(AccountsPayablePage);

    await flushPromises();
    expect(errorWrapper.text()).toContain('Falha no subledger');
  });
});
