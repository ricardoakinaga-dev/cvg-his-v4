import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';

const mockEncounter = {
  id: 'enc-1',
  accountId: 'acc-1',
  patientId: 'pat-1',
  ownerId: 'owner-1',
  visitType: 'walk_in' as const,
  origin: 'reception' as const,
  reason: 'Animal com febre e letargia',
  status: 'reception' as const,
  openedAt: '2024-01-15T10:00:00Z',
  closedAt: undefined,
  closeReason: undefined,
  createdByUserId: 'user-1',
  updatedAt: '2024-01-15T10:00:00Z'
};

const mockTimeline = [
  {
    id: 'evt-1',
    accountId: 'acc-1',
    encounterId: 'enc-1',
    eventType: 'encounter_opened' as const,
    summary: 'Atendimento aberto',
    actorUserId: 'user-1',
    occurredAt: '2024-01-15T10:00:00Z'
  }
];

const mockGetByIdFn = vi.fn().mockResolvedValue(mockEncounter);
const mockGetTimelineFn = vi.fn().mockResolvedValue(mockTimeline);
const mockTransitionFn = vi.fn().mockResolvedValue(mockEncounter);
const mockCloseFn = vi.fn().mockResolvedValue({ ...mockEncounter, status: 'closed' as const });
const mockGetSummaryFn = vi.fn().mockRejectedValue(new Error('summary unavailable'));
const mockGetFinancialSummaryFn = vi.fn().mockRejectedValue(new Error('financial unavailable'));
const mockCloseFinancialFn = vi.fn();
const mockCreateCashReceiptFn = vi.fn();
const mockGetCashReceiptFn = vi.fn();
const mockReverseCashReceiptFn = vi.fn();
const mockGetCashDashboardFn = vi.fn();
const mockGetBillingByEncounterFn = vi.fn();
const mockListBillingItemsFn = vi.fn();
const mockGetPatientName = vi.fn().mockResolvedValue('Rex');
const mockGetOwnerName = vi.fn().mockResolvedValue('Joao Silva');
const mockRouterPush = vi.fn();
const mockRoute = reactive({ params: { id: 'enc-1' }, path: '/encounters/enc-1' });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

vi.mock('@/services/encounter', () => ({
  encounterService: {
    get getById() {
      return mockGetByIdFn;
    },
    get getTimeline() {
      return mockGetTimelineFn;
    },
    get transition() {
      return mockTransitionFn;
    },
    get close() {
      return mockCloseFn;
    },
    get getSummary() {
      return mockGetSummaryFn;
    },
    get getFinancialSummary() {
      return mockGetFinancialSummaryFn;
    },
    get closeFinancial() {
      return mockCloseFinancialFn;
    },
    get createCashReceipt() {
      return mockCreateCashReceiptFn;
    },
    get getCashReceiptForEncounter() {
      return mockGetCashReceiptFn;
    },
    get reverseCashReceipt() {
      return mockReverseCashReceiptFn;
    }
  }
}));

vi.mock('@/services/cash', () => ({
  cashService: {
    get getDashboard() {
      return mockGetCashDashboardFn;
    }
  }
}));

vi.mock('@/services/billing', () => ({
  billingService: {
    get getByEncounter() {
      return mockGetBillingByEncounterFn;
    },
    get listItems() {
      return mockListBillingItemsFn;
    }
  }
}));

vi.mock('@/composables/useEntityCache', () => ({
  useEntityCache: () => ({
    getPatientName: mockGetPatientName,
    getOwnerName: mockGetOwnerName,
    getUserName: vi.fn().mockResolvedValue(''),
    preloadUserNames: vi.fn().mockResolvedValue(undefined),
    loading: new Set()
  })
}));

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({
    push: mockRouterPush
  })
}));

