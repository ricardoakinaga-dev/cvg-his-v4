import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LaboratoryReportTypesPage from '../LaboratoryReportTypesPage.vue';
import { laboratoryService } from '@/services/laboratory';

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    listReportTypes: vi.fn()
  }
}));

describe('LaboratoryReportTypesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(laboratoryService.listReportTypes).mockResolvedValue([
      {
        id: 'cat_001',
        name: 'Hemograma',
        code: 'HEM',
        category: 'Laboratorial',
        description: 'Exame hematologico completo',
        active: true
      },
      {
        id: 'cat_004',
        name: 'Radiografia',
        code: 'RX',
        category: 'Imagem',
        description: 'Imagem radiografica simples',
        active: false
      }
    ]);
  });

  it('renders Vetus-like report type registry with filters, actions and model column', async () => {
    const wrapper = mount(LaboratoryReportTypesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Tipos de Laudo');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Código');
    expect(wrapper.text()).toContain('Descrição');
    expect(wrapper.text()).toContain('Categoria');
    expect(wrapper.text()).toContain('Situação');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Hemograma');
    expect(wrapper.text()).toContain('Radiografia');
    expect(wrapper.text()).toContain('Modelo');
    expect(wrapper.text()).toContain('Ativo');
    expect(wrapper.text()).toContain('Inativo');
    expect(wrapper.text()).toContain('Abrir');
    expect(laboratoryService.listReportTypes).toHaveBeenCalledWith({
      code: undefined,
      description: undefined,
      category: undefined,
      status: undefined
    });
  });

  it('sends Vetus-like report type filters to the laboratory API', async () => {
    const wrapper = mount(LaboratoryReportTypesPage);
    await flushPromises();

    const searchInputs = wrapper.findAll('input[type="search"]');
    await searchInputs[0].setValue('HEM');
    await searchInputs[1].setValue('Hemograma');
    await searchInputs[2].setValue('Laboratorial');
    await wrapper.find('select').setValue('active');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(laboratoryService.listReportTypes).toHaveBeenLastCalledWith({
      code: 'HEM',
      description: 'Hemograma',
      category: 'Laboratorial',
      status: 'active'
    });
  });
});
