/**
 * Feature Repository Interface
 * F3-01: Feature Store - Repository abstraction layer
 */

import type { Feature, FeatureGroup, FeatureVector, FeatureValue, EntityType, CreateFeatureVector } from '../types.js';

export interface FeatureRepository {
  // Feature CRUD
  createFeature(feature: Omit<Feature, 'id' | 'createdAt' | 'updatedAt'>): Promise<Feature>;
  findFeatureById(id: string): Promise<Feature | null>;
  findFeaturesByGroup(group: string): Promise<Feature[]>;
  listFeatures(limit?: number, offset?: number): Promise<Feature[]>;
  updateFeature(id: string, data: Partial<Omit<Feature, 'id' | 'createdAt'>>): Promise<Feature>;
  deleteFeature(id: string): Promise<void>;

  // FeatureGroup CRUD
  createGroup(group: Omit<FeatureGroup, 'id' | 'createdAt'>): Promise<FeatureGroup>;
  findGroupById(id: string): Promise<FeatureGroup | null>;
  findGroupsByEntityType(entityType: EntityType): Promise<FeatureGroup[]>;
  listGroups(): Promise<FeatureGroup[]>;
  deleteGroup(id: string): Promise<void>;

  // FeatureVector CRUD
  createVector(vector: CreateFeatureVector): Promise<FeatureVector>;
  findVectorById(id: string): Promise<FeatureVector | null>;
  findVectorsByEntity(entityType: EntityType, entityId: string): Promise<FeatureVector[]>;
  listVectors(limit?: number, offset?: number): Promise<FeatureVector[]>;
  updateVector(id: string, data: Partial<Omit<FeatureVector, 'id' | 'createdAt'>>): Promise<FeatureVector>;
  deleteVector(id: string): Promise<void>;

  // FeatureValue operations
  upsertValue(value: Omit<FeatureValue, 'id'>): Promise<FeatureValue>;
  findValuesByEntity(featureId: string, entityId: string): Promise<FeatureValue[]>;
  findLatestValue(featureId: string, entityId: string): Promise<FeatureValue | null>;
}