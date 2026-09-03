import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LaboratoryOrdersPage from '../LaboratoryOrdersPage.vue';
import { laboratoryService } from '@/services/laboratory';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    listOrders: vi.fn(),
    recordResult: vi.fn()
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
    vi.mocked(laboratoryService.recordResult).mockImplementation(async (orderId, payload) => ({
      id: orderId as never,
      accountId: 'acc_1' as never,
      encounterId: 'enc_1' as never,
      patientId: 'paciente_1' as never,
      examType: 'Hemograma',
      examCatalogId: 'cat_001',
      reason: 'Backlog de coleta',
      status: payload.status,
      collectedAt: payload.status === 'collected' ? '2026-04-24T09:00:00.000Z' : undefined,
      collectedByUserId: payload.collectedByUserId,
      resultSummary: payload.resultSummary,
      resultedAt: payload.status === 'resulted' ? '2026-04-24T10:00:00.000Z' : undefined,
      releasedByUserId: payload.status === 'resulted' ? 'user-1' : undefined,
      signedByUserId: payload.signedByUserId,
      signatureHash: payload.status === 'resulted' ? 'signature-hash' : undefined,
      createdAt: '2026-04-24T08:30:00.000Z',
      updatedAt: '2026-04-24T09:00:00.000Z'
    }));
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

    const wrapper = mount(LaboratoryOrdersPage, {
      global: {
        stubs: {
          DsModal: {
            template: '<div v-if="open" class="modal-stub"><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          }
        }
      }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Exames');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('Animal');
    expect(wrapper.text()).toContain('Data');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Esteira');
    expect(wrapper.text()).toContain('Vínculo');
    expect(wrapper.text()).toContain('1 exame(s)');
    expect(wrapper.text()).toContain('1 aguardando coleta');
    expect(wrapper.text()).toContain('Aguardando coleta');
    expect(wrapper.text()).toContain('1. Pedido recebido');
    expect(wrapper.text()).toContain('Coleta pendente');
    expect(wrapper.text()).toContain('Cliente Exemplo');
    expect(wrapper.text()).toContain('Mel');
    expect(wrapper.text()).toContain('24/04/2026');
    expect(wrapper.find('a[href="/patients/paciente_1"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/medical-records/enc_1"]').exists()).toBe(true);
  });

  it('keeps the page usable when the laboratory API returns an error', async () => {
    vi.mocked(laboratoryService.listOrders).mockRejectedValue(new Error('Unexpected error'));

    const wrapper = mount(LaboratoryOrdersPage, {
      global: {
        stubs: {
          DsModal: {
            template: '<div v-if="open" class="modal-stub"><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          }
        }
      }
    });
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

    const wrapper = mount(LaboratoryOrdersPage, {
      global: {
        stubs: {
          DsModal: {
            template: '<div v-if="open" class="modal-stub"><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          }
        }
      }
    });
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

  it('records collection from the exam workflow and keeps the patient link visible', async () => {
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
    vi.mocked(laboratoryService.recordResult).mockResolvedValue({
      id: 'diag_1' as never,
      accountId: 'acc_1' as never,
      encounterId: 'enc_1' as never,
      patientId: 'paciente_1' as never,
      examType: 'Hemograma',
      examCatalogId: 'cat_001',
      reason: 'Backlog de coleta',
      status: 'collected',
      collectedAt: '2026-04-24T09:00:00.000Z',
      collectedByUserId: 'lab-ui',
      createdAt: '2026-04-24T08:30:00.000Z',
      updatedAt: '2026-04-24T09:00:00.000Z'
    });

    const wrapper = mount(LaboratoryOrdersPage);
    await flushPromises();

    const collectButton = wrapper.findAll('button').find((button) => button.text() === 'Coletar');
    expect(collectButton).toBeTruthy();
    await collectButton!.trigger('click');
    await flushPromises();

    expect(laboratoryService.recordResult).toHaveBeenCalledWith('diag_1', {
      status: 'collected',
      collectedByUserId: 'lab-ui'
    });
    expect(wrapper.text()).toContain('Coleta registrada com sucesso.');
    expect(wrapper.text()).toContain('Coletado');
    expect(wrapper.text()).toContain('2. Aguardando resultado');
    expect(wrapper.find('a[href="/patients/paciente_1"]').exists()).toBe(true);
  });

  it('releases a collected exam result with a clinical summary', async () => {
    vi.mocked(laboratoryService.listOrders).mockResolvedValue([
      {
        id: 'diag_1' as never,
        accountId: 'acc_1' as never,
        encounterId: 'enc_1' as never,
        patientId: 'paciente_1' as never,
        examType: 'Hemograma',
        examCatalogId: 'cat_001',
        reason: 'Backlog de coleta',
        status: 'collected',
        collectedAt: '2026-04-24T09:00:00.000Z',
        collectedByUserId: 'lab-ui',
        createdAt: '2026-04-24T08:30:00.000Z',
        updatedAt: '2026-04-24T09:00:00.000Z'
      }
    ]);
    vi.mocked(laboratoryService.recordResult).mockResolvedValue({
      id: 'diag_1' as never,
      accountId: 'acc_1' as never,
      encounterId: 'enc_1' as never,
      patientId: 'paciente_1' as never,
      examType: 'Hemograma',
      examCatalogId: 'cat_001',
      reason: 'Backlog de coleta',
      status: 'resulted',
      collectedAt: '2026-04-24T09:00:00.000Z',
      collectedByUserId: 'lab-ui',
      resultSummary: 'Sem alterações relevantes.',
      resultedAt: '2026-04-24T10:00:00.000Z',
      releasedByUserId: 'user-1',
      signedByUserId: 'rt-lab',
      signatureHash: 'signature-hash',
      createdAt: '2026-04-24T08:30:00.000Z',
      updatedAt: '2026-04-24T10:00:00.000Z'
    });

    const wrapper = mount(LaboratoryOrdersPage);
    await flushPromises();

    const releaseButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Liberar resultado');
    expect(releaseButton).toBeTruthy();
    const vm = wrapper.vm as any;
    vm.openResultModal(vm.decoratedOrders[0]);
    vm.resultSummary = 'Sem alterações relevantes.';
    await vm.submitResult();
    await flushPromises();

    expect(laboratoryService.recordResult).toHaveBeenCalledWith('diag_1', {
      status: 'resulted',
      resultSummary: 'Sem alterações relevantes.'
    });
    expect(wrapper.text()).toContain('Resultado liberado com sucesso.');
    expect(wrapper.text()).toContain('Resultado liberado');
    expect(wrapper.text()).toContain('3. Liberado ao prontuário');
    expect(wrapper.text()).toContain('Liberado por rt-lab');
  });

  it('exposes report and delivery actions for the canonical laboratory lifecycle', async () => {
    vi.mocked(laboratoryService.listOrders).mockResolvedValue([
      {
        id: 'diag_analysis' as never,
        accountId: 'acc_1' as never,
        encounterId: 'enc_1' as never,
        patientId: 'paciente_1' as never,
        examType: 'Hemograma',
        examCatalogId: 'cat_001',
        reason: 'Aguardando laudo',
        status: 'in_analysis' as never,
        collectionAttempt: 1,
        analysisStartedAt: '2026-04-24T09:30:00.000Z',
        analysisStartedByUserId: 'analyst-1',
        createdAt: '2026-04-24T08:30:00.000Z',
        updatedAt: '2026-04-24T09:30:00.000Z'
      } as never
    ]);

    const wrapper = mount(LaboratoryOrdersPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Em análise');
    expect(wrapper.text()).toContain('Reportar resultado');
    expect(wrapper.text()).toContain('Tentativa 1');
  });
});
