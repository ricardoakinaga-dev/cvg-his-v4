import { getTestPool } from '../db/db-admin.js';

/**
 * UUID v4 generator for test data.
 * Uses crypto.randomUUID when available, falls back to Math.random.
 */
export function uuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Execute a query on the test pool and return the first row.
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const pool = getTestPool();
  const { rows } = await pool.query(sql, params);
  return (rows[0] as T) ?? null;
}

/**
 * Execute a query on the test pool and return all rows.
 */
export async function queryMany<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const pool = getTestPool();
  const { rows } = await pool.query(sql, params);
  return rows as T[];
}

/**
 * Execute a query and return the inserted row (with RETURNING).
 */
export async function insertOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T> {
  const pool = getTestPool();
  const { rows } = await pool.query(sql, params);
  if (rows.length === 0) throw new Error('INSERT returned no rows');
  return rows[0] as T;
}

export interface CreatedEntity {
  table: string;
  id: string;
}

/**
 * Registry for cleanup of created test entities.
 */
export class CleanupRegistry {
  private entities: CreatedEntity[] = [];

  register(table: string, id: string): void {
    this.entities.push({ table, id });
  }

  async cleanup(): Promise<void> {
    if (this.entities.length === 0) return;
    const pool = getTestPool();
    const tables = [...new Set(this.entities.map((e) => e.table))].reverse();
    for (const table of tables) {
      const ids = this.entities.filter((e) => e.table === table).map((e) => e.id);
      if (ids.length > 0) {
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
        await pool.query(`DELETE FROM ${table} WHERE id IN (${placeholders})`, ids);
      }
    }
    this.entities = [];
  }

  reset(): void {
    this.entities = [];
  }
}

export const cleanupRegistry = new CleanupRegistry();
