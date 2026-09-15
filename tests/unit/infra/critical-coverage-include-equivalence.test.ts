import { createRequire } from 'node:module';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CRITICAL_COVERAGE_UNSAFE_GLOB_CHARS,
  buildCriticalCoverageInclude
} from '../../../scripts/lib/critical-coverage-include.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const manifest = JSON.parse(
  readFileSync(resolve(root, 'docs/engineering/critical-coverage-scope.json'), 'utf8')
);
const coverageSources = manifest.files
  .filter((file: { applicability: string }) => file.applicability === 'javascript-metrics')
  .map((file: { path: string }) => file.path);
const coverageExclude = ['**/*.test.ts', '**/*.d.ts', '**/node_modules/**', '**/dist/**'];
const globOptions = { cwd: root, ignore: coverageExclude, absolute: true, dot: true, onlyFiles: true };

const requireFromTest = createRequire(import.meta.url);
const requireFromVitest = createRequire(requireFromTest.resolve('vitest/package.json'));
const { glob } = requireFromVitest('tinyglobby') as { glob: (patterns: string | string[], options: typeof globOptions) => Promise<string[]> };
const picomatch = requireFromVitest('picomatch') as {
  isMatch: (input: string, patterns: string | string[], options: Record<string, unknown>) => boolean;
};

const normalized = (files: string[]) => files.map((file) => file.split('\\').join('/')).sort();

describe('critical coverage include equivalence', () => {
  it('builds a brace pattern that round-trips to exactly the manifest source set', () => {
    const pattern = buildCriticalCoverageInclude(coverageSources);
    expect(pattern.startsWith('{')).toBe(true);
    expect(pattern.endsWith('}')).toBe(true);
    const roundTripped = pattern.slice(1, -1).split(',');
    expect(roundTripped).toEqual(coverageSources);
    expect(new Set(roundTripped).size).toBe(coverageSources.length);
  });

  it('rejects paths that would break or broaden the brace pattern', () => {
    const expectedUnsafeChars = [',', '{', '}', '[', ']', '(', ')', '!', '?', '*', '@', '+', '|'];
    expect(CRITICAL_COVERAGE_UNSAFE_GLOB_CHARS).toEqual(expectedUnsafeChars);
    for (const char of expectedUnsafeChars) {
      expect(() => buildCriticalCoverageInclude([`packages/demo/src/a${char}b.ts`])).toThrow(
        /unsupported glob character/
      );
    }
    expect(() => buildCriticalCoverageInclude([])).toThrow(/at least one source path/);
    expect(() => buildCriticalCoverageInclude(['packages/demo/src/a.ts', 'packages/demo/src/a.ts'])).toThrow(
      /duplicate critical coverage include path/
    );
  });

  it('keeps every manifest source on disk without duplicates', () => {
    expect(coverageSources.length).toBeGreaterThan(0);
    expect(new Set(coverageSources).size).toBe(coverageSources.length);
    for (const source of coverageSources) {
      expect(statSync(resolve(root, source)).isFile()).toBe(true);
    }
  });

  it('selects the same set through the 348 individual patterns and the brace pattern', async () => {
    const pattern = buildCriticalCoverageInclude(coverageSources);
    const byPatterns = normalized(await glob(coverageSources, globOptions));
    const byBrace = normalized(await glob(pattern, globOptions));
    const expected = normalized(coverageSources.map((source: string) => resolve(root, source)));
    expect(byBrace).toEqual(byPatterns);
    expect(byPatterns).toEqual(expected);
  });

  it('matches the same candidates through picomatch in both representations', async () => {
    const pattern = buildCriticalCoverageInclude(coverageSources);
    const parents = [...new Set(coverageSources.map((source: string) => dirname(source)))];
    const candidates = normalized(
      await glob(
        parents.map((parent) => `${parent}/**/*.{ts,tsx,js,mjs,cjs}`),
        globOptions
      )
    );
    expect(candidates.length).toBeGreaterThan(coverageSources.length);
    const divergences: string[] = [];
    let braceMatches = 0;
    for (const candidate of candidates) {
      const byPatterns = picomatch.isMatch(candidate, coverageSources, {
        contains: true,
        dot: true,
        ignore: coverageExclude
      });
      const byBrace = picomatch.isMatch(candidate, pattern, {
        contains: true,
        dot: true,
        ignore: coverageExclude
      });
      if (byBrace) braceMatches++;
      if (byPatterns !== byBrace) divergences.push(candidate);
    }
    expect(divergences).toEqual([]);
    expect(braceMatches).toBe(coverageSources.length);
  });

  it('keeps the critical coverage config wired to the canonical builder', () => {
    const config = readFileSync(resolve(root, 'vitest.critical-coverage.config.ts'), 'utf8');
    expect(config).toContain("from './scripts/lib/critical-coverage-include.mjs'");
    expect(config).toContain('buildCriticalCoverageInclude(coverageSources)');
    expect(config).toContain('include: coverageInclude,');
    expect(config).not.toContain('coverageIncludeSinglePattern');
  });
});
