import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const workflow = readFileSync(resolve(root, '.github/workflows/critical-soak.yml'), 'utf8');

describe('critical soak workflow contract', () => {
  it('pins a full main SHA and requires a clean checkout', () => {
    expect(workflow).toContain("grep -Eq '^[0-9a-f]{40}$'");
    expect(workflow).toContain('ref: ${{ inputs.release_sha }}');
    expect(workflow).toContain('git merge-base --is-ancestor "${REQUESTED_SHA}" origin/main');
    expect(workflow).toContain("CRITICAL_SOAK_REQUIRE_CLEAN: '1'");
  });

  it('runs exactly 20 times and retains every attempt without retry configuration', () => {
    expect(workflow).toContain("CRITICAL_SOAK_RUNS: '20'");
    expect(workflow).toContain("CRITICAL_SOAK_REQUIRE_20: '1'");
    expect(workflow).toContain('pnpm test:critical:soak');
    expect(workflow).toContain('export DATABASE_URL_TEST="${database_url}"');
    expect(workflow).toContain('path: artifacts/critical-soak/');
    expect(workflow).not.toMatch(/^\s+retry:/m);
    expect(workflow).not.toMatch(/^\s+max-attempts:/m);
  });
});
