import { describe, it, expect } from 'vitest';
import { verifyIntegrity } from '../db/db-integrity.js';

describe('Database Schema', () => {
  it('should have minimum expected tables', async () => {
    const { ok, issues, stats } = await verifyIntegrity();
    expect(stats.tables).toBeGreaterThanOrEqual(30);
    if (!ok) {
      console.warn('Schema integrity issues:', issues);
    }
  });

  it('should have minimum expected enum types', async () => {
    const { stats } = await verifyIntegrity();
    expect(stats.enums).toBeGreaterThanOrEqual(20);
  });

  it('should have minimum expected foreign keys', async () => {
    const { stats } = await verifyIntegrity();
    expect(stats.fks).toBeGreaterThanOrEqual(20);
  });
});
