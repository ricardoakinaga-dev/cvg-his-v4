/**
 * Feature Repository - PostgreSQL implementation
 * F3-01: Feature Store - Database repository
 */

import type { FeatureRepository } from './feature-repository.interface.js';
import type { Feature, FeatureGroup, FeatureVector, FeatureValue, EntityType, CreateFeatureVector } from '../types.js';
import { getDatabaseClient } from '@cvg-his-v2/shared-database';
import { features, featureGroups, featureVectors, featureValues } from '../schemas/index.js';
import { eq, and, desc, asc } from 'drizzle-orm';

function generateId(): string {
  return `feat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

type FeatureRow = typeof features.$inferSelect;
type GroupRow = typeof featureGroups.$inferSelect;
type VectorRow = typeof featureVectors.$inferSelect;
type ValueRow = typeof featureValues.$inferSelect;

export class DatabaseFeatureRepository implements FeatureRepository {
  async createFeature(feature: Omit<Feature, 'id' | 'createdAt' | 'updatedAt'>): Promise<Feature> {
    const db = getDatabaseClient();
    const id = generateId();
    const now = new Date();

    const [created] = await db.insert(features).values({
      id,
      name: feature.name,
      groupId: feature.group,
      dataType: feature.dataType,
      description: feature.description ?? null,
      createdAt: now,
      updatedAt: now
    }).returning();

    return this.mapToFeature(created);
  }

  async findFeatureById(id: string): Promise<Feature | null> {
    const db = getDatabaseClient();
    const [row] = await db.select().from(features).where(eq(features.id, id)).limit(1);
    return row ? this.mapToFeature(row) : null;
  }

  async findFeaturesByGroup(group: string): Promise<Feature[]> {
    const db = getDatabaseClient();
    const rows = await db.select().from(features).where(eq(features.groupId, group));
    return rows.map(r => this.mapToFeature(r));
  }

  async listFeatures(limit = 100, offset = 0): Promise<Feature[]> {
    const db = getDatabaseClient();
    const rows = await db.select().from(features)
      .orderBy(asc(features.name))
      .limit(limit)
      .offset(offset);
    return rows.map(r => this.mapToFeature(r));
  }

  async updateFeature(id: string, data: Partial<Omit<Feature, 'id' | 'createdAt'>>): Promise<Feature> {
    const db = getDatabaseClient();
    const [updated] = await db.update(features)
      .set({
        name: data.name ?? undefined,
        groupId: data.group ?? undefined,
        dataType: data.dataType ?? undefined,
        description: data.description ?? undefined,
        updatedAt: new Date()
      })
      .where(eq(features.id, id))
      .returning();
    return this.mapToFeature(updated);
  }

  async deleteFeature(id: string): Promise<void> {
    const db = getDatabaseClient();
    await db.delete(features).where(eq(features.id, id));
  }

  async createGroup(group: Omit<FeatureGroup, 'id' | 'createdAt'>): Promise<FeatureGroup> {
    const db = getDatabaseClient();
    const id = generateId();
    const now = new Date();

    const [created] = await db.insert(featureGroups).values({
      id,
      name: group.name,
      description: group.description ?? null,
      entityType: group.entityType,
      createdAt: now
    }).returning();

    return this.mapToGroup(created);
  }

  async findGroupById(id: string): Promise<FeatureGroup | null> {
    const db = getDatabaseClient();
    const [row] = await db.select().from(featureGroups).where(eq(featureGroups.id, id)).limit(1);
    return row ? this.mapToGroup(row) : null;
  }

  async findGroupsByEntityType(entityType: EntityType): Promise<FeatureGroup[]> {
    const db = getDatabaseClient();
    const rows = await db.select().from(featureGroups).where(eq(featureGroups.entityType, entityType));
    return rows.map(r => this.mapToGroup(r));
  }

  async listGroups(): Promise<FeatureGroup[]> {
    const db = getDatabaseClient();
    const rows = await db.select().from(featureGroups);
    return rows.map(r => this.mapToGroup(r));
  }

  async deleteGroup(id: string): Promise<void> {
    const db = getDatabaseClient();
    await db.delete(featureGroups).where(eq(featureGroups.id, id));
  }

  async createVector(vector: CreateFeatureVector): Promise<FeatureVector> {
    const db = getDatabaseClient();
    const id = generateId();
    const now = new Date();

    const [created] = await db.insert(featureVectors).values({
      id,
      name: vector.name,
      featureIds: [...vector.features],
      entityType: vector.entityType,
      entityId: vector.entityId,
      createdAt: now,
      updatedAt: now
    }).returning();

    return this.mapToVector(created);
  }

  async findVectorById(id: string): Promise<FeatureVector | null> {
    const db = getDatabaseClient();
    const [row] = await db.select().from(featureVectors).where(eq(featureVectors.id, id)).limit(1);
    return row ? this.mapToVector(row) : null;
  }

  async findVectorsByEntity(entityType: EntityType, entityId: string): Promise<FeatureVector[]> {
    const db = getDatabaseClient();
    const rows = await db.select().from(featureVectors)
      .where(and(eq(featureVectors.entityType, entityType), eq(featureVectors.entityId, entityId)));
    return rows.map(r => this.mapToVector(r));
  }

  async listVectors(limit = 100, offset = 0): Promise<FeatureVector[]> {
    const db = getDatabaseClient();
    const rows = await db.select().from(featureVectors)
      .orderBy(desc(featureVectors.createdAt))
      .limit(limit)
      .offset(offset);
    return rows.map(r => this.mapToVector(r));
  }

  async updateVector(id: string, data: Partial<Omit<FeatureVector, 'id' | 'createdAt'>>): Promise<FeatureVector> {
    const db = getDatabaseClient();
    const [updated] = await db.update(featureVectors)
      .set({
        name: data.name ?? undefined,
        featureIds: data.features ? [...data.features] : undefined,
        entityType: data.entityType ?? undefined,
        entityId: data.entityId ?? undefined,
        updatedAt: new Date()
      })
      .where(eq(featureVectors.id, id))
      .returning();
    return this.mapToVector(updated);
  }

  async deleteVector(id: string): Promise<void> {
    const db = getDatabaseClient();
    await db.delete(featureVectors).where(eq(featureVectors.id, id));
  }

  async upsertValue(value: Omit<FeatureValue, 'id'>): Promise<FeatureValue> {
    const db = getDatabaseClient();
    const id = generateId();

    const [created] = await db.insert(featureValues).values({
      id,
      featureId: value.featureId,
      entityId: value.entityId,
      value: value.value,
      timestamp: new Date(value.timestamp)
    }).returning();

    return this.mapToValue(created);
  }

  async findValuesByEntity(featureId: string, entityId: string): Promise<FeatureValue[]> {
    const db = getDatabaseClient();
    const rows = await db.select().from(featureValues)
      .where(and(eq(featureValues.featureId, featureId), eq(featureValues.entityId, entityId)))
      .orderBy(desc(featureValues.timestamp));
    return rows.map(r => this.mapToValue(r));
  }

  async findLatestValue(featureId: string, entityId: string): Promise<FeatureValue | null> {
    const db = getDatabaseClient();
    const [row] = await db.select().from(featureValues)
      .where(and(eq(featureValues.featureId, featureId), eq(featureValues.entityId, entityId)))
      .orderBy(desc(featureValues.timestamp))
      .limit(1);
    return row ? this.mapToValue(row) : null;
  }

  private mapToFeature(row: FeatureRow): Feature {
    return {
      id: row.id,
      name: row.name,
      group: row.groupId,
      dataType: row.dataType as Feature['dataType'],
      description: row.description ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  private mapToGroup(row: GroupRow): FeatureGroup {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      entityType: row.entityType as EntityType,
      createdAt: row.createdAt.toISOString()
    };
  }

  private mapToVector(row: VectorRow): FeatureVector {
    return {
      id: row.id,
      name: row.name,
      features: row.featureIds ?? [],
      entityType: row.entityType as EntityType,
      entityId: row.entityId,
      values: {},
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  private mapToValue(row: ValueRow): FeatureValue {
    return {
      id: row.id,
      featureId: row.featureId,
      entityId: row.entityId,
      value: row.value,
      timestamp: row.timestamp.toISOString()
    };
  }
}