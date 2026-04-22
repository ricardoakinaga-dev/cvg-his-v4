import type { ApiFeatureFlagsSnapshot } from './feature-flags.js';

interface SmartSchedulingRecommendationEvent {
  readonly accountId: string;
  readonly recommendationId: string;
  readonly visitType: string;
  readonly predictedDurationMinutes: number;
  readonly confidence: number;
  readonly generatedAt: string;
}

interface SmartSchedulingApplicationEvent {
  readonly accountId: string;
  readonly recommendationId: string;
  readonly appliedDurationMinutes?: number;
  readonly appliedAt: string;
}

interface ForecastSnapshotEvent {
  readonly accountId: string;
  readonly generatedAt: string;
  readonly horizonDays: number;
  readonly days: ReadonlyArray<{
    readonly date: string;
    readonly predictedAppointments: number;
    readonly predictedMinutes: number;
    readonly confidence: number;
  }>;
}

interface AnomalyScanEvent {
  readonly accountId: string;
  readonly generatedAt: string;
  readonly examType?: string;
  readonly totalAnalyzed: number;
  readonly flaggedOrders: number;
  readonly flags: ReadonlyArray<{
    readonly orderId: string;
    readonly severity: string;
  }>;
}

interface AnomalyReviewEvent {
  readonly accountId: string;
  readonly orderId: string;
  readonly disposition: 'confirmed' | 'dismissed';
  readonly note?: string;
  readonly actorId: string;
  readonly correlationId: string;
  readonly reviewedAt: string;
}

export interface MlOperationalReport {
  readonly generatedAt: string;
  readonly smartScheduling: {
    readonly recommendations: number;
    readonly adopted: number;
    readonly adoptionRate: number;
    readonly overrides: number;
    readonly overrideRate: number;
  };
  readonly forecasting: {
    readonly snapshots: number;
    readonly comparedDays: number;
    readonly meanAbsoluteError: number;
  };
  readonly anomalyDetection: {
    readonly scans: number;
    readonly reviewedOrders: number;
    readonly confirmedOrders: number;
    readonly dismissedOrders: number;
    readonly precision: number;
  };
  readonly governance: {
    readonly features: ReadonlyArray<{
      readonly key: string;
      readonly enabled: boolean;
      readonly owner: string;
    }>;
  };
  readonly valueSummary: {
    readonly keep: ReadonlyArray<string>;
    readonly monitor: ReadonlyArray<string>;
  };
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function startOfDayIso(value: string): string {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

export class MlTelemetryService {
  readonly #recommendations: SmartSchedulingRecommendationEvent[] = [];
  readonly #applications: SmartSchedulingApplicationEvent[] = [];
  readonly #forecastSnapshots: ForecastSnapshotEvent[] = [];
  readonly #anomalyScans: AnomalyScanEvent[] = [];
  readonly #anomalyReviews: AnomalyReviewEvent[] = [];

  public recordSmartSchedulingRecommendation(input: Omit<SmartSchedulingRecommendationEvent, 'generatedAt'>): void {
    this.#recommendations.push({
      ...input,
      generatedAt: new Date().toISOString()
    });
  }

