export interface TestDbResult {
  tables: number;
  enums: number;
  fks: number;
}

export async function verifyIntegrity(): Promise<{
  ok: boolean;
  issues: string[];
  stats: TestDbResult;
}> {
  const { verifySchema } = await import('./db-schema.js');
  const stats = await verifySchema();
  const issues: string[] = [];

  if (stats.tables < 30) {
    issues.push(`Expected >= 30 tables, found ${stats.tables}`);
  }
  if (stats.enums < 20) {
    issues.push(`Expected >= 20 enum types, found ${stats.enums}`);
  }
  if (stats.fks < 20) {
    issues.push(`Expected >= 20 foreign keys, found ${stats.fks}`);
  }

  return { ok: issues.length === 0, issues, stats };
}
