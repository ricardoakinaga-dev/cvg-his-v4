import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FiscalIBSCBSPage from '../FiscalIBSCBSPage.vue';
import { fiscalService } from '@/services/fiscal';

vi.mock('@/services/fiscal', () => ({
  fiscalService: {
    listIbsCbsTables: vi.fn(),
    createIbsCbsTable: vi.fn(),
    updateIbsCbsTable: vi.fn()
  }
}));

function mountPage() {
  return mount(FiscalIBSCBSPage, {
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

describe('FiscalIBSCBSPage', () => {
  beforeEach(() => {
    vi.mocked(fiscalService.listIbsCbsTables).mockResolvedValue([
      {
        id: 'ibs-cbs-table-basica',
        code: 'BASICA',
        description: 'Tabela padrão IBS/CBS',
        ibsPercent: 0.1,
        cbsPercent: 0.9
      }
    ]);
    vi.mocked(fiscalService.createIbsCbsTable).mockResolvedValue({
      id: 'ibs-cbs-table-transicao',
      code: 'TRANSICAO',
      description: 'Transição 2026',
      ibsPercent: 0.1,
      cbsPercent: 0.9
    });
    vi.mocked(fiscalService.updateIbsCbsTable).mockResolvedValue({
      id: 'ibs-cbs-table-basica',
      code: 'BASICA',
      description: 'Tabela padrão IBS/CBS atualizada',
      ibsPercent: 0.2,
      cbsPercent: 0.8
    });
  });

  it('renders the Vetus-like IBS/CBS table screen', async () => {
    const wrapper = mountPage();

    await flushPromises();

    expect(wrapper.text()).toContain('Tabela IBS/CBS');
    expect(wrapper.text()).toContain('Quer cadastrar IBS/CBS de forma prática? Saiba Mais');
    expect(wrapper.text()).not.toContain('Reforma tributária em implantação');
    expect(wrapper.find('input[placeholder="Buscar por ID ou descrição"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Incluir Nova Tabela');
    expect(wrapper.text()).toContain('Tabela padrão IBS/CBS');
    expect(fiscalService.listIbsCbsTables).toHaveBeenCalledWith({ search: undefined });
  });

  it('creates a new IBS/CBS entry from the modal', async () => {
    const wrapper = mountPage();

    await flushPromises();
    const createButton = wrapper.findAll('button').find((button) => button.text().includes('Incluir Nova Tabela'));
    expect(createButton).toBeDefined();
    await createButton?.trigger('click');
    const inputs = wrapper.findAll('input');
    await inputs[1]?.setValue('TRANSICAO');
    await inputs[2]?.setValue('Transição 2026');
    await inputs[3]?.setValue('0.1');
    await inputs[4]?.setValue('0.9');
    const saveButton = wrapper.findAll('button').find((button) => button.text().includes('Salvar'));
    expect(saveButton).toBeDefined();
    await saveButton?.trigger('click');
    await flushPromises();

    expect(fiscalService.createIbsCbsTable).toHaveBeenCalledWith({
      code: 'TRANSICAO',
      description: 'Transição 2026',
      ibsPercent: 0.1,
      cbsPercent: 0.9
    });
  });
});
