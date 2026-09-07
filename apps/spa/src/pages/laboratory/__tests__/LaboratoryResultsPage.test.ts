import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LaboratoryResultsPage from '../LaboratoryResultsPage.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import { laboratoryService } from '@/services/laboratory';
import { mlService } from '@/services/ml';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} })
}));

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    listResults: vi.fn(),
    printReport: vi.fn()
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
        resultValues: [{ parameter: 'pH urinário', value: '6.0' }],
        resultedAt: '2026-04-25T10:00:00.000Z',
        releasedByUserId: 'user-1',
        signedByUserId: 'rt-lab',
        signatureHash: 'hash-assinado',
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
    vi.mocked(laboratoryService.printReport).mockResolvedValue(
      '<!doctype html><html><body><h1>Laudo Laboratorial</h1><p>hash-assinado</p></body></html>'
    );
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
    expect(wrapper.text()).not.toContain('R$ 0,00');
    expect(wrapper.findAll('.summary-grid dd').map((item) => item.text())).toEqual(['1', '1', '0']);
    expect(wrapper.get('.advanced-filters').attributes('open')).toBeUndefined();
    expect(wrapper.text()).toContain('Laudo');
  });

  it('loads printable signed report preview', async () => {
    const wrapper = mount(LaboratoryResultsPage, {
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

    const printButton = wrapper.findAll('button').find((button) => button.text() === 'Laudo');
    expect(printButton).toBeTruthy();
    await printButton!.trigger('click');
    await flushPromises();

    expect(laboratoryService.printReport).toHaveBeenCalledWith('diag_laudo_1');
    expect(wrapper.find('iframe[title="Pré-visualização do laudo"]').exists()).toBe(true);
    expect(wrapper.find('iframe').attributes('srcdoc')).toContain('Laudo Laboratorial');
    expect(wrapper.find('iframe').attributes('srcdoc')).toContain('hash-assinado');
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

  it('keeps structured-only values visible when filtering the report body', async () => {
    const wrapper = mount(LaboratoryResultsPage);
    await flushPromises();

    const searchInputs = wrapper.findAll('input[type="search"]');
    await searchInputs[4].setValue('urinario');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('diag_laudo_1');
    expect(laboratoryService.listResults).toHaveBeenLastCalledWith({
      code: undefined,
      finalizedAt: undefined,
      enteredAt: undefined,
      body: 'urinario',
      closed: true
    });
  });

  it('keeps the page usable when reports fail to load', async () => {
    vi.mocked(laboratoryService.listResults).mockRejectedValue(new Error('Unexpected error'));

    const wrapper = mount(LaboratoryResultsPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Laudos');
    expect(wrapper.text()).toContain('Não foi possível carregar os laudos');
    expect(wrapper.text()).not.toContain('Nenhum registro encontrado');
    expect(wrapper.findAll('.summary-grid dd').map((item) => item.text())).toEqual(['—', '—', '—']);
    await wrapper.findComponent(DsAlert).vm.$emit('dismiss');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Unexpected error');
    expect(wrapper.find('.load-failure').exists()).toBe(true);
    vi.mocked(laboratoryService.listResults).mockResolvedValueOnce([]);
    await wrapper.get('.load-failure button').trigger('click');
    await flushPromises();
    expect(wrapper.find('.load-failure').exists()).toBe(false);
    expect(wrapper.text()).toContain('Nenhum registro encontrado');

  });
  it('keeps summary values unknown until the records request resolves', async () => {
    let resolveRecords!: (value: never[]) => void;
    vi.mocked(laboratoryService.listResults).mockImplementationOnce(() => new Promise((resolve) => { resolveRecords = resolve; }));
    const wrapper = mount(LaboratoryResultsPage);
    await flushPromises();
    expect(wrapper.find('.record-count').exists()).toBe(false);
    expect(wrapper.findAll('.summary-grid dd').every((item) => item.text() === '—')).toBe(true);
    resolveRecords([]);
    await flushPromises();
    expect(wrapper.get('.record-count').text()).toContain('0 registro');
    expect(wrapper.findAll('.summary-grid dd')[0].text()).toBe('0');
  });

  it('does not report zero anomalies when the analysis service fails', async () => {
    vi.mocked(mlService.getLabAnomalies).mockRejectedValueOnce(new Error('Offline'));
    const wrapper = mount(LaboratoryResultsPage);
    await flushPromises();
    expect(wrapper.findAll('.summary-grid dd').map((item) => item.text())).toEqual(['1', '1', '—']);
    expect(wrapper.text()).toContain('Análise de anomalias indisponível');
    expect(wrapper.text()).toContain('Mel');
  });

});
