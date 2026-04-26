import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LaboratoryOrdersPage from '../LaboratoryOrdersPage.vue';
import { laboratoryService } from '@/services/laboratory';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    listOrders: vi.fn()
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

describe('LaboratoryOrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it('renders laboratory exam orders loaded from the API contract', async () => {
    vi.mocked(laboratoryService.listOrders).mockResolvedValue([
      {
        id: 'diag_1' as never,
        accountId: 'acc_1' as never,
        encounterId: 'enc_1' as never,
        patientId: 'paciente_1' as never,
        examType: 'Hemograma',
        examCatalogId: 'cat_001',
        reason: 'Backlog de coleta',
        status: 'requested',
        createdAt: '2026-04-24T08:30:00.000Z',
        updatedAt: '2026-04-24T08:30:00.000Z'
      }
    ]);

    const wrapper = mount(LaboratoryOrdersPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Exames');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('Animal');
    expect(wrapper.text()).toContain('Data');
    expect(wrapper.text()).toContain('1 exame(s)');
    expect(wrapper.text()).toContain('1 aguardando coleta');
    expect(wrapper.text()).toContain('Cliente Exemplo');
    expect(wrapper.text()).toContain('Mel');
    expect(wrapper.text()).toContain('24/04/2026');
  });

  it('keeps the page usable when the laboratory API returns an error', async () => {
    vi.mocked(laboratoryService.listOrders).mockRejectedValue(new Error('Unexpected error'));

    const wrapper = mount(LaboratoryOrdersPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Exames');
    expect(wrapper.text()).toContain('Nenhum registro encontrado');
    expect(wrapper.text()).toContain('Unexpected error');
  });

  it('filters exams by client, animal and date before searching', async () => {
    vi.mocked(laboratoryService.listOrders).mockResolvedValue([
      {
        id: 'diag_1' as never,
        accountId: 'acc_1' as never,
        encounterId: 'enc_1' as never,
        patientId: 'paciente_1' as never,
        examType: 'Hemograma',
        examCatalogId: 'cat_001',
        reason: 'Backlog de coleta',
        status: 'requested',
        createdAt: '2026-04-24T08:30:00.000Z',
        updatedAt: '2026-04-24T08:30:00.000Z'
      },
      {
        id: 'diag_2' as never,
        accountId: 'acc_1' as never,
        encounterId: 'enc_2' as never,
        patientId: 'paciente_2' as never,
        examType: 'Bioquimico',
        reason: 'Controle',
        status: 'requested',
        createdAt: '2026-04-25T08:30:00.000Z',
        updatedAt: '2026-04-25T08:30:00.000Z'
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
      },
      {
        id: 'paciente_2',
        accountId: 'acc_1',
        name: 'Nina',
        species: 'Felina',
        sex: 'female',
        primaryOwnerId: 'owner_2',
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
      },
      {
        id: 'owner_2',
        accountId: 'acc_1',
        fullName: 'Outro Cliente',
        contacts: [],
        financialResponsible: true,
        status: 'active',
        createdAt: '2026-04-20T08:00:00.000Z',
        updatedAt: '2026-04-20T08:00:00.000Z'
      }
    ]);

    const wrapper = mount(LaboratoryOrdersPage);
    await flushPromises();

    await wrapper.find('input[type="search"]').setValue('Cliente Exemplo');
    await wrapper.findAll('input[type="search"]')[1].setValue('Mel');
    await wrapper.find('input[type="date"]').setValue('2026-04-24');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Cliente Exemplo');
    expect(wrapper.text()).toContain('Mel');
    expect(wrapper.text()).not.toContain('Outro Cliente');
    expect(wrapper.text()).not.toContain('Nina');
  });
});
