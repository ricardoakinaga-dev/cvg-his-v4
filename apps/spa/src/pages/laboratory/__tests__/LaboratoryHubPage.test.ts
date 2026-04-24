import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LaboratoryHubPage from '../LaboratoryHubPage.vue';
import { laboratoryService } from '@/services/laboratory';

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    getDashboardSummary: vi.fn()
  }
}));

describe('LaboratoryHubPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(laboratoryService.getDashboardSummary).mockResolvedValue({
      totalOrders: 8,
      pendingOrders: 2,
      pendingResults: 3,
      releasedResults: 4,
      equipmentActive: 5
    });
  });

  it('renders the operational laboratory architecture from Vetus documents', async () => {
    const wrapper = mount(LaboratoryHubPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Arquitetura operacional do Laboratório');
    expect(wrapper.text()).toContain('Requisição de exame');
    expect(wrapper.text()).toContain('Esteira de Exames');
    expect(wrapper.text()).toContain('Coleta');
    expect(wrapper.text()).toContain('Resultado especializado');
    expect(wrapper.text()).toContain('Laudo');
    expect(wrapper.text()).toContain('Entrega');
    expect(wrapper.text()).toContain('Exames');
    expect(wrapper.text()).toContain('Laudos');
    expect(wrapper.text()).toContain('Tipos de Laudo');
    expect(wrapper.text()).toContain('Vlr. Ref. Hemograma');
    expect(wrapper.text()).toContain('Vlr. Ref. Bioquímico');
    expect(wrapper.text()).toContain('Equipamentos');
  });
});
