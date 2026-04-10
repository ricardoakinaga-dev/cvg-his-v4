/**
 * Feature Store Service - Main service for ML feature management
 * F3-01: Feature Store - Service layer
 */

import type { FeatureRepository } from './repositories/feature-repository.interface.js';
import type {
  Feature,
  FeatureGroup,
  FeatureVector,
  EntityType,
  FeatureStoreConfig,
  CreateFeatureVector
} from './types.js';
import { DEFAULT_CONFIG } from './types.js';

export class FeatureStoreService {
  private repository: FeatureRepository;
  private config: FeatureStoreConfig;

  constructor(repository: FeatureRepository, config: Partial<FeatureStoreConfig> = {}) {
    this.repository = repository;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  // Feature operations
  async createFeature(data: {
    name: string;
    group: string;
    dataType: Feature['dataType'];
    description?: string;
  }): Promise<Feature> {
    return this.repository.createFeature(data);
  }

  async getFeature(id: string): Promise<Feature | null> {
    return this.repository.findFeatureById(id);
  }

  async listFeatures(limit?: number, offset?: number): Promise<Feature[]> {
    return this.repository.listFeatures(limit, offset);
  }

  async updateFeature(id: string, data: Partial<Omit<Feature, 'id' | 'createdAt'>>): Promise<Feature> {
    return this.repository.updateFeature(id, data);
  }

  async deleteFeature(id: string): Promise<void> {
    return this.repository.deleteFeature(id);
  }

  // Group operations
  async createGroup(data: {
    name: string;
    entityType: EntityType;
    description?: string;
  }): Promise<FeatureGroup> {
    return this.repository.createGroup(data);
  }

  async getGroup(id: string): Promise<FeatureGroup | null> {
    return this.repository.findGroupById(id);
  }

  async listGroups(): Promise<FeatureGroup[]> {
    return this.repository.listGroups();
  }

  async getGroupsByEntityType(entityType: EntityType): Promise<FeatureGroup[]> {
    return this.repository.findGroupsByEntityType(entityType);
  }

  async deleteGroup(id: string): Promise<void> {
    return this.repository.deleteGroup(id);
  }

  // Vector operations
  async createVector(data: {
    name: string;
    features: readonly string[];
    entityType: EntityType;
    entityId: string;
  }): Promise<FeatureVector> {
    return this.repository.createVector(data);
  }

  async getVector(id: string): Promise<FeatureVector | null> {
    return this.repository.findVectorById(id);
  }

  async getVectorsForEntity(entityType: EntityType, entityId: string): Promise<FeatureVector[]> {
    return this.repository.findVectorsByEntity(entityType, entityId);
  }

  async updateVector(id: string, data: Partial<Omit<FeatureVector, 'id' | 'createdAt'>>): Promise<FeatureVector> {
    return this.repository.updateVector(id, data);
  }

  async deleteVector(id: string): Promise<void> {
    return this.repository.deleteVector(id);
  }

  // Value operations
  async recordValue(data: {
    featureId: string;
    entityId: string;
    value: unknown;
    timestamp?: string;
  }): Promise<void> {
    await this.repository.upsertValue({
      featureId: data.featureId,
      entityId: data.entityId,
      value: data.value,
      timestamp: data.timestamp ?? new Date().toISOString()
    });
  }

  async getLatestValue(featureId: string, entityId: string): Promise<unknown> {
    const value = await this.repository.findLatestValue(featureId, entityId);
    return value?.value ?? null;
  }

  async getFeatureHistory(featureId: string, entityId: string): Promise<unknown[]> {
    const values = await this.repository.findValuesByEntity(featureId, entityId);
    return values.map(v => v.value);
  }

  // Aggregation operations
  async aggregateFeatures(entityType: EntityType, entityId: string, featureIds: string[]): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};

    for (const featureId of featureIds) {
      const latest = await this.repository.findLatestValue(featureId, entityId);
      if (latest) {
        result[featureId] = latest.value;
      }
    }

    return result;
  }

  // Bulk operations
  async bulkRecordValues(data: Array<{
    featureId: string;
    entityId: string;
    value: unknown;
    timestamp?: string;
  }>): Promise<void> {
    const timestamp = new Date().toISOString();
    await Promise.all(
      data.map(d => this.repository.upsertValue({
        featureId: d.featureId,
        entityId: d.entityId,
        value: d.value,
        timestamp: d.timestamp ?? timestamp
      }))
    );
  }
}