import type {
  DiagnosticOrderSummary,
  LaboratoryReferenceValueSummary
} from '@cvg-his-v2/shared-types';

export interface LabAnomalyFlag {
  readonly orderId: string;
  readonly examType: string;
  readonly parameter: string;
  readonly observedValue?: number;
  readonly unit?: string;
  readonly severity: 'warning' | 'critical';
  readonly classification: 'out_of_range' | 'keyword_match';
  readonly message: string;
}

export interface LabAnomalyDetectionResult {
  readonly generatedAt: string;
  readonly totalAnalyzed: number;
  readonly flaggedOrders: number;
  readonly flags: readonly LabAnomalyFlag[];
}

function normalizeText(value: string | undefined): string {
  return (value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function extractNumericValue(summary: string, parameter: string): number | undefined {
  const normalizedParameter = parameter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${normalizedParameter}\\s*[:=-]?\\s*(\\d+(?:[.,]\\d+)?)`, 'i');
  const match = summary.match(regex);
  if (!match?.[1]) return undefined;
  const parsed = Number(match[1].replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export class LabAnomalyDetectionService {
  public detect(
    orders: readonly DiagnosticOrderSummary[],
    referenceValues: readonly LaboratoryReferenceValueSummary[]
  ): LabAnomalyDetectionResult {
    const flags: LabAnomalyFlag[] = [];

    for (const order of orders) {
      if (order.status !== 'resulted' || !order.resultSummary) {
        continue;
      }

      const normalizedSummary = normalizeText(order.resultSummary);
      const matchingReferences = referenceValues.filter(
        (item) => normalizeText(item.examType) === normalizeText(order.examType)
      );

      for (const reference of matchingReferences) {
        const observedValue = extractNumericValue(order.resultSummary, reference.parameter);
        if (observedValue === undefined) {
          continue;
        }
        if (observedValue < reference.minValue || observedValue > reference.maxValue) {
          const severity =
            observedValue < reference.minValue * 0.7 || observedValue > reference.maxValue * 1.3
              ? 'critical'
              : 'warning';
          flags.push({
            orderId: order.id,
            examType: order.examType,
            parameter: reference.parameter,
            observedValue,
            unit: reference.unit,
            severity,
            classification: 'out_of_range',
            message: `${reference.parameter} fora da faixa de referencia (${reference.minValue}-${reference.maxValue} ${reference.unit})`
          });
        }
      }

      if (/\bcritico\b|\bpanic[o|a]\b|\burgente\b/.test(normalizedSummary)) {
        flags.push({
          orderId: order.id,
          examType: order.examType,
          parameter: 'summary',
          severity: 'critical',
          classification: 'keyword_match',
          message: 'Resultado marcado com linguagem critica no laudo'
        });
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      totalAnalyzed: orders.length,
      flaggedOrders: new Set(flags.map((flag) => flag.orderId)).size,
      flags
    };
  }
}
