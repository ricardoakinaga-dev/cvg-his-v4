import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryAuditPage from '../InventoryAuditPage.vue';
import { inventoryService } from '@/services/inventory';

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: vi.fn(),
    listConsumptions: vi.fn(),
    listLots: vi.fn()
  }
}));

const items = [
  {
    id: 'inv-dipyrone',
    accountId: 'acc-1',
    sku: 'MED-001',
    name: 'Dipirona Injetavel',
    unit: 'ampola',
    onHandQuantity: 24,
    reorderLevel: 5,
    unitCostAmount: 12.5,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  },
  {
    id: 'inv-vaccine',
    accountId: 'acc-1',
    sku: 'VAC-010',
    name: 'Vacina V10',
    unit: 'dose',
    onHandQuantity: 8,
    reorderLevel: 2,
    unitCostAmount: 42,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  }
];

const consumptions = [
  {
    id: 'cons-1',
    accountId: 'acc-1',
    inventoryItemId: 'inv-dipyrone',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    quantity: 2,
    unit: 'ampola',
    costAmount: 25,
    sourceEntityType: 'inpatient_stay' as const,
    sourceEntityId: 'internacao-1',
    recordedByUserId: 'user-vet',
    createdAt: '2026-04-26T00:00:00.000Z'
  },
  {
    id: 'cons-2',
    accountId: 'acc-1',
    inventoryItemId: 'inv-vaccine',
    encounterId: '',
    patientId: '',
    quantity: 1,
    unit: 'dose',
    costAmount: 42,
    sourceEntityType: 'other' as const,
    sourceEntityId: 'balcao-1',
    recordedByUserId: 'user-sales',
    createdAt: '2026-04-25T00:00:00.000Z'
  }
];

const lots = [
  {
    id: 'lot-vaccine',
    accountId: 'acc-1',
    inventoryItemId: 'inv-vaccine',
    sku: 'VAC-010',
    itemName: 'Vacina V10',
    lotNumber: 'L-VAC-01',
    quantity: 4,
    unit: 'dose',
    location: 'Geladeira Vacinas',
    supplier: 'Fornecedor Teste',
    manufactureDate: '2025-01-10T00:00:00.000Z',
    expiryDate: '2026-01-15T00:00:00.000Z',
    status: 'expired' as const,
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  }
];

describe('InventoryAuditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inventoryService.list).mockResolvedValue(items);
    vi.mocked(inventoryService.listConsumptions).mockResolvedValue(consumptions);
    vi.mocked(inventoryService.listLots).mockResolvedValue(lots);
  });

  it('renders Vetus-like inventory audit controls and audit rows', async () => {
    const wrapper = mount(InventoryAuditPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Auditoria de Estoque');
    expect(wrapper.text()).toContain('Conferência');
    expect(wrapper.text()).toContain('Código');
    expect(wrapper.text()).toContain('Produto');
    expect(wrapper.text()).toContain('Natureza');
    expect(wrapper.text()).toContain('Origem');
    expect(wrapper.text()).toContain('Usuário');
    expect(wrapper.text()).toContain('Quantidade');
    expect(wrapper.text()).toContain('Custo');
    expect(wrapper.text()).toContain('Saldo');
    expect(wrapper.text()).toContain('Referência');
    expect(wrapper.text()).toContain('Situação');
    expect(wrapper.text()).toContain('Data');
    expect(wrapper.text()).toContain('Dipirona Injetavel');
    expect(wrapper.text()).toContain('Internação');
    expect(wrapper.text()).toContain('user-vet');
    expect(wrapper.text()).toContain('Assistencial');
    expect(wrapper.text()).toContain('Comercial');
    expect(wrapper.text()).toContain('Vacina V10');
    expect(wrapper.text()).toContain('validade 15/01/2026');
    expect(wrapper.text()).toContain('Divergência');
    expect(inventoryService.list).toHaveBeenCalledWith(undefined);
    expect(inventoryService.listConsumptions).toHaveBeenCalledOnce();
    expect(inventoryService.listLots).toHaveBeenCalledOnce();
  });

  it('uses typed filters when searching the audit trail', async () => {
    const wrapper = mount(InventoryAuditPage);
    await flushPromises();

    const searchInputs = wrapper.findAll('input[type="search"]');
    await searchInputs[0].setValue('MED');
    await searchInputs[1].setValue('Dipirona');
    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0].setValue('2026-04-01');
    await dateInputs[1].setValue('2026-04-30');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(inventoryService.list).toHaveBeenLastCalledWith('Dipirona');
    expect(inventoryService.listConsumptions).toHaveBeenCalledTimes(2);
    expect(inventoryService.listLots).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Dipirona Injetavel');
  });

  it('shows the selected audit record without mutating inventory', async () => {
    const wrapper = mount(InventoryAuditPage);
    await flushPromises();

    await wrapper.find('[data-testid="audit-record"]').setValue('cons-1');

    expect(wrapper.text()).toContain('Saída registrada');
    expect(wrapper.text()).toContain('Consumo auditável registrado');
    expect(wrapper.text()).toContain('internacao-1');
    expect(inventoryService.listConsumptions).toHaveBeenCalledOnce();
  });

  it('shows the selected lot audit action without mutating inventory', async () => {
    const wrapper = mount(InventoryAuditPage);
    await flushPromises();

    await wrapper.find('[data-testid="audit-record"]').setValue('lot-lot-vaccine');

    expect(wrapper.text()).toContain('4 dose no lote');
    expect(wrapper.text()).toContain('Lote vencido exige bloqueio operacional');
    expect(wrapper.text()).toContain('validade 15/01/2026');
    expect(inventoryService.listLots).toHaveBeenCalledOnce();
  });
});
