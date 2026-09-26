import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import { ERROR_CATALOG } from '../../../packages/shared/errors/src/catalog.js';
import { renderErrorCodeCatalogMarkdown } from '../../../scripts/lib/error-code-catalog-doc.mjs';

const root = resolve(import.meta.dirname, '../../..');

/** Tokens that look like codes but are domain enums, never error codes. */
const NON_ERROR_TOKENS = new Set(['CONS_CLIN']);

function emittedErrorCodes(): Map<string, Set<string>> {
  const files = execFileSync(
    'git',
    ['ls-files', 'apps/api/src', 'apps/worker/src', 'packages/modules', 'packages/shared'],
    { cwd: root, encoding: 'utf8' }
  )
    .split('\n')
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.includes('/dist/'));
  const found = new Map<string, Set<string>>();
  const add = (code: string, file: string) => {
    if (NON_ERROR_TOKENS.has(code)) return;
    const set = found.get(code) ?? new Set<string>();
    set.add(file);
    found.set(code, set);
  };
  for (const file of files) {
    const source = readFileSync(resolve(root, file), 'utf8');
    for (const match of source.matchAll(/new AppError\(\s*['"]([A-Z][A-Z0-9_]+)['"]/g)) add(match[1], file);
    for (const match of source.matchAll(/super\(\s*['"]([A-Z][A-Z0-9_]+)['"]/g)) add(match[1], file);
    for (const match of source.matchAll(/\bcode:\s*['"]([A-Z][A-Z0-9_]+)['"]/g)) {
      const code = match[1];
      if (code.includes('_') || ['UNAUTHORIZED', 'FORBIDDEN', 'CONFLICT'].includes(code)) add(code, file);
    }
  }
  return found;
}

describe('every error code the API emits is catalogued (R2-UX-01)', () => {
  it('finds no code in the sources that is missing from ERROR_CATALOG', () => {
    const emitted = emittedErrorCodes();
    expect(emitted.size).toBeGreaterThan(100);
    const missing = [...emitted.entries()]
      .filter(([code]) => !(code in ERROR_CATALOG))
      .map(([code, files]) => `${code} (${[...files].join(', ')})`);
    expect(missing, `add these codes to packages/shared/errors/src/catalog.ts:\n${missing.join('\n')}`).toEqual([]);
  });

  it('keeps docs/engineering/API_ERROR_CODES.md in sync with the catalog', () => {
    const rendered = renderErrorCodeCatalogMarkdown(ERROR_CATALOG);
    const committed = readFileSync(resolve(root, 'docs/engineering/API_ERROR_CODES.md'), 'utf8');
    expect(committed, 'run: node scripts/generate-error-code-catalog-doc.mjs').toBe(rendered);
  });
});
