import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { inventoryService } from '@/services/inventory';

const purchase = {
  id: 'purchase-detail-1',
  accountId: 'acc-1',
  supplierName: 'Distribuidora Detalhada',
  invoiceNumber: 'NF-2026-0044',
  status: 'approved' as const,
  totalAmount: 31,
  receivedAmount: 0,
  payableId: null,
  lines: [
    {
      id: 'purchase-detail-line-1',
      purchaseId: 'purchase-detail-1',
      inventoryItemId: 'item-low',
      sku: 'MED-001',
      itemName: 'Dipirona Injetavel',
      orderedQuantity: 2,
      receivedQuantity: 0,
      unit: 'ampola',
      unitCostAmount: 12.5,
      lotNumber: 'DIP-DETAIL',
      expiryDate: null,
      manufactureDate: null,
      location: null,
      supplier: 'Distribuidora Detalhada'
    },
    {
      id: 'purchase-detail-line-2',
      purchaseId: 'purchase-detail-1',
      inventoryItemId: 'item-normal',
      sku: 'MAT-014',
      itemName: 'Gaze Esteril',
      orderedQuantity: 1,
      receivedQuantity: 0,
      unit: 'pacote',
      unitCostAmount: 6,
      lotNumber: 'GAZ-DETAIL',
      expiryDate: null,
      manufactureDate: null,
      location: null,
      supplier: 'Distribuidora Detalhada'
    }
  ],
  createdByUserId: 'user-1',
  approvedByUserId: 'user-2',
  createdAt: '2026-04-25T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z',
  receivedAt: null
};

const listPurchases = vi.fn();

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    listPurchases
  }
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { purchaseId: 'purchase-detail-1' } })
}));

vi.mock('@/components/AppPageHeader.vue', () => ({
  default: {
    template: '<div class="app-page-header">{{ title }}{{ subtitle }}<slot name="actions"/></div>',
    props: ['title', 'subtitle']
  }
}));

describe('InventoryPurchaseDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPurchases.mockResolvedValue([purchase]);
  });

  it('renders the persisted purchase entity and every line', async () => {
    const page = (await import('../InventoryPurchaseDetailPage.vue')).default;
    const wrapper = mount(page);
    await flushPromises();

    expect(wrapper.text()).toContain('Detalhe da compra');
    expect(wrapper.text()).toContain('Distribuidora Detalhada');
    expect(wrapper.text()).toContain('NF-2026-0044');
    expect(wrapper.text()).toContain('Aprovada');
    expect(wrapper.text()).toContain('Dipirona Injetavel');
    expect(wrapper.text()).toContain('Gaze Esteril');
    expect(listPurchases).toHaveBeenCalledOnce();
  });

  it('fails closed when the persisted purchase is not present', async () => {
    listPurchases.mockResolvedValue([]);

    const page = (await import('../InventoryPurchaseDetailPage.vue')).default;
    const wrapper = mount(page);
    await flushPromises();

    expect(wrapper.text()).toContain('Compra persistida não encontrada');
  });

  it('offers a retry when loading the persisted purchase fails', async () => {
    listPurchases.mockRejectedValueOnce(new Error('Falha transitória'));

    const page = (await import('../InventoryPurchaseDetailPage.vue')).default;
    const wrapper = mount(page);
    await flushPromises();

    expect(wrapper.text()).toContain('Falha transitória');
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Distribuidora Detalhada');
  });
});
