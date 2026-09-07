import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { PatientSummary } from '@/types/patient';
import type { ClinicalEntrySummary } from '@/types/medicalRecords';
import { usePatientWeightHistory } from '../usePatientWeightHistory';

describe('patient weight history', () => {
  afterEach(() => vi.useRealTimers());

  it('reacts to loaded records and window changes while retaining the last known weight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
    const patient = ref<PatientSummary | null>(null);
    const entries = ref<ClinicalEntrySummary[]>([]);
    const history = usePatientWeightHistory(patient, entries);
    expect(history.currentWeightLabel.value).toBe('Não informado');
    expect(history.weightChartPointList.value).toEqual([{ x: 20, y: 95 }]);

    patient.value = { baseWeightKg: 12, updatedAt: '2026-01-05T12:00:00Z' } as PatientSummary;
    entries.value = [{
      title: 'Revisão', content: 'Peso atual: 10,5 kg', updatedAt: '2026-05-05T12:00:00Z'
    } as ClinicalEntrySummary];
    expect(history.currentWeightLabel.value).toBe('12 kg');
    expect(history.weightMeasurements.value.map((item) => item.weightKg)).toEqual([12, 10.5]);
    expect(history.weightChartPointList.value).toEqual([{ x: 20, y: 30 }, { x: 300, y: 100 }]);

    history.weightWindowMonths.value = 3;
    expect(history.weightChartPointList.value).toEqual([{ x: 20, y: 70 }, { x: 300, y: 70 }]);
    entries.value.push({
      title: 'Peso: 11 kg', content: '', updatedAt: '2026-08-05T12:00:00Z'
    } as ClinicalEntrySummary);
    expect(history.weightMeasurements.value.at(-1)?.weightKg).toBe(11);
  });
});