  public recordSmartSchedulingApplication(
    input: Omit<SmartSchedulingApplicationEvent, 'appliedAt'>
  ): void {
    this.#applications.push({
      ...input,
      appliedAt: new Date().toISOString()
    });
  }

  public recordForecastSnapshot(input: ForecastSnapshotEvent): void {
    this.#forecastSnapshots.push(input);
  }

  public recordAnomalyScan(input: AnomalyScanEvent): void {
    this.#anomalyScans.push(input);
  }

  public recordAnomalyReview(input: Omit<AnomalyReviewEvent, 'reviewedAt'>): AnomalyReviewEvent {
    const review: AnomalyReviewEvent = {
      ...input,
      reviewedAt: new Date().toISOString()
    };
    this.#anomalyReviews.push(review);
    return review;
  }

  public getReport(input: {
    readonly accountId: string;
    readonly appointments: ReadonlyArray<{ readonly scheduledAt: string; readonly status: string }>;
    readonly featureFlags: ApiFeatureFlagsSnapshot;
    readonly now?: Date;
  }): MlOperationalReport {
    const now = input.now ?? new Date();
    const recommendations = this.#recommendations.filter((item) => item.accountId === input.accountId);
    const applications = this.#applications.filter((item) => item.accountId === input.accountId);
    const forecasts = this.#forecastSnapshots.filter((item) => item.accountId === input.accountId);
    const anomalyScans = this.#anomalyScans.filter((item) => item.accountId === input.accountId);
    const anomalyReviews = this.#anomalyReviews.filter((item) => item.accountId === input.accountId);

    const recommendationById = new Map(recommendations.map((item) => [item.recommendationId, item]));
    const adopted = applications.filter((item) => recommendationById.has(item.recommendationId));
    const overrides = adopted.filter((item) => {
      const recommendation = recommendationById.get(item.recommendationId);
      return recommendation
        && item.appliedDurationMinutes !== undefined
        && item.appliedDurationMinutes !== recommendation.predictedDurationMinutes;
    });

    const appointmentsByDay = new Map<string, number>();
    for (const appointment of input.appointments) {
      if (appointment.status === 'cancelled') {
        continue;
      }
      const key = startOfDayIso(appointment.scheduledAt);
      appointmentsByDay.set(key, (appointmentsByDay.get(key) ?? 0) + 1);
    }

    const forecastErrors: number[] = [];
    for (const snapshot of forecasts) {
      for (const day of snapshot.days) {
        const dayDate = new Date(day.date);
        if (dayDate.getTime() > now.getTime()) {
          continue;
        }
        const observedAppointments = appointmentsByDay.get(startOfDayIso(day.date)) ?? 0;
        forecastErrors.push(Math.abs(day.predictedAppointments - observedAppointments));
      }
    }

    const reviewedOrders = new Set(anomalyReviews.map((item) => item.orderId));
    const confirmedOrders = new Set(
      anomalyReviews
        .filter((item) => item.disposition === 'confirmed')
        .map((item) => item.orderId)
    );
    const dismissedOrders = new Set(
      anomalyReviews
        .filter((item) => item.disposition === 'dismissed')
        .map((item) => item.orderId)
    );

    const features = [
      {
        key: 'ml.smart_scheduling.enabled',
        enabled: input.featureFlags.mlSmartSchedulingEnabled,
        owner: 'ml-operations'
      },
      {
        key: 'ml.forecasting.enabled',
        enabled: input.featureFlags.mlForecastingEnabled,
        owner: 'ml-operations'
      },
      {
        key: 'ml.anomaly_detection.enabled',
        enabled: input.featureFlags.mlAnomalyDetectionEnabled,
        owner: 'ml-operations'
      },
      {
        key: 'ml.ocr_fiscal.enabled',
        enabled: input.featureFlags.mlOcrFiscalEnabled,
        owner: 'ml-operations'
      }
    ] as const;

    const keep = features.filter((item) => item.enabled).map((item) => item.key);
    const monitor = [
      ...(overrides.length > 0 ? ['smart-scheduling-overrides'] : []),
      ...(forecastErrors.length > 0 ? ['forecast-accuracy'] : []),
      ...(reviewedOrders.size > 0 ? ['anomaly-review-precision'] : [])
    ];

    return {
      generatedAt: now.toISOString(),
      smartScheduling: {
        recommendations: recommendations.length,
        adopted: adopted.length,
        adoptionRate: recommendations.length === 0 ? 0 : round(adopted.length / recommendations.length),
        overrides: overrides.length,
        overrideRate: adopted.length === 0 ? 0 : round(overrides.length / adopted.length)
      },
      forecasting: {
        snapshots: forecasts.length,
        comparedDays: forecastErrors.length,
        meanAbsoluteError:
          forecastErrors.length === 0
            ? 0
            : round(forecastErrors.reduce((sum, value) => sum + value, 0) / forecastErrors.length)
      },
      anomalyDetection: {
        scans: anomalyScans.length,
        reviewedOrders: reviewedOrders.size,
        confirmedOrders: confirmedOrders.size,
        dismissedOrders: dismissedOrders.size,
        precision:
          reviewedOrders.size === 0 ? 0 : round(confirmedOrders.size / reviewedOrders.size)
      },
      governance: {
        features: [...features]
      },
      valueSummary: {
        keep,
        monitor
      }
    };
  }
}
