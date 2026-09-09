import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CashPage from '../CashPage.vue';
import { cashService, type CashDrawerDashboard } from '@/services/cash';

vi.mock('@/services/cash', () => ({
  cashService: {
    getDashboard: vi.fn(),
    openRegister: vi.fn(),
    recordMovement: vi.fn(),
    getReconciliation: vi.fn(),
    closeRegister: vi.fn()
  }
}));

function mountPage() {
  return mount(CashPage, {
    global: {
      stubs: {
        AppPageHeader: {
          props: ['title', 'subtitle', 'breadcrumbs'],
          template:
            '<header><h1>{{ title }}</h1><p>{{ subtitle }}</p><span>{{ breadcrumbs.join("/") }}</span><slot name="actions" /></header>'
        }
      }
    }
  });
}

function makeDashboard(overrides: Partial<CashDrawerDashboard> = {}): CashDrawerDashboard {
  return {
    generatedAt: '2026-04-29T12:00:00.000Z',
    openRegister: {
      id: 'cr-1',
      status: 'open',
      openedAt: '2026-04-29T08:00:00.000Z',
      openingAmount: 120,
      runningBalance: 200,
      notes: 'Abertura do dia'
    },
    lastClosedRegister: null,
    totals: {
      totalEntradas: 200,
      totalSaidas: 0,
      totalEmGaveta: 200
    },
    byPaymentMethod: [
      {
        method: 'Dinheiro',
        amount: 200,
        count: 2
      }
    ],
    movements: [
      {
        id: 'cm-1',
        cashRegisterId: 'cr-1',
        movementType: 'opening',
        movementTypeLabel: 'Abertura',
        amount: 120,
        runningBalance: 120,
        reference: null,
        notes: 'Abertura do dia',
        paymentMethod: 'Dinheiro',
        createdAt: '2026-04-29T08:00:00.000Z'
      }
    ],
    recentRegisters: [],
    ...overrides
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe('CashPage', () => {
  beforeEach(() => {
    vi.mocked(cashService.getDashboard).mockReset().mockResolvedValue(makeDashboard());
    vi.mocked(cashService.openRegister).mockReset().mockResolvedValue(undefined);
    vi.mocked(cashService.recordMovement).mockReset().mockResolvedValue(undefined);
    vi.mocked(cashService.getReconciliation).mockReset().mockResolvedValue({
      registerId: 'cr-1',
      accountId: 'account-1',
      status: 'open',
      openingAmount: 120,
      expectedAmount: 200,
      declaredAmount: null,
      difference: null,
      totalIn: 80,
      totalOut: 0,
      movementCount: 2,
      reconciledAt: '2026-04-29T12:00:00.000Z'
    });
    vi.mocked(cashService.closeRegister).mockReset().mockResolvedValue(undefined);
  });

  it('renders a Vetus-like Gaveta screen instead of the old quotes/PIX panel', async () => {
    const wrapper = mountPage();

    await flushPromises();

    expect(wrapper.text()).toContain('Gaveta');
    expect(wrapper.text()).toContain('Último Fechamento');
    expect(wrapper.text()).toContain('Total de Entradas');
    expect(wrapper.text()).toContain('Total de Saídas');
    expect(wrapper.text()).toContain('Total em Gaveta');
    expect(wrapper.text()).toContain('Entrada de Gaveta');
    expect(wrapper.text()).toContain('Saída de Gaveta');
    expect(wrapper.text()).toContain('Depósito Bancário');
    expect(wrapper.text()).toContain('Fechar Gaveta');
    expect(wrapper.text()).toContain('Gaveta por Forma de Pagamento');
    expect(wrapper.text()).toContain('Extrato de Movimentações da Gaveta');
    expect(wrapper.text()).toContain('Dinheiro');
    expect(wrapper.text()).not.toContain('Orçamentos com impacto de caixa');
    expect(wrapper.findAll('.cash-actions form button').every((button) => button.attributes('type') === 'submit')).toBe(true);
    expect(cashService.getDashboard).toHaveBeenCalled();
  });

  it('does not present zero-valued totals while the first dashboard request is pending', async () => {
    const request = deferred<CashDrawerDashboard>();
    vi.mocked(cashService.getDashboard).mockReset().mockReturnValueOnce(request.promise);
    const wrapper = mountPage();

    expect(wrapper.find('.cash-kpis').attributes('aria-busy')).toBe('true');
    expect(wrapper.find('.cash-loading-state').exists()).toBe(true);
    expect(wrapper.findAll('.ds-stat-card__value').map((card) => card.text())).toEqual(['…', '…', '…', '…']);
    expect(wrapper.text()).not.toContain('R$ 0,00');

    request.resolve(makeDashboard());
    await flushPromises();
    expect(wrapper.find('.cash-loading-state').exists()).toBe(false);
    expect(wrapper.text()).toContain('R$\u00a0200,00');
  });

  it('keeps the movement draft after failure and ignores a duplicate submit while pending', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const entryForm = wrapper.findAll('form')[0];
    const amount = entryForm.find('input[type="number"]');
    await amount.setValue('50');
    vi.mocked(cashService.recordMovement).mockRejectedValueOnce(new Error('Falha sintética ao registrar entrada.'));

    await entryForm.trigger('submit');
    await flushPromises();

    expect(cashService.recordMovement).toHaveBeenCalledTimes(1);
    expect(amount.element).toHaveProperty('value', '50');
    expect(wrapper.text()).toContain('Falha sintética ao registrar entrada.');
    expect(wrapper.text()).not.toContain('Entrada de gaveta registrada.');

    const pending = deferred<void>();
    vi.mocked(cashService.recordMovement).mockReturnValueOnce(pending.promise);
    vi.mocked(cashService.getDashboard).mockResolvedValueOnce(makeDashboard({
      totals: { totalEntradas: 250, totalSaidas: 0, totalEmGaveta: 250 }
    }));
    await entryForm.trigger('submit');
    await flushPromises();
    expect(entryForm.attributes('aria-busy')).toBe('true');
    expect(amount.attributes('disabled')).toBeDefined();

    await entryForm.trigger('submit');
    expect(cashService.recordMovement).toHaveBeenCalledTimes(2);
    pending.resolve();
    await flushPromises();

    expect(wrapper.text()).toContain('Entrada de gaveta registrada.');
    expect(amount.element).toHaveProperty('value', '0');
  });

  it('requires explicit confirmation before closing and shows the confirmed state only after reload', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const closeForm = wrapper.findAll('form')[3];

    await closeForm.trigger('submit');
    await flushPromises();
    expect(wrapper.get('[role="dialog"]').text()).toContain('Confirmar fechamento da gaveta');
    expect(cashService.closeRegister).not.toHaveBeenCalled();

    const cancel = wrapper.findAll('button').find((button) => button.text() === 'Cancelar');
    await cancel?.trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);

    await closeForm.trigger('submit');
    await flushPromises();
    vi.mocked(cashService.closeRegister).mockResolvedValueOnce(undefined);
    vi.mocked(cashService.getDashboard).mockResolvedValueOnce(makeDashboard({
      openRegister: null,
      totals: { totalEntradas: 0, totalSaidas: 0, totalEmGaveta: 0 },
      byPaymentMethod: [],
      movements: []
    }));
    const confirm = wrapper.findAll('button').find((button) => button.text() === 'Confirmar fechamento');
    await confirm?.trigger('click');
    await flushPromises();

    expect(cashService.closeRegister).toHaveBeenCalledWith(
      { closingAmount: 200, notes: null },
      { idempotencyKey: expect.stringMatching(/^cash-close-/) }
    );
    expect(wrapper.text()).toContain('Gaveta fechada.');
    expect(wrapper.text()).toContain('Abrir Gaveta');
  });

  it('labels a timed-out command as unconfirmed instead of showing a success state', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const entryForm = wrapper.findAll('form')[0];
    await entryForm.find('input[type="number"]').setValue('50');
    vi.mocked(cashService.recordMovement).mockRejectedValueOnce(new Error('Request timed out'));

    await entryForm.trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Tempo limite excedido');
    expect(wrapper.text()).toContain('não foi confirmada');
    expect(wrapper.text()).not.toContain('Entrada de gaveta registrada.');
    expect(wrapper.findAll('button').some((button) => button.text() === 'Entrada')).toBe(true);
  });

  it('retries an uncertain command with the same idempotency key', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const entryForm = wrapper.findAll('form')[0];
    await entryForm.find('input[type="number"]').setValue('50');
    vi.mocked(cashService.recordMovement)
      .mockRejectedValueOnce(new Error('Request timed out'))
      .mockResolvedValueOnce(undefined);

    await entryForm.trigger('submit');
    await flushPromises();
    const retry = wrapper.findAll('button').find((button) => button.text() === 'Reconsultar operação');
    expect(retry).toBeTruthy();
    await retry!.trigger('click');
    await flushPromises();

    expect(cashService.recordMovement).toHaveBeenCalledTimes(2);
    const firstKey = vi.mocked(cashService.recordMovement).mock.calls[0]?.[1]?.idempotencyKey;
    const retryKey = vi.mocked(cashService.recordMovement).mock.calls[1]?.[1]?.idempotencyKey;
    expect(retryKey).toBe(firstKey);
    expect(wrapper.text()).toContain('Entrada de gaveta registrada.');
  });
});
