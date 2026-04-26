import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LaboratoryBiochemistryReferenceValuesPage from '../LaboratoryBiochemistryReferenceValuesPage.vue';
import { laboratoryService } from '@/services/laboratory';

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    listBiochemistryReferenceValues: vi.fn()
  }
}));

describe('LaboratoryBiochemistryReferenceValuesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(laboratoryService.listBiochemistryReferenceValues).mockResolvedValue([
      {
        id: 'ref-bio-1',
        parameter: 'ALT',
        examType: 'BIO',
        minValue: 10,
        maxValue: 125,
        unit: 'U/L'
      },
      {
        id: 'ref-bio-2',
        parameter: 'Creatinina',
        examType: 'BIO',
        minValue: 0.5,
        maxValue: 1.8,
        unit: 'mg/dL'
      }
    ]);
  });

  it('renders Vetus-like biochemistry reference values registry with filters and actions', async () => {
    const wrapper = mount(LaboratoryBiochemistryReferenceValuesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Vlr. Ref. Bioquímico');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Código');
    expect(wrapper.text()).toContain('Parâmetro');
    expect(wrapper.text()).toContain('Unidade');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Valor Mínimo');
    expect(wrapper.text()).toContain('Valor Máximo');
    expect(wrapper.text()).toContain('Faixa');
    expect(wrapper.text()).toContain('ALT');
    expect(wrapper.text()).toContain('Creatinina');
    expect(wrapper.text()).toContain('Abrir');
    expect(laboratoryService.listBiochemistryReferenceValues).toHaveBeenCalledWith({
      id: undefined,
      parameter: undefined,
      unit: undefined
    });
  });

  it('sends Vetus-like biochemistry reference filters to the laboratory API', async () => {
    const wrapper = mount(LaboratoryBiochemistryReferenceValuesPage);
    await flushPromises();

    const searchInputs = wrapper.findAll('input[type="search"]');
    await searchInputs[0].setValue('ref-bio');
    await searchInputs[1].setValue('ALT');
    await searchInputs[2].setValue('U/L');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(laboratoryService.listBiochemistryReferenceValues).toHaveBeenLastCalledWith({
      id: 'ref-bio',
      parameter: 'ALT',
      unit: 'U/L'
    });
  });
});
