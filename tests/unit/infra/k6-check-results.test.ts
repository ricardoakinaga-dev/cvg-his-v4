import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  EXPECTED_CHECK_PATHS,
  evaluateChecks,
  extractChecks
} from '../../../benchmarks/k6/check-results.js';
import { createOpenApiPathsCheck } from '../../../benchmarks/k6/response-validation.js';

const root = resolve(import.meta.dirname, '../../..');
const completeChecks = () =>
  EXPECTED_CHECK_PATHS.map((path: string) => ({
    name: path.split('::').at(-1),
    path,
    passes: 1,
    fails: 0
  }));

describe('bounded OpenAPI response validation', () => {
  it('reuses only the last complete body and reparses every change', () => {
    const check = createOpenApiPathsCheck();
    const parse = vi.fn((body: string) => JSON.parse(body));
    const evaluate = (body: string) => check({ body, json: () => parse(body) });
    const first = '{"paths":{"/health":{}}}';
    expect(evaluate(first)).toBe(true);
    expect(evaluate(first)).toBe(true);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(evaluate(first + ' invalid')).toBe(false);
    expect(evaluate(first + ' invalid')).toBe(false);
    expect(parse).toHaveBeenCalledTimes(2);
    expect(evaluate('{"paths":null}')).toBe(false);
    expect(evaluate('{"paths":{}}')).toBe(false);
    expect(evaluate('')).toBe(false);
    expect(evaluate('')).toBe(false);
    expect(parse).toHaveBeenCalledTimes(5);
    expect(evaluate('{"paths":{"/ready":{}}}')).toBe(true);
    expect(evaluate(first)).toBe(true);
    // Returning to an earlier body parses again: this is not a growing map.
    expect(parse).toHaveBeenCalledTimes(7);
  });

  it('keeps VU caches separate and does not cache a non-string body', () => {
    const parse = vi.fn(() => ({ paths: { '/health': {} } }));
    const response = { body: '{"paths":{"/health":{}}}', json: parse };
    const firstVu = createOpenApiPathsCheck();
    const secondVu = createOpenApiPathsCheck();
    firstVu(response);
    firstVu(response);
    secondVu(response);
    expect(parse).toHaveBeenCalledTimes(2);
    firstVu({ body: null, json: parse });
    firstVu({ body: null, json: parse });
    firstVu(response);
    expect(parse).toHaveBeenCalledTimes(5);
  });
});

describe('k6 check evidence', () => {
  it('retains nested paths even when names repeat', () => {
    expect(
      extractChecks({
        checks: [{ name: 'same', path: '::same', passes: 2, fails: 0 }],
        groups: [
          {
            checks: [],
            groups: [
              {
                checks: [{ name: 'same', path: '::nested::same', passes: 1, fails: 3 }],
                groups: []
              }
            ]
          }
        ]
      })
    ).toEqual([
      { name: 'same', path: '::nested::same', passes: 1, fails: 3 },
      { name: 'same', path: '::same', passes: 2, fails: 0 }
    ]);
  });

  it('reconciles the raw counts without rounding away a failure', () => {
    const checks = completeChecks().map((check: object) => ({
      ...check,
      passes: 100_000,
      fails: 0
    }));
    checks[0].fails = 1;
    const result = evaluateChecks(checks, {
      passes: 1_600_000,
      fails: 1,
      rate: 1_600_000 / 1_600_001
    });
    expect(result).toMatchObject({ evidenceValid: true, allPassed: false, fails: 1 });
    expect(evaluateChecks(checks, { passes: 1_600_000, fails: 1, rate: 1 }).evidenceValid).toBe(
      false
    );
  });

  const cases = [
    ['valid', (data: any) => data, 0, 'Check gate: PASS'],
    [
      'failed check with passing SLOs',
      (data: any) => {
        data.checks[0].passes = 0;
        data.checks[0].fails = 1;
        data.metrics.checks = { passes: 15, fails: 1, rate: 15 / 16 };
        return data;
      },
      1,
      '15 passed, 1 failed'
    ],
    [
      'missing per-check evidence',
      (data: any) => {
        delete data.checks;
        return data;
      },
      1,
      'Missing per-check evidence'
    ],
    [
      'missing aggregate',
      (data: any) => {
        delete data.metrics.checks;
        return data;
      },
      1,
      'Missing or invalid aggregate'
    ],
    [
      'mismatched totals',
      (data: any) => {
        data.checks[0].passes++;
        return data;
      },
      1,
      'do not match aggregate'
    ],
    [
      'missing frozen check with reconciled counts',
      (data: any) => {
        data.checks.pop();
        data.metrics.checks.passes--;
        return data;
      },
      1,
      'Missing check:'
    ],
    [
      'duplicate path with reconciled counts',
      (data: any) => {
        data.checks.push(data.checks[0]);
        data.metrics.checks.passes++;
        return data;
      },
      1,
      'Duplicate check path:'
    ],
    [
      'invalid count',
      (data: any) => {
        data.checks[0].passes = '1';
        return data;
      },
      1,
      'Invalid check counts:'
    ],
    [
      'unsampled check',
      (data: any) => {
        data.checks[0].passes = 0;
        data.metrics.checks.passes--;
        return data;
      },
      1,
      'Unsampled check:'
    ],
    [
      'false aggregate rate',
      (data: any) => {
        data.metrics.checks.rate = 0.5;
        return data;
      },
      1,
      'rate does not match'
    ],
    [
      'unknown path',
      (data: any) => {
        data.checks[0].path = '::unknown';
        return data;
      },
      1,
      'Unknown check path:'
    ]
  ] as const;

  describe.each([false, true])('actual parser exit, markdown=%s', (markdown) => {
    it.each(cases)('%s', (_name, mutate, expectedCode, expectedOutput) => {
      const directory = mkdtempSync(join(tmpdir(), 'k6-parser-'));
      try {
        const path = join(directory, 'report.json');
        writeFileSync(
          path,
          JSON.stringify(
            mutate({
              timestamp: '2026-09-18T00:00:00Z',
              checks: completeChecks(),
              metrics: { checks: { passes: 16, fails: 0, rate: 1 } },
              slo: { _summary: { total: 9, passed: 9, failed: 0, allPassed: true } }
            })
          )
        );
        const result = spawnSync(
          process.execPath,
          [join(root, 'benchmarks/k6/parse-results.js'), path, ...(markdown ? ['--markdown'] : [])],
          { encoding: 'utf8' }
        );
        expect(result.status, result.stderr).toBe(expectedCode);
        expect(result.stdout).toContain(expectedOutput);
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    });
  });
});
