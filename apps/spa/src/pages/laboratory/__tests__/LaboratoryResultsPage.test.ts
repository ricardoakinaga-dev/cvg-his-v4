import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LaboratoryResultsPage from '../LaboratoryResultsPage.vue';
import { attachmentService } from '@/services/attachments';
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

vi.mock('@/services/attachments', () => ({
  attachmentService: {
    getDownloadUrl: vi.fn()
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

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
        resultValues: [
          {
            parameter: 'pH urinário',
            value: '6.0',
            unit: 'escala',
            reference: '5.5–7.0'
          },
          {
            parameter: 'Hemoglobina',
            value: '7.2',
            unit: 'g/dL',
            reference: '12–18 g/dL',
            outOfRange: true
          }
        ],
        resultAttachmentId: 'att_lab_1',
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
    vi.mocked(attachmentService.getDownloadUrl).mockResolvedValue({
      url: '/attachments/att_lab_1/content?token=synthetic-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString()
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
    expect(wrapper.text()).not.toContain('R$ 0,00');
    expect(wrapper.findAll('.summary-grid dd').map((item) => item.text())).toEqual(['1', '1', '0']);
    expect(wrapper.get('.advanced-filters').attributes('open')).toBeUndefined();
    expect(wrapper.text()).toContain('Laudo');
    expect(wrapper.text()).toContain('pH urinário: 6.0 escala · ref. 5.5–7.0');
    expect(wrapper.text()).toContain('Hemoglobina: 7.2 g/dL · ref. 12–18 g/dL');
    expect(wrapper.text()).toContain('Situação');
    expect(wrapper.text()).toContain('Concluído');
    expect(wrapper.get('button[aria-label^="Abrir anexo"]').text()).toBe('Abrir anexo');
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

  it('opens a protected laboratory attachment through its short-lived URL', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    const wrapper = mount(LaboratoryResultsPage);
    await flushPromises();

    await wrapper.get('button[aria-label^="Abrir anexo"]').trigger('click');
    await flushPromises();

    expect(attachmentService.getDownloadUrl).toHaveBeenCalledWith('att_lab_1');
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/attachments/att_lab_1/content?token=synthetic-token'),
      '_blank',
      'noopener,noreferrer'
    );
    openSpy.mockRestore();
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
    expect(wrapper.get('[data-testid="data-table-feedback"]').text()).toContain('Tente novamente');
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1);
    expect(wrapper.findAll('.summary-grid dd').map((item) => item.text())).toEqual(['—', '—', '—']);
    vi.mocked(laboratoryService.listResults).mockResolvedValueOnce([]);
    await wrapper.get('[data-testid="data-table-feedback"] button').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="data-table-feedback"] .empty-state__title').text())
      .toBe('Nenhum laudo encontrado');
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(0);

  });

  it('ignores a stale response after a newer report search completes', async () => {
    const first = deferred<never[]>();
    const second = deferred<never[]>();
    vi.mocked(laboratoryService.listResults)
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const wrapper = mount(LaboratoryResultsPage);
    await flushPromises();
    await wrapper.get('input[name="code"]').setValue('novo');
    await wrapper.find('form').trigger('submit');
    expect(laboratoryService.listResults).toHaveBeenCalledTimes(2);

    second.resolve([
      {
        id: 'novo-report',
        accountId: 'acc_1',
        encounterId: 'enc_1',
        patientId: 'paciente_1',
        examType: 'Hemograma',
        reason: 'Novo relatório',
        status: 'resulted',
        resultSummary: 'Novo relatório',
        createdAt: '2026-04-25T08:30:00.000Z',
        updatedAt: '2026-04-25T10:00:00.000Z'
      } as never
    ]);
    await flushPromises();
    expect(wrapper.text()).toContain('Novo relatório');

    first.resolve([
      {
        id: 'antigo-report',
        accountId: 'acc_1',
        encounterId: 'enc_1',
        patientId: 'paciente_1',
        examType: 'Hemograma',
        reason: 'Relatório antigo',
        status: 'resulted',
        resultSummary: 'Relatório antigo',
        createdAt: '2026-04-24T08:30:00.000Z',
        updatedAt: '2026-04-24T10:00:00.000Z'
      } as never
    ]);
    await flushPromises();
    expect(wrapper.text()).toContain('Novo relatório');
    expect(wrapper.text()).not.toContain('Relatório antigo');
  });

  it('distinguishes no-results from an intrinsic empty report list', async () => {
    const wrapper = mount(LaboratoryResultsPage);
    await flushPromises();
    await wrapper.get('input[name="code"]').setValue('laudo-ausente');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[data-testid="data-table-feedback"] .empty-state__title').text())
      .toBe('Nenhum laudo corresponde aos filtros');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('distinguishes forbidden access from a temporary unavailable report service', async () => {
    vi.mocked(laboratoryService.listResults).mockRejectedValue({ status: 403 });
    const wrapper = mount(LaboratoryResultsPage);
    await flushPromises();

    expect(wrapper.get('[data-testid="data-table-feedback"] .empty-state__title').text())
      .toBe('Acesso aos laudos negado');
    expect(wrapper.text()).not.toContain('Não foi possível carregar os laudos');
    expect(wrapper.get('[data-testid="data-table-feedback"]').text()).not.toContain('Tente novamente');
    expect(wrapper.findAll('.summary-grid dd').map((item) => item.text())).toEqual(['—', '—', '—']);
  });

  it('labels a pending report with an explicit no-result state', async () => {
    vi.mocked(laboratoryService.listResults).mockResolvedValueOnce([
      {
        id: 'diag_pending' as never,
        accountId: 'acc_1' as never,
        encounterId: 'enc_1' as never,
        patientId: 'paciente_1' as never,
        examType: 'Hemograma',
        reason: 'Coleta',
        status: 'collected',
        createdAt: '2026-04-24T08:30:00.000Z',
        updatedAt: '2026-04-24T09:00:00.000Z'
      }
    ]);
    const wrapper = mount(LaboratoryResultsPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Coletado · aguardando resultado');
    expect(wrapper.text()).toContain('Coletado · aguardando resultado');
    expect(wrapper.text()).not.toContain('Valor não informado');
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
