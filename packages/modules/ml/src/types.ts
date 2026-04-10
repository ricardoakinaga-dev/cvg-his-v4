/**
 * Feature Store - Types for ML Feature Management
 * F3-01: Feature Store implementation for CVG-HIS-V2
 */

export type FeatureDataType = 'number' | 'string' | 'boolean' | 'timestamp';
export type EntityType = 'patient' | 'appointment' | 'inventory';

export interface Feature {
  id: string;
  name: string;
  group: string;
  dataType: FeatureDataType;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureGroup {
  id: string;
  name: string;
  description?: string;
  entityType: EntityType;
  createdAt: string;
}

export interface FeatureVector {
  id: string;
  name: string;
  features: readonly string[]; // feature IDs
  entityType: EntityType;
  entityId: string;
  values: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeatureVector {
  name: string;
  features: readonly string[];
  entityType: EntityType;
  entityId: string;
}

export interface FeatureValue {
  id: string;
  featureId: string;
  entityId: string;
  value: unknown;
  timestamp: string;
}

export interface FeatureStoreConfig {
  enabled: boolean;
  postgresEnabled: boolean;
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
}

export const DEFAULT_CONFIG: FeatureStoreConfig = {
  enabled: true,
  postgresEnabled: true,
  cacheEnabled: false,
  cacheTtlSeconds: 300,
};