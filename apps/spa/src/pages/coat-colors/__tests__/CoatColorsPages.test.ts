import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CoatColorDetailPage from '../CoatColorDetailPage.vue';
import CoatColorFormPage from '../CoatColorFormPage.vue';
import CoatColorsListPage from '../CoatColorsListPage.vue';
import { coatColorService, type CoatColorSummary } from '@/services/coatColors';

const routerPush = vi.fn();
let routeParams: Record<string, string> = {};

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush
  }),
  useRoute: () => ({
    params: routeParams
  })
}));

vi.mock('@/services/coatColors', async () => {
  const actual = await vi.importActual<typeof import('@/services/coatColors')>('@/services/coatColors');
  return {
    ...actual,
    coatColorService: {
      list: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  };
});

const mockCoatColor: CoatColorSummary = {
  id: 'coat-color-1',
  accountId: 'acc-1',
  name: 'Tricolor',
  code: 'TRICOLOR',
  colorGroup: 'Composta',
  hexColor: '#7c5f46',
  description: 'Composição de três cores na pelagem.',
  active: true,
  createdAt: '2026-04-01T10:00:00Z',
  updatedAt: '2026-04-01T10:00:00Z'
};

describe('Coat colors pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeParams = {};
    vi.mocked(coatColorService.list).mockResolvedValue([mockCoatColor]);
    vi.mocked(coatColorService.getById).mockResolvedValue(mockCoatColor);
    vi.mocked(coatColorService.create).mockResolvedValue(mockCoatColor);
    vi.mocked(coatColorService.update).mockResolvedValue(mockCoatColor);
    vi.mocked(coatColorService.delete).mockResolvedValue(undefined);
  });

  it('renders the Vetus-aligned list and loads active coat colors', async () => {
    const wrapper = mount(CoatColorsListPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Cores/Pelagens');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Id');
    expect(wrapper.text()).toContain('Descrição');
    expect(wrapper.text()).toContain('Grupo');
    expect(wrapper.text()).toContain('Cores Ativas');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('Tricolor');
    expect(coatColorService.list).toHaveBeenCalledWith({
      search: undefined,
      active: true,
      colorGroup: undefined
    });
  });

  it('creates a coat color with group, visual color and external code', async () => {
    const wrapper = mount(CoatColorFormPage);
    const inputs = wrapper.findAll('input');

    await inputs[0]?.setValue('Chocolate');
    await inputs[1]?.setValue('CHOCOLATE');
    await inputs[2]?.setValue('Solida');
    await wrapper.find('input[type="color"]').setValue('#4b2e22');
    await wrapper.find('textarea').setValue('Pelagem marrom escura.');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(coatColorService.create).toHaveBeenCalledWith({
      name: 'Chocolate',
      code: 'CHOCOLATE',
      colorGroup: 'Solida',
      hexColor: '#4b2e22',
      description: 'Pelagem marrom escura.',
      active: true
    });
    expect(wrapper.text()).toContain('Cor/Pelagem salva com sucesso.');
  });

  it('opens detail with duplicate, delete and operational integrations', async () => {
    routeParams = { id: 'coat-color-1' };
    const wrapper = mount(CoatColorDetailPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Detalhes da Cor/Pelagem');
    expect(wrapper.text()).toContain('Duplicar');
    expect(wrapper.text()).toContain('Excluir');
    expect(wrapper.text()).toContain('Editar Cadastro');
    expect(wrapper.text()).toContain('Animais');
    expect(wrapper.text()).toContain('Atendimento');
    expect(wrapper.text()).toContain('Relatórios');
    expect(wrapper.text()).toContain('Tricolor');
  });
});
