import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCommercialDashboard = vi.fn();
const mockProductsList = vi.fn();

vi.mock('@/services/counterSales', () => ({
  counterSalesService: {
    getCommercialDashboard: (...args: unknown[]) => mockCommercialDashboard(...args)
  }
}));

vi.mock('@/services/products', () => ({
  productsService: {
    list: (...args: unknown[]) => mockProductsList(...args)
  }
}));

describe('CurveAbcProductsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-29T12:00:00.000Z'));
    vi.clearAllMocks();
    mockCommercialDashboard.mockResolvedValue({
      openSales: 1,
      closedToday: 3,
      grossRevenueToday: 1000,
      netRevenueToday: 980,
      avgTicket: 326.67,
      salesByPaymentMethod: [],
      topProducts: [
        { name: 'Antipulgas Vetus', quantity: 10, revenue: 800 },
        { name: 'Vacina V10', quantity: 3, revenue: 150 },
        { name: 'Ração Clínica', quantity: 2, revenue: 50 }
      ],
      topServices: [],
      quotesIssued: 0,
      quotesConverted: 0,
      lowStockAlerts: []
    });
    mockProductsList.mockResolvedValue([
      {
        id: 'prod-antipulgas',
        accountId: 'acc-1',
        name: 'Antipulgas Vetus',
        code: 'AP-001',
        description: null,
        basePrice: 80,
        active: true,
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z'
      },
      {
        id: 'prod-v10',
        accountId: 'acc-1',
        name: 'Vacina V10',
        code: 'VAC-010',
        description: null,
        basePrice: 50,
        active: true,
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z'
      }
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a Vetus-like ABC product curve from the commercial dashboard', async () => {
    const CurveAbcProductsPage = (await import('../CurveAbcProductsPage.vue')).default;
    const wrapper = mount(CurveAbcProductsPage, {
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

    expect(wrapper.text()).toContain('Curva ABC Produtos');
    expect(wrapper.text()).toContain('Classificação por importância');
    expect(wrapper.text()).toContain('Produto');
    expect(wrapper.text()).toContain('De');
    expect(wrapper.text()).toContain('Até');
    expect(wrapper.text()).toContain('Classe');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Exportar Curva');
    expect(wrapper.text()).toContain('Produtos');
    expect(wrapper.text()).toContain('Comandas');
    expect(wrapper.text()).toContain('Faturamento');
    expect(wrapper.text()).toContain('Participação');
    expect(wrapper.text()).toContain('Acumulado');
    expect(wrapper.text()).toContain('Quantidade');
    expect(wrapper.text()).toContain('Antipulgas Vetus');
    expect(wrapper.text()).toContain('Vacina V10');
    expect(wrapper.text()).toContain('Ração Clínica');
    expect(wrapper.text()).toContain('Classe A');
    expect(wrapper.text()).toContain('Classe B');
    expect(wrapper.text()).toContain('Classe C');
    expect(wrapper.text()).toContain('R$\u00A0800,00');
    expect(wrapper.text()).toContain('80,0%');
    expect(mockCommercialDashboard).toHaveBeenCalledWith({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30'
    });
    expect(mockProductsList).toHaveBeenCalledWith();
  });

  it('shows empty and error states with ABC product wording', async () => {
    mockCommercialDashboard.mockResolvedValueOnce({
      openSales: 0,
      closedToday: 0,
      grossRevenueToday: 0,
      netRevenueToday: 0,
      avgTicket: 0,
      salesByPaymentMethod: [],
      topProducts: [],
      topServices: [],
      quotesIssued: 0,
      quotesConverted: 0,
      lowStockAlerts: []
    });
    const CurveAbcProductsPage = (await import('../CurveAbcProductsPage.vue')).default;
    const emptyWrapper = mount(CurveAbcProductsPage);

    await flushPromises();
    expect(emptyWrapper.text()).toContain('Nenhum produto na curva ABC');

    mockCommercialDashboard.mockRejectedValueOnce(new Error('Falha no dashboard comercial'));
    const errorWrapper = mount(CurveAbcProductsPage);

    await flushPromises();
    expect(errorWrapper.text()).toContain('Falha no dashboard comercial');
  });

  it('opens the matched product register when available', async () => {
    const CurveAbcProductsPage = (await import('../CurveAbcProductsPage.vue')).default;
    const wrapper = mount(CurveAbcProductsPage, {
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
    expect(openLinks[0].attributes('href')).toBe('/products/prod-antipulgas');
    expect(openLinks[2].attributes('href')).toBe('/products');
  });
});
