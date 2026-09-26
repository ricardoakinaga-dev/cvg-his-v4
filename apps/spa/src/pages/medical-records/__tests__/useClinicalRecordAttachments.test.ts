import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttachmentSummary } from '@cvg-his-v2/shared-types';
import type { MedicalRecordSummary } from '@/types/medicalRecords';

const { mockApiRequest, mockListAttachments, mockListEncounterAttachments } = vi.hoisted(() => ({
  mockApiRequest: vi.fn(),
  mockListAttachments: vi.fn(),
  mockListEncounterAttachments: vi.fn()
}));

vi.mock('@/services/api', () => ({ apiRequest: mockApiRequest }));
vi.mock('@/config/runtime', () => ({
  spaRuntimeConfig: { apiBaseUrl: 'https://api.example.test' }
}));
vi.mock('@/services/attachments', () => ({
  attachmentService: { list: mockListEncounterAttachments }
}));
vi.mock('@/services/diagnostics', () => ({
  diagnosticsService: { listAttachments: mockListAttachments }
}));

import { useClinicalRecordAttachments } from '../useClinicalRecordAttachments';

const record = {
  id: 'record-1',
  encounterId: 'encounter-1',
  patientId: 'patient-1',
  status: 'open',
  createdAt: '2026-09-24T10:00:00Z',
  updatedAt: '2026-09-24T10:00:00Z'
} as unknown as MedicalRecordSummary;

function attachment(overrides: Record<string, unknown> = {}): AttachmentSummary {
  return {
    id: 'attachment-1',
    accountId: 'account-1',
    linkedEntityType: 'medical_record',
    linkedEntityId: record.id,
    category: 'image',
    fileName: 'raio-x.jpg',
    storageKey: 'attachments/raio-x.jpg',
    mimeType: 'image/jpeg',
    checksum: 'checksum',
    source: 'upload',
    scanStatus: 'available',
    uploadedByUserId: 'user-1',
    createdAt: '2026-09-24T12:00:00Z',
    ...overrides
  } as unknown as AttachmentSummary;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('useClinicalRecordAttachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListAttachments.mockResolvedValue([]);
    mockListEncounterAttachments.mockResolvedValue([]);
    mockApiRequest.mockResolvedValue({
      url: '/attachments/attachment-1/content?token=confirmed',
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });
  });

  it('merges only attachments linked to this record and encounter in newest-first order', async () => {
    const olderRecordFile = attachment({ createdAt: '2026-09-23T10:00:00Z' });
    const latestRecordFile = attachment({
      id: 'attachment-2',
      createdAt: '2026-09-24T13:00:00Z'
    });
    const encounterFile = attachment({
      id: 'attachment-3',
      linkedEntityType: 'encounter',
      linkedEntityId: record.encounterId,
      createdAt: '2026-09-24T12:30:00Z'
    });
    const foreignRecordFile = attachment({
      id: 'attachment-foreign',
      linkedEntityId: 'another-record'
    });
    const feature = useClinicalRecordAttachments();
    mockListAttachments.mockResolvedValueOnce([
      olderRecordFile,
      latestRecordFile,
      foreignRecordFile
    ]);
    mockListEncounterAttachments.mockResolvedValueOnce([
      encounterFile,
      { ...encounterFile, id: 'another-encounter-file', linkedEntityId: 'another-encounter' }
    ]);

    await feature.load(record, () => true);

    expect(feature.attachments.value).toEqual([latestRecordFile, encounterFile, olderRecordFile]);
    expect(feature.error.value).toBe('');
    expect(feature.loading.value).toBe(false);
  });

  it('keeps confirmed files visible and reports partial source failure', async () => {
    const confirmed = attachment();
    const feature = useClinicalRecordAttachments();
    mockListAttachments.mockResolvedValueOnce([confirmed]);
    mockListEncounterAttachments.mockRejectedValueOnce(new Error('encounter source unavailable'));

    await feature.load(record, () => true);

    expect(feature.attachments.value).toEqual([confirmed]);
    expect(feature.error.value).toContain('Alguns anexos não puderam ser carregados');
    expect(feature.loading.value).toBe(false);
  });

  it('ignores an attachment read that finishes after the page resets for another record', async () => {
    const pending = deferred<AttachmentSummary[]>();
    const feature = useClinicalRecordAttachments();
    mockListAttachments.mockReturnValueOnce(pending.promise);
    mockListEncounterAttachments.mockResolvedValueOnce([]);
    const loading = feature.load(record, () => true);

    expect(feature.loading.value).toBe(true);
    feature.reset();
    pending.resolve([attachment()]);
    await loading;

    expect(feature.attachments.value).toEqual([]);
    expect(feature.loading.value).toBe(false);
  });

  it('opens content only after validating the attachment path and current signed URL', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    const feature = useClinicalRecordAttachments();

    await feature.open(attachment(), () => true);

    expect(mockApiRequest).toHaveBeenCalledWith('/attachments/attachment-1/download-url', {
      method: 'POST'
    });
    expect(open).toHaveBeenCalledWith(
      'https://api.example.test/api/attachments/attachment-1/content?token=confirmed',
      '_blank',
      'noopener,noreferrer'
    );
    expect(feature.openingId.value).toBe(null);
    open.mockRestore();
  });

  it.each([
    {
      name: 'a different attachment path',
      response: {
        url: '/attachments/another-file/content?token=wrong',
        expiresAt: new Date(Date.now() + 60_000).toISOString()
      }
    },
    {
      name: 'an expired URL',
      response: {
        url: '/attachments/attachment-1/content?token=expired',
        expiresAt: new Date(Date.now() - 60_000).toISOString()
      }
    }
  ])('rejects $name without opening content', async ({ response }) => {
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    const feature = useClinicalRecordAttachments();
    mockApiRequest.mockResolvedValueOnce(response);

    await feature.open(attachment(), () => true);

    expect(open).not.toHaveBeenCalled();
    expect(feature.actionError.value).toContain('não confirmou uma URL válida');
    expect(feature.openingId.value).toBe(null);
    open.mockRestore();
  });

  it('does not open quarantined files or report success after the route changes', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    const feature = useClinicalRecordAttachments();

    await feature.open(attachment({ scanStatus: 'quarantined' }), () => true);
    expect(mockApiRequest).not.toHaveBeenCalled();

    const response = deferred<unknown>();
    mockApiRequest.mockReturnValueOnce(response.promise);
    let current = true;
    const opening = feature.open(attachment(), () => current);
    current = false;
    feature.reset();
    response.resolve({
      url: '/attachments/attachment-1/content?token=confirmed',
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });
    await opening;

    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });
});
