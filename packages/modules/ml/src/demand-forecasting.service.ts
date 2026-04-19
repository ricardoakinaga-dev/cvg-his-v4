import type { SchedulingAppointmentSummary } from '@cvg-his-v2/shared-types';

export interface DemandForecastInput {
  readonly appointments: readonly SchedulingAppointmentSummary[];
  readonly referenceDate?: string;
  readonly horizonDays?: number;
}

export interface DemandForecastDay {
  readonly date: string;
  readonly predictedAppointments: number;
  readonly predictedMinutes: number;
  readonly peakVisitType: SchedulingAppointmentSummary['visitType'] | 'mixed';
  readonly confidence: number;
}

export interface DemandForecast {
  readonly generatedAt: string;
  readonly horizonDays: number;
  readonly baselineSampleSize: number;
  readonly days: readonly DemandForecastDay[];
}

function startOfDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function visitTypeWeight(visitType: SchedulingAppointmentSummary['visitType']): number {
  switch (visitType) {
    case 'return':
      return 0.8;
    case 'walk_in':
      return 0.9;
    case 'scheduled':
    default:
      return 1;
  }
}

export class DemandForecastingService {
  public forecast(input: DemandForecastInput): DemandForecast {
    const reference = startOfDay(input.referenceDate ? new Date(input.referenceDate) : new Date());
    const horizonDays = Math.max(3, Math.min(30, Math.floor(input.horizonDays ?? 7)));
    const eligible = input.appointments.filter((appointment) => appointment.status !== 'cancelled');

    const grouped = new Map<number, SchedulingAppointmentSummary[]>();
    for (const appointment of eligible) {
      const day = new Date(appointment.scheduledAt).getUTCDay();
      const bucket = grouped.get(day) ?? [];
      bucket.push(appointment);
      grouped.set(day, bucket);
    }

    const days: DemandForecastDay[] = [];
    for (let offset = 1; offset <= horizonDays; offset += 1) {
      const day = addDays(reference, offset);
      const weekday = day.getUTCDay();
      const sample = grouped.get(weekday) ?? eligible;
      const sampleSize = sample.length;
      const weightedAppointments = sample.reduce((sum, appointment) => sum + visitTypeWeight(appointment.visitType), 0);
      const predictedAppointments = Math.max(1, Math.round(weightedAppointments / Math.max(sampleSize, 1) * Math.max(sampleSize / Math.max(grouped.size, 1), 1)));
      const predictedMinutes = Math.max(
        15,
        Math.round(
          sample.reduce((sum, appointment) => sum + (appointment.durationMinutes ?? 30), 0) / Math.max(sampleSize, 1) * predictedAppointments
        )
      );
      const visitTypeCounts = new Map<SchedulingAppointmentSummary['visitType'], number>();
      for (const appointment of sample) {
        visitTypeCounts.set(appointment.visitType, (visitTypeCounts.get(appointment.visitType) ?? 0) + 1);
      }
      const peakVisitType = Array.from(visitTypeCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'mixed';
      const confidence = Number(
        Math.max(0.45, Math.min(0.96, 0.45 + Math.min(sampleSize, 20) * 0.02)).toFixed(2)
      );

      days.push({
        date: `${isoDate(day)}T00:00:00.000Z`,
        predictedAppointments,
        predictedMinutes,
        peakVisitType,
        confidence
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      horizonDays,
      baselineSampleSize: eligible.length,
      days
    };
  }
}
