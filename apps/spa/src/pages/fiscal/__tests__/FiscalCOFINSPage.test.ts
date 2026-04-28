import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FiscalCOFINSPage from '../FiscalCOFINSPage.vue';
import { fiscalService } from '@/services/fiscal';

vi.mock('@/services/fiscal', () => ({
  fiscalService: {
    listCofinsTables: vi.fn(),
    createCofinsTable: vi.fn(),
    updateCofinsTable: vi.fn()
  }
}));

function mountPage() {
  return mount(FiscalCOFINSPage, {
    global: {
      stubs: {
        AppPageHeader: {
          props: ['title', 'subtitle', 'breadcrumbs'],
          template:
            '<header><h1>{{ title }}</h1><p v-if="subtitle">{{ subtitle }}</p><span>{{ breadcrumbs.join("/") }}</span><slot name="actions" /></header>'
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

describe('FiscalCOFINSPage', () => {
  beforeEach(() => {
    vi.mocked(fiscalService.listCofinsTables).mockResolvedValue([
      {
        id: 'cofins-table-7-6',
        code: '7,6',
        description: 'COFINS 7,6%',
        percent: 7.6
      }
    ]);
    vi.mocked(fiscalService.createCofinsTable).mockResolvedValue({
      id: 'cofins-table-4',
      code: '4',
      description: 'COFINS 4%',
      percent: 4
    });
    vi.mocked(fiscalService.updateCofinsTable).mockResolvedValue({
      id: 'cofins-table-7-6',
      code: '7,6',
      description: 'COFINS interno 7,6%',
      percent: 7.6
    });
  });

  it('renders the Vetus-like simple COFINS table screen', async () => {
    const wrapper = mountPage();

    await flushPromises();

    expect(wrapper.text()).toContain('Tabela COFINS');
    expect(wrapper.text()).toContain('Quer cadastrar COFINS de forma prática? Saiba Mais');
    expect(wrapper.text()).not.toContain('PIS / COFINS');
    expect(wrapper.find('input[placeholder="Buscar por código ou descrição"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Incluir Nova Tabela');
    expect(wrapper.text()).toContain('COFINS 7,6%');
    expect(fiscalService.listCofinsTables).toHaveBeenCalledWith({ search: undefined });
  });

  it('creates a new simple COFINS entry from the modal', async () => {
    const wrapper = mountPage();

    await flushPromises();
    const createButton = wrapper.findAll('button').find((button) => button.text().includes('Incluir Nova Tabela'));
    expect(createButton).toBeDefined();
    await createButton?.trigger('click');
    const inputs = wrapper.findAll('input');
    await inputs[1]?.setValue('4');
    await inputs[2]?.setValue('COFINS 4%');
    await inputs[3]?.setValue('4');
    const saveButton = wrapper.findAll('button').find((button) => button.text().includes('Salvar'));
    expect(saveButton).toBeDefined();
    await saveButton?.trigger('click');
    await flushPromises();

    expect(fiscalService.createCofinsTable).toHaveBeenCalledWith({
      code: '4',
      description: 'COFINS 4%',
      percent: 4
    });
  });
});
