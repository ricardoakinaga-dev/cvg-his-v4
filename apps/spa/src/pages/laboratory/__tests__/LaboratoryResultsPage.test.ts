import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LaboratoryResultsPage from '../LaboratoryResultsPage.vue';
import { laboratoryService } from '@/services/laboratory';
import { mlService } from '@/services/ml';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} })
}));

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    listResults: vi.fn()
  }
}));

vi.mock('@/services/ml', () => ({
  mlService: {
    getLabAnomalies: vi.fn()
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/owner', () => ({
  ownerService: {
    list: vi.fn()
  }
}));

describe('LaboratoryResultsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(laboratoryService.listResults).mockResolvedValue([
      {
        id: 'diag_laudo_1' as never,
        accountId: 'acc_1' as never,
        encounterId: 'enc_1' as never,
        patientId: 'paciente_1' as never,
        examType: 'Hemograma',
        examCatalogId: 'cat_001',
        reason: 'Check-up',
        status: 'resulted',
        resultSummary: 'Hemograma dentro da normalidade',
        createdAt: '2026-04-24T08:30:00.000Z',
        updatedAt: '2026-04-25T10:00:00.000Z'
      }
    ]);
    vi.mocked(patientService.list).mockResolvedValue([
      {
        id: 'paciente_1',
        accountId: 'acc_1',
        name: 'Mel',
        species: 'Canina',
        sex: 'female',
        primaryOwnerId: 'owner_1',
        status: 'active',
        createdAt: '2026-04-20T08:00:00.000Z',
        updatedAt: '2026-04-20T08:00:00.000Z'
      }
    ]);
    vi.mocked(ownerService.list).mockResolvedValue([
      {
        id: 'owner_1',
        accountId: 'acc_1',
        fullName: 'Cliente Exemplo',
        contacts: [],
        financialResponsible: true,
        status: 'active',
        createdAt: '2026-04-20T08:00:00.000Z',
        updatedAt: '2026-04-20T08:00:00.000Z'
      }
    ]);
    vi.mocked(mlService.getLabAnomalies).mockResolvedValue({
      generatedAt: '2026-04-25T10:00:00.000Z',
      totalAnalyzed: 1,
      flaggedOrders: 0,
      flags: []
    });
  });

  it('renders Vetus-like reports filters and table columns', async () => {
    const wrapper = mount(LaboratoryResultsPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Laudos');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Código do Laudo');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('Proprietário');
    expect(wrapper.text()).toContain('Animal');
    expect(wrapper.text()).toContain('Data da Finalização');
    expect(wrapper.text()).toContain('Data de Entrada');
    expect(wrapper.text()).toContain('Corpo do Laudo');
    expect(wrapper.text()).toContain('Pesquisar Laudos Fechados');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Cliente Exemplo');
    expect(wrapper.text()).toContain('Mel');
    expect(wrapper.text()).toContain('25/04/2026');
    expect(wrapper.text()).toContain('24/04/2026');
    expect(wrapper.text()).toContain('R$ 0,00');
  });

  it('sends report filters to the laboratory API when searching', async () => {
    const wrapper = mount(LaboratoryResultsPage);
    await flushPromises();

    const searchInputs = wrapper.findAll('input[type="search"]');
    await searchInputs[0].setValue('diag');
    await searchInputs[4].setValue('normalidade');
    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0].setValue('2026-04-25');
    await dateInputs[1].setValue('2026-04-24');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(laboratoryService.listResults).toHaveBeenLastCalledWith({
      code: 'diag',
      finalizedAt: '2026-04-25',
      enteredAt: '2026-04-24',
      body: 'normalidade',
      closed: true
    });
  });

  it('keeps the page usable when reports fail to load', async () => {
    vi.mocked(laboratoryService.listResults).mockRejectedValue(new Error('Unexpected error'));

    const wrapper = mount(LaboratoryResultsPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Laudos');
    expect(wrapper.text()).toContain('Nenhum registro encontrado');
    expect(wrapper.text()).toContain('Unexpected error');
  });
});