describe('EncounterDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute.params.id = 'enc-1';
    mockRoute.path = '/encounters/enc-1';
    mockGetByIdFn.mockResolvedValue(mockEncounter);
    mockGetTimelineFn.mockResolvedValue(mockTimeline);
    mockTransitionFn.mockResolvedValue(mockEncounter);
    mockCloseFn.mockResolvedValue({ ...mockEncounter, status: 'closed' as const });
    mockGetSummaryFn.mockRejectedValue(new Error('summary unavailable'));
    mockGetFinancialSummaryFn.mockRejectedValue(new Error('financial unavailable'));
    mockCloseFinancialFn.mockResolvedValue({ balanceDue: 125.5 });
    mockCreateCashReceiptFn.mockResolvedValue({ id: 'receipt-1' });
    mockGetCashReceiptFn.mockRejectedValue(
      Object.assign(new Error('Cash receipt not found'), { status: 404 })
    );
    mockReverseCashReceiptFn.mockResolvedValue({
      id: 'reversal-1',
      accountId: 'acc-1',
      receiptId: 'receipt-1',
      encounterId: 'enc-1',
      billingRecordId: 'billing-1',
      financialAccountId: 'financial-1',
      receivableId: 'receivable-1',
      receivablePaymentId: 'payment-1',
      originalCashRegisterId: 'register-1',
      reversalCashRegisterId: 'register-1',
      originalCashMovementId: 'movement-1',
      reversalCashMovementId: 'movement-2',
      originalJournalEntryId: 'journal-1',
      reversalJournalEntryId: 'journal-2',
      amount: 125.5,
      currency: 'BRL',
      reason: 'Correção operacional',
      reversedByUserId: 'user-1',
      reversedAt: '2024-01-15T11:00:00Z'
    });
    mockGetCashDashboardFn.mockResolvedValue({
      openRegister: { id: 'register-1' }
    });
    mockGetBillingByEncounterFn.mockResolvedValue({ status: 'open' });
    mockListBillingItemsFn.mockResolvedValue([]);
    mockGetPatientName.mockResolvedValue('Rex');
    mockGetOwnerName.mockResolvedValue('Joao Silva');
    mockRouterPush.mockResolvedValue(undefined);
  });

  it('shows loading state initially', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    expect(wrapper.find('.page-loading').exists()).toBe(true);
  });

  it('shows error state when API fails to load encounter', async () => {
    mockGetByIdFn.mockRejectedValue(new Error('Atendimento nao encontrado'));

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage, {
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
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Atendimento nao encontrado');
  });

  it('renders encounter details when loaded', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Atendimento clínico');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Joao Silva');
    expect(wrapper.text()).toContain('Animal com febre e letargia');
  });

  it('exposes encounter workflow steps as an accessible tab sequence', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();

    const tabs = wrapper.findAll('[role="tab"]');
    expect(wrapper.get('[role="tablist"]').attributes('aria-label')).toBe('Etapas do atendimento');
    expect(tabs).toHaveLength(6);
    expect(tabs[0].attributes('aria-selected')).toBe('true');
    expect(tabs.every((tab) => tab.attributes('aria-controls') === 'encounter-workflow-panel')).toBe(true);
    expect(wrapper.find('#encounter-workflow-panel').exists()).toBe(true);
    expect(tabs[0].attributes('tabindex')).toBe('0');
    expect(tabs[1].attributes('tabindex')).toBe('-1');
    expect(wrapper.get('[role="tabpanel"]').attributes('aria-labelledby')).toBe(
      'encounter-workflow-tab-summary'
    );

    await tabs[0].trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toContain('Orçamento');
    expect(wrapper.get('[role="tabpanel"]').attributes('aria-labelledby')).toBe(
      'encounter-workflow-tab-quote'
    );

    await wrapper.find('[role="tab"][aria-selected="true"]').trigger('keydown', { key: 'Home' });
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toContain('Resumo');
  });

  it('keeps the clinical record as the primary encounter action', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage, {
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

    const clinicalRecordLinks = wrapper
      .findAll('a')
      .filter((link) => link.text().includes('Continuar prontuário'));
    expect(clinicalRecordLinks.length).toBeGreaterThan(0);
    expect(
      clinicalRecordLinks.some((link) => link.attributes('href') === '/medical-records/enc-1')
    ).toBe(true);
    expect(wrapper.findAll('a').some((link) => link.text().includes('Cobrança'))).toBe(true);
  });

  it('shows status badge with correct label', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Recep');
  });

  it('shows visit type label', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Walk-in');
  });

  it('shows origin label', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Recep');
  });

  it('shows timeline events when loaded', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Timeline');
    expect(wrapper.text()).toContain('Atendimento aberto');
  });

  it('shows empty timeline message when no events', async () => {
    mockGetTimelineFn.mockResolvedValue([]);

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum evento registrado');
  });

  it('shows transition button for non-closed encounters', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const transitionBtn = wrapper.findAll('button').find((b) => b.text().includes('Transicionar'));
    expect(transitionBtn).toBeTruthy();
  });

  it('does not show transition button for closed encounters', async () => {
    mockGetByIdFn.mockResolvedValue({ ...mockEncounter, status: 'closed' as const });

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const transitionBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Transicionar Status'));
    expect(transitionBtn).toBeFalsy();
  });

  it('shows close button for non-closed encounters', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('Fechar Atendimento'));
    expect(closeBtn).toBeTruthy();
  });

  it('shows transition modal with available options when clicked', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const transitionBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Transicionar Status'));
    await transitionBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Transicionar Status');
    const options = wrapper.findAll('.transition-options .ds-btn');
    expect(options.length).toBeGreaterThan(0);
  });

  it('transitions status when option is selected', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const transitionBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Transicionar Status'));
    await transitionBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const options = wrapper.findAll('.transition-options .ds-btn');
    await options[0].trigger('click');
    await flushPromises();

    expect(mockTransitionFn).toHaveBeenCalledWith('enc-1', { nextStatus: expect.any(String) });
  });

  it('shows close modal when close button is clicked', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('Fechar Atendimento'));
    await closeBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Fechar Atendimento');
    expect(wrapper.find('#closeReason').exists()).toBe(true);
  });

  it('shows a reception pre-handoff review without automatic handoff', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage, {
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

    const closeTab = wrapper
      .findAll('.workflow-tab')
      .find((button) => button.text().includes('Fechamento'));
    await closeTab!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Pré-handoff para recepção');
    expect(wrapper.text()).toContain(
      'Este bloco orienta a conferência; não envia o caso automaticamente para a recepção.'
    );
    expect(wrapper.text()).toContain('Animal com febre e letargia');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Joao Silva');
    expect(wrapper.findAll('a').some((link) => link.text().includes('Prontuário'))).toBe(true);
    expect(wrapper.findAll('a').some((link) => link.text().includes('Prescrições'))).toBe(true);
    expect(mockCloseFn).not.toHaveBeenCalled();
  });

  it('closes encounter with reason', async () => {
    const freshEncounter = { ...mockEncounter, status: 'reception' as const };
    mockGetByIdFn.mockResolvedValue(freshEncounter);

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('Fechar Atendimento'));
    await closeBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const textarea = wrapper.find('#closeReason');
    await textarea.setValue('Paciente recebeu alta');

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Fechar'));
    await submitBtn!.trigger('click');
    await flushPromises();

    expect(mockCloseFn).toHaveBeenCalledWith('enc-1', { closeReason: 'Paciente recebeu alta' });
    expect(wrapper.text()).toContain('Finalizado');
  });

  it('disables close button when reason is empty', async () => {
    const freshEncounter = { ...mockEncounter, status: 'reception' as const };
    mockGetByIdFn.mockResolvedValue(freshEncounter);

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('Fechar Atendimento'));
    await closeBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Fechar'));
    expect(submitBtn!.attributes('disabled')).toBeDefined();
  });

  it('shows error alert when close fails', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockCloseFn.mockRejectedValue(new Error('Erro ao fechar'));
    const freshEncounter = { ...mockEncounter, status: 'reception' as const };
    mockGetByIdFn.mockResolvedValue(freshEncounter);

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('Fechar Atendimento'));
    await closeBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const textarea = wrapper.find('#closeReason');
    await textarea.setValue('Motivo');

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Fechar'));
    await submitBtn!.trigger('click');
    await flushPromises();

    expect(alertMock).toHaveBeenCalledWith('Erro ao fechar');
    alertMock.mockRestore();
  });

  it('disables close button when reason is empty', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('Fechar Atendimento'));
    await closeBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Fechar'));
    expect(submitBtn!.attributes('disabled')).toBeDefined();
  });

  it('shows error alert when close fails', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockCloseFn.mockRejectedValue(new Error('Erro ao fechar'));

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('Fechar Atendimento'));
    await closeBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const textarea = wrapper.find('#closeReason');
    await textarea.setValue('Motivo');

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Fechar'));
    await submitBtn!.trigger('click');
    await flushPromises();

    expect(alertMock).toHaveBeenCalledWith('Erro ao fechar');
    alertMock.mockRestore();
  });

  it('shows back link to encounters list', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage, {
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
    const backLink = wrapper.findAll('a').find((a) => a.text() === 'Voltar');
    expect(backLink).toBeTruthy();
    expect(backLink!.attributes('href')).toBe('/encounters');
  });

  it('shows close reason section when present', async () => {
    mockGetByIdFn.mockResolvedValue({
      ...mockEncounter,
      status: 'closed' as const,
      closeReason: 'Paciente recebeu alta medica'
    });

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Motivo do Fechamento');
    expect(wrapper.text()).toContain('Paciente recebeu alta medica');
  });

  it('closes the financial account without sending a ghost paid amount', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);
    await flushPromises();

    const closeTab = wrapper
      .findAll('.workflow-tab')
      .find((button) => button.text().includes('Fechamento'));
    await closeTab!.trigger('click');
    const financialButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Fechar Financeiro'));
    await financialButton!.trigger('click');
    await wrapper.find('#financialNotes').setValue('Parcela única');

    expect(wrapper.find('#financialPaidAmount').exists()).toBe(false);
    const confirm = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((button) => button.text().includes('Confirmar fechamento'));
    await confirm!.trigger('click');
    await flushPromises();

    expect(mockCloseFinancialFn).toHaveBeenCalledWith('enc-1', { notes: 'Parcela única' });
  });

  it('records closed encounter cash through the open drawer and an idempotency key', async () => {
    const closedEncounter = { ...mockEncounter, status: 'closed' as const };
    const financial = {
      encounterId: 'enc-1',
      total: 125.5,
      paidAmount: 0,
      balanceDue: 125.5,
      financialStatus: 'pending'
    };
    mockGetByIdFn.mockResolvedValue(closedEncounter);
    mockGetSummaryFn
      .mockResolvedValueOnce({
        financial,
        diagnostics: { totalOrders: 0, pendingOrders: 0, releasedResults: 0 }
      })
      .mockResolvedValue({
        financial: {
          ...financial,
          paidAmount: 125.5,
          balanceDue: 0,
          financialStatus: 'paid'
        },
        diagnostics: { totalOrders: 0, pendingOrders: 0, releasedResults: 0 }
      });
    mockGetBillingByEncounterFn
      .mockResolvedValueOnce({ status: 'open' })
      .mockResolvedValue({ status: 'settled' });
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);
    await flushPromises();

    const closeTab = wrapper
      .findAll('.workflow-tab')
      .find((button) => button.text().includes('Fechamento'));
    await closeTab!.trigger('click');
    const receiptButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Receber em dinheiro'));
    await receiptButton!.trigger('click');
    await flushPromises();

    expect(mockGetCashDashboardFn).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toMatch(/R\$\s125,50/u);
    const confirm = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((button) => button.text().includes('Confirmar recebimento'));
    await confirm!.trigger('click');
    await flushPromises();

    expect(mockCreateCashReceiptFn).toHaveBeenCalledWith(
      'enc-1',
      { cashRegisterId: 'register-1', expectedAmount: 125.5, notes: undefined },
      expect.any(String)
    );
    expect(mockGetSummaryFn).toHaveBeenCalledTimes(2);
    expect(mockGetBillingByEncounterFn).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toMatch(/R\$\s*0,00/u);
  });

  it('loads a cash receipt and requires an explicit idempotent reversal', async () => {
    const closedEncounter = { ...mockEncounter, status: 'closed' as const };
    const financial = {
      encounterId: 'enc-1',
      total: 125.5,
      paidAmount: 125.5,
      balanceDue: 0,
      financialStatus: 'paid'
    };
    mockGetByIdFn.mockResolvedValue(closedEncounter);
    mockGetSummaryFn.mockResolvedValue({
      financial,
      diagnostics: { totalOrders: 0, pendingOrders: 0, releasedResults: 0 }
    });
    mockGetBillingByEncounterFn.mockResolvedValue({ status: 'settled' });
    mockGetCashReceiptFn.mockResolvedValue({
      id: 'receipt-1',
      accountId: 'acc-1',
      encounterId: 'enc-1',
      billingRecordId: 'billing-1',
      financialAccountId: 'financial-1',
      receivableId: 'receivable-1',
      receivablePaymentId: 'payment-1',
      cashRegisterId: 'register-1',
      cashMovementId: 'movement-1',
      journalEntryId: 'journal-1',
      amount: 125.5,
      currency: 'BRL',
      receivedAt: '2024-01-15T10:30:00Z',
      receivedByUserId: 'user-1'
    });

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);
    await flushPromises();

    await wrapper
      .findAll('.workflow-tab')
      .find((button) => button.text().includes('Fechamento'))!
      .trigger('click');
    await flushPromises();

    expect(mockGetCashReceiptFn).toHaveBeenCalledWith('enc-1', { includeReversed: true });
    expect(wrapper.text()).toContain('Recebimento confirmado');
    expect(wrapper.text()).toContain('receipt-1');

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Solicitar estorno'))!
      .trigger('click');
    await wrapper.find('#cashReversalReason').setValue('Correção operacional');
    await wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((button) => button.text().includes('Confirmar estorno'))!
      .trigger('click');
    await flushPromises();

    expect(mockReverseCashReceiptFn).toHaveBeenCalledWith(
      'enc-1',
      'receipt-1',
      'Correção operacional',
      expect.any(String)
    );
    expect(wrapper.text()).toContain('Estorno confirmado');
    expect(wrapper.text()).toContain('Nenhum novo recebimento foi criado');

    mockGetCashReceiptFn.mockRejectedValueOnce(
      Object.assign(new Error('Active cash receipt not found'), { status: 404 })
    );
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Atualizar recebimento'))!
      .trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Estorno confirmado');
    expect(wrapper.text()).toContain('Não foi possível reler o recebimento agora');
  });

  it('reuses the reversal idempotency key after a transient failure', async () => {
    const closedEncounter = { ...mockEncounter, status: 'closed' as const };
    mockGetByIdFn.mockResolvedValue(closedEncounter);
    mockGetSummaryFn.mockResolvedValue({
      financial: {
        encounterId: 'enc-1',
        total: 125.5,
        paidAmount: 125.5,
        balanceDue: 0,
        financialStatus: 'paid'
      },
      diagnostics: { totalOrders: 0, pendingOrders: 0, releasedResults: 0 }
    });
    mockGetBillingByEncounterFn.mockResolvedValue({ status: 'settled' });
    mockGetCashReceiptFn.mockResolvedValue({
      id: 'receipt-1',
      accountId: 'acc-1',
      encounterId: 'enc-1',
      billingRecordId: 'billing-1',
      financialAccountId: 'financial-1',
      receivableId: 'receivable-1',
      receivablePaymentId: 'payment-1',
      cashRegisterId: 'register-1',
      cashMovementId: 'movement-1',
      journalEntryId: 'journal-1',
      amount: 125.5,
      currency: 'BRL',
      receivedAt: '2024-01-15T10:30:00Z',
      receivedByUserId: 'user-1'
    });
    mockReverseCashReceiptFn
      .mockRejectedValueOnce(new Error('Falha transitória no livro financeiro'))
      .mockResolvedValueOnce({
        id: 'reversal-1',
        accountId: 'acc-1',
        receiptId: 'receipt-1',
        encounterId: 'enc-1',
        billingRecordId: 'billing-1',
        financialAccountId: 'financial-1',
        receivableId: 'receivable-1',
        receivablePaymentId: 'payment-1',
        originalCashRegisterId: 'register-1',
        reversalCashRegisterId: 'register-1',
        originalCashMovementId: 'movement-1',
        reversalCashMovementId: 'movement-2',
        originalJournalEntryId: 'journal-1',
        reversalJournalEntryId: 'journal-2',
        amount: 125.5,
        currency: 'BRL',
        reason: 'Correção operacional',
        reversedByUserId: 'user-1',
        reversedAt: '2024-01-15T11:00:00Z'
      });

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);
    await flushPromises();
    await wrapper
      .findAll('.workflow-tab')
      .find((button) => button.text().includes('Fechamento'))!
      .trigger('click');
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Solicitar estorno'))!
      .trigger('click');
    await wrapper.find('#cashReversalReason').setValue('Correção operacional');

    await wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((button) => button.text().includes('Confirmar estorno'))!
      .trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('A mesma chave será reaproveitada');
    const firstKey = mockReverseCashReceiptFn.mock.calls[0]?.[3];
    expect(firstKey).toEqual(expect.any(String));

    await wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((button) => button.text().includes('Confirmar estorno'))!
      .trigger('click');
    await flushPromises();

    expect(mockReverseCashReceiptFn).toHaveBeenCalledTimes(2);
    expect(mockReverseCashReceiptFn.mock.calls[1]?.[3]).toBe(firstKey);
    expect(wrapper.text()).toContain('Estorno confirmado');
  });

  it('directs an estimated billing record to opening before offering cash receipt', async () => {
    mockGetByIdFn.mockResolvedValue({ ...mockEncounter, status: 'closed' as const });
    mockGetSummaryFn.mockResolvedValue({
      financial: {
        encounterId: 'enc-1',
        total: 125.5,
        paidAmount: 0,
        balanceDue: 125.5,
        financialStatus: 'pending'
      },
      diagnostics: { totalOrders: 0, pendingOrders: 0, releasedResults: 0 }
    });
    mockGetBillingByEncounterFn.mockResolvedValue({ status: 'estimated' });
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);
    await flushPromises();

    await wrapper
      .findAll('.workflow-tab')
      .find((button) => button.text().includes('Fechamento'))!
      .trigger('click');

    expect(
      wrapper.findAll('button').some((button) => button.text().includes('Receber em dinheiro'))
    ).toBe(false);
    const openBilling = wrapper.findAll('a').find((link) => link.text().includes('Abrir cobrança'));
    expect(openBilling).toBeTruthy();
    expect(openBilling!.attributes('href')).toBe('/billing/enc-1');
  });

  it('reuses the same receipt key when a committed response may have been lost', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockGetByIdFn.mockResolvedValue({ ...mockEncounter, status: 'closed' as const });
    mockGetSummaryFn.mockResolvedValue({
      financial: {
        encounterId: 'enc-1',
        total: 125.5,
        paidAmount: 0,
        balanceDue: 125.5,
        financialStatus: 'pending'
      },
      diagnostics: { totalOrders: 0, pendingOrders: 0, releasedResults: 0 }
    });
    mockCreateCashReceiptFn
      .mockRejectedValueOnce(new Error('Conexão interrompida'))
      .mockResolvedValueOnce({ id: 'receipt-1' });
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);
    await flushPromises();

    await wrapper
      .findAll('.workflow-tab')
      .find((button) => button.text().includes('Fechamento'))!
      .trigger('click');
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Receber em dinheiro'))!
      .trigger('click');
    await flushPromises();
    const confirm = () =>
      wrapper
        .findAll('.ds-modal__footer .ds-btn')
        .find((button) => button.text().includes('Confirmar recebimento'))!;

    await confirm().trigger('click');
    await flushPromises();
    await confirm().trigger('click');
    await flushPromises();

    const firstKey = mockCreateCashReceiptFn.mock.calls[0]?.[2];
    const retryKey = mockCreateCashReceiptFn.mock.calls[1]?.[2];
    expect(firstKey).toEqual(expect.any(String));
    expect(retryKey).toBe(firstKey);
    alertMock.mockRestore();
  });

  it('reloads the current encounter and ignores a late previous response after a route switch', async () => {
    const first = deferred<typeof mockEncounter>();
    const secondEncounter = {
      ...mockEncounter,
      id: 'enc-2',
      patientId: 'pat-2',
      ownerId: 'owner-2',
      reason: 'Consulta Luna',
      visitType: 'scheduled' as const,
      origin: 'schedule' as const
    };
    mockGetByIdFn.mockImplementation((id: string) => id === 'enc-1' ? first.promise : Promise.resolve(secondEncounter));
    mockGetPatientName.mockImplementation((id: string) => Promise.resolve(id === 'pat-2' ? 'Luna' : 'Rex'));
    mockGetOwnerName.mockImplementation((id: string) => Promise.resolve(id === 'owner-2' ? 'Marina Costa' : 'Joao Silva'));

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);
    expect(wrapper.find('.page-loading').exists()).toBe(true);

    mockRoute.params.id = 'enc-2';
    mockRoute.path = '/encounters/enc-2';
    await flushPromises();
    expect(wrapper.text()).toContain('Consulta Luna');
    expect(wrapper.text()).toContain('Luna');

    first.resolve(mockEncounter);
    await flushPromises();
    expect(wrapper.text()).not.toContain('Consulta Rex');
    expect(wrapper.text()).not.toContain('Joao Silva');
  });

  it('rejects a successful encounter response whose identity differs from the route', async () => {
    mockRoute.params.id = 'enc-expected';
    mockRoute.path = '/encounters/enc-expected';
    mockGetByIdFn.mockResolvedValue({ ...mockEncounter, id: 'enc-other' });

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('não corresponde ao endereço solicitado');
  });
});
