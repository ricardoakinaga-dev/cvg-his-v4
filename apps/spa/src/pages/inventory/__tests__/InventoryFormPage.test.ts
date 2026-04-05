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
const mockCreateFn = vi.fn().mockResolvedValue({ ...mockItem, id: 'inv_new' });
const mockUpdateFn = vi.fn().mockResolvedValue(mockItem);

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    get getById() {
      return mockGetByIdFn;
    },
    get create() {
      return mockCreateFn;
    },
    get update() {
      return mockUpdateFn;
    }
  }
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: {} }),
  useRouter: () => ({ push: vi.fn() })
}));

describe('InventoryFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form title for new item', async () => {
    const InventoryFormPage = (await import('../InventoryFormPage.vue')).default;
    const wrapper = mount(InventoryFormPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Novo Item de Estoque');
  });

  it('renders form fields for SKU, name, unit, quantities', async () => {
    const InventoryFormPage = (await import('../InventoryFormPage.vue')).default;
    const wrapper = mount(InventoryFormPage);

    await flushPromises();
    expect(wrapper.find('#sku').exists()).toBe(true);
    expect(wrapper.find('#name').exists()).toBe(true);
    expect(wrapper.find('#unit').exists()).toBe(true);
    expect(wrapper.find('#onHandQuantity').exists()).toBe(true);
    expect(wrapper.find('#reorderLevel').exists()).toBe(true);
    expect(wrapper.find('#unitCostAmount').exists()).toBe(true);
  });

  it('has Cancel link back to inventory list', async () => {
    const InventoryFormPage = (await import('../InventoryFormPage.vue')).default;
    const wrapper = mount(InventoryFormPage, {
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
    const cancelLink = wrapper.find('a[href="/inventory"]');
    expect(cancelLink.exists()).toBe(true);
    expect(cancelLink.text()).toContain('Cancelar');
  });

  it('submit button is enabled and not disabled', async () => {
    const InventoryFormPage = (await import('../InventoryFormPage.vue')).default;
    const wrapper = mount(InventoryFormPage);

    await flushPromises();
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    expect(submitBtn.attributes('disabled')).toBeUndefined();
  });

  it('calls create service on submit for new item', async () => {
    const InventoryFormPage = (await import('../InventoryFormPage.vue')).default;
    const wrapper = mount(InventoryFormPage);

    await flushPromises();

    // Fill form
    await wrapper.find('#sku').setValue('MED-999');
    await wrapper.find('#name').setValue('Test Item');
    await wrapper.find('#unit').setValue('unidade');
    await wrapper.find('#onHandQuantity').setValue(10);
    await wrapper.find('#reorderLevel').setValue(5);
    await wrapper.find('#unitCostAmount').setValue(15.5);

    // Submit
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(mockCreateFn).toHaveBeenCalledWith({
      sku: 'MED-999',
      name: 'Test Item',
      unit: 'unidade',
      onHandQuantity: 10,
      reorderLevel: 5,
      unitCostAmount: 15.5
    });
  });

  it('shows error when create fails', async () => {
    mockCreateFn.mockRejectedValueOnce(new Error('SKU already exists'));

    const InventoryFormPage = (await import('../InventoryFormPage.vue')).default;
    const wrapper = mount(InventoryFormPage);

    await flushPromises();

    await wrapper.find('#sku').setValue('MED-001');
    await wrapper.find('#name').setValue('Test');
    await wrapper.find('#unit').setValue('unidade');
    await wrapper.find('#onHandQuantity').setValue(1);
    await wrapper.find('#reorderLevel').setValue(1);
    await wrapper.find('#unitCostAmount').setValue(1);

    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.text()).toContain('SKU already exists');
  });
});
