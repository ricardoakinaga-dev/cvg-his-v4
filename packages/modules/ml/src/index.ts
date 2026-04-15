/**
 * ML Module - CVG-HIS-V2 AI/ML Infrastructure
 * F3-01 & F3-02: Feature Store + Model Registry
 */

// Types
export * from './types.js';

// Schemas
export * from './schemas/index.js';

// Feature Store
export { FeatureStoreService } from './feature-store.service.js';
export { DatabaseFeatureRepository } from './repositories/database-feature.repository.js';
export type { FeatureRepository } from './repositories/feature-repository.interface.js';

// Model Registry
export { ModelRegistryService } from './model-registry.service.js';
export type {
  Model,
  ModelVersion,
  ModelStage,
  ModelAlgorithm,
  StageTransition
} from './model-registry.service.js';
export { DatabaseModelRepository } from './repositories/database-model.repository.js';
export type { ModelRepository } from './repositories/model-repository.interface.js';

// Smart Scheduling (F3-03)
export { SmartSchedulingService } from './smart-scheduling.service.js';