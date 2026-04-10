/**
 * Model Registry Service - ML Model versioning and lifecycle management
 * F3-02: Model Registry - Service for managing ML models
 */

import type { EntityType } from './types.js';

export type ModelStage = 'none' | 'staging' | 'production' | 'archived';
export type ModelAlgorithm = 'regression' | 'classification' | 'forecasting';

export interface Model {
  id: string;
  name: string;
  description?: string;
  algorithm: ModelAlgorithm;
  currentVersion: number;
  createdAt: string;
}

export interface ModelVersion {
  id: string;
  modelId: string;
  version: number;
  stage: ModelStage;
  artifactUri?: string;
  metrics: Record<string, number>;
  stageHistory: StageTransition[];
  createdAt: string;
}

export interface StageTransition {
  from: ModelStage;
  to: ModelStage;
  at: string;
  by?: string;
}

export interface ModelRepository {
  createModel(model: Omit<Model, 'id' | 'currentVersion' | 'createdAt'>): Promise<Model>;
  findModelById(id: string): Promise<Model | null>;
  listModels(limit?: number, offset?: number): Promise<Model[]>;
  updateModel(id: string, data: Partial<Omit<Model, 'id' | 'createdAt'>>): Promise<Model>;
  deleteModel(id: string): Promise<void>;

  createVersion(version: Omit<ModelVersion, 'id' | 'stage' | 'metrics' | 'stageHistory' | 'createdAt'>): Promise<ModelVersion>;
  findVersionById(id: string): Promise<ModelVersion | null>;
  findVersionsByModelId(modelId: string): Promise<ModelVersion[]>;
  findVersionByModelAndVersion(modelId: string, version: number): Promise<ModelVersion | null>;
  updateVersionStage(id: string, stage: ModelStage, by?: string): Promise<ModelVersion>;
  updateVersionMetrics(id: string, metrics: Record<string, number>): Promise<ModelVersion>;
}

export class ModelRegistryService {
  private repository: ModelRepository;

  constructor(repository: ModelRepository) {
    this.repository = repository;
  }

  // Model CRUD
  async createModel(data: {
    name: string;
    algorithm: ModelAlgorithm;
    description?: string;
  }): Promise<Model> {
    return this.repository.createModel(data);
  }

  async getModel(id: string): Promise<Model | null> {
    return this.repository.findModelById(id);
  }

  async listModels(limit = 100, offset = 0): Promise<Model[]> {
    return this.repository.listModels(limit, offset);
  }

  async updateModel(id: string, data: Partial<Omit<Model, 'id' | 'createdAt'>>): Promise<Model> {
    return this.repository.updateModel(id, data);
  }

  async archiveModel(id: string): Promise<void> {
    const model = await this.repository.findModelById(id);
    if (!model) return;

    // Archive all versions
    const versions = await this.repository.findVersionsByModelId(id);
    await Promise.all(
      versions.map(v => this.repository.updateVersionStage(v.id, 'archived'))
    );
  }

  // Version lifecycle
  async createVersion(modelId: string, artifactUri?: string): Promise<ModelVersion> {
    const model = await this.repository.findModelById(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const version = await this.repository.createVersion({
      modelId,
      version: model.currentVersion + 1,
      artifactUri
    });

    // Update model's current version
    await this.repository.updateModel(modelId, { currentVersion: version.version });

    return version;
  }

  async getVersion(id: string): Promise<ModelVersion | null> {
    return this.repository.findVersionById(id);
  }

  async getVersionsForModel(modelId: string): Promise<ModelVersion[]> {
    return this.repository.findVersionsByModelId(modelId);
  }

  async getProductionVersion(modelId: string): Promise<ModelVersion | null> {
    const versions = await this.repository.findVersionsByModelId(modelId);
    return versions.find(v => v.stage === 'production') ?? null;
  }

  async promoteToStaging(versionId: string, by?: string): Promise<ModelVersion> {
    return this.repository.updateVersionStage(versionId, 'staging', by);
  }

  async promoteToProduction(versionId: string, by?: string): Promise<ModelVersion> {
    const version = await this.repository.findVersionById(versionId);
    if (!version) throw new Error(`Version ${versionId} not found`);

    // Demote current production version to staging
    const currentProd = await this.getProductionVersion(version.modelId);
    if (currentProd && currentProd.id !== versionId) {
      await this.repository.updateVersionStage(currentProd.id, 'staging', by);
    }

    return this.repository.updateVersionStage(versionId, 'production', by);
  }

  async archiveVersion(versionId: string): Promise<ModelVersion> {
    return this.repository.updateVersionStage(versionId, 'archived');
  }

  async updateMetrics(versionId: string, metrics: Record<string, number>): Promise<ModelVersion> {
    return this.repository.updateVersionMetrics(versionId, metrics);
  }

  // Validation
  async validateStageTransition(from: ModelStage, to: ModelStage): Promise<boolean> {
    const validTransitions: Record<ModelStage, ModelStage[]> = {
      'none': ['staging'],
      'staging': ['production', 'archived'],
      'production': ['archived'],
      'archived': []
    };
    return validTransitions[from]?.includes(to) ?? false;
  }
}