import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listPayments: vi.fn(),
  createPayment: vi.fn(),
  compensatePayment: vi.fn(),
  listOwners: vi.fn()
}));

const payment = {
  id: '00000000-0000-0000-0000-000000000004',
  accountId: '00000000-0000-0000-0000-000000000001',
  ownerId: '00000000-0000-0000-0000-000000000003',
  ownerName: 'João Silva',
  documentId: '123.456.789-00',
  issuedAt: '2026-08-26T12:00:00.000Z',
  amountCents: 18000,
  compensatedAmountCents: 0,
  balanceCents: 18000,
  currency: 'BRL' as const,
  sourceType: 'manual' as const,
  sourceId: 'receipt-001',
  reference: 'Caixa 1',
  notes: 'Crédito para consulta futura',
  status: 'available' as const,
  createdByUserId: '00000000-0000-0000-0000-000000000002',
  createdAt: '2026-08-26T12:00:00.000Z'
};

const owners = [
  {
    id: payment.ownerId,
    accountId: payment.accountId,
    fullName: 'João Silva',
    documentId: payment.documentId,
    contacts: [],
    financialResponsible: true,
    status: 'active' as const,
    createdAt: '2026-04-20T10:00:00.000Z',
    updatedAt: '2026-04-20T10:00:00.000Z'
  }
];

vi.mock('@/services/advance-payments', () => ({
  advancePaymentsService: {
    list: mocks.listPayments,
    create: mocks.createPayment,
    compensate: mocks.compensatePayment
  }
}));

vi.mock('@/services/owner', () => ({
  ownerService: {
    list: mocks.listOwners
  }
}));

describe('AdvancePaymentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listPayments.mockResolvedValue([payment]);
    mocks.listOwners.mockResolvedValue(owners);
    mocks.createPayment.mockResolvedValue(payment);
    mocks.compensatePayment.mockResolvedValue({
      ...payment,
      compensatedAmountCents: 5000,
      balanceCents: 13000,
      status: 'partially_compensated'
    });
  });

  it('renders persisted advance payments and never derives rows from owner credit balances', async () => {
    const AdvancePaymentsPage = (await import('../AdvancePaymentsPage.vue')).default;
    const wrapper = mount(AdvancePaymentsPage, {
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

    expect(wrapper.text()).toContain('Pagamento Antecipado');
    expect(wrapper.text()).toContain('Gerar Pagamento Antecipado');
    expect(wrapper.text()).toContain('Compensar Selecionado');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('Emissão de');
    expect(wrapper.text()).toContain('Até');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Emissão');
    expect(wrapper.text()).toContain('Total');
    expect(wrapper.text()).toContain('Compensado');
    expect(wrapper.text()).toContain('Saldo');
    expect(wrapper.text()).toContain('Origem');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('João Silva');
    expect(wrapper.text()).toContain('R$\u00A0180,00');
    expect(wrapper.text()).toContain('Manual · receipt-001');
    expect(mocks.listPayments).toHaveBeenCalledWith({});
    expect(mocks.listOwners).not.toHaveBeenCalled();
  });

  it('shows canonical empty and error states', async () => {
    mocks.listPayments.mockResolvedValueOnce([]);
    const AdvancePaymentsPage = (await import('../AdvancePaymentsPage.vue')).default;
    const emptyWrapper = mount(AdvancePaymentsPage);

    await flushPromises();
    expect(emptyWrapper.text()).toContain('Nenhum pagamento antecipado encontrado');

    mocks.listPayments.mockRejectedValueOnce(new Error('Falha em pagamentos'));
    const errorWrapper = mount(AdvancePaymentsPage);

    await flushPromises();
    expect(errorWrapper.text()).toContain('Falha em pagamentos');
  });

  it('opens persisted rows in the owner detail', async () => {
    const AdvancePaymentsPage = (await import('../AdvancePaymentsPage.vue')).default;
    const wrapper = mount(AdvancePaymentsPage, {
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

    const openLinks = wrapper.findAll('a').filter((anchor) => anchor.text() === 'Abrir');
    expect(openLinks).toHaveLength(1);
    expect(openLinks[0].attributes('href')).toBe(`/owners/${payment.ownerId}`);
  });

  it('issues a payment through the canonical command after loading owner options', async () => {
    const AdvancePaymentsPage = (await import('../AdvancePaymentsPage.vue')).default;
    const wrapper = mount(AdvancePaymentsPage);
    await flushPromises();

    const issueButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Gerar Pagamento Antecipado')
    );
    await issueButton?.trigger('click');
    await flushPromises();

    expect(mocks.listOwners).toHaveBeenCalledWith({
      search: '',
      status: 'active',
      page: 1,
      pageSize: 100
    });
    await wrapper.find('#advance-owner').setValue(payment.ownerId);
    await wrapper.find('#advance-amount-cents').setValue('12500');
    await wrapper.find('#advance-source-id').setValue('receipt-002');
    await wrapper.find('#advance-reference').setValue('Caixa 2');
    await wrapper.find('#advance-notes').setValue('Novo crédito');

    const submitButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Registrar recebimento')
    );
    await submitButton?.trigger('click');
    await flushPromises();

    expect(mocks.createPayment).toHaveBeenCalledWith({
      ownerId: payment.ownerId,
      amountCents: 12500,
      sourceId: 'receipt-002',
      reference: 'Caixa 2',
      notes: 'Novo crédito'
    });
  });

  it('compensates exactly one selected persisted payment', async () => {
    const AdvancePaymentsPage = (await import('../AdvancePaymentsPage.vue')).default;
    const wrapper = mount(AdvancePaymentsPage);
    await flushPromises();

    await wrapper.find('input[type="checkbox"]').setValue(true);
    const compensateButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Compensar Selecionado')
    );
    await compensateButton?.trigger('click');
    await flushPromises();

    await wrapper.find('#advance-compensation-reference').setValue('atendimento-001');
    const submitButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Registrar compensação')
    );
    await submitButton?.trigger('click');
    await flushPromises();

    expect(mocks.compensatePayment).toHaveBeenCalledWith(payment.id, {
      amountCents: 18000,
      reference: 'atendimento-001'
    });
  });
});
