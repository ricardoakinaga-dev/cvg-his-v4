import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockEncounterList = vi.fn();
const mockTimeline = vi.fn();
const mockRecord = vi.fn();
const mockDiagnosticsList = vi.fn();
const mockDiagnosticsCreate = vi.fn();
const mockAttachmentsList = vi.fn();
const mockAttachmentsUpload = vi.fn();

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

  it('registers a diagnostic request and uploads a result attachment', async () => {
    const DiagnosticsPage = (await import('../DiagnosticsPage.vue')).default;
    const wrapper = mount(DiagnosticsPage);
    await flushPromises();

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('Hemograma');
    await inputs[1].setValue('Hemograma');
    const textareas = wrapper.findAll('textarea');
    await textareas[0].setValue('Solicitação clínica');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockDiagnosticsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        encounterId: 'enc-1',
        patientId: 'pat-1',
        title: 'Hemograma'
      })
    );
    expect(wrapper.text()).toContain('Solicitação diagnóstica registrada');
  });
});
