import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCatalogResponse = {
  items: [
    {
      id: 'sup-1',
      name: 'Fornecedor de medicamentos',
      kind: 'Operacional',
      category: 'Compras',
      costCenterCode: 'EST',
      costCenterName: 'Estoque',
      description: 'Pagamento recorrente de fornecedor'
    },
    {
      id: 'sup-2',
      name: 'Laboratório parceiro',
      kind: 'Variavel',
      category: 'Serviços',
      costCenterCode: 'LAB',
      costCenterName: 'Laboratório',
      description: 'Exames terceirizados'
    }
  ],
  categories: ['Compras', 'Serviços'],
  costCenters: [],
  page: 1,
  pageSize: 50,
  totalItems: 2,
  totalPages: 1,
  sort: 'name',
  order: 'asc'
};

const mockListExpenses = vi.fn().mockResolvedValue(mockCatalogResponse);

vi.mock('@/services/expensesCatalog', () => ({
  expensesCatalogService: {
    get list() {
      return mockListExpenses;
    }
  }
}));

describe('AccountsPayablePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListExpenses.mockResolvedValue(mockCatalogResponse);
  });

  it('renders a Vetus-like accounts payable page backed by the expenses catalog', async () => {
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
    expect(wrapper.text()).toContain('Fornecedor');
    expect(wrapper.text()).toContain('Vencimento de');
    expect(wrapper.text()).toContain('Até');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Emissão');
    expect(wrapper.text()).toContain('Vencimento');
    expect(wrapper.text()).toContain('Total');
    expect(wrapper.text()).toContain('Pago');
    expect(wrapper.text()).toContain('A Pagar');
    expect(wrapper.text()).toContain('Origem');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('Fornecedor de medicamentos');
    expect(wrapper.text()).toContain('Laboratório parceiro');
    expect(wrapper.text()).toContain('R$\u00A00,00');
    expect(wrapper.text()).not.toContain('Natureza');
    expect(mockListExpenses).toHaveBeenCalledWith({
      search: '',
      page: 1,
      pageSize: 50,
      sort: 'name',
      order: 'asc'
    });
  });

  it('shows empty and error states with accounts payable wording', async () => {
    mockListExpenses.mockResolvedValueOnce({ ...mockCatalogResponse, items: [], totalItems: 0 });
    const AccountsPayablePage = (await import('../AccountsPayablePage.vue')).default;
    const emptyWrapper = mount(AccountsPayablePage);

    await flushPromises();
    expect(emptyWrapper.text()).toContain('Nenhuma conta a pagar encontrada');

    mockListExpenses.mockRejectedValueOnce(new Error('Falha no catálogo'));
    const errorWrapper = mount(AccountsPayablePage);

    await flushPromises();
    expect(errorWrapper.text()).toContain('Falha no catálogo');
  });

  it('opens payable rows in the expenses catalog filtered by supplier', async () => {
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

    const openLinks = wrapper.findAll('a').filter((anchor) => anchor.text() === 'Abrir');
    expect(openLinks).toHaveLength(2);
    expect(openLinks[0].attributes('href')).toBe('/expenses?search=Fornecedor%20de%20medicamentos');
    expect(openLinks[1].attributes('href')).toBe('/expenses?search=Laborat%C3%B3rio%20parceiro');
  });
});
