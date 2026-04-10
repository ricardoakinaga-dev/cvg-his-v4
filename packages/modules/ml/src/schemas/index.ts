/**
 * Feature Store Database Schema
 * F3-01: Feature Store - PostgreSQL schema for ML features
 */

import { pgTable, varchar, text, jsonb, timestamp, uuid, integer, numeric } from 'drizzle-orm/pg-core';

/**
 * Feature groups - categorize features by entity type
 */
export const featureGroups = pgTable('feature_groups', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // patient, appointment, inventory
  createdAt: timestamp('created_at').notNull()
});

/**
 * Individual ML features
 */
export const features = pgTable('features', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  groupId: varchar('group_id', { length: 255 }).notNull().references(() => featureGroups.id),
  dataType: varchar('data_type', { length: 20 }).notNull(), // number, string, boolean, timestamp
  description: text('description'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

/**
 * Feature vectors - aggregated feature sets for specific entities
 */
export const featureVectors = pgTable('feature_vectors', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  featureIds: jsonb('feature_ids').$type<string[]>().notNull(), // array of feature IDs
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

/**
 * Feature values - actual feature readings/values
 */
export const featureValues = pgTable('feature_values', {
  id: uuid('id').defaultRandom().primaryKey(),
  featureId: varchar('feature_id', { length: 255 }).notNull().references(() => features.id),
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  value: jsonb('value').notNull(), // flexible JSON for any value type
  timestamp: timestamp('timestamp').notNull()
});

/**
 * Model registry - track ML models and versions
 */
export const models = pgTable('models', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  algorithm: varchar('algorithm', { length: 50 }).notNull(), // regression, classification, forecasting
  currentVersion: integer('current_version').notNull().default(1),
  createdAt: timestamp('created_at').notNull()
});

/**
 * Model versions - individual model versions with metrics
 */
export const modelVersions = pgTable('model_versions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  modelId: varchar('model_id', { length: 255 }).notNull().references(() => models.id),
  version: integer('version').notNull(),
  stage: varchar('stage', { length: 20 }).notNull().default('none'), // none, staging, production, archived
  artifactUri: text('artifact_uri'),
  metrics: jsonb('metrics').$type<Record<string, number>>().default({}),
  stageHistory: jsonb('stage_history').$type<StageTransition[]>().default([]),
  createdAt: timestamp('created_at').notNull()
});

/**
 * Stage transition history for model versions
 */
export interface StageTransition {
  from: string;
  to: string;
  at: string;
  by?: string;
}

/**
 * Predictions - stored model predictions for auditing
 */
export const predictions = pgTable('predictions', {
  id: uuid('id').defaultRandom().primaryKey(),
  modelVersionId: varchar('model_version_id', { length: 255 }).notNull().references(() => modelVersions.id),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  inputFeatures: jsonb('input_features').$type<Record<string, unknown>>().notNull(),
  output: jsonb('output').notNull(),
  confidence: numeric('confidence', { precision: 5, scale: 4 }),
  createdAt: timestamp('created_at').notNull()
});