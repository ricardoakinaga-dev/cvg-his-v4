import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryMovementsPage from '../InventoryMovementsPage.vue';
import { inventoryService } from '@/services/inventory';

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: vi.fn(),
    listConsumptions: vi.fn()
  }
}));

describe('InventoryMovementsPage', () => {
  beforeEach(() => {
    vi.mocked(inventoryService.list).mockResolvedValue([
      {
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
      }
    ]);
    vi.mocked(inventoryService.listConsumptions).mockResolvedValue([
      {
        id: 'cons-1',
        accountId: 'acc-1',
        inventoryItemId: 'item-1',
        encounterId: 'enc-1',
        patientId: 'pat-1',
        quantity: 2,
        unit: 'un',
        costAmount: 16,
        sourceEntityType: 'encounter',
        sourceEntityId: 'enc-1',
        recordedByUserId: 'user-1',
        createdAt: '2026-04-24T00:00:00.000Z'
      }
    ]);
  });

  it('renders inventory audit mode with API-backed movements', async () => {
    const wrapper = mount(InventoryMovementsPage, {
      props: {
        title: 'Auditoria de Estoque',
        subtitle: 'Rastreabilidade operacional',
        breadcrumb: 'Auditoria'
      },
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

    expect(wrapper.text()).toContain('Auditoria de Estoque');
    expect(wrapper.text()).toContain('Estoque/Controles/Auditoria');
    expect(wrapper.text()).toContain('Dipirona');
    expect(inventoryService.listConsumptions).toHaveBeenCalled();
  });
});
