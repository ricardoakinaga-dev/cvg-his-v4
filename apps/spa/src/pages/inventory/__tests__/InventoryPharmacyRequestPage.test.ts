import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryPharmacyRequestPage from '../InventoryPharmacyRequestPage.vue';
import { inventoryService } from '@/services/inventory';

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: vi.fn(),
    listConsumptions: vi.fn(),
    update: vi.fn()
  }
}));

const pharmacyItem = {
  id: 'item-1',
  accountId: 'acc-1',
  sku: 'MED-001',
  name: 'Dipirona Injetavel',
  unit: 'ampola',
  onHandQuantity: 10,
  reorderLevel: 2,
  unitCostAmount: 8,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z'
};

const nonPharmacyItem = {
  id: 'item-2',
  accountId: 'acc-1',
  sku: 'ALM-001',
  name: 'Ração Renal',
  unit: 'saco',
  onHandQuantity: 4,
  reorderLevel: 1,
  unitCostAmount: 90,
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
  unit: 'ampola',
  costAmount: 16,
  sourceEntityType: 'inpatient_stay' as const,
  sourceEntityId: 'internacao-1',
  recordedByUserId: 'user-1',
  createdAt: '2026-04-25T00:00:00.000Z'
};

describe('InventoryPharmacyRequestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inventoryService.list).mockResolvedValue([pharmacyItem, nonPharmacyItem]);
    vi.mocked(inventoryService.listConsumptions).mockResolvedValue([consumption]);
    vi.mocked(inventoryService.update).mockResolvedValue({
      ...pharmacyItem,
      onHandQuantity: 7,
      updatedAt: '2026-04-26T00:00:00.000Z'
    });
  });

  it('renders Vetus-like pharmacy request controls and rows', async () => {
    const wrapper = mount(InventoryPharmacyRequestPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Requisição à Farmácia');
    expect(wrapper.text()).toContain('Origem');
    expect(wrapper.text()).toContain('Prioridade');
    expect(wrapper.text()).toContain('Solicitante');
    expect(wrapper.text()).toContain('Atendimento / Paciente');
    expect(wrapper.text()).toContain('Produto');
    expect(wrapper.text()).toContain('Código de Barras');
    expect(wrapper.text()).toContain('Quantidade');
    expect(wrapper.text()).toContain('Observação');
    expect(wrapper.text()).toContain('Dispensar');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Dipirona Injetavel');
    expect(wrapper.text()).toContain('Internação');
    expect(wrapper.text()).toContain('Dispensada');
    expect(wrapper.text()).not.toContain('Ração Renal');
    expect(inventoryService.list).toHaveBeenCalledWith(undefined);
    expect(inventoryService.listConsumptions).toHaveBeenCalledOnce();
  });

  it('dispenses a pharmacy request through the persisted inventory update API', async () => {
    const wrapper = mount(InventoryPharmacyRequestPage);
    await flushPromises();

    await wrapper.get('[data-testid="request-product"]').setValue('item-1');
    await wrapper.get('[data-testid="request-quantity"]').setValue(3);
    await wrapper.find('form[aria-label="Lançar requisição à farmácia"]').trigger('submit');
    await flushPromises();

    expect(inventoryService.update).toHaveBeenCalledWith('item-1', { onHandQuantity: 7 });
    expect(wrapper.text()).toContain('Dipirona Injetavel dispensado. Saldo atual 7 ampola');
  });

  it('blocks a pharmacy request that would create negative stock', async () => {
    const wrapper = mount(InventoryPharmacyRequestPage);
    await flushPromises();

    await wrapper.get('[data-testid="request-product"]').setValue('item-1');
    await wrapper.get('[data-testid="request-quantity"]').setValue(20);
    await wrapper.find('form[aria-label="Lançar requisição à farmácia"]').trigger('submit');
    await flushPromises();

    expect(inventoryService.update).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('A requisição não pode deixar saldo negativo');
  });
});
