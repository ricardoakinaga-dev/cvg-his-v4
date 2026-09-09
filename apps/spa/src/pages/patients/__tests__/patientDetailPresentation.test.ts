import { describe, expect, it } from 'vitest';
import {
  billingStatusLabel,
  formatCurrency,
  inpatientStatusLabel,
  preventiveEventMeta,
  truncateText,
  uniqueById
} from '../patientDetailPresentation';

describe('patientDetailPresentation', () => {
  it('keeps clinical labels and financial formatting deterministic', () => {
    expect(billingStatusLabel('settled')).toBe('Liquidado');
    expect(inpatientStatusLabel('discharged')).toBe('Alta');
    expect(formatCurrency(1234.5, 'BRL')).toContain('1.234,50');
  });

  it('preserves a useful fallback for long clinical text and preventive owner', () => {
    expect(truncateText('   uma   observação clínica longa   ', 18)).toBe('uma observação ...');
    expect(
      preventiveEventMeta({
        id: 'preventive-1',
        accountId: 'account-1',
        patientId: 'patient-1',
        ownerId: 'owner-1',
        clientName: '',
        animalName: 'Luna',
        eventDate: '2026-09-07',
        itemType: 'vaccine',
        description: 'Raiva',
        status: 'scheduled',
        observation: null,
        executedAt: null,
        executedObservation: null,
        rescheduledFromId: null,
        reminderEmailPreparedAt: null,
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z'
      }, 'Tutor de fallback')
    ).toBe('Vacina · Agendada · Tutor de fallback');
  });

  it('deduplicates longitudinal entries by authoritative id', () => {
    expect(uniqueById([{ id: '1', value: 'old' }, { id: '1', value: 'new' }])).toEqual([
      { id: '1', value: 'new' }
    ]);
  });
});
