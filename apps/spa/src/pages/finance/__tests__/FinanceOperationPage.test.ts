import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FinanceOperationPage from '../FinanceOperationPage.vue';
import { billingService } from '@/services/billing';
import { expensesCatalogService } from '@/services/expensesCatalog';
import { quoteService } from '@/services/quotes';

vi.mock('@/services/billing', () => ({
  billingService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/expensesCatalog', () => ({
  expensesCatalogService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/quotes', () => ({
  quoteService: {
    list: vi.fn()
  }
}));

describe('FinanceOperationPage', () => {
  beforeEach(() => {
    vi.mocked(expensesCatalogService.list).mockResolvedValue({
      items: [
        {
          id: 'exp-1',
          name: 'Fornecedor de medicamentos',
          kind: 'Operacional',
          category: 'Compras',
          costCenterCode: 'EST',
          costCenterName: 'Estoque',
          description: 'Pagamento recorrente de fornecedor'
        }
      ],
      categories: ['Compras'],
      costCenters: [],
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
      sort: 'name',
      order: 'asc'
    });
    vi.mocked(billingService.list).mockResolvedValue([
      {
        id: 'bill-1',
        accountId: 'acc-1',
        encounterId: 'enc-1',
        patientId: 'pat-1',
        ownerId: 'own-1',
        status: 'open',
        subtotalAmount: 120,
        currency: 'BRL',
        createdAt: '2026-04-24T00:00:00.000Z',
        updatedAt: '2026-04-24T00:00:00.000Z'
      }
    ]);
    vi.mocked(quoteService.list).mockResolvedValue([
      {
        id: 'quote-1',
        accountId: 'acc-1',
        number: 'ORC-1',
        ownerId: 'own-1',
        status: 'approved',
        validUntil: null,
        subtotal: 100,
        discountAmount: 0,
        total: 100,
        notes: null,
        createdByUserId: 'user-1',
        convertedToSaleId: null,
        convertedAt: null,
        createdAt: '2026-04-24T00:00:00.000Z',
        updatedAt: '2026-04-24T00:00:00.000Z'
      }
    ]);
  });

  it.each([
    ['accounts-payable', 'Contas a Pagar', 'Fornecedor de medicamentos'],
    ['cash-flow', 'Fluxo de Caixa', 'Recebível bill-1'],
    ['cheques', 'Cheques', 'Decisão formal de escopo']
  ] as const)('renders %s mode with API-backed finance data', async (mode, title, expectedText) => {
    const wrapper = mount(FinanceOperationPage, {
      props: { mode },
      global: {
        stubs: {
          AppPageHeader: {
            props: ['title', 'subtitle', 'breadcrumbs'],
            template: '<header><h1>{{ title }}</h1><p>{{ subtitle }}</p><span>{{ breadcrumbs.join("/") }}</span><slot name="actions" /></header>'
          }
        }
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain(title);
    expect(wrapper.text()).toContain(expectedText);
    expect(expensesCatalogService.list).toHaveBeenCalled();
    expect(billingService.list).toHaveBeenCalled();
    expect(quoteService.list).toHaveBeenCalled();
  });
});
