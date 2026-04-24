import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FiscalTaxOperationPage from '../FiscalTaxOperationPage.vue';
import { fiscalService } from '@/services/fiscal';

vi.mock('@/services/fiscal', () => ({
  fiscalService: {
    getDashboardSummary: vi.fn(),
    getTaxPreview: vi.fn(),
    listNcmEntries: vi.fn(),
    listCfop: vi.fn()
  }
}));

describe('FiscalTaxOperationPage', () => {
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
      pendingScopes: ['emissão NF-e'],
      alerts: []
    });
    vi.mocked(fiscalService.getTaxPreview).mockResolvedValue({
      mercadoria: { baseValue: 100, totalTaxValue: 18, totalWithTax: 118 },
      servico: { baseValue: 120, totalTaxValue: 12, totalWithTax: 132 }
    });
    vi.mocked(fiscalService.listNcmEntries).mockResolvedValue([
      {
        id: 'ncm-1',
        ncm: '30049099',
        category: 'Medicamentos',
        ipiRate: 3.25,
        source: 'IBPT',
        notes: 'Uso veterinário'
      }
    ]);
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
  });

  it.each([
    ['ipi', 'IPI', '30049099'],
    ['ibs-cbs', 'IBS/CBS', 'Reforma tributária']
  ] as const)('renders %s fiscal operation with API-backed data', async (mode, title, expectedText) => {
    const wrapper = mount(FiscalTaxOperationPage, {
      props: { mode },
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

    expect(wrapper.text()).toContain(title);
    expect(wrapper.text()).toContain(expectedText);
    expect(fiscalService.getDashboardSummary).toHaveBeenCalled();
    expect(fiscalService.getTaxPreview).toHaveBeenCalled();
  });
});
