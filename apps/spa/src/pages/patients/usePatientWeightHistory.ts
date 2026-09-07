import { computed, ref, type Ref } from 'vue';
import type { PatientSummary } from '@/types/patient';
import type { ClinicalEntrySummary } from '@/types/medicalRecords';

export function usePatientWeightHistory(
  patient: Ref<PatientSummary | null>,
  sortedPatientClinicalEntries: Ref<ClinicalEntrySummary[]>
) {
  const weightWindowMonths = ref(12);

  const weightWindowOptions = [
    { label: '3 meses', months: 3 },
    { label: '6 meses', months: 6 },
    { label: '1 ano', months: 12 }
  ];

  const formattedWeight = computed(() => {
    if (!patient.value?.baseWeightKg) {
      return 'Não informado';
    }

    return `${patient.value.baseWeightKg} kg`;
  });

  const currentWeightLabel = computed(() => {
    if (!patient.value?.baseWeightKg) {
      return 'Não informado';
    }

    return `${patient.value.baseWeightKg} kg`;
  });

  const weightMeasurements = computed(() => {
    const items: Array<{ date: string; weightKg: number }> = [];

    for (const entry of sortedPatientClinicalEntries.value) {
      const match = `${entry.title} ${entry.content}`.match(
        /peso(?:\s+atual)?[:\s]+(\d+(?:[,.]\d+)?)\s*kg/i
      );
      if (!match) {
        continue;
      }

      items.push({
        date: entry.updatedAt,
        weightKg: Number(match[1].replace(',', '.'))
      });
    }

    if (patient.value?.baseWeightKg) {
      items.push({
        date: patient.value.updatedAt,
        weightKg: patient.value.baseWeightKg
      });
    }

    return items
      .filter((item) => Number.isFinite(item.weightKg))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });

  const filteredWeightMeasurements = computed(() => {
    if (weightMeasurements.value.length <= 1) {
      return weightMeasurements.value;
    }

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - weightWindowMonths.value);
    const filtered = weightMeasurements.value.filter((item) => new Date(item.date) >= cutoff);
    return filtered.length > 0 ? filtered : weightMeasurements.value.slice(-1);
  });

  const weightChartPointList = computed(() => {
    const points = filteredWeightMeasurements.value;
    if (points.length === 0) {
      return [{ x: 20, y: 95 }];
    }

    if (points.length === 1) {
      return [
        { x: 20, y: 70 },
        { x: 300, y: 70 }
      ];
    }

    const weights = points.map((point) => point.weightKg);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const range = Math.max(max - min, 1);

    return points.map((point, index) => ({
      x: 20 + (280 * index) / Math.max(points.length - 1, 1),
      y: 100 - ((point.weightKg - min) / range) * 70
    }));
  });

  const weightChartPoints = computed(() =>
    weightChartPointList.value.map((point) => `${point.x},${point.y}`).join(' ')
  );

  return {
    weightWindowMonths,
    weightWindowOptions,
    formattedWeight,
    currentWeightLabel,
    weightMeasurements,
    weightChartPointList,
    weightChartPoints,
  };
}
