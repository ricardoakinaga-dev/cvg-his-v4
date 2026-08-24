import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'packages/db/migrations/0127_scheduling_checkin_uniqueness.sql'
);

describe('scheduling check-in uniqueness migration contract', () => {
  it('allows only one active queue entry for an appointment', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('scheduling_queue_entries_active_appointment_unique');
    expect(sql).toContain('WHERE appointment_id IS NOT NULL');
    expect(sql).toContain("status NOT IN ('completed', 'cancelled')");
  });
});
