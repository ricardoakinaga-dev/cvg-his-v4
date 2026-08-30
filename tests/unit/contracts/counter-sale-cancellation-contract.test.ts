import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';

import { counterSalesContract } from '../../../packages/contracts/src/counterSales.js';

const openApi = parseYaml(
  readFileSync(resolve(import.meta.dirname, '../../../apps/api/src/openapi.yaml'), 'utf8')
) as {
  components: {
    schemas: Record<string, { properties?: Record<string, { pattern?: string }> }>;
  };
};

describe('counter-sale cancellation contract', () => {
  it('requires exactly a trimmed reason with a bounded length', () => {
    const cancel = counterSalesContract.cancel as typeof counterSalesContract.cancel & {
      body: { safeParse(value: unknown): { success: boolean; data?: { reason: string } } };
    };

    expect(cancel.body.safeParse({}).success).toBe(false);
    expect(cancel.body.safeParse({ reason: '   ' }).success).toBe(false);
    expect(cancel.body.safeParse({ reason: ' Cliente desistiu ' })).toEqual({
      success: true,
      data: { reason: 'Cliente desistiu' }
    });
    expect(cancel.body.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false);
    expect(cancel.body.safeParse({ reason: 'Cliente\n desistiu' }).success).toBe(false);
    expect(cancel.body.safeParse({ reason: 'Cliente desistiu\n' }).success).toBe(false);
    expect(cancel.body.safeParse({ reason: 'ok', control: true }).success).toBe(false);
    expect(cancel.headers.safeParse({ 'idempotency-key': 'cancel-1' }).success).toBe(true);
    expect(cancel.headers.safeParse({}).success).toBe(false);
  });

  it('keeps the OpenAPI reason pattern effective against control characters', () => {
    for (const schemaName of ['CancelCounterSaleRequest', 'CounterSaleCancellationHistory']) {
      const pattern = openApi.components.schemas[schemaName]?.properties?.reason?.pattern;
      expect(pattern).toBeDefined();
      const reasonPattern = new RegExp(pattern as string);
      expect(reasonPattern.test('valid reason')).toBe(true);
      expect(reasonPattern.test('invalid\nreason')).toBe(false);
      expect(reasonPattern.test(`invalid${String.fromCharCode(0)}reason`)).toBe(false);
    }
  });
});
