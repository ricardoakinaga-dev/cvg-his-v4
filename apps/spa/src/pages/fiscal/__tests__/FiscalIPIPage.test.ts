import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FiscalIPIPage from '../FiscalIPIPage.vue';
import { fiscalService } from '@/services/fiscal';

vi.mock('@/services/fiscal', () => ({
  fiscalService: {
    listIpiTables: vi.fn(),
    createIpiTable: vi.fn(),
    updateIpiTable: vi.fn()
  }
}));

function mountPage() {
  return mount(FiscalIPIPage, {
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

describe('FiscalIPIPage', () => {
  beforeEach(() => {
    vi.mocked(fiscalService.listIpiTables).mockResolvedValue([
      {
        id: 'ipi-table-5',
        code: '5',
        description: 'IPI 5%',
        percent: 5
      }
    ]);
    vi.mocked(fiscalService.createIpiTable).mockResolvedValue({
      id: 'ipi-table-9',
      code: '9',
      description: 'IPI 9%',
      percent: 9
    });
    vi.mocked(fiscalService.updateIpiTable).mockResolvedValue({
      id: 'ipi-table-5',
      code: '5',
      description: 'IPI interno 5%',
      percent: 5.5
    });
  });

  it('renders the Vetus-like simple IPI table screen', async () => {
    const wrapper = mountPage();

    await flushPromises();

    expect(wrapper.text()).toContain('Tabela IPI');
    expect(wrapper.text()).not.toContain('Consulta operacional');
    expect(wrapper.find('input[placeholder="Buscar por código ou descrição"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Incluir Nova Tabela');
    expect(wrapper.text()).toContain('IPI 5%');
    expect(fiscalService.listIpiTables).toHaveBeenCalledWith({ search: undefined });
  });

  it('creates a new simple IPI entry from the modal', async () => {
    const wrapper = mountPage();

    await flushPromises();
    const createButton = wrapper.findAll('button').find((button) => button.text().includes('Incluir Nova Tabela'));
    expect(createButton).toBeDefined();
    await createButton?.trigger('click');
    const inputs = wrapper.findAll('input');
    await inputs[1]?.setValue('9');
    await inputs[2]?.setValue('IPI 9%');
    await inputs[3]?.setValue('9');
    const saveButton = wrapper.findAll('button').find((button) => button.text().includes('Salvar'));
    expect(saveButton).toBeDefined();
    await saveButton?.trigger('click');
    await flushPromises();

    expect(fiscalService.createIpiTable).toHaveBeenCalledWith({
      code: '9',
      description: 'IPI 9%',
      percent: 9
    });
  });
});
