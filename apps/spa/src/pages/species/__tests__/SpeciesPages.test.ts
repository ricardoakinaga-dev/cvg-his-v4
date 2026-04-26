import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SpeciesDetailPage from '../SpeciesDetailPage.vue';
import SpeciesFormPage from '../SpeciesFormPage.vue';
import SpeciesListPage from '../SpeciesListPage.vue';
import { animalSpeciesService, type AnimalSpeciesSummary } from '@/services/species';

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

vi.mock('@/services/species', async () => {
  const actual = await vi.importActual<typeof import('@/services/species')>('@/services/species');
  return {
    ...actual,
    animalSpeciesService: {
      list: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  };
});

const mockSpecies: AnimalSpeciesSummary = {
  id: 'species-1',
  accountId: 'acc-1',
  name: 'Canina',
  code: 'CANINE',
  systemCode: 'canine',
  description: 'Pacientes cães.',
  active: true,
  createdAt: '2026-04-01T10:00:00Z',
  updatedAt: '2026-04-01T10:00:00Z'
};

describe('Species pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeParams = {};
    vi.mocked(animalSpeciesService.list).mockResolvedValue([mockSpecies]);
    vi.mocked(animalSpeciesService.getById).mockResolvedValue(mockSpecies);
    vi.mocked(animalSpeciesService.create).mockResolvedValue(mockSpecies);
    vi.mocked(animalSpeciesService.update).mockResolvedValue(mockSpecies);
    vi.mocked(animalSpeciesService.delete).mockResolvedValue(undefined);
  });

  it('renders the Vetus-aligned list and loads active species', async () => {
    const wrapper = mount(SpeciesListPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Espécies');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Id');
    expect(wrapper.text()).toContain('Descrição');
    expect(wrapper.text()).toContain('Espécies Ativas');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('Canina');
    expect(animalSpeciesService.list).toHaveBeenCalledWith({
      search: undefined,
      active: true,
      systemCode: undefined
    });
  });

  it('creates a species with operational and external codes', async () => {
    const wrapper = mount(SpeciesFormPage);

    await wrapper.find('input[placeholder="Ex: Canina"]').setValue('Lagomorfo');
    await wrapper.find('input[placeholder="Ex: CANINE"]').setValue('LAGOMORPH');
    await wrapper.find('select').setValue('other');
    await wrapper.find('textarea').setValue('Espécie usada para coelhos.');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(animalSpeciesService.create).toHaveBeenCalledWith({
      name: 'Lagomorfo',
      code: 'LAGOMORPH',
      systemCode: 'other',
      description: 'Espécie usada para coelhos.',
      active: true
    });
    expect(wrapper.text()).toContain('Espécie salva com sucesso.');
  });

  it('opens detail with duplicate, delete and operational integrations', async () => {
    routeParams = { id: 'species-1' };
    const wrapper = mount(SpeciesDetailPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Detalhes da Espécie');
    expect(wrapper.text()).toContain('Duplicar');
    expect(wrapper.text()).toContain('Excluir');
    expect(wrapper.text()).toContain('Editar Cadastro');
    expect(wrapper.text()).toContain('Animais');
    expect(wrapper.text()).toContain('Raças');
    expect(wrapper.text()).toContain('Atendimento');
    expect(wrapper.text()).toContain('Canina');
  });
});
