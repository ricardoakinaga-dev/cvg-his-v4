import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryStockTransactionPage from '../InventoryStockTransactionPage.vue';
import { inventoryService } from '@/services/inventory';

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: vi.fn(),
    listConsumptions: vi.fn(),
    update: vi.fn()
  }
}));

const inventoryItem = {
  id: 'item-1',
  accountId: 'acc-1',
  sku: 'MED-001',
  name: 'Dipirona',
  unit: 'un',
  onHandQuantity: 10,
  reorderLevel: 2,
  unitCostAmount: 8,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z'
};

const consumption = {
  id: 'cons-1',
  accountId: 'acc-1',
  inventoryItemId: 'item-1',
  encounterId: 'enc-1',
  patientId: 'pat-1',
  quantity: 2,
  unit: 'un',
  costAmount: 16,
  sourceEntityType: 'encounter' as const,
  sourceEntityId: 'enc-1',
  recordedByUserId: 'user-1',
  createdAt: '2026-04-25T00:00:00.000Z'
};

describe('InventoryStockTransactionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inventoryService.list).mockResolvedValue([inventoryItem]);
    vi.mocked(inventoryService.listConsumptions).mockResolvedValue([consumption]);
    vi.mocked(inventoryService.update).mockResolvedValue({
      ...inventoryItem,
      onHandQuantity: 8,
      updatedAt: '2026-04-26T00:00:00.000Z'
    });
  });

  it('renders Vetus-like stock transaction controls and movement rows', async () => {
    const wrapper = mount(InventoryStockTransactionPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Transação no Estoque');
    expect(wrapper.text()).toContain('Estoque');
    expect(wrapper.text()).toContain('Tipo');
    expect(wrapper.text()).toContain('Produto');
    expect(wrapper.text()).toContain('Código de Barras');
    expect(wrapper.text()).toContain('Quantidade');
    expect(wrapper.text()).toContain('Observação');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Dipirona');
    expect(wrapper.text()).toContain('Assistencial');
    expect(wrapper.text()).toContain('Saldo atual');
    expect(inventoryService.list).toHaveBeenCalledWith(undefined);
    expect(inventoryService.listConsumptions).toHaveBeenCalledOnce();
  });

  it('launches an outbound stock transaction through the persisted inventory update API', async () => {
    const wrapper = mount(InventoryStockTransactionPage);
    await flushPromises();

    await wrapper.get('[data-testid="transaction-product"]').setValue('item-1');
    await wrapper.get('[data-testid="transaction-type"]').setValue('adjustment_out');
    await wrapper.get('[data-testid="transaction-quantity"]').setValue(2);
    await wrapper.find('form[aria-label="Lançar transação no estoque"]').trigger('submit');
    await flushPromises();

    expect(inventoryService.update).toHaveBeenCalledWith('item-1', { onHandQuantity: 8 });
    expect(wrapper.text()).toContain('Dipirona atualizado para 8 un');
  });

  it('blocks a transaction that would create negative stock', async () => {
    const wrapper = mount(InventoryStockTransactionPage);
    await flushPromises();

    await wrapper.get('[data-testid="transaction-product"]').setValue('item-1');
    await wrapper.get('[data-testid="transaction-type"]').setValue('adjustment_out');
    await wrapper.get('[data-testid="transaction-quantity"]').setValue(20);
    await wrapper.find('form[aria-label="Lançar transação no estoque"]').trigger('submit');
    await flushPromises();

    expect(inventoryService.update).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('A transação não pode deixar saldo negativo');
  });
});
