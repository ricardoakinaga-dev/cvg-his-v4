/**
 * Governed offline validation for ML recommendations.
 *
 * This module deliberately does not train, deploy, or promote a model. It
 * produces a reproducible validation record that callers can attach to a
 * model version and use as a release gate. Recommendations remain assistive
 * until a human reviewer records acceptance.
 */

export type MlValidationStatus = 'passed' | 'failed' | 'insufficient_data';
export type MlTask = 'classification' | 'regression' | 'forecasting';

export interface MlClassificationExample {
  readonly actual: string | number | boolean;
  readonly predicted: string | number | boolean;
  readonly confidence?: number;
}

export interface MlRegressionExample {
  readonly actual: number;
  readonly predicted: number;
}

export interface MlValidationPolicy {
  /** Minimum holdout examples required before a model can pass. */
  readonly minSamples: number;
  /** Classification accuracy floor, in [0, 1]. */
  readonly minAccuracy?: number;
  /** Classification macro precision floor, in [0, 1]. */
  readonly minPrecision?: number;
  /** Regression/forecasting MAE ceiling. */
  readonly maxMae?: number;
  /** Optional confidence floor used to measure recommendation coverage. */
  readonly minConfidence?: number;
  /** Minimum fraction of examples with a recommendation. */
  readonly minCoverage?: number;
}

export interface MlValidationInput {
  readonly modelVersion: string;
  readonly datasetFingerprint: string;
  readonly task: MlTask;
  readonly policy: MlValidationPolicy;
  readonly reviewerId?: string;
}

export interface MlValidationResult {
  readonly modelVersion: string;
  readonly datasetFingerprint: string;
  readonly task: MlTask;
  readonly status: MlValidationStatus;
  readonly sampleSize: number;
  readonly metrics: Readonly<Record<string, number>>;
  readonly policy: MlValidationPolicy;
  readonly evaluatedAt: string;
  readonly reviewerId?: string;
  readonly humanReviewRequired: true;
  readonly reasons: readonly string[];
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function validatePolicy(policy: MlValidationPolicy): void {
  if (!Number.isInteger(policy.minSamples) || policy.minSamples < 1) {
    throw new Error('minSamples must be a positive integer');
  }
  for (const [name, value] of Object.entries(policy)) {
    if (name === 'minSamples' || value === undefined) continue;
    if (!finite(value) || (name !== 'maxMae' && (value < 0 || value > 1)) || (name === 'maxMae' && value < 0)) {
      throw new Error(`invalid ML validation policy value: ${name}`);
    }
  }
}

function baseResult(input: MlValidationInput, sampleSize: number, metrics: Record<string, number>, reasons: string[], status: MlValidationStatus): MlValidationResult {
  return {
    modelVersion: input.modelVersion,
    datasetFingerprint: input.datasetFingerprint,
    task: input.task,
    status,
    sampleSize,
    metrics,
    policy: { ...input.policy },
    evaluatedAt: new Date().toISOString(),
    ...(input.reviewerId ? { reviewerId: input.reviewerId } : {}),
    humanReviewRequired: true,
    reasons
  };
}

/** Evaluate a classification holdout without mutating a registry. */
export function validateClassification(
  input: MlValidationInput,
  examples: readonly MlClassificationExample[]
): MlValidationResult {
  if (input.task !== 'classification') throw new Error('classification task required');
  validatePolicy(input.policy);
  const sampleSize = examples.length;
  if (sampleSize < input.policy.minSamples) {
    return baseResult(input, sampleSize, {}, [`insufficient_samples:${sampleSize}<${input.policy.minSamples}`], 'insufficient_data');
  }

  let correct = 0;
  let covered = 0;
  const labels = new Set<string>();
  const truePositives = new Map<string, number>();
  const predictedPositives = new Map<string, number>();
  const actualPositives = new Map<string, number>();
  for (const example of examples) {
    const actual = String(example.actual);
    const predicted = String(example.predicted);
    labels.add(actual);
    labels.add(predicted);
    if (actual === predicted) correct += 1;
    if (example.confidence !== undefined && finite(example.confidence) && example.confidence >= (input.policy.minConfidence ?? 0)) covered += 1;
    if (actual === predicted) truePositives.set(actual, (truePositives.get(actual) ?? 0) + 1);
    predictedPositives.set(predicted, (predictedPositives.get(predicted) ?? 0) + 1);
    actualPositives.set(actual, (actualPositives.get(actual) ?? 0) + 1);
  }
  const accuracy = correct / sampleSize;
  const precision = Array.from(labels).reduce((sum, label) => {
    const denominator = predictedPositives.get(label) ?? 0;
    return sum + (denominator ? (truePositives.get(label) ?? 0) / denominator : 0);
  }, 0) / Math.max(labels.size, 1);
  const coverage = covered / sampleSize;
  const metrics = { accuracy, precision, coverage };
  const reasons: string[] = [];
  if (input.policy.minAccuracy !== undefined && accuracy < input.policy.minAccuracy) reasons.push(`accuracy_below_floor:${accuracy.toFixed(4)}<${input.policy.minAccuracy}`);
  if (input.policy.minPrecision !== undefined && precision < input.policy.minPrecision) reasons.push(`precision_below_floor:${precision.toFixed(4)}<${input.policy.minPrecision}`);
  if (input.policy.minCoverage !== undefined && coverage < input.policy.minCoverage) reasons.push(`coverage_below_floor:${coverage.toFixed(4)}<${input.policy.minCoverage}`);
  return baseResult(input, sampleSize, metrics, reasons, reasons.length ? 'failed' : 'passed');
}

/** Evaluate a regression or forecasting holdout using MAE and coverage. */
export function validateRegression(
  input: MlValidationInput,
  examples: readonly MlRegressionExample[]
): MlValidationResult {
  if (input.task !== 'regression' && input.task !== 'forecasting') throw new Error('regression or forecasting task required');
  validatePolicy(input.policy);
  const sampleSize = examples.length;
  if (sampleSize < input.policy.minSamples) {
    return baseResult(input, sampleSize, {}, [`insufficient_samples:${sampleSize}<${input.policy.minSamples}`], 'insufficient_data');
  }
  if (examples.some((example) => !finite(example.actual) || !finite(example.predicted))) {
    return baseResult(input, sampleSize, {}, ['non_finite_example'], 'failed');
  }
  const mae = examples.reduce((sum, example) => sum + Math.abs(example.actual - example.predicted), 0) / sampleSize;
  const metrics = { mae, coverage: 1 };
  const reasons = input.policy.maxMae !== undefined && mae > input.policy.maxMae
    ? [`mae_above_ceiling:${mae.toFixed(4)}>${input.policy.maxMae}`]
    : [];
  return baseResult(input, sampleSize, metrics, reasons, reasons.length ? 'failed' : 'passed');
}

/** A production gate is intentionally stricter than a numeric score. */
export function canUseMlResult(result: MlValidationResult): boolean {
  return result.status === 'passed' && Boolean(result.reviewerId) && result.humanReviewRequired === true;
}
