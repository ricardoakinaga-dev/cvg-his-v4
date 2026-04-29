import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FiscalNFSELayoutPage from '../FiscalNFSELayoutPage.vue';
import { fiscalService } from '@/services/fiscal';

vi.mock('@/services/fiscal', () => ({
  fiscalService: {
    listNfseLayouts: vi.fn(),
    createNfseLayout: vi.fn(),
    updateNfseLayout: vi.fn()
  }
}));

function mountPage() {
  return mount(FiscalNFSELayoutPage, {
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

describe('FiscalNFSELayoutPage', () => {
  beforeEach(() => {
    vi.mocked(fiscalService.listNfseLayouts).mockResolvedValue([
      {
        id: 'nfse-sp',
        city: 'Sao Paulo',
        state: 'SP',
        municipalityCode: '3550308',
        provider: 'ISS SP',
        version: 'v2026.1',
        active: true,
        environment: 'producao',
        serviceCode: '0407',
        serviceFocus: 'Consultas e servicos veterinarios'
      }
    ]);
    vi.mocked(fiscalService.createNfseLayout).mockResolvedValue({
      id: 'nfse-campinas',
      city: 'Campinas',
      state: 'SP',
      municipalityCode: '3509502',
      provider: 'ISS Campinas',
      version: 'v2026.1',
      active: false,
      environment: 'homologacao',
      serviceCode: '0407',
      serviceFocus: 'Consultas veterinarias'
    });
    vi.mocked(fiscalService.updateNfseLayout).mockResolvedValue({
      id: 'nfse-sp',
      city: 'Sao Paulo',
      state: 'SP',
      municipalityCode: '3550308',
      provider: 'ISS SP',
      version: 'v2026.1',
      active: false,
      environment: 'homologacao',
      serviceCode: '0407',
      serviceFocus: 'Consultas e servicos veterinarios'
    });
  });

  it('renders the Vetus-like NFS-e table screen', async () => {
    const wrapper = mountPage();

    await flushPromises();

    expect(wrapper.text()).toContain('Tabela NFS-e');
    expect(wrapper.text()).toContain('Quer cadastrar NFS-e de forma prática? Saiba Mais');
    expect(wrapper.text()).not.toContain('Backoffice inicial');
    expect(wrapper.find('input[placeholder="Buscar por código ou descrição"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Incluir Nova Tabela');
    expect(wrapper.text()).toContain('Sao Paulo');
    expect(wrapper.text()).toContain('3550308');
    expect(fiscalService.listNfseLayouts).toHaveBeenCalledWith({ search: undefined });
  });

  it('creates a new NFS-e table entry from the modal', async () => {
    const wrapper = mountPage();

    await flushPromises();
    const createButton = wrapper.findAll('button').find((button) => button.text().includes('Incluir Nova Tabela'));
    expect(createButton).toBeDefined();
    await createButton?.trigger('click');

    const inputs = wrapper.findAll('input');
    await inputs[1]?.setValue('Campinas');
    await inputs[2]?.setValue('3509502');
    await inputs[3]?.setValue('ISS Campinas');
    await inputs[4]?.setValue('v2026.1');
    await inputs[5]?.setValue('0407');
    await inputs[6]?.setValue('Consultas veterinarias');

    const selects = wrapper.findAll('select');
    await selects[0]?.setValue('SP');
    await selects[1]?.setValue('homologacao');

    const saveButton = wrapper.findAll('button').find((button) => button.text().includes('Salvar'));
    expect(saveButton).toBeDefined();
    await saveButton?.trigger('click');
    await flushPromises();

    expect(fiscalService.createNfseLayout).toHaveBeenCalledWith({
      city: 'Campinas',
      state: 'SP',
      municipalityCode: '3509502',
      provider: 'ISS Campinas',
      version: 'v2026.1',
      active: false,
      environment: 'homologacao',
      serviceCode: '0407',
      serviceFocus: 'Consultas veterinarias'
    });
  });
});
