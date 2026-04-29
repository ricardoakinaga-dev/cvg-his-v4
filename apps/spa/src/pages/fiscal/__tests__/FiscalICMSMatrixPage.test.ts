import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FiscalICMSMatrixPage from '../FiscalICMSMatrixPage.vue';
import { fiscalService } from '@/services/fiscal';

vi.mock('@/services/fiscal', () => ({
  fiscalService: {
    listIcmsMatrix: vi.fn(),
    createIcmsMatrix: vi.fn()
  }
}));

function mountPage() {
  return mount(FiscalICMSMatrixPage, {
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

describe('FiscalICMSMatrixPage', () => {
  beforeEach(() => {
    vi.mocked(fiscalService.listIcmsMatrix).mockResolvedValue([
      {
        id: 'matrix-sp-rj-interestadual',
        ufOrigin: 'SP',
        ufDestination: 'RJ',
        rate: 12,
        operationType: 'interestadual'
      }
    ]);
    vi.mocked(fiscalService.createIcmsMatrix).mockResolvedValue({
      id: 'matrix-sp-ba-interestadual',
      ufOrigin: 'SP',
      ufDestination: 'BA',
      rate: 7,
      operationType: 'interestadual'
    });
  });

  it('renders the Vetus-like ICMS state matrix screen', async () => {
    const wrapper = mountPage();

    await flushPromises();

    expect(wrapper.text()).toContain('Matriz Estado ICMS');
    expect(wrapper.text()).toContain('Estoque/Configurações Fiscais/Matriz Estado ICMS');
    expect(wrapper.text()).not.toContain('Visão consolidada');
    expect(wrapper.find('input[placeholder="Buscar por ID ou UF Destino"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Incluir Nova Matriz');
    expect(wrapper.text()).toContain('matrix-sp-rj-interestadual');
    expect(fiscalService.listIcmsMatrix).toHaveBeenCalledWith({ search: undefined });
  });

  it('creates a new ICMS state matrix entry from the modal', async () => {
    const wrapper = mountPage();

    await flushPromises();
    const createButton = wrapper.findAll('button').find((button) => button.text().includes('Incluir Nova Matriz'));
    expect(createButton).toBeDefined();
    await createButton?.trigger('click');

    const selects = wrapper.findAll('select');
    await selects[0]?.setValue('SP');
    await selects[1]?.setValue('BA');
    await selects[2]?.setValue('interestadual');

    const inputs = wrapper.findAll('input');
    await inputs[1]?.setValue('7');

    const saveButton = wrapper.findAll('button').find((button) => button.text().includes('Salvar'));
    expect(saveButton).toBeDefined();
    await saveButton?.trigger('click');
    await flushPromises();

    expect(fiscalService.createIcmsMatrix).toHaveBeenCalledWith({
      ufOrigin: 'SP',
      ufDestination: 'BA',
      operationType: 'interestadual',
      rate: 7
    });
  });
});
