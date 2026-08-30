import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const restoreScript = readFileSync(resolve(root, 'infra/scripts/restore-drill-v2.sh'), 'utf8');

describe('restore drill timing evidence', () => {
  it('emits total and phase duration fields in the persisted report', () => {
    expect(restoreScript).toContain('DRILL_STARTED_AT=');
    expect(restoreScript).toContain('DRILL_ELAPSED_MS=');
    expect(restoreScript).toContain('"elapsedMs": $DRILL_ELAPSED_MS');
    expect(restoreScript).toContain('"elapsedSeconds":');
    expect(restoreScript).toContain('"phaseDurationsMs"');
    expect(restoreScript).toContain('"checksumValidation": $CHECKSUM_VALIDATION_MS');
    expect(restoreScript).toContain('"databaseRestore": $DATABASE_RESTORE_MS');
    expect(restoreScript).toContain('"storageRestore": $STORAGE_RESTORE_MS');
  });
});
