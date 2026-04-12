/**
 * SLO (Service Level Objective) Tracking
 *
 * Implements error budget monitoring and SLO compliance reporting.
 * Based on the SLO definitions in benchmarks/k6/slos.json.
 *
 * Error budget formula:
 *   budget_remaining = target - (observed_error_rate / target) * 100
 *   burn_rate = actual_error_rate / target_error_rate
 *
 * A burn rate > 1 means the error budget is being consumed faster than expected.
 */

export interface SLOConfig {
  id: string;
  name: string;
  target: number;      // e.g. 99.5 for 99.5%
  unit: string;        // 'percent' | 'ms'
  window: string;      // e.g. '1h', '1d', '30d'
  alertThreshold: number;
  criticalThreshold: number;
  category: 'performance' | 'availability' | 'reliability';
}

export interface SLOStatus {
  id: string;
  name: string;
  currentValue: number;
  target: number;
  unit: string;
  status: 'healthy' | 'alert' | 'critical';
  errorBudgetPercent: number;  // 0-100, 100 = full budget remaining
  burnRate: number;           // >1 = burning budget
  lastUpdated: Date;
}

const SLO_CONFIGS: SLOConfig[] = [
  {
    id: 'api-latency-p95',
    name: 'API P95 Latency',
    target: 200,
    unit: 'ms',
    window: '5m',
    alertThreshold: 250,
    criticalThreshold: 300,
    category: 'performance'
  },
  {
    id: 'api-latency-p99',
    name: 'API P99 Latency',
    target: 500,
    unit: 'ms',
    window: '5m',
    alertThreshold: 600,
    criticalThreshold: 800,
    category: 'performance'
  },
  {
    id: 'api-availability',
    name: 'API Availability',
    target: 99.5,
    unit: 'percent',
    window: '1h',
    alertThreshold: 99.0,
    criticalThreshold: 98.0,
    category: 'availability'
  },
  {
    id: 'api-error-rate',
    name: 'API Error Rate',
    target: 0.1,
    unit: 'percent',
    window: '5m',
    alertThreshold: 0.5,
    criticalThreshold: 1.0,
    category: 'reliability'
  }
];

/** 30-day window in milliseconds for error budget calculation */
const BUDGET_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function getSLOConfigs(): SLOConfig[] {
  return SLO_CONFIGS;
}

export function getSLOConfig(id: string): SLOConfig | undefined {
  return SLO_CONFIGS.find(s => s.id === id);
}

/**
 * Calculate error budget remaining for an availability SLO.
 * Based on a 30-day window.
 *
 * Example: 99.5% availability target
 *   - 30 days = 43,200 minutes
 *   - Allowed downtime at 99.5% = 216 minutes = 3.6 hours
 *   - Error budget = 216 minutes
 */
export function calculateErrorBudget(config: SLOConfig): number {
  if (config.category !== 'availability') return 100;

  const windowMinutes = windowToMinutes(config.window);
  const allowedErrorsPercent = 100 - config.target;
  const totalMinutesIn30d = (BUDGET_WINDOW_MS / 60000);
  const allowedDowntimeMinutes = (allowedErrorsPercent / 100) * totalMinutesIn30d * (windowMinutes / totalMinutesIn30d);

  // For a 30-day budget window
  const budgetMinutes = (allowedErrorsPercent / 100) * (BUDGET_WINDOW_MS / 60000);
  return budgetMinutes;
}

function windowToMinutes(window: string): number {
  const match = /^(\d+)([mhd])$/.exec(window);
  if (!match) return 60;
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case 'm': return value;
    case 'h': return value * 60;
    case 'd': return value * 1440;
    default: return 60;
  }
}

/**
 * Determine SLO status from current measurement against thresholds.
 */
export function getSLOStatus(config: SLOConfig, currentValue: number): 'healthy' | 'alert' | 'critical' {
  if (config.category === 'availability') {
    // For availability, lower is worse
    if (currentValue < config.criticalThreshold) return 'critical';
    if (currentValue < config.alertThreshold) return 'alert';
    return 'healthy';
  } else {
    // For latency and error rate, higher is worse
    if (currentValue >= config.criticalThreshold) return 'critical';
    if (currentValue >= config.alertThreshold) return 'alert';
    return 'healthy';
  }
}

/**
 * Calculate error budget percentage remaining.
 * Returns 100 when full budget available, 0 when exhausted.
 *
 * For availability: budget = (observed_availability - (1 - target)) / target * 100
 * For error rate: budget = (target - observed_error_rate) / target * 100
 */
