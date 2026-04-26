import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LaboratoryHemogramReferenceValuesPage from '../LaboratoryHemogramReferenceValuesPage.vue';
import { laboratoryService } from '@/services/laboratory';

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    listHemogramReferenceValues: vi.fn()
  }
}));

describe('LaboratoryHemogramReferenceValuesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(laboratoryService.listHemogramReferenceValues).mockResolvedValue([
      {
        id: 'ref-hem-1',
        parameter: 'Hemacias',
        examType: 'HEM',
        minValue: 5.5,
        maxValue: 8.5,
        unit: 'milhoes/uL'
      },
      {
        id: 'ref-hem-2',
        parameter: 'Leucocitos',
        examType: 'HEM',
        minValue: 6,
        maxValue: 17,
        unit: 'mil/uL'
      }
    ]);
  });

  it('renders Vetus-like hemogram reference values registry with filters and actions', async () => {
    const wrapper = mount(LaboratoryHemogramReferenceValuesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Vlr. Ref. Hemograma');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Código');
    expect(wrapper.text()).toContain('Parâmetro');
    expect(wrapper.text()).toContain('Unidade');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Valor Mínimo');
    expect(wrapper.text()).toContain('Valor Máximo');
    expect(wrapper.text()).toContain('Faixa');
    expect(wrapper.text()).toContain('Hemacias');
    expect(wrapper.text()).toContain('Leucocitos');
    expect(wrapper.text()).toContain('Abrir');
    expect(laboratoryService.listHemogramReferenceValues).toHaveBeenCalledWith({
      id: undefined,
      parameter: undefined,
      unit: undefined
    });
  });

  it('sends Vetus-like hemogram reference filters to the laboratory API', async () => {
    const wrapper = mount(LaboratoryHemogramReferenceValuesPage);
    await flushPromises();

    const searchInputs = wrapper.findAll('input[type="search"]');
    await searchInputs[0].setValue('ref-hem');
    await searchInputs[1].setValue('Hemacias');
    await searchInputs[2].setValue('milhoes');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(laboratoryService.listHemogramReferenceValues).toHaveBeenLastCalledWith({
      id: 'ref-hem',
      parameter: 'Hemacias',
      unit: 'milhoes'
    });
  });
});
