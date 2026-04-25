import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ResponsibilityTermDetailPage from '../ResponsibilityTermDetailPage.vue';
import ResponsibilityTermFormPage from '../ResponsibilityTermFormPage.vue';
import ResponsibilityTermsListPage from '../ResponsibilityTermsListPage.vue';
import { responsibilityTermsService, type ResponsibilityTermSummary } from '@/services/responsibilityTerms';

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

vi.mock('@/services/responsibilityTerms', async () => {
  const actual = await vi.importActual<typeof import('@/services/responsibilityTerms')>(
    '@/services/responsibilityTerms'
  );
  return {
    ...actual,
    responsibilityTermsService: {
      list: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  };
});

const mockTerm: ResponsibilityTermSummary = {
  id: 'term-1',
  accountId: 'acc-1',
  title: 'Termo de Internação',
  code: 'TERM-INTERNACAO',
  usageContext: 'internacao',
  content: 'Responsável ciente dos riscos da internação.',
  active: true,
  requiresOwnerSignature: true,
  requiresWitnessSignature: false,
  createdAt: '2026-04-01T10:00:00Z',
  updatedAt: '2026-04-01T10:00:00Z'
};

describe('Responsibility terms pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeParams = {};
    vi.mocked(responsibilityTermsService.list).mockResolvedValue([mockTerm]);
    vi.mocked(responsibilityTermsService.getById).mockResolvedValue(mockTerm);
    vi.mocked(responsibilityTermsService.create).mockResolvedValue(mockTerm);
    vi.mocked(responsibilityTermsService.update).mockResolvedValue(mockTerm);
  });

  it('renders the Vetus-aligned list and loads active terms', async () => {
    const wrapper = mount(ResponsibilityTermsListPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Termos de Responsabilidade');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Id');
    expect(wrapper.text()).toContain('Descrição');
    expect(wrapper.text()).toContain('Termos Ativos');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Abrir');
    expect(wrapper.text()).toContain('Termo de Internação');
    expect(responsibilityTermsService.list).toHaveBeenCalledWith({
      search: undefined,
      active: true,
      usageContext: undefined
    });
  });

  it('creates a responsibility term with document and signature fields', async () => {
    const wrapper = mount(ResponsibilityTermFormPage);

    await wrapper.find('input[placeholder="Ex: Termo de internação"]').setValue('Termo de Procedimento');
    await wrapper.find('input[placeholder="Ex: TER-INTERNACAO"]').setValue('TERM-PROC');
    await wrapper.find('select').setValue('procedimento');
    await wrapper.find('textarea').setValue('Autorizo a realização do procedimento.');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(responsibilityTermsService.create).toHaveBeenCalledWith({
      title: 'Termo de Procedimento',
      code: 'TERM-PROC',
      usageContext: 'procedimento',
      content: 'Autorizo a realização do procedimento.',
      active: true,
      requiresOwnerSignature: true,
      requiresWitnessSignature: false
    });
    expect(wrapper.text()).toContain('Termo salvo com sucesso.');
  });

  it('opens detail with print, duplicate and operational integrations', async () => {
    routeParams = { id: 'term-1' };
    const wrapper = mount(ResponsibilityTermDetailPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Detalhes do Termo');
    expect(wrapper.text()).toContain('Duplicar');
    expect(wrapper.text()).toContain('Imprimir');
    expect(wrapper.text()).toContain('Editar Cadastro');
    expect(wrapper.text()).toContain('Atendimento');
    expect(wrapper.text()).toContain('Internação');
    expect(wrapper.text()).toContain('Prontuário/Comanda');
    expect(wrapper.text()).toContain('Responsável ciente dos riscos da internação.');
  });
});
