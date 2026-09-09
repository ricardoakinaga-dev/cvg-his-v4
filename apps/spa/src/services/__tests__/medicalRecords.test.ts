import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApiRequest = vi.fn();

vi.mock('../api', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));

describe('medicalRecordsService', () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it('sends a caller-owned idempotency key for clinical entry creation', async () => {
    mockApiRequest.mockResolvedValue({ id: 'entry-1' });
    const { medicalRecordsService } = await import('../medicalRecords');
    const payload = {
      encounterId: 'enc-1',
      patientId: 'pat-1',
      entryType: 'progress_note' as const,
      title: 'Evolução',
      content: 'Conteúdo clínico'
    };

    await medicalRecordsService.createEntry(payload, { idempotencyKey: 'clinical-entry-1' });

    expect(mockApiRequest).toHaveBeenCalledWith('/medical-records/entries', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'clinical-entry-1' },
      body: JSON.stringify(payload)
    });
  });

  it('sends caller-owned idempotency keys for clinical entry updates and archives', async () => {
    mockApiRequest.mockResolvedValue({ id: 'entry-1' });
    const { medicalRecordsService } = await import('../medicalRecords');

    await medicalRecordsService.updateEntry(
      'entry-1',
      { content: 'Conteúdo revisado', expectedVersion: 2 },
      { idempotencyKey: 'clinical-update-1' }
    );
    await medicalRecordsService.archiveEntry(
      'entry-1',
      { reason: 'Duplicado', expectedVersion: 3 },
      { idempotencyKey: 'clinical-archive-1' }
    );

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, '/medical-records/entries/entry-1', {
      method: 'PATCH',
      headers: { 'Idempotency-Key': 'clinical-update-1' },
      body: JSON.stringify({ content: 'Conteúdo revisado', expectedVersion: 2 })
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, '/medical-records/entries/entry-1', {
      method: 'DELETE',
      headers: { 'Idempotency-Key': 'clinical-archive-1' },
      body: JSON.stringify({ reason: 'Duplicado', expectedVersion: 3 })
    });
  });

  it('requests archived clinical entries only for an explicit authoritative confirmation read', async () => {
    mockApiRequest.mockResolvedValue({ items: [] });
    const { medicalRecordsService } = await import('../medicalRecords');

    await medicalRecordsService.listEntries('enc/1', { includeArchived: true });

    expect(mockApiRequest).toHaveBeenCalledWith(
      '/medical-records/entries?encounterId=enc%2F1&includeArchived=true'
    );
  });
});
