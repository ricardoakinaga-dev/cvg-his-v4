import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  checkComplexityHotspots,
  countPhysicalLines,
} from '../../../scripts/check-complexity-hotspots.mjs';

const repositoryRoot = resolve(import.meta.dirname, '../../..');

describe('complexity hotspot budget', () => {
  it('keeps the repository hotspots within their frozen line budgets', () => {
    expect(checkComplexityHotspots({ rootDir: repositoryRoot })).toEqual([]);
  });

  it('counts files consistently with wc -l when they end in a newline', () => {
    expect(countPhysicalLines('one\ntwo\nthree\n')).toBe(3);
    expect(countPhysicalLines('one\ntwo')).toBe(2);
  });

  it('fails when a hotspot grows or loses ownership metadata', () => {
    const rootDir = mkdtempSync(resolve(tmpdir(), 'cvg-complexity-'));
    mkdirSync(resolve(rootDir, 'docs/engineering'), { recursive: true });
    mkdirSync(resolve(rootDir, 'src'), { recursive: true });
    writeFileSync(resolve(rootDir, 'src/hotspot.ts'), 'one\ntwo\nthree\n');
    writeFileSync(
      resolve(rootDir, 'docs/engineering/complexity-hotspots.json'),
      JSON.stringify({
        schema_version: 1,
        measurement: 'physical_lines_including_blanks',
        hotspots: [
          {
            path: 'src/hotspot.ts',
            owner: '',
            max_lines: 2,
            decomposition_plan: 'Extract responsibilities.',
          },
        ],
      })
    );

    expect(checkComplexityHotspots({ rootDir })).toEqual([
      'src/hotspot.ts: 3 linhas excedem o limite 2',
      'src/hotspot.ts: owner ausente',
    ]);
  });
});
