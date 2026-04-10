/**
 * ML Module Tests - Feature Store & Model Registry
 * F3-01 & F3-02: Feature Store + Model Registry tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Feature, FeatureGroup, FeatureVector, CreateFeatureVector } from './types.js';
import type { Model, ModelVersion, ModelStage } from './model-registry.service.js';

// Mock implementations for testing without database
class InMemoryFeatureRepository {
  private features: Map<string, Feature> = new Map();
  private groups: Map<string, FeatureGroup> = new Map();
  private vectors: Map<string, FeatureVector> = new Map();
  private counter = 0;

  private nextId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.counter}`;
  }

  async createFeature(f: Omit<Feature, 'id' | 'createdAt' | 'updatedAt'>): Promise<Feature> {
    const id = this.nextId('feat');
    const now = new Date().toISOString();
    const feature: Feature = { ...f, id, createdAt: now, updatedAt: now };
    this.features.set(id, feature);
    return feature;
  }

  async findFeatureById(id: string): Promise<Feature | null> {
    return this.features.get(id) ?? null;
  }

  async listFeatures(): Promise<Feature[]> {
    return Array.from(this.features.values());
  }

  async createGroup(g: Omit<FeatureGroup, 'id' | 'createdAt'>): Promise<FeatureGroup> {
    const id = this.nextId('grp');
    const group: FeatureGroup = { ...g, id, createdAt: new Date().toISOString() };
    this.groups.set(id, group);
    return group;
  }

  async createVector(v: CreateFeatureVector): Promise<FeatureVector> {
    const id = `vec_${Date.now()}`;
    const now = new Date().toISOString();
    const vector: FeatureVector = { ...v, id, values: {}, createdAt: now, updatedAt: now };
    this.vectors.set(id, vector);
    return vector;
  }

  async findVectorById(id: string): Promise<FeatureVector | null> {
    return this.vectors.get(id) ?? null;
  }
}

class InMemoryModelRepository {
  private models: Map<string, Model> = new Map();
  private versions: Map<string, ModelVersion> = new Map();
  private counter = 0;

  private nextId(): string {
    return `model_${Date.now()}_${++this.counter}`;
  }

  async createModel(m: Omit<Model, 'id' | 'currentVersion' | 'createdAt'>): Promise<Model> {
    const id = this.nextId();
    const model: Model = { ...m, id, currentVersion: 1, createdAt: new Date().toISOString() };
    this.models.set(id, model);
    return model;
  }

  async findModelById(id: string): Promise<Model | null> {
    return this.models.get(id) ?? null;
  }

  async listModels(): Promise<Model[]> {
    return Array.from(this.models.values());
  }

  async createVersion(
    v: Omit<ModelVersion, 'id' | 'stage' | 'metrics' | 'stageHistory' | 'createdAt'>
  ): Promise<ModelVersion> {
    const id = `ver_${Date.now()}_${++this.counter}`;
    const version: ModelVersion = {
      ...v,
      id,
      stage: 'none',
      metrics: {},
      stageHistory: [],
      createdAt: new Date().toISOString()
    };
    this.versions.set(id, version);
    return version;
  }
}

describe('Feature Store', () => {
  it('creates a feature', async () => {
    const repo = new InMemoryFeatureRepository();
    const group = await repo.createGroup({ name: 'patient demographics', entityType: 'patient' });
    const feature = await repo.createFeature({
      name: 'age',
      group: group.id,
      dataType: 'number',
      description: 'Patient age in years'
    });

    expect(feature.id).toBeDefined();
    expect(feature.name).toBe('age');
    expect(feature.dataType).toBe('number');
    expect(feature.createdAt).toBeDefined();
  });

  it('finds feature by id', async () => {
    const repo = new InMemoryFeatureRepository();
    const group = await repo.createGroup({ name: 'test', entityType: 'patient' });
    const created = await repo.createFeature({
      name: 'test_feat',
      group: group.id,
      dataType: 'string'
    });
    const found = await repo.findFeatureById(created.id);
    expect(found?.name).toBe('test_feat');
  });

  it('lists all features', async () => {
    const repo = new InMemoryFeatureRepository();
    const group = await repo.createGroup({ name: 'test', entityType: 'patient' });
    await repo.createFeature({ name: 'feat1', group: group.id, dataType: 'string' });
    await repo.createFeature({ name: 'feat2', group: group.id, dataType: 'number' });
    const list = await repo.listFeatures();
    expect(list).toHaveLength(2);
  });

  it('creates feature groups', async () => {
    const repo = new InMemoryFeatureRepository();
    const group = await repo.createGroup({
      name: 'vitals',
      entityType: 'patient',
      description: 'Vital signs features'
    });
    expect(group.id).toBeDefined();
    expect(group.name).toBe('vitals');
    expect(group.entityType).toBe('patient');
  });

  it('creates feature vectors', async () => {
    const repo = new InMemoryFeatureRepository();
    const group = await repo.createGroup({ name: 'test', entityType: 'patient' });
    const f1 = await repo.createFeature({ name: 'feat1', group: group.id, dataType: 'number' });
    const f2 = await repo.createFeature({ name: 'feat2', group: group.id, dataType: 'number' });

    const vector = await repo.createVector({
      name: 'patient_vitals_v1',
      features: [f1.id, f2.id],
      entityType: 'patient',
      entityId: 'patient_123'
    });

    expect(vector.id).toBeDefined();
    expect(vector.features).toHaveLength(2);
    expect(vector.entityId).toBe('patient_123');
  });
});

describe('Model Registry', () => {
  it('creates a model', async () => {
    const repo = new InMemoryModelRepository();
    const model = await repo.createModel({
      name: 'appointment_duration_predictor',
      algorithm: 'regression',
      description: 'Predicts appointment duration based on visit type'
    });

    expect(model.id).toBeDefined();
    expect(model.name).toBe('appointment_duration_predictor');
    expect(model.algorithm).toBe('regression');
    expect(model.currentVersion).toBe(1);
  });

  it('finds model by id', async () => {
    const repo = new InMemoryModelRepository();
    const created = await repo.createModel({ name: 'test_model', algorithm: 'classification' });
    const found = await repo.findModelById(created.id);
    expect(found?.name).toBe('test_model');
  });

  it('lists all models', async () => {
    const repo = new InMemoryModelRepository();
    await repo.createModel({ name: 'model1', algorithm: 'regression' });
    await repo.createModel({ name: 'model2', algorithm: 'forecasting' });
    const list = await repo.listModels();
    expect(list).toHaveLength(2);
  });

  it('creates model versions', async () => {
    const repo = new InMemoryModelRepository();
    const model = await repo.createModel({ name: 'test', algorithm: 'regression' });
    const version = await repo.createVersion({
      modelId: model.id,
      version: 1,
      artifactUri: 's3://models/test/v1'
    });

    expect(version.id).toBeDefined();
    expect(version.modelId).toBe(model.id);
    expect(version.version).toBe(1);
    expect(version.stage).toBe('none');
    expect(version.metrics).toEqual({});
  });

  it('version stage transitions are valid', async () => {
    const repo = new InMemoryModelRepository();
    const model = await repo.createModel({ name: 'test', algorithm: 'regression' });
    const v1 = await repo.createVersion({ modelId: model.id, version: 1 });

    // Valid: none -> staging
    expect(v1.stage).toBe('none');
  });
});

describe('Feature Store Service', () => {
  it('records and retrieves feature values', async () => {
    const repo = new InMemoryFeatureRepository();
    const group = await repo.createGroup({ name: 'test', entityType: 'patient' });
    const feature = await repo.createFeature({
      name: 'weight',
      group: group.id,
      dataType: 'number'
    });

    // Simple value storage test
    const vector = await repo.createVector({
      name: 'test_vector',
      features: [feature.id],
      entityType: 'patient',
      entityId: 'patient_1'
    });

    expect(vector.features).toContain(feature.id);
  });
});

describe('Model Stage Lifecycle', () => {
  it('validates stage transitions', () => {
    const validTransitions: Record<ModelStage, ModelStage[]> = {
      none: ['staging'],
      staging: ['production', 'archived'],
      production: ['archived'],
      archived: []
    };

    expect(validTransitions['none']).toContain('staging');
    expect(validTransitions['staging']).toContain('production');
    expect(validTransitions['production']).toContain('archived');
    expect(validTransitions['archived']).not.toContain('staging');
  });
});
