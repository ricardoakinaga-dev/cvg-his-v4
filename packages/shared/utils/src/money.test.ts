import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MoneyError,
  addAmounts,
  amountsEqual,
  fromCents,
  multiplyAmount,
  roundAmount,
  subtractAmounts,
  sumAmounts,
  toCents
} from './money.js';

/** Deterministic pseudo-random generator so failures are reproducible. */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const randomCents = (next: () => number, max = 10_000_000) => Math.floor(next() * max) - Math.floor(max / 4);

describe('money in integer cents (R2-FIN-01)', () => {
  it('converts decimal amounts to cents without binary noise', () => {
    assert.equal(toCents(1.005), 101);
    assert.equal(toCents(0.1 + 0.2), 30);
    assert.equal(toCents(19.99), 1999);
    assert.equal(toCents(-2.5), -250);
    assert.equal(toCents(0), 0);
    assert.equal(fromCents(1999), 19.99);
    assert.equal(roundAmount(10.004999), 10);
    assert.equal(roundAmount(10.005), 10.01);
  });

  it('rejects unsafe or non-integer inputs', () => {
    assert.throws(() => toCents(Number.NaN), MoneyError);
    assert.throws(() => toCents(Number.POSITIVE_INFINITY), MoneyError);
    assert.throws(() => toCents(Number.MAX_SAFE_INTEGER), MoneyError);
    assert.throws(() => fromCents(1.5), MoneyError);
  });

  it('property: sum of amounts equals the sum of their cents for any list', () => {
    const next = rng(20260926);
    for (let round = 0; round < 500; round += 1) {
      const count = 1 + Math.floor(next() * 40);
      const cents = Array.from({ length: count }, () => randomCents(next));
      const amounts = cents.map((value) => value / 100);
      const expected = cents.reduce((total, value) => total + value, 0);
      assert.equal(toCents(sumAmounts(amounts)), expected);
      // A naive float sum drifts for at least some of these lists; ours never does.
      assert.equal(sumAmounts(amounts), fromCents(expected));
    }
  });

  it('property: add/subtract are exact and invertible at cent precision', () => {
    const next = rng(42);
    for (let round = 0; round < 500; round += 1) {
      const a = randomCents(next) / 100;
      const b = randomCents(next) / 100;
      assert.equal(toCents(addAmounts(a, b)), toCents(a) + toCents(b));
      assert.equal(amountsEqual(subtractAmounts(addAmounts(a, b), b), a), true);
    }
  });

  it('property: multiplying by an integer quantity equals repeated addition', () => {
    const next = rng(7);
    for (let round = 0; round < 300; round += 1) {
      const unit = Math.abs(randomCents(next, 100_000)) / 100;
      const quantity = 1 + Math.floor(next() * 50);
      const repeated = sumAmounts(Array.from({ length: quantity }, () => unit));
      assert.equal(multiplyAmount(unit, quantity), repeated);
    }
  });

  it('rounds fractional quantities once, at the end', () => {
    assert.equal(multiplyAmount(3.33, 1.5), 5); // 4.995 -> 5.00 (half away from zero)
    assert.equal(multiplyAmount(0.1, 3), 0.3);
    assert.equal(multiplyAmount(1.1, 1.1), 1.21);
  });

  it('cash reconciliation: closing an exact register never reports a cent difference', () => {
    const next = rng(99);
    for (let round = 0; round < 200; round += 1) {
      const movements = Array.from({ length: 1 + Math.floor(next() * 60) }, () => ({
        amount: Math.abs(randomCents(next, 50_000)) / 100,
        out: next() < 0.3
      }));
      const balance = movements.reduce(
        (running, movement) => (movement.out ? subtractAmounts(running, movement.amount) : addAmounts(running, movement.amount)),
        0
      );
      const totalIn = sumAmounts(movements.filter((m) => !m.out).map((m) => m.amount));
      const totalOut = sumAmounts(movements.filter((m) => m.out).map((m) => m.amount));
      assert.equal(subtractAmounts(totalIn, totalOut), balance);
      assert.equal(subtractAmounts(balance, balance), 0);
    }
  });
});
