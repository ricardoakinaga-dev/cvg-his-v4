/**
 * Model Repository - PostgreSQL implementation
 * F3-02: Model Registry - Database repository
 */

import type { ModelRepository } from './model-repository.interface.js';
import type { Model, ModelVersion, ModelStage } from '../model-registry.service.js';
import { getDatabaseClient } from '@cvg-his-v2/shared-database';
import { models, modelVersions } from '../schemas/index.js';
import { eq, and, desc, asc } from 'drizzle-orm';

function generateId(): string {
  return `model_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

type ModelRow = typeof models.$inferSelect;
type VersionRow = typeof modelVersions.$inferSelect;

export class DatabaseModelRepository implements ModelRepository {
  async createModel(model: Omit<Model, 'id' | 'currentVersion' | 'createdAt'>): Promise<Model> {
    const db = getDatabaseClient();
    const id = generateId();
    const now = new Date();

    const [created] = await db.insert(models).values({
      id,
      name: model.name,
      description: model.description ?? null,
      algorithm: model.algorithm,
      currentVersion: 1,
      createdAt: now
    }).returning();

    return this.mapToModel(created);
  }

  async findModelById(id: string): Promise<Model | null> {
    const db = getDatabaseClient();
    const [row] = await db.select().from(models).where(eq(models.id, id)).limit(1);
    return row ? this.mapToModel(row) : null;
  }

  async listModels(limit = 100, offset = 0): Promise<Model[]> {
    const db = getDatabaseClient();
    const rows = await db.select().from(models)
      .orderBy(asc(models.name))
      .limit(limit)
      .offset(offset);
    return rows.map(r => this.mapToModel(r));
  }

  async updateModel(id: string, data: Partial<Omit<Model, 'id' | 'createdAt'>>): Promise<Model> {
    const db = getDatabaseClient();
    const [updated] = await db.update(models)
      .set({
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        algorithm: data.algorithm ?? undefined,
        currentVersion: data.currentVersion ?? undefined
      })
      .where(eq(models.id, id))
      .returning();
    return this.mapToModel(updated);
  }

  async deleteModel(id: string): Promise<void> {
    const db = getDatabaseClient();
    await db.delete(models).where(eq(models.id, id));
  }

  async createVersion(version: Omit<ModelVersion, 'id' | 'stage' | 'metrics' | 'stageHistory' | 'createdAt'>): Promise<ModelVersion> {
    const db = getDatabaseClient();
    const id = generateId();
    const now = new Date();

    const [created] = await db.insert(modelVersions).values({
      id,
      modelId: version.modelId,
      version: version.version,
      stage: 'none',
      artifactUri: version.artifactUri ?? null,
      metrics: {},
      stageHistory: [],
      createdAt: now
    }).returning();

    return this.mapToVersion(created);
  }

  async findVersionById(id: string): Promise<ModelVersion | null> {
    const db = getDatabaseClient();
    const [row] = await db.select().from(modelVersions).where(eq(modelVersions.id, id)).limit(1);
    return row ? this.mapToVersion(row) : null;
  }

  async findVersionsByModelId(modelId: string): Promise<ModelVersion[]> {
    const db = getDatabaseClient();
    const rows = await db.select().from(modelVersions)
      .where(eq(modelVersions.modelId, modelId))
      .orderBy(desc(modelVersions.version));
    return rows.map(r => this.mapToVersion(r));
  }

  async findVersionByModelAndVersion(modelId: string, version: number): Promise<ModelVersion | null> {
    const db = getDatabaseClient();
    const [row] = await db.select().from(modelVersions)
      .where(and(eq(modelVersions.modelId, modelId), eq(modelVersions.version, version)))
      .limit(1);
    return row ? this.mapToVersion(row) : null;
  }

  async updateVersionStage(id: string, stage: ModelStage, by?: string): Promise<ModelVersion> {
    const db = getDatabaseClient();
    const current = await this.findVersionById(id);
    if (!current) throw new Error(`Version ${id} not found`);

    const historyEntry = { from: current.stage, to: stage, at: new Date().toISOString(), by };

    const [updated] = await db.update(modelVersions)
      .set({
        stage,
        stageHistory: [...(current.stageHistory ?? []), historyEntry]
      })
      .where(eq(modelVersions.id, id))
      .returning();

    return this.mapToVersion(updated);
  }

  async updateVersionMetrics(id: string, metrics: Record<string, number>): Promise<ModelVersion> {
    const db = getDatabaseClient();
    const [updated] = await db.update(modelVersions)
      .set({ metrics })
      .where(eq(modelVersions.id, id))
      .returning();
    return this.mapToVersion(updated);
  }

  private mapToModel(row: ModelRow): Model {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      algorithm: row.algorithm as Model['algorithm'],
      currentVersion: row.currentVersion,
      createdAt: row.createdAt.toISOString()
    };
  }

  private mapToVersion(row: VersionRow): ModelVersion {
    return {
      id: row.id,
      modelId: row.modelId,
      version: row.version,
      stage: row.stage as ModelStage,
      artifactUri: row.artifactUri ?? undefined,
      metrics: row.metrics as Record<string, number>,
      stageHistory: row.stageHistory as ModelVersion['stageHistory'],
      createdAt: row.createdAt.toISOString()
    };
  }
}