import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FiscalPISPage from '../FiscalPISPage.vue';
import { fiscalService } from '@/services/fiscal';

vi.mock('@/services/fiscal', () => ({
  fiscalService: {
    listPisTables: vi.fn(),
    createPisTable: vi.fn(),
    updatePisTable: vi.fn()
  }
}));

function mountPage() {
  return mount(FiscalPISPage, {
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

describe('FiscalPISPage', () => {
  beforeEach(() => {
    vi.mocked(fiscalService.listPisTables).mockResolvedValue([
      {
        id: 'pis-table-0-65',
        code: '0,65',
        description: 'PIS 0,65%',
        percent: 0.65
      }
    ]);
    vi.mocked(fiscalService.createPisTable).mockResolvedValue({
      id: 'pis-table-2',
      code: '2',
      description: 'PIS 2%',
      percent: 2
    });
    vi.mocked(fiscalService.updatePisTable).mockResolvedValue({
      id: 'pis-table-0-65',
      code: '0,65',
      description: 'PIS interno 0,65%',
      percent: 0.65
    });
  });

  it('renders the Vetus-like simple PIS table screen', async () => {
    const wrapper = mountPage();

    await flushPromises();

    expect(wrapper.text()).toContain('Tabela PIS');
    expect(wrapper.text()).toContain('Quer cadastrar PIS de forma prática? Saiba Mais');
    expect(wrapper.text()).not.toContain('PIS / COFINS');
    expect(wrapper.find('input[placeholder="Buscar por código ou descrição"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Incluir Nova Tabela');
    expect(wrapper.text()).toContain('PIS 0,65%');
    expect(fiscalService.listPisTables).toHaveBeenCalledWith({ search: undefined });
  });

  it('creates a new simple PIS entry from the modal', async () => {
    const wrapper = mountPage();

    await flushPromises();
    const createButton = wrapper.findAll('button').find((button) => button.text().includes('Incluir Nova Tabela'));
    expect(createButton).toBeDefined();
    await createButton?.trigger('click');
    const inputs = wrapper.findAll('input');
    await inputs[1]?.setValue('2');
    await inputs[2]?.setValue('PIS 2%');
    await inputs[3]?.setValue('2');
    const saveButton = wrapper.findAll('button').find((button) => button.text().includes('Salvar'));
    expect(saveButton).toBeDefined();
    await saveButton?.trigger('click');
    await flushPromises();

    expect(fiscalService.createPisTable).toHaveBeenCalledWith({
      code: '2',
      description: 'PIS 2%',
      percent: 2
    });
  });
});
