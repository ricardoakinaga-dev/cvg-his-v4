import { describe, expect, it, vi } from 'vitest';

import { FeatureStoreService } from '../../../packages/modules/ml/src/feature-store.service.js';
import {
  ModelRegistryService,
  type Model,
  type ModelRepository,
  type ModelStage,
  type ModelVersion
} from '../../../packages/modules/ml/src/model-registry.service.js';
import type {
  CreateFeatureVector,
  Feature,
  FeatureGroup,
  FeatureRepository,
  FeatureValue,
  FeatureVector
} from '../../../packages/modules/ml/src/types.js';
import { MlTelemetryService } from '../../../apps/api/src/ml-telemetry.js';
import type { ApiFeatureFlagsSnapshot } from '../../../apps/api/src/feature-flags.js';

function feature(id: string, overrides: Partial<Feature> = {}): Feature {
  return {
    id,
    name: `feature-${id}`,
    group: 'patient',
    dataType: 'number',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

function group(id: string): FeatureGroup {
  return {
    id,
    name: `group-${id}`,
    entityType: 'patient',
    createdAt: '2026-01-01T00:00:00.000Z'
  };
}

function vector(id: string): FeatureVector {
  return {
    id,
    name: `vector-${id}`,
    features: ['feature-1'],
    entityType: 'patient',
    entityId: 'patient-1',
    values: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

function createFeatureRepository(): FeatureRepository & {
  calls: Record<string, ReturnType<typeof vi.fn>>;
} {
  const calls = {
    createFeature: vi.fn(async () => feature('created')),
    findFeatureById: vi.fn(async () => feature('found')),
    findFeaturesByGroup: vi.fn(async () => [feature('grouped')]),
    listFeatures: vi.fn(async () => [feature('listed')]),
    updateFeature: vi.fn(async () => feature('updated')),
    deleteFeature: vi.fn(async () => undefined),
    createGroup: vi.fn(async () => group('created')),
    findGroupById: vi.fn(async () => group('found')),
    findGroupsByEntityType: vi.fn(async () => [group('entity')]),
    listGroups: vi.fn(async () => [group('listed')]),
    deleteGroup: vi.fn(async () => undefined),
    createVector: vi.fn(async () => vector('created')),
    findVectorById: vi.fn(async () => vector('found')),
    findVectorsByEntity: vi.fn(async () => [vector('entity')]),
    listVectors: vi.fn(async () => [vector('listed')]),
    updateVector: vi.fn(async () => vector('updated')),
    deleteVector: vi.fn(async () => undefined),
    upsertValue: vi.fn(async (value: Omit<FeatureValue, 'id'>) => ({ id: 'value-1', ...value })),
    findValuesByEntity: vi.fn(async () => [
      { id: 'value-1', featureId: 'feature-1', entityId: 'patient-1', value: 10, timestamp: '2026-01-01T00:00:00.000Z' }
    ]),
    findLatestValue: vi.fn(async () => ({
      id: 'value-1',
      featureId: 'feature-1',
      entityId: 'patient-1',
      value: 10,
      timestamp: '2026-01-01T00:00:00.000Z'
    }))
  };
  return { ...calls, calls } as unknown as FeatureRepository & {
    calls: Record<string, ReturnType<typeof vi.fn>>;
  };
}

function createModelRepository() {
  const model: Model = {
    id: 'model-1',
    name: 'duration',
    algorithm: 'regression',
    currentVersion: 2,
    createdAt: '2026-01-01T00:00:00.000Z'
  };
  const version = (id: string, stage: ModelStage = 'none'): ModelVersion => ({
    id,
    modelId: 'model-1',
    version: id === 'version-1' ? 1 : 2,
    stage,
    metrics: {},
    stageHistory: [],
    createdAt: '2026-01-01T00:00:00.000Z'
  });
  const repository: ModelRepository = {
    createModel: vi.fn(async () => model),
    findModelById: vi.fn(async () => model),
    listModels: vi.fn(async () => [model]),
    updateModel: vi.fn(async () => model),
    deleteModel: vi.fn(async () => undefined),
    createVersion: vi.fn(async () => version('version-2')),
    findVersionById: vi.fn(async () => version('version-2')),
    findVersionsByModelId: vi.fn(async () => [version('version-2', 'production'), version('version-1', 'staging')]),
    findVersionByModelAndVersion: vi.fn(async () => version('version-1')),
    updateVersionStage: vi.fn(async (id: string, stage: ModelStage) => version(id, stage)),
    updateVersionMetrics: vi.fn(async () => ({ ...version('version-2'), metrics: { mae: 0.2 } }))
  };
  return { repository, model, version };
}

describe('FeatureStoreService', () => {
  it('delegates complete feature, group, vector and value lifecycles', async () => {
    const repository = createFeatureRepository();
    const service = new FeatureStoreService(repository, { enabled: false, cacheTtlSeconds: 60 });
    const value = { featureId: 'feature-1', entityId: 'patient-1', value: 12 };
    const vectorInput: CreateFeatureVector = {
      name: 'v',
      features: ['feature-1'],
      entityType: 'patient',
      entityId: 'patient-1'
    };

    expect(service.isEnabled()).toBe(false);
    await expect(service.createFeature({ name: 'x', group: 'patient', dataType: 'number' })).resolves.toEqual(feature('created'));
    await expect(service.getFeature('feature-1')).resolves.toEqual(feature('found'));
    await expect(service.listFeatures(10, 2)).resolves.toEqual([feature('listed')]);
    await expect(service.updateFeature('feature-1', { description: 'updated' })).resolves.toEqual(feature('updated'));
    await expect(service.deleteFeature('feature-1')).resolves.toBeUndefined();
    await expect(service.createGroup({ name: 'g', entityType: 'patient' })).resolves.toEqual(group('created'));
    await expect(service.getGroup('group-1')).resolves.toEqual(group('found'));
    await expect(service.listGroups()).resolves.toEqual([group('listed')]);
    await expect(service.getGroupsByEntityType('patient')).resolves.toEqual([group('entity')]);
    await expect(service.deleteGroup('group-1')).resolves.toBeUndefined();
    await expect(service.createVector(vectorInput)).resolves.toEqual(vector('created'));
    await expect(service.getVector('vector-1')).resolves.toEqual(vector('found'));
    await expect(service.getVectorsForEntity('patient', 'patient-1')).resolves.toEqual([vector('entity')]);
    await expect(service.updateVector('vector-1', { name: 'updated' })).resolves.toEqual(vector('updated'));
    await expect(service.deleteVector('vector-1')).resolves.toBeUndefined();

    await service.recordValue(value);
    await service.recordValue({ ...value, timestamp: '2026-02-01T00:00:00.000Z' });
    await expect(service.getLatestValue('feature-1', 'patient-1')).resolves.toBe(10);
    await expect(service.getFeatureHistory('feature-1', 'patient-1')).resolves.toEqual([10]);
    await expect(service.aggregateFeatures('patient', 'patient-1', ['feature-1', 'feature-2'])).resolves.toEqual({
      'feature-1': 10,
      'feature-2': 10
    });
    await service.bulkRecordValues([value, { ...value, featureId: 'feature-2', timestamp: '2026-02-01T00:00:00.000Z' }]);

    expect(repository.calls.createFeature).toHaveBeenCalled();
    expect(repository.calls.upsertValue).toHaveBeenCalledTimes(4);
  });

  it('handles absent latest values and empty aggregations', async () => {
    const repository = createFeatureRepository();
    repository.findLatestValue.mockResolvedValue(null);
    repository.findValuesByEntity.mockResolvedValue([]);
    const service = new FeatureStoreService(repository);

    await expect(service.getLatestValue('missing', 'patient-1')).resolves.toBeNull();
    await expect(service.getFeatureHistory('missing', 'patient-1')).resolves.toEqual([]);
    await expect(service.aggregateFeatures('patient', 'patient-1', ['missing'])).resolves.toEqual({});
    await service.bulkRecordValues([]);
    expect(repository.calls.upsertValue).not.toHaveBeenCalled();
  });
});

describe('ModelRegistryService', () => {
  it('delegates model and version operations and archives all versions', async () => {
    const { repository, model } = createModelRepository();
    const service = new ModelRegistryService(repository);

    await expect(service.createModel({ name: 'duration', algorithm: 'regression' })).resolves.toEqual(model);
    await expect(service.getModel(model.id)).resolves.toEqual(model);
    await expect(service.listModels(5, 1)).resolves.toEqual([model]);
    await expect(service.updateModel(model.id, { description: 'new' })).resolves.toEqual(model);
    await expect(service.createVersion(model.id, 's3://model')).resolves.toMatchObject({ id: 'version-2' });
    await expect(service.getVersion('version-2')).resolves.toMatchObject({ id: 'version-2' });
    await expect(service.getVersionsForModel(model.id)).resolves.toHaveLength(2);
    await expect(service.getProductionVersion(model.id)).resolves.toMatchObject({ stage: 'production' });
    await expect(service.promoteToStaging('version-2', 'actor-1')).resolves.toMatchObject({ stage: 'staging' });
    await expect(service.promoteToProduction('version-2', 'actor-1')).resolves.toMatchObject({ stage: 'production' });
    await expect(service.archiveVersion('version-2')).resolves.toMatchObject({ stage: 'archived' });
    await expect(service.updateMetrics('version-2', { mae: 0.2 })).resolves.toMatchObject({ metrics: { mae: 0.2 } });
    await service.archiveModel(model.id);
    expect(repository.updateVersionStage).toHaveBeenCalledWith('version-1', 'archived');
    expect(repository.updateVersionStage).toHaveBeenCalledWith('version-2', 'archived');
  });

  it('handles missing models/versions, a single production version and valid transitions', async () => {
    const { repository, model } = createModelRepository();
    const service = new ModelRegistryService(repository);
    repository.findModelById.mockResolvedValue(null);
    await expect(service.archiveModel('missing')).resolves.toBeUndefined();
    await expect(service.createVersion('missing')).rejects.toThrow('Model missing not found');
    repository.findModelById.mockResolvedValue(model);
    repository.findVersionById.mockResolvedValueOnce(null).mockResolvedValue({
      id: 'version-2', modelId: model.id, version: 2, stage: 'staging', metrics: {}, stageHistory: [], createdAt: model.createdAt
    });
    await expect(service.promoteToProduction('missing')).rejects.toThrow('Version missing not found');
    repository.findVersionsByModelId.mockResolvedValueOnce([]);
    await expect(service.getProductionVersion(model.id)).resolves.toBeNull();
    repository.findVersionsByModelId.mockResolvedValueOnce([{ id: 'version-2', modelId: model.id, version: 2, stage: 'production', metrics: {}, stageHistory: [], createdAt: model.createdAt }]);
    await expect(service.getProductionVersion(model.id)).resolves.toMatchObject({ stage: 'production' });
    repository.findVersionById.mockResolvedValue({ id: 'version-2', modelId: model.id, version: 2, stage: 'production', metrics: {}, stageHistory: [], createdAt: model.createdAt });
    await expect(service.promoteToProduction('version-2')).resolves.toMatchObject({ stage: 'production' });

    await expect(service.validateStageTransition('none', 'staging')).resolves.toBe(true);
    await expect(service.validateStageTransition('staging', 'production')).resolves.toBe(true);
    await expect(service.validateStageTransition('production', 'archived')).resolves.toBe(true);
    await expect(service.validateStageTransition('archived', 'production')).resolves.toBe(false);
    await expect(service.validateStageTransition('invalid' as ModelStage, 'production')).resolves.toBe(false);
  });
});

function flags(overrides: Partial<ApiFeatureFlagsSnapshot> = {}): ApiFeatureFlagsSnapshot {
  return {
    providerName: 'test',
    enabledKeys: [],
    decisions: {},
    authOidcEnabled: false,
    authWebauthnEnabled: false,
    runtimeDistributedStateEnabled: false,
    fiscalBackofficeEnabled: false,
    notificationsWhatsappRemindersEnabled: false,
    notificationsWhatsappInboundActionsEnabled: false,
    mlSmartSchedulingEnabled: true,
    mlForecastingEnabled: true,
    mlAnomalyDetectionEnabled: true,
    mlOcrFiscalEnabled: false,
    provider: {} as ApiFeatureFlagsSnapshot['provider'],
    ...overrides
  };
}

describe('MlTelemetryService', () => {
  it('aggregates tenant-scoped adoption, forecast accuracy, reviews and governance', () => {
    const service = new MlTelemetryService();
    service.recordSmartSchedulingRecommendation({ accountId: 'account-a', recommendationId: 'r-1', visitType: 'consultation', predictedDurationMinutes: 30, confidence: 0.9 });
    service.recordSmartSchedulingRecommendation({ accountId: 'account-a', recommendationId: 'r-2', visitType: 'return', predictedDurationMinutes: 45, confidence: 0.8 });
    service.recordSmartSchedulingRecommendation({ accountId: 'account-b', recommendationId: 'r-other', visitType: 'consultation', predictedDurationMinutes: 20, confidence: 0.7 });
    service.recordSmartSchedulingApplication({ accountId: 'account-a', recommendationId: 'r-1', appliedDurationMinutes: 35 });
    service.recordSmartSchedulingApplication({ accountId: 'account-a', recommendationId: 'unknown', appliedDurationMinutes: 20 });
    service.recordForecastSnapshot({
      accountId: 'account-a',
      generatedAt: '2026-01-01T00:00:00.000Z',
      horizonDays: 2,
      days: [
        { date: '2026-09-15T12:00:00.000Z', predictedAppointments: 2, predictedMinutes: 60, confidence: 0.9 },
        { date: '2026-09-17T12:00:00.000Z', predictedAppointments: 100, predictedMinutes: 3000, confidence: 0.4 }
      ]
    });
    service.recordAnomalyScan({ accountId: 'account-a', generatedAt: '2026-01-01T00:00:00.000Z', totalAnalyzed: 3, flaggedOrders: 2, flags: [{ orderId: 'order-1', severity: 'high' }] });
    service.recordAnomalyReview({ accountId: 'account-a', orderId: 'order-1', disposition: 'confirmed', note: 'confirmado', actorId: 'actor', correlationId: 'corr' });
    service.recordAnomalyReview({ accountId: 'account-a', orderId: 'order-2', disposition: 'dismissed', actorId: 'actor', correlationId: 'corr' });
    service.recordAnomalyReview({ accountId: 'account-b', orderId: 'order-3', disposition: 'confirmed', actorId: 'actor', correlationId: 'corr' });

    const report = service.getReport({
      accountId: 'account-a',
      appointments: [
        { scheduledAt: '2026-09-15T08:00:00.000Z', status: 'scheduled' },
        { scheduledAt: '2026-09-15T09:00:00.000Z', status: 'cancelled' },
        { scheduledAt: '2026-09-16T09:00:00.000Z', status: 'completed' }
      ],
      featureFlags: flags(),
      now: new Date('2026-09-16T12:00:00.000Z')
    });

    expect(report.smartScheduling).toMatchObject({ recommendations: 2, adopted: 1, adoptionRate: 0.5, overrides: 1, overrideRate: 1 });
    expect(report.forecasting).toMatchObject({ snapshots: 1, comparedDays: 1, meanAbsoluteError: 1 });
    expect(report.anomalyDetection).toMatchObject({ scans: 1, reviewedOrders: 2, confirmedOrders: 1, dismissedOrders: 1, precision: 0.5 });
    expect(report.governance.features.map(item => item.enabled)).toEqual([true, true, true, false]);
    expect(report.valueSummary.keep).toEqual(['ml.smart_scheduling.enabled', 'ml.forecasting.enabled', 'ml.anomaly_detection.enabled']);
    expect(report.valueSummary.monitor).toEqual(['smart-scheduling-overrides', 'forecast-accuracy', 'anomaly-review-precision']);
  });

  it('returns zeroed metrics for empty or isolated accounts', () => {
    const service = new MlTelemetryService();
    const report = service.getReport({
      accountId: 'empty',
      appointments: [{ scheduledAt: '2026-09-15T08:00:00.000Z', status: 'cancelled' }],
      featureFlags: flags({ mlSmartSchedulingEnabled: false, mlForecastingEnabled: false, mlAnomalyDetectionEnabled: false }),
      now: new Date('2026-09-16T12:00:00.000Z')
    });

    expect(report.smartScheduling).toEqual({ recommendations: 0, adopted: 0, adoptionRate: 0, overrides: 0, overrideRate: 0 });
    expect(report.forecasting).toEqual({ snapshots: 0, comparedDays: 0, meanAbsoluteError: 0 });
    expect(report.anomalyDetection).toEqual({ scans: 0, reviewedOrders: 0, confirmedOrders: 0, dismissedOrders: 0, precision: 0 });
    expect(report.valueSummary).toEqual({ keep: [], monitor: [] });
  });
});
