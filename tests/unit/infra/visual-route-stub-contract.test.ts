import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const visualSpec = readFileSync(resolve(root, 'e2e/spa/visual/visual-regression.spec.ts'), 'utf8');

describe('visual route stubs', () => {
  it('matches the API-prefixed paths emitted by the SPA client', () => {
    expect(visualSpec).toContain('const targetPath = normalizedPath(path);');
    expect(visualSpec).toContain('const apiPath = normalizedPath(`/api${targetPath}`);');
    expect(visualSpec).toContain('requestPath === targetPath || requestPath === apiPath');
  });
});
