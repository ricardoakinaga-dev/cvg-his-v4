import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSales = [
  {
    id: 'sale-1',
    accountId: 'acc-1',
    number: 'CMD-001',
    ownerId: 'owner-1',
    status: 'closed',
    subtotal: 200,
    discountAmount: 0,
    total: 200,
    paidAmount: 200,
    balanceDue: 0,
    notes: 'Tutor Maria',
    openedByUserId: 'user-1',
    closedByUserId: 'user-2',
    closedAt: '2026-04-20T10:00:00.000Z',
    createdAt: '2026-04-20T09:00:00.000Z',
    updatedAt: '2026-04-20T10:00:00.000Z'
  },
  {
    id: 'sale-2',
    accountId: 'acc-1',
    number: 'CMD-002',
    ownerId: 'owner-2',
    status: 'open',
    subtotal: 90,
    discountAmount: 0,
    total: 90,
    paidAmount: 0,
    balanceDue: 90,
    notes: null,
    openedByUserId: 'user-1',
    closedByUserId: null,
    closedAt: null,
    createdAt: '2026-04-21T09:00:00.000Z',
    updatedAt: '2026-04-21T09:00:00.000Z'
  }
];

const mockDetails = {
  'sale-1': {
    ...mockSales[0],
    items: [],
    payments: [
      {
        id: 'pay-check-1',
        counterSaleId: 'sale-1',
        accountId: 'acc-1',
        method: 'check',
        amount: 200,
        installments: 1,
        reference: 'CHQ-12345',
        notes: 'Banco Vetus, bom para 30/04',
        createdAt: '2026-04-20T10:00:00.000Z'
      }
    ]
  },
  'sale-2': {
    ...mockSales[1],
    items: [],
    payments: []
  }
};

const mockListSales = vi.fn();
const mockGetById = vi.fn();

vi.mock('@/services/counterSales', () => ({
  counterSalesService: {
    get list() {
      return mockListSales;
    },
    get getById() {
      return mockGetById;
    }
  }
}));

describe('ChequesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListSales.mockResolvedValue(mockSales);
    mockGetById.mockImplementation((id: keyof typeof mockDetails) => Promise.resolve(mockDetails[id]));
  });

  it('renders a Vetus-like checks page from counter sale check payments', async () => {
    const ChequesPage = (await import('../ChequesPage.vue')).default;
    const wrapper = mount(ChequesPage, {
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

    expect(wrapper.text()).toContain('Cheques');
    expect(wrapper.text()).toContain('Cadastrar Cheque');
    expect(wrapper.text()).toContain('Baixar Cheques Em Lote');
    expect(wrapper.text()).toContain('Cliente/Referência');
    expect(wrapper.text()).toContain('Vencimento de');
    expect(wrapper.text()).toContain('Até');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Tipo');
    expect(wrapper.text()).toContain('Referência');
    expect(wrapper.text()).toContain('Emissão');
    expect(wrapper.text()).toContain('Vencimento');
    expect(wrapper.text()).toContain('Valor');
    expect(wrapper.text()).toContain('Origem');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('CHQ-12345');
    expect(wrapper.text()).toContain('Recebido');
    expect(wrapper.text()).toContain('A Depositar');
    expect(wrapper.text()).toContain('CMD-001');
    expect(wrapper.text()).toContain('Banco Vetus, bom para 30/04');
    expect(wrapper.text()).toContain('R$\u00A0200,00');
    expect(mockListSales).toHaveBeenCalledWith({ status: 'all' });
    expect(mockGetById).toHaveBeenCalledWith('sale-1');
    expect(mockGetById).toHaveBeenCalledWith('sale-2');
  });

  it('shows empty and error states with checks wording', async () => {
    mockListSales.mockResolvedValueOnce([]);
    const ChequesPage = (await import('../ChequesPage.vue')).default;
    const emptyWrapper = mount(ChequesPage);

    await flushPromises();
    expect(emptyWrapper.text()).toContain('Nenhum cheque encontrado');

    mockListSales.mockRejectedValueOnce(new Error('Falha em comandas'));
    const errorWrapper = mount(ChequesPage);

    await flushPromises();
    expect(errorWrapper.text()).toContain('Falha em comandas');
  });

  it('opens check rows in the originating counter sale', async () => {
    const ChequesPage = (await import('../ChequesPage.vue')).default;
    const wrapper = mount(ChequesPage, {
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
    expect(openLinks[0].attributes('href')).toBe('/counter-sales/sale-1');
  });
});
