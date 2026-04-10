/**
 * Model Repository Interface
 * F3-02: Model Registry - Repository abstraction
 */

import type { Model, ModelVersion, ModelStage } from '../model-registry.service.js';

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