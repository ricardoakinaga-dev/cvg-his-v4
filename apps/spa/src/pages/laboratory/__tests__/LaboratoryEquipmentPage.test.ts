import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LaboratoryEquipmentPage from '../LaboratoryEquipmentPage.vue';
import { laboratoryService } from '@/services/laboratory';

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    listEquipment: vi.fn()
  }
}));

describe('LaboratoryEquipmentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(laboratoryService.listEquipment).mockResolvedValue([
      {
        id: 'lab-eq-bio',
        name: 'Bioquimico ChemLab 300',
        type: 'Bioquimica',
        serialNumber: 'BIO-300-114',
        status: 'active',
        lastCalibrationAt: '2026-04-03T08:30:00.000Z'
      },
      {
        id: 'lab-eq-uri',
        name: 'Leitor de Urinalise StripScan',
        type: 'Urinalise',
        serialNumber: 'URI-7781',
        status: 'maintenance',
        lastCalibrationAt: '2025-01-20T14:00:00.000Z'
      }
    ]);
  });

  it('renders Vetus-like equipment registry with filters, actions and calibration governance', async () => {
    const wrapper = mount(LaboratoryEquipmentPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Equipamentos');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Código');
    expect(wrapper.text()).toContain('Descrição');
    expect(wrapper.text()).toContain('Tipo');
    expect(wrapper.text()).toContain('Situação');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Bioquimico ChemLab 300');
    expect(wrapper.text()).toContain('Leitor de Urinalise StripScan');
    expect(wrapper.text()).toContain('Última Calibração');
    expect(wrapper.text()).toContain('Calibração');
    expect(wrapper.text()).toContain('Manutenção');
    expect(wrapper.text()).toContain('Abrir');
    expect(laboratoryService.listEquipment).toHaveBeenCalledWith({
      id: undefined,
      description: undefined,
      type: undefined,
      status: undefined
    });
  });

  it('sends Vetus-like equipment filters to the laboratory API', async () => {
    const wrapper = mount(LaboratoryEquipmentPage);
    await flushPromises();

    const searchInputs = wrapper.findAll('input[type="search"]');
    await searchInputs[0].setValue('lab-eq');
    await searchInputs[1].setValue('Bioquimico');
    await searchInputs[2].setValue('Bioquimica');
    await wrapper.find('select').setValue('active');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(laboratoryService.listEquipment).toHaveBeenLastCalledWith({
      id: 'lab-eq',
      description: 'Bioquimico',
      type: 'Bioquimica',
      status: 'active'
    });
  });
});
