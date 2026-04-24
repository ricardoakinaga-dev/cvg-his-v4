import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InvoiceReportsPage from '../InvoiceReportsPage.vue';
import { fiscalService } from '@/services/fiscal';
import { inventoryService } from '@/services/inventory';

vi.mock('@/services/fiscal', () => ({
  fiscalService: {
    getDashboardSummary: vi.fn(),
    listCfop: vi.fn(),
    listNfseLayouts: vi.fn()
  }
}));

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    listLots: vi.fn()
  }
}));

describe('InvoiceReportsPage', () => {
  beforeEach(() => {
    vi.mocked(fiscalService.getDashboardSummary).mockResolvedValue({
      activeTaxes: 6,
      cfopCount: 10,
      nfseLayouts: 2,
      icmsRules: 8,
      pisCofinsRules: 4,
      ncmEntries: 3,
      readOnly: false,
      backendScope: 'Fiscal operacional',
      pendingScopes: [],
      alerts: []
    });
    vi.mocked(fiscalService.listCfop).mockResolvedValue([
      {
        code: '5102',
        description: 'Venda de mercadoria adquirida',
        section: 'saida',
        category: 'venda',
        applicableTo: ['nfe'],
        icmsRelevant: true,
        pisCofinsRelevant: true,
        ipiRelevant: true,
        documentTypesLabel: 'NF-e'
      }
    ]);
    vi.mocked(fiscalService.listNfseLayouts).mockResolvedValue([
      {
        id: 'layout-1',
        city: 'Campinas',
        state: 'SP',
        municipalityCode: '3509502',
        provider: 'abrasf',
        version: 'v1',
        active: true,
        environment: 'homologacao',
        serviceCode: '0407',
        serviceFocus: 'Veterinária'
      }
    ]);
    vi.mocked(inventoryService.listLots).mockResolvedValue([
      {
        id: 'lot-1',
        accountId: 'acc-1',
        inventoryItemId: 'item-1',
        sku: 'MED-001',
        itemName: 'Dipirona',
        lotNumber: 'L-001',
        quantity: 3,
        unit: 'un',
        supplier: 'Fornecedor Vetus',
        status: 'active',
        createdAt: '2026-04-24T00:00:00.000Z',
        updatedAt: '2026-04-24T00:00:00.000Z'
      }
    ]);
  });

  it('renders NF report with fiscal and inventory API data', async () => {
    const wrapper = mount(InvoiceReportsPage, {
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

    expect(wrapper.text()).toContain('Relatório de NF');
    expect(wrapper.text()).toContain('5102');
    expect(wrapper.text()).toContain('Campinas');
    expect(wrapper.text()).toContain('Dipirona');
    expect(fiscalService.listCfop).toHaveBeenCalled();
    expect(inventoryService.listLots).toHaveBeenCalled();
  });
});
