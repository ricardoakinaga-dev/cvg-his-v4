import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../migrations');

export interface MigrationFile {
  readonly name: string;
  readonly path: string;
  readonly checksum: string;
}

/** Return the ordered migration source used by both migrations and preflight. */
export function getMigrationFiles(): MigrationFile[] {
  return readdirSync(migrationsFolder)
    .filter(
      (file) =>
        file.endsWith('.sql') &&
        !file.endsWith('.revert.sql') &&
        !file.endsWith('.seed.sql')
    )
    .sort()
    .map((file) => {
      const path = resolve(migrationsFolder, file);
      const sql = readFileSync(path, 'utf8');
      return {
        name: file.replace(/\.sql$/, ''),
        path,
        checksum: createHash('sha256').update(sql).digest('hex')
      };
    });
}
