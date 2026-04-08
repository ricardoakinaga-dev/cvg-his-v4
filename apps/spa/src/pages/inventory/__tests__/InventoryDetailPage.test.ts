import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockItem = {
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
};

const mockGetByIdFn = vi.fn().mockResolvedValue(mockItem);

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    get getById() {
      return mockGetByIdFn;
    }
  }
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'inv_dipyrone' } }),
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock('@/components/AppPageHeader.vue', () => ({
  default: {
    template:
      '<div class="app-page-header"><slot name="title"/><slot name="subtitle"/><slot name="actions"/></div>'
  }
}));

vi.mock('@/components/AppDetailSection.vue', () => ({
  default: {
    template: '<div class="app-detail-section"><slot name="title"/><slot/></div>',
    props: ['title']
  }
}));

describe('InventoryDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetByIdFn.mockResolvedValue(mockItem);
  });

  it('renders the item name as title', async () => {
    const InventoryDetailPage = (await import('../InventoryDetailPage.vue')).default;
    const wrapper = mount(InventoryDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Dipirona Injetavel');
  });

  it('shows the SKU', async () => {
    const InventoryDetailPage = (await import('../InventoryDetailPage.vue')).default;
    const wrapper = mount(InventoryDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('MED-001');
  });

  it('shows stock quantity and unit', async () => {
    const InventoryDetailPage = (await import('../InventoryDetailPage.vue')).default;
    const wrapper = mount(InventoryDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('24 ampola');
  });

  it('shows reorder level', async () => {
    const InventoryDetailPage = (await import('../InventoryDetailPage.vue')).default;
    const wrapper = mount(InventoryDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('5 ampola');
  });

  it('shows unit cost as currency', async () => {
    const InventoryDetailPage = (await import('../InventoryDetailPage.vue')).default;
    const wrapper = mount(InventoryDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('R$');
  });

  it('shows error when API fails', async () => {
    mockGetByIdFn.mockRejectedValue(new Error('Item not found'));

    const InventoryDetailPage = (await import('../InventoryDetailPage.vue')).default;
    const wrapper = mount(InventoryDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Item not found');
  });

  it('shows loading state initially', async () => {
    let resolvePromise: (value: typeof mockItem) => void;
    const slowPromise = new Promise<typeof mockItem>((resolve) => {
      resolvePromise = resolve;
    });
    mockGetByIdFn.mockImplementation(() => slowPromise);

    const InventoryDetailPage = (await import('../InventoryDetailPage.vue')).default;
    const wrapper = mount(InventoryDetailPage);

    await wrapper.vm.$nextTick();
    expect(wrapper.find('.page-loading').exists()).toBe(true);

    resolvePromise!(mockItem);
    await flushPromises();
  });
});
