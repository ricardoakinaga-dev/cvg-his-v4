import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockItems = [
  {
    id: 'inv_dipyrone',
    accountId: 'acc_cvg_demo',
    sku: 'MED-001',
    name: 'Dipirona Injetavel',
    unit: 'ampola',
    onHandQuantity: 24,
    reorderLevel: 5,
    unitCostAmount: 12.5,
    createdAt: '2026-03-25T00:00:00.000Z',
    updatedAt: '2026-03-25T00:00:00.000Z'
  },
  {
    id: 'inv_gauze',
    accountId: 'acc_cvg_demo',
    sku: 'MAT-014',
    name: 'Gaze Esteril',
    unit: 'pacote',
    onHandQuantity: 60,
    reorderLevel: 10,
    unitCostAmount: 4.2,
    createdAt: '2026-03-25T00:00:00.000Z',
    updatedAt: '2026-03-25T00:00:00.000Z'
  }
];

const mockListFn = vi.fn().mockResolvedValue(mockItems);

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    get list() {
      return mockListFn;
    }
  }
}));

describe('InventoryListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFn.mockResolvedValue(mockItems);
  });

  it('renders the page title', async () => {
    const InventoryListPage = (await import('../InventoryListPage.vue')).default;
    const wrapper = mount(InventoryListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Estoque');
  });

  it('shows loading state initially', async () => {
    let resolvePromise: (value: any) => void;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockListFn.mockImplementation(() => slowPromise);

    const InventoryListPage = (await import('../InventoryListPage.vue')).default;
    const wrapper = mount(InventoryListPage);

    await wrapper.vm.$nextTick();
    expect(wrapper.find('.data-table-loading').exists()).toBe(true);

    resolvePromise!(mockItems);
    await flushPromises();
  });

  it('shows error state when API fails', async () => {
    mockListFn.mockRejectedValue(new Error('Failed to load inventory'));

    const InventoryListPage = (await import('../InventoryListPage.vue')).default;
    const wrapper = mount(InventoryListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Failed to load inventory');
  });

  it('shows empty state when no items exist', async () => {
    mockListFn.mockResolvedValue([]);

    const InventoryListPage = (await import('../InventoryListPage.vue')).default;
    const wrapper = mount(InventoryListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum item encontrado');
  });

  it('renders inventory item data in the table', async () => {
    const InventoryListPage = (await import('../InventoryListPage.vue')).default;
    const wrapper = mount(InventoryListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Dipirona Injetavel');
    expect(wrapper.text()).toContain('Gaze Esteril');
    expect(wrapper.text()).toContain('MED-001');
  });

  it('shows stock quantity and unit', async () => {
    const InventoryListPage = (await import('../InventoryListPage.vue')).default;
    const wrapper = mount(InventoryListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('24 ampola');
    expect(wrapper.text()).toContain('60 pacote');
  });

  it('shows unit cost formatted as currency', async () => {
    const InventoryListPage = (await import('../InventoryListPage.vue')).default;
    const wrapper = mount(InventoryListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('R$');
  });

  it('has search input with correct placeholder', async () => {
    const InventoryListPage = (await import('../InventoryListPage.vue')).default;
    const wrapper = mount(InventoryListPage);

    await flushPromises();
    const searchInput = wrapper.find('input[type="search"]');
    expect(searchInput.exists()).toBe(true);
    expect(searchInput.attributes('placeholder')).toBe('Buscar por SKU, nome ou unidade...');
  });

  it('has a Buscar button', async () => {
    const InventoryListPage = (await import('../InventoryListPage.vue')).default;
    const wrapper = mount(InventoryListPage);

    await flushPromises();
    const searchBtn = wrapper.findAll('button').find((b) => b.text() === 'Buscar');
    expect(searchBtn).toBeTruthy();
  });
});
