import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockEncounterList = vi.fn();
const mockTimeline = vi.fn();
const mockRecord = vi.fn();
const mockDiagnosticsList = vi.fn();
const mockDiagnosticsCreate = vi.fn();
const mockAttachmentsList = vi.fn();
const mockAttachmentsUpload = vi.fn();
const mockLaboratoryListOrders = vi.fn();
const mockLaboratoryListReportTypes = vi.fn();
const mockLaboratoryCreateOrder = vi.fn();
const mockLaboratoryRecordResult = vi.fn();

vi.mock('@/services/encounter', () => ({
  encounterService: {
    list: (...args: unknown[]) => mockEncounterList(...args)
  }
}));

vi.mock('@/services/medicalRecords', () => ({
  medicalRecordsService: {
    getByEncounter: (...args: unknown[]) => mockRecord(...args),
    getTimeline: (...args: unknown[]) => mockTimeline(...args)
  }
}));

vi.mock('@/services/diagnostics', () => ({
  diagnosticsService: {
    listByEncounter: (...args: unknown[]) => mockDiagnosticsList(...args),
    createRequest: (...args: unknown[]) => mockDiagnosticsCreate(...args),
    listAttachments: (...args: unknown[]) => mockAttachmentsList(...args),
    uploadAttachment: (...args: unknown[]) => mockAttachmentsUpload(...args)
  }
}));

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    listOrders: (...args: unknown[]) => mockLaboratoryListOrders(...args),
    listReportTypes: (...args: unknown[]) => mockLaboratoryListReportTypes(...args),
    createOrder: (...args: unknown[]) => mockLaboratoryCreateOrder(...args),
    recordResult: (...args: unknown[]) => mockLaboratoryRecordResult(...args)
  }
}));

describe('DiagnosticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEncounterList.mockResolvedValue([
      {
        id: 'enc-1',
        accountId: 'acc-1',
        patientId: 'pat-1',
        ownerId: 'own-1',
        visitType: 'scheduled',
        status: 'in_care',
        origin: 'schedule',
        reason: 'Retorno clínico',
        openedAt: '2026-04-10T00:00:00Z',
        createdByUserId: 'user-1',
        updatedAt: '2026-04-10T00:00:00Z'
      }
    ]);
    mockRecord.mockResolvedValue({
      record: {
        id: 'mr-1',
        accountId: 'acc-1',
        encounterId: 'enc-1',
        patientId: 'pat-1',
        status: 'open',
        createdAt: '2026-04-10T00:00:00Z',
        updatedAt: '2026-04-10T00:00:00Z'
      },
      entries: []
    });
    mockTimeline.mockResolvedValue([
      {
        id: 'tl-1',
        accountId: 'acc-1',
        encounterId: 'enc-1',
        medicalRecordId: 'mr-1',
        eventType: 'diagnostic_requested',
        summary: 'Diagnóstico solicitado',
        actorUserId: 'user-1',
        occurredAt: '2026-04-10T00:00:00Z'
      }
    ]);
    mockDiagnosticsList.mockResolvedValue([]);
    mockAttachmentsList.mockResolvedValue([]);
    mockLaboratoryListOrders.mockResolvedValue([
      {
        id: 'ord-1',
        accountId: 'acc-1',
        encounterId: 'enc-1',
        patientId: 'pat-1',
        examType: 'Hemograma',
        examCatalogId: 'cat_001',
        reason: 'Check-up',
        status: 'requested',
        createdAt: '2026-04-10T00:00:00Z',
        updatedAt: '2026-04-10T00:00:00Z'
      }
    ]);
    mockLaboratoryListReportTypes.mockResolvedValue([
      {
        id: 'cat_001',
        code: 'HEM',
        name: 'Hemograma',
        category: 'Laboratorial',
        description: 'Exame hematológico completo',
        active: true
      }
    ]);
    mockLaboratoryCreateOrder.mockResolvedValue({
      id: 'ord-2',
      accountId: 'acc-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      examType: 'Hemograma',
      examCatalogId: 'cat_001',
      reason: 'Solicitação clínica',
      status: 'requested',
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T00:00:00Z'
    });
    mockLaboratoryRecordResult.mockResolvedValue({
      id: 'ord-1',
      accountId: 'acc-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      examType: 'Hemograma',
      examCatalogId: 'cat_001',
      reason: 'Check-up',
      status: 'resulted',
      resultSummary: 'resultado.pdf',
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T00:00:00Z'
    });
    mockDiagnosticsCreate.mockResolvedValue({
      id: 'entry-1',
      accountId: 'acc-1',
      medicalRecordId: 'mr-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      entryType: 'assessment',
      title: 'Hemograma',
      content: 'Tipo de exame: Hemograma',
      authoredByUserId: 'user-1',
      version: 1,
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-04-10T00:00:00Z'
    });
    mockAttachmentsUpload.mockResolvedValue({
      id: 'att-1',
      accountId: 'acc-1',
      linkedEntityType: 'medical_record',
      linkedEntityId: 'mr-1',
      category: 'lab',
      fileName: 'resultado.pdf',
      storageKey: 'files/resultado.pdf',
      mimeType: 'application/pdf',
      checksum: 'sha256',
      source: 'upload',
      uploadedByUserId: 'user-1',
      createdAt: '2026-04-10T00:00:00Z'
    });
  });

  it('registers a real laboratory order and releases a result attachment', async () => {
    const DiagnosticsPage = (await import('../DiagnosticsPage.vue')).default;
    const wrapper = mount(DiagnosticsPage);
    await flushPromises();

    const selects = wrapper.findAll('select');
    await selects[1].setValue('cat_001');
    const textareas = wrapper.findAll('textarea');
    await textareas[0].setValue('Solicitação clínica');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockLaboratoryCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        encounterId: 'enc-1',
        patientId: 'pat-1',
        examCatalogId: 'cat_001'
      })
    );
    expect(mockDiagnosticsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        encounterId: 'enc-1',
        patientId: 'pat-1',
        title: expect.any(String)
      })
    );

    const forms = wrapper.findAll('form');
    const inputs = wrapper.findAll('input');
    await inputs[2].setValue('resultado.pdf');
    await inputs[3].setValue('application/pdf');
    await inputs[4].setValue('sha256');
    await forms[1].trigger('submit');
    await flushPromises();

    expect(mockAttachmentsUpload).toHaveBeenCalled();
    expect(mockLaboratoryRecordResult).toHaveBeenCalled();
  });

  it('does not show success when the clinical diagnostic note fails after order creation', async () => {
    mockDiagnosticsCreate.mockRejectedValueOnce(new Error('Prontuário indisponível'));
    const DiagnosticsPage = (await import('../DiagnosticsPage.vue')).default;
    const wrapper = mount(DiagnosticsPage);
    await flushPromises();

    const selects = wrapper.findAll('select');
    await selects[1].setValue('cat_001');
    const textareas = wrapper.findAll('textarea');
    await textareas[0].setValue('Solicitação clínica');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockLaboratoryCreateOrder).toHaveBeenCalled();
    expect(mockDiagnosticsCreate).toHaveBeenCalled();
    expect(wrapper.find('[variant="success"]').exists()).toBe(false);
    expect(wrapper.find('[variant="warning"]').text()).toContain('Pedido laboratorial registrado');
    expect(wrapper.find('[variant="warning"]').text()).toContain('Prontuário indisponível');
  });
});
