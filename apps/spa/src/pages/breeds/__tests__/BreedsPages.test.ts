import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BreedDetailPage from '../BreedDetailPage.vue';
import BreedFormPage from '../BreedFormPage.vue';
import BreedsListPage from '../BreedsListPage.vue';
import { breedsService, type BreedSummary } from '@/services/breeds';

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

vi.mock('@/services/breeds', async () => {
  const actual = await vi.importActual<typeof import('@/services/breeds')>('@/services/breeds');
  return {
    ...actual,
    breedsService: {
      list: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  };
});

const mockBreed: BreedSummary = {
  id: 'breed-1',
  accountId: 'acc-1',
  name: 'Golden Retriever',
  code: 'CAN-GOLD',
  species: 'canine',
  description: 'Raça canina de grande porte.',
  active: true,
  createdAt: '2026-04-01T10:00:00Z',
  updatedAt: '2026-04-01T10:00:00Z'
};

describe('Breeds pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeParams = {};
    vi.mocked(breedsService.list).mockResolvedValue([mockBreed]);
    vi.mocked(breedsService.getById).mockResolvedValue(mockBreed);
    vi.mocked(breedsService.create).mockResolvedValue(mockBreed);
    vi.mocked(breedsService.update).mockResolvedValue(mockBreed);
    vi.mocked(breedsService.delete).mockResolvedValue(undefined);
  });

  it('renders the Vetus-aligned list and loads active breeds', async () => {
    const wrapper = mount(BreedsListPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Raças');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Id');
    expect(wrapper.text()).toContain('Descrição');
    expect(wrapper.text()).toContain('Raças Ativas');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('Golden Retriever');
    expect(breedsService.list).toHaveBeenCalledWith({
      search: undefined,
      active: true,
      species: undefined
    });
  });

  it('creates a breed with species, code and active status', async () => {
    const wrapper = mount(BreedFormPage);

    await wrapper.find('input[placeholder="Ex: Golden Retriever"]').setValue('Siamês');
    await wrapper.find('input[placeholder="Ex: CAN-GOLD"]').setValue('FEL-SIAM');
    await wrapper.find('select').setValue('feline');
    await wrapper.find('textarea').setValue('Raça felina cadastrada para histórico.');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(breedsService.create).toHaveBeenCalledWith({
      name: 'Siamês',
      code: 'FEL-SIAM',
      species: 'feline',
      description: 'Raça felina cadastrada para histórico.',
      active: true
    });
    expect(wrapper.text()).toContain('Raça salva com sucesso.');
  });

  it('opens detail with duplicate, delete and operational integrations', async () => {
    routeParams = { id: 'breed-1' };
    const wrapper = mount(BreedDetailPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Detalhes da Raça');
    expect(wrapper.text()).toContain('Duplicar');
    expect(wrapper.text()).toContain('Excluir');
    expect(wrapper.text()).toContain('Editar Cadastro');
    expect(wrapper.text()).toContain('Animais');
    expect(wrapper.text()).toContain('Clientes');
    expect(wrapper.text()).toContain('Atendimento');
    expect(wrapper.text()).toContain('Golden Retriever');
  });
});
