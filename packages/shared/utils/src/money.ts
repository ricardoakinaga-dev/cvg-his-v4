/**
 * Money arithmetic in integer cents (R2-FIN-01).
 *
 * Domain records and API contracts keep monetary values as decimal reais
 * (`number`, two decimals), but every sum, product and subtraction must go
 * through this module so no floating-point drift reaches billing, cash or
 * quotes. Converting to cents happens at the edge of each operation and back
 * to reais at the end.
 */

const CENTS_PER_UNIT = 100;
/** Amounts above this cannot be represented exactly as integer cents. */
const MAX_SAFE_AMOUNT = Number.MAX_SAFE_INTEGER / CENTS_PER_UNIT;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

function assertFinite(value: number, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new MoneyError(`${label} must be a finite number`);
  }
  if (Math.abs(value) > MAX_SAFE_AMOUNT) {
    throw new MoneyError(`${label} exceeds the safe monetary range`);
  }
}

/**
 * Converts a decimal amount to integer cents, rounding half away from zero.
 * `toPrecision(15)` removes binary noise such as 1.005 * 100 = 100.49999999.
 */
export function toCents(amount: number, label = 'amount'): number {
  assertFinite(amount, label);
  const scaled = Number((amount * CENTS_PER_UNIT).toPrecision(15));
  return Math.sign(scaled) * Math.round(Math.abs(scaled));
}

/** Converts integer cents back to a decimal amount with at most two decimals. */
export function fromCents(cents: number, label = 'cents'): number {
  if (!Number.isInteger(cents)) {
    throw new MoneyError(`${label} must be an integer number of cents`);
  }
  return cents / CENTS_PER_UNIT;
}

/** Normalizes a decimal amount to exactly two decimals (via cents). */
export function roundAmount(amount: number, label = 'amount'): number {
  return fromCents(toCents(amount, label));
}

/** Exact sum of decimal amounts (computed in cents). */
export function sumAmounts(amounts: Iterable<number>, label = 'amount'): number {
  let total = 0;
  for (const amount of amounts) total += toCents(amount, label);
  return fromCents(total);
}

export function addAmounts(left: number, right: number): number {
  return fromCents(toCents(left, 'left') + toCents(right, 'right'));
}

export function subtractAmounts(left: number, right: number): number {
  return fromCents(toCents(left, 'left') - toCents(right, 'right'));
}

/**
 * Multiplies a unit amount by a quantity. The quantity may be fractional
 * (for example 1.5 kg); the result is rounded to cents once, at the end.
 */
export function multiplyAmount(unitAmount: number, quantity: number): number {
  assertFinite(quantity, 'quantity');
  const cents = toCents(unitAmount, 'unitAmount') * quantity;
  const rounded = Number(cents.toPrecision(15));
  return fromCents(Math.sign(rounded) * Math.round(Math.abs(rounded)));
}

/** Compares two amounts at cent precision. */
export function amountsEqual(left: number, right: number): boolean {
  return toCents(left, 'left') === toCents(right, 'right');
}
