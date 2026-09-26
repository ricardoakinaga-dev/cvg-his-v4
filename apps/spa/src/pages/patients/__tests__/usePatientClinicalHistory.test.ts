import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePatientClinicalHistory } from '../usePatientClinicalHistory';
import type { EncounterSummary } from '@/types/encounter';
import type { ClinicalEntrySummary } from '@/types/medicalRecords';
import type { PatientSummary } from '@/types/patient';

const { mockCreateEntry, mockUpdateEntry, mockListEntries } = vi.hoisted(() => ({
  mockCreateEntry: vi.fn(),
  mockUpdateEntry: vi.fn(),
  mockListEntries: vi.fn()
}));

vi.mock('@/services/medicalRecords', () => ({
  medicalRecordsService: {
    createEntry: mockCreateEntry,
    updateEntry: mockUpdateEntry,
    listEntries: mockListEntries
  }
}));

const patient = { id: 'pat-1' } as PatientSummary;

const encounter = { id: 'enc-1', patientId: 'pat-1' } as EncounterSummary;

const existingEntry: ClinicalEntrySummary = {
  id: 'entry-1',
  accountId: 'acc-1',
  medicalRecordId: 'record-1',
  encounterId: 'enc-1',
  patientId: 'pat-1',
  entryType: 'progress_note',
  title: 'Histórico clínico longitudinal',
  content: 'Anterior',
  authoredByUserId: 'usr-1',
  version: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

function confirmedEntry(content: string, version = 1): ClinicalEntrySummary {
  return { ...existingEntry, content, version };
}

function context(existing: ClinicalEntrySummary | null = null) {
  return {
    patientId: 'pat-1',
    patient,
    encounter,
    existingEntry: existing,
    medicalRecordId: 'record-1'
  };
}

describe('usePatientClinicalHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the longitudinal entry and adopts only the confirmed reread', async () => {
    const history = usePatientClinicalHistory();
    history.draft.value = ' Novo histórico ';
    const saved = confirmedEntry('Novo histórico');
    mockCreateEntry.mockResolvedValue(saved);
    mockListEntries.mockResolvedValue([saved]);

    const result = await history.save(context(), () => true);

    expect(mockCreateEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        encounterId: 'enc-1',
        patientId: 'pat-1',
        entryType: 'progress_note',
        title: 'Histórico clínico longitudinal',
        content: 'Novo histórico'
      }),
      { idempotencyKey: expect.stringMatching(/^patient-clinical-history-/) }
    );
    expect(mockListEntries).toHaveBeenCalledWith('enc-1');
    expect(result).toEqual(saved);
    expect(history.draft.value).toBe('Novo histórico');
    expect(history.saving.value).toBe(false);
  });

  it('updates with the current version and rejects a stale reread without losing the draft', async () => {
    const history = usePatientClinicalHistory();
    history.draft.value = 'Draft pending confirmation';
    mockUpdateEntry.mockResolvedValue({
      ...existingEntry,
      version: 2,
      content: history.draft.value
    });
    mockListEntries.mockResolvedValue([existingEntry]);

    await expect(history.save(context(existingEntry), () => true)).rejects.toThrow(
      'não foi confirmado na releitura'
    );

    expect(mockUpdateEntry).toHaveBeenCalledWith(
      'entry-1',
      expect.objectContaining({ content: 'Draft pending confirmation', expectedVersion: 1 }),
      { idempotencyKey: expect.stringMatching(/^patient-clinical-history-/) }
    );
    expect(history.draft.value).toBe('Draft pending confirmation');
    expect(history.saving.value).toBe(false);
  });

  it('reuses the retry key for the same payload and generates a new one after edits', async () => {
    const history = usePatientClinicalHistory();
    history.draft.value = 'Retry me';
    mockCreateEntry
      .mockRejectedValueOnce(new Error('network timeout'))
      .mockRejectedValueOnce(new Error('second network timeout'))
      .mockResolvedValue(confirmedEntry('Changed payload'));
    mockListEntries.mockResolvedValue([confirmedEntry('Retry me')]);

    await expect(history.save(context(), () => true)).rejects.toThrow('network timeout');
    await expect(history.save(context(), () => true)).rejects.toThrow('second network timeout');
    history.draft.value = 'Changed payload';
    mockListEntries.mockResolvedValueOnce([confirmedEntry('Changed payload')]);
    await history.save(context(), () => true);

    const firstKey = mockCreateEntry.mock.calls[0][1].idempotencyKey;
    const retryKey = mockCreateEntry.mock.calls[1][1].idempotencyKey;
    const changedKey = mockCreateEntry.mock.calls[2][1].idempotencyKey;
    expect(retryKey).toBe(firstKey);
    expect(changedKey).not.toBe(retryKey);
  });

  it('skips the reread and ignores a stale route completion', async () => {
    const history = usePatientClinicalHistory();
    history.draft.value = 'Old patient draft';
    mockCreateEntry.mockResolvedValue(confirmedEntry('Old patient draft'));

    const result = await history.save(context(), () => false);

    expect(result).toBeNull();
    expect(mockListEntries).not.toHaveBeenCalled();
    expect(history.draft.value).toBe('Old patient draft');
    history.reset();
    expect(history.saving.value).toBe(false);
    expect(history.draft.value).toBe('');
  });

  it('rejects a patient/encounter mismatch before sending a mutation', async () => {
    const history = usePatientClinicalHistory();
    history.draft.value = 'Do not attach to another patient';

    await expect(
      history.save(
        { ...context(), encounter: { id: 'enc-2', patientId: 'pat-2' } as EncounterSummary },
        () => true
      )
    ).rejects.toThrow('não correspondem ao histórico clínico selecionado');

    expect(mockCreateEntry).not.toHaveBeenCalled();
    expect(mockUpdateEntry).not.toHaveBeenCalled();
  });
});
