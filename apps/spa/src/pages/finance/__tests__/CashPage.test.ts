import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CashPage from '../CashPage.vue';
import { cashService } from '@/services/cash';

vi.mock('@/services/cash', () => ({
  cashService: {
    getDashboard: vi.fn(),
    openRegister: vi.fn(),
    recordMovement: vi.fn(),
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

describe('CashPage', () => {
  beforeEach(() => {
    vi.mocked(cashService.getDashboard).mockResolvedValue({
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
      recentRegisters: []
    });
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
    expect(wrapper.text()).toContain('Fechar Gaveta');
    expect(wrapper.text()).toContain('Gaveta por Forma de Pagamento');
    expect(wrapper.text()).toContain('Extrato de Movimentações da Gaveta');
    expect(wrapper.text()).toContain('Dinheiro');
    expect(wrapper.text()).not.toContain('Orçamentos com impacto de caixa');
    expect(cashService.getDashboard).toHaveBeenCalled();
  });
});
