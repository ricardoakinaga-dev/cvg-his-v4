import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FiscalCfopPage from '../FiscalCfopPage.vue';
import { fiscalService } from '@/services/fiscal';

vi.mock('@/services/fiscal', () => ({
  fiscalService: {
    listCfop: vi.fn(),
    createCfop: vi.fn(),
    updateCfop: vi.fn()
  }
}));

function mountPage() {
  return mount(FiscalCfopPage, {
    global: {
      stubs: {
        AppPageHeader: {
          props: ['title', 'breadcrumbs'],
          template:
            '<header><h1>{{ title }}</h1><span>{{ breadcrumbs.join("/") }}</span><slot name="actions" /></header>'
        },
        DsModal: {
          props: ['open', 'title'],
          emits: ['close'],
          template:
            '<section v-if="open" role="dialog"><h2>{{ title }}</h2><slot /><footer><slot name="footer" /></footer></section>'
        }
      }
    }
  });
}

describe('FiscalCfopPage', () => {
  beforeEach(() => {
    vi.mocked(fiscalService.listCfop).mockResolvedValue([
      {
        code: '5.102',
        description: 'Venda de mercadoria adquirida de terceiros',
        section: 'saida',
        category: 'venda',
        applicableTo: ['nfe'],
        icmsRelevant: true,
        pisCofinsRelevant: true,
        ipiRelevant: false,
        documentTypesLabel: 'NFE'
      }
    ]);
    vi.mocked(fiscalService.createCfop).mockResolvedValue({
      code: '5.929',
      description: 'Prestação de serviço veterinário',
      section: 'saida',
      category: 'servico',
      applicableTo: ['nfse'],
      icmsRelevant: false,
      pisCofinsRelevant: true,
      ipiRelevant: false,
      documentTypesLabel: 'NFSE'
    });
    vi.mocked(fiscalService.updateCfop).mockResolvedValue({
      code: '5.102',
      description: 'Venda interna de mercadoria',
      section: 'saida',
      category: 'venda',
      applicableTo: ['nfe'],
      icmsRelevant: true,
      pisCofinsRelevant: true,
      ipiRelevant: false,
      documentTypesLabel: 'NFE'
    });
  });

  it('renders the Vetus-like CFOP table screen', async () => {
    const wrapper = mountPage();

    await flushPromises();

    expect(wrapper.text()).toContain('Tabela CFOP');
    expect(wrapper.text()).toContain('Estoque/Configurações Fiscais/Tabela CFOP');
    expect(wrapper.text()).not.toContain('Tabela operacional');
    expect(wrapper.find('input[placeholder="Buscar por código ou nome"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Incluir Nova Tabela');
    expect(wrapper.text()).toContain('Venda de mercadoria adquirida de terceiros');
    expect(fiscalService.listCfop).toHaveBeenCalledWith({ search: undefined });
  });

  it('creates a new CFOP entry from the modal', async () => {
    const wrapper = mountPage();

    await flushPromises();
    const createButton = wrapper.findAll('button').find((button) => button.text().includes('Incluir Nova Tabela'));
    expect(createButton).toBeDefined();
    await createButton?.trigger('click');

    const inputs = wrapper.findAll('input');
    await inputs[1]?.setValue('5.929');
    await inputs[2]?.setValue('Prestação de serviço veterinário');
    await inputs[3]?.setValue('servico');

    const selects = wrapper.findAll('select');
    await selects[0]?.setValue('saida');
    await selects[1]?.setValue('nfse');

    const saveButton = wrapper.findAll('button').find((button) => button.text().includes('Salvar'));
    expect(saveButton).toBeDefined();
    await saveButton?.trigger('click');
    await flushPromises();

    expect(fiscalService.createCfop).toHaveBeenCalledWith({
      code: '5.929',
      description: 'Prestação de serviço veterinário',
      section: 'saida',
      category: 'servico',
      applicableTo: ['nfse']
    });
  });
});
