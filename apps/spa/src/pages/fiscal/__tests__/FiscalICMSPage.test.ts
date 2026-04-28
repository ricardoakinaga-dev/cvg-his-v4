import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FiscalICMSPage from '../FiscalICMSPage.vue';
import { fiscalService } from '@/services/fiscal';

vi.mock('@/services/fiscal', () => ({
  fiscalService: {
    listIcmsTables: vi.fn(),
    createIcmsTable: vi.fn(),
    updateIcmsTable: vi.fn()
  }
}));

function mountPage() {
  return mount(FiscalICMSPage, {
    global: {
      stubs: {
        AppPageHeader: {
          props: ['title', 'subtitle', 'breadcrumbs'],
          template:
            '<header><h1>{{ title }}</h1><p>{{ subtitle }}</p><span>{{ breadcrumbs.join("/") }}</span><slot name="actions" /></header>'
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

describe('FiscalICMSPage', () => {
  beforeEach(() => {
    vi.mocked(fiscalService.listIcmsTables).mockResolvedValue([
      {
        id: 'icms-table-18',
        code: '18',
        description: 'ICMS 18%',
        percent: 18
      }
    ]);
    vi.mocked(fiscalService.createIcmsTable).mockResolvedValue({
      id: 'icms-table-20',
      code: '20',
      description: 'ICMS 20%',
      percent: 20
    });
    vi.mocked(fiscalService.updateIcmsTable).mockResolvedValue({
      id: 'icms-table-18',
      code: '18',
      description: 'ICMS interno 18%',
      percent: 18.5
    });
  });

  it('renders the Vetus-like simple ICMS table screen', async () => {
    const wrapper = mountPage();

    await flushPromises();

    expect(wrapper.text()).toContain('Tabela ICMS');
    expect(wrapper.text()).toContain('Quer cadastrar ICMS de forma prática? Saiba Mais');
    expect(wrapper.find('input[placeholder="Buscar por código ou descrição"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Incluir Nova Tabela');
    expect(wrapper.text()).toContain('ICMS 18%');
    expect(fiscalService.listIcmsTables).toHaveBeenCalledWith({ search: undefined });
  });

  it('creates a new simple ICMS entry from the modal', async () => {
    const wrapper = mountPage();

    await flushPromises();
    const createButton = wrapper.findAll('button').find((button) => button.text().includes('Incluir Nova Tabela'));
    expect(createButton).toBeDefined();
    await createButton?.trigger('click');
    const inputs = wrapper.findAll('input');
    await inputs[1]?.setValue('20');
    await inputs[2]?.setValue('ICMS 20%');
    await inputs[3]?.setValue('20');
    const saveButton = wrapper.findAll('button').find((button) => button.text().includes('Salvar'));
    expect(saveButton).toBeDefined();
    await saveButton?.trigger('click');
    await flushPromises();

    expect(fiscalService.createIcmsTable).toHaveBeenCalledWith({
      code: '20',
      description: 'ICMS 20%',
      percent: 20
    });
  });
});