export function calculateBudgetRemaining(config: SLOConfig, currentValue: number): number {
  if (config.category === 'availability') {
    const budget = ((currentValue - (100 - config.target)) / config.target) * 100;
    return Math.max(0, Math.min(100, budget));
  } else {
    const budget = ((config.target - currentValue) / config.target) * 100;
    return Math.max(0, Math.min(100, budget));
  }
}

/**
 * Calculate burn rate — how fast the error budget is being consumed.
 * burn_rate = 1 means budget being consumed at expected rate.
 * burn_rate > 1 means budget burning faster than expected.
 *
 * For a 1h window with 99.9% target:
 *   - If error rate is 0.3%, burn_rate = 0.3/0.1 = 3x
 */
export function calculateBurnRate(config: SLOConfig, currentValue: number): number {
  if (config.category === 'availability') {
    // Burn rate for availability = how much budget consumed per unit time
    const budget_consumed = 100 - currentValue;
    const target_consumed = 100 - config.target;
    return target_consumed > 0 ? budget_consumed / target_consumed : 0;
  } else {
    // Burn rate for error rate
    return config.target > 0 ? currentValue / config.target : 0;
  }
}

export interface SLOReport {
  generatedAt: Date;
  window: string;
  slos: SLOStatus[];
  overallStatus: 'healthy' | 'degraded' | 'critical';
  errorBudgetExhausted: boolean;
}

/**
 * Generate an SLO compliance report from current metrics.
 * This would be called by a /metrics or /slos endpoint.
 */
export function generateSLOReport(metrics: {
  p95LatencyMs: number;
  p99LatencyMs: number;
  availabilityPercent: number;
  errorRatePercent: number;
}): SLOReport {
  const now = new Date();

  const statuses: SLOStatus[] = [
    {
      id: 'api-latency-p95',
      name: 'API P95 Latency',
      currentValue: metrics.p95LatencyMs,
      target: 200,
      unit: 'ms',
      status: getSLOStatus(SLO_CONFIGS[0], metrics.p95LatencyMs),
      errorBudgetPercent: calculateBudgetRemaining(SLO_CONFIGS[0], metrics.p95LatencyMs),
      burnRate: calculateBurnRate(SLO_CONFIGS[0], metrics.p95LatencyMs),
      lastUpdated: now
    },
    {
      id: 'api-latency-p99',
      name: 'API P99 Latency',
      currentValue: metrics.p99LatencyMs,
      target: 500,
      unit: 'ms',
      status: getSLOStatus(SLO_CONFIGS[1], metrics.p99LatencyMs),
      errorBudgetPercent: calculateBudgetRemaining(SLO_CONFIGS[1], metrics.p99LatencyMs),
      burnRate: calculateBurnRate(SLO_CONFIGS[1], metrics.p99LatencyMs),
      lastUpdated: now
    },
    {
      id: 'api-availability',
      name: 'API Availability',
      currentValue: metrics.availabilityPercent,
      target: 99.5,
      unit: 'percent',
      status: getSLOStatus(SLO_CONFIGS[2], metrics.availabilityPercent),
      errorBudgetPercent: calculateBudgetRemaining(SLO_CONFIGS[2], metrics.availabilityPercent),
      burnRate: calculateBurnRate(SLO_CONFIGS[2], metrics.availabilityPercent),
      lastUpdated: now
    },
    {
      id: 'api-error-rate',
      name: 'API Error Rate',
      currentValue: metrics.errorRatePercent,
      target: 0.1,
      unit: 'percent',
      status: getSLOStatus(SLO_CONFIGS[3], metrics.errorRatePercent),
      errorBudgetPercent: calculateBudgetRemaining(SLO_CONFIGS[3], metrics.errorRatePercent),
      burnRate: calculateBurnRate(SLO_CONFIGS[3], metrics.errorRatePercent),
      lastUpdated: now
    }
  ];

  const hasCritical = statuses.some(s => s.status === 'critical');
  const hasAlert = statuses.some(s => s.status === 'alert');
  const exhaustedBudget = statuses.some(s => s.errorBudgetPercent <= 0);

  return {
    generatedAt: now,
    window: '30d',
    slos: statuses,
    overallStatus: hasCritical ? 'critical' : hasAlert ? 'degraded' : 'healthy',
    errorBudgetExhausted: exhaustedBudget
  };
}