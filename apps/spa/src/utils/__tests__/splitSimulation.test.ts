import { describe, expect, it } from 'vitest';
import { calculateSplit, type SplitSimulationInput } from '../splitSimulation';

const example: SplitSimulationInput = {
  amount: '1000', installments: '1', mdrPercent: '3', clinicPercent: '85', platformPercent: '15'
};
const calculate = (changes: Partial<SplitSimulationInput> = {}) => calculateSplit({ ...example, ...changes });

describe('calculateSplit', () => {
  it('calculates the editable example in cents', () => {
    expect(calculate()).toEqual({ ok: true, grossCents: 100000, feeCents: 3000, netCents: 97000,
      clinicCents: 82450, platformCents: 14550, installments: 1, clinicPercent: 85, platformPercent: 15 });
    expect(calculate({ amount: '200' })).toMatchObject({ ok: true, grossCents: 20000, feeCents: 600,
      netCents: 19400, clinicCents: 16490, platformCents: 2910 });
  });

  it.each([
    ['0.01', '0', 0, 1, 1, 0],
    ['0.03', '50', 2, 1, 1, 0],
    ['0.03', '0', 0, 3, 2, 1]
  ])('preserves every cent for %s with %s%% MDR', (amount, mdrPercent, feeCents, netCents, clinicCents, platformCents) => {
    const result = calculate({ amount: String(amount), mdrPercent: String(mdrPercent), clinicPercent: '50', platformPercent: '50' });
    expect(result).toMatchObject({ ok: true, feeCents, netCents, clinicCents, platformCents });
    if (!result.ok) throw new Error(result.error);
    expect(result.clinicCents + result.platformCents).toBe(result.netCents);
    expect(result.feeCents + result.netCents).toBe(result.grossCents);
  });

  it.each([
    { amount: '0' },
    { mdrPercent: '100' }
  ])('preserves genuine zero results for %j', (changes) => {
    expect(calculate(changes)).toMatchObject({ ok: true, netCents: 0, clinicCents: 0, platformCents: 0 });
  });

  it.each([
    ['0', '100', 0, 97000], ['100', '0', 97000, 0]
  ])('supports %s/%s allocation without omitting zero shares', (clinicPercent, platformPercent, clinicCents, platformCents) => {
    expect(calculate({ clinicPercent: String(clinicPercent), platformPercent: String(platformPercent) }))
      .toMatchObject({ ok: true, clinicCents, platformCents });
  });

  it('keeps large realistic amounts and decimal percentages exact in cents', () => {
    const result = calculate({ amount: '1234567.89', mdrPercent: '2.99', clinicPercent: '87.65', platformPercent: '12.35', installments: '12' });
    expect(result).toMatchObject({ ok: true, grossCents: 123456789, feeCents: 3691358, netCents: 119765431, installments: 12 });
    if (!result.ok) throw new Error(result.error);
    expect(result.clinicCents + result.platformCents).toBe(result.netCents);
    expect(result.feeCents + result.netCents).toBe(result.grossCents);
    expect(Number.isInteger(result.clinicCents)).toBe(true);
    expect(Number.isInteger(result.platformCents)).toBe(true);
  });

  it('accepts the exact safe-cent boundary without rounding up its input', () => {
    const result = calculate({ amount: '90071992547409.91' });
    expect(result).toMatchObject({ ok: true, grossCents: Number.MAX_SAFE_INTEGER });
    if (!result.ok) throw new Error(result.error);
    expect(result.clinicCents + result.platformCents).toBe(result.netCents);
    expect(result.feeCents + result.netCents).toBe(result.grossCents);
    expect(calculate({ amount: '90071992547409.92' })).toMatchObject({ ok: false });
  });

  it.each<Partial<SplitSimulationInput>>([
    { amount: '' }, { amount: '  ' }, { amount: 'NaN' }, { amount: 'Infinity' },
    { amount: '-1' }, { amount: '1.001' }, { amount: '90071992547410' }, { amount: '1e3' },
    { installments: '' }, { installments: '0' }, { installments: '1.5' }, { installments: '-2' },
    { installments: '9007199254740992' },
    { mdrPercent: '' }, { mdrPercent: '101' }, { mdrPercent: '-1' }, { mdrPercent: '0.001' },
    { clinicPercent: '' }, { clinicPercent: '101', platformPercent: '-1' },
    { clinicPercent: '85.001', platformPercent: '14.999' },
    { platformPercent: 'Infinity' }, { platformPercent: '101' },
    { clinicPercent: '84', platformPercent: '15' }, { clinicPercent: '86', platformPercent: '15' }
  ])('rejects invalid inputs without clamping or mutating them: %j', (changes) => {
    const input = { ...example, ...changes };
    const original = { ...input };
    expect(calculateSplit(input)).toMatchObject({ ok: false, error: expect.any(String) });
    expect(input).toEqual(original);
  });
});
